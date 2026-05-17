# Page Audit — full review of a dashboard page

Page to audit: **$ARGUMENTS**
(e.g. `/dashboard/customers`, or `app/dashboard/customers/page.tsx`)

## 1. Read the page

Read the page file top to bottom. Also read:
- Any types it imports from `app/types/`
- Any hooks it uses
- Any child components that contain significant logic

## 2. Data layer

- [ ] Uses `useFilteredData()` (not raw `useBasicAnalysis()`) for pages showing page_1/page_2 data
- [ ] Cockpit + Forecast only: uses full dataset, shows amber notice when period filter active
- [ ] All KPIs recalculate when filters change
- [ ] Table rows recalculate when filters change
- [ ] Charts recalculate when filters change

## 3. Types

- [ ] No `any` types
- [ ] All data shapes have interfaces in `app/types/`
- [ ] Props interfaces defined as `[ComponentName]Props`
- [ ] No implicit `any` from untyped destructuring

## 4. UI conventions

- [ ] `<EditableGreeting>` used (not inline greeting logic)
- [ ] `formatCurrency()` used — no `formatNaira()`, no hardcoded ₦
- [ ] Dark mode: every class has a `dark:` variant
- [ ] Loading state on every data-dependent component
- [ ] Error state on every data-dependent component
- [ ] KPI colour signals (green/amber/red) present
- [ ] `?` tooltip on every chart and KPI card

## 5. Focus mode

- [ ] All charts (except Cockpit/Forecast) have `focusable` prop on `<ChartCard>`
- [ ] `focusContent` uses `height={500}` inside `<ResponsiveContainer>` — NOT 200
- [ ] Background data frozen while focus is open (frozen refs pattern)
- [ ] Filter notice hidden while focus is open

## 6. Missing features

List anything from the audit that is missing or broken.
For each issue: file + line + what needs to change.

## 7. Verdict

Pass ✅ or Needs work ⚠️ with a prioritised list.
