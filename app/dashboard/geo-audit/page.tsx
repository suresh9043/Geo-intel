"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/lib/auth-context"
import { Search, Loader2, ChevronDown, ChevronUp, Zap, AlertTriangle, AlertCircle, Info, ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

const DIMENSION_LABELS: Record<string, string> = {
  "geo-competitive": "Competitive",
  "geo-content": "Content",
  "geo-authority": "Authority",
  "geo-schema": "Schema",
  "geo-crawl": "Crawlability",
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-600", B: "text-blue-600", C: "text-amber-500", D: "text-orange-500", F: "text-red-600",
}

const GRADE_BG: Record<string, string> = {
  A: "bg-emerald-50 border-emerald-300",
  B: "bg-blue-50 border-blue-300",
  C: "bg-amber-50 border-amber-300",
  D: "bg-orange-50 border-orange-300",
  F: "bg-red-50 border-red-300",
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: any; label: string; text: string; badge: string }> = {
  Critical: { border: "border-l-red-500", bg: "bg-red-50", icon: AlertCircle, label: "Critical", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  High:     { border: "border-l-orange-400", bg: "bg-orange-50", icon: AlertTriangle, label: "High", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  Medium:   { border: "border-l-amber-400", bg: "bg-amber-50", icon: Info, label: "Medium", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
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
  const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.Medium
  const Icon = style.icon

  const getFix = async () => {
    setLoadingFix(true)
    try {
      const res = await fetch("/api/geo-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, finding, vertical }),
      })
      const data = await res.json()
      if (data.fix) setFix(data.fix)
    } catch {}
    setLoadingFix(false)
  }

  return (
    <div className={cn("rounded-xl border border-border border-l-4 overflow-hidden shadow-sm", style.border, style.bg)}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 px-4 py-4 text-left hover:brightness-95 transition-all">
        <span className={cn("flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 mt-0.5 border", style.badge)}>
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
            <button onClick={getFix} disabled={loadingFix} className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {loadingFix ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating fix...</> : <><Zap className="h-3.5 w-3.5" /> Get copy-paste fix</>}
            </button>
          )}
          {fix && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Generated Fix</p>
                <span className="text-xs text-muted-foreground">{fix.implementation_time}</span>
              </div>
              <p className="text-sm text-card-foreground leading-relaxed">{fix.summary}</p>
              {fix.code && <pre className="rounded-lg bg-muted p-3 text-xs text-card-foreground overflow-x-auto whitespace-pre-wrap font-mono">{fix.code}</pre>}
              {fix.options && (
                <div className="flex flex-col gap-2">
                  {fix.options.map((opt: any, i: number) => (
                    <div key={i} className="rounded-lg bg-muted p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{opt.label}</p>
                      <p className="text-sm text-card-foreground">{opt.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {fix.instructions && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Steps</p>
                  <ol className="flex flex-col gap-1.5">
                    {fix.instructions.map((step: string, i: number) => (
                      <li key={i} className="flex gap-2 text-xs text-card-foreground">
                        <span className="flex-shrink-0 font-bold text-primary">{i + 1}.</span>{step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                <span className="font-semibold text-card-foreground">Impact: </span>{fix.impact}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GeoAuditPage() {
  const { user } = useAuth()
  const [url, setUrl] = useState("")
  const [vertical, setVertical] = useState("saas")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState("")

  const domain = report?.url?.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0] || ""

  const runAudit = async () => {
    if (!url.trim()) return
    setLoading(true); setError(""); setReport(null)
    try {
      const res = await fetch("/api/geo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), vertical }),
      })
      const data = await res.json()
      if (data.report) setReport(data.report)
      else setError(data.error || "Audit failed")
    } catch { setError("Failed to connect to audit service") }
    setLoading(false)
  }

  const allFindings = report ? [
    ...report.critical_findings,
    ...report.high_findings,
    ...report.all_findings.filter((f: any) => f.severity === "Medium"),
  ] : []

  const gradeColor = report ? GRADE_COLORS[report.grade] : ""
  const gradeBg = report ? GRADE_BG[report.grade] : ""

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <h1 className="text-base font-semibold text-card-foreground">GEO Audit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Analyse how AI-ready your website is across 5 dimensions</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm max-w-4xl">
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && runAudit()} placeholder="Enter website URL (e.g. appian.com)" className="flex-1 bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground outline-none" />
                {url && <button onClick={() => setUrl("")}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-card-foreground" /></button>}
              </div>
              <button onClick={runAudit} disabled={loading || !url.trim()} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Run Audit <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Vertical:</span>
              {["saas", "automation", "agency", "ecommerce", "other"].map(v => (
                <button key={v} onClick={() => setVertical(v)} className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors border", vertical === v ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:bg-muted")}>
                  {v === "saas" ? "SaaS" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 max-w-4xl">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-semibold text-card-foreground">Running GEO audit...</p>
                <p className="text-xs text-muted-foreground mt-1">5 AI agents analysing your site · ~30 seconds</p>
              </div>
            </div>
          )}

          {report && !loading && (
            <div className="flex flex-col gap-5 max-w-4xl">
              {/* Score card */}
              <div className={cn("rounded-2xl border-2 p-6 shadow-md", gradeBg)}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{report.url}</p>
                    <div className="flex items-end gap-3">
                      <span className="text-7xl font-black tabular-nums text-card-foreground leading-none">{report.composite_score}</span>
                      <div className="mb-2">
                        <span className={cn("text-4xl font-black leading-none", gradeColor)}>{report.grade}</span>
                        <p className="text-xs text-muted-foreground mt-1">GEO Score</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-2 w-40 rounded-full bg-white/50 overflow-hidden">
                        <div className={cn("h-full rounded-full", report.composite_score >= 70 ? "bg-emerald-500" : report.composite_score >= 50 ? "bg-amber-400" : "bg-red-500")} style={{ width: `${report.composite_score}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {report.composite_score >= 70 ? "Strong GEO foundation" : report.composite_score >= 50 ? "Moderate — room to improve" : "Needs urgent attention"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 min-w-72 bg-white/50 rounded-xl p-4 border border-white/70 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dimension Scores</p>
                    {Object.entries(report.dimension_scores).map(([dim, data]: [string, any]) => (
                      <ScoreBar key={dim} score={data.score} dimension={dim} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Findings */}
              {allFindings.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-card-foreground">Findings & Fixes</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{allFindings.length} issues found</span>
                  </div>
                  {allFindings.map((f: any, i: number) => (
                    <FindingRow key={i} finding={f} domain={domain} vertical={vertical} />
                  ))}
                </div>
              )}

              {allFindings.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <p className="text-lg font-semibold text-emerald-700">No critical issues found 🎉</p>
                  <p className="text-sm text-emerald-600 mt-1">Your site scores well across all GEO dimensions</p>
                </div>
              )}
            </div>
          )}

          {!report && !loading && !error && (
            <div className="flex flex-col gap-5 max-w-4xl">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-sm font-semibold text-card-foreground mb-1">What you'll get in 30 seconds</p>
                <p className="text-xs text-muted-foreground mb-4">Enter any website URL and run a full GEO audit across 5 dimensions</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Overall GEO Score", preview: "0–100 with grade A–F", color: "border-l-blue-400" },
                    { label: "5 Dimension Scores", preview: "Crawl · Content · Schema · Authority · Competitive", color: "border-l-purple-400" },
                    { label: "Findings & Fixes", preview: "Copy-paste code ready to implement", color: "border-l-amber-400" },
                  ].map(item => (
                    <div key={item.label} className={cn("rounded-lg border border-border border-l-4 bg-card p-3", item.color)}>
                      <p className="text-xs font-semibold text-card-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.preview}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">Try it on:</p>
                <div className="flex gap-2 flex-wrap">
                  {["appian.com", "uipath.com", "servicenow.com", "pega.com"].map(domain => (
                    <button key={domain} onClick={() => setUrl(domain)} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                      {domain}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "📊", title: "Real data, not guesswork", body: "We fetch your site, check robots.txt, extract schema, and analyse content structure." },
                  { icon: "🔧", title: "Copy-paste fixes", body: "Every finding comes with ready-to-implement code — schema JSON-LD, content rewrites, robots.txt snippets." },
                  { icon: "🏆", title: "Competitor benchmarking", body: "See exactly what UiPath, Appian and ServiceNow are doing that you're not." },
                  { icon: "⚡", title: "Results in 30 seconds", body: "5 AI agents run in parallel. Full report with prioritised findings ready immediately." },
                ].map(item => (
                  <div key={item.title} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="text-xs font-semibold text-card-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
