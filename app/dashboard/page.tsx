"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getCompanies, getDashboardStats, getRankings, getResponses, getVisibilityPerRun } from "@/lib/queries"
import { SetupWizard } from "@/components/setup-wizard"
import { Sidebar } from "@/components/sidebar"
import { TrendingUp, TrendingDown, AlertCircle, Zap, RefreshCw, Plus, ChevronRight, BarChart2, Eye, Target, Activity } from "lucide-react"

function formatLastRun(iso: string | null) {
  if (!iso) return "Never"
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "Just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ModelBadge({ model }: { model: string }) {
  if (!model) return null
  if (!model) return null
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    chatgpt:    { bg: "#f0fdf4", color: "#16a34a", label: "GPT" },
    perplexity: { bg: "#faf5ff", color: "#7c3aed", label: "PPX" },
    gemini:     { bg: "#eff6ff", color: "#2563eb", label: "GEM" },
    claude:     { bg: "#fff7ed", color: "#ea580c", label: "CLD" },
  }
  const c = colors[model.toLowerCase()] || { bg: "#f1f5f9", color: "#64748b", label: model.slice(0,3).toUpperCase() }
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.bg, color: c.color, border: `1px solid ${c.color}20` }}>
      {c.label}
    </span>
  )
}

function getRecommendations(visibility: number, totalResponses: number, topCompetitor: any, sentiment: string | undefined) {
  const recs: any[] = []
  if (visibility === 0) {
    recs.push({ icon: AlertCircle, title: "Not appearing in AI answers", detail: `Mentioned in 0 of ${totalResponses} responses. Run a GEO audit to find out why.`, action: "Run GEO audit", href: "/dashboard/geo-audit", priority: "critical" })
  } else if (visibility < 30) {
    recs.push({ icon: AlertCircle, title: `Only ${visibility}% AI visibility`, detail: "Appearing in fewer than 1 in 3 responses. Content structure likely needs improvement.", action: "Run GEO audit", href: "/dashboard/geo-audit", priority: "critical" })
  }
  if (topCompetitor && topCompetitor.visibility > visibility + 20) {
    recs.push({ icon: TrendingUp, title: `${topCompetitor.name} leads by ${topCompetitor.visibility - visibility}%`, detail: "They likely have FAQPage schema, stronger authority signals, and better entity definition.", action: "Compare", href: "/dashboard/geo-audit", priority: "high" })
  }
  if (sentiment === "negative") {
    recs.push({ icon: AlertCircle, title: "Negative sentiment detected", detail: "AI engines are describing your brand negatively. Messaging needs attention.", action: "Fix", href: "/dashboard/geo-audit", priority: "high" })
  }
  if (recs.length < 3) recs.push({ icon: Zap, title: "Add FAQPage schema", detail: "Increases AI citation probability by 3.2x. Copy-paste fix ready.", action: "Get fix", href: "/dashboard/geo-audit", priority: "quick" })
  if (recs.length < 3) recs.push({ icon: Zap, title: "Allow AI crawler bots", detail: "Add GPTBot, PerplexityBot and ClaudeBot to robots.txt. 15 minutes.", action: "Get fix", href: "/dashboard/geo-audit", priority: "quick" })
  if (recs.length < 3) recs.push({ icon: TrendingUp, title: "Add sameAs links", detail: "Link Wikipedia, G2, LinkedIn in Organization schema.", action: "Get fix", href: "/dashboard/geo-audit", priority: "quick" })
  return recs.slice(0, 3)
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; border: string; label: string; stripe: string }> = {
  critical: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Critical", stripe: "#dc2626" },
  high:     { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa", label: "High",     stripe: "#ea580c" },
  quick:    { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "Quick win", stripe: "#2563eb" },
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [showSetup, setShowSetup] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [rankings, setRankings] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [visibilityRuns, setVisibilityRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (!authLoading && !user) router.push("/auth") }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    getCompanies(user.id).then(data => {
      setCompanies(data)
      if (data.length > 0) setSelectedCompanyId(data[0].id)
    })
  }, [user])

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const [s, r, resp, runs] = await Promise.all([
        getDashboardStats(selectedCompanyId, 30, "all"),
        getRankings(selectedCompanyId),
        getResponses(selectedCompanyId, 8),
        getVisibilityPerRun(selectedCompanyId),
      ])
      setStats(s); setRankings(r); setResponses(resp); setVisibilityRuns(runs)
    } catch {}
    setLoading(false)
  }, [selectedCompanyId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRunNow = async () => {
    if (!selectedCompanyId) return
    await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: selectedCompanyId }) })
    setTimeout(fetchData, 3000)
  }

  if (authLoading || !user) return null

  const ourBrand = rankings.find(r => r.isOurBrand)
  const topCompetitor = rankings.filter(r => !r.isOurBrand).sort((a, b) => b.visibility - a.visibility)[0]
  const visibility = stats?.visibility || 0
  const sorted = [...rankings].sort((a, b) => b.visibility - a.visibility)
  const maxVis = sorted[0]?.visibility || 100
  const recs = getRecommendations(visibility, stats?.totalResponses || 0, topCompetitor, ourBrand?.sentiment)
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f0f4f8" }}>
      {showSetup && <SetupWizard onComplete={() => { setShowSetup(false); fetchData() }} onSaveExit={() => setShowSetup(false)} />}
      <Sidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>AI Visibility Dashboard</h1>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "1px 0 0" }}>Last run: {formatLastRun(stats?.lastRun || null)}</p>
            </div>
            {companies.length > 0 && (
              <select
                value={selectedCompanyId || ""}
                onChange={e => setSelectedCompanyId(e.target.value)}
                style={{ fontSize: 13, color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", outline: "none", marginLeft: 8 }}
              >
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowSetup(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "white", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontWeight: 500, color: "#64748b", cursor: "pointer" }}>
              <Plus size={13} /> Add company
            </button>
            <button onClick={handleRunNow} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#2563eb", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer" }}>
              <RefreshCw size={13} /> Run now
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16, alignContent: "flex-start" }}>

          {companies.length === 0 && !loading && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 48, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Target size={26} color="#2563eb" />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Set up your first company</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>Track how your brand appears across ChatGPT, Perplexity, Gemini and Claude.</p>
              <button onClick={() => setShowSetup(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 22px", background: "#2563eb", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer" }}>
                <Plus size={14} /> Get started
              </button>
            </div>
          )}

          {companies.length > 0 && (
            <>
              {/* KPI strip - compact */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                {[
                  { label: "AI Visibility", value: `${visibility}%`, sub: `${stats?.totalResponses || 0} queries`, color: "#2563eb", icon: Eye },
                  { label: "Your Rank", value: ourBrand?.avgPosition ? `#${Math.round(ourBrand.avgPosition)}` : "—", sub: "avg position", color: "#7c3aed", icon: Target },
                  { label: "Avg Position", value: ourBrand?.avgPosition ? `#${ourBrand.avgPosition.toFixed(1)}` : "—", sub: "in AI lists", color: "#0891b2", icon: BarChart2 },
                  { label: "GEO Score", value: "—", sub: "run audit to score", color: "#f59e0b", icon: Activity },
                  { label: "Sentiment", value: ourBrand?.sentiment ? ourBrand.sentiment.charAt(0).toUpperCase() + ourBrand.sentiment.slice(1) : "Neutral", sub: "brand perception", color: ourBrand?.sentiment === "positive" ? "#16a34a" : ourBrand?.sentiment === "negative" ? "#dc2626" : "#64748b", icon: TrendingUp },
                ].map((k, i) => {
                  const Icon = k.icon
                  return (
                    <div key={i} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", borderTop: `3px solid ${k.color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{k.label}</p>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: k.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={14} color={k.color} />
                        </div>
                      </div>
                      <p style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 3px", lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</p>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{k.sub}</p>
                    </div>
                  )
                })}
              </div>

              {/* Middle row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 12 }}>

                {/* Share of voice */}
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Share of Voice</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>Your brand vs competitors</p>
                  </div>
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {sorted.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No data yet</p>
                    ) : sorted.map((r, i) => (
                      <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: r.isOurBrand ? "#2563eb" : ["#7c3aed","#0891b2","#16a34a","#ea580c"][i % 4], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", flexShrink: 0 }}>
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <p style={{ fontSize: 12, fontWeight: r.isOurBrand ? 700 : 500, color: "#0f172a", margin: 0, width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.name}{r.isOurBrand ? " ★" : ""}
                        </p>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, background: r.isOurBrand ? "#2563eb" : r.visibility >= 60 ? "#16a34a" : r.visibility >= 30 ? "#f59e0b" : "#dc2626", width: `${(r.visibility / maxVis) * 100}%`, transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: r.isOurBrand ? "#2563eb" : "#0f172a", width: 36, textAlign: "right", flexShrink: 0 }}>{r.visibility}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LLM Responses */}
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>LLM Responses</p>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>{stats?.totalResponses || 0} total</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {responses.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>No responses yet</p>
                    ) : responses.slice(0, 4).map((resp: any, i: number) => (
                      <div key={i} style={{ padding: "10px 16px", borderTop: i > 0 ? "1px solid #f8fafc" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <ModelBadge model={resp.model} />
                        <p style={{ flex: 1, fontSize: 12, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resp.prompt}</p>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: resp.brand_mentioned ? "#f0fdf4" : "#fef2f2", color: resp.brand_mentioned ? "#16a34a" : "#dc2626", flexShrink: 0 }}>
                          {resp.brand_mentioned ? "✓" : "✗"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recommended Actions</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#f8fafc" }}>
                    {recs.map((rec, i) => {
                      const p = PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.quick
                      const Icon = rec.icon
                      return (
                        <a key={i} href={rec.href} style={{ display: "block", background: "white", padding: "12px 16px", textDecoration: "none", borderLeft: `3px solid ${p.stripe}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Icon size={12} color={p.color} />
                              <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>{rec.title}</p>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>{p.label}</span>
                          </div>
                          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px", lineHeight: 1.4 }}>{rec.detail}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: p.color }}>
                            {rec.action} <ChevronRight size={11} />
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Brand rankings table */}
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Brand Rankings</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>Your brand vs competitors across all AI responses</p>
                  </div>
                </div>
                {rankings.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No data yet — run tracking to see rankings</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Rank", "Brand", "Visibility", "Avg Position", "Sentiment", "Mentioned by"].map(h => (
                          <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r, i) => (
                        <tr key={r.name} style={{ borderTop: "1px solid #f1f5f9", background: r.isOurBrand ? "#eff6ff" : "white" }}
                          onMouseEnter={e => { if (!r.isOurBrand) e.currentTarget.style.background = "#f8fafc" }}
                          onMouseLeave={e => { e.currentTarget.style.background = r.isOurBrand ? "#eff6ff" : "white" }}>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#cbd5e1" }}>#{i + 1}</span>
                          </td>
                          <td style={{ padding: "11px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 7, background: r.isOurBrand ? "#2563eb" : ["#7c3aed","#0891b2","#16a34a","#ea580c","#ec4899"][i % 5], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", flexShrink: 0 }}>
                                {r.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: r.isOurBrand ? 700 : 500, color: "#0f172a", margin: 0 }}>{r.name}</p>
                                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{r.mentionCount} of {r.totalResponses} responses</p>
                              </div>
                              {r.isOurBrand && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", background: "#dbeafe", color: "#2563eb", borderRadius: 3 }}>YOU</span>}
                            </div>
                          </td>
                          <td style={{ padding: "11px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 80, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 3, background: r.visibility >= 60 ? "#16a34a" : r.visibility >= 30 ? "#f59e0b" : "#dc2626", width: `${r.visibility}%` }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: r.visibility >= 60 ? "#16a34a" : r.visibility >= 30 ? "#f59e0b" : "#dc2626" }}>{r.visibility}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>{r.avgPosition ? `#${r.avgPosition.toFixed(1)}` : "—"}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: r.sentiment === "positive" ? "#f0fdf4" : r.sentiment === "negative" ? "#fef2f2" : "#f1f5f9", color: r.sentiment === "positive" ? "#16a34a" : r.sentiment === "negative" ? "#dc2626" : "#64748b" }}>
                              {r.sentiment ? r.sentiment.charAt(0).toUpperCase() + r.sentiment.slice(1) : "Neutral"}
                            </span>
                          </td>
                          <td style={{ padding: "11px 16px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {(r.models || []).map((m: string) => <ModelBadge key={m} model={m} />)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
