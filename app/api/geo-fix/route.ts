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
- MASTER RULE: For ANY value you cannot read directly from the page content provided — use a placeholder. Never guess, infer, or invent any value
- This applies to: URLs, phone numbers, version numbers, ratings, counts, dates, prices, and statistics
- Specific placeholders: social URLs → ADD_YOUR_LINKEDIN_URL / ADD_YOUR_TWITTER_URL / ADD_YOUR_YOUTUBE_URL / ADD_YOUR_FACEBOOK_URL | logo → ADD_YOUR_LOGO_URL | image → ADD_YOUR_PRODUCT_IMAGE_URL | phone → +1-ADD-YOUR-PHONE | release notes → ADD_YOUR_RELEASE_NOTES_URL | download/install → ADD_YOUR_DOWNLOAD_URL | version → ADD_YOUR_CURRENT_VERSION | ratings → ADD_YOUR_RATING / ADD_YOUR_REVIEW_COUNT | any other unverifiable URL → ADD_YOUR_[DESCRIPTION]_URL
- For telephone, use "+1-ADD-YOUR-PHONE" placeholder
- For sameAs arrays, always use placeholder strings like "ADD_YOUR_LINKEDIN_URL", "ADD_YOUR_TWITTER_URL", "ADD_YOUR_YOUTUBE_URL" — never fabricate real-looking URLs
- The user must replace placeholders with their own verified URLs

Return ONLY valid JSON: {"fix_type":"schema","title":"...","summary":"...","where_to_add":"...","code":"...","instructions":["..."],"impact":"..."}`,

  content: (domain, finding, vertical) => `You are a GEO content strategist. Generate specific, ready-to-use content fixes.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects
- MASTER RULE: For ANY value you cannot read directly from the page content provided — use a placeholder. Never guess, infer, or invent any value
- This applies to: URLs, phone numbers, version numbers, ratings, counts, dates, prices, and statistics
- Specific placeholders: social URLs → ADD_YOUR_LINKEDIN_URL / ADD_YOUR_TWITTER_URL / ADD_YOUR_YOUTUBE_URL / ADD_YOUR_FACEBOOK_URL | logo → ADD_YOUR_LOGO_URL | image → ADD_YOUR_PRODUCT_IMAGE_URL | phone → +1-ADD-YOUR-PHONE | release notes → ADD_YOUR_RELEASE_NOTES_URL | download/install → ADD_YOUR_DOWNLOAD_URL | version → ADD_YOUR_CURRENT_VERSION | ratings → ADD_YOUR_RATING / ADD_YOUR_REVIEW_COUNT | any other unverifiable URL → ADD_YOUR_[DESCRIPTION]_URL
- For telephone, use "+1-ADD-YOUR-PHONE" placeholder
- For sameAs arrays, always use placeholder strings like "ADD_YOUR_LINKEDIN_URL", "ADD_YOUR_TWITTER_URL", "ADD_YOUR_YOUTUBE_URL" — never fabricate real-looking URLs
- The user must replace placeholders with their own verified URLs

Return ONLY valid JSON: {"fix_type":"content","title":"...","summary":"...","options":[{"label":"Option A","content":"..."},{"label":"Option B","content":"..."}],"where_to_use":"...","instructions":["..."],"impact":"..."}`,

  technical: (domain, finding, vertical) => `You are a GEO technical expert. Generate complete technical fix.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects
- MASTER RULE: For ANY value you cannot read directly from the page content provided — use a placeholder. Never guess, infer, or invent any value
- This applies to: URLs, phone numbers, version numbers, ratings, counts, dates, prices, and statistics
- Specific placeholders: social URLs → ADD_YOUR_LINKEDIN_URL / ADD_YOUR_TWITTER_URL / ADD_YOUR_YOUTUBE_URL / ADD_YOUR_FACEBOOK_URL | logo → ADD_YOUR_LOGO_URL | image → ADD_YOUR_PRODUCT_IMAGE_URL | phone → +1-ADD-YOUR-PHONE | release notes → ADD_YOUR_RELEASE_NOTES_URL | download/install → ADD_YOUR_DOWNLOAD_URL | version → ADD_YOUR_CURRENT_VERSION | ratings → ADD_YOUR_RATING / ADD_YOUR_REVIEW_COUNT | any other unverifiable URL → ADD_YOUR_[DESCRIPTION]_URL
- For telephone, use "+1-ADD-YOUR-PHONE" placeholder
- For sameAs arrays, always use placeholder strings like "ADD_YOUR_LINKEDIN_URL", "ADD_YOUR_TWITTER_URL", "ADD_YOUR_YOUTUBE_URL" — never fabricate real-looking URLs
- The user must replace placeholders with their own verified URLs

Return ONLY valid JSON: {"fix_type":"technical","title":"...","summary":"...","code":"...","where_to_add":"...","instructions":["..."],"impact":"...","verification":"..."}`,

  comparison: (domain, finding, vertical) => `You are a GEO competitive content strategist. Generate a detailed, actionable comparison page brief that a content writer can execute immediately.

Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}

