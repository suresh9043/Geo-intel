import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GeoIntelBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .substring(0, 6000)
  } catch { return "" }
}

async function discoverPages(domain: string): Promise<Record<string, string>> {
  const base = `https://${domain.replace(/^https?:\/\//, "").split("/")[0]}`
  const targets = [
    { key: "blog", paths: ["/blog", "/articles", "/insights", "/resources"] },
    { key: "compare", paths: ["/compare", "/vs", "/alternatives"] },
    { key: "casestudies", paths: ["/case-studies", "/customers", "/success-stories"] },
    { key: "solutions", paths: ["/solutions", "/products", "/platform", "/use-cases"] },
    { key: "faq", paths: ["/faq", "/help", "/support"] },
  ]
  const results: Record<string, string> = {}
  const homepage = await fetchPage(base)
  if (homepage) results["homepage"] = homepage
  await Promise.all(targets.map(async ({ key, paths }) => {
    for (const path of paths) {
      const content = await fetchPage(`${base}${path}`)
      if (content.length > 500) { results[key] = content; break }
    }
  }))
  return results
}

export async function POST(req: NextRequest) {
  try {
    const { domain, vertical = "saas" } = await req.json()
    if (!domain) return NextResponse.json({ error: "Domain required" }, { status: 400 })

    const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0]
    const pages = await discoverPages(cleanDomain)
    const foundPages = Object.keys(pages).filter(k => k !== "homepage")

    const skillPath = process.cwd() + "/.claude/agents/geo-content-analysis.md"
    let skillContent = ""
    try {
      const fs = await import("fs")
      skillContent = fs.readFileSync(skillPath, "utf-8")
    } catch { skillContent = "" }

    const prompt = `${skillContent ? `SKILL INSTRUCTIONS:\n${skillContent}\n\n` : ""}You are a GEO content strategist. Analyse ${cleanDomain} content for AI search visibility.

VERTICAL: ${vertical}
PAGES FOUND: ${foundPages.join(", ") || "homepage only"}

HOMEPAGE: ${pages.homepage?.substring(0, 2000) || "not available"}
BLOG: ${pages.blog?.substring(0, 2000) || "not found"}
COMPARE: ${pages.compare?.substring(0, 1500) || "not found"}
CASE STUDIES: ${pages.casestudies?.substring(0, 1500) || "not found"}
SOLUTIONS: ${pages.solutions?.substring(0, 1500) || "not found"}
FAQ: ${pages.faq?.substring(0, 1500) || "not found"}

Return ONLY valid JSON, no markdown:
{
  "overall_score": <0-100>,
  "overall_grade": "<A|B|C|D|F>",
  "summary": "<2-3 sentence honest assessment>",
  "content_types": [
    {
      "type": "Blog & Articles",
      "icon": "📝",
      "status": "<strong|weak|missing>",
      "score": <0-100>,
      "found": <true|false>,
      "current_state": "<specific description of what exists or is missing>",
      "gap": "<specific GEO gap — what AI engines cannot find or cite>",
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
    { "type": "Comparison Pages", "icon": "⚔️", "status": "...", "score": 0, "found": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "Case Studies", "icon": "📈", "status": "...", "score": 0, "found": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "Product & Solution Pages", "icon": "🏭", "status": "...", "score": 0, "found": false, "current_state": "...", "gap": "...", "recommendations": [] },
    { "type": "FAQ Coverage", "icon": "❓", "status": "...", "score": 0, "found": false, "current_state": "...", "gap": "...", "recommendations": [] }
  ],
  "quick_wins": [
    { "action": "<specific action>", "impact": "<AI visibility impact>", "effort": "<time>" }
  ],
  "missing_content": ["<specific missing content piece 1>", "<specific missing piece 2>"]
}`

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 })

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({ analysis, foundPages })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 })
  }
}
