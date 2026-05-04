import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import * as fs from "fs"

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

function extractLinks(html: string): string[] {
  const links: string[] = []
  const matches = html.matchAll(/href=["']([\/][^"'\s>]+)['"]/g)
  for (const m of matches) {
    const path = m[1].split("?")[0].split("#")[0]
    if (path.length > 1 && path.length < 60) links.push(path)
  }
  return [...new Set(links)]
}

function findContentPaths(links: string[]): Record<string, string[]> {
  const patterns: Record<string, RegExp[]> = {
    blog: [/\/blog/, /\/articles/, /\/insights/, /\/resources/, /\/news/],
    compare: [/\/vs\//, /\/compare/, /\/alternatives/],
    casestudies: [/\/case-stud/, /\/customers/, /\/success/, /\/stories/],
    solutions: [/\/solutions/, /\/products/, /\/platform/, /\/use-cases/, /\/features/],
    faq: [/\/faq/, /\/help/, /\/support/],
    resources: [/\/resources/, /\/library/, /\/knowledge/, /\/whitepapers/],
  }
  const found: Record<string, string[]> = {}
  for (const [key, regexes] of Object.entries(patterns)) {
    const matches = links.filter(l => regexes.some(r => r.test(l)))
    if (matches.length > 0) found[key] = matches.slice(0, 3)
  }
  return found
}

async function discoverAndFetch(domain: string): Promise<{ pages: Record<string, string>; foundPaths: Record<string, string[]> }> {
  const base = "https://" + domain.replace(/^https?:\/\//, "").split("/")[0]

  const homepageRaw = await fetch(base, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GeoIntelBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  }).then(r => r.text()).catch(() => "")

  const allLinks = extractLinks(homepageRaw)
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
    toFetch.push({ key, url: base + paths[0] })
  }

  const fallbacks = [
    { key: "blog", paths: ["/blog", "/articles", "/insights", "/resources", "/news"] },
    { key: "compare", paths: ["/compare", "/vs", "/alternatives"] },
    { key: "casestudies", paths: ["/case-studies", "/customers", "/success-stories"] },
    { key: "solutions", paths: ["/solutions", "/products", "/platform"] },
    { key: "faq", paths: ["/faq", "/help", "/support"] },
  ]

  for (const { key, paths } of fallbacks) {
    if (!contentPaths[key]) {
      for (const path of paths) {
        toFetch.push({ key, url: base + path })
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

  return { pages, foundPaths: contentPaths }
}

export async function POST(req: NextRequest) {
  try {
    const { domain, vertical = "saas", customUrls } = await req.json()
    if (!domain) return NextResponse.json({ error: "Domain required" }, { status: 400 })

    const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0]
    const { pages, foundPaths } = await discoverAndFetch(cleanDomain)
    const foundPages = Object.keys(pages).filter(k => k !== "homepage")

    if (customUrls) {
      await Promise.all(
        Object.entries(customUrls).map(async ([key, url]) => {
          if (!url) return
          const fullUrl = (url as string).startsWith("http") ? url as string : "https://" + (url as string)
          const fetched = await fetchPage(fullUrl)
          if (fetched.length > 200) pages[key] = fetched
        })
      )
    }

    let skillContent = ""
    try {
      skillContent = fs.readFileSync(process.cwd() + "/.claude/agents/geo-content-analysis.md", "utf-8")
    } catch { skillContent = "" }

    const prompt = `${skillContent ? `SKILL INSTRUCTIONS:\n${skillContent}\n\n` : "Use 0-100 scores with status labels (Strong/Good/Needs work/Weak/Critical) not letter grades.\n\n"}You are a GEO content strategist. Analyse ${cleanDomain} content for AI search visibility.

IMPORTANT: Base analysis ONLY on content you can actually see. If a section was NOT fetched, say it could not be accessed — do NOT assume it doesn't exist.

VERTICAL: ${vertical}
PAGES FETCHED: ${foundPages.join(", ") || "homepage only"}

HOMEPAGE: ${pages.homepage?.substring(0, 2000) || "not available"}
BLOG/RESOURCES: ${(pages.blog || pages.resources || "Could not access at standard paths")}
COMPARISON PAGES: ${pages.compare || "Could not access at standard paths"}
CASE STUDIES: ${pages.casestudies || "Could not access at standard paths"}
SOLUTIONS: ${pages.solutions || "Could not access at standard paths"}
FAQ: ${pages.faq || "Could not access at standard paths"}

Return ONLY valid JSON:
{
  "overall_score": <0-100>,
  "overall_grade": "<A|B|C|D|F>",
  "summary": "<2-3 sentences — honest, based only on what was fetched>",
  "content_types": [
    {
      "type": "Blog & Articles",
      "icon": "📝",
      "status": "<strong|weak|missing|unknown>",
      "score": <0-100>,
      "found": <true|false>,
      "accessible": <true|false>,
      "current_state": "<specific description>",
      "gap": "<specific GEO gap>",
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
  "missing_content": ["<specific missing content piece>"]
}`

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    // Find the outermost JSON object robustly
    let analysis: any = null
    const start = text.indexOf("{")
    if (start === -1) return NextResponse.json({ error: "No JSON in response" }, { status: 500 })
    // Try progressively shorter substrings if full parse fails
    let end = text.lastIndexOf("}")
    while (end > start) {
      try {
        analysis = JSON.parse(text.substring(start, end + 1))
        break
      } catch {
        end = text.lastIndexOf("}", end - 1)
      }
    }
    if (!analysis) return NextResponse.json({ error: "Failed to parse analysis response" }, { status: 500 })
    return NextResponse.json({ analysis, foundPages })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 })
  }
}
// patch applied
