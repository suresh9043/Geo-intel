"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getCompanies, saveAnalysisResult, getCachedAnalysis } from "@/lib/queries"
import { Plus, Search, Loader2, ChevronDown, ChevronUp, Zap, AlertTriangle, AlertCircle, Info, ArrowRight, X, Eye, ClipboardList, BarChart2, Copy, Check, LogOut } from "lucide-react"
import { SetupWizard } from "@/components/setup-wizard"

const BRAND = "#003ec7"
const BRAND_ACTIVE = "#002b92"
const BRAND_LIGHT = "#e6ebf9"

const glassSidebar: React.CSSProperties = {
  background: "rgba(239,244,255,0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRight: "1px solid #c4c5d7",
}

const glassCard: React.CSSProperties = {
  background: "rgba(229,238,255,0.4)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.3)",
}

// --- Helpers ------------------------------------------------------------------

function getScoreStatus(score: number) {
  if (score >= 75) return { label: "Strong",      color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" }
  if (score >= 55) return { label: "Good",         color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" }
  if (score >= 35) return { label: "Needs work",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" }
  if (score >= 20) return { label: "Weak",         color: "#ea580c", bg: "#fff7ed", border: "#fdba74" }
  return               { label: "Critical",    color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" }
}

const DIMENSION_LABELS: Record<string, string> = {
  "geo-competitive": "Competitive", "geo-content": "Content",
  "geo-authority": "Authority", "geo-schema": "Schema", "geo-crawl": "Crawlability",
}

const SEVERITY_CONFIG: Record<string, { borderColor: string; bg: string; badgeBg: string; badgeColor: string; icon: any }> = {
  Critical: { borderColor: "#ef4444", bg: "#fef2f2", badgeBg: "#fee2e2", badgeColor: "#b91c1c", icon: AlertCircle },
  High:     { borderColor: "#f97316", bg: "#fff7ed", badgeBg: "#ffedd5", badgeColor: "#c2410c", icon: AlertTriangle },
  Medium:   { borderColor: "#f59e0b", bg: "#fffbeb", badgeBg: "#fef3c7", badgeColor: "#92400e", icon: Info },
}

// --- Sub-components -----------------------------------------------------------

function ScoreBar({ score: rawScore, dimension }: { score: any; dimension: string }) {
  const score = typeof rawScore === 'object' ? (rawScore?.score ?? 0) : rawScore
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"
  const textColor = score >= 70 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626"
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 flex-shrink-0 text-sm font-semibold text-slate-600">{DIMENSION_LABELS[dimension]}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 flex-shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: textColor }}>{score}</span>
    </div>
  )
}

function FindingRow({ finding, domain, vertical }: { finding: any; domain: string; vertical: string }) {
  const [open, setOpen] = useState(false)
  const [loadingFix, setLoadingFix] = useState(false)
  const [fix, setFix] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.Medium
  const Icon = cfg.icon

  const getFix = async () => {
    setLoadingFix(true)
    try {
      const res = await fetch("/api/geo-fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, finding, vertical }) })
      const data = await res.json()
      if (data.fix) setFix(data.fix)
    } catch {}
    setLoadingFix(false)
  }

  const borderColors: Record<string, string> = { Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b" }
  const borderColor = borderColors[finding.severity] || "#f59e0b"

  return (
    <div className="rounded-xl overflow-hidden border-l-4" style={{
      background: "rgba(229,238,255,0.4)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderLeftColor: borderColor,
      borderLeftWidth: "4px",
    }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-3 text-left hover:bg-white/20 transition-colors">
        <div className="flex items-center gap-3">
          <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-tight" style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeColor }}>
            {finding.severity}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">{finding.title}</h3>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mt-0.5">{DIMENSION_LABELS[finding.dimension]}</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-200/30">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">The Problem</p>
            <p className="text-sm text-slate-700 leading-relaxed">{finding.detail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
            <p className="text-sm text-slate-700 leading-relaxed">{finding.recommendation}</p>
          </div>
          <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-2 mt-1">⚠ Analysis based on automated page scan — verify specific observations before acting.</p>
          {!fix ? (
            <button onClick={getFix} disabled={loadingFix}
              className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:text-white transition-all shadow-sm"
              style={{ color: BRAND }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = BRAND; (e.currentTarget as HTMLElement).style.color = "white" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "white"; (e.currentTarget as HTMLElement).style.color = BRAND }}>
              {loadingFix ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><Zap className="h-3.5 w-3.5" /> Get fix</>}
            </button>
          ) : (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: BRAND_LIGHT, border: "1px solid rgba(0,62,199,0.2)" }}>
              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Generated Fix</p>
              <p className="text-sm text-slate-800 leading-relaxed">{fix.summary}</p>

              {/* Comparison page brief */}
              {fix.fix_type === "comparison" && (
                <div className="flex flex-col gap-3 mt-1">
                  {/* Target page + query */}
                  {(fix.target_page || fix.target_query) && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1.5">
                      {fix.target_page && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600 w-24 flex-shrink-0">URL slug</span>
                          <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{fix.target_page}</code>
                        </div>
                      )}
                      {fix.target_query && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600 w-24 flex-shrink-0">AI query</span>
                          <span className="text-xs text-slate-600 italic">"{fix.target_query}"</span>
                        </div>
                      )}
                      {fix.seo_title && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600 w-24 flex-shrink-0">SEO title</span>
                          <span className="text-sm text-slate-600">{fix.seo_title}</span>
                        </div>
                      )}
                      {fix.meta_description && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-semibold text-slate-600 w-24 flex-shrink-0 mt-0.5">Meta desc</span>
                          <span className="text-xs text-slate-600 leading-relaxed">{fix.meta_description}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key differentiators */}
                  {fix.key_differentiators?.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Key differentiators to highlight</p>
                      <div className="flex flex-col gap-1.5">
                        {fix.key_differentiators.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0 font-bold text-xs mt-0.5">→</span>
                            <p className="text-xs text-blue-800 leading-relaxed">{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Page structure */}
                  {fix.page_structure?.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Page structure</p>
                      {fix.page_structure.map((s: any, i: number) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-black text-slate-300 w-5 flex-shrink-0">{i + 1}</span>
                            <p className="text-xs font-bold text-slate-800">{s.section}</p>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed pl-7">{s.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {fix.code && (
                <div className="rounded-lg bg-slate-900 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                    <span className="text-xs text-slate-400 font-mono">Implementation</span>
                    <button onClick={() => { navigator.clipboard.writeText(fix.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="flex items-center gap-1.5 text-xs font-medium" style={{ color: copied ? "#10b981" : "#94a3b8" }}>
                      {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">{fix.code}</pre>
                </div>
              )}
              {fix.instructions?.map((step: string, i: number) => (
                <div key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="flex-shrink-0 font-bold" style={{ color: BRAND }}>{i + 1}.</span>{step}
                </div>
              ))}
              {fix.code && fix.code.includes('ADD_YOUR_') && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2 mt-2">
                  <span className="flex-shrink-0 text-sm">⚠️</span>
                  <p className="text-sm text-amber-700 leading-relaxed">Replace all <strong>ADD_YOUR_*_URL</strong> placeholders with your actual verified social profile URLs before implementing.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main Page ----------------------------------------------------------------

export default function GeoAuditV2() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [showSetup, setShowSetup] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("Technical Audit")

  // Technical Audit state
  const [url, setUrl] = useState("")
  const [vertical, setVertical] = useState("SaaS")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState("")

  // Content Analysis state
  const [caUrl, setCaUrl] = useState("")
  const [caLoading, setCaLoading] = useState(false)
  const [caAnalysis, setCaAnalysis] = useState<any>(null)
  const [caError, setCaError] = useState("")
  const [caBlocked, setCaBlocked] = useState(false)
  const [caShowPaste, setCaShowPaste] = useState(false)
  const [caPasted, setCaPasted] = useState("")

  const runContentAnalysis = async (usePasted = false) => {
    if (!caUrl.trim()) return
    setCaLoading(true); setCaError(""); setCaAnalysis(null); setCaBlocked(false)
    const fullUrl = caUrl.startsWith("http") ? caUrl : "https://" + caUrl
    const domain = fullUrl.replace(/^https?:\/\//, "").split("/")[0]
    try {
      const res = await fetch("/api/content-page-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl, domain, vertical, pastedContent: usePasted ? caPasted : undefined }),
      })
      const data = await res.json()
      if (data.analysis) setCaAnalysis(data.analysis)
      else if (data.blocked) { setCaBlocked(true); setCaError("") }
      else setCaError(data.error || "Analysis failed")
    } catch { setCaError("Could not connect to analysis service") }
    setCaLoading(false)
  }

  useEffect(() => { if (!authLoading && !user) router.push("/auth") }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    getCompanies(user.id).then(data => {
      setCompanies(data)
      if (data.length > 0) {
        const saved = localStorage.getItem('selectedCompanyId')
        const valid = saved && data.find(c => c.id === saved)
        setSelectedCompanyId(valid ? saved : data[0].id)
      }
    })
  }, [user])

  const [fromCache, setFromCache] = useState(false)

  const runAudit = async (forceRefresh = false) => {
    if (!url.trim()) return
    setLoading(true); setError(""); setReport(null); setFromCache(false)

    if (!forceRefresh && user) {
      try {
        const { supabase } = await import("@/lib/supabase")
        const { data: hit } = await supabase
          .from("audit_cache")
          .select("report, audited_at")
          .eq("user_id", user.id)
          .eq("url", url.trim().toLowerCase())
          .single()
        if (hit?.report) {
          setReport(hit.report)
          setFromCache(true)
          setLoading(false)
          return
        }
      } catch {}
    }

    try {
      const res = await fetch("/api/geo-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), vertical }) })
      const data = await res.json()
      if (data.report) {
        setReport(data.report)
        if (user) {
          try {
            const { supabase } = await import("@/lib/supabase")
            await supabase.from("audit_cache").upsert({
              user_id: user.id,
              url: url.trim().toLowerCase(),
              report: data.report,
              audited_at: new Date().toISOString(),
            }, { onConflict: "user_id,url" })
          } catch {}
        }
      } else setError(data.error || "Audit failed")
    } catch { setError("Failed to connect to audit service") }
    setLoading(false)
  }

  if (authLoading || !user) return null

  const domain = report?.url?.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0] || ""
  const allFindings = report ? [...(report.critical_findings || []), ...(report.high_findings || []), ...(report.all_findings || []).filter((f: any) => f.severity === "Medium")] : []
  const ss = report ? getScoreStatus(report.composite_score) : null

  return (
    <div className="flex h-screen overflow-hidden antialiased text-slate-900" style={{ background: "#f8fafc" }}>
      {showSetup && (
        <SetupWizard
          onComplete={() => { setShowSetup(false); if (user) getCompanies(user.id).then(setCompanies) }}
          onSaveExit={() => setShowSetup(false)}
        />
      )}

      {/* -- Sidebar -- */}
      <aside className="w-72 flex flex-col fixed inset-y-0 left-0 z-50" style={{ ...glassSidebar, color: "#0b1c30" }}>
        <div className="p-5 border-b border-[#c4c5d7]/30">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: BRAND }}>G</div>
            <span className="text-lg font-bold tracking-tight">CiteIQ</span>
          </div>
          <div className="pt-4 border-t border-[#c4c5d7]/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-[#0b1c30] truncate">
                {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-[#434654] truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs font-bold text-[#434654] uppercase tracking-widest">Companies</h3>
              <button onClick={() => setShowSetup(true)} className="text-[#434654] hover:text-[#0b1c30] transition-colors">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {companies.map((c, i) => {
                const isActive = c.id === selectedCompanyId
                const avatarColors = ["#003ec7","#7c3aed","#059669","#ea580c","#0891b2","#db2777"]
                const avatarBg = avatarColors[i % avatarColors.length]
                return (
                  <li key={c.id}>
                    <button onClick={() => { setSelectedCompanyId(c.id); localStorage.setItem('selectedCompanyId', c.id); router.push('/dashboard') }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all text-left"
                      style={isActive ? { backgroundColor: BRAND_ACTIVE, color: "white" } : { color: "#434654" }}>
                      <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : avatarBg }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{c.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <h3 className="px-2 text-xs font-bold text-[#434654] uppercase tracking-widest mb-2">Tools</h3>
            <ul className="space-y-0.5">
              <li>
                <a href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors text-[#434654] hover:text-[#0b1c30] hover:bg-[#002b92]/5">
                  <Eye className="w-4 h-4" /> AI Visibility
                </a>
              </li>
              <li>
                <a href="/dashboard/geo-audit" className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-bold transition-colors" style={{ backgroundColor: "rgba(0,43,146,0.1)", color: BRAND }}>
                  <ClipboardList className="w-4 h-4" /> GEO Audit
                </a>
              </li>
            </ul>
          </div>
        </nav>
        <div className="p-3 border-t border-[#c4c5d7]/30">
          <button onClick={() => signOut()} className="flex items-center gap-2 px-2 w-full text-sm font-semibold text-[#434654] hover:text-[#0b1c30] transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* -- Main -- */}
      <main className="flex-1 ml-72 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-40 flex-shrink-0" style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(226,232,240,0.7)" }}>
          <div className="px-5 flex items-center justify-between h-16 pt-2">
            <div>
              <h2 className="font-bold text-slate-900 text-2xl leading-none">GEO Audit</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Analyse your AI search readiness</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5">
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/40 shadow-sm">
              {["Technical Audit", "Page Analyser"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-white shadow-md scale-[1.02]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  style={activeTab === tab ? { color: BRAND } : {}}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Technical Audit Tab */}
          {activeTab === "Technical Audit" && <>

          {/* URL Input — prominent search bar */}
          <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Enter a URL to audit</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && runAudit()}
                  placeholder="e.g. appian.com"
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white transition-all placeholder:text-slate-400"
                  style={{ boxShadow: url ? `0 0 0 2px ${BRAND}30` : undefined, borderColor: url ? BRAND : undefined }}
                />
                {url && (
                  <button onClick={() => setUrl("")} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button onClick={runAudit} disabled={loading || !url.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all shadow-sm hover:opacity-90"
                style={{ backgroundColor: BRAND }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Analyse <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap px-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">Scans across:</p>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold" style={{ background: "#eef1fd", borderColor: "#3B5BDB40", color: "#3B5BDB" }}>📊 Competitive</span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold" style={{ background: "#faf5ff", borderColor: "#7c3aed40", color: "#7c3aed" }}>📝 Content</span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold" style={{ background: "#ecfeff", borderColor: "#0891b240", color: "#0891b2" }}>⭐ Authority</span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold" style={{ background: "#fff7ed", borderColor: "#ea580c40", color: "#ea580c" }}>🔧 Schema</span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold" style={{ background: "#ecfdf5", borderColor: "#05996940", color: "#059669" }}>🤖 Crawlability</span>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Loading — step progress */}
          {loading && (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col items-center gap-5 shadow-sm">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin" style={{ color: BRAND }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Analysing {url}</p>
                <p className="text-xs text-slate-400 mt-1 mb-5">5 AI agents are reviewing your page</p>
                <div className="flex flex-col gap-2 text-left max-w-xs mx-auto">
                  {["Fetching page & robots.txt", "Extracting schema markup", "Scoring content depth", "Checking authority signals", "Generating fixes"].map((step, i) => (
                    <div key={step} className="flex items-center gap-2.5 text-xs text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" style={{ color: BRAND }} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {!report && !loading && (
            <div className="flex flex-col gap-4">
              {/* 3 KPI cards - example */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "GEO score", value: "—", sub: "Run audit to score", color: BRAND, borderColor: BRAND },
                  { label: "Issues found", value: "—", sub: "Findings will appear here", color: "#dc2626", borderColor: "#dc2626" },
                ].map((k, i) => (
                  <div key={i} className="rounded-xl bg-white border border-slate-100 p-4 opacity-30" style={{ borderTop: `3px solid ${k.borderColor}` }}>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{k.label}</p>
                    <p className="text-4xl font-bold text-slate-300 leading-none">{k.value}</p>
                    <p className="text-xs text-slate-400 mt-2">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Terminal mockup */}
              <div className="rounded-xl overflow-hidden w-full" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }}></div>
                  </div>
                  <span className="text-xs font-mono ml-2" style={{ color: "#8b949e" }}>terminal — geo-audit-log</span>
                </div>
                {/* Terminal body */}
                <div className="p-4 font-mono text-xs space-y-2" style={{ minHeight: 360 }}>
                  {[
                    { time: "10:42:12", type: "INFO", color: "#3fb950", msg: "Starting GEO Audit sequence..." },
                    { time: "10:42:13", type: "INFO", color: "#3fb950", msg: "Fetching page content and robots.txt..." },
                    { time: "10:42:14", type: "INFO", color: "#3fb950", msg: "Running 5 dimension agents in parallel..." },
                    { time: "10:42:15", type: "WARN", color: "#d29922", msg: "Schema — no JSON-LD detected in crawled HTML" },
                    { time: "10:42:16", type: "INFO", color: "#3fb950", msg: "Competitive — checking comparison page coverage..." },
                    { time: "10:42:17", type: "ERR", color: "#f85149", msg: "Schema — FAQPage, SoftwareApp, Organization all missing" },
                    { time: "10:42:18", type: "INFO", color: "#3fb950", msg: "Crawlability — GPTBot implicitly allowed via wildcard" },
                    { time: "10:42:19", type: "INFO", color: "#3fb950", msg: "Generating fixes and recommendations... done." },
                  ].map((line, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span style={{ color: "#8b949e" }}>{line.time}</span>
                      <span className="font-bold px-1 rounded text-xs" style={{ color: line.color, background: line.color + "20" }}>[{line.type}]</span>
                      <span style={{ color: "#e6edf3" }}>{line.msg}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2">
                    <span style={{ color: "#3fb950" }}>_</span>
                    <span className="text-xs" style={{ color: "#8b949e" }}>Waiting to start...</span>
                  </div>
                </div>
                {/* Terminal footer */}
                <div className="px-4 py-2 flex items-center justify-between" style={{ background: "#161b22", borderTop: "1px solid #30363d" }}>
                  <span className="text-xs font-mono" style={{ color: "#8b949e" }}>Enter a domain above to run a real audit</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono" style={{ color: "#8b949e" }}>5 agents ready</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: "#3fb950" }}></div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-center text-slate-500 font-medium">↑ Live audit log — enter a domain above to run your real audit</p>
            </div>
          )}

          {/* ── Real results ── */}
          {report && !loading && (
            <div className="flex flex-col gap-4">
              {/* 3 KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-slate-200 p-4" style={{ borderTop: `3px solid ${BRAND}` }}>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">GEO score</p>
                  <p className="text-4xl font-bold leading-none" style={{ color: ss?.color || BRAND }}>{report.composite_score}</p>
                  <p className="text-sm font-semibold mt-2" style={{ color: ss?.color || BRAND }}>{ss?.label}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4" style={{ borderTop: "3px solid #dc2626" }}>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Issues found</p>
                  <p className="text-4xl font-bold text-slate-900 leading-none">{allFindings.length}</p>
                  <p className="text-sm font-semibold text-red-500 mt-2">{report.critical_findings?.length || 0} critical · {report.high_findings?.length || 0} high</p>
                </div>
              </div>

              {/* Two column - findings + scores */}
              <div className="grid grid-cols-2 gap-4">
                {/* Findings */}
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Findings & fixes</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{allFindings.length} issues</span>
                  </div>
                  <div className="flex flex-col">
                    {allFindings.map((f: any, i: number) => (
                      <FindingRow key={i} finding={f} domain={domain} vertical={vertical} />
                    ))}
                  </div>
                </div>

                {/* Dimension scores */}
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Dimension scores</span>
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    {Object.entries(report.dimension_scores || {}).map(([dim, data]: [string, any]) => {
                      const s = typeof data === "object" ? (data.score ?? 0) : (data as number)
                      const barColor = s >= 70 ? "#059669" : s >= 40 ? "#ea580c" : "#dc2626"
                      return (
                        <div key={dim}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-sm text-slate-600">{DIMENSION_LABELS[dim]}</span>
                            <span className="text-sm font-semibold" style={{ color: barColor }}>{s}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mx-4 mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: "#eef1fd" }}>
                    <svg width="20" height="20" viewBox="0 0 56 56" className="flex-shrink-0 mt-0.5">
                      <rect x="12" y="16" width="32" height="28" rx="8" fill="#eef1fd" stroke={BRAND} strokeWidth="2"/>
                      <circle cx="22" cy="27" r="3" fill="white"/><circle cx="34" cy="27" r="3" fill="white"/>
                      <circle cx="22" cy="27" r="1.5" fill={BRAND}/><circle cx="34" cy="27" r="1.5" fill={BRAND}/>
                      <path d="M22 35 Q28 39 34 35" fill="none" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs leading-relaxed" style={{ color: "#185FA5" }}>
                      <strong>Radar says:</strong> {
                        (() => {
                          const scores = Object.entries(report.dimension_scores || {})
                          const lowest = scores.sort(([,a]: any, [,b]: any) => (a.score ?? 0) - (b.score ?? 0))[0]
                          if (lowest) return `${DIMENSION_LABELS[lowest[0]]} is your biggest gap — focus fixes here first for the most impact.`
                          return "Focus on your lowest scoring dimension first for maximum impact."
                        })()
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          </>}

          {/* Content Analysis Tab */}
          {activeTab === "Page Analyser" && (
            <div className="space-y-4">

              {/* URL Input */}
              <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Paste a content page URL</p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      value={caUrl}
                      onChange={e => setCaUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runContentAnalysis()}
                      placeholder="e.g. noveum.ai/blog/agent-evaluation or appian.com/case-study/..."
                      className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white transition-all placeholder:text-slate-400"
                      style={{ boxShadow: caUrl ? `0 0 0 2px ${BRAND}30` : undefined, borderColor: caUrl ? BRAND : undefined }}
                    />
                    {caUrl && (
                      <button onClick={() => { setCaUrl(""); setCaAnalysis(null); setCaError("") }} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => runContentAnalysis()} disabled={caLoading || !caUrl.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all shadow-sm hover:opacity-90"
                    style={{ backgroundColor: BRAND }}>
                    {caLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing...</> : <>Analyse <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400 px-1">Works best on specific content pages — blog posts, case studies, whitepapers, FAQs</p>

                {/* Optional paste for better results */}
                <div className="mt-3">
                  <button
                    onClick={() => setCaShowPaste(!caShowPaste)}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    style={{ color: BRAND }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                    {caShowPaste ? "Hide paste option" : "Paste content for deeper analysis"}
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">Optional</span>
                  </button>
                  {caShowPaste && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Paste article text for better results</p>
                      <p className="text-xs text-blue-600 mb-3">Open the page in your browser → Select all text (Cmd+A) → Copy → Paste below. This gives accurate results for JS-rendered pages and reveals statistics, author info, and content quality gaps.</p>
                      <textarea
                        value={caPasted}
                        onChange={e => setCaPasted(e.target.value)}
                        placeholder="Paste the full article text here..."
                        rows={5}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 resize-none"
                      />
                      {caPasted.trim().length > 100 && (
                        <button
                          onClick={() => runContentAnalysis(true)}
                          disabled={caLoading}
                          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all"
                          style={{ background: BRAND }}
                        >
                          {caLoading ? "Analysing..." : <>Analyse with pasted content <ArrowRight className="h-4 w-4" /></>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Error */}
              {caError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{caError}
                </div>
              )}

              {/* Blocked — paste fallback */}
              {caBlocked && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">This site blocks automated access</p>
                      <p className="text-xs text-amber-700 mt-0.5">Open the page in your browser, select all text (Ctrl+A), copy it, and paste below.</p>
                    </div>
                  </div>
                  <textarea value={caPasted} onChange={e => setCaPasted(e.target.value)}
                    placeholder="Paste the page content here..." rows={6}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-xs placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-300 resize-none font-mono" />
                  <button onClick={() => runContentAnalysis(true)} disabled={caLoading || caPasted.trim().length < 100}
                    className="mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors bg-amber-600 hover:bg-amber-700">
                    {caLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing...</> : <>Analyse pasted content <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </div>
              )}

              {/* Loading */}
              {caLoading && (
                <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col items-center gap-5 shadow-sm">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND }} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800">Analysing {caUrl}</p>
                    <p className="text-xs text-slate-400 mt-1">Reading content, checking schema, assessing AI citation readiness...</p>
                  </div>
                </div>
              )}

              {/* Intro */}
              {!caAnalysis && !caLoading && !caBlocked && (
                <>
                  {/* Hero text */}
                  <div className="text-center py-4">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Why isn't this page being cited by AI?</h2>
                    <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">Paste any blog post, case study, whitepaper or FAQ page URL. Get a citation score, exact gaps, and copy-paste fixes in under 30 seconds.</p>
                  </div>

                  {/* What you get cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-xl p-4 flex flex-col gap-2 border" style={{ background: "#eef1fd", borderColor: "#3B5BDB30" }}>
                      <span className="text-2xl">🎯</span>
                      <h3 className="text-sm font-bold" style={{ color: "#3B5BDB" }}>Citation score</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">0-100 score showing how likely AI engines are to cite this specific page</p>
                    </div>
                    <div className="rounded-xl p-4 flex flex-col gap-2 border" style={{ background: "#fff7ed", borderColor: "#ea580c30" }}>
                      <span className="text-2xl">🔍</span>
                      <h3 className="text-sm font-bold" style={{ color: "#ea580c" }}>Citation gaps</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Exact reasons why AI engines skip this page — weak entity definition, missing stats, no schema</p>
                    </div>
                    <div className="rounded-xl p-4 flex flex-col gap-2 border" style={{ background: "#faf5ff", borderColor: "#7c3aed30" }}>
                      <span className="text-2xl">✍️</span>
                      <h3 className="text-sm font-bold" style={{ color: "#7c3aed" }}>Rewrite briefs</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Before/after rewrites for specific sentences — copy, edit, publish</p>
                    </div>
                    <div className="rounded-xl p-4 flex flex-col gap-2 border" style={{ background: "#ecfdf5", borderColor: "#05996930" }}>
                      <span className="text-2xl">⚡</span>
                      <h3 className="text-sm font-bold" style={{ color: "#059669" }}>Quick wins</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">3 actions you can do today to improve citation chances — ranked by impact</p>
                    </div>
                  </div>

                  {/* Differentiator note */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">💡</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">Different from Technical Audit</p>
                      <p className="text-sm text-slate-500 leading-relaxed">Technical Audit checks if your <strong>website</strong> is accessible to AI crawlers. Page Analyser checks if your <strong>content</strong> is good enough for AI to actually quote. Both are needed for full AI visibility.</p>
                    </div>
                  </div>
                </>
              )}

              {/* Results */}
              {caAnalysis && !caLoading && (() => {
                const ss = getScoreStatus(caAnalysis.geo_score)
                return (
                  <div className="flex flex-col gap-3">

                    {/* Score + summary — glass card matching Technical Audit style */}
                    <div className="rounded-xl overflow-hidden" style={glassCard}>
                      <div className="px-4 py-2.5 border-b border-slate-200/60" style={{ background: "rgba(255,255,255,0.5)" }}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate max-w-lg">{caAnalysis.page_title || caUrl}</h3>
                          {caAnalysis.content_type && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200 ml-2 flex-shrink-0">{caAnalysis.content_type}</span>}
                        </div>
                      </div>
                      <div className="p-5 flex items-start gap-5">
                        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 flex-shrink-0"
                          style={{ borderColor: ss.border, backgroundColor: ss.bg }}>
                          <span className="text-3xl font-extrabold tabular-nums" style={{ color: ss.color }}>{caAnalysis.geo_score}</span>
                          <span className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: ss.color }}>{ss.label}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Summary</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{caAnalysis.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* What works */}
                    {caAnalysis.what_works?.length > 0 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(229,238,255,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", borderLeftColor: "#10b981", borderLeftWidth: "4px" }}>
                        <div className="px-4 py-2.5 border-b border-slate-200/30" style={{ background: "rgba(255,255,255,0.5)" }}>
                          <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">What works</h3>
                        </div>
                        <div className="p-4 space-y-2">
                          {caAnalysis.what_works.map((w: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold text-sm flex-shrink-0">+</span>
                              <p className="text-sm text-slate-700">{w}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Critical Gaps */}
                    {caAnalysis.critical_gaps?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Critical Gaps & Fixes</h2>
                          <span className="text-sm font-bold text-slate-400">{caAnalysis.critical_gaps.length} gaps found</span>
                        </div>
                        {caAnalysis.critical_gaps.map((gap: any, i: number) => (
                          <div key={i} className="rounded-xl overflow-hidden border-l-4" style={{ background: "rgba(229,238,255,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", borderLeftColor: "#ef4444", borderLeftWidth: "4px" }}>
                            <div className="px-4 py-2.5 border-b border-slate-200/30 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.5)" }}>
                              <span className="px-2 py-0.5 rounded text-sm font-bold bg-red-100 text-red-700">Gap</span>
                              <p className="text-sm font-bold text-slate-900">{gap.gap}</p>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Fix</p>
                                <p className="text-sm text-slate-700">{gap.fix}</p>
                              </div>
                              {gap.example && (
                                <p className="text-sm text-slate-500 italic bg-white/70 rounded-lg px-3 py-2">"{gap.example}"</p>
                              )}
                              {gap.impact && <p className="text-sm text-slate-400">Impact: {gap.impact}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rewrite Suggestions */}
                    {caAnalysis.rewrite_suggestions?.length > 0 && (
                      <div className="space-y-2">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">Rewrite Suggestions</h2>
                        {caAnalysis.rewrite_suggestions.map((r: any, i: number) => (
                          <div key={i} className="rounded-xl overflow-hidden border-l-4" style={{ background: "rgba(229,238,255,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", borderLeftColor: "#f59e0b", borderLeftWidth: "4px" }}>
                            <div className="px-4 py-2.5 border-b border-slate-200/30" style={{ background: "rgba(255,255,255,0.5)" }}>
                              <p className="text-sm font-bold text-slate-900">{r.element}</p>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              {r.current && <p className="text-sm text-slate-500 italic bg-white/60 rounded-lg px-3 py-2 border border-slate-200/50">Before: "{r.current}"</p>}
                              <p className="text-sm text-slate-800 font-semibold bg-amber-50/60 rounded-lg px-3 py-2 border border-amber-200/50">After: "{r.suggested}"</p>
                              {r.why && <p className="text-sm text-slate-400">Why: {r.why}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick wins */}
                    {caAnalysis.quick_wins?.length > 0 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(229,238,255,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", borderLeftColor: "#0891b2", borderLeftWidth: "4px" }}>
                        <div className="px-4 py-2.5 border-b border-slate-200/30" style={{ background: "rgba(255,255,255,0.5)" }}>
                          <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-widest">Quick Wins</h3>
                        </div>
                        <div className="p-4 space-y-3">
                          {caAnalysis.quick_wins.map((w: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>{i + 1}</span>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{w.action}</p>
                                <p className="text-sm text-slate-400 mt-0.5">{w.impact} · {w.effort}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={() => { setCaUrl(""); setCaAnalysis(null) }}
                      className="text-sm font-semibold hover:underline text-center pt-1" style={{ color: BRAND }}>
                      Analyse a different URL
                    </button>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}


