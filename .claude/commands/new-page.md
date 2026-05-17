Scaffold a new Next.js App Router page for: $ARGUMENTS

Follow MagByte conventions:
- File: /app/dashboard/$ARGUMENTS/page.tsx
- Use 'use client' only if the page needs interactivity
- Wrap data fetching in TanStack Query (useQuery)
- Use Zustand only for cross-page state, useState for local
- Add a loading.tsx and error.tsx sibling if they don't exist
- Use Tailwind only — no inline styles
- Add a // TODO: connect to real API comment on mock data
- Keep the component name PascalCase matching the route name
