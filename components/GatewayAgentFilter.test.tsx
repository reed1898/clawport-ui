import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { GatewayAgentFilter, deriveGateways } from './GatewayAgentFilter'
import type { Agent } from '@/lib/types'

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    name: 'Agent A',
    title: 'Title',
    reportsTo: null,
    directReports: [],
    soulPath: null,
    soul: null,
    voiceId: null,
    color: '#ff0000',
    emoji: 'A',
    model: null,
    tools: [],
    crons: [],
    memoryPath: null,
    description: 'test',
    ...overrides,
  }
}

const gw1Agent = makeAgent({ id: 'a1', name: 'Alpha', gatewayId: 'gw1', gatewayName: 'Gateway 1' })
const gw1Agent2 = makeAgent({ id: 'a2', name: 'Beta', gatewayId: 'gw1', gatewayName: 'Gateway 1' })
const gw2Agent = makeAgent({ id: 'a3', name: 'Gamma', gatewayId: 'gw2', gatewayName: 'Gateway 2' })
const singleGwAgent = makeAgent({ id: 'a4', name: 'Delta', gatewayId: 'gw1', gatewayName: 'Gateway 1' })

describe('deriveGateways', () => {
  it('extracts unique gateways from agents', () => {
    const gateways = deriveGateways([gw1Agent, gw1Agent2, gw2Agent])
    expect(gateways).toHaveLength(2)
    expect(gateways.map(g => g.id)).toEqual(['gw1', 'gw2'])
  })

  it('skips agents without gatewayId', () => {
    const noGw = makeAgent({ id: 'x', gatewayId: undefined, gatewayName: undefined })
    const gateways = deriveGateways([gw1Agent, noGw])
    expect(gateways).toHaveLength(1)
  })

  it('returns empty for no agents', () => {
    expect(deriveGateways([])).toEqual([])
  })
})

describe('GatewayAgentFilter', () => {
  afterEach(cleanup)
  it('renders nothing when only one gateway exists', () => {
    const { container } = render(
      <GatewayAgentFilter
        agents={[singleGwAgent]}
        gatewayFilter="all"
        agentFilter="all"
        onGatewayChange={vi.fn()}
        onAgentChange={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders when multiple gateways exist', () => {
    render(
      <GatewayAgentFilter
        agents={[gw1Agent, gw2Agent]}
        gatewayFilter="all"
        agentFilter="all"
        onGatewayChange={vi.fn()}
        onAgentChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('gateway-agent-filter')).toBeTruthy()
    expect(screen.getByLabelText('Filter by gateway')).toBeTruthy()
    expect(screen.getByLabelText('Filter by agent')).toBeTruthy()
  })

  it('shows all gateways in dropdown', () => {
    render(
      <GatewayAgentFilter
        agents={[gw1Agent, gw1Agent2, gw2Agent]}
        gatewayFilter="all"
        agentFilter="all"
        onGatewayChange={vi.fn()}
        onAgentChange={vi.fn()}
      />
    )
    const gwSelect = screen.getByLabelText('Filter by gateway') as HTMLSelectElement
    const options = Array.from(gwSelect.options)
    expect(options).toHaveLength(3) // All + gw1 + gw2
    expect(options[0].value).toBe('all')
    expect(options[1].value).toBe('gw1')
    expect(options[2].value).toBe('gw2')
  })

  it('shows all agents when gateway filter is "all"', () => {
    render(
      <GatewayAgentFilter
        agents={[gw1Agent, gw1Agent2, gw2Agent]}
        gatewayFilter="all"
        agentFilter="all"
        onGatewayChange={vi.fn()}
        onAgentChange={vi.fn()}
      />
    )
    const agentSelect = screen.getByLabelText('Filter by agent') as HTMLSelectElement
    const options = Array.from(agentSelect.options)
    // All + 3 agents
    expect(options).toHaveLength(4)
  })

  it('filters agents by selected gateway', () => {
    render(
      <GatewayAgentFilter
        agents={[gw1Agent, gw1Agent2, gw2Agent]}
        gatewayFilter="gw1"
        agentFilter="all"
        onGatewayChange={vi.fn()}
        onAgentChange={vi.fn()}
      />
    )
    const agentSelect = screen.getByLabelText('Filter by agent') as HTMLSelectElement
    const options = Array.from(agentSelect.options)
    // All + gw1Agent + gw1Agent2
    expect(options).toHaveLength(3)
    expect(options.map(o => o.value)).toEqual(['all', 'a1', 'a2'])
  })

  it('calls onGatewayChange when gateway changes', () => {
    const onGw = vi.fn()
    const onAgent = vi.fn()
    render(
      <GatewayAgentFilter
        agents={[gw1Agent, gw2Agent]}
        gatewayFilter="all"
        agentFilter="all"
        onGatewayChange={onGw}
        onAgentChange={onAgent}
      />
    )
    fireEvent.change(screen.getByLabelText('Filter by gateway'), { target: { value: 'gw1' } })
    expect(onGw).toHaveBeenCalledWith('gw1')
    // Agent filter should reset to 'all'
    expect(onAgent).toHaveBeenCalledWith('all')
  })

  it('calls onAgentChange when agent changes', () => {
    const onAgent = vi.fn()
    render(
      <GatewayAgentFilter
        agents={[gw1Agent, gw2Agent]}
        gatewayFilter="all"
        agentFilter="all"
        onGatewayChange={vi.fn()}
        onAgentChange={onAgent}
      />
    )
    fireEvent.change(screen.getByLabelText('Filter by agent'), { target: { value: 'a1' } })
    expect(onAgent).toHaveBeenCalledWith('a1')
  })
})
