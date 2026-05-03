"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, TrendingUp, Zap, BarChart3, Search, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

const STEPS = [
  { n: "01", title: "Set up in 2 minutes", body: "Enter your domain, pick your vertical, choose the prompts your buyers ask AI engines. We auto-suggest them." },
  { n: "02", title: "See your real ranking", body: "We query ChatGPT, Perplexity, Gemini and Claude on your behalf. Your dashboard populates with real data in ~60 seconds." },
  { n: "03", title: "Audit runs automatically", body: "Once your first results land, a GEO audit fires — checking schema, content, crawlability and authority signals." },
  { n: "04", title: "Fix it today", body: "Every finding comes with a copy-paste fix. Schema JSON-LD, content rewrites, comparison page briefs. No guessing." },
]

const FEATURES = [
  { icon: BarChart3, title: "Real visibility tracking", body: "Daily queries across ChatGPT, Perplexity, Gemini and Claude. See exactly where you rank vs competitors." },
  { icon: Search, title: "GEO audit", body: "25+ factors checked automatically — schema, AI crawlability, authority signals, content structure." },
  { icon: Zap, title: "Fix generator", body: "Click any finding and get copy-paste ready code and content to fix it immediately." },
  { icon: TrendingUp, title: "Competitor comparison", body: "See exactly what competitors are doing that you're not — and close the gap." },
]

function RadarMascot() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="72" height="72" viewBox="0 0 56 56" style={{ animation: "float 3s ease-in-out infinite" }}>
        <rect x="12" y="22" width="32" height="28" rx="8" fill="#f0f4ff" stroke="#3B5BDB" strokeWidth="1.5"/>
        <circle cx="21" cy="33" r="4" fill="white"/>
        <circle cx="35" cy="33" r="4" fill="white"/>
        <circle cx="21" cy="33" r="2" fill="#3B5BDB"/>
        <circle cx="35" cy="33" r="2" fill="#3B5BDB"/>
        <path d="M22 41 Q28 46 34 41" fill="none" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="28" y1="22" x2="28" y2="12" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
        <ellipse cx="28" cy="10" rx="7" ry="4" fill="none" stroke="#3B5BDB" strokeWidth="1.5" style={{ transformOrigin: "28px 10px", animation: "spin 3s linear infinite" }}/>
        <rect x="4" y="28" width="8" height="4" rx="2" fill="#f0f4ff" stroke="#3B5BDB" strokeWidth="1"/>
        <rect x="44" y="28" width="8" height="4" rx="2" fill="#f0f4ff" stroke="#3B5BDB" strokeWidth="1"/>
        <rect x="18" y="37" width="20" height="8" rx="3" fill="rgba(59,91,219,0.1)" stroke="#3B5BDB" strokeWidth="0.5"/>
        <text x="28" y="43.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="#3B5BDB" fontFamily="monospace">GEO</text>
      </svg>
      <div style={{ background: "#f0f4ff", border: "1px solid #c5d0f5", borderRadius: "12px 12px 12px 0", padding: "8px 14px", fontSize: 12, color: "#3B5BDB", fontWeight: 500, whiteSpace: "nowrap" }}>
        Hi! I'll scan your AI visibility 📡
      </div>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

