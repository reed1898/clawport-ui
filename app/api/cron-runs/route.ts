import { getCronRuns } from '@/lib/cron-runs'
import { apiErrorResponse } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId') ?? undefined
    const gatewayId = request.nextUrl.searchParams.get('gatewayId') ?? undefined
    const runs = getCronRuns(jobId, gatewayId)
    return NextResponse.json(runs)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load cron runs')
  }
}
