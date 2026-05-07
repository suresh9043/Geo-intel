import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function extractPositions(responseText: string, brands: string[]): Promise<Record<string, number | null>> {
  const prompt = `Given this AI response, identify where each brand appears in any numbered or ranked list.

Brands to check: ${brands.join(', ')}

AI Response:
${responseText.slice(0, 2000)}

Rules:
- Only count positions in numbered/ranked lists (1., 2., #1, first, second, etc.)
- If a brand is mentioned but NOT in a numbered list, return null
- If there is no numbered list at all, return null for all brands
- Position 1 = best/first

Return ONLY valid JSON with no other text:
${JSON.stringify(Object.fromEntries(brands.map(b => [b, 'number | null'])))}
`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    let raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (raw.includes('```')) raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) raw = match[0]

    const parsed = JSON.parse(raw)
    // Ensure all brands are present, default to null
    const result: Record<string, number | null> = {}
    brands.forEach(b => {
      const val = parsed[b]
      result[b] = typeof val === 'number' && val > 0 ? val : null
    })
    return result
  } catch {
    return Object.fromEntries(brands.map(b => [b, null]))
  }
}

export async function POST(req: NextRequest) {
  const db = getServiceClient()

  try {
    const { runId, companyId } = await req.json()
    if (!runId || !companyId) return NextResponse.json({ error: 'runId and companyId required' }, { status: 400 })

    // Get company name + competitors
    const [companyRes, competitorsRes] = await Promise.all([
      db.from('companies').select('name').eq('id', companyId).single(),
      db.from('competitors').select('name').eq('company_id', companyId),
    ])

    const companyName = companyRes.data?.name || ''
    const competitorNames = competitorsRes.data?.map(c => c.name) || []
    const allBrands = [companyName, ...competitorNames]

    // Get all successful responses for this run that don't have positions yet
    const { data: responses } = await db
      .from('raw_responses')
      .select('id, response_text')
      .eq('run_id', runId)
      .eq('status', 'success')
      .is('positions_json', null)
      .not('response_text', 'is', null)

    if (!responses?.length) return NextResponse.json({ success: true, processed: 0 })

    // Process in batches of 5
    const CONCURRENCY = 5
    let processed = 0

    for (let i = 0; i < responses.length; i += CONCURRENCY) {
      const chunk = responses.slice(i, i + CONCURRENCY)
      await Promise.all(chunk.map(async (r) => {
        const positions = await extractPositions(r.response_text!, allBrands)
        await db.from('raw_responses').update({ positions_json: positions }).eq('id', r.id)
        processed++
      }))
    }

    return NextResponse.json({ success: true, processed, brands: allBrands })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