function AuthModal({ mode, onClose }: { mode: "login" | "signup"; onClose: () => void }) {
  const [currentMode, setCurrentMode] = useState(mode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (currentMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
        if (error) throw error
        if (data.user && !data.session) { setCheckEmail(true); return }
        router.push("/setup")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: 32, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        {checkEmail ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{currentMode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>{currentMode === "signup" ? "Start tracking your AI visibility" : "Sign in to your dashboard"}</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {currentMode === "signup" && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
              {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ padding: "11px", borderRadius: 8, background: "#3B5BDB", color: "white", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Please wait…" : currentMode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6b7280" }}>
              {currentMode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setCurrentMode(currentMode === "signup" ? "login" : "signup")} style={{ color: "#3B5BDB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
                {currentMode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [modal, setModal] = useState<"login" | "signup" | null>(null)

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", color: "#1a1a1a" }}>
      {modal && <AuthModal mode={modal} onClose={() => setModal(null)} />}

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#eef1fd", border: "1px solid #c5d0f5", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#3B5BDB" }}>G</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: "#1a1a1a" }}>GeoIntel</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setModal("login")} style={{ padding: "6px 16px", borderRadius: 7, fontSize: 13, color: "#374151", background: "transparent", border: "1px solid #e5e7eb", cursor: "pointer", fontWeight: 500 }}>
            Sign in
          </button>
          <button onClick={() => setModal("signup")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 7, background: "#3B5BDB", color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
            Sign up <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "64px 32px 56px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#eef1fd", border: "1px solid #c5d0f5", marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B5BDB", display: "inline-block" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.06em", textTransform: "uppercase" }}>AI search visibility platform</span>
        </div>

        {/* Radar in hero */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <RadarMascot />
        </div>

        <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 18, color: "#111827" }}>
          See where you stand.<br />
          Understand why.<br />
          <span style={{ color: "#3B5BDB" }}>Fix it today.</span>
        </h1>
        <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.7 }}>
          GeoIntel tracks how your brand appears across ChatGPT, Perplexity, Gemini and Claude — then tells you exactly what to fix and gives you the code to do it.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setModal("signup")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 28px", borderRadius: 9, background: "#3B5BDB", color: "white", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
            Start free audit <ArrowRight size={15} />
          </button>
          <button onClick={() => setModal("login")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", borderRadius: 9, background: "white", color: "#374151", fontWeight: 500, fontSize: 15, border: "1px solid #e5e7eb", cursor: "pointer" }}>
            Sign in
          </button>
        </div>

        {/* Hero Visual */}
        <div style={{ margin: "40px auto 0", maxWidth: 900, width: "100%" }}>
          <svg width="100%" viewBox="0 0 900 460" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.07))" }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </marker>
            </defs>

            {/* Background dots */}
            <g opacity="0.08">
              <circle cx="80" cy="100" r="1.5" fill="#888"/><circle cx="160" cy="100" r="1.5" fill="#888"/><circle cx="240" cy="100" r="1.5" fill="#888"/>
              <circle cx="80" cy="180" r="1.5" fill="#888"/><circle cx="160" cy="180" r="1.5" fill="#888"/><circle cx="240" cy="180" r="1.5" fill="#888"/>
              <circle cx="80" cy="260" r="1.5" fill="#888"/><circle cx="160" cy="260" r="1.5" fill="#888"/><circle cx="240" cy="260" r="1.5" fill="#888"/>
              <circle cx="80" cy="340" r="1.5" fill="#888"/><circle cx="160" cy="340" r="1.5" fill="#888"/><circle cx="240" cy="340" r="1.5" fill="#888"/>
              <circle cx="660" cy="100" r="1.5" fill="#888"/><circle cx="740" cy="100" r="1.5" fill="#888"/><circle cx="820" cy="100" r="1.5" fill="#888"/>
              <circle cx="660" cy="180" r="1.5" fill="#888"/><circle cx="820" cy="180" r="1.5" fill="#888"/>
              <circle cx="660" cy="340" r="1.5" fill="#888"/><circle cx="820" cy="340" r="1.5" fill="#888"/>
            </g>

            {/* Connection lines — AI engines to brand */}
            <path d="M 202 118 C 290 118 310 210 368 228" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow)" opacity="0.6"/>
            <path d="M 202 198 C 295 198 318 220 368 232" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow)" opacity="0.6"/>
            <path d="M 202 278 C 295 278 318 250 368 242" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow)" opacity="0.6"/>
            <path d="M 202 358 C 290 358 310 265 368 248" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow)" opacity="0.6"/>

            {/* Brand to GeoIntel */}
            <path d="M 468 238 C 510 238 525 238 548 238" fill="none" stroke="#2dd4bf" strokeWidth="2.5" markerEnd="url(#arrow)"/>

            {/* AI Engine chips */}
            <rect x="62" y="94" width="140" height="48" rx="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="1"/>
            <text x="132" y="122" textAnchor="middle" fontSize="14" fontWeight="600" fill="#065f46" fontFamily="system-ui,sans-serif">ChatGPT</text>

            <rect x="62" y="174" width="140" height="48" rx="10" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1"/>
            <text x="132" y="202" textAnchor="middle" fontSize="14" fontWeight="600" fill="#4c1d95" fontFamily="system-ui,sans-serif">Perplexity</text>

            <rect x="62" y="254" width="140" height="48" rx="10" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1"/>
            <text x="132" y="282" textAnchor="middle" fontSize="14" fontWeight="600" fill="#1e3a8a" fontFamily="system-ui,sans-serif">Gemini</text>

            <rect x="62" y="334" width="140" height="48" rx="10" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1"/>
            <text x="132" y="362" textAnchor="middle" fontSize="14" fontWeight="600" fill="#78350f" fontFamily="system-ui,sans-serif">Claude</text>

            {/* Your Brand node */}
            <rect x="368" y="204" width="100" height="68" rx="14" fill="white" stroke="#2dd4bf" strokeWidth="2.5"/>
            <text x="418" y="232" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f766e" fontFamily="system-ui,sans-serif">Your</text>
            <text x="418" y="250" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f766e" fontFamily="system-ui,sans-serif">Brand</text>
            <circle cx="418" cy="264" r="3.5" fill="#2dd4bf"/>

            {/* GeoIntel panel — wide */}
            <rect x="548" y="60" width="312" height="350" rx="16" fill="white" stroke="#e5e7eb" strokeWidth="1"/>

            {/* Panel header */}
            <rect x="548" y="60" width="312" height="44" rx="16" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1"/>
            <rect x="548" y="80" width="312" height="24" fill="#f9fafb"/>
            <circle cx="570" cy="82" r="5" fill="#2dd4bf"/>
            <text x="582" y="87" fontSize="13" fontWeight="600" fill="#111827" fontFamily="system-ui,sans-serif">GeoIntel</text>
            <circle cx="846" cy="81" r="4" fill="#10b981"/>
            <text x="840" y="86" textAnchor="end" fontSize="11" fill="#10b981" fontFamily="system-ui,sans-serif">Live</text>

            {/* KPI row */}
            <rect x="564" y="118" width="86" height="58" rx="10" fill="#fefce8" stroke="#fef08a" strokeWidth="1"/>
            <text x="607" y="138" textAnchor="middle" fontSize="10" fill="#a16207" fontFamily="system-ui,sans-serif" letterSpacing="0.04em">VISIBILITY</text>
            <text x="607" y="162" textAnchor="middle" fontSize="24" fontWeight="700" fill="#d97706" fontFamily="system-ui,sans-serif">24%</text>

            <rect x="660" y="118" width="86" height="58" rx="10" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1"/>
            <text x="703" y="138" textAnchor="middle" fontSize="10" fill="#166534" fontFamily="system-ui,sans-serif" letterSpacing="0.04em">RANK</text>
            <text x="703" y="162" textAnchor="middle" fontSize="24" fontWeight="700" fill="#16a34a" fontFamily="system-ui,sans-serif">#3</text>

            <rect x="756" y="118" width="86" height="58" rx="10" fill="#fef2f2" stroke="#fecaca" strokeWidth="1"/>
            <text x="799" y="138" textAnchor="middle" fontSize="10" fill="#991b1b" fontFamily="system-ui,sans-serif" letterSpacing="0.04em">GEO SCORE</text>
            <text x="799" y="162" textAnchor="middle" fontSize="24" fontWeight="700" fill="#dc2626" fontFamily="system-ui,sans-serif">42</text>

            {/* Divider */}
            <line x1="564" y1="190" x2="844" y2="190" stroke="#f3f4f6" strokeWidth="1"/>

            {/* Share of voice */}
            <text x="564" y="210" fontSize="10" fill="#9ca3af" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">SHARE OF VOICE</text>

            <text x="564" y="230" fontSize="12" fill="#6b7280" fontFamily="system-ui,sans-serif">Competitor A</text>
            <rect x="664" y="220" width="160" height="8" rx="4" fill="#f3f4f6"/>
            <rect x="664" y="220" width="118" height="8" rx="4" fill="#3b82f6" opacity="0.6"/>
            <text x="830" y="229" textAnchor="end" fontSize="11" fill="#6b7280" fontFamily="system-ui,sans-serif">68%</text>

            <text x="564" y="252" fontSize="12" fontWeight="600" fill="#0f766e" fontFamily="system-ui,sans-serif">You ★</text>
            <rect x="664" y="242" width="160" height="8" rx="4" fill="#f3f4f6"/>
            <rect x="664" y="242" width="38" height="8" rx="4" fill="#2dd4bf"/>
            <text x="830" y="251" textAnchor="end" fontSize="11" fontWeight="600" fill="#0f766e" fontFamily="system-ui,sans-serif">24%</text>

            <text x="564" y="274" fontSize="12" fill="#6b7280" fontFamily="system-ui,sans-serif">Competitor B</text>
            <rect x="664" y="264" width="160" height="8" rx="4" fill="#f3f4f6"/>
            <rect x="664" y="264" width="68" height="8" rx="4" fill="#8b5cf6" opacity="0.6"/>
            <text x="830" y="273" textAnchor="end" fontSize="11" fill="#6b7280" fontFamily="system-ui,sans-serif">41%</text>

            {/* Divider */}
            <line x1="564" y1="288" x2="844" y2="288" stroke="#f3f4f6" strokeWidth="1"/>

            {/* Recommendation */}
            <text x="564" y="308" fontSize="10" fill="#9ca3af" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">TOP FIX</text>
            <rect x="564" y="316" width="276" height="62" rx="8" fill="#fef2f2" stroke="#fecaca" strokeWidth="1"/>
            <rect x="564" y="316" width="4" height="62" rx="2" fill="#ef4444"/>
            <rect x="576" y="324" width="46" height="15" rx="4" fill="#fee2e2"/>
            <text x="599" y="335" textAnchor="middle" fontSize="10" fontWeight="600" fill="#b91c1c" fontFamily="system-ui,sans-serif">Critical</text>
            <text x="576" y="354" fontSize="12" fontWeight="600" fill="#111827" fontFamily="system-ui,sans-serif">Add FAQPage schema to product pages</text>
            <text x="576" y="371" fontSize="11" fill="#6b7280" fontFamily="system-ui,sans-serif">Copy-paste JSON-LD fix ready to implement</text>
          </svg>
      </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "0 32px 64px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>How it works</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>From invisible to cited — in one afternoon</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3B5BDB", letterSpacing: "0.08em", marginBottom: 8 }}>{s.n}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "0 32px 64px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Features</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>Everything you need to win AI search</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eef1fd", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <Icon size={15} color="#3B5BDB" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{f.body}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "0 32px 64px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Pricing</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>Simple and honest</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Free</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "#111827", marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 18 }}>forever</div>
            {["3 audits per month", "Basic visibility report", "Fix generator (3 uses)", "1 competitor tracked"].map(f => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
                <Check size={12} color="#10b981" />
                <span style={{ fontSize: 13, color: "#6b7280" }}>{f}</span>
              </div>
            ))}
            <button onClick={() => setModal("signup")} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 18, padding: "9px", borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Get started free</button>
          </div>
          <div style={{ background: "#eef1fd", border: "1px solid #c5d0f5", borderRadius: 14, padding: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: -10, right: 14, padding: "2px 10px", borderRadius: 20, background: "#3B5BDB", color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Beta pricing</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#3B5BDB", marginBottom: 8 }}>Pro</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "#111827", marginBottom: 4 }}>$15</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 18 }}>per month · price goes up at launch</div>
            {["Unlimited audits", "All 4 AI engines", "Full fix generator", "5 competitors tracked", "AI prompt research", "Daily re-scans"].map(f => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
                <Check size={12} color="#3B5BDB" />
                <span style={{ fontSize: 13, color: "#374151" }}>{f}</span>
              </div>
            ))}
            <button onClick={() => setModal("signup")} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 18, padding: "9px", borderRadius: 8, background: "#3B5BDB", color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>Lock in $15 →</button>
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#9ca3af" }}>No credit card required to start</p>
      </section>

      {/* CTA */}
      <section style={{ padding: "48px 32px", textAlign: "center", borderTop: "1px solid #e5e7eb", background: "white" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827", marginBottom: 10 }}>Find out where you stand — free</h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>Setup takes 2 minutes. First results in 60 seconds.</p>
        <button onClick={() => setModal("signup")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 32px", borderRadius: 10, background: "#3B5BDB", color: "white", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
          Run your free audit <ArrowRight size={15} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>GeoIntel</span>
        <div style={{ display: "flex", gap: 20 }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: "#9ca3af" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
