"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Radio, ArrowRight, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0a0a0f)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: "rgba(45,212,191,0.15)", border: "1px solid #2DD4BF", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={13} color="#2DD4BF" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.03em" }}>GeoIntel</span>
        </a>
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }}
          style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer" }}
        >
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </nav>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              {mode === "login" ? "Sign in to your GeoIntel account" : "Start tracking your AI visibility"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required style={inputStyle} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={inputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"} required style={inputStyle} />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 13, color: "#f87171" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 9, background: "#2DD4BF", color: "#0a0a0f", fontWeight: 700, fontSize: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4 }}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Please wait...</>
                : <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { outline: none; border-color: #2DD4BF !important; }
      `}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
}
