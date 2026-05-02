"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Response {
  id: string
  response_text: string
  requested_model: string
  provider: string
  created_at: string
  latency_ms: number
  prompts: { text: string } | null
}

function getModelColor(model: string) {
  if (model.toLowerCase().includes("gpt")) return "bg-emerald-100 text-emerald-700"
  if (model.toLowerCase().includes("claude")) return "bg-orange-100 text-orange-700"
  if (model.toLowerCase().includes("gemini")) return "bg-blue-100 text-blue-700"
  if (model.toLowerCase().includes("sonar") || model.toLowerCase().includes("perplexity")) return "bg-purple-100 text-purple-700"
  return "bg-muted text-muted-foreground"
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function ResponseRow({ response }: { response: Response }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden transition-all", open && "shadow-sm")}>
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0", getModelColor(response.requested_model))}>
          {response.requested_model}
        </span>
        <span className="flex-1 truncate text-sm text-card-foreground">
          {response.prompts?.text || "—"}
        </span>
        <span className="flex-shrink-0 text-xs text-muted-foreground">{formatTime(response.created_at)}</span>
        <span className="flex-shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-border bg-muted/20 px-4 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prompt</p>
              <p className="mt-1 text-sm text-card-foreground">{response.prompts?.text || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Model</p>
              <p className="mt-1 text-sm text-card-foreground">{response.requested_model}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latency</p>
              <p className="mt-1 text-sm text-card-foreground">{response.latency_ms ? `${(response.latency_ms / 1000).toFixed(1)}s` : "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Response</p>
            <p className="text-sm text-card-foreground leading-relaxed whitespace-pre-wrap">{response.response_text}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface ResponseFeedProps {
  responses: Response[]
}

export function ResponseFeed({ responses }: ResponseFeedProps) {
  if (responses.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No responses yet. Run a tracking job to see results.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LLM Responses</h3>
        <span className="text-xs text-muted-foreground">{responses.length} responses</span>
      </div>
      <div className="flex flex-col gap-2">
        {responses.map(r => <ResponseRow key={r.id} response={r} />)}
      </div>
    </div>
  )
}
