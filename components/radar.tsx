export function Radar({ message, size = "md" }: { message?: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? 40 : size === "lg" ? 80 : 56
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: s, height: s, flexShrink: 0 }}>
        <svg width={s} height={s} viewBox="0 0 56 56" style={{ animation: "float 3s ease-in-out infinite" }}>
          <rect x="12" y="22" width="32" height="28" rx="8" fill="var(--bg-3,#18181f)" stroke="#2dd4bf" strokeWidth="1.5"/>
          <circle cx="21" cy="33" r="4" fill="var(--bg-2,#111118)"/>
          <circle cx="35" cy="33" r="4" fill="var(--bg-2,#111118)"/>
          <circle cx="21" cy="33" r="2" fill="#2dd4bf"/>
          <circle cx="35" cy="33" r="2" fill="#2dd4bf"/>
          <path d="M22 41 Q28 46 34 41" fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="28" y1="22" x2="28" y2="12" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
          <ellipse cx="28" cy="10" rx="7" ry="4" fill="none" stroke="#2dd4bf" strokeWidth="1.5" style={{ transformOrigin: "28px 10px", animation: "spin 3s linear infinite" }}/>
          <rect x="4" y="28" width="8" height="4" rx="2" fill="var(--bg-3,#18181f)" stroke="#2dd4bf" strokeWidth="1"/>
          <rect x="44" y="28" width="8" height="4" rx="2" fill="var(--bg-3,#18181f)" stroke="#2dd4bf" strokeWidth="1"/>
          <rect x="18" y="37" width="20" height="8" rx="3" fill="rgba(45,212,191,0.12)" stroke="#2dd4bf" strokeWidth="0.5"/>
          <text x="28" y="43.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="#2dd4bf" fontFamily="monospace">GEO</text>
        </svg>
      </div>
      {message && (
        <div style={{ background: "var(--bg-3,#18181f)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px 12px 12px 0", padding: "8px 12px", fontSize: 12, color: "var(--text-2,#9896b0)", maxWidth: 220, lineHeight: 1.5 }}>
          {message}
        </div>
      )}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
