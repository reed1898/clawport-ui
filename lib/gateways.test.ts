// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}))

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}))

import { loadGatewayProfiles, resolveGatewayProfile } from './gateways'

describe('gateways', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('OPENCLAW_GATEWAY_PORT', '18789')
    vi.stubEnv('OPENCLAW_GATEWAY_TOKEN', 'env-token')
    vi.stubEnv('WORKSPACE_PATH', '/tmp/ws')
  })

  it('falls back to env gateway when config file is missing', () => {
    mockExistsSync.mockReturnValue(false)
    const profiles = loadGatewayProfiles('/tmp/ws')
    expect(profiles).toHaveLength(1)
    expect(profiles[0].id).toBe('default')
    expect(profiles[0].baseUrl).toBe('http://localhost:18789/v1')
  })

  it('loads gateways.json profiles and normalizes base URLs', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify([
      { id: 'local', name: 'Local', baseUrl: 'http://127.0.0.1:18789', token: 'tok-a', workspacePath: '/tmp/ws-a' },
      { id: 'remote', name: 'Remote', baseUrl: 'https://gw.example.com/v1', token: 'tok-b', workspacePath: '/tmp/ws-b', mode: 'remote' },
    ]))

    const profiles = loadGatewayProfiles('/tmp/ws')
    expect(profiles).toHaveLength(2)
    expect(profiles[0].baseUrl).toBe('http://127.0.0.1:18789/v1')
    expect(profiles[1].baseUrl).toBe('https://gw.example.com/v1')
    expect(profiles[1].mode).toBe('remote')
  })

  it('resolveGatewayProfile falls back to default when not found', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify([{ id: 'g1', baseUrl: 'http://g1', token: 't' }]))

    expect(resolveGatewayProfile('missing').id).toBe('g1')
  })
})
