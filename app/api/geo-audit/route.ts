import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function fetchUrl(url: string, timeout = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })
    const text = await resp.text()
    clearTimeout(timer)
    return { ok: resp.ok, text, status: resp.status }
  } catch {
    clearTimeout(timer)
    return { ok: false, text: '', status: 0 }
  }
}

function extractText(html: string, maxChars = 3000) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

function extractHeadings(html: string) {
  const headings: string[] = []
  const matches = html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi)
  for (const m of matches) headings.push(m[1].replace(/<[^>]+>/g, '').trim())
  return headings.slice(0, 20).join(' | ')
}

function extractSchema(html: string) {
  const schemas: string[] = []
  const matches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of matches) {
    try { const p = JSON.parse(m[1]); schemas.push(p['@type'] || 'Unknown') } catch { /* skip */ }
  }
  return schemas
}

function extractMeta(html: string, name: string) {
  const m = html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`, 'i'))
  return m ? m[1] : ''
}

function checkAiBots(robotsTxt: string) {
  if (!robotsTxt) return { GPTBot: 'unknown', PerplexityBot: 'unknown', ClaudeBot: 'unknown' }
  const result: Record<string, string> = {}
  for (const bot of ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) {
    if (new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/(?:\\s|$)`, 'i').test(robotsTxt)) result[bot] = 'blocked'
    else if (new RegExp(`User-agent:\\s*${bot}`, 'i').test(robotsTxt)) result[bot] = 'allowed'
    else result[bot] = 'not_mentioned'
  }
  return result
}

async function scrapePageData(url: string) {
  const base = new URL(url).origin
  const [homePage, robotsPage, llmsPage, sitemapPage] = await Promise.all([
    fetchUrl(url),
    fetchUrl(`${base}/robots.txt`),
    fetchUrl(`${base}/llms.txt`),
    fetchUrl(`${base}/sitemap.xml`),
  ])
  const html = homePage.text || ''
  const fetchedSuccessfully = homePage.ok && html.length > 5000
  const fetchNote = fetchedSuccessfully
    ? `Page fetched successfully (${Math.round(html.length / 1024)}KB). Analysis based on real page content.`
    : `IMPORTANT: Page could not be fetched. Use your training knowledge about ${url} to score accurately.`

  return {
    url, fetched: fetchedSuccessfully, fetch_note: fetchNote,
    html_size_kb: Math.round(html.length / 1024),
    has_js_spa: /<div[^>]*id="(root|app)"/.test(html) && html.length < 50000,
    text_content: extractText(html),
    headings: extractHeadings(html),
    meta_description: extractMeta(html, 'description'),
    schema_types: extractSchema(html),
    has_faq_schema: /"@type"\s*:\s*"FAQPage"/.test(html),
    has_software_schema: /"@type"\s*:\s*"SoftwareApplication"/.test(html),
    has_org_schema: /"@type"\s*:\s*"Organization"/.test(html),
    has_same_as: /sameAs/.test(html),
    robots_txt: robotsPage.ok ? robotsPage.text.slice(0, 1000) : 'Not found',
    ai_bot_status: checkAiBots(robotsPage.ok ? robotsPage.text : ''),
    has_llms_txt: llmsPage.ok && llmsPage.status === 200,
    has_sitemap: sitemapPage.ok && sitemapPage.status === 200,
    vertical: 'saas',
  }
}

// ─── Agent prompts ────────────────────────────────────────────────────────────

