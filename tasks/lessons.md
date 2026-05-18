# Lessons — self-improvement log

Rules I've learned from corrections in this project.
Updated after every correction. Reviewed at every session start via `/context-reset`.

---

## TypeScript

- Never use `any` — define an interface in `app/types/` even for one-off shapes.
- When narrowing a union type (e.g. `AdvancedAnalysisResult["page_3"]`), add a type cast rather than using `any`.

## Currency

- `formatNaira()` is legacy — it exists in `lib/utils.ts` but must not be used in new code. Always use `formatCurrency(value, currency)`.
- Never hardcode ₦ in JSX or strings.

## Filters

- Never call `useBasicAnalysis()` directly on Sales or Products pages — always go through `useFilteredData()`. Calling the hook directly silently breaks period filtering.

## Focus mode

- `focusContent` must use `height={500}` inside `<ResponsiveContainer>` — NOT 200. Using 200 causes tooltip coordinate mismatch: tooltips only fire in the top 40% of the chart because Recharts maps coordinates to a 200px SVG stretched to 500px display.

## Dark mode

- Every Tailwind class that sets a colour or background must have a paired `dark:` variant. Missing dark variants are not caught by the type-checker.

## Pre-commit hook

- The secret-detection pattern `[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)[A-Z_]*\s*=\s*\S{16,}` will false-positive on placeholder strings with 16+ non-whitespace chars. Use `<angle-bracket-placeholders>` in example files, not quoted strings.

## .gitignore

- `.claude/` was fully gitignored — commands and skills were invisible to git. Fixed: now only `settings.local.json`, `hooks/`, and `homunculus/` are excluded; `commands/` is tracked.

## Git history rewrite

- `git filter-repo` removes the `origin` remote as a side effect. Always re-add: `git remote add origin <url>` then force-push.
