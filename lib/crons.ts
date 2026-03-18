import { CronJob, CronDelivery } from '@/lib/types'
import { execSync } from 'child_process'
import { parseSchedule, describeCron } from './cron-utils'
import { requireEnv } from '@/lib/env'
import { loadRegistry } from '@/lib/agents-registry'
import { loadGatewayProfiles, type GatewayProfile } from '@/lib/gateways'
import { composeScopedAgentId, parseScopedAgentId } from '@/lib/scoped-agent-id'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { cachedCallSync } from '@/lib/cache'

/**
 * Match a cron job name to an agent by prefix.
 * Tries each known agent ID as a prefix (longest first to avoid
 * partial matches, e.g. "seo-team" matches before "seo").
 */
function matchAgent(name: string, agentIds: string[]): string | null {
  const sorted = [...agentIds].sort((a, b) => b.length - a.length)
  for (const id of sorted) {
    if (name === id || name.startsWith(id + '-')) return id
  }
  return null
}

export async function getCrons(): Promise<CronJob[]> {
  const gateways = loadGatewayProfiles()
  const multiGateway = gateways.length > 1
  const registry = loadRegistry()

  if (multiGateway) {
    const all: CronJob[] = []
    const promises = gateways.map(async (gateway) => {
      try {
        // Get unscoped agent IDs for this gateway only
        const gwAgentIds = registry
          .filter(a => a.gatewayId === gateway.id)
          .map(a => {
            const parsed = parseScopedAgentId(a.id)
            return parsed ? parsed.agentId : a.id
          })

        let jobs: CronJob[]
        if (gateway.mode === 'local') {
          jobs = fetchCronsViaCli(gwAgentIds)
        } else {
          jobs = await fetchCronsViaHttp(gateway, gwAgentIds)
        }
        // Tag each job with gateway context
        return jobs.map(j => ({
          ...j,
          gatewayId: gateway.id,
          gatewayName: gateway.name,
          // Scope agentId to gateway namespace
          agentId: j.agentId
            ? composeScopedAgentId(gateway.id, j.agentId)
            : null,
        }))
      } catch {
        return []
      }
    })
    const results = await Promise.all(promises)
    for (const r of results) all.push(...r)
    return all
  }

  // Single gateway: existing behavior
  const agentIds = registry.map(a => a.id)
  return fetchCronsViaCli(agentIds)
}

function fetchCronsViaCli(agentIds: string[]): CronJob[] {
  const openclawBin = requireEnv('OPENCLAW_BIN')
  const raw = cachedCallSync(`cron-cli:${openclawBin}`, 30_000, () => {
    try {
      return execSync(`${openclawBin} cron list --json`, {
        encoding: 'utf-8',
        timeout: 10000,
      })
    } catch (err) {
      throw new Error(
        `Failed to fetch cron jobs: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  })
  return parseCronJobs(raw, agentIds)
}

async function fetchCronsViaHttp(gateway: GatewayProfile, agentIds: string[]): Promise<CronJob[]> {
  // OpenClaw stores cron jobs in <openclaw_root>/cron/jobs.json at runtime,
  // NOT in openclaw.json config.  For remote gateways whose .openclaw dir is
  // synced locally via Syncthing, read the actual jobs file.
  if (!gateway.workspacePath) return []

  const openclawRoot = join(gateway.workspacePath, '..')
  const jobsPath = join(openclawRoot, 'cron', 'jobs.json')
  if (!existsSync(jobsPath)) return []

  try {
    const raw = readFileSync(jobsPath, 'utf-8')
    return parseCronJobs(raw, agentIds)
  } catch {
    return []
  }
}

function parseCronJobs(raw: string, agentIds: string[]): CronJob[] {
    const parsed = JSON.parse(raw)
    const jobs: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed.jobs ?? parsed.data ?? []

    return jobs.map((job: unknown) => {
      const j = job as Record<string, unknown>
      const state = (j.state as Record<string, unknown>) || {}
      const name = String(j.name || '')
      const { expression: schedule, timezone } = parseSchedule(j.schedule)

      // Status can be in state.status or directly on j.status
      const rawStatus = state.status ?? j.status ?? ''
      let status: 'ok' | 'error' | 'idle' = 'idle'
      if (rawStatus === 'error' || rawStatus === 'failed') {
        status = 'error'
      } else if (rawStatus === 'ok' || rawStatus === 'success' || rawStatus === 'completed') {
        status = 'ok'
      }

      // nextRun: try state.nextRunAtMs first, then state.nextRunAt
      const nextRunMs = state.nextRunAtMs ?? state.nextRunAt ?? j.nextRunAtMs ?? j.nextRunAt
      const nextRun = nextRunMs
        ? new Date(Number(nextRunMs)).toISOString()
        : null

      // lastRun: try state.lastRunAtMs, state.lastRunAt, or top-level equivalents
      const lastRunRaw = state.lastRunAtMs ?? state.lastRunAt ?? j.lastRunAtMs ?? j.lastRunAt ?? j.last
      const lastRun = lastRunRaw
        ? (typeof lastRunRaw === 'number' ? new Date(lastRunRaw).toISOString() : String(lastRunRaw))
        : null

      const lastError = (state.lastError ?? state.error ?? j.lastError) ? String(state.lastError ?? state.error ?? j.lastError) : null

      // Delivery config
      const rawDelivery = j.delivery as Record<string, unknown> | undefined
      let delivery: CronDelivery | null = null
      if (rawDelivery && typeof rawDelivery === 'object') {
        delivery = {
          mode: String(rawDelivery.mode || ''),
          channel: String(rawDelivery.channel || ''),
          to: rawDelivery.to ? String(rawDelivery.to) : null,
        }
      }

      // Rich state fields
      const lastDurationMs = typeof state.lastDurationMs === 'number' ? state.lastDurationMs : null
      const consecutiveErrors = typeof state.consecutiveErrors === 'number' ? state.consecutiveErrors : 0
      const lastDeliveryStatus = typeof state.lastDeliveryStatus === 'string' ? state.lastDeliveryStatus : null

      return {
        id: String(j.id || j.name || ''),
        name,
        schedule,
        scheduleDescription: describeCron(schedule),
        timezone,
        status,
        lastRun,
        nextRun,
        lastError,
        agentId: matchAgent(name, agentIds),
        description: typeof j.description === 'string' ? j.description : null,
        enabled: j.enabled !== false,
        delivery,
        lastDurationMs,
        consecutiveErrors,
        lastDeliveryStatus,
      }
    })
}