const AGENT_PROMPTS: Record<string, (data: any) => string> = {
  'geo-crawl': (data) => `You are a GEO crawlability expert scoring how accessible this site is to AI search bots.
URL: ${data.url}
${data.fetch_note}
HTML size: ${data.html_size_kb}KB | JS SPA: ${data.has_js_spa}
robots.txt: ${data.robots_txt.slice(0, 400)}
AI bot access: ${JSON.stringify(data.ai_bot_status)}
llms.txt: ${data.has_llms_txt} | Sitemap: ${data.has_sitemap}
LLMS.TXT RULE: If has_llms_txt is false, you MUST always include a Medium finding titled "llms.txt file not found" — this is MANDATORY and counts OUTSIDE the 2 finding limit. Do not skip this finding even if you already have 2 findings. llms.txt is a new standard that tells AI engines what content they can use — missing it is a missed GEO opportunity.
SCORING: 85-100 AI bots explicitly allowed + sitemap + llms.txt | 65-84 AI bots implicitly allowed via wildcard (not explicitly listed) | 45-64 some AI bots blocked | 25-44 multiple AI bots blocked | 0-24 all AI bots blocked
IMPORTANT DISTINCTION:
- "explicitly allowed" = User-agent: GPTBot with Allow: / present in robots.txt → score 85-100
- "implicitly allowed" = User-agent: * with empty or no Disallow, GPTBot not mentioned → score 65-84, flag as informational not Critical/High
- "blocked" = User-agent: GPTBot with Disallow: / present → score 0-44, flag as Critical or High
- Never flag implicit allowance as a Critical or High finding — it is not a blocking issue, just a best practice to be explicit
- CRITICAL: Blocking CCBot, PetalBot, Scrapy, img2dataset is CORRECT and should NOT be flagged as a problem — these are scrapers not LLM crawlers
- Only flag as blocked if GPTBot, PerplexityBot, ClaudeBot or Google-Extended are explicitly blocked with Disallow: /
- If those 4 bots are NOT mentioned in robots.txt but User-agent: * has empty Disallow, score must be 65-84 NOT below 50
Max 2 findings PLUS the mandatory llms.txt finding if missing. Each finding must be specific to THIS site — not generic advice. If no real issues found, return empty findings array.
- NEVER make observations about content frequency (e.g. "appears twice") — you may miscount
- Finding titles must use sentence case — only capitalise the first word and proper nouns (e.g. "No schema markup detected" not "No Schema Markup Detected")
- NEVER conclude that visual elements are absent just because they are not in the crawled HTML — customer logos, testimonials, carousels, ratings, and trust badges are frequently loaded via JavaScript and will not appear in raw HTML
- If something is not found in crawled content, phrase it as "not detected in crawled HTML — may be JavaScript-rendered" NOT "does not exist" or "is absent"
- Only flag something as definitively missing if it is a text-based element that would always appear in raw HTML (e.g. meta tags, schema markup, heading text)
- NEVER invent specific numbers or percentages not explicitly present in the content provided
- NEVER reference specific company names, customer names, or case studies unless they appear word-for-word in the content provided
- If you are not 100% certain a specific observation is accurate, state it as a general pattern instead

Return ONLY valid JSON: {"dimension":"geo-crawl","score":0,"grade":"","findings":[{"id":"crawl_001","title":"Problem","severity":"Critical|High|Medium","detail":"Detail","recommendation":"Action"}],"summary":"One sentence"}`,

  'geo-content': (data) => `You are a GEO content expert scoring how well this site's content is structured for AI citation.
URL: ${data.url} | Vertical: ${data.vertical}
${data.fetch_note}
Meta: ${data.meta_description || 'Not found'}
Headings: ${data.headings || 'Not found'}
Content: ${data.text_content.slice(0, 2000) || 'Not available'}
SCORING: 85-100 clear entity, FAQ, specific value props | 65-84 good structure | 45-64 basic but generic | 25-44 vague | 0-24 minimal
Only report REAL, SPECIFIC problems found on THIS site. Max 2 findings. Each finding must be specific to THIS site — not generic advice. If no real issues found, return empty findings array.
- NEVER make observations about content frequency (e.g. "appears twice") — you may miscount
- Finding titles must use sentence case — only capitalise the first word and proper nouns (e.g. "No schema markup detected" not "No Schema Markup Detected")
- NEVER conclude that visual elements are absent just because they are not in the crawled HTML — customer logos, testimonials, carousels, ratings, and trust badges are frequently loaded via JavaScript and will not appear in raw HTML
- If something is not found in crawled content, phrase it as "not detected in crawled HTML — may be JavaScript-rendered" NOT "does not exist" or "is absent"
- Only flag something as definitively missing if it is a text-based element that would always appear in raw HTML (e.g. meta tags, schema markup, heading text)
- NEVER invent specific numbers or percentages not explicitly present in the content provided
- NEVER reference specific company names, customer names, or case studies unless they appear word-for-word in the content provided
- If you are not 100% certain a specific observation is accurate, state it as a general pattern instead
- NEVER make observations about content frequency (e.g. "appears twice") — you may miscount
- Finding titles must use sentence case — only capitalise the first word and proper nouns (e.g. "No schema markup detected" not "No Schema Markup Detected")
- NEVER conclude that visual elements are absent just because they are not in the crawled HTML — customer logos, testimonials, carousels, ratings, and trust badges are frequently loaded via JavaScript and will not appear in raw HTML
- If something is not found in crawled content, phrase it as "not detected in crawled HTML — may be JavaScript-rendered" NOT "does not exist" or "is absent"
- Only flag something as definitively missing if it is a text-based element that would always appear in raw HTML (e.g. meta tags, schema markup, heading text)
- NEVER invent specific numbers or percentages not explicitly present in the content provided
- NEVER reference specific company names, customer names, or case studies unless they appear word-for-word in the content provided
- If you are not 100% certain a specific observation is accurate, state it as a general pattern instead Each finding must reference something specific you found — not a generic best practice. If the site is doing well on this dimension, return an empty findings array and a high score.
Return ONLY valid JSON: {"dimension":"geo-content","score":0,"grade":"","findings":[{"id":"content_001","title":"Problem","severity":"Critical|High|Medium","detail":"Detail","recommendation":"Action"}],"summary":"One sentence"}`,

  'geo-schema': (data) => `You are a GEO schema expert scoring structured data implementation.
URL: ${data.url}
${data.fetch_note}
Schema types found: ${JSON.stringify(data.schema_types)}
FAQPage: ${data.has_faq_schema} | SoftwareApp: ${data.has_software_schema} | Organization: ${data.has_org_schema} | sameAs: ${data.has_same_as}
SCORING: 85-100 FAQPage+SoftwareApp+Org+sameAs all present | 65-84 Org+sameAs present | 45-64 basic schema only | 25-44 minimal/broken | STRICT RULE: if schema_types is empty AND has_faq_schema=false AND has_software_schema=false AND has_org_schema=false then score MUST be 0 — not 10, not 15, exactly 0
Max 2 findings. Each finding must be specific to THIS site — not generic advice. If no real issues found, return empty findings array.
- NEVER make observations about content frequency (e.g. "appears twice") — you may miscount
- Finding titles must use sentence case — only capitalise the first word and proper nouns (e.g. "No schema markup detected" not "No Schema Markup Detected")
- NEVER conclude that visual elements are absent just because they are not in the crawled HTML — customer logos, testimonials, carousels, ratings, and trust badges are frequently loaded via JavaScript and will not appear in raw HTML
- If something is not found in crawled content, phrase it as "not detected in crawled HTML — may be JavaScript-rendered" NOT "does not exist" or "is absent"
- Only flag something as definitively missing if it is a text-based element that would always appear in raw HTML (e.g. meta tags, schema markup, heading text)
- NEVER invent specific numbers or percentages not explicitly present in the content provided
- NEVER reference specific company names, customer names, or case studies unless they appear word-for-word in the content provided
- If you are not 100% certain a specific observation is accurate, state it as a general pattern instead
Return ONLY valid JSON: {"dimension":"geo-schema","score":0,"grade":"","findings":[{"id":"schema_001","title":"Missing X","severity":"Critical|High|Medium","detail":"Impact","recommendation":"Action"}],"summary":"One sentence"}`,

  'geo-authority': (data) => `You are a GEO authority expert scoring how credible AI engines perceive this brand.
URL: ${data.url} | Vertical: ${data.vertical}
${data.fetch_note}
Content: ${data.text_content.slice(0, 800) || 'Use training knowledge'}
SCORING: 85-100 analyst recognition, G2, Wikipedia, certs | 65-84 known brand, some recognition | 45-64 growing, review presence | 25-44 limited signals | 0-24 unknown
Max 2 findings. Each finding must be specific to THIS site — not generic advice. If no real issues found, return empty findings array.
- NEVER make observations about content frequency (e.g. "appears twice") — you may miscount
- Finding titles must use sentence case — only capitalise the first word and proper nouns (e.g. "No schema markup detected" not "No Schema Markup Detected")
- NEVER conclude that visual elements are absent just because they are not in the crawled HTML — customer logos, testimonials, carousels, ratings, and trust badges are frequently loaded via JavaScript and will not appear in raw HTML
- If something is not found in crawled content, phrase it as "not detected in crawled HTML — may be JavaScript-rendered" NOT "does not exist" or "is absent"
- Only flag something as definitively missing if it is a text-based element that would always appear in raw HTML (e.g. meta tags, schema markup, heading text)
- NEVER invent specific numbers or percentages not explicitly present in the content provided
- NEVER reference specific company names, customer names, or case studies unless they appear word-for-word in the content provided
- If you are not 100% certain a specific observation is accurate, state it as a general pattern instead
Return ONLY valid JSON: {"dimension":"geo-authority","score":0,"grade":"","findings":[{"id":"authority_001","title":"Missing X","severity":"High|Medium","detail":"Gap","recommendation":"Action"}],"summary":"One sentence"}`,

  'geo-competitive': (data) => `You are a GEO competitive positioning expert.
URL: ${data.url} | Vertical: ${data.vertical}
${data.fetch_note}
Content: ${data.text_content.slice(0, 1200)}
Headings: ${data.headings}
SCORING: 85-100 comparison pages, vertical pages, problem-led | 65-84 good category positioning | 45-64 basic | 25-44 generic | 0-24 extremely vague
Max 2 findings. Each finding must be specific to THIS site — not generic advice. If no real issues found, return empty findings array.
- NEVER make observations about content frequency (e.g. "appears twice") — you may miscount
- Finding titles must use sentence case — only capitalise the first word and proper nouns (e.g. "No schema markup detected" not "No Schema Markup Detected")
- NEVER conclude that visual elements are absent just because they are not in the crawled HTML — customer logos, testimonials, carousels, ratings, and trust badges are frequently loaded via JavaScript and will not appear in raw HTML
- If something is not found in crawled content, phrase it as "not detected in crawled HTML — may be JavaScript-rendered" NOT "does not exist" or "is absent"
- Only flag something as definitively missing if it is a text-based element that would always appear in raw HTML (e.g. meta tags, schema markup, heading text)
- NEVER invent specific numbers or percentages not explicitly present in the content provided
- NEVER reference specific company names, customer names, or case studies unless they appear word-for-word in the content provided
- If you are not 100% certain a specific observation is accurate, state it as a general pattern instead
Return ONLY valid JSON: {"dimension":"geo-competitive","score":0,"grade":"","findings":[{"id":"competitive_001","title":"Missing X","severity":"Critical|High|Medium","detail":"Gap","recommendation":"Page to create"}],"summary":"One sentence"}`,
}

