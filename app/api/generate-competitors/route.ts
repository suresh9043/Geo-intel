import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { companyName, description, industry, geography } = await req.json()
    if (!companyName) return NextResponse.json({ error: 'companyName required' }, { status: 400 })

    const geoContext = geography && geography !== 'Worldwide' ? ` operating in ${geography}` : ''
    const prompt = `List 5 direct competitors of "${companyName}"${description ? ` (${description})` : ''}${industry ? ` in the ${industry} industry` : ''}${geoContext}.

Respond with ONLY a raw JSON array of 5 strings. No explanation, no markdown, no extra text.
["name1", "name2", "name3", "name4", "name5"]`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    let raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    console.log('[generate-competitors] prompt:', prompt)
    console.log('[generate-competitors] raw:', raw)

    // Strip markdown code fences
    raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()

    // Try to extract a JSON array
    const match = raw.match(/\[[\s\S]*?\]/)
    if (match) {
      const competitors: string[] = JSON.parse(match[0])
      return NextResponse.json({ competitors: competitors.slice(0, 5) })
    }

    // Fallback: extract quoted strings
    const quoted = [...raw.matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(Boolean)
    if (quoted.length > 0) {
      return NextResponse.json({ competitors: quoted.slice(0, 5) })
    }

    return NextResponse.json({ error: 'Could not parse competitors from response', raw })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
