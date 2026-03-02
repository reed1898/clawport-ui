/**
 * OpenClaw gateway integration for vision (image) messages.
 *
 * The gateway's /v1/chat/completions endpoint strips image_url content parts.
 * Images work through the WebSocket agent pipeline (chat.send), which is the
 * same path Discord/Telegram/etc use. We connect directly via WebSocket.
 *
 * Flow: extract images as attachments → WS chat.send → wait for response → return
 */

import type { ApiMessage, ContentPart } from './validation'

export interface OpenClawAttachment {
  mimeType: string
  content: string // base64
}

/**
 * Check if any message in the array contains image_url content parts.
 */
export function hasImageContent(messages: ApiMessage[]): boolean {
  return messages.some(m => {
    if (typeof m.content === 'string') return false
    return (m.content as ContentPart[]).some(p => p.type === 'image_url')
  })
}

/**
 * Extract all image attachments from messages in OpenClaw's format:
 * { mimeType: "image/png", content: "<base64>" }
 */
export function extractImageAttachments(messages: ApiMessage[]): OpenClawAttachment[] {
  const attachments: OpenClawAttachment[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') continue
    for (const part of msg.content as ContentPart[]) {
      if (part.type === 'image_url') {
        const { mediaType, data } = parseDataUrl(part.image_url.url)
        attachments.push({ mimeType: mediaType, content: data })
      }
    }
  }

  return attachments
}

/**
 * Build a text prompt from the system prompt and conversation messages.
 * Extracts text from content arrays, skips system messages and image parts.
 */
export function buildTextPrompt(systemPrompt: string, messages: ApiMessage[]): string {
  const parts: string[] = []

  if (systemPrompt) {
    parts.push(systemPrompt)
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue

    let text: string
    if (typeof msg.content === 'string') {
      text = msg.content
    } else {
      text = (msg.content as ContentPart[])
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n')
    }

    if (text) {
      parts.push(`${msg.role}: ${text}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Send a vision message through the OpenClaw gateway via WebSocket.
 * Connects to the gateway, sends chat.send with image attachments,
 * and waits for the agent's response.
 *
 * Returns the assistant's response text, or null on failure.
 */
export async function sendViaOpenClaw(opts: {
  gatewayUrl?: string
  gatewayToken: string
  message: string
  attachments: OpenClawAttachment[]
  sessionKey?: string
  timeoutMs?: number
}): Promise<string | null> {
  const wsUrl = opts.gatewayUrl || 'ws://127.0.0.1:18789'
  const sessionKey = opts.sessionKey || 'agent:main:manor-ui'
  const idempotencyKey = `manor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const timeoutMs = opts.timeoutMs || 60000

  return new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => {
      try { ws.close() } catch { /* ignore */ }
      resolve(null)
    }, timeoutMs)

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        token: opts.gatewayToken,
      }))
    }

    let authenticated = false
    let sendAcked = false

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString())

        // Handle auth response
        if (!authenticated && (data.type === 'auth_ok' || data.type === 'welcome' || data.authenticated)) {
          authenticated = true
          // Send the chat.send request
          ws.send(JSON.stringify({
            type: 'call',
            method: 'chat.send',
            params: {
              sessionKey,
              idempotencyKey,
              message: opts.message,
              attachments: opts.attachments,
            },
          }))
          return
        }

        // Handle chat.send ack
        if (data.method === 'chat.send' || data.type === 'result') {
          sendAcked = true
          // Now wait for the agent response via chat events
          return
        }

        // Handle agent response — look for assistant message in chat events
        if (sendAcked) {
          // The gateway emits chat events as the agent responds
          const content = extractResponseContent(data)
          if (content) {
            clearTimeout(timer)
            try { ws.close() } catch { /* ignore */ }
            resolve(content)
            return
          }
        }
      } catch {
        // Skip unparseable messages
      }
    }

    ws.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }

    ws.onclose = () => {
      clearTimeout(timer)
      // If we haven't resolved yet, resolve with null
      resolve(null)
    }
  })
}

/**
 * Try to extract the assistant's response content from a gateway WebSocket message.
 * The gateway can emit responses in several formats depending on the event type.
 */
function extractResponseContent(data: Record<string, unknown>): string | null {
  // Direct content field
  if (typeof data.content === 'string' && data.content && data.role === 'assistant') {
    return data.content
  }

  // Nested in result
  if (data.result && typeof data.result === 'object') {
    const result = data.result as Record<string, unknown>
    if (typeof result.content === 'string' && result.content) {
      return result.content
    }
    // Message wrapper
    if (result.message && typeof result.message === 'object') {
      const msg = result.message as Record<string, unknown>
      if (typeof msg.content === 'string' && msg.content) {
        return msg.content
      }
    }
  }

  // Chat event with message
  if (data.type === 'chat' && data.message && typeof data.message === 'object') {
    const msg = data.message as Record<string, unknown>
    if (msg.role === 'assistant' && typeof msg.content === 'string' && msg.content) {
      return msg.content
    }
  }

  // Agent turn complete
  if (data.type === 'agent_turn_complete' || data.type === 'turn_complete') {
    if (typeof data.reply === 'string' && data.reply) return data.reply
    if (typeof data.text === 'string' && data.text) return data.text
    if (typeof data.content === 'string' && data.content) return data.content
  }

  return null
}

function parseDataUrl(url: string): { mediaType: string; data: string } {
  if (!url.startsWith('data:')) {
    return { mediaType: 'image/png', data: url }
  }

  const commaIdx = url.indexOf(',')
  if (commaIdx === -1) {
    return { mediaType: 'image/png', data: url }
  }

  const header = url.slice(5, commaIdx)
  const data = url.slice(commaIdx + 1)
  const mediaType = header.split(';')[0] || 'image/png'

  return { mediaType, data }
}
