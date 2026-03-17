import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { gatewayBaseUrl } from '@/lib/env'

export interface GatewayProfile {
  id: string
  name: string
  baseUrl: string
  token: string
  workspacePath: string | null
  mode: 'local' | 'remote'
}

interface RawGatewayProfile {
  id?: unknown
  name?: unknown
  baseUrl?: unknown
  token?: unknown
  workspacePath?: unknown
  mode?: unknown
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function fromRaw(raw: RawGatewayProfile): GatewayProfile | null {
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  if (typeof raw.baseUrl !== 'string' || !raw.baseUrl.trim()) return null

  const id = raw.id.trim()
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id
  const token = typeof raw.token === 'string' ? raw.token : ''
  const workspacePath = typeof raw.workspacePath === 'string' && raw.workspacePath.trim()
    ? raw.workspacePath.trim()
    : null
  const mode = raw.mode === 'remote' ? 'remote' : 'local'

  return {
    id,
    name,
    baseUrl: normalizeBaseUrl(raw.baseUrl),
    token,
    workspacePath,
    mode,
  }
}

export function defaultGatewayProfile(): GatewayProfile {
  return {
    id: 'default',
    name: 'Default',
    baseUrl: gatewayBaseUrl(),
    token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    workspacePath: process.env.WORKSPACE_PATH || null,
    mode: 'local',
  }
}

export function loadGatewayProfiles(workspacePath = process.env.WORKSPACE_PATH): GatewayProfile[] {
  const fallback = defaultGatewayProfile()
  if (!workspacePath) return [fallback]

  const configPath = join(workspacePath, 'clawport', 'gateways.json')
  if (!existsSync(configPath)) return [fallback]

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as unknown
    const list = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as { gateways?: unknown[] }).gateways)
        ? (raw as { gateways: unknown[] }).gateways
        : [])

    const profiles = list
      .map(item => fromRaw(item as RawGatewayProfile))
      .filter((item): item is GatewayProfile => item !== null)

    return profiles.length > 0 ? profiles : [fallback]
  } catch {
    return [fallback]
  }
}

export function resolveGatewayProfile(gatewayId?: string | null): GatewayProfile {
  const profiles = loadGatewayProfiles()
  if (!gatewayId) return profiles[0]
  return profiles.find(p => p.id === gatewayId) || profiles[0]
}
