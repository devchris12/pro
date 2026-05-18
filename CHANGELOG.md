# MagByte App — Changelog

Track of every structural change before we begin git commits.
Format: `[DATE] · [TYPE] · Description`
Types: INIT | FEAT | REFACTOR | FIX | STYLE | INFRA

---

## Session 1 — 2026-03-28

### INFRA · Installed recharts 3.8.1
Added Recharts as the charting library. Chosen over Chart.js because it is
React-native (no imperative DOM refs), works well with Tailwind, and has
first-class TypeScript support.

### INFRA · Generated mock data from Rida's real payload
Ran `analyze_retail_basic.py` and `executive_summary_basic.py` on
`sample_payload_rida.json`. Output files copied to `app/mock/`:
- `basic_analysis_output.json` — page_1 (Sales), page_2 (Products),
  page_3 (Forecast), anomalies, metadata
- `executive_summary_output_all.json` — health score, vital signs,
  signals, charts, plays, forecast insight

### FEAT · TypeScript types added
- `app/types/basicAnalysis.ts` — full type tree for BasicAnalysisResult
- `app/types/executiveSummary.ts` — full type tree for ExecutiveSummaryResult

### FEAT · Mock data layer + data access hooks
- `app/mock/index.ts` — typed exports, TODO markers for API swap
- `app/hooks/useDashboardData.ts` — useBasicAnalysis(), useExecutiveSummary()
  (returns mock now, swap for useQuery later)

### FEAT · Dashboard Zustand store
- `app/stores/dashboard/useDashboardStore.ts`
  - `period` — "all" | "week" | "month" | "year" (global period filter)
  - `sideRailExpanded` — desktop rail collapsed/expanded state (persisted)

### FEAT · Dashboard shell — layout architecture overhaul
Replaced the minimal Header+children layout with a full adaptive shell:
- `TopBar.tsx` — sticky top bar: logo, page nav pills, date range badge,
  health mini-widget, period filter, account avatar
- `SideRail.tsx` — desktop collapsible icon rail (56px → 220px), midnight bg
- `BottomNav.tsx` — mobile bottom navigation bar (hidden on md+)
- `app/dashboard/layout.tsx` — rebuilt with TopBar + SideRail + BottomNav

### FEAT · 4 dashboard pages built (mock data)
- `/dashboard` — Executive Summary (Cockpit): health gauge, vital signs,
  signals, charts (pareto bar, category donut, revenue trend), plays,
  forecast insight card
- `/dashboard/sales` — Sales Overview: 7 KPI cards, 4 charts, detail table
- `/dashboard/products` — Product Performance: 5 KPI cards, top products
  chart, category bar, product table with reorder alerts
- `/dashboard/forecast` — Forecast Insights: 5 KPI cards, month progress
  card, forecast line chart, category forecast bars, seasonality charts,
  top item forecast table

### Architecture decisions
- Side rail on desktop, bottom nav on mobile — responsive for Nigerian SME
  owners likely on Android phones
- Health score mini-widget persists in TopBar across all 4 pages — MagByte
  signature metric always visible
- Date range badge always visible (shows coverage of uploaded data)
- Global period filter in Zustand — single source of truth across pages
- Signal cards in Cockpit link to target pages with `?highlight=` param
- Mock data layer uses thin hooks so API swap requires changing one file

---

## Upcoming (next session)
- Wire up real API once n8n is reactivated
- Add chart focus/expand mode (click to full-screen)
- Add chart-as-filter interaction
- Add download PDF functionality
- Add thumbs up/down on AI insights
