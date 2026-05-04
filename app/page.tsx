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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="#how-it-works" style={{ fontSize: 13, color: "#374151", textDecoration: "none", fontWeight: 500 }}>How it works</a>
          <a href="#pricing" style={{ fontSize: 13, color: "#374151", textDecoration: "none", fontWeight: 500 }}>Pricing</a>
          <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
          <button onClick={() => setModal("login")} style={{ padding: "6px 16px", borderRadius: 7, fontSize: 13, color: "#374151", background: "transparent", border: "1px solid #e5e7eb", cursor: "pointer", fontWeight: 500 }}>
            Sign in
          </button>
          <button onClick={() => setModal("signup")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 7, background: "#3B5BDB", color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
            Sign up <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* Hero split layout */}
      <section style={{ padding: "72px 5% 64px", maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#eef1fd", border: "1px solid #c5d0f5", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B5BDB", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.06em", textTransform: "uppercase" }}>AI search visibility platform</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px,4vw,62px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20, color: "#111827" }}>
            See where you stand.<br />
            Understand why.<br />
            <span style={{ color: "#3B5BDB" }}>Fix it today.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#6b7280", marginBottom: 36, lineHeight: 1.7, maxWidth: 480 }}>
            Your buyers are asking ChatGPT, Perplexity and Gemini which tool to use. Are you showing up? GeoIntel tells you exactly where you stand, why competitors rank above you, and gives you copy-paste fixes to change that.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <button onClick={() => setModal("signup")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 32px", borderRadius: 10, background: "#3B5BDB", color: "white", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer" }}>
              Start free audit <ArrowRight size={16} />
            </button>
            <button onClick={() => setModal("login")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 24px", borderRadius: 10, background: "white", color: "#374151", fontWeight: 500, fontSize: 16, border: "1px solid #e5e7eb", cursor: "pointer" }}>
              Sign in
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Tracking across</span>
            {["ChatGPT", "Perplexity", "Gemini", "Claude"].map(l => (
              <span key={l} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "white", border: "1px solid #e5e7eb", color: "#374151" }}>{l}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <svg width="180" height="180" viewBox="0 0 56 56" style={{ animation: "float 3s ease-in-out infinite" }}>
            <rect x="12" y="22" width="32" height="28" rx="8" fill="#eef1fd" stroke="#3B5BDB" strokeWidth="1.5"/>
            <circle cx="21" cy="33" r="4" fill="white"/><circle cx="35" cy="33" r="4" fill="white"/>
            <circle cx="21" cy="33" r="2" fill="#3B5BDB"/><circle cx="35" cy="33" r="2" fill="#3B5BDB"/>
            <path d="M22 41 Q28 46 34 41" fill="none" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="28" y1="22" x2="28" y2="12" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
            <ellipse cx="28" cy="10" rx="7" ry="4" fill="none" stroke="#3B5BDB" strokeWidth="1.5" style={{ transformOrigin: "28px 10px", animation: "spin 3s linear infinite" }}/>
            <rect x="4" y="28" width="8" height="4" rx="2" fill="#eef1fd" stroke="#3B5BDB" strokeWidth="1"/>
            <rect x="44" y="28" width="8" height="4" rx="2" fill="#eef1fd" stroke="#3B5BDB" strokeWidth="1"/>
            <rect x="18" y="37" width="20" height="8" rx="3" fill="rgba(59,91,219,0.1)" stroke="#3B5BDB" strokeWidth="0.5"/>
            <text x="28" y="43.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="#3B5BDB" fontFamily="monospace">GEO</text>
          </svg>
          <style>{"@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
          {/* Dark dashboard mockup */}
          <div style={{ background: "#0f1117", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", width: "100%" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#f0eff8", margin: 0 }}>AI Visibility Dashboard</p>
                <p style={{ fontSize: 10, color: "#5e5c78", margin: "2px 0 0" }}>Last run 3h ago</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#34d399" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />Live
              </div>
            </div>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              {[
                { label: "VISIBILITY", value: "24%", color: "#fbbf24" },
                { label: "RANK", value: "#4", color: "#60a5fa" },
                { label: "GEO SCORE", value: "42", color: "#f87171" },
              ].map(k => (
                <div key={k.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 10px", textAlign: "center" }}>
                  <p style={{ fontSize: 9, color: "#5e5c78", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>{k.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: k.color, margin: 0, lineHeight: 1 }}>{k.value}</p>
                </div>
              ))}
            </div>
            {/* Share of voice */}
            <p style={{ fontSize: 9, color: "#5e5c78", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Share of Voice</p>
            {[
              { name: "Competitor A", pct: 68, color: "#3b82f6" },
              { name: "You", pct: 24, color: "#2dd4bf", you: true },
              { name: "Competitor B", pct: 41, color: "#8b5cf6" },
            ].map(r => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: r.you ? "#2dd4bf" : "#9896b0", width: 72, flexShrink: 0, fontWeight: r.you ? 600 : 400 }}>{r.name}{r.you ? " ★" : ""}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.pct}%`, background: r.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 10, color: r.color, fontWeight: 600, width: 28, textAlign: "right" }}>{r.pct}%</span>
              </div>
            ))}
            {/* Recommendation */}
            <div style={{ marginTop: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderLeft: "3px solid #f87171", borderRadius: "0 8px 8px 0", padding: "10px 12px" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.15)", padding: "2px 6px", borderRadius: 4 }}>Critical</span>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#f0eff8", margin: "4px 0 2px" }}>Add FAQPage schema</p>
              <p style={{ fontSize: 10, color: "#5e5c78", margin: 0 }}>Copy-paste fix ready to implement</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — horizontal steps */}
      <section id="how-it-works" style={{ padding: "0 5% 56px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>How it works</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>From invisible to cited — in one afternoon</h2>
        </div>
        <div style={{ display: "flex", gap: 0, position: "relative" }}>
          {/* connecting line */}
          <div style={{ position: "absolute", top: 20, left: "12.5%", right: "12.5%", height: 1, background: "#e5e7eb", zIndex: 0 }} />
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 20px", position: "relative", zIndex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3B5BDB", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, marginBottom: 16, flexShrink: 0, border: "3px solid white", boxShadow: "0 0 0 1px #e5e7eb" }}>{s.n}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features — alternating list layout */}
      <section style={{ padding: "0 5% 56px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#3B5BDB", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Features</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>Everything you need to win AI search</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={f.title} style={{ display: "flex", gap: 16, padding: "20px 24px", background: i % 2 === 0 ? "white" : "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 0, ...(i === 0 ? { borderRadius: "12px 0 0 0" } : i === 1 ? { borderRadius: "0 12px 0 0" } : i === 2 ? { borderRadius: "0 0 0 12px" } : { borderRadius: "0 0 12px 0" }) }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eef1fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} color="#3B5BDB" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{f.body}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "0 32px 64px", maxWidth: 620, margin: "0 auto" }}>
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
