import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GeoIntelBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ""
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 6000)
  } catch { return "" }
}

function extractLinksFromHtml(html: string, base: string): string[] {
  const links: string[] = []
  const matches = html.matchAll(/href=["']([\/][^"\'\s>]+)["\']/g)
  for (const m of matches) {
    const path = m[1].split("?")[0].split("#")[0]
    if (path.length > 1 && path.length < 60) links.push(path)
  }
  return [...new Set(links)]
}

function findContentPaths(links: string[]): Record<string, string[]> {
  const patterns: Record<string, RegExp[]> = {
    blog: [/\/blog/, /\/articles/, /\/insights/, /\/news/, /\/posts/, /\/updates/],
    compare: [/\/vs\//, /\/compare/, /\/alternatives/, /\/versus/],
    casestudies: [/\/case-stud/, /\/customers/, /\/success/, /\/stories/, /\/client/],
    solutions: [/\/solutions/, /\/products/, /\/platform/, /\/use-cases/, /\/features/, /\/services/],
    faq: [/\/faq/, /\/help/, /\/support/, /\/docs/, /\/questions/],
    resources: [/\/resources/, /\/library/, /\/knowledge/, /\/content/, /\/whitepapers/, /\/guides/],
  }
  const found: Record<string, string[]> = {}
  for (const [key, regexes] of Object.entries(patterns)) {
    const matches = links.filter(l => regexes.some(r => r.test(l)))
    if (matches.length > 0) found[key] = matches.slice(0, 3)
  }
  return found
}

async function discoverAndFetchContent(domain: string): Promise<{ pages: Record<string, string>; foundPaths: Record<string, string[]>; discoveredLinks: string[] }> {
  const base = "https://" + domain.replace(/^https?:///, "").split("/")[0];
  
  const homepageRaw = await fetch(base, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GeoIntelBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  }).then(r => r.text()).catch(() => "")
  
  const allLinks = extractLinksFromHtml(homepageRaw, base)
  const contentPaths = findContentPaths(allLinks)
  
  const homepageText = homepageRaw
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 4000)

  const pages: Record<string, string> = { homepage: homepageText }
  
  const toFetch: Array<{ key: string; url: string }> = []
  
  for (const [key, paths] of Object.entries(contentPaths)) {
    toFetch.push({ key, url: \`\${base}\${paths[0]}\` })
  }
  
  const fallbackPaths = [
    { key: "blog_fallback", paths: ["/blog", "/articles", "/insights", "/resources", "/news"] },
    { key: "compare_fallback", paths: ["/compare", "/vs", "/alternatives"] },
    { key: "casestudies_fallback", paths: ["/case-studies", "/customers", "/success-stories"] },
    { key: "solutions_fallback", paths: ["/solutions", "/products", "/platform"] },
    { key: "faq_fallback", paths: ["/faq", "/help", "/support"] },
  ]
  
  for (const { key, paths } of fallbackPaths) {
    const baseKey = key.replace("_fallback", "")
    if (!contentPaths[baseKey]) {
      for (const path of paths) {
        toFetch.push({ key: baseKey, url: \`\${base}\${path}\` })
      }
    }
  }
  
  const results = await Promise.allSettled(
    toFetch.map(async ({ key, url }) => ({ key, url, content: await fetchPage(url) }))
  )
  
  const seen = new Set<string>()
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.content.length > 300) {
      const { key, content } = r.value
      if (!seen.has(key)) {
        pages[key] = content
        seen.add(key)
      }
    }
  }

  return { pages, foundPaths: contentPaths, discoveredLinks: allLinks.slice(0, 20) }
}

export async function POST(req: NextRequest) {
  try {
    const { domain, vertical = "saas", customUrls } = await req.json()
    if (!domain) return NextResponse.json({ error: "Domain required" }, { status: 400 })

    const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0]
    const base = `https://${cleanDomain}`

    // If custom URLs provided, fetch them directly
    let { pages, foundPaths, discoveredLinks } = await discoverAndFetchContent(cleanDomain)

    if (customUrls) {
      const customKeys: Record<string, string> = {
        blog: "blog", compare: "compare", casestudies: "casestudies",
        solutions: "solutions", faq: "faq"
      }
      await Promise.all(
        Object.entries(customUrls).map(async ([key, url]) => {
          if (!url) return
          const fullUrl = (url as string).startsWith("http") ? url as string : `https://${url}`
          const fetched = await fetchPage(fullUrl)
          if (fetched.length > 200) {
            pages[customKeys[key]] = fetched
            foundPaths[customKeys[key]] = [fullUrl as string]
          }
        })
      )
    }
    const foundPages = Object.keys(pages).filter(k => k !== "homepage")
    
    const navigationHint = Object.keys(foundPaths).length > 0
      ? \`Navigation analysis found content at these paths: \${JSON.stringify(foundPaths)}\`
      : \`No content paths found via navigation — tried common paths. Site may use custom URL structure.\`

    const prompt = \`You are a GEO content strategist. Analyse \${cleanDomain} content for AI search visibility.

IMPORTANT: Base your analysis ONLY on what you can actually see in the content below. 
- If a content section was NOT fetched (shows "not found"), say it could not be accessed at standard paths — do NOT assume it doesn't exist.
- If content WAS fetched, analyse what's actually there.
- Be specific and accurate. Do not hallucinate content that isn't shown.

VERTICAL: \${vertical}
\${navigationHint}
PAGES SUCCESSFULLY FETCHED: \${foundPages.join(", ") || "homepage only"}

HOMEPAGE CONTENT:
\${pages.homepage?.substring(0, 2000) || "not available"}

BLOG/ARTICLES/RESOURCES:
\${(pages.blog || pages.resources || pages.blog_fallback) ? (pages.blog || pages.resources || "fetched but minimal content") : "Could not access at standard paths — may exist at custom URL"}

COMPARISON PAGES:
\${pages.compare || "Could not access at standard paths — may exist at custom URL"}

CASE STUDIES:
\${pages.casestudies || "Could not access at standard paths — may exist at custom URL"}

SOLUTION/PRODUCT PAGES:
\${pages.solutions || "Could not access at standard paths — may exist at custom URL"}

FAQ:
\${pages.faq || "Could not access at standard paths — may exist at custom URL"}

Return ONLY valid JSON:
{
  "overall_score": <0-100>,
  "overall_grade": "<A|B|C|D|F>",
  "summary": "<2-3 sentences — honest, based only on what was actually fetched. If content couldn't be accessed, say so rather than assuming it doesn't exist>",
  "crawl_note": "<brief note on what was and wasn't accessible — helps user understand limitations>",
  "content_types": [
    {
      "type": "Blog & Articles",
      "icon": "📝",
      "status": "<strong|weak|missing|unknown>",
      "score": <0-100>,
      "found": <true|false>,
      "accessible": <true|false>,
      "current_state": "<specific — if not accessible say 'Could not access at standard paths. Try entering your blog URL directly in the Page Analyser tab'>",
      "gap": "<the specific GEO gap if content was found, otherwise 'Needs manual review'>",
      "recommendations": [
        {
          "priority": "<critical|high|quick>",
          "action": "<Create|Update|Add|Rewrite>",
          "title": "<specific content title>",
          "why": "<why this improves AI citation>",
          "effort": "<time estimate>"
        }
      ]
    },
    { "type": "Comparison Pages", "icon": "⚔️", "status": "unknown", "score": 0, "found": false, "accessible": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "Case Studies", "icon": "📈", "status": "unknown", "score": 0, "found": false, "accessible": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "Product & Solution Pages", "icon": "🏭", "status": "unknown", "score": 0, "found": false, "accessible": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "FAQ Coverage", "icon": "❓", "status": "unknown", "score": 0, "found": false, "accessible": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "Whitepapers & Thought Leadership", "icon": "📄", "status": "unknown", "score": 0, "found": false, "accessible": false, "current_state": "...", "gap": "...", "recommendations": [] }
  ],
  "quick_wins": [
    { "action": "<specific action>", "impact": "<AI visibility impact>", "effort": "<time>" }
  ],
  "missing_content": ["<only list content that is genuinely missing based on what was found — not what couldn't be accessed>"]
}\`

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 })

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({ analysis, foundPages, discoveredLinks })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 })
  }
}
