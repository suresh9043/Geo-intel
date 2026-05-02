# GeoIntel — Frontend Plan & Architecture

> Repository: https://github.com/suresh9043/GeoIntel_S
> Stack: Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui
> Backend: Express + PostgreSQL (runs separately on localhost:3000)

---

## What Was Built

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Root — redirects to `/setup` or `/dashboard` |
| `/setup` | `app/setup/page.tsx` | Company setup wizard |
| `/dashboard` | `app/dashboard/page.tsx` | Main analytics dashboard |
| `/dashboard/model/[slug]` | `app/dashboard/model/[slug]/page.tsx` | Per-model drill-down (scaffolded) |

---

### Components Built / Modified

#### Dashboard Components (real data from backend)

| Component | File | Data Source | What It Shows |
|---|---|---|---|
| `DashboardHeader` | `components/dashboard-header.tsx` | `/api/stats` | Title, last run status, time range filter, model filter, Run Now button |
| `KPICard` | `components/kpi-card.tsx` | `/api/stats` | Visibility %, Your Rank, Avg Position, Sentiment — 4 compact cards |
| `MentionsCoverage` | `components/mentions-coverage.tsx` | `/api/stats` | Donut chart: "X of Y answers mention your brand" + model pills |
| `ShareOfVoice` | `components/share-of-voice.tsx` | `/api/stats` | Horizontal bar chart: your brand vs every competitor by mention % |
| `RankingTable` | `components/ranking-table.tsx` | `/api/rankings` | Sortable table: rank, brand, visibility %, avg position, sentiment, which models mentioned them |

#### Setup Components (real data from backend)

| Component | File | Data Source | What It Shows |
|---|---|---|---|
| `SetupWizard` | `components/setup-wizard.tsx` | `/api/config`, `/api/company`, `/api/track/start` | 6-section form: Company Basics, ICP, Competitors, Prompts, LLM Models, Review Summary |

#### Static / Sample Data (not yet wired to backend)

| Component | File | Status |
|---|---|---|
| `TrendChart` | `components/trend-chart.tsx` | Hardcoded — needs multi-run historical API |
| `Heatmap` | `components/heatmap.tsx` | Hardcoded — needs prompt × model aggregation API |
| `DrillInPanel` | `components/drill-in-panel.tsx` | Hardcoded — needs response fetch by prompt + model |
| `ModelSelector` | `components/model-selector.tsx` | Hardcoded — needs tracked models from DB |
| `Sidebar` | `components/sidebar.tsx` | Hardcoded company list — needs multi-company support |

---

### Layout

The dashboard is a **no-scroll single viewport layout** using `h-screen overflow-hidden`:

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (fixed)  │ Header: title · last run · filters · Run │
│                  ├──────────────────────────────────────────┤
│  - Companies     │ [Visibility] [Rank] [Avg Pos] [Sentiment]│
│  - Navigation    ├────────────────┬─────────────────────────┤
│                  │ Mentions       │                         │
│                  │ Coverage       │   Brand Ranking Table   │
│                  │ (donut)        │   (fills remaining      │
│                  ├────────────────┤    height, scrollable   │
│                  │ Share of Voice │    internally)          │
│                  │ (bar chart)    │                         │
└──────────────────┴────────────────┴─────────────────────────┘
```

---

## Backend API Endpoints (Express on :3000)

The frontend calls these endpoints. All are in `server/server.js`.

| Method | Endpoint | Used By | Returns |
|---|---|---|---|
| `GET` | `/api/config` | Setup Wizard | Industry list + available LLM models |
| `GET` | `/api/company` | Setup Wizard | Saved company profile from DB |
| `POST` | `/api/company` | Setup Wizard | Saves/updates company profile |
| `POST` | `/api/track/start` | Setup Wizard, Run Now button | Starts background tracking job |
| `GET` | `/api/stats?days=30&model=all` | Dashboard | Visibility %, rank, mention counts, share of voice, available models, last run time |
| `GET` | `/api/rankings` | Dashboard | Brand + competitor ranked list with positions, sentiment, model pills |
| `GET` | `/api/runs/:id/status` | (polling) | Run progress during a tracking job |
| `GET` | `/api/track/results` | (legacy) | Raw responses activity feed |

---

## What Needs To Be Done Next

### High Priority

- [ ] **Wire Heatmap to real data** — needs `GET /api/heatmap` that aggregates visibility score per `prompt × model` combination from `raw_responses`
- [ ] **Wire Trend Chart to real data** — needs `GET /api/trends` that groups visibility scores by run date for multi-run history
- [ ] **Wire Drill-in Panel** — needs `GET /api/response?promptId=&modelId=` to fetch the actual response text, citations, brand/competitor mentions for a specific cell

### Medium Priority

- [ ] **Wire Sidebar company list** — fetch from `/api/company` and support switching between multiple tracked companies
- [ ] **Wire Model Selector** — replace hardcoded models with tracked models from DB
- [ ] **Multi-run comparison** — filter `raw_responses` by `run_id` to compare two tracking runs side by side

### Lower Priority

- [ ] **Scheduled Runs** — add a server-side cron for automated weekly/daily tracking
- [ ] **Authentication** — add basic auth before any public deployment
- [ ] **Per-model dashboard page** (`/dashboard/model/[slug]`) — currently scaffolded, needs data
- [ ] **Export** — CSV/PDF export of ranking and response data

---

## How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/suresh9043/GeoIntel_S.git
cd GeoIntel_S

# 2. Install dependencies
npm install

# 3. Start the frontend (requires backend running on :3000)
npm run dev
# → http://localhost:3001
```

The frontend expects the Express backend at `http://localhost:3000`. Set up and run the backend separately from the `server/` directory.

---

## Environment

No `.env` file needed for the frontend — all API calls go to `http://localhost:3000/api` (hardcoded as `API_BASE` in each page). For production deployment, `API_BASE` should be moved to an environment variable pointing to the deployed backend URL.
