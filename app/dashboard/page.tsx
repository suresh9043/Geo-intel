"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, RefreshCw, Play, AlertCircle, TrendingUp, Zap, ExternalLink, ArrowUp, ArrowDown } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { SetupWizard } from "@/components/setup-wizard"
import { useAuth } from "@/lib/auth-context"
import { getCompanies, getDashboardStats, getRankings, getResponses, getVisibilityPerRun } from "@/lib/queries"
import { ResponseFeed } from "@/components/response-feed"
import { VisibilityWidget } from "@/components/visibility-chart"
import { cn } from "@/lib/utils"

function formatLastRun(iso: string | null) {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ModelBadge({ model }: { model: string }) {
  const m = model.toLowerCase()
  if (m.includes("gpt")) return <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">GPT</span>
  if (m.includes("claude")) return <span className="rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[10px] font-semibold">Claude</span>
  if (m.includes("gemini")) return <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold">Gemini</span>
  if (m.includes("sonar") || m.includes("perplexity")) return <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold">Perplexity</span>
  return <span className="rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-semibold">{model.substring(0, 2).toUpperCase()}</span>
}


function getRecommendations(visibility: number, totalResponses: number, topCompetitor: any, sentiment: string | undefined) {
  const recs: { icon: any; title: string; detail: string; action: string; href: string; priority: "critical" | "high" | "quick" }[] = []
  if (totalResponses === 0) {
    recs.push({ icon: AlertCircle, title: "No tracking data yet", detail: "Run your first tracking job to see how AI engines mention your brand.", action: "Run now", href: "#run", priority: "critical" })
  } else if (visibility === 0) {
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
  if (recs.length < 3) recs.push({ icon: Zap, title: "Add FAQPage schema", detail: "Increases AI citation probability by 3.2×. Copy-paste fix ready.", action: "Get fix", href: "/dashboard/geo-audit", priority: "quick" })
  if (recs.length < 3) recs.push({ icon: Zap, title: "Allow AI crawler bots", detail: "Add GPTBot, PerplexityBot and ClaudeBot to robots.txt. 15 minutes.", action: "Get fix", href: "/dashboard/geo-audit", priority: "quick" })
  if (recs.length < 3) recs.push({ icon: TrendingUp, title: "Add sameAs links", detail: "Link Wikipedia, G2, LinkedIn in Organization schema.", action: "Get fix", href: "/dashboard/geo-audit", priority: "quick" })
  return recs.slice(0, 3)
}

const PBADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  quick: "bg-blue-100 text-blue-700",
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [showSetup, setShowSetup] = useState(false)
  const [activeTab, setActiveTab] = useState<"visibility" | "prompts" | "citations">("visibility")
  const [showCompetitors, setShowCompetitors] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("all")
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
      if (data.length > 0) {
        const saved = localStorage.getItem('selectedCompanyId')
        const valid = saved && data.find(c => c.id === saved)
        setSelectedCompanyId(valid ? saved : data[0].id)
      }
    })
  }, [user])

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const [s, r, resp, runs] = await Promise.all([
        getDashboardStats(selectedCompanyId, 30, selectedModel),
        getRankings(selectedCompanyId),
        getResponses(selectedCompanyId, 8),
        getVisibilityPerRun(selectedCompanyId),
      ])
      setStats(s); setRankings(r); setResponses(resp); setVisibilityRuns(runs)
    } catch {}
    setLoading(false)
  }, [selectedCompanyId, selectedModel])

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
  const visColor = visibility >= 60 ? "#16a34a" : visibility >= 30 ? "#d97706" : "#dc2626"
  const mentionDelta = visibilityRuns.length >= 2
    ? visibilityRuns[visibilityRuns.length - 1].visibility - visibilityRuns[visibilityRuns.length - 2].visibility
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showSetup && <SetupWizard onComplete={() => { setShowSetup(false); if (user) getCompanies(user.id).then(data => { setCompanies(data); if (data.length > 0) setSelectedCompanyId(data[0].id) }) }} onSaveExit={() => setShowSetup(false)} />}
      <Sidebar
        companies={companies}
        selectedCompanyId={selectedCompanyId || undefined}
        onSelectCompany={(id) => { setSelectedCompanyId(id); localStorage.setItem('selectedCompanyId', id) }}
        onCreateNew={() => setShowSetup(true)}
        onDeleteCompany={(id) => {
          const remaining = companies.filter(c => c.id !== id)
          setCompanies(remaining)
          if (selectedCompanyId === id) {
            setSelectedCompanyId(remaining.length > 0 ? remaining[0].id : null)
            setStats(null)
            setRankings([])
          }
        }}
      />
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-card-foreground">{companies.find(c => c.id === selectedCompanyId)?.name || "AI Visibility Dashboard"}</h1>
            {stats?.lastRunAt && <p className="text-xs text-muted-foreground">Last run: {formatLastRun(stats.lastRunAt)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {/* Model filter */}
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-card-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="all">All models</option>
              {(stats?.availableModels || []).map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button onClick={fetchData} className="p-1.5 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleRunNow} className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors">
              <Play className="h-3.5 w-3.5" /> Run now
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-border bg-card px-6">
          <div className="flex gap-1">
            {(["visibility", "prompts", "citations"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {/* Prompts tab */}
          {activeTab === "prompts" && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-sm font-medium text-card-foreground">Prompts</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          )}

          {/* Citations tab */}
          {activeTab === "citations" && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-sm font-medium text-card-foreground">Citations</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          )}

          {/* Visibility tab */}
          {activeTab === "visibility" && (companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <h2 className="text-lg font-semibold text-card-foreground">No companies tracked yet</h2>
              <p className="text-sm text-muted-foreground">Add your first company to start tracking AI visibility</p>
              <button onClick={() => setShowSetup(true)} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 mx-auto">
                <Plus className="h-4 w-4" /> Add company
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">


              {/* Row 2 — Visibility Trend + Share of Voice + Recommended Actions */}
              {/* Row 2 — Visibility Trend (70%) + Visibility Rank (30%) */}
              <div className="grid grid-cols-12 gap-4">

                {/* Visibility trend — hero (70%) */}
                <div className="col-span-8 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mention Rate</p>
                      <div className="flex items-end gap-2">
                        <p className="text-4xl font-black tabular-nums leading-none" style={{ color: (stats?.totalResponses ?? 0) > 0 ? visColor : "hsl(var(--muted-foreground))" }}>
                          {(stats?.totalResponses ?? 0) > 0 ? `${visibility}%` : "—"}
                        </p>
                        {mentionDelta !== null && mentionDelta !== 0 && (
                          <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold mb-1",
                            mentionDelta > 0 ? "text-emerald-600" : "text-red-500"
                          )}>
                            {mentionDelta > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                            {Math.abs(mentionDelta)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCompetitors}
                        onChange={e => setShowCompetitors(e.target.checked)}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Show Competitors</span>
                    </label>
                  </div>
                  <VisibilityWidget runs={visibilityRuns} showCompetitors={showCompetitors} />
                </div>

                {/* Visibility Rank (30%) */}
                <div className="col-span-4 rounded-xl border border-border bg-card p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Visibility Rank</p>
                  {sorted.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sorted.map((entry, i) => (
                        <div key={entry.name} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5", entry.isOurBrand && "bg-primary/5 border border-primary/20")}>
                          <span className={cn("text-sm font-black tabular-nums w-6 flex-shrink-0",
                            i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-muted-foreground"
                          )}>#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-semibold truncate", entry.isOurBrand ? "text-primary" : "text-card-foreground")}>
                              {entry.name}{entry.isOurBrand && " ★"}
                            </p>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-700",
                                entry.isOurBrand ? "bg-primary" :
                                i === 0 ? "bg-blue-500" : i === 1 ? "bg-purple-500" : "bg-indigo-400"
                              )} style={{ width: `${maxVis > 0 ? (entry.visibility / maxVis) * 100 : 0}%` }} />
                            </div>
                          </div>
                          <span className={cn("text-xs font-bold tabular-nums flex-shrink-0",
                            entry.visibility >= 60 ? "text-emerald-600" :
                            entry.visibility >= 30 ? "text-amber-600" : "text-muted-foreground"
                          )}>{entry.visibility > 0 ? `${entry.visibility}%` : "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3 — Brand Mentions + Average Position */}
              <div className="grid grid-cols-12 gap-4">

                {/* Brand Mentions */}
                <div className="col-span-6 rounded-xl border border-border bg-card p-5">
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Mentions</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Times each brand appeared in AI responses</p>
                  </div>
                  {rankings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  ) : (() => {
                    const maxMentions = Math.max(...rankings.map(x => x.mentionCount || 0), 1)
                    const colors = ["bg-primary", "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500"]
                    return (
                      <div className="flex flex-col gap-4">
                        {rankings.map((r, i) => (
                          <div key={r.name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={cn("h-2 w-2 rounded-full flex-shrink-0", colors[i % colors.length])} />
                                <span className={cn("text-xs truncate max-w-40", r.isOurBrand ? "font-semibold text-card-foreground" : "text-muted-foreground")}>
                                  {r.name}{r.isOurBrand && <span className="ml-1 text-primary text-[10px]">YOU</span>}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold tabular-nums text-card-foreground">{r.mentionCount || 0}</span>
                                <span className="text-[10px] text-muted-foreground">/ {r.totalResponses}</span>
                              </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full transition-all duration-700", colors[i % colors.length])}
                                style={{ width: `${((r.mentionCount || 0) / maxMentions) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Average Position */}
                <div className="col-span-6 rounded-xl border border-border bg-card p-5">
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Position</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Avg rank in AI numbered lists (lower is better)</p>
                  </div>
                  {rankings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {rankings.map((r, i) => {
                        const posLabel = r.avgPosition ? `#${r.avgPosition.toFixed(1)}` : "—"
                        const posColor = r.avgPosition
                          ? r.avgPosition <= 2 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                          : r.avgPosition <= 4 ? "text-amber-600 bg-amber-50 border-amber-200"
                          : "text-red-500 bg-red-50 border-red-200"
                          : "text-muted-foreground bg-muted border-border"
                        return (
                          <div key={r.name} className={cn("flex items-center justify-between rounded-lg border px-4 py-3 transition-colors", r.isOurBrand ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border")}>
                            <div className="flex items-center gap-2.5">
                              <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                                r.isOurBrand ? "bg-primary" : ["bg-blue-500","bg-purple-500","bg-emerald-500","bg-orange-500"][i % 4]
                              )}>{r.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <p className={cn("text-xs font-semibold", r.isOurBrand ? "text-primary" : "text-card-foreground")}>{r.name}</p>
                                {r.isOurBrand && <p className="text-[10px] text-muted-foreground">Your brand</p>}
                              </div>
                            </div>
                            <span className={cn("rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums", posColor)}>
                              {posLabel}
                            </span>
                          </div>
                        )
                      })}
                      <p className="text-[10px] text-muted-foreground">— not yet detected in numbered lists</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4 — Share of Voice + Brand Rankings */}
              <div className="grid grid-cols-12 gap-4">
                {/* Share of Voice */}
                <div className="col-span-4 rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Share of Voice</p>
                  {sorted.length === 0
                    ? <p className="text-xs text-muted-foreground">Run tracking to see data</p>
                    : <div className="flex flex-col gap-3">
                        {sorted.map((entry, i) => (
                          <div key={entry.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-xs truncate max-w-28", entry.isOurBrand ? "font-semibold text-primary" : "text-muted-foreground")}>
                                {entry.name}{entry.isOurBrand && " ★"}
                              </span>
                              <span className={cn("text-xs font-bold tabular-nums",
                                entry.visibility >= 60 ? "text-emerald-600" :
                                entry.visibility >= 30 ? "text-amber-600" : "text-red-500"
                              )}>{entry.visibility}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-700",
                                entry.isOurBrand ? "bg-primary" :
                                i === 0 ? "bg-blue-500" : i === 1 ? "bg-purple-500" : "bg-indigo-400"
                              )} style={{ width: `${maxVis > 0 ? (entry.visibility / maxVis) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* Brand Rankings */}
                <div className="col-span-8 rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Brand Rankings</p>
                    <p className="text-xs text-muted-foreground">Your brand vs competitors across all AI responses</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {["Rank", "Brand", "Visibility", "Avg Position", "Mentioned by"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No data yet — run tracking to see rankings</td></tr>
                      ) : rankings.map((r, i) => (
                        <tr key={r.name} className={cn("border-b border-border last:border-0 transition-colors hover:bg-muted/20", r.isOurBrand && "bg-primary/5")}>
                          <td className="px-4 py-3">
                            <span className={cn("text-sm font-bold tabular-nums",
                              i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"
                            )}>#{r.rank}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                                r.isOurBrand ? "bg-primary" : ["bg-blue-500","bg-purple-500","bg-emerald-500","bg-orange-500","bg-pink-500"][i % 5]
                              )}>{r.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <p className={cn("text-sm", r.isOurBrand ? "font-semibold text-primary" : "font-medium text-card-foreground")}>{r.name}</p>
                                <p className="text-xs text-muted-foreground">{r.mentionCount} of {r.totalResponses} responses</p>
                              </div>
                              {r.isOurBrand && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">You</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full rounded-full",
                                  r.visibility >= 60 ? "bg-emerald-500" :
                                  r.visibility >= 30 ? "bg-amber-400" : "bg-red-500"
                                )} style={{ width: `${r.visibility}%` }} />
                              </div>
                              <span className={cn("text-sm font-bold tabular-nums",
                                r.visibility >= 60 ? "text-emerald-600" :
                                r.visibility >= 30 ? "text-amber-600" : "text-red-500"
                              )}>{r.visibility}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-card-foreground tabular-nums">{r.avgPosition ? `#${r.avgPosition.toFixed(1)}` : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {(r.models || []).map((m: string) => <ModelBadge key={m} model={m} />)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>

              {/* Row 4 — Recommended Actions */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Actions</p>
                  <button onClick={() => router.push("/dashboard/geo-audit")} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Full audit <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex flex-col gap-0">
                  {recs.map((rec, i) => (
                    <div key={i}
                      onClick={() => rec.href !== "#run" && router.push(rec.href)}
                      className="flex items-start gap-3 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 -mx-4 px-4 transition-colors rounded-lg">
                      <span className={cn("flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap", PBADGE[rec.priority])}>
                        {rec.priority === "quick" ? "Quick win" : rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-card-foreground">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.detail}</p>
                      </div>
                      <span className="text-xs text-primary font-medium flex-shrink-0 self-center whitespace-nowrap">{rec.action} →</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 5 — LLM Responses */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">LLM Responses</p>
                <ResponseFeed responses={responses} />
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
