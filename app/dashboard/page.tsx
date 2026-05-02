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
import { getCompanies, getDashboardStats, getRankings, getResponses } from "@/lib/queries"
import { ResponseFeed } from "@/components/response-feed"

function formatLastRun(iso: string | null) {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Stats {
  visibility: number
  rank: number | null
  mentionCount: number
  totalResponses: number
  shareOfVoice: { name: string; visibility: number; isOurBrand: boolean }[]
  availableModels: string[]
  lastRunAt: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [selectedRange, setSelectedRange] = useState("Last 30 days")
  const [days, setDays] = useState(30)
  const [showSetup, setShowSetup] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [rankings, setRankings] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth")
  }, [authLoading, user, router])

  // Load companies
  useEffect(() => {
    if (!user) return
    getCompanies(user.id).then(data => {
      setCompanies(data)
      if (data.length > 0) setSelectedCompanyId(data[0].id)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  // Load dashboard data when company or range changes
  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const [statsData, rankingsData, responsesData] = await Promise.all([
        getDashboardStats(selectedCompanyId, days),
        getRankings(selectedCompanyId),
        getResponses(selectedCompanyId),
      ])
      setStats(statsData)
      setRankings(rankingsData)
      setResponses(responsesData)
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId, days])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRunNow = async () => {
    if (!selectedCompanyId) return
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: selectedCompanyId }),
    })
    setTimeout(fetchData, 3000)
  }

  const handleRangeChange = (range: string, d: number) => { setSelectedRange(range); setDays(d) }

  const ourBrand = rankings.find(r => r.isOurBrand)

  const kpiData = [
    {
      label: "Visibility",
      value: stats ? `${stats.visibility}%` : "—",
      delta: stats?.totalResponses ? `${stats.mentionCount} of ${stats.totalResponses} responses` : "No data yet",
      trend: (stats?.visibility ?? 0) >= 50 ? "up" as const : "down" as const,
    },
    {
      label: "Your Rank",
      value: stats?.rank ? `#${stats.rank}` : "—",
      delta: stats?.rank ? `of ${stats.shareOfVoice.length} tracked` : "No data yet",
      trend: (stats?.rank ?? 99) <= 2 ? "up" as const : "neutral" as const,
    },
    {
      label: "Avg Position",
      value: ourBrand?.avgPosition ? `#${ourBrand.avgPosition}` : "—",
      delta: "In AI numbered lists",
      trend: "neutral" as const,
    },
    {
      label: "Sentiment",
      value: ourBrand?.sentiment ? ourBrand.sentiment.charAt(0).toUpperCase() + ourBrand.sentiment.slice(1) : "—",
      delta: `${ourBrand?.mentionCount ?? 0} brand mentions`,
      trend: ourBrand?.sentiment === "positive" ? "up" as const : ourBrand?.sentiment === "negative" ? "down" as const : "neutral" as const,
    },
  ]

  if (authLoading || !user) return null

  const hasData = companies.length > 0 && selectedCompanyId && (rankings.length > 0 || (stats?.totalResponses ?? 0) > 0)

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
              onComplete={() => {
                setShowSetup(false)
                // Reload companies then refresh data
                if (user) getCompanies(user.id).then(data => {
                  setCompanies(data)
                  if (data.length > 0) setSelectedCompanyId(data[0].id)
                })
              }}
              onSaveExit={() => setShowSetup(false)}
            />
          </div>
        </div>
      )}

      <Sidebar
        companies={companies}
        selectedCompanyId={selectedCompanyId || undefined}
        onSelectCompany={setSelectedCompanyId}
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
        <DashboardHeader
          models={stats?.availableModels || []}
          selectedModel="all"
          selectedRange={selectedRange}
          lastTracked={formatLastRun(stats?.lastRunAt || null)}
          onModelChange={() => {}}
          onRangeChange={handleRangeChange}
          onRunNow={handleRunNow}
        />

        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">

          {/* Empty state */}
          {!selectedCompanyId && !loading && (
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

          {/* Loading */}
          {loading && selectedCompanyId && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading dashboard...</div>
            </div>
          )}

          {/* Dashboard content */}
          {!loading && selectedCompanyId && (
            <>
              <div className="grid flex-shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
                {kpiData.map(kpi => (
                  <KPICard key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} trend={kpi.trend} />
                ))}
              </div>

              <div className="flex flex-1 gap-3 overflow-hidden">
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
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                  <RankingTable data={rankings} />
                  <ResponseFeed responses={responses} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
