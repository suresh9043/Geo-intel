# GeoIntel — v0.dev Redesign Guide

## Project Context

GeoIntel is an AI visibility monitoring dashboard. It tracks how brands appear across AI models (ChatGPT, Claude, Gemini, Perplexity). The frontend is **Next.js 16 App Router + Tailwind v4 + shadcn/ui**.

---

## Rules to Follow in Every v0 Prompt

### 1. No CSS Variables
Do NOT use Tailwind CSS variable classes. These do not resolve reliably in this project.

❌ Avoid: `bg-card`, `bg-primary`, `bg-muted`, `text-muted-foreground`, `text-card-foreground`, `border-border`, `bg-background`

✅ Use instead:
| Instead of | Use |
|---|---|
| `bg-card` | `bg-white` |
| `bg-background` | `bg-gray-50` |
| `bg-primary` | `bg-[#3B5BDB]` |
| `text-primary` | `text-[#3B5BDB]` |
| `bg-muted` | `bg-gray-100` |
| `text-muted-foreground` | `text-gray-500` |
| `text-card-foreground` | `text-gray-900` |
| `border-border` | `border-gray-200` |
| `bg-primary/5` | `bg-blue-50` |
| `bg-primary/10` | `bg-blue-100` |

### 2. Always Say No Dark Mode
Every prompt should include: **"No dark mode. Light theme only."**

### 3. Tailwind v4
Always mention: **"Using Tailwind v4"**

### 4. Hardcoded Brand Color
Primary color is `#3B5BDB`. Use this for buttons, active states, highlights, and brand indicators.

### 5. Single Viewport Layout
The dashboard must fit in one screen with no vertical scroll. Use `h-screen`, `overflow-hidden`, and `flex` layouts.

### 6. shadcn/ui Components
You can use shadcn/ui components — they are already installed. Mention this in prompts.

---

## Data Shapes (paste into v0 when relevant)

### Stats (from `getDashboardStats`)
```ts
{
  visibility: number,          // 0-100, brand mention rate %
  rank: number | null,         // position in share of voice
  mentionCount: number,        // times brand appeared
  totalResponses: number,      // total AI responses
  shareOfVoice: { name: string, isOurBrand: boolean, visibility: number }[],
  availableModels: string[],
  lastRunAt: string | null
}
```

### Rankings (from `getRankings`)
```ts
{
  name: string,
  isOurBrand: boolean,
  visibility: number,       // 0-100%
  mentionCount: number,
  totalResponses: number,
  avgPosition: number | null,  // avg rank in AI numbered lists
  models: string[],
  rank: number
}[]
```

### Visibility Runs (from `getVisibilityPerRun`)
```ts
{
  runId: string,
  date: string,
  visibility: number,
  total: number,
  competitors: Record<string, number>  // competitor name → visibility %
}[]
```

### Companies
```ts
{ id: string, name: string }[]
```

---

## Components to Redesign (do one at a time)

### 1. Sidebar
**What it does:** Shows company list, active company highlight, add/edit/delete actions, user info at bottom.

**Keep:**
- `companies` prop: `{ id: string, name: string }[]`
- `selectedCompanyId` prop
- `onSelectCompany(id)` callback
- `onCreateNew()` callback
- `onDeleteCompany(id)` callback
- Edit icon + trash icon per company on hover

**v0 prompt tip:** "Design a sidebar for a SaaS dashboard. It shows a list of tracked companies, with the selected one highlighted in blue (#3B5BDB). Each company row shows edit and delete icons on hover. There's a + button at the top to add a new company. User name and email shown at the bottom."

---

### 2. Dashboard Header
**What it does:** Shows company name, last run time, model filter dropdown, refresh button, Run Now button.

**Keep:**
- Company name as title
- Last run timestamp
- Model filter `<select>` (options: All models + model names)
- Refresh button (icon)
- Run Now button (primary blue)

---

### 3. Mention Rate Card (hero metric)
**What it does:** Large % number showing brand mention rate, delta arrow vs last run, visibility trend line chart, Show Competitors checkbox.

**Keep:**
- `VisibilityWidget` component interface: `runs: RunData[], showCompetitors: boolean`
- The Recharts `LineChart` inside — just restyle the card wrapper
- Show `—` when no data

---

### 4. Visibility Rank Card
**What it does:** Ranked list of brand + competitors by visibility %, with colored progress bars.

**Keep:**
- Sorted by visibility descending
- Gold `#1`, silver `#2` rank indicators
- Brand highlighted with blue background
- Progress bars per entry

---

### 5. Brand Mentions Card
**What it does:** Horizontal bar chart showing mention count for each brand/competitor.

**Keep:**
- Count shown as `X / totalResponses`
- Colored dot per brand
- Bars proportional to max mentions

---

### 6. Average Position Card
**What it does:** Shows each brand's average rank in AI numbered lists. Lower = better.

**Keep:**
- Avatar circle with brand initial
- Position badge (green ≤2, amber ≤4, red >4, gray if no data)
- "Your brand" label for own company
- Footer note: `— not yet detected in numbered lists`

---

### 7. Share of Voice Card
**What it does:** Compact bar chart showing % share for each brand.

**Keep:**
- Star ★ next to own brand
- Color-coded % (green ≥60, amber ≥30, red <30)

---

### 8. Brand Rankings Table
**What it does:** Full table with rank, brand avatar, visibility bar, avg position, and which models mentioned them.

**Keep:**
- Avatar circle with initial + color per brand
- Visibility mini progress bar
- Model badges (GPT = green, Claude = orange, Gemini = blue, Perplexity = purple)
- "You" badge on own brand row

---

### 9. Recommended Actions Card
**What it does:** 3 action items with priority badges (Critical/High/Quick win), title, detail, and action link.

**Keep:**
- Priority badge colors: red = critical, amber = high, blue = quick win
- Clickable rows navigating to `/dashboard/geo-audit`

---

### 10. LLM Responses Feed
**What it does:** Shows last 8 AI responses with model badge, prompt text, response preview.

**Keep:**
- `ResponseFeed` component interface: `responses: any[]`
- Model badge color per provider

---

### 11. Setup Wizard (Modal)
**What it does:** 4-step modal — Company → Competitors → Prompts → Models.

**Keep:**
- Step progress indicator at top
- Generate buttons for competitors and prompts (calls API)
- Geography selector
- Model selection grid grouped by provider
- White background (`bg-white`) — not `bg-card`

---

## Layout Grid (current structure to preserve or improve)

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (fixed) │ Header (company name + controls)  │
│                 ├─────────────────────────────────── │
│  Companies list │ [Mention Rate 70%] [Vis. Rank 30%]│
│                 │ [Brand Mentions 50%] [Avg Pos 50%] │
│                 │ [Share of Voice 33%] [Rankings 67%]│
│                 │ [Recommended Actions]              │
│                 │ [LLM Responses]                    │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack (mention in v0 prompts)
- Next.js 16 App Router
- Tailwind v4
- shadcn/ui (installed)
- Recharts (for line charts)
- TypeScript
- Light theme only, no dark mode
