import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function extractPositionsByMention(responseText: string, brands: string[]): Record<string, number | null> {
  const text = responseText.toLowerCase()
  const mentionIndices: { brand: string; index: number }[] = []

  for (const brand of brands) {
    const index = text.indexOf(brand.toLowerCase())
    if (index !== -1) mentionIndices.push({ brand, index })
  }

  mentionIndices.sort((a, b) => a.index - b.index)

  const result: Record<string, number | null> = {}
  brands.forEach(b => { result[b] = null })
  mentionIndices.forEach((item, i) => { result[item.brand] = i + 1 })

  return result
}

export async function POST(req: NextRequest) {
  const db = getServiceClient()

  try {
    const { companyId } = await req.json()
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

    const [companyRes, competitorsRes] = await Promise.all([
      db.from('companies').select('name').eq('id', companyId).single(),
      db.from('competitors').select('name').eq('company_id', companyId),
    ])

    const companyName = companyRes.data?.name || ''
    const competitorNames = competitorsRes.data?.map(c => c.name) || []
    const allBrands = [companyName, ...competitorNames]

    // Get ALL successful responses for this company
    const { data: responses } = await db
      .from('raw_responses')
      .select('id, response_text')
      .eq('company_id', companyId)
      .eq('status', 'success')
      .not('response_text', 'is', null)

    if (!responses?.length) return NextResponse.json({ success: true, processed: 0 })

    const CONCURRENCY = 10
    let processed = 0

    for (let i = 0; i < responses.length; i += CONCURRENCY) {
      const chunk = responses.slice(i, i + CONCURRENCY)
      await Promise.all(chunk.map(async (r) => {
        const positions = extractPositionsByMention(r.response_text!, allBrands)
        await db.from('raw_responses').update({ positions_json: positions }).eq('id', r.id)
        processed++
      }))
    }

    return NextResponse.json({ success: true, processed, brands: allBrands })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
