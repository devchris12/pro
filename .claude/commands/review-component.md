Review the component at $ARGUMENTS and check:

1. TypeScript — any `any` types? Missing return types?
2. Performance — unnecessary re-renders? Should anything be memoized?
3. Data fetching — is it using TanStack Query correctly?
4. Tailwind — any inline styles or hardcoded colors that should use theme tokens?
5. Accessibility — missing aria labels, alt text, keyboard nav?
6. MagByte conventions — does it follow CLAUDE.md rules?

Give a short verdict per category. Suggest fixes, don't rewrite the whole file.
