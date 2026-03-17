import { describe, it, expect } from 'vitest'
import { composeScopedAgentId, parseScopedAgentId } from './scoped-agent-id'

describe('scoped-agent-id', () => {
  it('composes and parses scoped IDs', () => {
    const scoped = composeScopedAgentId('gateway-a', 'vera')
    expect(scoped).toBe('gateway-a__vera')
    expect(parseScopedAgentId(scoped)).toEqual({ gatewayId: 'gateway-a', agentId: 'vera' })
  })

  it('returns null for unscoped ids', () => {
    expect(parseScopedAgentId('vera')).toBeNull()
  })
})
