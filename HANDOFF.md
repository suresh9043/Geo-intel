# GeoIntel Frontend — Handoff Guide

Hey! This doc explains what's been built so far in the frontend, how it's structured, and where you can plug in your components.

---

## What Is This App?

**GeoIntel** tracks how a company's brand appears across AI models (ChatGPT, Claude, Gemini, Perplexity). It sends prompts to these models and records every response in a database. The dashboard shows you how often your brand is mentioned, how you rank vs competitors, and which AI models are talking about you.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| Icons | Lucide React |

---

## How to Run

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:3001
```

> The frontend talks to an Express backend running at `http://localhost:3000`. You need that running too for any real data to show up. Without it, the dashboard will show empty states.

---

## Folder Structure

```
frontend/
├── app/                        # Next.js pages (App Router)
│   ├── page.tsx                # Root — entry point
│   ├── layout.tsx              # Root layout (fonts, theme provider)
│   ├── globals.css             # Global styles
│   ├── setup/
│   │   └── page.tsx            # /setup — company setup wizard
│   └── dashboard/
│       ├── page.tsx            # /dashboard — main analytics view
│       └── model/[slug]/
│           └── page.tsx        # /dashboard/model/[slug] — per-model view (scaffolded)
│
├── components/                 # All UI components
│   ├── ui/                     # shadcn/ui base components (don't modify these)
│   ├── dashboard-header.tsx    # Top bar with filters + Run Now button
│   ├── kpi-card.tsx            # Single metric card (visibility, rank, etc.)
│   ├── mentions-coverage.tsx   # Donut chart — "X of Y answers mention you"
│   ├── share-of-voice.tsx      # Horizontal bars — your brand vs competitors
│   ├── ranking-table.tsx       # Sortable table — brand rankings
│   ├── setup-wizard.tsx        # Multi-section company setup form
│   ├── sidebar.tsx             # Left navigation
│   ├── heatmap.tsx             # Prompt × Model grid (static data for now)
│   ├── trend-chart.tsx         # Line/area chart over time (static data for now)
│   ├── drill-in-panel.tsx      # Slide-out panel with full AI response detail
│   └── ...                     # Other scaffolded components
│
├── lib/
│   └── utils.ts                # cn() helper for Tailwind class merging
│
└── hooks/                      # Custom React hooks
```

---

## Pages Explained

### `/setup`
A single-page form where a user sets up their company for tracking. It has 6 sections:
1. Company basics (name, URL, description, industry)
2. ICP description (target customer)
3. Competitors list
4. Prompts to track across AI models
5. Which LLM models to track (checkboxes — loaded from backend)
6. Review summary before submitting

On submit it saves to the backend and kicks off the first tracking run.

**File:** `app/setup/page.tsx` → `components/setup-wizard.tsx`

---

