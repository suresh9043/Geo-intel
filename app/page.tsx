"use client"
import Link from "next/link"
import { Radio, ArrowRight, TrendingUp, Zap, BarChart3, Search, Check } from "lucide-react"
const STATS = [{ value:"4", label:"AI engines tracked" },{ value:"60s", label:"First results" },{ value:"5", label:"Audit dimensions" },{ value:"$15", label:"Per month" }]
const STEPS = [{ n:"01", title:"Set up in 2 minutes", body:"Enter your domain, pick your vertical, choose the prompts your buyers ask AI engines. We auto-suggest them." },{ n:"02", title:"See your real ranking", body:"We query ChatGPT, Perplexity, Gemini and Claude on your behalf. Your dashboard populates with real data in ~60 seconds." },{ n:"03", title:"Audit runs automatically", body:"Once your first results land, a GEO audit fires — checking schema, content, crawlability and authority signals." },{ n:"04", title:"Fix it today", body:"Every finding comes with a copy-paste fix. Schema JSON-LD, content rewrites, comparison page briefs. No guessing." }]
const FEATURES = [{ icon:BarChart3, title:"Real visibility tracking", body:"Daily queries across ChatGPT, Perplexity, Gemini and Claude. See exactly where you rank vs competitors." },{ icon:Search, title:"GEO audit", body:"25+ factors checked automatically — schema, AI crawlability, authority signals, content structure." },{ icon:Zap, title:"Fix generator", body:"The thing Otterly doesn't have. Click any finding and get copy-paste ready code and content to fix it." },{ icon:TrendingUp, title:"Competitor comparison", body:"See exactly what competitors are doing that you're not — and close the gap." }]
const LOGOS = ["ChatGPT","Perplexity","Gemini","Claude"]
export default function LandingPage() {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)" }}>
      <nav style={{ position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", height:56, background:"rgba(10,10,15,0.88)", backdropFilter:"blur(12px)", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"var(--accent-dim)", border:"1px solid var(--accent)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Radio size={13} color="var(--accent)" /></div>
          <span style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.03em" }}>GeoIntel</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Link href="/dashboard" style={{ padding:"6px 14px", borderRadius:7, fontSize:13, color:"var(--text-2)" }}>Sign in</Link>
          <Link href="/setup" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 16px", borderRadius:7, background:"var(--accent)", color:"#0a0a0f", fontWeight:600, fontSize:13 }}>Get started <ArrowRight size={13} /></Link>
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
          <Link href="/setup" style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 28px", borderRadius:9, background:"var(--accent)", color:"#0a0a0f", fontWeight:700, fontSize:15 }}>Start free audit <ArrowRight size={15} /></Link>
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
            <Link href="/setup" style={{ display:"block", textAlign:"center", marginTop:20, padding:"9px", borderRadius:8, background:"var(--bg-3)", border:"1px solid var(--border)", color:"var(--text-2)", fontWeight:600, fontSize:13 }}>Get started free</Link>
          </div>
          <div style={{ background:"var(--accent-dim)", border:"1px solid var(--accent)", borderRadius:14, padding:26, position:"relative" }}>
            <div style={{ position:"absolute", top:-10, right:14, padding:"2px 10px", borderRadius:20, background:"var(--accent)", color:"#0a0a0f", fontSize:10, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>Beta pricing</div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--accent)", marginBottom:10 }}>Pro</div>
            <div style={{ fontSize:38, fontWeight:800, letterSpacing:"-0.04em", marginBottom:4 }}>$15</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:20 }}>per month · price goes up at launch</div>
            {["Unlimited audits","All 4 AI engines","Full fix generator","5 competitors tracked","AI prompt research","Daily re-scans"].map(f=><div key={f} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}><Check size={12} color="var(--accent)" /><span style={{ fontSize:13, color:"var(--text)" }}>{f}</span></div>)}
            <Link href="/setup" style={{ display:"block", textAlign:"center", marginTop:20, padding:"9px", borderRadius:8, background:"var(--accent)", color:"#0a0a0f", fontWeight:700, fontSize:13 }}>Lock in $15 →</Link>
          </div>
        </div>
        <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:"var(--text-3)" }}>vs Otterly at $189–$989/month · No credit card required to start</p>
      </section>
      <section style={{ padding:"60px 32px", textAlign:"center", borderTop:"1px solid var(--border)" }}>
        <h2 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.03em", marginBottom:12 }}>Find out where you stand — free</h2>
        <p style={{ fontSize:14, color:"var(--text-2)", marginBottom:28 }}>Setup takes 2 minutes. First results in 60 seconds.</p>
        <Link href="/setup" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"13px 32px", borderRadius:10, background:"var(--accent)", color:"#0a0a0f", fontWeight:700, fontSize:15 }}>Run your free audit <ArrowRight size={15} /></Link>
      </section>
      <footer style={{ borderTop:"1px solid var(--border)", padding:"18px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}><Radio size={12} color="var(--accent)" /><span style={{ fontSize:12, color:"var(--text-3)" }}>GeoIntel</span></div>
        <div style={{ display:"flex", gap:20 }}>{[["Terms","/terms"],["Privacy","/privacy"]].map(([l,h])=><Link key={l} href={h} style={{ fontSize:12, color:"var(--text-3)" }}>{l}</Link>)}</div>
      </footer>
    </div>
  )
}
