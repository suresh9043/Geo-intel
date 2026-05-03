"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/lib/auth-context"
import { Search, Loader2, ChevronDown, ChevronUp, Zap, AlertTriangle, AlertCircle, Info, ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

const DIMENSION_LABELS: Record<string, string> = {
  'geo-competitive': 'Competitive',
  'geo-content': 'Content',
  'geo-authority': 'Authority',
  'geo-schema': 'Schema',
  'geo-crawl': 'Crawlability',
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-600', B: 'text-blue-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-red-600',
}

const GRADE_BG: Record<string, string> = {
  A: 'bg-emerald-50 border-emerald-200', B: 'bg-blue-50 border-blue-200',
  C: 'bg-amber-50 border-amber-200', D: 'bg-orange-50 border-orange-200', F: 'bg-red-50 border-red-200',
}

const SEVERITY_STYLES: Record<string, { bg: string; icon: any; label: string }> = {
  Critical: { bg: 'bg-red-50 border-red-200 text-red-700', icon: AlertCircle, label: 'Critical' },
  High: { bg: 'bg-orange-50 border-orange-200 text-orange-700', icon: AlertTriangle, label: 'High' },
  Medium: { bg: 'bg-amber-50 border-amber-200 text-amber-700', icon: Info, label: 'Medium' },
}

function ScoreBar({ score, dimension }: { score: number; dimension: string }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 flex-shrink-0 text-xs font-medium text-card-foreground">{DIMENSION_LABELS[dimension]}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-card-foreground">{score}</span>
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
      const res = await fetch('/api/geo-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, finding, vertical }),
      })
      const data = await res.json()
      if (data.fix) setFix(data.fix)
    } catch {}
    setLoadingFix(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors">
        <span className={cn("flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold border flex items-center gap-1 mt-0.5", style.bg)}>
          <Icon className="h-3 w-3" />{style.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground">{finding.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{DIMENSION_LABELS[finding.dimension]} · {finding.effort} to fix</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">The Problem</p>
            <p className="text-sm text-card-foreground">{finding.detail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Recommendation</p>
            <p className="text-sm text-card-foreground">{finding.recommendation}</p>
          </div>

          {!fix && (
            <button
              onClick={getFix}
              disabled={loadingFix}
              className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {loadingFix ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating fix...</> : <><Zap className="h-3.5 w-3.5" /> Get Fix</>}
            </button>
          )}

          {fix && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Generated Fix</p>
                <span className="text-xs text-muted-foreground">{fix.implementation_time}</span>
              </div>
              <p className="text-sm text-card-foreground">{fix.summary}</p>

              {fix.code && (
                <pre className="rounded-lg bg-muted p-3 text-xs text-card-foreground overflow-x-auto whitespace-pre-wrap">{fix.code}</pre>
              )}

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

              {fix.page_structure && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">Page Structure</p>
                  {fix.page_structure.map((s: any, i: number) => (
                    <div key={i} className="rounded-lg bg-muted p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{s.section}</p>
                      <p className="text-sm text-card-foreground">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {fix.instructions && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Steps</p>
                  <ol className="flex flex-col gap-1">
                    {fix.instructions.map((step: string, i: number) => (
                      <li key={i} className="flex gap-2 text-xs text-card-foreground">
                        <span className="flex-shrink-0 font-semibold text-primary">{i + 1}.</span>
                        {step}
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

  const domain = report?.url?.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0] || ''

  const runAudit = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError("")
    setReport(null)
    try {
      const res = await fetch('/api/geo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), vertical }),
      })
      const data = await res.json()
      if (data.report) setReport(data.report)
      else setError(data.error || 'Audit failed')
    } catch {
      setError('Failed to connect to audit service')
    }
    setLoading(false)
  }

  const allFindings = report ? [
    ...report.critical_findings,
    ...report.high_findings,
    ...report.all_findings.filter((f: any) => f.severity === 'Medium'),
  ] : []

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <h1 className="text-base font-semibold text-card-foreground">GEO Audit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Analyse how AI-ready your website is across 5 dimensions</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* URL Input */}
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runAudit()}
                  placeholder="Enter website URL (e.g. acme.com)"
                  className="flex-1 bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground outline-none"
                />
                {url && <button onClick={() => setUrl('')}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-card-foreground" /></button>}
              </div>
              <button
                onClick={runAudit}
                disabled={loading || !url.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Run Audit <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>

            {/* Vertical selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Vertical:</span>
              {['saas', 'automation', 'agency', 'ecommerce', 'other'].map(v => (
                <button
                  key={v}
                  onClick={() => setVertical(v)}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors", vertical === v ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-card-foreground">Running GEO audit...</p>
              <p className="text-xs text-muted-foreground">5 AI agents analysing your site. This takes ~30 seconds.</p>
            </div>
          )}

          {/* Results */}
          {report && !loading && (
            <div className="flex flex-col gap-5">
              {/* Score header */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{report.url}</p>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold tabular-nums text-card-foreground">{report.composite_score}</span>
                    <span className={cn("text-3xl font-bold mb-1", GRADE_COLORS[report.grade])}>{report.grade}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">GEO Composite Score</p>
                </div>

                {/* Dimension scores */}
                <div className="flex flex-col gap-2 min-w-64">
                  {Object.entries(report.dimension_scores).map(([dim, data]: [string, any]) => (
                    <ScoreBar key={dim} score={data.score} dimension={dim} />
                  ))}
                </div>
              </div>

              {/* Findings */}
              {allFindings.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Findings & Fixes</h2>
                    <span className="text-xs text-muted-foreground">{allFindings.length} issues found</span>
                  </div>
                  {allFindings.map((f: any, i: number) => (
                    <FindingRow key={i} finding={f} domain={domain} vertical={vertical} />
                  ))}
                </div>
              )}

              {allFindings.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <p className="text-sm font-semibold text-emerald-700">No critical issues found</p>
                  <p className="text-xs text-emerald-600 mt-1">Your site scores well across all GEO dimensions</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!report && !loading && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="rounded-full bg-primary/10 p-5">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-semibold text-card-foreground">Audit any website</p>
              <p className="text-xs text-muted-foreground max-w-sm">Enter a URL above to run a full GEO audit — we'll analyse crawlability, content, schema, authority and competitive positioning.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
