import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { companyName, description, industry, geography } = await req.json()
    if (!companyName) return NextResponse.json({ error: 'companyName required' }, { status: 400 })

    const geoContext = geography && geography !== 'Worldwide' ? ` operating in ${geography}` : ''
    const prompt = `List the top 5 direct competitors of "${companyName}"${description ? ` (${description})` : ''}${industry ? ` in the ${industry} industry` : ''}${geoContext}.

Return ONLY a JSON array of exactly 5 competitor names, no other text. Example: ["Competitor A", "Competitor B", "Competitor C", "Competitor D", "Competitor E"]`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    let raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    if (raw.includes('```')) raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
    const match = raw.match(/\[[\s\S]*\]/)
    const competitors: string[] = match ? JSON.parse(match[0]) : []

    return NextResponse.json({ competitors: competitors.slice(0, 5) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
