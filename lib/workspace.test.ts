import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock gateways before importing workspace
vi.mock('@/lib/gateways', () => ({
  resolveGatewayProfile: vi.fn((id?: string | null) => {
    if (id === 'remote-1') {
      return { id: 'remote-1', name: 'Remote', baseUrl: 'http://remote:18789/v1', token: 'tok', workspacePath: '/remote/workspace', mode: 'mirror' }
    }
    return { id: 'default', name: 'Local', baseUrl: 'http://localhost:18789/v1', token: 'tok', workspacePath: '/local/workspace', mode: 'live' }
  }),
  loadGatewayProfiles: vi.fn(() => [
    { id: 'default', name: 'Local', baseUrl: 'http://localhost:18789/v1', token: 'tok', workspacePath: '/local/workspace', mode: 'live' },
    { id: 'remote-1', name: 'Remote', baseUrl: 'http://remote:18789/v1', token: 'tok', workspacePath: '/remote/workspace', mode: 'mirror' },
  ]),
}))

import { resolveWorkspacePath, getAgentGateway } from './workspace'

describe('resolveWorkspacePath', () => {
  beforeEach(() => {
    vi.stubEnv('WORKSPACE_PATH', '/env/workspace')
  })

  it('returns default workspace when no gatewayId', () => {
    expect(resolveWorkspacePath()).toBe('/local/workspace')
  })

  it('returns remote workspace for remote gateway', () => {
    expect(resolveWorkspacePath('remote-1')).toBe('/remote/workspace')
  })

  it('returns default workspace for null gatewayId', () => {
    expect(resolveWorkspacePath(null)).toBe('/local/workspace')
  })
})

describe('getAgentGateway', () => {
  it('extracts gateway from scoped agent id', () => {
    const gw = getAgentGateway('remote-1__vera')
    expect(gw.id).toBe('remote-1')
  })

  it('returns default for unscoped agent id', () => {
    const gw = getAgentGateway('vera')
    expect(gw.id).toBe('default')
  })

  it('returns default for null', () => {
    const gw = getAgentGateway(null)
    expect(gw.id).toBe('default')
  })
})
