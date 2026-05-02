"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, ArrowRight, Building2, Users, MessageSquare, Cpu, ClipboardList } from "lucide-react"

const API_BASE = "http://localhost:3000/api"

interface SetupWizardProps {
  onComplete: () => void
  onSaveExit: () => void
}

interface CompanyData {
  name: string
  url: string
  description: string
  industry: string
  icpDescription: string
  competitors: { name: string; url: string }[]
  prompts: string[]
  selectedModels: { provider: string; model: string }[]
}

interface LLMProvider {
  name: string
  models: string[]
}

const STEPS = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "ICP", icon: Users },
  { id: 3, label: "Competitors", icon: Users },
  { id: 4, label: "Prompts", icon: MessageSquare },
  { id: 5, label: "Models", icon: Cpu },
  { id: 6, label: "Review", icon: ClipboardList },
]

export function SetupWizard({ onComplete, onSaveExit }: SetupWizardProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([])
  const [data, setData] = useState<CompanyData>({
    name: "", url: "", description: "", industry: "", icpDescription: "",
    competitors: [{ name: "", url: "" }],
    prompts: [""],
    selectedModels: [],
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [configRes, companyRes] = await Promise.all([
          fetch(`${API_BASE}/config`).then(r => r.json()).catch(() => ({})),
          fetch(`${API_BASE}/company`).then(r => r.json()).catch(() => ({})),
        ])
        if (configRes.availableModels) {
          setLlmProviders(Object.entries(configRes.availableModels as Record<string, string[]>).map(([name, models]) => ({ name, models })))
        }
        if (companyRes.company) {
          const c = companyRes.company
          const selectedModels: { provider: string; model: string }[] = []
          if (c.llms) Object.entries(c.llms as Record<string, string[]>).forEach(([provider, models]) => models.forEach(model => selectedModels.push({ provider, model })))
          setData({
            name: c.name || "", url: c.url || "", description: c.description || "",
            industry: c.industry || "", icpDescription: c.icpDescription || "",
            competitors: c.competitors?.length ? c.competitors.map((name: string) => ({ name, url: "" })) : [{ name: "", url: "" }],
            prompts: c.prompts?.length ? c.prompts.map((p: { text: string }) => p.text) : [""],
            selectedModels,
          })
        }
      } catch (err) {
        console.error("Failed to load config:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const update = <K extends keyof CompanyData>(key: K, value: CompanyData[K]) => setData(prev => ({ ...prev, [key]: value }))

  const canProceed = () => {
    if (step === 1) return data.name.trim() && data.url.trim()
    if (step === 4) return data.prompts.some(p => p.trim())
    if (step === 5) return data.selectedModels.length > 0
    return true
  }

  const buildPayload = () => {
    const llms: Record<string, string[]> = {}
    data.selectedModels.forEach(({ provider, model }) => { if (!llms[provider]) llms[provider] = []; llms[provider].push(model) })
    return {
      company: {
        name: data.name, url: data.url, description: data.description,
        industry: data.industry, icpDescription: data.icpDescription,
        competitors: data.competitors.filter(c => c.name.trim()).map(c => c.name),
        prompts: data.prompts.filter(p => p.trim()).map(text => ({ text, source: "user" })),
        llms,
      },
      step: 6,
    }
  }

  const handleSubmit = async () => {
    if (!canProceed()) return
    setIsSubmitting(true)
    try {
      const saveRes = await fetch(`${API_BASE}/company`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) })
      if (!saveRes.ok) throw new Error("Failed to save company data")
      const trackRes = await fetch(`${API_BASE}/track/start`, { method: "POST" })
      const trackData = await trackRes.json()
      if (!trackData.success) throw new Error(trackData.error || "Failed to start tracking")
      onComplete()
    } catch (err) {
      console.error("Submit failed:", err)
      setIsSubmitting(false)
    }
  }

  const handleSaveExit = async () => {
    try {
      await fetch(`${API_BASE}/company`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) })
    } catch {}
    onSaveExit()
  }

  if (isLoading) return (
    <div className="flex h-full items-center justify-center gap-3 py-20">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  )

  if (isSubmitting) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-20">
      <div className="rounded-full bg-primary/10 p-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      <p className="text-base font-semibold text-card-foreground">Setting up your tracking...</p>
      <p className="text-sm text-muted-foreground">Configuring your first run</p>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold text-card-foreground">Track a New Company</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
        {/* Step indicators */}
        <div className="mt-4 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  s.id === step ? "bg-primary text-primary-foreground" :
                  s.id < step ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {s.id < step ? "✓" : s.id}
              </button>
              {i < STEPS.length - 1 && <div className={`h-px w-5 ${s.id < step ? "bg-primary/40" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Step 1: Company Basics */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Company Basics</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Tell us about the brand you want to track.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-xs">Company Name *</Label>
                <Input id="name" placeholder="Acme Inc" value={data.name} onChange={e => update("name", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="url" className="text-xs">Website URL *</Label>
                <Input id="url" placeholder="https://acme.com" value={data.url} onChange={e => update("url", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="desc" className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea id="desc" placeholder="What does your company do?" value={data.description} onChange={e => update("description", e.target.value)} rows={2} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="industry" className="text-xs">Industry <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="industry" placeholder="e.g., SaaS, E-commerce, Healthcare" value={data.industry} onChange={e => update("industry", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: ICP */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Ideal Customer Profile</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Describe who your ideal customer is. This helps us generate better prompts.</p>
            </div>
            <Textarea
              placeholder="e.g., Marketing managers at mid-sized B2B SaaS companies who want to improve their AI search visibility..."
              value={data.icpDescription}
              onChange={e => update("icpDescription", e.target.value)}
              rows={6}
            />
          </div>
        )}

        {/* Step 3: Competitors */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Competitors</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Add competitors to benchmark how you compare in AI responses.</p>
            </div>
            <div className="flex flex-col gap-3">
              {data.competitors.map((competitor, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Input placeholder="Competitor name" value={competitor.name} onChange={e => { const u = [...data.competitors]; u[i].name = e.target.value; update("competitors", u) }} />
                    <Input placeholder="Website (optional)" value={competitor.url} onChange={e => { const u = [...data.competitors]; u[i].url = e.target.value; update("competitors", u) }} />
                  </div>
                  {data.competitors.length > 1 && (
                    <button onClick={() => update("competitors", data.competitors.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => update("competitors", [...data.competitors, { name: "", url: "" }])} className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add competitor
            </button>
          </div>
        )}

        {/* Step 4: Prompts */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Tracking Prompts *</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Enter the queries you want to track across AI engines.</p>
            </div>
            <div className="flex flex-col gap-3">
              {data.prompts.map((prompt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Textarea
                    placeholder={`e.g., "Best ${data.industry || "software"} tools for small businesses?"`}
                    value={prompt}
                    onChange={e => { const u = [...data.prompts]; u[i] = e.target.value; update("prompts", u) }}
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  {data.prompts.length > 1 && (
                    <button onClick={() => update("prompts", data.prompts.filter((_, j) => j !== i))} className="mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => update("prompts", [...data.prompts, ""])} className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add prompt
            </button>
          </div>
        )}

        {/* Step 5: Models */}
        {step === 5 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">AI Models to Track *</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Select which AI models you want to monitor your brand across.</p>
            </div>
            {llmProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No models available — make sure the backend is running.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {llmProviders.map(provider => (
                  <div key={provider.name} className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{provider.name}</p>
                    <div className="flex flex-col gap-2">
                      {provider.models.map(model => (
                        <label key={model} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                          <Checkbox
                            checked={data.selectedModels.some(m => m.provider === provider.name && m.model === model)}
                            onCheckedChange={() => {
                              const exists = data.selectedModels.some(m => m.provider === provider.name && m.model === model)
                              update("selectedModels", exists
                                ? data.selectedModels.filter(m => !(m.provider === provider.name && m.model === model))
                                : [...data.selectedModels, { provider: provider.name, model }]
                              )
                            }}
                          />
                          <span className="text-sm text-card-foreground">{model}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.selectedModels.length > 0 && (
              <p className="text-xs text-muted-foreground">{data.selectedModels.length} model{data.selectedModels.length !== 1 ? "s" : ""} selected</p>
            )}
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Review & Start</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Everything looks good? Hit Start Tracking to begin.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Company", value: data.name || "—", sub: data.url || "" },
                { label: "Industry", value: data.industry || "—" },
                { label: "Competitors", value: data.competitors.filter(c => c.name.trim()).map(c => c.name).join(", ") || "None" },
                { label: "ICP", value: data.icpDescription ? data.icpDescription.slice(0, 80) + (data.icpDescription.length > 80 ? "…" : "") : "—" },
                { label: "Prompts", value: `${data.prompts.filter(p => p.trim()).length} configured` },
                { label: "Models", value: data.selectedModels.length > 0 ? data.selectedModels.map(m => m.model).join(", ") : "None" },
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-card-foreground break-words">{item.value}</p>
                  {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={step === 1 ? handleSaveExit : () => setStep(s => s - 1)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          <div className="flex items-center gap-3">
            {step < 6 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Start Tracking <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
