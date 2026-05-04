import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchPage(url: string): Promise<string> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  }
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\n]/g, " ")
      .trim()
      .substring(0, 8000)
  } catch (e: any) {
    throw new Error(`Could not fetch page: ${e.message}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, contentType, domain, vertical = "saas" } = await req.json()
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })

    let pageContent = ""
    try {
      pageContent = await fetchPage(url)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    if (pageContent.length < 100) {
      return NextResponse.json({ error: "Page returned too little content — it may block crawlers or require login" }, { status: 400 })
    }

    const prompt = `You are a GEO (Generative Engine Optimisation) content specialist. Analyse this specific page and give a detailed brief to improve AI search citations.

URL: ${url}
DOMAIN: ${domain}
VERTICAL: ${vertical}

PAGE CONTENT:
${pageContent.substring(0, 6000)}

Return ONLY valid JSON, no markdown, no backticks:
{
  "page_title": "<detected page title>",
  "content_type": "<Blog Post|Comparison Page|Case Study|Solution Page|FAQ|Whitepaper|Homepage|Other>",
  "geo_score": <0-100>,
  "summary": "<2-3 sentence honest assessment>",
  "what_works": ["<thing that works for AI citation>"],
  "critical_gaps": [
    {
      "gap": "<specific gap>",
      "fix": "<exact fix>",
      "example": "<concrete example>",
      "impact": "<AI citation improvement>"
    }
  ],
  "missing_schema": [
    {
      "type": "<schema type>",
      "why": "<why it helps>",
      "snippet": "<minimal JSON-LD>"
    }
  ],
  "rewrite_suggestions": [
    {
      "element": "<what to change>",
      "current": "<current text>",
      "suggested": "<rewrite>",
      "why": "<reason>"
    }
  ],
  "quick_wins": [
    {
      "action": "<action>",
      "effort": "<time>",
      "impact": "<improvement>"
    }
  ]
}`

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const start = text.indexOf("{")
    if (start === -1) return NextResponse.json({ error: "No analysis returned" }, { status: 500 })

    let analysis: any = null
    let end = text.lastIndexOf("}")
    while (end > start) {
      try {
        analysis = JSON.parse(text.substring(start, end + 1))
        break
      } catch {
        end = text.lastIndexOf("}", end - 1)
      }
    }

    if (!analysis) {
      console.error("Failed to parse. Raw response:", text.substring(0, 500))
      return NextResponse.json({ error: "Failed to parse analysis", raw: text.substring(0, 200) }, { status: 500 })
    }
    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 })
  }
}
