import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { companyName, websiteUrl, description, geography, count = 5 } = await req.json()
    if (!companyName) return NextResponse.json({ error: 'companyName required' }, { status: 400 })

    const prompt = `You are analyzing customer discovery behavior in chat LLMs.

Generate ${count} discovery prompts that potential customers would search to find solutions like the given company, BEFORE they know the company exists.

**Company Details:**
- Name: ${companyName}
- Website: ${websiteUrl || 'Not provided'}
- Description: ${description || 'Not provided'}
- Geography: ${geography || 'Worldwide'}

**Rules:**
1. Tool/solution seeking ("Best tools for...", "Top platforms for...", "What are good solutions for...")
2. Natural conversational language
3. Brand-unaware — customer should not mention ${companyName}
4. Queries that would make an LLM respond with a list of company/tool recommendations
5. Reflect geography only if it meaningfully changes the query

**Output strictly as JSON:**
["query1", "query2", "...up to query${count}"]

Return only the JSON array. No explanation, no preamble.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.filter(b => b.type === 'text').pop()
    let raw = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()

    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      const prompts: string[] = JSON.parse(match[0])
      return NextResponse.json({ prompts: prompts.slice(0, count) })
    }

    return NextResponse.json({ error: 'Could not parse prompts from response' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
