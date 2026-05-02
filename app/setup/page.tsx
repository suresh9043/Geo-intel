"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Radio, ChevronRight, Check } from "lucide-react"

const VERTICALS = ["Enterprise Automation", "B2B SaaS", "Marketing Agency", "Cybersecurity", "HR Tech", "Other"]
const AI_MODELS = ["ChatGPT", "Perplexity", "Gemini", "Claude"]
const SAMPLE_PROMPTS: Record<string, string[]> = {
  "Enterprise Automation": ["best intelligent automation platform for enterprise", "UiPath vs Appian vs Pega comparison", "how to automate business processes with AI", "top RPA platforms for banking"],
  "B2B SaaS": ["best project management software for teams", "top CRM platforms for small business", "how to choose B2B software"],
  "Marketing Agency": ["best digital marketing agencies 2024", "top SEO agencies for enterprise", "how to choose a marketing agency"],
  "Cybersecurity": ["best enterprise cybersecurity platforms", "top endpoint security solutions", "how to choose a SIEM tool"],
  "HR Tech": ["best HR software for enterprise", "top ATS platforms", "how to automate HR processes"],
  "Other": ["best software solutions for enterprise", "top platforms for digital transformation"],
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [domain, setDomain] = useState("")
  const [vertical, setVertical] = useState("")
  const [competitors, setCompetitors] = useState(["", "", ""])
  const [prompts, setPrompts] = useState<string[]>([])
  const [models, setModels] = useState<string[]>(["ChatGPT", "Perplexity", "Gemini", "Claude"])
  const [launching, setLaunching] = useState(false)

  const suggestedPrompts = SAMPLE_PROMPTS[vertical] || SAMPLE_PROMPTS["Enterprise Automation"]

  function updateCompetitor(i: number, v: string) {
    const c = [...competitors]; c[i] = v; setCompetitors(c)
  }
  function togglePrompt(p: string) {
    setPrompts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }
  function toggleModel(m: string) {
    setModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }
  function handleNext() {
    if (step === 0 && vertical) setPrompts(SAMPLE_PROMPTS[vertical] || SAMPLE_PROMPTS["Enterprise Automation"])
    setStep(s => s + 1)
  }
  async function handleLaunch() {
    setLaunching(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000"}/api/company`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, vertical, competitors: competitors.filter(Boolean), prompts, models }),
      })
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000"}/api/track/start`, { method: "POST" })
    } catch {}
    setTimeout(() => router.push("/dashboard"), 1500)
  }

  const steps = ["Company", "Prompts", "Launch"]
  const canNext = step === 0 ? !!domain && !!vertical : step === 1 ? prompts.length > 0 : true

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 34, height: 34, background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Radio size={16} color="var(--accent)" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>GeoIntel</span>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i < step ? "var(--accent)" : i === step ? "var(--accent-dim)" : "var(--bg-3)", border: i <= step ? "1px solid var(--accent)" : "1px solid var(--border)", color: i < step ? "#0a0a0f" : i === step ? "var(--accent)" : "var(--text-3)" }}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span style={{ fontSize: 12, color: i === step ? "var(--text)" : "var(--text-3)", fontWeight: i === step ? 500 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ width: 40, height: 1, background: "var(--border)", margin: "0 8px" }} />}
          </div>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 520, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 28 }}>
        {/* Step 0: Company */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.02em" }}>What's your domain?</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>We'll track how AI engines mention your brand vs competitors.</p>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. appian.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, marginBottom: 20, outline: "none" }} />
            <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Industry vertical</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
              {VERTICALS.map(v => (
                <button key={v} onClick={() => setVertical(v)} style={{ padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", background: vertical === v ? "var(--accent-dim)" : "var(--bg-3)", border: vertical === v ? "1px solid var(--accent)" : "1px solid var(--border)", color: vertical === v ? "var(--accent)" : "var(--text-2)" }}>{v}</button>
              ))}
            </div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Competitors (optional)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {competitors.map((c, i) => (
                <input key={i} value={c} onChange={e => updateCompetitor(i, e.target.value)} placeholder={`Competitor ${i + 1} domain`} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none" }} />
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Prompts */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.02em" }}>Prompts to track</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>Questions your buyers ask AI engines. Auto-suggested — edit or add your own.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {suggestedPrompts.map(p => {
                const selected = prompts.includes(p)
                return (
                  <button key={p} onClick={() => togglePrompt(p)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: selected ? "var(--accent-dim)" : "var(--bg-3)", border: selected ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <Check size={10} color="#0a0a0f" />}
                    </div>
                    <span style={{ fontSize: 12, color: selected ? "var(--accent)" : "var(--text-2)", fontWeight: selected ? 500 : 400 }}>{p}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>Track across:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {AI_MODELS.map(m => (
                <button key={m} onClick={() => toggleModel(m)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", background: models.includes(m) ? "var(--accent-dim)" : "var(--bg-3)", border: models.includes(m) ? "1px solid var(--accent)" : "1px solid var(--border)", color: models.includes(m) ? "var(--accent)" : "var(--text-2)" }}>{m}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Launch */}
        {step === 2 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-dim)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Radio size={24} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>Ready to track</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>Tracking <strong style={{ color: "var(--text)" }}>{domain}</strong> across {models.length} AI engines with {prompts.length} prompts. Results in ~2 minutes. GEO audit runs automatically once your first results land.</p>
            <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>🌐 Domain: <strong style={{ color: "var(--text)" }}>{domain}</strong></span>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>🏷 Vertical: <strong style={{ color: "var(--text)" }}>{vertical}</strong></span>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>🔍 Prompts: <strong style={{ color: "var(--text)" }}>{prompts.length} selected</strong></span>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>🤖 Models: <strong style={{ color: "var(--text)" }}>{models.join(", ")}</strong></span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} style={{ fontSize: 13, color: "var(--text-2)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
            : <div />}
          {step < 2
            ? <button onClick={handleNext} disabled={!canNext} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 8, background: canNext ? "var(--accent)" : "var(--bg-4)", border: "none", cursor: canNext ? "pointer" : "not-allowed", color: canNext ? "#0a0a0f" : "var(--text-3)", fontWeight: 600, fontSize: 13 }}>
                Continue <ChevronRight size={14} />
              </button>
            : <button onClick={handleLaunch} disabled={launching} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 24px", borderRadius: 8, background: "var(--accent)", border: "none", cursor: "pointer", color: "#0a0a0f", fontWeight: 700, fontSize: 13 }}>
                {launching ? "Launching…" : "🚀 Start tracking"}
              </button>}
        </div>
      </div>
    </div>
  )
}
