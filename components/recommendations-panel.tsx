"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Zap, AlertCircle, TrendingUp, Shield, Search, ExternalLink } from "lucide-react"

interface RecommendationsPanelProps {
  visibility: number
  rank: number | null
  totalTracked: number
  mentionCount: number
  totalResponses: number
  topCompetitor?: { name: string; visibility: number } | null
  sentiment?: string
}

function getRecommendations(props: RecommendationsPanelProps) {
  const { visibility, rank, totalTracked, mentionCount, totalResponses, topCompetitor, sentiment } = props
  const recs: { icon: any; title: string; detail: string; action: string; href: string; priority: "critical" | "high" | "quick" }[] = []

  // Data-driven recommendations based on actual visibility data
  if (totalResponses === 0) {
    recs.push({
      icon: Search,
      title: "No tracking data yet",
      detail: "Run your first tracking job to see how AI engines mention your brand.",
      action: "Run tracking now",
      href: "#run",
      priority: "critical",
    })
  } else if (visibility === 0) {
    recs.push({
      icon: AlertCircle,
      title: "Your brand isn't appearing in AI answers",
      detail: `Out of ${totalResponses} AI responses, your brand was mentioned 0 times. This is the most urgent issue to fix.`,
      action: "Run GEO audit to find out why",
      href: "/dashboard/geo-audit",
      priority: "critical",
    })
  } else if (visibility < 30) {
    recs.push({
      icon: AlertCircle,
      title: `Low visibility — only ${visibility}% of AI answers mention you`,
      detail: `You're appearing in fewer than 1 in 3 AI responses. Your content structure likely needs improvement.`,
      action: "Run GEO audit",
      href: "/dashboard/geo-audit",
      priority: "critical",
    })
  }

  if (topCompetitor && topCompetitor.visibility > (visibility + 20)) {
    recs.push({
      icon: TrendingUp,
      title: `${topCompetitor.name} appears ${topCompetitor.visibility - visibility}% more than you`,
      detail: `They likely have FAQPage schema, stronger authority signals, and better entity definition. A GEO audit will show exactly what they're doing.`,
      action: "See competitor comparison",
      href: "/dashboard/geo-audit",
      priority: "high",
    })
  }

  if (sentiment === "negative") {
    recs.push({
      icon: AlertCircle,
      title: "Negative sentiment detected in AI answers",
      detail: "AI engines are describing your brand negatively. Your messaging and entity definition need attention.",
      action: "Fix brand positioning",
      href: "/dashboard/geo-audit",
      priority: "high",
    })
  }

  // Always show top generic GEO actions if we have room
  if (recs.length < 3) {
    recs.push({
      icon: Zap,
      title: "Add FAQPage schema to your product pages",
      detail: "FAQPage schema increases AI citation probability by 3.2×. It's the single highest-ROI GEO fix for most B2B SaaS companies.",
      action: "Get the code",
      href: "/dashboard/geo-audit",
      priority: "quick",
    })
  }

  if (recs.length < 3) {
    recs.push({
      icon: Shield,
      title: "Allow AI crawler bots in robots.txt",
      detail: "Add GPTBot, PerplexityBot and ClaudeBot to your robots.txt. Takes 15 minutes and directly improves AI crawlability.",
      action: "See how",
      href: "/dashboard/geo-audit",
      priority: "quick",
    })
  }

  if (recs.length < 3) {
    recs.push({
      icon: TrendingUp,
      title: "Add Organization schema with sameAs links",
      detail: "Link your Wikipedia, G2, LinkedIn and Gartner profiles in your Organization schema. Helps AI engines verify who you are.",
      action: "Get the code",
      href: "/dashboard/geo-audit",
      priority: "quick",
    })
  }

  return recs.slice(0, 3)
}

const PRIORITY_STYLES = {
  critical: { bg: "bg-red-50", border: "border-l-red-500", badge: "bg-red-100 text-red-700", label: "Critical" },
  high:     { bg: "bg-orange-50", border: "border-l-orange-400", badge: "bg-orange-100 text-orange-700", label: "High" },
  quick:    { bg: "bg-blue-50", border: "border-l-blue-400", badge: "bg-blue-100 text-blue-700", label: "Quick win" },
}

export function RecommendationsPanel(props: RecommendationsPanelProps) {
  const router = useRouter()
  const recs = getRecommendations(props)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-xs font-semibold text-card-foreground">Recommended Actions</h3>
          <p className="text-xs text-muted-foreground">Based on your current visibility data</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/geo-audit")}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          Full audit <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {recs.map((rec, i) => {
          const Icon = rec.icon
          const style = PRIORITY_STYLES[rec.priority]
          return (
            <div key={i} className={`rounded-lg border border-border border-l-4 ${style.border} ${style.bg} p-3`}>
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                  </div>
                  <p className="text-xs font-semibold text-card-foreground mb-0.5">{rec.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.detail}</p>
                  <button
                    onClick={() => rec.href === "#run" ? null : router.push(rec.href)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    {rec.action} <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
