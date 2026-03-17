// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockReadFileSync, mockExistsSync, mockReaddirSync, mockExecSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockExecSync: vi.fn(),
}))

vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
}))

vi.mock('child_process', () => ({ execSync: mockExecSync }))
vi.mock('@/lib/agents.json', () => ({ default: [] }))

import { loadRegistry } from './agents-registry'

describe('agents-registry multi-gateway', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('WORKSPACE_PATH', '/tmp/primary')
    vi.stubEnv('OPENCLAW_GATEWAY_PORT', '18789')

    mockReaddirSync.mockReturnValue([])
    mockExecSync.mockImplementation(() => { throw new Error('unused') })

    const existing = new Set([
      '/tmp/primary/clawport/gateways.json',
      '/tmp/ws-a/clawport/agents.json',
      '/tmp/ws-b/clawport/agents.json',
    ])
    mockExistsSync.mockImplementation((path: string) => existing.has(path))

    mockReadFileSync.mockImplementation((path: string) => {
      if (path === '/tmp/primary/clawport/gateways.json') {
        return JSON.stringify([
          { id: 'gw-a', name: 'Gateway A', baseUrl: 'http://a', token: 'ta', workspacePath: '/tmp/ws-a' },
          { id: 'gw-b', name: 'Gateway B', baseUrl: 'http://b', token: 'tb', workspacePath: '/tmp/ws-b' },
        ])
      }
      if (path === '/tmp/ws-a/clawport/agents.json') {
        return JSON.stringify([{ id: 'main', name: 'Main A', title: 'Agent', reportsTo: null, directReports: [], soulPath: null, voiceId: null, color: '#fff', emoji: 'A', tools: [], model: null, memoryPath: null, description: 'A' }])
      }
      if (path === '/tmp/ws-b/clawport/agents.json') {
        return JSON.stringify([{ id: 'main', name: 'Main B', title: 'Agent', reportsTo: null, directReports: [], soulPath: null, voiceId: null, color: '#000', emoji: 'B', tools: [], model: null, memoryPath: null, description: 'B' }])
      }
      throw new Error(`unexpected read: ${path}`)
    })
  })

  it('scopes ids and attaches gateway metadata', () => {
    const agents = loadRegistry()
    expect(agents.map(a => a.id).sort()).toEqual(['gw-a__main', 'gw-b__main'])
    expect(agents.find(a => a.id === 'gw-a__main')?.gatewayId).toBe('gw-a')
    expect(agents.find(a => a.id === 'gw-b__main')?.workspacePath).toBe('/tmp/ws-b')
  })
})