### `/dashboard`
The main analytics view. It's a **no-scroll, single viewport layout** — everything fits on screen without scrolling. Layout:

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar  │ Header: title · last run · filters · Run Now     │
│          ├──────────────────────────────────────────────────┤
│          │ [Visibility] [Your Rank] [Avg Position] [Sentim.]│
│          ├──────────────────┬───────────────────────────────┤
│          │ Mentions Coverage│                               │
│          │ (donut)          │   Brand Ranking Table         │
│          ├──────────────────┤   (fills height, scrolls     │
│          │ Share of Voice   │    internally if needed)      │
│          │ (bars)           │                               │
└──────────┴──────────────────┴───────────────────────────────┘
```

**File:** `app/dashboard/page.tsx`

---

## Components Explained

### Components Wired to Real Data

#### `DashboardHeader`
Top bar of the dashboard. Contains:
- Page title
- Last run timestamp (e.g. "Last run: 2h ago")
- Time range dropdown (7 / 14 / 30 / 90 days)
- Model filter dropdown (All models / specific model)
- **Run Now** button — triggers a live tracking job

When filters change, the dashboard re-fetches stats from the backend.

---

#### `KPICard`
A single metric tile. Used 4 times in a row:
- **Visibility** — % of AI responses that mention the brand
- **Your Rank** — position among brand + competitors
- **Avg Position** — average position in AI numbered lists (e.g. #2.3)
- **Sentiment** — Positive / Neutral / Negative

Props: `label`, `value`, `delta` (subtext), `trend` (up/down/neutral)

---

#### `MentionsCoverage`
A donut chart showing "Mentioned in X of Y answers". Also shows coloured pills for which AI models mentioned the brand.

Props: `mentionCount`, `totalResponses`, `models` (string array)

---

#### `ShareOfVoice`
Horizontal bar chart comparing your brand against every competitor by mention rate. Bars are colour-coded per brand. Your brand is always highlighted.

Props: `data` — array of `{ name, visibility, isOurBrand }`

---

#### `RankingTable`
Sortable table showing every tracked entity (your brand + competitors) ranked by visibility. Columns:
- Rank (#1, #2...)
- Brand name (with "You" badge on your brand)
- Visibility %
- Avg Position in AI lists
- Sentiment badge
- Which models mentioned them (pill badges)

Sortable by rank, visibility, avg position. Has internal scroll if many rows.

Props: `data` — array of ranking rows from `/api/rankings`

---

#### `SetupWizard`
The full company setup form. Fetches the model list from the backend on load, pre-populates if a company already exists, and posts to the backend on submit.

Props: `onComplete`, `onSaveExit` (callbacks)

---

### Components With Static/Sample Data (not yet wired)

These components exist and render correctly, but are using hardcoded sample data. They're the next things to wire up:

#### `TrendChart`
Line/area chart showing visibility % over time across multiple runs. Currently uses hardcoded week-by-week data.

**To wire:** needs a backend endpoint that groups `raw_responses` by run date and returns visibility scores per run.

---

#### `Heatmap`
A grid of prompts (rows) × models (columns). Each cell shows a visibility score for that combination. Clicking a cell should open the DrillInPanel.

**To wire:** needs a backend endpoint that aggregates visibility scores per `prompt_id × tracked_model_id`.

---

#### `DrillInPanel`
A slide-out panel that shows the full AI response for a specific prompt + model combination. Includes:
- The response text
- Brand mentions highlighted
- Competitor mentions
- Citations (if available)
- Sentiment + position

**To wire:** needs a backend endpoint to fetch a specific `raw_response` by prompt + model.

---

#### `Sidebar`
Left navigation with company list and nav links. Currently hardcoded with dummy companies. Needs to fetch real company list from the backend and support switching between them.

---

## Where to Add Your Components

The cleanest places to add new components:

1. **Inside the dashboard grid** — `app/dashboard/page.tsx` is the main layout file. The left column (currently Mentions Coverage + Share of Voice) and right column (Ranking Table) can be extended or reorganised.

2. **New section below the KPI row** — there's a flex column inside `app/dashboard/page.tsx`. You can add a new row between the KPI cards and the two-column section.

3. **New page** — add a folder under `app/` with a `page.tsx`. The sidebar navigation in `components/sidebar.tsx` has a `navItems` array you can extend.

4. **Slide-out panels** — the `DrillInPanel` pattern (a fixed right panel with `isOpen` state) is a good pattern for detail views without navigation.

---

## Backend API (for reference)

The frontend calls these endpoints on `http://localhost:3000`:

| Endpoint | What it returns |
|---|---|
| `GET /api/config` | Available LLM models and industry list |
| `GET /api/company` | Saved company profile |
| `POST /api/company` | Save/update company profile |
| `POST /api/track/start` | Start a tracking job |
| `GET /api/stats?days=30&model=all` | Visibility %, rank, mention counts, share of voice |
| `GET /api/rankings` | Full ranked list of brand + competitors |
| `GET /api/runs/:id/status` | Progress of a running tracking job |

---

## Things Still To Do

- [ ] Wire `TrendChart` to real multi-run data
- [ ] Wire `Heatmap` to real prompt × model data
- [ ] Wire `DrillInPanel` to fetch real responses
- [ ] Wire `Sidebar` company list to the backend
- [ ] Build out `/dashboard/model/[slug]` per-model detail page
- [ ] Add scheduled/automated runs
- [ ] Add authentication before any public deployment
- [ ] Move `API_BASE` (`http://localhost:3000/api`) to an env variable for production
