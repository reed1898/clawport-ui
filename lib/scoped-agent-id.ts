const SCOPE_DELIMITER = '__'

export interface ScopedAgentId {
  gatewayId: string
  agentId: string
}

export function composeScopedAgentId(gatewayId: string, agentId: string): string {
  return `${gatewayId}${SCOPE_DELIMITER}${agentId}`
}

export function parseScopedAgentId(value: string): ScopedAgentId | null {
  const idx = value.indexOf(SCOPE_DELIMITER)
  if (idx <= 0 || idx >= value.length - SCOPE_DELIMITER.length) return null

  const gatewayId = value.slice(0, idx)
  const agentId = value.slice(idx + SCOPE_DELIMITER.length)
  if (!gatewayId || !agentId) return null

  return { gatewayId, agentId }
}
