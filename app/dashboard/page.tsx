"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { KPICard } from "@/components/kpi-card"
import { RankingTable } from "@/components/ranking-table"
import { MentionsCoverage } from "@/components/mentions-coverage"
import { ShareOfVoice } from "@/components/share-of-voice"
import { SetupWizard } from "@/components/setup-wizard"
import { useAuth } from "@/lib/auth-context"

const API_BASE = "http://localhost:3000/api"

interface Stats {
  visibility: number
  rank: number | null
  mentionCount: number
  totalResponses: number
  shareOfVoice: { name: string; visibility: number; isOurBrand: boolean }[]
  availableModels: string[]
  lastRunAt: string | null
}

function formatLastRun(iso: string | null) {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [selectedModel, setSelectedModel] = useState("all")
  const [selectedRange, setSelectedRange] = useState("Last 30 days")
  const [days, setDays] = useState(30)
  const [rankings, setRankings] = useState<any[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth")
  }, [authLoading, user, router])

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ days: String(days), model: selectedModel })
    const [statsRes, rankingsRes] = await Promise.all([
      fetch(`${API_BASE}/stats?${params}`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/rankings`).then((r) => r.json()).catch(() => ({ rankings: [] })),
    ])
    if (statsRes) setStats(statsRes)
    setRankings(rankingsRes.rankings || [])
  }, [days, selectedModel])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRunNow = async () => {
    await fetch(`${API_BASE}/track/start`, { method: "POST" })
    setTimeout(fetchData, 3000)
  }

  const handleRangeChange = (range: string, d: number) => { setSelectedRange(range); setDays(d) }

  const ourBrand = rankings.find((r) => r.isOurBrand)

  const kpiData = [
    {
      label: "Visibility",
      value: stats ? `${stats.visibility}%` : "—",
      delta: stats?.totalResponses ? `${stats.mentionCount} of ${stats.totalResponses}` : "No data",
      trend: (stats?.visibility ?? 0) >= 50 ? "up" as const : "down" as const,
    },
    {
      label: "Your Rank",
      value: stats?.rank ? `#${stats.rank}` : "—",
      delta: stats?.rank ? `of ${stats.shareOfVoice.length} tracked` : "No data",
      trend: (stats?.rank ?? 99) <= 2 ? "up" as const : "neutral" as const,
    },
    {
      label: "Avg Position",
      value: ourBrand?.avgPosition ? `#${ourBrand.avgPosition}` : "—",
      delta: "In AI numbered lists",
      trend: ourBrand?.avgPosition <= 2 ? "up" as const : "neutral" as const,
    },
    {
      label: "Sentiment",
      value: ourBrand?.sentiment ? ourBrand.sentiment.charAt(0).toUpperCase() + ourBrand.sentiment.slice(1) : "—",
      delta: `${ourBrand?.mentionCount ?? 0} brand mentions`,
      trend: ourBrand?.sentiment === "positive" ? "up" as const : ourBrand?.sentiment === "negative" ? "down" as const : "neutral" as const,
    },
  ]

  if (authLoading || !user) return null

  const hasData = rankings.length > 0 || (stats?.totalResponses ?? 0) > 0

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Setup wizard modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
            <button
              onClick={() => setShowSetup(false)}
              className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <SetupWizard
              onComplete={() => { setShowSetup(false); fetchData() }}
              onSaveExit={() => setShowSetup(false)}
            />
          </div>
        </div>
      )}

      <Sidebar
        companies={rankings.filter(r => r.isOurBrand).map(r => ({ id: r.name, name: r.name }))}
        selectedCompanyId={rankings.find(r => r.isOurBrand)?.name}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          models={stats?.availableModels || []}
          selectedModel={selectedModel}
          selectedRange={selectedRange}
          lastTracked={formatLastRun(stats?.lastRunAt || null)}
          onModelChange={setSelectedModel}
          onRangeChange={handleRangeChange}
          onRunNow={handleRunNow}
        />

        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">

          {/* Empty state — no companies tracked yet */}
          {!hasData && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="rounded-full bg-primary/10 p-5">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-card-foreground">No companies tracked yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add your first company to start tracking AI visibility</p>
              </div>
              <button
                onClick={() => setShowSetup(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New
              </button>
            </div>
          )}

          {/* Dashboard content — only show when data exists */}
          {hasData && <>
          {/* KPI Row */}
          <div className="grid flex-shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
            {kpiData.map((kpi) => (
              <KPICard key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} trend={kpi.trend} />
            ))}
          </div>

          {/* Main content — fills remaining height */}
          <div className="flex flex-1 gap-3 overflow-hidden">
            {/* Left column: Mentions + Share of Voice */}
            <div className="flex w-72 flex-shrink-0 flex-col gap-3">
              <MentionsCoverage
                mentionCount={stats?.mentionCount || 0}
                totalResponses={stats?.totalResponses || 0}
                models={ourBrand?.models || []}
              />
              <div className="flex-1 overflow-hidden">
                <ShareOfVoice data={stats?.shareOfVoice || []} />
              </div>
            </div>

            {/* Right: Ranking table fills all remaining space */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <RankingTable data={rankings} />
            </div>
          </div>
          </>}
        </div>
      </main>
    </div>
  )
}
