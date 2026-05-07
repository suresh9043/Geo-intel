import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { companyName, websiteUrl, description, industry, geography } = await req.json()
    if (!companyName) return NextResponse.json({ error: 'companyName required' }, { status: 400 })

    const prompt = `You are a competitive intelligence analyst. Identify 5 direct and indirect competitors for the given company.

**Company Details:**
- Name: ${companyName}
- Website: ${websiteUrl || 'Not provided'}
- Description: ${description || 'Not provided'}
- Geography: ${geography || 'Worldwide'}

**Requirements:**
1. Return exactly 5 competitors (prioritize direct market competitors)
2. For each competitor, provide:
   - Company name
   - Website (if available)

3. Consider both:
   - Direct competitors (same market, same customers)
   - Adjacent competitors (overlapping customer segments or offerings)

4. Ensure competitors operate in the same geography or serve it significantly

**Output Format:**
Return ONLY a JSON array with no extra text or markdown:
[{"name": "Company A", "website": "https://companya.com"}, {"name": "Company B", "website": "https://companyb.com"}]`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 } as any],
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.filter(b => b.type === 'text').pop()
    const rawText = textBlock?.type === 'text' ? textBlock.text.trim() : ''
    let raw = rawText

    // Strip markdown code fences
    raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()

    // Try to extract a JSON array
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      const competitors = parsed.slice(0, 5).map((item: any) =>
        typeof item === 'object'
          ? { name: item.name || '', url: item.website || '' }
          : { name: item, url: '' }
      )
      return NextResponse.json({ competitors })
    }

    return NextResponse.json({ error: 'Could not parse competitors from response' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
