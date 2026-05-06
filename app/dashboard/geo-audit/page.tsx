"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { saveAnalysisResult, getAnalysisHistory, getCachedAnalysis } from "@/lib/queries"
import { Sidebar } from "@/components/sidebar"
import { Search, Loader2, ChevronDown, ChevronUp, Zap, AlertTriangle, AlertCircle, Info, ArrowRight, X, FileText, BarChart2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

function getScoreStatus(score: number) {
  if (score >= 75) return { label: "Strong",    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300" }
  if (score >= 55) return { label: "Good",       color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-300"   }
  if (score >= 35) return { label: "Needs work", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300"  }
  if (score >= 20) return { label: "Weak",       color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" }
  return               { label: "Critical",  color: "text-red-700",    bg: "bg-red-50",    border: "border-red-300"    }
}

const DIMENSION_LABELS: Record<string, string> = {
  "geo-competitive": "Competitive", "geo-content": "Content",
  "geo-authority": "Authority", "geo-schema": "Schema", "geo-crawl": "Crawlability",
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: any; label: string; badge: string }> = {
  Critical: { border: "border-l-red-500",    bg: "bg-red-50",    icon: AlertCircle,   label: "Critical", badge: "bg-red-100 text-red-700"     },
  High:     { border: "border-l-orange-400", bg: "bg-orange-50", icon: AlertTriangle, label: "High",     badge: "bg-orange-100 text-orange-700" },
  Medium:   { border: "border-l-amber-400",  bg: "bg-amber-50",  icon: Info,          label: "Medium",   badge: "bg-amber-100 text-amber-700"   },
}

function ScoreBar({ score, dimension }: { score: number; dimension: string }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-500"
  const textColor = score >= 70 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 flex-shrink-0 text-xs font-medium text-muted-foreground">{DIMENSION_LABELS[dimension]}</span>
      <div className="flex-1 h-2.5 rounded-full bg-white/60 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("w-8 flex-shrink-0 text-right text-sm font-bold tabular-nums", textColor)}>{score}</span>
    </div>
  )
}

function FindingRow({ finding, domain, vertical }: { finding: any; domain: string; vertical: string }) {
  const [open, setOpen] = useState(false)
  const [loadingFix, setLoadingFix] = useState(false)
  const [fix, setFix] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.Medium
  const Icon = style.icon

  const getFix = async () => {
    setLoadingFix(true)
    try {
      const res = await fetch("/api/geo-fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, finding, vertical }) })
      const data = await res.json()
      if (data.fix) setFix(data.fix)
    } catch {}
    setLoadingFix(false)
  }

  return (
    <div className={cn("rounded-xl border border-border border-l-4 overflow-hidden shadow-sm", style.border, style.bg)}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 px-4 py-4 text-left hover:brightness-95 transition-all">
        <span className={cn("flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 mt-0.5", style.badge)}>
          <Icon className="h-3 w-3" />{style.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">{finding.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{DIMENSION_LABELS[finding.dimension]}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />}
      </button>
      {open && (
        <div className="border-t border-border/50 px-5 py-4 flex flex-col gap-4 bg-white/40">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">The Problem</p>
            <p className="text-sm text-card-foreground leading-relaxed">{finding.detail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recommendation</p>
            <p className="text-sm text-card-foreground leading-relaxed">{finding.recommendation}</p>
          </div>
          {!fix && (
            <button onClick={getFix} disabled={loadingFix} className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {loadingFix ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><Zap className="h-3.5 w-3.5" /> Get fix</>}
            </button>
          )}
          {fix && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Generated Fix</p>
              <p className="text-sm text-card-foreground leading-relaxed">{fix.summary}</p>
              {fix.code && (
                <div className="rounded-lg bg-muted overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground font-mono">Implementation</span>
                    <button onClick={() => { navigator.clipboard.writeText(fix.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className={cn("flex items-center gap-1.5 text-xs font-medium", copied ? "text-emerald-600" : "text-muted-foreground")}>
                      {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{fix.code}</pre>
                </div>
              )}
              {fix.instructions && fix.instructions.map((step: string, i: number) => (
                <div key={i} className="flex gap-2 text-xs text-card-foreground">
                  <span className="flex-shrink-0 font-bold text-primary">{i + 1}.</span>{step}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TechnicalAuditTab({ vertical }: { vertical: string }) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState("")

  const domain = report?.url?.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0] || ""

  const runAudit = async () => {
    if (!url.trim()) return
    setLoading(true); setError(""); setReport(null)
    try {
      const res = await fetch("/api/geo-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), vertical }) })
      const data = await res.json()
      if (data.report) setReport(data.report)
      else setError(data.error || "Audit failed")
    } catch { setError("Failed to connect to audit service") }
    setLoading(false)
  }

  const allFindings = report ? [...report.critical_findings, ...report.high_findings, ...(report.all_findings || []).filter((f: any) => f.severity === "Medium")] : []
  const ss = report ? getScoreStatus(report.composite_score) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && runAudit()} placeholder="Enter website URL (e.g. appian.com)" className="flex-1 bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground outline-none" />
            {url && <button onClick={() => setUrl("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
          </div>
          <button onClick={runAudit} disabled={loading || !url.trim()} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Run Audit <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>

      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm font-semibold text-card-foreground">Running GEO audit...</p>
          <p className="text-xs text-muted-foreground">5 AI agents analysing your site · ~30 seconds</p>
        </div>
      )}

      {report && !loading && ss && (
        <div className="flex flex-col gap-5">
          <div className={cn("rounded-2xl border-2 p-6 shadow-md", ss.bg, ss.border)}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{report.url}</p>
                <div className="flex items-end gap-3">
                  <span className="text-7xl font-black tabular-nums text-card-foreground leading-none">{report.composite_score}</span>
                  <div className="mb-2">
                    <span className={cn("text-lg font-bold px-2 py-0.5 rounded-lg", ss.color, ss.bg)}>{ss.label}</span>
                    <p className="text-xs text-muted-foreground mt-2">GEO Score · out of 100</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 min-w-64 bg-white/50 rounded-xl p-4 border border-white/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dimension Scores</p>
                {Object.entries(report.dimension_scores || {}).map(([dim, data]: [string, any]) => (
                  <ScoreBar key={dim} score={data.score} dimension={dim} />
                ))}
              </div>
            </div>
          </div>
          {/* Crawl status strip */}
          {report.raw_data && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold text-card-foreground">AI Crawler Access</p>
                <span className="text-xs text-muted-foreground">Critical for AI citation</span>
              </div>
              <div className="grid grid-cols-5 divide-x divide-border">
                {[
                  { label: "GPTBot", status: report.raw_data?.ai_bot_status?.GPTBot },
                  { label: "PerplexityBot", status: report.raw_data?.ai_bot_status?.PerplexityBot },
                  { label: "ClaudeBot", status: report.raw_data?.ai_bot_status?.ClaudeBot },
                  { label: "Google-Extended", status: report.raw_data?.ai_bot_status?.["Google-Extended"] },
                  { label: "LLMs.txt", status: report.raw_data?.has_llms_txt ? "found" : "missing" },
                ].map(item => {
                  const isGood = item.status === "allowed" || item.status === "found"
                  const isBad = item.status === "blocked" || item.status === "missing"
                  return (
                    <div key={item.label} className="px-4 py-3 flex flex-col items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", isGood ? "bg-emerald-500" : isBad ? "bg-red-500" : "bg-amber-400")} />
                      <p className="text-xs font-medium text-card-foreground text-center">{item.label}</p>
                      <p className={cn("text-xs font-semibold capitalize", isGood ? "text-emerald-600" : isBad ? "text-red-600" : "text-amber-600")}>
                        {item.status || "unknown"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {allFindings.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-card-foreground">Findings & Fixes</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{allFindings.length} issues found</span>
              </div>
              {allFindings.map((f: any, i: number) => <FindingRow key={i} finding={f} domain={domain} vertical={vertical} />)}
            </div>
          )}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card px-8 py-6 flex items-center gap-8">
            <div className="flex-shrink-0">
              <svg width="72" height="72" viewBox="0 0 56 56" style={{ animation: "float 3s ease-in-out infinite" }}>
                <rect x="12" y="22" width="32" height="28" rx="8" fill="#eef1fd" stroke="#3B5BDB" strokeWidth="1.5"/>
                <circle cx="21" cy="33" r="4" fill="white"/><circle cx="35" cy="33" r="4" fill="white"/>
                <circle cx="21" cy="33" r="2" fill="#3B5BDB"/><circle cx="35" cy="33" r="2" fill="#3B5BDB"/>
                <path d="M22 41 Q28 46 34 41" fill="none" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="28" y1="22" x2="28" y2="12" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
                <ellipse cx="28" cy="10" rx="7" ry="4" fill="none" stroke="#3B5BDB" strokeWidth="1.5" style={{ transformOrigin: "28px 10px", animation: "spin 3s linear infinite" }}/>
                <rect x="4" y="28" width="8" height="4" rx="2" fill="#eef1fd" stroke="#3B5BDB" strokeWidth="1"/>
                <rect x="44" y="28" width="8" height="4" rx="2" fill="#eef1fd" stroke="#3B5BDB" strokeWidth="1"/>
                
              </svg>
              <style>{"@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
            </div>
            <div className="flex-1">
              <div className="bg-primary/5 border border-primary/20 rounded-xl rounded-tl-none px-4 py-3 mb-3">
                <p className="text-sm font-semibold text-card-foreground mb-0.5">Hi! I am Radar, your GEO analyst.</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Enter any website domain and I will audit it across 5 GEO dimensions. You will get a score, specific findings, and copy-paste fixes ready to implement.</p>
              </div>
              <div className="flex items-center gap-6">
                {[
                  { label: "Score 0-100", sub: "With status label" },
                  { label: "5 dimensions", sub: "Full breakdown" },
                  { label: "Copy-paste fixes", sub: "Ready same day" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && <div className="w-px h-6 bg-border" />}
                    <div>
                      <p className="text-xs font-semibold text-card-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Real data", desc: "We fetch your site, check robots.txt, extract schema and analyse content structure.", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
              { label: "5 dimensions scored", desc: "Crawlability, content depth, schema markup, authority signals and competitive positioning.", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
              { label: "Fixes ready to ship", desc: "Every finding has a copy-paste fix — schema JSON-LD, robots.txt snippets, content rewrites.", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
            ].map(item => (
              <div key={item.label} className={`rounded-xl border p-4 ${item.bg} ${item.border}`}>
                <p className={`text-sm font-semibold mb-1 ${item.color}`}>{item.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContentAnalysisTab({ vertical }: { vertical: string }) {
  const { user } = useAuth()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [currentUrl, setCurrentUrl] = useState("")
  const [error, setError] = useState("")
  const [blocked, setBlocked] = useState(false)
  const [pastedContent, setPastedContent] = useState("")
  const [history, setHistory] = useState<any[]>([])
  const [expandedGap, setExpandedGap] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    getAnalysisHistory(user.id, 10).then(setHistory)
  }, [user])

  const run = async (usePasted = false, runUrl?: string) => {
    const targetUrl = runUrl || url
    if (!targetUrl.trim()) return
    setLoading(true); setError(""); setAnalysis(null); setBlocked(false)
    const fullUrl = targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl
    const domain = fullUrl.replace(/^https?:\/\//, "").split("/")[0]
    if (user && !usePasted) {
      const hit = await getCachedAnalysis(user.id, fullUrl)
      if (hit) { setAnalysis(hit.analysis); setCurrentUrl(fullUrl); setLoading(false); return }
    }
    try {
      const res = await fetch("/api/content-page-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl, domain, vertical, pastedContent: usePasted ? pastedContent : undefined }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAnalysis(data.analysis); setCurrentUrl(fullUrl)
        if (user) { await saveAnalysisResult(user.id, fullUrl, data.analysis); getAnalysisHistory(user.id, 10).then(setHistory) }
      } else if (data.blocked) { setBlocked(true) }
      else setError(data.error || "Analysis failed")
    } catch { setError("Could not connect to analysis service") }
    setLoading(false)
  }

  const ss = analysis ? getScoreStatus(analysis.geo_score) : null

  return (
    <div style={{ background: "#09090b", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search bar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#121215", border: "1px solid #27272a", borderRadius: 8, padding: "10px 12px" }}>
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: "#71717a" }} />
            <input
              type="text" value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && run()}
              placeholder="Paste a page URL — blog post, case study, whitepaper, FAQ..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#fafafa" }}
            />
            {url && <button onClick={() => { setUrl(""); setAnalysis(null); setError("") }}><X className="h-3.5 w-3.5" style={{ color: "#71717a" }} /></button>}
          </div>
          <button
            onClick={() => run()}
            disabled={loading || !url.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading || !url.trim() ? 0.5 : 1 }}
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Analyse <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#52525b", marginTop: 8 }}>Works on specific content pages — not section homepages like /blog or /resources</p>
      </div>

      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Error */}
        {error && (
          <div style={{ background: "#3b1111", border: "1px solid #7f1d1d", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, color: "#fca5a5", fontSize: 14 }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Blocked fallback */}
        {blocked && (
          <div style={{ background: "#1c1400", border: "1px solid #78350f", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#fbbf24", marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fbbf24", margin: 0 }}>This site blocks automated access</p>
                <p style={{ fontSize: 12, color: "#92400e", margin: "4px 0 0" }}>Open the page in your browser, select all (Ctrl+A), copy, and paste below.</p>
              </div>
            </div>
            <textarea
              value={pastedContent}
              onChange={e => setPastedContent(e.target.value)}
              placeholder="Paste the page content here..."
              rows={5}
              style={{ width: "100%", background: "#121215", border: "1px solid #27272a", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#fafafa", fontFamily: "monospace", resize: "none", outline: "none", boxSizing: "border-box" }}
            />
            <button
              onClick={() => run(true)}
              disabled={loading || pastedContent.trim().length < 100}
              style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, background: "#92400e", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing...</> : <>Analyse pasted content <ArrowRight className="h-3.5 w-3.5" /></>}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ background: "#121215", border: "1px solid #27272a", borderRadius: 10, padding: "32px 24px", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #7c3aed", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", margin: 0 }}>Fetching and analysing page...</p>
              <p style={{ fontSize: 12, color: "#71717a", margin: "4px 0 0" }}>Reading content, checking citation readiness</p>
            </div>
          </div>
        )}

        {/* Results */}
        {analysis && ss && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Score card */}
            <div style={{ background: "#121215", border: "1px solid #27272a", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", margin: "0 0 4px" }}>{analysis.content_type}</p>
                  <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, maxWidth: 500 }}>{analysis.page_title || currentUrl}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.08em", background: ss.bg.includes("emerald") ? "#0a1a0f" : ss.bg.includes("violet") ? "#13091f" : ss.bg.includes("amber") ? "#140f00" : "#1a0000", color: ss.color.includes("emerald") ? "#34d399" : ss.color.includes("violet") ? "#a78bfa" : ss.color.includes("amber") ? "#fbbf24" : "#f87171", border: `1px solid ${ss.color.includes("emerald") ? "#14532d" : ss.color.includes("violet") ? "#4c1d95" : ss.color.includes("amber") ? "#78350f" : "#7f1d1d"}` }}>
                  {ss.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
                <span style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: "#fafafa", tabularNums: true } as any}>{analysis.geo_score}</span>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div style={{ height: 6, borderRadius: 3, background: "#27272a", marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 3, background: ss.color.includes("emerald") ? "#34d399" : ss.color.includes("violet") ? "#a78bfa" : ss.color.includes("amber") ? "#fbbf24" : "#f87171", width: `${analysis.geo_score}%`, transition: "width 0.7s ease" }} />
                  </div>
                  <p style={{ fontSize: 11, color: "#52525b", margin: 0 }}>GEO readiness · out of 100</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.7, marginTop: 16, marginBottom: 0 }}>{analysis.summary}</p>
            </div>

            {/* What works */}
            {analysis.what_works?.length > 0 && (
              <div style={{ background: "#0a1a0f", border: "1px solid #14532d", borderRadius: 10, padding: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#34d399", margin: "0 0 12px" }}>What works</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {analysis.what_works.map((w: string, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ color: "#34d399", fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                      <p style={{ fontSize: 12, color: "#6ee7b7", lineHeight: 1.6, margin: 0 }}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical gaps */}
            {analysis.critical_gaps?.length > 0 && (
              <div style={{ border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#18181b", borderBottom: "1px solid #27272a", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", margin: 0 }}>Critical Gaps & Fixes</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#ef444415", color: "#f87171", border: "1px solid #7f1d1d" }}>{analysis.critical_gaps.length} gaps</span>
                </div>
                {analysis.critical_gaps.map((gap: any, i: number) => (
                  <div key={i} style={{ borderTop: i > 0 ? "1px solid #18181b" : "none", background: "#0c0c0f" }}>
                    <button
                      onClick={() => setExpandedGap(expandedGap === i ? null : i)}
                      style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 6 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", margin: "0 0 2px" }}>{gap.gap}</p>
                        <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>Fix: {gap.fix}</p>
                      </div>
                      {expandedGap === i
                        ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: "#71717a", marginTop: 2 }} />
                        : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "#71717a", marginTop: 2 }} />}
                    </button>
                    {expandedGap === i && (
                      <div style={{ padding: "0 20px 16px 38px", borderTop: "1px solid #18181b" }}>
                        {gap.example && (
                          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "10px 14px", marginBottom: 10, marginTop: 12 }}>
                            <p style={{ fontSize: 12, fontStyle: "italic", color: "#a1a1aa", margin: 0 }}>"{gap.example}"</p>
                          </div>
                        )}
                        <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>Impact: {gap.impact}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Rewrite suggestions */}
            {analysis.rewrite_suggestions?.length > 0 && (
              <div style={{ border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#18181b", borderBottom: "1px solid #27272a", padding: "12px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", margin: 0 }}>Rewrite Suggestions</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#27272a" }}>
                  {analysis.rewrite_suggestions.map((r: any, i: number) => (
                    <div key={i} style={{ background: "#0c0c0f", padding: 20 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c3aed", margin: "0 0 12px" }}>{r.element}</p>
                      {r.current && (
                        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#52525b", margin: "0 0 4px" }}>Current</p>
                          <p style={{ fontSize: 12, fontStyle: "italic", color: "#71717a", margin: 0 }}>{r.current}</p>
                        </div>
                      )}
                      <div style={{ background: "#13091f", border: "1px solid #4c1d95", borderRadius: 8, padding: "10px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "#a78bfa", margin: "0 0 4px" }}>Suggested</p>
                        <p style={{ fontSize: 12, color: "#c4b5fd", margin: 0 }}>{r.suggested}</p>
                      </div>
                      <p style={{ fontSize: 12, color: "#52525b", margin: "8px 0 0" }}>{r.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick wins */}
            {analysis.quick_wins?.length > 0 && (
              <div style={{ background: "#0a0f1a", border: "1px solid #1e3a5f", borderRadius: 10, padding: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#60a5fa", margin: "0 0 16px" }}>Quick Wins</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {analysis.quick_wins.map((w: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1e3a5f", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#93c5fd", margin: 0 }}>{w.action}</p>
                        <p style={{ fontSize: 11, color: "#1e40af", margin: "2px 0 0" }}>{w.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: "center", paddingTop: 8 }}>
              <button onClick={() => { setUrl(""); setAnalysis(null) }} style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Analyse a different URL
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!analysis && !loading && !error && !blocked && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* History table */}
            {history.length > 0 && (
              <div style={{ border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#18181b", borderBottom: "1px solid #27272a", padding: "12px 24px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", margin: 0 }}>Previously Analysed</p>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#0f0f12" }}>
                    <tr>
                      {["Page", "Content Type", "Score", "Status", ""].map(h => (
                        <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#52525b" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any, i: number) => {
                      const s = getScoreStatus(h.analysis?.geo_score || 0)
                      const barColor = s.color.includes("emerald") ? "#34d399" : s.color.includes("violet") ? "#a78bfa" : s.color.includes("amber") ? "#fbbf24" : "#f87171"
                      const badgeBg = s.color.includes("emerald") ? "#0a1a0f" : s.color.includes("violet") ? "#13091f" : s.color.includes("amber") ? "#140f00" : "#1a0000"
                      const badgeBorder = s.color.includes("emerald") ? "#14532d" : s.color.includes("violet") ? "#4c1d95" : s.color.includes("amber") ? "#78350f" : "#7f1d1d"
                      return (
                        <tr
                          key={i}
                          onClick={() => { setUrl(h.url); run(false, h.url) }}
                          style={{ borderTop: "1px solid #18181b", background: "#0c0c0f", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#18181b")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#0c0c0f")}
                        >
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "#7c3aed" }} />
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: "#fafafa", margin: 0, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.analysis?.page_title || h.url}</p>
                                <p style={{ fontSize: 11, color: "#52525b", margin: "2px 0 0", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.url}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: 12, color: "#71717a" }}>{h.analysis?.content_type || "—"}</td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 80, height: 4, borderRadius: 2, background: "#27272a" }}>
                                <div style={{ height: "100%", borderRadius: 2, background: barColor, width: `${h.analysis?.geo_score || 0}%` }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#fafafa" }}>{h.analysis?.geo_score || 0}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.06em", background: badgeBg, color: barColor, border: `1px solid ${badgeBorder}` }}>
                              {s.label}
                            </span>
                          </td>
                          <td style={{ padding: "14px 24px", textAlign: "right" }}>
                            <ArrowRight className="h-4 w-4" style={{ color: "#52525b", marginLeft: "auto" }} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "Content type", desc: "Blog, case study, whitepaper, FAQ — each scored differently", color: "#60a5fa", bg: "#0a0f1a", border: "#1e3a5f", n: "01" },
                { label: "GEO gaps", desc: "Missing entity definition, weak arguments, no AI-citable data", color: "#fbbf24", bg: "#140f00", border: "#78350f", n: "02" },
                { label: "Rewrite briefs", desc: "Exact sentences to add or change — specific to this page", color: "#a78bfa", bg: "#13091f", border: "#4c1d95", n: "03" },
                { label: "Quick wins", desc: "Top actions ranked by impact — ready to act on today", color: "#34d399", bg: "#0a1a0f", border: "#14532d", n: "04" },
              ].map(item => (
                <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 10, padding: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.n}</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: item.color, margin: "8px 0 4px" }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: "#52525b", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeoAuditPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<"audit" | "content">("audit")
  const [vertical] = useState("saas")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <h1 className="text-base font-semibold text-card-foreground">GEO Audit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Analyse your AI search readiness</p>
        </div>
        <div className="flex-shrink-0 border-b border-border bg-card px-6">
          <div className="flex gap-0">
            {[{ id: "audit", label: "Technical Audit", icon: BarChart2 }, { id: "content", label: "Content Analysis", icon: FileText }].map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-card-foreground")}>
                  <Icon className="h-4 w-4" />{t.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            {tab === "audit"   && <TechnicalAuditTab vertical={vertical} />}
            {tab === "content" && <ContentAnalysisTab vertical={vertical} />}
          </div>
        </div>
      </main>
    </div>
  )
}
