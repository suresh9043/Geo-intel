import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function detectFixType(finding: any) {
  const title = (finding.title || '').toLowerCase()
  const detail = (finding.detail || '').toLowerCase()
  if (title.includes('schema') || title.includes('json-ld') || title.includes('structured') || detail.includes('schema')) return 'schema'
  if (title.includes('comparison') || title.includes('competitor') || title.includes('vs ')) return 'comparison'
  if (title.includes('robots') || title.includes('llms.txt') || title.includes('sitemap') || title.includes('crawl') || title.includes('bot')) return 'technical'
  if (title.includes('sentiment') || title.includes('trust') || title.includes('value proposition') || title.includes('brand')) return 'sentiment'
  return 'content'
}

const FIX_PROMPTS: Record<string, (domain: string, finding: any, vertical: string) => string> = {
  schema: (domain, finding, vertical) => `You are a GEO schema expert. Generate complete JSON-LD schema fix.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")  
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects

Return ONLY valid JSON: {"fix_type":"schema","title":"...","summary":"...","where_to_add":"...","code":"...","instructions":["..."],"impact":"..."}`,

  content: (domain, finding, vertical) => `You are a GEO content strategist. Generate specific, ready-to-use content fixes.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")  
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects

Return ONLY valid JSON: {"fix_type":"content","title":"...","summary":"...","options":[{"label":"Option A","content":"..."},{"label":"Option B","content":"..."}],"where_to_use":"...","instructions":["..."],"impact":"..."}`,

  technical: (domain, finding, vertical) => `You are a GEO technical expert. Generate complete technical fix.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")  
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects

Return ONLY valid JSON: {"fix_type":"technical","title":"...","summary":"...","code":"...","where_to_add":"...","instructions":["..."],"impact":"...","verification":"..."}`,

  comparison: (domain, finding, vertical) => `You are a GEO competitive content strategist. Generate comparison page brief.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")  
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects

Return ONLY valid JSON: {"fix_type":"comparison","title":"...","summary":"...","target_page":"...","target_query":"...","page_structure":[{"section":"...","content":"..."}],"key_differentiators":["..."],"seo_title":"...","meta_description":"...","impact":"..."}`,

  sentiment: (domain, finding, vertical) => `You are a GEO brand sentiment strategist. Generate content to improve AI perception.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")  
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects

Return ONLY valid JSON: {"fix_type":"sentiment","title":"...","summary":"...","options":[{"label":"Value proposition","content":"..."},{"label":"Social proof","content":"..."},{"label":"Trust signals","content":"..."}],"where_to_use":"...","instructions":["..."],"impact":"..."}`,
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const { domain, finding, vertical } = await req.json()
  if (!domain || !finding) return NextResponse.json({ error: 'Domain and finding are required' }, { status: 400 })

  const fixType = detectFixType(finding)
  const prompt = FIX_PROMPTS[fixType](domain, finding, vertical || 'saas')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
    let raw = response.content[0].text.trim()
    if (raw.includes('```')) raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) raw = jsonMatch[0]
    return NextResponse.json({ success: true, fix: JSON.parse(raw), fix_type: fixType })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
