import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function classifyUrl(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('g2.com') || u.includes('capterra') || u.includes('trustradius')) return 'Review'
  if (u.includes('gartner') || u.includes('forrester') || u.includes('idc.com')) return 'Analyst Report'
  if (u.includes('reddit.com')) return 'Community'
  if (u.includes('youtube') || u.includes('youtu.be')) return 'Video'
  if (/top[\s\-]?\d|best[\s\-]/.test(u)) return 'Listicle'
  if (u.includes('vs') || u.includes('compar') || u.includes('alternativ')) return 'Comparison'
  if (u.includes('docs.') || u.includes('/docs/') || u.includes('/documentation/')) return 'Documentation'
  if (u.includes('/blog/') || u.includes('blog.') || u.includes('/blogs/')) return 'Blog'
  if (u.includes('techcrunch') || u.includes('forbes') || u.includes('venturebeat') || u.includes('zdnet') || u.includes('wired')) return 'News'
  return 'Web Article'
}

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json()
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

    const db = getServiceClient()
    const client = new Anthropic()

    // Fetch all context data
    const [companyRes, competitorsRes, promptsRes] = await Promise.all([
      db.from('companies').select('name, url').eq('id', companyId).single(),
      db.from('competitors').select('name').eq('company_id', companyId),
      db.from('prompts').select('id, text').eq('company_id', companyId).eq('is_active', true),
    ])

    const companyName = companyRes.data?.name || ''
    const competitorNames = competitorsRes.data?.map((c: any) => c.name) || []
    const allBrands = [{ name: companyName, isOurBrand: true }, ...competitorNames.map((n: string) => ({ name: n, isOurBrand: false }))]

    const { data: responses } = await db
      .from('raw_responses')
      .select('response_text, requested_model, raw_response, prompt_id')
      .eq('company_id', companyId)
      .eq('status', 'success')
      .not('response_text', 'is', null)
      .limit(300)

    if (!responses?.length) return NextResponse.json({ error: 'Not enough data yet. Run tracking first.' }, { status: 400 })

    // Build competitor insights per model
    const byModel = new Map<string, any[]>()
    for (const r of responses) {
      if (!byModel.has(r.requested_model)) byModel.set(r.requested_model, [])
      byModel.get(r.requested_model)!.push(r)
    }

    const modelInsights: string[] = []
    for (const [model, modelResponses] of byModel.entries()) {
      const total = modelResponses.length
      const brandVis = allBrands.map(b => ({
        name: b.name,
        isOurBrand: b.isOurBrand,
        visibility: Math.round((modelResponses.filter(r => r.response_text?.toLowerCase().includes(b.name.toLowerCase())).length / total) * 100)
      }))
      const topComp = brandVis.filter(b => !b.isOurBrand).sort((a, b) => b.visibility - a.visibility)[0]
      const ours = brandVis.find(b => b.isOurBrand)

      // Citations for top competitor on this model
      const compResponses = modelResponses.filter(r => r.response_text?.toLowerCase().includes(topComp?.name?.toLowerCase() || ''))
      const urls: string[] = []
      for (const r of compResponses) {
        if (Array.isArray(r.raw_response?.citations)) urls.push(...r.raw_response.citations)
        else { const m = r.response_text?.match(/https?:\/\/[^\s\)\]>,"']+/g) || []; urls.push(...m) }
      }
      const typeCounts: Record<string, number> = {}
      for (const url of urls) { try { const t = classifyUrl(url); typeCounts[t] = (typeCounts[t] || 0) + 1 } catch {} }
      const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} (${c})`).join(', ')

      if (topComp) {
        modelInsights.push(`${model}: ${topComp.name} has ${topComp.visibility}% visibility vs ${ours?.visibility || 0}% for ${companyName}${topTypes ? `. Competitor citations: ${topTypes}` : ''}`)
      }
    }

    // Top cited domains overall
    const domainCounts: Record<string, number> = {}
    for (const r of responses) {
      const urls: string[] = []
      if (Array.isArray(r.raw_response?.citations)) urls.push(...r.raw_response.citations)
      else { const m = r.response_text?.match(/https?:\/\/[^\s\)\]>,"']+/g) || []; urls.push(...m) }
      for (const url of urls) {
        try { const d = new URL(url).hostname.replace('www.', ''); domainCounts[d] = (domainCounts[d] || 0) + 1 } catch {}
      }
    }
    const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, c]) => `${d} (${c})`).join(', ')

    // Weak prompts
    const promptStats = (promptsRes.data || []).map(p => {
      const pr = responses.filter(r => r.prompt_id === p.id)
      const mentions = pr.filter(r => r.response_text?.toLowerCase().includes(companyName.toLowerCase())).length
      const mentionRate = pr.length > 0 ? Math.round((mentions / pr.length) * 100) : 0
      return { text: p.text, mentionRate, mentions, total: pr.length }
    })
    const weakPrompts = promptStats.filter(p => p.mentionRate < 30 && p.total > 0)
      .map(p => `"${p.text}" — ${p.mentions}/${p.total} mentions (${p.mentionRate}%)`)
      .join('\n')
    const strongPrompts = promptStats.filter(p => p.mentionRate >= 60)
      .sort((a, b) => b.mentionRate - a.mentionRate)
      .map(p => `"${p.text}" — ${p.mentions}/${p.total} mentions (${p.mentionRate}%)`)
      .join('\n')

    const competitorDomains = competitorNames.map((n: string) => n.toLowerCase().replace(/\s+/g, '') + '.com').join(', ')

    // Build Haiku prompt
    const prompt = `You are an AI visibility strategist analyzing data for ${companyName}.

COMPETITOR VISIBILITY BY MODEL:
${modelInsights.join('\n') || 'No data'}

TOP CITED DOMAINS (AI sources for this category):
${topDomains || 'No citation data'}

STRONG PROMPTS (what is already working for ${companyName}):
${strongPrompts || 'None yet'}

WEAK PROMPTS (low mention rate for ${companyName}):
${weakPrompts || 'None'}

Based on this data, generate 4-5 specific, actionable recommendations:
1. What content to create based on competitor citation types (blogs, reviews, listicles etc.)
2. Which NEUTRAL THIRD-PARTY platforms to get listed/cited on. NEVER suggest competitor domains.
3. How to build on strong prompts — replicate what is already working.
4. Which weak prompt topics to create content for to improve visibility.

IMPORTANT RULES:
- Never suggest publishing on or targeting competitor domains (${competitorDomains} or any competitor website)
- Only suggest neutral platforms: G2, Capterra, TechCrunch, Forbes, Reddit, Gartner, analyst publications, etc.
- Reference specific prompt text and mention numbers from the data above.
- Be concrete and actionable.

Return ONLY a JSON array with no markdown, no explanation:
[{"title":"...","detail":"...","action":"...","priority":"Critical|High|Win"}]`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse recommendations' }, { status: 500 })

    const recommendations = JSON.parse(jsonMatch[0])
    return NextResponse.json({ recommendations })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
