"use client"

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface RunData {
  runId: string
  date: string
  visibility: number
  total: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getDelta(runs: RunData[]) {
  if (runs.length < 2) return null
  const latest = runs[runs.length - 1].visibility
  const previous = runs[runs.length - 2].visibility
  return latest - previous
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const positive = delta > 0
  const neutral = delta === 0
  return (
    <span className={cn(
      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
      positive ? "bg-emerald-50 text-emerald-700" : neutral ? "bg-muted text-muted-foreground" : "bg-red-50 text-red-600"
    )}>
      {positive ? <TrendingUp className="h-3 w-3" /> : neutral ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{delta}% since last run
    </span>
  )
}

function hasEnoughForChart(runs: RunData[]) {
  const uniqueDays = new Set(
    runs.map(r => new Date(r.date).toISOString().split('T')[0])
  )
  return uniqueDays.size >= 2
}

// ─── Scorecard ────────────────────────────────────────────────────────────────

function Scorecard({ runs }: { runs: RunData[] }) {
  const latest = runs[runs.length - 1]
  const delta = getDelta(runs)
  const runsLeft = Math.max(0, 2 - runs.length)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-card-foreground">
            {latest?.visibility > 0 ? `${latest.visibility}%` : "—"}
          </p>
        </div>
        <DeltaBadge delta={delta} />
      </div>

      {latest && (
        <p className="text-xs text-muted-foreground">Last run {formatDate(latest.date)}</p>
      )}

      {runsLeft > 0 && (
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Run tracking <span className="font-semibold text-card-foreground">{runsLeft} more time{runsLeft > 1 ? "s" : ""}</span> over 7 days to unlock the visibility trend chart.
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(runs.length / 2) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendChart({ runs }: { runs: RunData[] }) {
  const chartData = runs.map(r => ({ date: formatDate(r.date), visibility: r.visibility }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
        />
        <Line
          type="monotone"
          dataKey="visibility"
          stroke="#3B5BDB"
          strokeWidth={2.5}
          dot={{ fill: "#3B5BDB", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function VisibilityWidget({ runs }: { runs: RunData[] }) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <p className="text-3xl font-bold text-muted-foreground">—</p>
        <p className="text-xs text-muted-foreground">Insufficient data — run a tracking job</p>
      </div>
    )
  }

  return hasEnoughForChart(runs) ? <TrendChart runs={runs} /> : <Scorecard runs={runs} />
}
