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
  const [generatingCompetitors, setGeneratingCompetitors] = useState(false)
  const [error, setError] = useState("")

  // Step 1 — Company
  const [companyName, setCompanyName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [description, setDescription] = useState("")
  const [geography, setGeography] = useState("Worldwide")
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

  async function handleGenerateCompetitors() {
    setGeneratingCompetitors(true)
    try {
      const res = await fetch("/api/generate-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, description, industry: vertical, geography }),
      })
      const data = await res.json()
      if (data.competitors?.length) {
        setCompetitors(data.competitors.map((name: string) => ({ name, url: "" })))
      }
    } catch {}
    setGeneratingCompetitors(false)
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
        description,
        industry: vertical,
        icpDescription: geography,
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Track a New Company</h2>
            <p className="text-xs text-gray-500">Step {step + 1} of {steps.length} — {steps[step]}</p>
          </div>
          <button onClick={onSaveExit} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex px-6 pt-4 gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold border ${
                i < step ? "bg-[#3B5BDB] border-[#3B5BDB] text-white" :
                i === step ? "border-[#3B5BDB] text-[#3B5BDB] bg-blue-50" :
                "border-gray-300 text-gray-400"
              }`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-[#3B5BDB]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-72">
          {/* Step 0 — Company */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Company Name *</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Inc" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B5BDB] transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Website URL *</label>
                <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://acme.com" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B5BDB] transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Description <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your company do?" rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B5BDB] transition-all resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Geography</label>
                <select
                  value={geography}
                  onChange={e => setGeography(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B5BDB] transition-all"
                >
                  <option value="Worldwide">🌍 Worldwide</option>
                  <optgroup label="Americas">
                    <option value="United States">🇺🇸 United States</option>
                    <option value="Canada">🇨🇦 Canada</option>
                    <option value="Brazil">🇧🇷 Brazil</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="United Kingdom">🇬🇧 United Kingdom</option>
                    <option value="Germany">🇩🇪 Germany</option>
                    <option value="France">🇫🇷 France</option>
                    <option value="Netherlands">🇳🇱 Netherlands</option>
                  </optgroup>
                  <optgroup label="Asia Pacific">
                    <option value="India">🇮🇳 India</option>
                    <option value="Australia">🇦🇺 Australia</option>
                    <option value="Singapore">🇸🇬 Singapore</option>
                    <option value="Japan">🇯🇵 Japan</option>
                  </optgroup>
                  <optgroup label="Middle East">
                    <option value="UAE">🇦🇪 UAE</option>
                    <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Industry</label>
                <div className="flex flex-wrap gap-2">
                  {VERTICALS.map(v => (
                    <button key={v} onClick={() => setVertical(v)} className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${vertical === v ? "bg-[#3B5BDB] text-white border-[#3B5BDB]" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Add competitors to compare against. You can skip this and add them later.</p>
                <button
                  onClick={handleGenerateCompetitors}
                  disabled={generatingCompetitors || !companyName.trim()}
                  className="flex items-center gap-1.5 rounded-lg border border-[#3B5BDB] px-3 py-1.5 text-xs font-semibold text-[#3B5BDB] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap ml-3 flex-shrink-0"
                >
                  {generatingCompetitors ? "Generating…" : "✦ Generate"}
                </button>
              </div>
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input value={c.name} onChange={e => updateCompetitor(i, "name", e.target.value)} placeholder="Competitor name" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B5BDB]" />
                  <input value={c.url} onChange={e => updateCompetitor(i, "url", e.target.value)} placeholder="website.com" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B5BDB]" />
                  {competitors.length > 1 && (
                    <button onClick={() => removeCompetitor(i)} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
              {competitors.length < 6 && (
                <button onClick={addCompetitor} className="flex items-center gap-1.5 text-xs text-[#3B5BDB] font-medium hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add another competitor
                </button>
              )}
            </div>
          )}

          {/* Step 2 — Prompts */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500">Select prompts your buyers ask AI engines. We'll track these daily across ChatGPT, Perplexity, Gemini and Claude.</p>
              <div className="flex flex-col gap-1.5">
                {suggestedPrompts.map(p => (
                  <button key={p} onClick={() => togglePrompt(p)} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${prompts.includes(p) ? "border-[#3B5BDB] bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${prompts.includes(p) ? "bg-[#3B5BDB] border-[#3B5BDB]" : "border-gray-300"}`}>
                      {prompts.includes(p) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="text-xs text-gray-800">{p}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomPrompt()} placeholder="Add your own prompt..." className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100" />
                <button onClick={addCustomPrompt} disabled={!customPrompt.trim()} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors">Add</button>
              </div>
              {prompts.length > 0 && (
                <p className="text-xs text-[#3B5BDB] font-medium">{prompts.length} prompt{prompts.length > 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="px-6 pb-2 text-xs text-red-500">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            : <button onClick={onSaveExit} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Cancel</button>
          }
          {step < steps.length - 1
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-2 rounded-lg bg-[#3B5BDB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3451c4] disabled:opacity-50 transition-colors">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            : <button onClick={handleSubmit} disabled={loading || !canNext} className="flex items-center gap-2 rounded-lg bg-[#3B5BDB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3451c4] disabled:opacity-60 transition-colors">
                {loading ? "Starting tracking..." : "🚀 Start tracking"}
              </button>
          }
        </div>
      </div>
    </div>
  )
}
