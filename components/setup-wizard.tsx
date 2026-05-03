"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, ChevronRight, Check, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { saveCompany } from "@/lib/queries"

const VERTICALS = ["SaaS", "Automation", "Agency", "Ecommerce", "Other"]

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  "SaaS": [
    "What is the best project management software?",
    "Best CRM for small business",
    "Top SaaS tools for startups",
    "How to choose B2B software",
  ],
  "Automation": [
    "Best intelligent automation platform for enterprise",
    "UiPath vs Appian vs ServiceNow comparison",
    "How to automate business processes with AI",
    "Top RPA platforms for banking",
  ],
  "Agency": [
    "Best digital marketing agencies",
    "Top SEO agencies for enterprise",
    "How to choose a marketing agency",
  ],
  "Ecommerce": [
    "Best ecommerce platform for small business",
    "Shopify vs WooCommerce comparison",
    "How to start an online store",
  ],
  "Other": [
    "Best software solutions for enterprise",
    "Top platforms for digital transformation",
  ],
}

interface SetupWizardProps {
  onComplete: () => void
  onSaveExit: () => void
}

export function SetupWizard({ onComplete, onSaveExit }: SetupWizardProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Step 1 — Company
  const [companyName, setCompanyName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [vertical, setVertical] = useState("SaaS")

  // Step 2 — Competitors
  const [competitors, setCompetitors] = useState([{ name: "", url: "" }])

  // Step 3 — Prompts
  const [prompts, setPrompts] = useState<string[]>([])
  const [customPrompt, setCustomPrompt] = useState("")

  const suggestedPrompts = SUGGESTED_PROMPTS[vertical] || SUGGESTED_PROMPTS["Other"]

  function togglePrompt(p: string) {
    setPrompts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function addCompetitor() {
    setCompetitors(prev => [...prev, { name: "", url: "" }])
  }

  function removeCompetitor(i: number) {
    setCompetitors(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateCompetitor(i: number, field: "name" | "url", value: string) {
    setCompetitors(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function addCustomPrompt() {
    if (customPrompt.trim() && !prompts.includes(customPrompt.trim())) {
      setPrompts(prev => [...prev, customPrompt.trim()])
      setCustomPrompt("")
    }
  }

  async function handleSubmit() {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      await saveCompany(user.id, {
        name: companyName,
        url: websiteUrl,
        description: "",
        industry: vertical,
        icpDescription: "",
        competitors: competitors.filter(c => c.name.trim()).map(c => c.name),
        prompts,
        selectedModels: [
          { provider: "openai", model: "gpt-4o" },
          { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
          { provider: "google", model: "gemini-1.5-pro" },
          { provider: "perplexity", model: "sonar" },
        ],
      })
      onComplete()
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const steps = ["Company", "Competitors", "Prompts"]
  const canNext = step === 0 ? !!companyName.trim() && !!websiteUrl.trim() : step === 1 ? true : prompts.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Track a New Company</h2>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {steps.length} — {steps[step]}</p>
          </div>
          <button onClick={onSaveExit} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex px-6 pt-4 gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold border ${
                i < step ? "bg-primary border-primary text-primary-foreground" :
                i === step ? "border-primary text-primary bg-primary/10" :
                "border-border text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? "text-card-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-72">
          {/* Step 0 — Company */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Company Name *</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Inc" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Website URL *</label>
                <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://acme.com" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Industry</label>
                <div className="flex flex-wrap gap-2">
                  {VERTICALS.map(v => (
                    <button key={v} onClick={() => setVertical(v)} className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${vertical === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Competitors */}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">Add competitors to compare against. You can skip this and add them later.</p>
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input value={c.name} onChange={e => updateCompetitor(i, "name", e.target.value)} placeholder="Competitor name" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <input value={c.url} onChange={e => updateCompetitor(i, "url", e.target.value)} placeholder="website.com" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  {competitors.length > 1 && (
                    <button onClick={() => removeCompetitor(i)} className="rounded-lg p-2 hover:bg-muted transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              {competitors.length < 5 && (
                <button onClick={addCompetitor} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add another competitor
                </button>
              )}
            </div>
          )}

          {/* Step 2 — Prompts */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">Select prompts your buyers ask AI engines. We'll track these daily across ChatGPT, Perplexity, Gemini and Claude.</p>
              <div className="flex flex-col gap-1.5">
                {suggestedPrompts.map(p => (
                  <button key={p} onClick={() => togglePrompt(p)} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${prompts.includes(p) ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${prompts.includes(p) ? "bg-primary border-primary" : "border-border"}`}>
                      {prompts.includes(p) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-xs text-card-foreground">{p}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomPrompt()} placeholder="Add your own prompt..." className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20" />
                <button onClick={addCustomPrompt} disabled={!customPrompt.trim()} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-card-foreground hover:bg-muted disabled:opacity-50 transition-colors">Add</button>
              </div>
              {prompts.length > 0 && (
                <p className="text-xs text-primary font-medium">{prompts.length} prompt{prompts.length > 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="px-6 pb-2 text-xs text-red-500">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="text-sm text-muted-foreground hover:text-card-foreground transition-colors">← Back</button>
            : <button onClick={onSaveExit} className="text-sm text-muted-foreground hover:text-card-foreground transition-colors">Cancel</button>
          }
          {step < steps.length - 1
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            : <button onClick={handleSubmit} disabled={loading || !canNext} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {loading ? "Starting tracking..." : "🚀 Start tracking"}
              </button>
          }
        </div>
      </div>
    </div>
  )
}
