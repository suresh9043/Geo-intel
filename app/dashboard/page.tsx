"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Play, RefreshCw, ExternalLink, ChevronDown, ArrowUp, ArrowDown, Eye, ClipboardList, Clock, Zap, LogOut, Radio, Trophy, Hash, Target, LayoutList, Lightbulb, MessageSquare, Pencil, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getCompanies, getDashboardStats, getRankings, getResponses, getVisibilityPerRun, getPromptStats, getPromptResponses, getPromptModelBreakdown, getCitationStats } from "@/lib/queries"
import { VisibilityWidget } from "@/components/visibility-chart"
import { SetupWizard } from "@/components/setup-wizard"

const BRAND = "#003ec7"
const BRAND_LIGHT = "#e6ebf9"
const BRAND_ACTIVE = "#002b92"
const AVATAR_COLORS = [BRAND, "#1e293b", "#059669", "#7c3aed", "#ea580c", "#0891b2"]

// --- Styles -------------------------------------------------------------------

const glassSidebar: React.CSSProperties = {
  background: "rgba(239,244,255,0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRight: "1px solid #c4c5d7",
}

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(191,219,254,0.4)",
  backgroundColor: "rgba(219,234,254,0.12)",
  transition: "box-shadow 0.2s ease",
}

// --- Helpers ------------------------------------------------------------------

function formatLastRun(iso: string | null) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getRecommendations(visibility: number, totalResponses: number, topCompetitor: any) {
  const recs: { priority: string; title: string; detail: string; action: string }[] = []
  if (totalResponses === 0 || visibility === 0) {
    recs.push({ priority: "Critical", title: "Missing AI visibility", detail: `Seen in 0 of ${totalResponses} responses.`, action: "Fix now" })
  } else if (visibility < 30) {
    recs.push({ priority: "Critical", title: `Only ${visibility}% AI visibility`, detail: "Appearing in fewer than 1 in 3 responses.", action: "Fix now" })
  }
  if (topCompetitor && topCompetitor.visibility > visibility + 20) {
    recs.push({ priority: "High", title: `${topCompetitor.name} leads by ${topCompetitor.visibility - visibility}%`, detail: "Stronger authority signals and entity definition.", action: "Compare" })
  }
  if (recs.length < 3) recs.push({ priority: "Win", title: "Add FAQ schema", detail: "Increases AI citation probability. Copy-paste fix ready.", action: "Get fix" })
  if (recs.length < 3) recs.push({ priority: "Win", title: "Allow AI crawler bots", detail: "Add GPTBot, PerplexityBot to robots.txt.", action: "Get fix" })
  return recs.slice(0, 3)
}

// --- Sub-components -----------------------------------------------------------

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group flex-shrink-0">
      <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center cursor-help text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
        <span className="text-[9px] font-bold leading-none">?</span>
      </div>
      <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-52 rounded-lg bg-slate-800 text-white text-xs leading-relaxed px-3 py-2 shadow-xl pointer-events-none">
        {text}
        <div className="absolute -top-1 right-1.5 w-2 h-2 bg-slate-800 rotate-45" />
      </div>
    </div>
  )
}

function ModelBadge({ model }: { model: string }) {
  const m = model.toLowerCase()
  if (m.includes("gpt")) return <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold">GPT</span>
  if (m.includes("claude")) return <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-semibold">Claude</span>
  if (m.includes("gemini")) return <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold">Gemini</span>
  if (m.includes("sonar") || m.includes("perplexity")) return <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-semibold">Sonar</span>
  return <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-semibold">{model.slice(0, 6)}</span>
}

function SkeletonBar({ w = "100%" }: { w?: string }) {
  return <div className="h-3 rounded-full bg-slate-200 animate-pulse" style={{ width: w }} />
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <SkeletonBar w={`${60 + (i * 15) % 40}%`} />
          <SkeletonBar w="100%" />
        </div>
      ))}
    </div>
  )
}

function ZeroState({ companyName, onRunNow }: { companyName: string; onRunNow: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: BRAND_LIGHT }}>
        <Zap className="h-7 w-7" style={{ color: BRAND }} />
      </div>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{companyName} hasn't appeared in AI responses yet</h3>
      <p className="text-xs text-slate-400 max-w-xs mb-5">Run your first tracking job to see how AI engines like ChatGPT, Claude and Gemini respond to your discovery prompts.</p>
      <button onClick={onRunNow} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm" style={{ backgroundColor: BRAND }}>
        <Play className="h-3.5 w-3.5" fill="currentColor" /> Run first scan
      </button>
    </div>
  )
}

// --- Citations Tab ------------------------------------------------------------

