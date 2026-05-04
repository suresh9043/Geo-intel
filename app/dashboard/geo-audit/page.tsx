"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { saveAnalysisResult, getAnalysisHistory, getCachedAnalysis } from "@/lib/queries"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/lib/auth-context"
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
          <p className="text-xs text-muted-foreground mt-0.5">{DIMENSION_LABELS[finding.dimension]} · {finding.effort} to fix</p>
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
              {loadingFix ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><Zap className="h-3.5 w-3.5" /> Get copy-paste fix</>}
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
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground">Try:</span>
          {["hubspot.com", "notion.so", "monday.com", "zapier.com"].map(d => (
            <button key={d} onClick={() => setUrl(d)} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">{d}</button>
          ))}
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
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <p className="text-base font-semibold text-card-foreground">Full GEO audit in 30 seconds</p>
          <div className="flex items-stretch rounded-xl border border-border bg-muted/30 overflow-hidden w-full max-w-2xl">
            {[{ icon: "🎯", label: "GEO Score", desc: "0–100 with status label" }, { icon: "📐", label: "5 Dimensions", desc: "Crawl · Schema · Content · Authority" }, { icon: "🔧", label: "Copy-paste Fixes", desc: "Code ready same day" }].map((item, i) => (
              <div key={item.label} className={cn("flex-1 px-5 py-4 flex flex-col items-center text-center gap-1", i > 0 ? "border-l border-border" : "")}>
                <span className="text-xl mb-1">{item.icon}</span>
                <p className="text-xs font-semibold text-card-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
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
  const [history, setHistory] = useState<any[]>([])
  const [cached, setCached] = useState(false)

  useEffect(() => {
    if (!user) return
    getAnalysisHistory(user.id, 8).then(setHistory)
  }, [user])

  const run = async (runUrl?: string) => {
    const targetUrl = runUrl || url
    if (!targetUrl.trim()) return
    setLoading(true); setError(""); setAnalysis(null); setCached(false)
    const fullUrl = targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl
    const domain = fullUrl.replace(/^https?:\/\//, "").split("/")[0]

    // Check cache first
    if (user) {
      const hit = await getCachedAnalysis(user.id, fullUrl)
      if (hit) {
        setAnalysis(hit.analysis)
        setCurrentUrl(fullUrl)
        setCached(true)
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch("/api/content-page-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: fullUrl, domain, vertical }) })
      const data = await res.json()
      if (data.analysis) {
        setAnalysis(data.analysis)
        setCurrentUrl(fullUrl)
        if (user) {
          await saveAnalysisResult(user.id, fullUrl, data.analysis)
          getAnalysisHistory(user.id, 8).then(setHistory)
        }
      } else setError(data.error || "Analysis failed")
    } catch { setError("Could not connect to analysis service") }
    setLoading(false)
  }

  const ss = analysis ? getScoreStatus(analysis.geo_score) : null

  return (
    <div className="flex flex-col gap-5">
      {/* Input — always visible at top */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Paste a page URL — blog post, case study, whitepaper, FAQ..." className="flex-1 bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground outline-none" />
            {url && <button onClick={() => { setUrl(""); setAnalysis(null); setError("") }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
          </div>
          <button onClick={run} disabled={loading || !url.trim()} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Analyse <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Works on any specific content page — not section homepages like /blog or /resources</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}

      {loading && (
        <div className="rounded-xl border border-border bg-card p-8 flex items-center gap-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div>
            <p className="text-sm font-semibold text-card-foreground">Fetching and analysing page...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reading content, checking schema, assessing AI citation readiness · ~20 seconds</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["Fetching page content", "Detecting content type", "Checking schema", "Finding GEO gaps", "Generating fixes"].map((step, i) => (
                <span key={step} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{step}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {analysis && !loading && ss && (
        <div className="flex flex-col gap-4">
          <div className={cn("rounded-2xl border-2 p-5 shadow-sm", ss.bg, ss.border)}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{analysis.page_title || url}</p>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-6xl font-black tabular-nums text-card-foreground leading-none">{analysis.geo_score}</span>
              <span className={cn("text-lg font-bold px-2 py-0.5 rounded-lg mb-1", ss.color, ss.bg)}>{ss.label}</span>
              <span className="text-xs text-muted-foreground mb-2">{analysis.content_type}</span>
            </div>
            <p className="text-sm text-card-foreground leading-relaxed">{analysis.summary}</p>
          </div>

          {analysis.what_works?.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">What works</p>
              {analysis.what_works.map((w: string, i: number) => <p key={i} className="text-xs text-emerald-700">• {w}</p>)}
            </div>
          )}

          {analysis.critical_gaps?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Critical Gaps and Fixes</p>
              {analysis.critical_gaps.map((gap: any, i: number) => (
                <div key={i} className="rounded-xl border border-red-200 bg-red-50 border-l-4 border-l-red-500 p-4">
                  <p className="text-xs font-semibold text-red-800 mb-1">{gap.gap}</p>
                  <p className="text-xs text-red-700 mb-2"><span className="font-semibold">Fix:</span> {gap.fix}</p>
                  {gap.example && <div className="bg-white/70 rounded-lg p-2.5 border border-red-100 mt-2"><p className="text-xs text-card-foreground italic">"{gap.example}"</p></div>}
                  <p className="text-xs text-muted-foreground mt-1.5">Impact: {gap.impact}</p>
                </div>
              ))}
            </div>
          )}

          {analysis.missing_schema?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Schema to Add</p>
              {analysis.missing_schema.map((s: any, i: number) => (
                <div key={i} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-800 mb-1">{s.type}</p>
                  <p className="text-xs text-blue-700 mb-2">{s.why}</p>
                  {s.snippet && <pre className="text-xs font-mono bg-white/70 p-2.5 rounded-lg border border-blue-100 overflow-x-auto whitespace-pre-wrap">{s.snippet}</pre>}
                </div>
              ))}
            </div>
          )}

          {analysis.rewrite_suggestions?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Rewrite Suggestions</p>
              {analysis.rewrite_suggestions.map((r: any, i: number) => (
                <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2">{r.element}</p>
                  {r.current && <p className="text-xs text-card-foreground bg-white/60 rounded p-1.5 border border-amber-100 italic mb-2">Current: "{r.current}"</p>}
                  <p className="text-xs text-amber-900 bg-white/60 rounded p-1.5 border border-amber-100 font-medium">Suggested: "{r.suggested}"</p>
                  <p className="text-xs text-muted-foreground mt-1.5">Why: {r.why}</p>
                </div>
              ))}
            </div>
          )}

          {analysis.quick_wins?.length > 0 && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-3">Quick wins for this page</p>
              {analysis.quick_wins.map((w: any, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className="text-teal-500 font-bold text-xs flex-shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-xs font-semibold text-teal-800">{w.action}</p>
                    <p className="text-xs text-teal-600">{w.impact} · {w.effort}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-2">
            <button onClick={() => { setUrl(""); setAnalysis(null) }} className="text-xs text-primary font-semibold hover:underline">Analyse a different URL</button>
          </div>
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="flex flex-col gap-4">
          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Previously analysed</p>
              <div className="flex flex-col gap-2">
                {history.map((h: any, i: number) => {
                  const ss2 = getScoreStatus(h.analysis?.geo_score || 0)
                  return (
                    <button key={i} onClick={() => { setUrl(h.url); run(h.url) }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left">
                      <div className={cn("flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold", ss2.bg, ss2.color)}>
                        {h.analysis?.geo_score || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-card-foreground truncate">{h.analysis?.page_title || h.url}</p>
                        <p className="text-xs text-muted-foreground truncate">{h.url}</p>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0", ss2.bg, ss2.color)}>{ss2.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
          {[
            { title: "Detects content type", desc: "Blog post, case study, whitepaper, FAQ, comparison page — each has different GEO requirements.", icon: "📄", color: "bg-blue-50 border-blue-200" },
            { title: "Finds specific gaps", desc: "Missing schema, weak entity definition, no AI-citable stats, poor heading structure.", icon: "🔍", color: "bg-amber-50 border-amber-200" },
            { title: "Rewrite suggestions", desc: "Exact sentences to add or change — not generic advice. Specific to the page content.", icon: "✏️", color: "bg-violet-50 border-violet-200" },
            { title: "Schema to add", desc: "Copy-paste JSON-LD ready to implement. FAQPage, Article, CaseStudy, HowTo and more.", icon: "🔧", color: "bg-emerald-50 border-emerald-200" },
          ].map(item => (
            <div key={item.title} className={cn("rounded-xl border p-4", item.color)}>
              <div className="text-lg mb-2">{item.icon}</div>
              <p className="text-xs font-semibold text-card-foreground mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
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
