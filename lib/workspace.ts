import { join } from 'path'
import { resolveGatewayProfile, GatewayProfile } from '@/lib/gateways'

/**
 * Resolve the absolute path to a gateway's workspace.
 *
 * If gatewayId is provided, it resolves to that gateway's specific workspacePath.
 * If not, it falls back to the default gateway's workspacePath.
 * If no gateways have a workspacePath, it uses the global WORKSPACE_PATH env var.
 *
 * This is the central helper for partitioning file storage by gateway.
 *
 * @param gatewayId Optional gateway ID to resolve.
 * @returns The absolute path to the resolved workspace.
 */
export function resolveWorkspacePath(gatewayId?: string | null): string {
  const gateway = resolveGatewayProfile(gatewayId)
  return gateway.workspacePath || process.env.WORKSPACE_PATH || ''
}

/**
 * Get the gateway profile for a given agent.
 * @param agentId The scoped agent ID (e.g., "gateway-1__agent-name").
 * @returns The gateway profile.
 */
export function getAgentGateway(
  agentId?: string | null,
): GatewayProfile {
  const gatewayId = agentId?.includes('__') ? agentId.split('__')[0] : null
  return resolveGatewayProfile(gatewayId)
}