function CitationsTab({ companyId, stats, loading, onLoad }: { companyId: string; stats: any; loading: boolean; onLoad: () => void }) {
  useEffect(() => { onLoad() }, [companyId])

  const maxCount = stats?.domains?.[0]?.count || 1

  if (loading) return <div className="rounded-xl overflow-hidden" style={glassCard}><CardSkeleton rows={6} /></div>

  if (!stats || stats.totalCitations === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <ClipboardList className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-semibold text-slate-600">No citations found yet</p>
      <p className="text-xs text-slate-400">Run tracking with web-grounded models (Sonar, GPT) to see cited sources.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Citations", value: stats.totalCitations, sub: "across all responses", icon: <ClipboardList className="h-4 w-4" /> },
          { label: "Your Domain", value: stats.ownCitations > 0 ? stats.ownCitations : "0", sub: stats.companyDomain || "not detected", icon: <Target className="h-4 w-4" /> },
          { label: "Unique Sources", value: stats.domains.length, sub: "distinct domains cited", icon: <Hash className="h-4 w-4" /> },
        ].map(card => (
          <div key={card.label} className="rounded-xl p-4 flex items-start gap-3" style={glassCard}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: BRAND_LIGHT, color: BRAND }}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{card.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 leading-tight">{card.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Domain table */}
      <div className="rounded-xl overflow-hidden" style={glassCard}>
        <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-slate-400" />Top Cited Sources
          </h3>
          <InfoTooltip text="Domains most frequently cited by AI models in their responses. Your domain is highlighted." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100" style={{ background: "rgba(248,250,252,0.4)" }}>
                {["#", "Domain", "Title", "Citations", "Models"].map(h => (
                  <th key={h} className={`px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest ${h === "Citations" ? "text-center" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {stats.domains.map((d: any, i: number) => (
                <tr key={d.domain} className="hover:bg-white/40 transition-colors" style={d.isOwn ? { background: "rgba(0,62,199,0.03)" } : {}}>
                  <td className="px-4 py-3 text-sm font-bold text-slate-400">#{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={d.isOwn ? { color: BRAND } : { color: "#334155" }}>{d.domain}</span>
                      {d.isOwn && <span className="px-1.5 py-0.5 text-xs font-bold rounded" style={{ background: BRAND_LIGHT, color: BRAND }}>YOU</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 italic">—</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-slate-700">{d.count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {d.models.map((m: string) => <ModelBadge key={m} model={m} />)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Main Page ----------------------------------------------------------------

export default function DashboardV2() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [showSetup, setShowSetup] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [showCompetitors, setShowCompetitors] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "ytd">("30d")
  const [activeTab, setActiveTab] = useState("Visibility")
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("all")
  const [stats, setStats] = useState<any>(null)
  const [rankings, setRankings] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [visibilityRuns, setVisibilityRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [runLoading, setRunLoading] = useState(false)
  const [reprocessLoading, setReprocessLoading] = useState(false)
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [barsVisible, setBarsVisible] = useState(false)
  const [promptStats, setPromptStats] = useState<any[]>([])
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)
  const [promptResponsesCache, setPromptResponsesCache] = useState<Record<string, any[]>>({})
  const [modelViewPromptId, setModelViewPromptId] = useState<string | null>(null)
  const [modelBreakdownCache, setModelBreakdownCache] = useState<Record<string, any>>({})
  const [citationStats, setCitationStats] = useState<any>(null)
  const [citationsLoading, setCitationsLoading] = useState(false)

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
    setBarsVisible(false)
    try {
      const [s, r, resp, runs, ps] = await Promise.all([
        getDashboardStats(selectedCompanyId, 30, selectedModel),
        getRankings(selectedCompanyId),
        getResponses(selectedCompanyId, 8),
        getVisibilityPerRun(selectedCompanyId),
        getPromptStats(selectedCompanyId),
      ])
      setStats(s); setRankings(r); setResponses(resp); setVisibilityRuns(runs); setPromptStats(ps)
      setPromptResponsesCache({})
      setModelBreakdownCache({})
      setCitationStats(null)
      setTimeout(() => setBarsVisible(true), 100)
    } catch {}
    setLoading(false)
  }, [selectedCompanyId, selectedModel])

  useEffect(() => { fetchData() }, [fetchData])

  // Keyboard shortcut R â†' Run now
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        handleRunNow()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedCompanyId])

  const handleRunNow = async () => {
    if (!selectedCompanyId || runLoading) return
    setRunLoading(true)
    try {
      await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: selectedCompanyId }) })
      await fetchData()
    } finally {
      setRunLoading(false)
    }
  }

  const handleEditCompany = async (companyId: string) => {
    const { getCompanyWithDetails } = await import("@/lib/queries")
    const data = await getCompanyWithDetails(companyId)
    setEditingData({
      companyId,
      companyName: data.name || "",
      websiteUrl: data.url || "",
      description: data.description || "",
      geography: data.icp_description || "Worldwide",
      vertical: data.industry || "SaaS",
      competitors: (data.competitors || []).map((c: any) => ({ name: c.name || c, url: c.url || "" })),
      prompts: (data.prompts || []).map((p: any) => p.text),
      selectedModels: (data.trackedModels || []).map((m: any) => m.model_slug),
    })
    setShowSetup(true)
  }

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Delete "${companyName}"? This cannot be undone.`)) return
    const { deleteCompany } = await import("@/lib/queries")
    await deleteCompany(companyId)
    const updated = await import("@/lib/queries").then(m => m.getCompanies(user!.id))
    setCompanies(updated)
    if (selectedCompanyId === companyId) {
      setSelectedCompanyId(updated[0]?.id || null)
    }
  }

  const handleReprocessPositions = async () => {
    if (!selectedCompanyId || reprocessLoading) return
    setReprocessLoading(true)
    setModelBreakdownCache({})
    setPromptResponsesCache({})
    setCitationStats(null)
    try {
      await fetch("/api/reprocess-positions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: selectedCompanyId }) })
      await fetchData()
    } finally {
      setReprocessLoading(false)
    }
  }

  if (authLoading || !user) return null

  const sorted = [...rankings].sort((a, b) => b.visibility - a.visibility)
  const maxVis = sorted[0]?.visibility || 100
  const maxMentions = Math.max(...rankings.map(x => x.mentionCount || 0), 1)
  const topCompetitor = rankings.filter(r => !r.isOurBrand).sort((a, b) => b.visibility - a.visibility)[0]
  const visibility = stats?.visibility || 0
  const hasData = (stats?.totalResponses ?? 0) > 0
  const mentionDelta = visibilityRuns.length >= 2
    ? visibilityRuns[visibilityRuns.length - 1].visibility - visibilityRuns[visibilityRuns.length - 2].visibility
    : null
  const recs = getRecommendations(visibility, stats?.totalResponses || 0, topCompetitor)
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name || "Dashboard"
  const lastRun = formatLastRun(stats?.lastRunAt)

  // Unique models across all rankings
  const allModels = [...new Set(rankings.flatMap(r => r.models || []))]

  function cardStyle(id: string): React.CSSProperties {
    return {
      ...glassCard,
      boxShadow: hoveredCard === id
        ? "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,62,199,0.06)"
        : "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
    }
  }

  return (
    <div className="flex h-screen overflow-hidden antialiased text-slate-900" style={{ background: "#f8fafc" }}>
      {showSetup && (
        <SetupWizard
          onComplete={() => { setShowSetup(false); setEditingData(null); if (user) getCompanies(user.id).then(data => { setCompanies(data); if (data.length > 0) setSelectedCompanyId(data[0].id) }) }}
          onSaveExit={() => { setShowSetup(false); setEditingData(null) }}
          initialData={editingData}
        />
      )}

      {/* Sidebar */}
      <aside className="w-72 flex flex-col fixed inset-y-0 left-0 z-50" style={{ ...glassSidebar, color: "#0b1c30" }}>
        <div className="p-5 border-b border-[#c4c5d7]/30">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: BRAND }}>G</div>
            <span className="text-lg font-bold tracking-tight">Geo Intel</span>
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
              <h3 className="text-sm font-bold text-[#434654] uppercase tracking-widest">Companies</h3>
              <button onClick={() => setShowSetup(true)} className="text-[#434654] hover:text-[#0b1c30] transition-colors" title="Add company">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {companies.length === 0 ? (
                <li className="px-2.5 py-1.5 text-xs text-[#434654]">No companies yet</li>
              ) : companies.map((c, i) => {
                const isActive = c.id === selectedCompanyId
                const avatarColors = ["#003ec7","#7c3aed","#059669","#ea580c","#0891b2","#db2777"]
                const avatarBg = avatarColors[i % avatarColors.length]
                return (
                  <li key={c.id}>
                    <div className="group flex items-center gap-1 px-1 rounded-md transition-all"
                      style={isActive ? { backgroundColor: BRAND_ACTIVE } : {}}>
                      <button onClick={() => { setSelectedCompanyId(c.id); localStorage.setItem('selectedCompanyId', c.id) }}
                        className="flex-1 flex items-center gap-2.5 px-1.5 py-2 text-sm font-medium transition-all text-left min-w-0"
                        style={isActive ? { color: "white" } : { color: "#434654" }}>
                        <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : avatarBg }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{c.name}</span>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pr-1">
                        <button onClick={() => handleEditCompany(c.id)}
                          className="p-1 rounded hover:bg-black/10 transition-colors"
                          style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#94a3b8" }}
                          title="Edit">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDeleteCompany(c.id, c.name)}
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#94a3b8" }}
                          title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <h3 className="px-2 text-sm font-bold text-[#434654] uppercase tracking-widest mb-2">Tools</h3>
            <ul className="space-y-0.5">
              {[
                { label: "AI Visibility", icon: <Eye className="w-4 h-4" />, href: "/dashboard" },
                { label: "Geo Audit", icon: <ClipboardList className="w-4 h-4" />, href: "/dashboard/geo-audit" },
              ].map(item => (
                <li key={item.label}>
                  <a href={item.href} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all text-[#434654] hover:text-[#0b1c30] hover:bg-[#002b92]/5">
                    {item.icon}{item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="p-3 border-t border-[#c4c5d7]/30">
          <button onClick={() => signOut()} className="flex items-center gap-2 px-2 w-full text-sm font-semibold text-[#434654] hover:text-[#0b1c30] transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-72 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-40 flex-shrink-0" style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(226,232,240,0.7)" }}>
          <div className="px-5 flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-900 text-2xl">{selectedCompanyName}</h2>
              {lastRun && (
                <span className="flex items-center gap-1 text-sm text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" /> {lastRun}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {allModels.length > 0 && (
                <div className="flex items-center gap-1 mr-1">
                  {allModels.slice(0, 4).map(m => <ModelBadge key={m} model={m} />)}
                </div>
              )}
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-slate-500 outline-none">
                <option value="all">All models</option>
                {(stats?.availableModels || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={handleReprocessPositions} disabled={reprocessLoading} className="p-1.5 text-slate-400 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50" title="Refresh and reprocess positions">
                <RefreshCw className={`h-3.5 w-3.5 ${reprocessLoading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleRunNow} disabled={runLoading} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-all shadow-sm disabled:opacity-70" style={{ backgroundColor: BRAND }}
                title="Press R to run">
                {runLoading
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Running...</>
                  : <><Play className="h-3.5 w-3.5" fill="currentColor" /> Run now</>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6 px-5">
            {[
              { label: "Visibility", icon: <Eye className="h-3.5 w-3.5" /> },
              { label: "Prompts", icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { label: "Citations", icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { label: "Recommendations", icon: <Lightbulb className="h-3.5 w-3.5" /> },
            ].map(({ label, icon }) => (
              <button key={label} onClick={() => setActiveTab(label)} className="flex items-center gap-1.5 px-1 text-sm py-2 transition-colors"
                style={activeTab === label ? { fontWeight: 700, color: BRAND, borderBottom: `2px solid ${BRAND}` } : { fontWeight: 500, color: "#64748b" }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <ZeroState companyName="Your first company" onRunNow={() => setShowSetup(true)} />
            </div>
          ) : (
            <>
              {/* Prompts tab */}
              {activeTab === "Prompts" && (
                <div className="flex flex-col gap-3">
                  {/* Summary row */}
                  {promptStats.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Tracked Prompts",
                          value: promptStats.length,
                          sub: `${promptStats.filter(p => p.totalResponses > 0).length} with data`,
                          icon: <MessageSquare className="h-4 w-4" />,
                        },
                        {
                          label: "Avg Mention Rate",
                          value: promptStats.length > 0
                            ? `${Math.round(promptStats.filter(p => p.totalResponses > 0).reduce((a, p) => a + p.mentionRate, 0) / Math.max(promptStats.filter(p => p.totalResponses > 0).length, 1))}%`
                            : "—",
                          sub: "across all prompts",
                          icon: <Radio className="h-4 w-4" />,
                        },
                        {
                          label: "Best Prompt",
                          value: promptStats.find(p => p.totalResponses > 0)?.mentionRate != null
                            ? `${promptStats.find(p => p.totalResponses > 0)!.mentionRate}%`
                            : "—",
                          sub: promptStats.find(p => p.totalResponses > 0)?.text?.slice(0, 30) + (promptStats.find(p => p.totalResponses > 0)?.text?.length > 30 ? "..." : "") || "No data yet",
                          icon: <Trophy className="h-4 w-4" />,
                        },
                      ].map(card => (
                        <div key={card.label} className="rounded-xl p-4 flex items-start gap-3" style={glassCard}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: BRAND_LIGHT, color: BRAND }}>
                            {card.icon}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{card.label}</p>
                            <p className="text-2xl font-extrabold text-slate-900 leading-tight">{card.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prompt performance table */}
                  <div className="rounded-xl overflow-hidden" style={glassCard}>
                    <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400" />Prompt Performance
                      </h3>
                      <InfoTooltip text="How often your brand is mentioned in AI responses per prompt. Click a row to see sample responses." />
                    </div>

                    {loading ? (
                      <CardSkeleton rows={4} />
                    ) : promptStats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <MessageSquare className="h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">No prompts set up yet</p>
                        <p className="text-xs text-slate-400">Add prompts in the company setup to start tracking.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100" style={{ background: "rgba(248,250,252,0.4)" }}>
                              {["", "Health", "Prompt", "Mention Rate", "Mentions", "Models", "Responses"].map(h => (
                                <th key={h} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50">
                            {promptStats.map((p: any) => {
                              const isModelOpen = modelViewPromptId === p.id
                              const healthColor: Record<string, React.CSSProperties> = {
                                Strong: { background: "#ecfdf5", color: "#059669" },
                                Average: { background: "#fffbeb", color: "#d97706" },
                                Weak: { background: "#fff7ed", color: "#ea580c" },
                                Dead: { background: "#fef2f2", color: "#dc2626" },
                              }
                              const rateColor = p.mentionRate >= 60 ? "#059669" : p.mentionRate >= 30 ? "#d97706" : p.mentionRate >= 10 ? "#ea580c" : "#dc2626"
                              return (
                                <React.Fragment key={p.id}>
                                  <tr className="transition-colors hover:bg-white/40">
                                    <td className="px-3 py-3">
                                      <button
                                        onClick={async () => {
                                          if (isModelOpen) { setModelViewPromptId(null); return }
                                          setModelViewPromptId(p.id)
                                          if (!modelBreakdownCache[p.id]) {
                                            const data = await getPromptModelBreakdown(selectedCompanyId!, p.id)
                                            setModelBreakdownCache(prev => ({ ...prev, [p.id]: data }))
                                          }
                                        }}
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all border"
                                        style={isModelOpen
                                          ? { background: BRAND, color: "white", borderColor: BRAND }
                                          : { background: "white", color: "#64748b", borderColor: "#e2e8f0" }}
                                      >
                                        {isModelOpen ? "−" : "+"}
                                      </button>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={healthColor[p.health]}>{p.health}</span>
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                      <p className="text-sm font-medium text-slate-800 line-clamp-2">{p.text}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.mentionRate}%`, backgroundColor: rateColor }} />
                                        </div>
                                        <span className="text-sm font-bold" style={{ color: rateColor }}>{p.mentionRate}%</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-sm font-semibold text-slate-700">{p.mentionCount}</span>
                                      <span className="text-xs text-slate-400"> mentions</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex gap-1 flex-wrap">
                                        {p.models.length > 0
                                          ? p.models.map((m: string) => <ModelBadge key={m} model={m} />)
                                          : <span className="text-xs text-slate-300">none</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                      <span className="font-semibold text-slate-700">{p.mentionCount}</span>
                                      <span className="text-slate-400">/{p.totalResponses}</span>
                                    </td>
                                  </tr>
                                  {isModelOpen && (
                                    <tr>
                                      <td colSpan={7} className="px-4 pb-4 pt-0" style={{ background: "rgba(248,250,252,0.6)" }}>
                                        <div className="pt-3">
                                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Model Breakdown</p>
                                          {!modelBreakdownCache[p.id] ? (
                                            <CardSkeleton rows={2} />
                                          ) : !modelBreakdownCache[p.id]?.modelRows?.length ? (
                                            <p className="text-xs text-slate-400">No responses yet for this prompt.</p>
                                          ) : (
                                            <div className="space-y-4">
                                              <table className="w-full text-left">
                                                <thead>
                                                  <tr className="border-b border-slate-100">
                                                    {["Model", "Status", "Mentions", "Citations", "Response Preview"].map(h => (
                                                      <th key={h} className={`px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest ${["Mentions", "Citations"].includes(h) ? "text-center" : ""}`}>{h}</th>
                                                    ))}
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100/50">
                                                  {modelBreakdownCache[p.id].modelRows.map((m: any) => {
                                                    const statusStyle: React.CSSProperties = m.position
                                                      ? { background: "#ecfdf5", color: "#059669" }
                                                      : m.isHM
                                                      ? { background: "#f1f5f9", color: "#94a3b8" }
                                                      : { background: "#fef2f2", color: "#dc2626" }
                                                    const statusLabel = m.position ? "Ranked" : m.isHM ? "HM" : "Not mentioned"
                                                    return (
                                                      <tr key={m.model} className="hover:bg-white/40 transition-colors">
                                                        <td className="px-3 py-2"><div className="flex items-center gap-1.5"><ModelBadge model={m.model} /><span className="text-xs font-medium text-slate-600">{m.model}</span></div></td>
                                                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={statusStyle}>{statusLabel}</span></td>
                                                        <td className="px-3 py-2 text-sm font-semibold text-slate-700 text-center">{m.mentionCount}</td>
                                                        <td className="px-3 py-2 text-sm font-semibold text-slate-700 text-center">{m.citationCount}</td>
                                                        <td className="px-3 py-2 text-xs text-slate-400 max-w-sm truncate">{m.preview || "—"}</td>
                                                      </tr>
                                                    )
                                                  })}
                                                </tbody>
                                              </table>

                                              {modelBreakdownCache[p.id].citedDomains?.length > 0 && (
                                                <div>
                                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cited Sources</p>
                                                  <div className="space-y-1.5">
                                                    {modelBreakdownCache[p.id].citedDomains.map((d: any) => (
                                                      <div key={d.domain} className="flex items-center gap-3 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.5)" }}>
                                                        <span className="text-sm font-medium text-slate-700 flex-1">{d.domain}</span>
                                                        <div className="flex gap-1">{d.models.map((m: string) => <ModelBadge key={m} model={m} />)}</div>
                                                        <span className="text-xs font-bold text-slate-500 w-6 text-right">{d.count}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Citations tab */}
              {activeTab === "Citations" && (
                <CitationsTab
                  companyId={selectedCompanyId!}
                  stats={citationStats}
                  loading={citationsLoading}
                  onLoad={async () => {
                    if (citationStats || citationsLoading) return
                    setCitationsLoading(true)
                    const s = await getCitationStats(selectedCompanyId!)
                    setCitationStats(s)
                    setCitationsLoading(false)
                  }}
                />
              )}

              {/* Recommendations tab */}
              {activeTab === "Recommendations" && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl overflow-hidden" style={glassCard}>
                    <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-slate-400" />Recommendations</h3>
                      <a href="/dashboard/geo-audit" className="text-sm font-bold hover:underline flex items-center gap-1" style={{ color: BRAND }}>
                        Full audit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="p-4 space-y-2">
                      {recs.map((rec, i) => {
                        const cardBg: Record<string, React.CSSProperties> = {
                          Critical: { background: "rgba(254,242,242,0.5)", border: "1px solid rgba(254,202,202,0.5)" },
                          High: { background: "rgba(255,247,237,0.5)", border: "1px solid rgba(254,215,170,0.5)" },
                          Win: { background: "rgba(239,246,255,0.5)", border: "1px solid rgba(191,219,254,0.5)" },
                        }
                        const badgeStyle: Record<string, React.CSSProperties> = {
                          Critical: { background: "#fee2e2", color: "#b91c1c" },
                          High: { background: "#ffedd5", color: "#c2410c" },
                          Win: { background: BRAND_LIGHT, color: BRAND },
                        }
                        return (
                          <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={cardBg[rec.priority]}>
                            <div className="flex gap-3">
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold h-fit uppercase whitespace-nowrap" style={badgeStyle[rec.priority]}>{rec.priority}</span>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{rec.title}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{rec.detail}</p>
                              </div>
                            </div>
                            <button className="text-sm font-bold whitespace-nowrap ml-4 hover:opacity-80 transition-opacity" style={{ color: BRAND }}>{rec.action} &rarr;</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Visibility tab */}
              {activeTab === "Visibility" && <>

              {/* Row 1: Mention Rate + Visibility Rank */}
              <div className="grid grid-cols-12 gap-3">

                {/* Mention Rate */}
                <div className="col-span-8"
                  onMouseEnter={() => setHoveredCard("mention")}
                  onMouseLeave={() => setHoveredCard(null)}>
                  <div className="rounded-xl flex flex-col min-h-[320px] overflow-hidden" style={cardStyle("mention")}>
                    <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-slate-400" />Mention Rate</h3>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-extrabold text-slate-900">{hasData ? `${visibility}%` : "—"}</span>
                          {mentionDelta !== null && mentionDelta !== 0 && (
                            <span className={`flex items-center gap-0.5 text-xs font-medium ${mentionDelta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {mentionDelta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {Math.abs(mentionDelta)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={chartPeriod}
                          onChange={e => setChartPeriod(e.target.value as any)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-500 outline-none"
                        >
                          <option value="7d">Last 7 days</option>
                          <option value="30d">Last 30 days</option>
                          <option value="ytd">Year to date</option>
                        </select>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={showCompetitors} onChange={e => setShowCompetitors(e.target.checked)} className="h-3 w-3 rounded" style={{ accentColor: BRAND }} />
                          <span className="text-sm text-slate-400">Competitors</span>
                        </label>
                        <InfoTooltip text="% of AI responses that mention your brand. Calculated as (responses mentioning you / total responses) x 100." />
                      </div>
                    </div>
                    {loading ? <CardSkeleton rows={2} /> : (
                      <div className="p-4 flex flex-col flex-1">
                        {!hasData && <p className="text-xs text-slate-400 mb-2">{selectedCompanyName} hasn't appeared in any AI responses yet</p>}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visibility Trend</h4>
                          {lastRun && <span className="text-xs font-medium text-slate-400">Last run: {lastRun}</span>}
                        </div>
                        <div className="flex-1">
                          <VisibilityWidget runs={(() => {
                            const now = Date.now()
                            if (chartPeriod === "7d") return visibilityRuns.filter(r => now - new Date(r.date).getTime() <= 7 * 86400000)
                            if (chartPeriod === "30d") return visibilityRuns.filter(r => now - new Date(r.date).getTime() <= 30 * 86400000)
                            const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime()
                            return visibilityRuns.filter(r => new Date(r.date).getTime() >= startOfYear)
                          })()} showCompetitors={showCompetitors} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visibility Rank */}
                <div className="col-span-4"
                  onMouseEnter={() => setHoveredCard("rank")}
                  onMouseLeave={() => setHoveredCard(null)}>
                  <div className="rounded-xl flex flex-col h-full overflow-hidden" style={cardStyle("rank")}>
                    <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-slate-400" />Visibility Rank</h3>
                      <InfoTooltip text="Ranks your brand against competitors by how often each appears in AI responses. Higher = more visible to AI engines." />
                    </div>
                    {loading ? <CardSkeleton rows={4} /> : sorted.length === 0 ? (
                      <p className="text-xs text-slate-400 p-4">No data yet</p>
                    ) : (
                      <div className="p-3 space-y-3 flex-1">
                        {sorted.map((entry, i) => (
                          <div key={entry.name} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span style={entry.isOurBrand ? { color: BRAND, fontWeight: 700 } : { color: "#64748b" }}>
                                #{i + 1} {entry.name}{entry.isOurBrand && " *"}
                              </span>
                              <span className="font-bold text-slate-900">{entry.visibility > 0 ? `${entry.visibility}%` : "0%"}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: barsVisible ? `${maxVis > 0 ? (entry.visibility / maxVis) * 100 : 0}%` : "0%",
                                backgroundColor: entry.isOurBrand ? BRAND : AVATAR_COLORS[i + 1] || "#94a3b8",
                                opacity: entry.isOurBrand ? 1 : 0.75,
                                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Brand Mentions + Average Position */}
              {!hasData ? (
                <div className="rounded-xl overflow-hidden" style={glassCard}>
                  <ZeroState companyName={selectedCompanyName} onRunNow={handleRunNow} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-3">
                    {/* Brand Mentions */}
                    <div className="col-span-7"
                      onMouseEnter={() => setHoveredCard("mentions")}
                      onMouseLeave={() => setHoveredCard(null)}>
                      <div className="rounded-xl flex flex-col h-full overflow-hidden" style={cardStyle("mentions")}>
                        <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-slate-400" />Brand Mentions</h3>
                          <InfoTooltip text="How many times each brand appeared across all AI responses. Shows raw citation count vs total responses." />
                        </div>
                        {loading ? <CardSkeleton /> : (
                          <div className="p-3">
                            <p className="text-xs text-slate-400 mb-3">Times appeared in AI responses</p>
                            <div className="space-y-2.5">
                              {rankings.map((r, i) => (
                                <div key={r.name} className="flex items-center gap-3">
                                  <span className="w-20 text-sm font-medium text-slate-600 truncate">{r.name}</span>
                                  <div className="flex-1 h-6 rounded-md relative overflow-hidden" style={{ background: "rgba(241,245,249,0.6)" }}>
                                    <div className="absolute inset-y-0 left-0 rounded-r-md" style={{
                                      width: barsVisible ? `${((r.mentionCount || 0) / maxMentions) * 100}%` : "0%",
                                      backgroundColor: AVATAR_COLORS[i] || "#94a3b8",
                                      opacity: r.isOurBrand ? 1 : 0.8,
                                      transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                                    }} />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{
                                      color: ((r.mentionCount || 0) / maxMentions) > 0.5 ? "rgba(255,255,255,0.9)" : "#94a3b8"
                                    }}>{r.mentionCount || 0}/{r.totalResponses}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Average Position */}
                    <div className="col-span-5"
                      onMouseEnter={() => setHoveredCard("position")}
                      onMouseLeave={() => setHoveredCard(null)}>
                      <div className="rounded-xl flex flex-col h-full overflow-hidden" style={cardStyle("position")}>
                        <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-slate-400" />Average Position</h3>
                          <InfoTooltip text="Where your brand ranks in AI numbered lists on average. Position 1 is best. Lower number = AI mentions you earlier." />
                        </div>
                        {loading ? <CardSkeleton /> : (
                          <div className="p-3 space-y-1.5 flex-1">
                            {rankings.map((r, i) => {
                              const posLabel = r.avgPosition ? ('#' + r.avgPosition.toFixed(1)) : r.visibility > 0 ? 'HM' : 'n/a'
                              const posStyle: React.CSSProperties = r.avgPosition
                                ? r.avgPosition <= 2 ? { background: "#ecfdf5", color: "#059669" }
                                : r.avgPosition <= 4 ? { background: "#fffbeb", color: "#d97706" }
                                : { background: "#fef2f2", color: "#dc2626" }
                                : r.visibility > 0 ? { background: "#f1f5f9", color: "#94a3b8", fontStyle: "italic" }
                                : { background: "#f1f5f9", color: "#cbd5e1" }
                              return (
                                <div key={r.name} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100/50 hover:bg-white/60 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                      style={{ backgroundColor: AVATAR_COLORS[i] || "#94a3b8" }}>
                                      {r.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{r.name}</span>
                                    {r.isOurBrand && <span className="text-xs font-bold" style={{ color: BRAND }}>YOU</span>}
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded-md text-sm font-bold" style={posStyle}>{posLabel}</span>
                                </div>
                              )
                            })}
                            <p className="text-xs text-slate-400 pt-1 px-1">"" not yet detected in numbered lists</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Brand Rankings */}
                  <div onMouseEnter={() => setHoveredCard("table")} onMouseLeave={() => setHoveredCard(null)}>
                    <div className="rounded-xl overflow-hidden" style={cardStyle("table")}>
                      <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><LayoutList className="h-3.5 w-3.5 text-slate-400" />Brand Rankings</h3>
                        <InfoTooltip text="Full comparison of your brand vs competitors — visibility %, average list position, and which AI models mention each brand." />
                      </div>
                      {loading ? <CardSkeleton rows={4} /> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-100" style={{ background: "rgba(248,250,252,0.4)" }}>
                                {["Rank", "Brand", "Visibility", "Avg Pos", "Source"].map(h => (
                                  <th key={h} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50">
                              {rankings.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">No data yet</td></tr>
                              ) : rankings.map((r, i) => (
                                <tr key={r.name} className="transition-colors hover:bg-white/40" style={r.isOurBrand ? { background: "rgba(0,62,199,0.04)" } : {}}>
                                  <td className="px-4 py-2.5 text-sm font-bold text-slate-900">#{r.rank}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                        style={{ backgroundColor: AVATAR_COLORS[i] || "#94a3b8" }}>
                                        {r.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                                        {r.isOurBrand && <span className="ml-1.5 px-1 py-0.5 text-xs font-bold rounded" style={{ background: BRAND_LIGHT, color: BRAND }}>YOU</span>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{
                                          width: barsVisible ? `${r.visibility}%` : "0%",
                                          backgroundColor: r.visibility >= 60 ? "#10b981" : r.visibility >= 30 ? "#f59e0b" : "#ef4444",
                                          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                                        }} />
                                      </div>
                                      <span className="text-sm font-bold" style={{ color: r.visibility >= 60 ? "#059669" : r.visibility >= 30 ? "#d97706" : "#dc2626" }}>
                                        {r.visibility}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-sm font-medium text-slate-500">{r.avgPosition ? `#${r.avgPosition.toFixed(1)}` : r.visibility > 0 ? <span className="italic text-slate-400">HM</span> : "n/a"}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex gap-1 flex-wrap">
                                      {(r.models || []).map((m: string) => <ModelBadge key={m} model={m} />)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Row 4: Response Feed */}
              <div onMouseEnter={() => setHoveredCard("feed")} onMouseLeave={() => setHoveredCard(null)}>
                <div className="rounded-xl overflow-hidden" style={cardStyle("feed")}>
                  <div className="px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.5)" }}>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-slate-400" />Response Feed</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-400">{responses.length} latest</span>
                      <InfoTooltip text="Latest AI responses to your tracked prompts. Click any row to read the full response and see if your brand was mentioned." />
                    </div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {loading ? <CardSkeleton rows={3} /> : responses.length === 0 ? (
                      <p className="text-xs text-slate-400 p-1">No responses yet "" run tracking to populate this feed</p>
                    ) : responses.map((r: any) => {
                      const isExpanded = expandedResponse === r.id
                      const preview = r.response_text?.split('\n').find((l: string) => l.trim().length > 20) || ""
                      return (
                        <div key={r.id} className="rounded-lg overflow-hidden border border-slate-100/60 transition-all" style={{ background: "rgba(255,255,255,0.35)" }}>
                          <div className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/50 transition-colors"
                            onClick={() => setExpandedResponse(isExpanded ? null : r.id)}>
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">{(r.prompts as any)?.text || "n/a"}</p>
                                {!isExpanded && preview && (
                                  <p className="text-sm text-slate-400 truncate mt-0.5">{preview.slice(0, 120)}...</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                              <ModelBadge model={r.requested_model} />
                              <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-2 border-t border-slate-100/50" style={{ background: "rgba(255,255,255,0.55)" }}>
                              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{r.response_text || "No response text"}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              </>}
            </>
          )}
        </div>
      </main>
    </div>
  )
}




