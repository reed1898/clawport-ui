/**
 * Server-only pipeline loader — reads pipeline definitions from
 * $WORKSPACE_PATH/clawport/pipelines.json when available.
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Pipeline } from './cron-pipelines'
import { resolveWorkspacePath } from '@/lib/workspace'
import { loadGatewayProfiles } from './gateways'

/** Load pipelines from a single workspace. Returns [] if not configured. */
function loadPipelinesFromWorkspace(workspacePath: string, gatewayId?: string): Pipeline[] {
  if (!workspacePath) return []

  const pipelinesPath = join(workspacePath, 'clawport', 'pipelines.json')
  if (!existsSync(pipelinesPath)) return []

  try {
    const raw = readFileSync(pipelinesPath, 'utf-8')
    const pipelines = JSON.parse(raw) as Pipeline[]
    if (gatewayId) {
      return pipelines.map(p => ({ ...p, gatewayId }))
    }
    return pipelines
  } catch {
    return []
  }
}

/** Load pipelines from all configured gateways. Returns [] if not configured. */
export function loadPipelines(gatewayId?: string | null): Pipeline[] {
  if (gatewayId) {
    const workspacePath = resolveWorkspacePath(gatewayId)
    return loadPipelinesFromWorkspace(workspacePath, gatewayId)
  }

  const gateways = loadGatewayProfiles()
  if (gateways.length <= 1) {
    // Single gateway: use legacy path
    const workspacePath = gateways[0]?.workspacePath || process.env.WORKSPACE_PATH || ''
    return loadPipelinesFromWorkspace(workspacePath)
  }

  // Multi-gateway: aggregate
  const all: Pipeline[] = []
  for (const gw of gateways) {
    const ws = gw.workspacePath || ''
    if (ws) all.push(...loadPipelinesFromWorkspace(ws, gw.id))
  }
  return all
}
