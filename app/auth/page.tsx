"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup")
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
      if (mode === "signup") {
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
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding + value props */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#0f1117] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
            <span className="text-sm font-bold text-primary">G</span>
          </div>
          <span className="text-lg font-bold text-white">GeoIntel</span>
        </div>

        {/* Main copy */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">AI Search Visibility Platform</span>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            See where you stand.<br />
            <span className="text-primary">Fix it today.</span>
          </h1>
          <p className="text-base text-gray-400 leading-relaxed mb-8 max-w-md">
            Track how your brand appears across ChatGPT, Perplexity, Gemini and Claude. Get copy-paste fixes to improve your AI search visibility.
          </p>

          {/* Mini dashboard preview */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Visibility Dashboard</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Live</span>
              </div>
            </div>
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "Visibility", value: "24%", color: "text-amber-400", bg: "bg-amber-400/10" },
                { label: "Your Rank", value: "#4", color: "text-blue-400", bg: "bg-blue-400/10" },
                { label: "GEO Score", value: "42", color: "text-red-400", bg: "bg-red-400/10" },
              ].map(k => (
                <div key={k.label} className={`rounded-lg ${k.bg} border border-white/10 p-2.5`}>
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
            {/* Share of voice bars */}
            <div className="flex flex-col gap-1.5">
              {[
                { name: "UiPath", pct: 68, color: "bg-blue-500" },
                { name: "ServiceNow", pct: 54, color: "bg-purple-500" },
                { name: "Appian ★", pct: 24, color: "bg-primary" },
              ].map(b => (
                <div key={b.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">{b.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{b.pct}%</span>
                </div>
              ))}
            </div>
            {/* Recommendation */}
            <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 border-l-2 border-l-red-500 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Critical</span>
              </div>
              <p className="text-xs text-gray-300 font-medium">Missing FAQPage schema</p>
              <p className="text-xs text-gray-500">ChatGPT cites you in only 12% of answers</p>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex flex-col gap-2">
            {[
              "Real LLM queries tracked daily",
              "Copy-paste fixes for every finding",
              "Competitor benchmarking included",
            ].map(f => (
              <div key={f} className="flex items-center gap-2">
                <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-2.5 w-2.5 text-primary" />
                </div>
                <span className="text-xs text-gray-400">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-gray-600">© 2025 GeoIntel · Beta pricing — $15/mo</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">G</span>
            </div>
            <span className="text-base font-bold text-card-foreground">GeoIntel</span>
          </div>

          {checkEmail ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-card-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black text-card-foreground mb-1">
                  {mode === "signup" ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "signup" ? "Start tracking your AI visibility — free" : "Sign in to your GeoIntel dashboard"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === "signup" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your name</label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith" required
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" required
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"} required
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm mt-2"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</>
                    : <>{mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="h-4 w-4" /></>
                  }
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError("") }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {mode === "signup" ? "Sign in" : "Sign up free"}
                  </button>
                </p>
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <a href="/terms" className="underline hover:text-card-foreground">Terms</a>
                {" "}and{" "}
                <a href="/privacy" className="underline hover:text-card-foreground">Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