async function runAgent(name: string, pageData: any) {
  const prompt = AGENT_PROMPTS[name](pageData)
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }]
  })
  let raw = response.content[0].text.trim()
  if (raw.includes('```')) raw = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (jsonMatch) raw = jsonMatch[0]
  try { return JSON.parse(raw) } catch { return { dimension: name, score: 0, grade: 'F', findings: [], summary: 'Parse error' } }
}

function synthesise(url: string, results: Record<string, any>, hasLlmsTxt: boolean = true) {
  const weights: Record<string, number> = {
    'geo-competitive': 0.25, 'geo-content': 0.25,
    'geo-authority': 0.20, 'geo-schema': 0.20, 'geo-crawl': 0.10,
  }
  let composite = 0
  const dimensionScores: Record<string, any> = {}
  // Inject llms.txt finding directly into allFindings before loop
  const llmsFinding = (!hasLlmsTxt) ? [{
    id: 'crawl_llms',
    title: 'llms.txt file not found',
    severity: 'Medium',
    detail: `${url} does not have an llms.txt file at the domain root. This new standard tells AI engines what content they can use and which pages are most important.`,
    recommendation: `Create an llms.txt file at the domain root describing your company, key pages, and content AI engines can use. Use the Get Fix button to generate the file content.`,
    dimension: 'geo-crawl'
  }] : []
  const allFindings: any[] = [...llmsFinding]
  const seen = new Set()

  // Hardcode llms.txt finding if missing — AI agents keep dropping it
  const crawlResult = results['geo-crawl']
  if (crawlResult && hasLlmsTxt === false) {
    if (!crawlResult.findings) crawlResult.findings = []
    // Remove any AI-generated llms findings (they're often wrong) and replace with ours
    crawlResult.findings = crawlResult.findings.filter((f: any) =>
      !f.title?.toLowerCase().includes('llms')
    )
    {
      crawlResult.findings.push({
        id: 'crawl_llms',
        title: 'llms.txt file not found',
        severity: 'Medium',
        detail: `${url} does not have an llms.txt file at the domain root. This new standard tells AI engines what content they can use and which pages are most important.`,
        recommendation: `Create an llms.txt file at ${new URL(url).origin}/llms.txt describing your company, key pages, and content AI engines are permitted to use. Use the Get Fix button to generate the file content.`,
        effort: 'Hours',
        estimated_impact: 'Direct communication channel with AI crawlers'
      })
    }
  }

  for (const [agent, weight] of Object.entries(weights)) {
    const r = results[agent] || {}
    composite += (r.score || 0) * weight
    dimensionScores[agent] = { score: r.score || 0, grade: r.grade || 'F', summary: r.summary || '' }
    for (const f of r.findings || []) {
      if (!seen.has(f.title)) { seen.add(f.title); allFindings.push({ ...f, dimension: agent }) }
    }
  }

  composite = Math.round(composite)
  const grade = composite >= 85 ? 'A' : composite >= 70 ? 'B' : composite >= 55 ? 'C' : composite >= 40 ? 'D' : 'F'
  const sev: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  allFindings.sort((a, b) => (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3))

  const criticalAndHighTitles = new Set([
    ...allFindings.filter(f => f.severity === 'Critical').map(f => f.title),
    ...allFindings.filter(f => f.severity === 'High').map(f => f.title),
  ])

  return {
    url, composite_score: composite, grade, dimension_scores: dimensionScores,
    critical_findings: allFindings.filter(f => f.severity === 'Critical').slice(0, 2),
    high_findings: allFindings.filter(f => f.severity === 'High').slice(0, 3),
    quick_wins: allFindings.filter(f => f.severity === 'Medium' && !criticalAndHighTitles.has(f.title)).slice(0, 3),
    all_findings: allFindings,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const { url, vertical } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const cleanUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const pageData = await scrapePageData(cleanUrl)
    pageData.vertical = vertical || 'saas'

    const [crawl, content, schema, authority, competitive] = await Promise.all([
      runAgent('geo-crawl', pageData),
      runAgent('geo-content', pageData),
      runAgent('geo-schema', pageData),
      runAgent('geo-authority', pageData),
      runAgent('geo-competitive', pageData),
    ])

    const report = synthesise(cleanUrl, { 'geo-crawl': crawl, 'geo-content': content, 'geo-schema': schema, 'geo-authority': authority, 'geo-competitive': competitive }, pageData.has_llms_txt)
    return NextResponse.json({ success: true, report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
