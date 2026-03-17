export const runtime = 'nodejs'

import OpenAI from 'openai'
import { resolveGatewayProfile } from '@/lib/gateways'

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const audioFile = formData.get('audio')
  if (!audioFile || !(audioFile instanceof File)) {
    return Response.json({ error: 'Missing audio file' }, { status: 400 })
  }

  const gatewayId = formData.get('gatewayId')
  const gateway = resolveGatewayProfile(typeof gatewayId === 'string' ? gatewayId : null)
  const openai = new OpenAI({ baseURL: gateway.baseUrl, apiKey: gateway.token })

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
    })

    return Response.json({ text: transcription.text })
  } catch (err) {
    console.error('Transcription error:', err)
    return Response.json(
      { error: 'Transcription failed. Check OpenClaw gateway.' },
      { status: 500 }
    )
  }
}
