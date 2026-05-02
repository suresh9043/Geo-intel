"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Radio, ArrowRight, TrendingUp, Zap, BarChart3, Search, Check, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

const STATS = [{ value:"4", label:"AI engines tracked" },{ value:"60s", label:"First results" },{ value:"5", label:"Audit dimensions" },{ value:"$15", label:"Per month" }]
const STEPS = [{ n:"01", title:"Set up in 2 minutes", body:"Enter your domain, pick your vertical, choose the prompts your buyers ask AI engines. We auto-suggest them." },{ n:"02", title:"See your real ranking", body:"We query ChatGPT, Perplexity, Gemini and Claude on your behalf. Your dashboard populates with real data in ~60 seconds." },{ n:"03", title:"Audit runs automatically", body:"Once your first results land, a GEO audit fires — checking schema, content, crawlability and authority signals." },{ n:"04", title:"Fix it today", body:"Every finding comes with a copy-paste fix. Schema JSON-LD, content rewrites, comparison page briefs. No guessing." }]
const FEATURES = [{ icon:BarChart3, title:"Real visibility tracking", body:"Daily queries across ChatGPT, Perplexity, Gemini and Claude. See exactly where you rank vs competitors." },{ icon:Search, title:"GEO audit", body:"25+ factors checked automatically — schema, AI crawlability, authority signals, content structure." },{ icon:Zap, title:"Fix generator", body:"The thing Otterly doesn't have. Click any finding and get copy-paste ready code and content to fix it." },{ icon:TrendingUp, title:"Competitor comparison", body:"See exactly what competitors are doing that you're not — and close the gap." }]
const LOGOS = ["ChatGPT","Perplexity","Gemini","Claude"]

