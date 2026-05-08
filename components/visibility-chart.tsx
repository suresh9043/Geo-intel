"use client"

import { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface RunData {
  runId: string
  date: string
  visibility: number
  total: number
  competitors?: Record<string, number>
}

const PAGE_SIZE = 10
const COMPETITOR_COLORS = ["#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]
const BRAND = "#003ec7"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function hasEnoughForChart(runs: RunData[]) {
  const uniqueDays = new Set(runs.map(r => new Date(r.date).toISOString().split('T')[0]))
  return uniqueDays.size >= 2
}

// Deduplicate by date — keep latest run per day
function deduplicateByDay(runs: RunData[]): RunData[] {
  const byDay = new Map<string, RunData>()
  for (const run of runs) {
    const day = new Date(run.date).toISOString().split('T')[0]
    byDay.set(day, run) // later runs overwrite earlier ones for the same day
  }
  return Array.from(byDay.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function TrendChart({ runs, showCompetitors }: { runs: RunData[], showCompetitors: boolean }) {
  const deduped = useMemo(() => deduplicateByDay(runs), [runs])
  const totalPages = Math.ceil(deduped.length / PAGE_SIZE)
  const [page, setPage] = useState(() => Math.max(0, Math.ceil(deduped.length / PAGE_SIZE) - 1))

  const pageRuns = deduped.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const competitorNames = showCompetitors
    ? Object.keys(runs[0]?.competitors || {})
    : []

  const chartData = pageRuns.map(r => {
    const point: Record<string, any> = { date: formatDate(r.date), visibility: r.visibility }
    if (showCompetitors && r.competitors) {
      competitorNames.forEach(name => { point[name] = r.competitors![name] ?? 0 })
    }
    return point
  })

  return (
    <div className="flex flex-col gap-2 w-full">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(value: any) => [`${value}%`]}
          />
          <Line type="linear" dataKey="visibility" stroke={BRAND} strokeWidth={2.5} dot={{ fill: BRAND, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
          {showCompetitors && competitorNames.map((name, i) => (
            <Line key={name} type="linear" dataKey={name} stroke={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Pagination — only show if more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Earlier
          </button>
          <span className="text-xs text-slate-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, deduped.length)} of {deduped.length} runs
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Later <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function Scorecard({ runs }: { runs: RunData[] }) {
  const runsLeft = Math.max(0, 2 - runs.length)
  return (
    <div className="flex flex-col gap-2 p-1">
      <p className="text-xs text-slate-400 leading-relaxed">
        Run tracking <span className="font-semibold text-slate-700">{runsLeft} more time{runsLeft > 1 ? "s" : ""}</span> to unlock the visibility trend chart.
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${(runs.length / 2) * 100}%`, backgroundColor: BRAND }} />
      </div>
    </div>
  )
}

export function VisibilityWidget({ runs, showCompetitors }: { runs: RunData[], showCompetitors: boolean }) {
  if (runs.length === 0) {
    return <p className="text-xs text-slate-400">Insufficient data — run a tracking job</p>
  }
  return hasEnoughForChart(runs)
    ? <TrendChart runs={runs} showCompetitors={showCompetitors} />
    : <Scorecard runs={runs} />
}
