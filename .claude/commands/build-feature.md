# Build Feature — end-to-end feature workflow

Feature to build: **$ARGUMENTS**

Execute this workflow in order. Do not skip steps.

## 1. Read before writing

Before touching any file:
- Read the target page/component
- Read any types it depends on in `app/types/`
- Read any hooks it uses (especially `useDashboardData`, `useFilteredData`)
- Read `tasks/lessons.md` — check for any rules that apply to this feature

State what you found in 3 sentences max.

## 2. Write the plan to tasks/todo.md

Overwrite `tasks/todo.md` with:
- The task name
- A checklist of every file to change (one line each: `path/to/file — what changes`)
- Leave checkboxes unchecked

If the plan is more than 5 files, state this and ask for confirmation before continuing.

## 3. Implement — mark items done as you go

Work through the checklist in `tasks/todo.md`, ticking each item when complete.
Follow MagByte rules:
- No `any` types — define interfaces in `app/types/` if needed
- `formatCurrency()` not `formatNaira()`
- Dark mode: every class needs a `dark:` variant
- Loading + error + empty state on every data-dependent component
- `'use client'` only if the component uses state, Zustand, or React Query
- No inline styles — Tailwind only
- `cn()` for all conditional classes
- Ask yourself before finishing: "Would a staff engineer approve this?"
- If any step feels hacky: stop and implement the elegant solution instead

## 4. Type-check

Run: `pnpm tsc --noEmit`

Fix all errors. Do not leave the repo in a worse type state than you found it.

## 5. Smoke-check report

Write a browser test list — exactly what to verify in http://localhost:3302:
- Golden path: what should work normally
- Edge cases: empty data, dark mode, mobile width
- Regressions to watch: what nearby feature could have broken

## 6. Update tasks/todo.md

Add a `## Review` section with what was done, what was skipped, and any follow-up needed.

If I corrected you during this task, add a rule to `tasks/lessons.md` under the relevant heading.