function AuthModal({ mode: initialMode, onClose }: { mode: "login" | "signup", onClose: () => void }) {
  const [mode, setMode] = useState(initialMode)
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
        // If no session, email confirmation is required
        if (!data.session) { setCheckEmail(true); return }
        router.push("/dashboard")
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

  const switchMode = () => { setMode(m => m === "login" ? "signup" : "login"); setError("") }

  return (
    // Backdrop
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      {/* Modal card */}
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:400, background:"#13131a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:32, position:"relative" }}>
        {/* Close */}
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:4 }}>
          <X size={18} />
        </button>

        {/* Check email confirmation screen */}
        {checkEmail && (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", marginBottom:10 }}>Check your email</h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", lineHeight:1.6, marginBottom:24 }}>
              We sent a confirmation link to <span style={{ color:"#2DD4BF", fontWeight:600 }}>{email}</span>. Click the link to activate your account and sign in.
            </p>
            <button onClick={onClose} style={{ padding:"10px 24px", borderRadius:8, background:"#2DD4BF", color:"#0a0a0f", fontWeight:700, fontSize:14, border:"none", cursor:"pointer" }}>
              Got it
            </button>
          </div>
        )}

        {!checkEmail && <div style={{ marginBottom:24, textAlign:"center" }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", marginBottom:6 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>
            {mode === "login" ? "Sign in to your GeoIntel account" : "Start tracking your AI visibility"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:13 }}>
          {mode === "signup" && (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.05em", textTransform:"uppercase" }}>Name</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required style={inputStyle} />
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.05em", textTransform:"uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required style={inputStyle} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.05em", textTransform:"uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"} required style={inputStyle} />
          </div>

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", fontSize:13, color:"#f87171" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", borderRadius:9, background:"#2DD4BF", color:"#0a0a0f", fontWeight:700, fontSize:14, border:"none", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, marginTop:4 }}>
            {loading
              ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Please wait...</>
              : <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={15} /></>
            }
          </button>
        </form>

        <p style={{ marginTop:20, textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.35)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={switchMode} style={{ background:"none", border:"none", color:"#2DD4BF", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
        </div>}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } input::placeholder{color:rgba(255,255,255,0.2)} input:focus{outline:none;border-color:#2DD4BF!important}`}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", fontSize:14, width:"100%", boxSizing:"border-box" }

export default function LandingPage() {
  const [modal, setModal] = useState<"login"|"signup"|null>(null)

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)" }}>
      {modal && <AuthModal mode={modal} onClose={() => setModal(null)} />}

      <nav style={{ position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", height:56, background:"rgba(10,10,15,0.88)", backdropFilter:"blur(12px)", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"var(--accent-dim)", border:"1px solid var(--accent)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Radio size={13} color="var(--accent)" /></div>
          <span style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.03em" }}>GeoIntel</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setModal("login")} style={{ padding:"6px 14px", borderRadius:7, fontSize:13, color:"var(--text-2)", background:"none", border:"1px solid var(--border)", cursor:"pointer" }}>Sign in</button>
          <button onClick={() => setModal("signup")} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 16px", borderRadius:7, background:"var(--accent)", color:"#0a0a0f", fontWeight:600, fontSize:13, border:"none", cursor:"pointer" }}>Sign up <ArrowRight size={13} /></button>
        </div>
      </nav>

      <section style={{ padding:"80px 32px 64px", maxWidth:960, margin:"0 auto", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:"var(--accent-dim)", border:"1px solid rgba(45,212,191,0.3)", marginBottom:28 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block", animation:"pulse-dot 2s ease-in-out infinite" }} />
          <span style={{ fontSize:11, fontWeight:600, color:"var(--accent)", letterSpacing:"0.06em", textTransform:"uppercase" }}>AI search visibility platform</span>
        </div>
        <h1 style={{ fontSize:"clamp(36px,6vw,62px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.1, marginBottom:20 }}>See where you stand.<br />Understand why.<br /><span style={{ color:"var(--accent)" }}>Fix it today.</span></h1>
        <p style={{ fontSize:17, color:"var(--text-2)", maxWidth:540, margin:"0 auto 36px", lineHeight:1.7 }}>GeoIntel tracks how your brand appears across ChatGPT, Perplexity, Gemini and Claude — then tells you exactly what to fix and gives you the code to do it.</p>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={() => setModal("signup")} style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 28px", borderRadius:9, background:"var(--accent)", color:"#0a0a0f", fontWeight:700, fontSize:15, border:"none", cursor:"pointer" }}>Start free audit <ArrowRight size={15} /></button>
          <Link href="/dashboard" style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 24px", borderRadius:9, background:"var(--bg-2)", color:"var(--text-2)", fontWeight:500, fontSize:15, border:"1px solid var(--border)" }}>View demo</Link>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center", marginTop:36 }}>
          <span style={{ fontSize:11, color:"var(--text-3)" }}>Tracking across</span>
          {LOGOS.map(l=><span key={l} style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:500, background:"var(--bg-3)", border:"1px solid var(--border)", color:"var(--text-2)" }}>{l}</span>)}
        </div>
      </section>

      <div style={{ borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", background:"var(--bg-2)", padding:"24px 32px" }}>
        <div style={{ maxWidth:680, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {STATS.map((s,i)=><div key={s.label} style={{ textAlign:"center", padding:"0 24px", borderRight:i<STATS.length-1?"1px solid var(--border)":"none" }}><div style={{ fontSize:28, fontWeight:800, color:"var(--accent)", letterSpacing:"-0.04em", lineHeight:1 }}>{s.value}</div><div style={{ fontSize:11, color:"var(--text-3)", marginTop:4 }}>{s.label}</div></div>)}
        </div>
      </div>

      <section style={{ padding:"72px 32px", maxWidth:860, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ fontSize:11, fontWeight:600, color:"var(--accent)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>How it works</div>
          <h2 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.03em" }}>From invisible to cited — in one afternoon</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {STEPS.map(s=><div key={s.n} style={{ background:"var(--bg-2)", border:"1px solid var(--border)", borderRadius:12, padding:"22px" }}><div style={{ fontSize:11, fontWeight:700, color:"var(--accent)", letterSpacing:"0.08em", marginBottom:10 }}>{s.n}</div><div style={{ fontSize:15, fontWeight:600, color:"var(--text)", marginBottom:7 }}>{s.title}</div><div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>{s.body}</div></div>)}
        </div>
      </section>

      <section style={{ padding:"0 32px 72px", maxWidth:860, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ fontSize:11, fontWeight:600, color:"var(--accent)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Features</div>
          <h2 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.03em" }}>Everything Otterly has — plus the fixes</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {FEATURES.map(f=>{ const Icon=f.icon; return <div key={f.title} style={{ background:"var(--bg-2)", border:"1px solid var(--border)", borderRadius:12, padding:"22px" }}><div style={{ width:34, height:34, borderRadius:8, background:"var(--accent-dim)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}><Icon size={16} color="var(--accent)" /></div><div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:6 }}>{f.title}</div><div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>{f.body}</div></div> })}
        </div>
      </section>

      <section style={{ padding:"0 32px 72px", maxWidth:680, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}><div style={{ fontSize:11, fontWeight:600, color:"var(--accent)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Pricing</div><h2 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.03em" }}>Simple and honest</h2></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ background:"var(--bg-2)", border:"1px solid var(--border)", borderRadius:14, padding:26 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-2)", marginBottom:10 }}>Free</div>
            <div style={{ fontSize:38, fontWeight:800, letterSpacing:"-0.04em", marginBottom:4 }}>$0</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:20 }}>forever</div>
            {["3 audits per month","Basic visibility report","Fix generator (3 uses)","1 competitor tracked"].map(f=><div key={f} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}><Check size={12} color="var(--green)" /><span style={{ fontSize:13, color:"var(--text-2)" }}>{f}</span></div>)}
            <button onClick={() => setModal("signup")} style={{ display:"block", width:"100%", textAlign:"center", marginTop:20, padding:"9px", borderRadius:8, background:"var(--bg-3)", border:"1px solid var(--border)", color:"var(--text-2)", fontWeight:600, fontSize:13, cursor:"pointer" }}>Get started free</button>
          </div>
          <div style={{ background:"var(--accent-dim)", border:"1px solid var(--accent)", borderRadius:14, padding:26, position:"relative" }}>
            <div style={{ position:"absolute", top:-10, right:14, padding:"2px 10px", borderRadius:20, background:"var(--accent)", color:"#0a0a0f", fontSize:10, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>Beta pricing</div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--accent)", marginBottom:10 }}>Pro</div>
            <div style={{ fontSize:38, fontWeight:800, letterSpacing:"-0.04em", marginBottom:4 }}>$15</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:20 }}>per month · price goes up at launch</div>
            {["Unlimited audits","All 4 AI engines","Full fix generator","5 competitors tracked","AI prompt research","Daily re-scans"].map(f=><div key={f} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}><Check size={12} color="var(--accent)" /><span style={{ fontSize:13, color:"var(--text)" }}>{f}</span></div>)}
            <button onClick={() => setModal("signup")} style={{ display:"block", width:"100%", textAlign:"center", marginTop:20, padding:"9px", borderRadius:8, background:"var(--accent)", color:"#0a0a0f", fontWeight:700, fontSize:13, border:"none", cursor:"pointer" }}>Lock in $15 →</button>
          </div>
        </div>
        <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:"var(--text-3)" }}>vs Otterly at $189–$989/month · No credit card required to start</p>
      </section>

      <section style={{ padding:"60px 32px", textAlign:"center", borderTop:"1px solid var(--border)" }}>
        <h2 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.03em", marginBottom:12 }}>Find out where you stand — free</h2>
        <p style={{ fontSize:14, color:"var(--text-2)", marginBottom:28 }}>Setup takes 2 minutes. First results in 60 seconds.</p>
        <button onClick={() => setModal("signup")} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"13px 32px", borderRadius:10, background:"var(--accent)", color:"#0a0a0f", fontWeight:700, fontSize:15, border:"none", cursor:"pointer" }}>Run your free audit <ArrowRight size={15} /></button>
      </section>

      <footer style={{ borderTop:"1px solid var(--border)", padding:"18px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}><Radio size={12} color="var(--accent)" /><span style={{ fontSize:12, color:"var(--text-3)" }}>GeoIntel</span></div>
        <div style={{ display:"flex", gap:20 }}>{[["Terms","/terms"],["Privacy","/privacy"]].map(([l,h])=><Link key={l} href={h} style={{ fontSize:12, color:"var(--text-3)" }}>{l}</Link>)}</div>
      </footer>
    </div>
  )
}
