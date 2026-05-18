# Verify — post-change quality check

Run this after any set of code changes. No arguments needed.

## 1. Type-check

```bash
pnpm tsc --noEmit
```

Report: pass ✅ or list every error with file + line.
Fix all errors before continuing.

## 2. Convention audit (scan changed files)

Run `git diff --name-only HEAD` to find changed files, then check each one for:

| Check | Rule |
|---|---|
| `any` type | ❌ Not allowed — use proper types |
| `formatNaira` | ❌ Legacy — replace with `formatCurrency` |
| Hardcoded `₦` or currency string | ❌ Use `formatCurrency(value, currency)` |
| `console.log` | ⚠️ Remove before shipping |
| Inline styles | ❌ Tailwind only |
| Missing `dark:` classes | ⚠️ Every light-mode class needs a dark variant |
| Missing loading state | ⚠️ Every data-dependent component needs one |
| Missing error state | ⚠️ Every data-dependent component needs one |
| `useEffect` for data fetching | ❌ Use TanStack React Query |
| Direct `localStorage` access in component | ❌ Route through Zustand store |

## 3. Summary

Output a checklist:
```
✅ Type-check — passed
✅ No any types
⚠️  console.log in app/dashboard/sales/page.tsx (line 42) — remove before commit
✅ Currency formatting correct
...
```

If everything passes: "All checks passed. Safe to commit."
If anything fails: list the issues and fix them before closing.
