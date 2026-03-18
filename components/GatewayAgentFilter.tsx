'use client'

import { useMemo } from 'react'
import type { Agent } from '@/lib/types'

export interface GatewayAgentFilterProps {
  agents: Agent[]
  gatewayFilter: string
  agentFilter: string
  onGatewayChange: (id: string) => void
  onAgentChange: (id: string) => void
  /** Hide the Agent dropdown (for pages where data has no agent dimension). Default: true */
  showAgentFilter?: boolean
}

interface GatewayEntry {
  id: string
  name: string
}

export function deriveGateways(agents: Agent[]): GatewayEntry[] {
  return Array.from(
    new Map(
      agents
        .filter((a) => a.gatewayId && a.gatewayName)
        .map((a) => [a.gatewayId!, { id: a.gatewayId!, name: a.gatewayName! }])
    ).values()
  )
}

export function GatewayAgentFilter({
  agents,
  gatewayFilter,
  agentFilter,
  onGatewayChange,
  onAgentChange,
  showAgentFilter = true,
}: GatewayAgentFilterProps) {
  const gateways = useMemo(() => deriveGateways(agents), [agents])
  const hasMultipleGateways = gateways.length > 1

  const filteredAgents = useMemo(() => {
    if (gatewayFilter === 'all') return agents
    return agents.filter((a) => a.gatewayId === gatewayFilter)
  }, [agents, gatewayFilter])

  if (!hasMultipleGateways) return null

  return (
    <div
      data-testid="gateway-agent-filter"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--material-regular)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--separator)',
      }}
    >
      {/* Gateway dropdown */}
      <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)' }}>
        Gateway
      </span>
      <select
        value={gatewayFilter}
        onChange={(e) => {
          onGatewayChange(e.target.value)
          onAgentChange('all')
        }}
        aria-label="Filter by gateway"
        style={{
          fontSize: 'var(--text-caption1)',
          fontWeight: 'var(--weight-medium)',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          outline: 'none',
          padding: '4px 2px',
        }}
      >
        <option value="all">All Gateways</option>
        {gateways.map((gw) => (
          <option key={gw.id} value={gw.id}>{gw.name}</option>
        ))}
      </select>

      {showAgentFilter && (
        <>
          {/* Separator */}
          <span style={{
            width: 1,
            height: 16,
            background: 'var(--separator)',
            flexShrink: 0,
          }} />

          {/* Agent dropdown */}
          <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)' }}>
            Agent
          </span>
          <select
            value={agentFilter}
            onChange={(e) => onAgentChange(e.target.value)}
            aria-label="Filter by agent"
            style={{
              fontSize: 'var(--text-caption1)',
              fontWeight: 'var(--weight-medium)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              padding: '4px 2px',
            }}
          >
            <option value="all">All Agents</option>
            {filteredAgents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
