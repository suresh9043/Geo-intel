import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const db = getServiceClient()
  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' })

  const { data: responses } = await db
    .from('raw_responses')
    .select('id, response_text, positions_json, requested_model, raw_response, prompt_id, status')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20)

  const byModel: Record<string, { success: number; error: number; error_sample: string }> = {}
  for (const r of (responses || [])) {
    if (!byModel[r.requested_model]) byModel[r.requested_model] = { success: 0, error: 0, error_sample: '' }
    if (r.status === 'success') byModel[r.requested_model].success++
    else {
      byModel[r.requested_model].error++
      if (!byModel[r.requested_model].error_sample)
        byModel[r.requested_model].error_sample = r.response_text?.slice(0, 200) || ''
    }
  }

  return NextResponse.json({ by_model: byModel }, { headers: { 'Content-Type': 'application/json' } })
}