RULES:
- Identify 2-3 real named competitors based on the domain and vertical
- Generate a complete page structure with specific section headings and actual content guidance
- Each section must say exactly what to write — not "add content here" but the actual angle, argument, or copy direction
- key_differentiators must be specific claims the domain can make (based on what you know about them), not generic placeholder text
- seo_title and meta_description must be complete and ready to use
- Do NOT repeat the finding or recommendation — this is a content brief, not a summary
- NEVER include specific statistics, percentages, or numbers you cannot verify (e.g. do not write "40% faster" or "500+ connectors")
- Instead, tell the user what type of stat to find and where: e.g. "Add your verified deployment time stat — check your published case studies or G2 reviews"
- For differentiators, describe the advantage without inventing a number: e.g. "Faster deployment than competitors — add your verified timeline from case studies" not "8x faster"

Return ONLY valid JSON:
{
  "fix_type": "comparison",
  "title": "<specific page title e.g. Appian vs ServiceNow: Which Platform Wins for Enterprise Automation?>",
  "summary": "<1 sentence — what this page will achieve for AI citation>",
  "target_page": "<recommended URL slug e.g. /appian-vs-servicenow>",
  "target_query": "<the exact AI query this page will answer e.g. 'Appian vs ServiceNow for enterprise automation'>",
  "page_structure": [
    {
      "section": "<H2 heading — ready to use>",
      "content": "<3-4 sentences of specific content guidance — what to argue, what data to cite, what angle to take>"
    },
    {
      "section": "Side-by-side Capability Comparison",
      "content": "<List the exact 5-6 dimensions to compare and which side wins each — e.g. 'Low-code speed: Appian wins — cite their 8-week deployment stat'>"
    },
    {
      "section": "When to Choose [Domain] Over [Competitor]",
      "content": "<Specific buyer scenarios where the domain wins — e.g. 'Choose Appian when you need process orchestration across legacy systems without heavy IT involvement'>"
    },
    {
      "section": "When [Competitor] Might Be a Better Fit",
      "content": "<Honest trade-offs — this builds trust and AI engines cite balanced comparisons more often>"
    },
    {
      "section": "Customer Evidence",
      "content": "<Guidance on what proof to include — e.g. 'Add 2 customer quotes specifically mentioning switching from [competitor], include deployment time metrics'>"
    },
    {
      "section": "FAQPage Schema Questions",
      "content": "<3 specific Q&A pairs to add as FAQPage schema — write out the full question and a 2-sentence answer for each>"
    }
  ],
  "key_differentiators": [
    "<Specific differentiator with evidence e.g. '8-week average deployment vs 6-month industry average'>",
    "<Second specific differentiator>",
    "<Third specific differentiator>"
  ],
  "seo_title": "<Complete SEO title ready to use — under 60 chars>",
  "meta_description": "<Complete meta description ready to use — under 155 chars>",
  "impact": "<Specific AI citation impact — e.g. This page will appear when buyers ask ChatGPT to compare these two platforms>"
}`,

  sentiment: (domain, finding, vertical) => `You are a GEO brand sentiment strategist. Generate content to improve AI perception.
Domain: ${domain} | Finding: ${finding.title} | Detail: ${finding.detail} | Vertical: ${vertical}
RULES:
- Maximum 3 instructions
- No timeframes (no "weeks", "days", "hours")
- Code field must be actual copy-paste content (real JSON-LD, real HTML, real text) not a description
- Instructions must be specific actions, not projects
- MASTER RULE: For ANY value you cannot read directly from the page content provided — use a placeholder. Never guess, infer, or invent any value
- This applies to: URLs, phone numbers, version numbers, ratings, counts, dates, prices, and statistics
- Specific placeholders: social URLs → ADD_YOUR_LINKEDIN_URL / ADD_YOUR_TWITTER_URL / ADD_YOUR_YOUTUBE_URL / ADD_YOUR_FACEBOOK_URL | logo → ADD_YOUR_LOGO_URL | image → ADD_YOUR_PRODUCT_IMAGE_URL | phone → +1-ADD-YOUR-PHONE | release notes → ADD_YOUR_RELEASE_NOTES_URL | download/install → ADD_YOUR_DOWNLOAD_URL | version → ADD_YOUR_CURRENT_VERSION | ratings → ADD_YOUR_RATING / ADD_YOUR_REVIEW_COUNT | any other unverifiable URL → ADD_YOUR_[DESCRIPTION]_URL
- For telephone, use "+1-ADD-YOUR-PHONE" placeholder
- For sameAs arrays, always use placeholder strings like "ADD_YOUR_LINKEDIN_URL", "ADD_YOUR_TWITTER_URL", "ADD_YOUR_YOUTUBE_URL" — never fabricate real-looking URLs
- The user must replace placeholders with their own verified URLs

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
