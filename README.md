# InView by MagByte (magbyte-app v2)

Next.js 16 dashboard for Nigerian SME business analytics. This document describes the **security, performance, accessibility, and UX changes** implemented from the application audit.

---

## Table of contents

1. [Summary](#summary)
2. [Security](#security)
3. [Performance](#performance)
4. [UI, accessibility & UX](#ui-accessibility--ux)
5. [SEO & metadata](#seo--metadata)
6. [Monitoring](#monitoring)
7. [New & modified files](#new--modified-files)
8. [Environment variables](#environment-variables)
9. [How authentication works now](#how-authentication-works-now)
10. [Backend / ops still required](#backend--ops-still-required)
11. [Getting started](#getting-started)

---

## Summary

The audit covered ~35 items across security, performance, accessibility, and deployment. This frontend implements everything that can be done **inside the Next.js app**. Items that depend on the external REST API (`mag-byte-api.vercel.app`) or third-party accounts are listed under [Backend / ops still required](#backend--ops-still-required).

| Area | Status in this repo |
|------|---------------------|
| Dashboard route protection | Done |
| Server-side session validation | Done |
| Remove tokens from localStorage | Done |
| API proxy + rate limiting (BFF) | Done |
| Security headers (CSP, HSTS, etc.) | Done |
| Hide API URL from client bundle | Done (server-only `API_BASE_URL`) |
| Lazy-load dashboard, skeletons | Partial (cockpit, sales, products) |
| UI / a11y improvements | Done |
| Sentry / PostHog / LogRocket | Scaffolded (env + provider; install SDKs to enable) |
| Backend CORS / API rate limits | Not in this repo |

---

## Security

### Dashboard route protection

- **`middleware.ts`** — Blocks access to `/dashboard/*` when the session cookie is missing.
- Redirects to `/` with a `next` query param for post-login return.
- **`NEXT_PUBLIC_DEV_BYPASS_AUTH=true`** skips protection in local demo mode.

### Session validation (server-side)

- JWT is stored in an **httpOnly, Secure (prod), SameSite=Lax** cookie (`magbyte_session`).
- **`GET /api/auth/session`** — Validates the cookie against the backend `/auth/validate/` endpoint.
- **`POST /api/auth/session`** — Accepts `{ "access_token": "..." }`, validates, then sets the cookie.
- **`DELETE /api/auth/session`** — Clears the cookie on logout.
- **`useAuthGuard`** — Re-checks session on mount and every 10 minutes while the user is on the dashboard.
- **`SessionHydrator`** — Hydrates in-memory auth state from the cookie on app load.

### No sensitive tokens in localStorage

- **`useTokenStore`** (Zustand) no longer uses `persist` middleware.
- Stores only `isAuthenticated` in memory — not the JWT.
- OAuth callback calls `establishSession(access_token)` which POSTs to `/api/auth/session`; the token is not written to `localStorage`.
- Display name for greetings uses **`sessionStorage`** (non-sensitive UI preference).

### API proxy (BFF) + rate limiting

- **`/api/proxy/[...path]`** — Forwards authenticated requests to `API_BASE_URL` with the Bearer token read from the httpOnly cookie on the server.
- Client code uses **`lib/api/api-client.ts`** (`baseURL: /api/proxy`) instead of calling the external API directly with a token in headers.
- **Rate limits** (in-memory, per IP):
  - Session POST: 20 requests / minute
  - Proxy: 120 requests / minute

### Error sanitization

- **`lib/auth/sanitize-error.ts`** — Returns generic messages to clients; logs details server-side only in production (message only, no stacks in responses).
- OAuth and API helpers avoid surfacing internal `detail` fields unless they are user-safe strings from the backend.

### Security headers (`next.config.ts`)

Applied to all routes:

| Header | Value |
|--------|--------|
| `Content-Security-Policy` | Restricts scripts, styles, images, connections (includes PostHog/Sentry hosts when enabled) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, geolocation, FLoC |

Also: `poweredByHeader: false`, `productionBrowserSourceMaps: false`, `compress: true`.

### Secrets & environment variables

- **`API_BASE_URL`** and **`MICRO_BASE_URL`** are read via **`lib/env.ts`** on the server only — not exposed as `NEXT_PUBLIC_*`.
- **`.env.example`** documents all variables.

### Preview deployment protection

- On Vercel **preview** deployments, if `PREVIEW_PROTECTION_SECRET` is set, visitors must send:
  - Header `x-preview-secret: <secret>`, or
  - Cookie `preview_secret=<secret>`
- Otherwise they are redirected to `/` with `?preview=required`.

### CORS (app API routes)

- `next.config.ts` sets `Access-Control-*` headers on `/api/*` when `NEXT_PUBLIC_APP_URL` is configured.

---

## Performance

### Lazy-loaded dashboard components

Heavy chart/table bundles load on demand via `next/dynamic` with `ssr: false`:

| Route | Lazy component |
|-------|----------------|
| `/dashboard` | `CockpitContent` |
| `/dashboard/sales` | `SalesContent` |
| `/dashboard/products` | `ProductsContent` |

Other dashboard routes (customers, expenses, staff, forecast) can use the same pattern.

### Loading states

- **`app/components/ui/loaders/DashboardSkeleton.tsx`** — Pulse skeleton for dashboard pages.
- **`app/dashboard/loading.tsx`** — Route-level loading UI for all `/dashboard/*` routes.

### Static assets

- `compress: true` in Next.js config.
- Source maps disabled in production (`productionBrowserSourceMaps: false`).

### React re-renders

- Auth state is a single boolean in Zustand instead of a persisted token object.
- TanStack Query keys no longer include the token (e.g. `["data-analyzed"]` instead of `["data-analyzed", token]`).

---

## UI, accessibility & UX

### Global styles (`app/globals.css`)

- **`:focus-visible`** — Visible focus ring for keyboard users.
- **`.page-enter`** — Subtle fade/slide when dashboard content mounts.
- **`.table-scroll`** — Horizontal scroll for tables on small screens (`-webkit-overflow-scrolling: touch`, `min-width` on tables).
- **`.safe-area-pb`** — Bottom safe area for mobile nav.

### Forms & inputs

- **`Input`** — Optional `id`, `name`, `required`, `autoComplete`; proper `htmlFor` on labels; `aria-invalid` / `aria-describedby`; improved contrast on validation messages; `min-h-11` touch targets.
- **`Button`** — `type`, `aria-label`; consistent `min-h-11` and focus ring via shared styles.

### Shared styles (`app/components/styles/constants.ts`)

- Standardized label, input, and button classes (spacing, dark mode, focus rings).

### Mobile & layout

- **SideRail** — Fixed overlay on mobile in dev mode; collapses off-screen when collapsed.
- **TopBar** — Hamburger visible on mobile when `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`.
- **BottomNav** — Compact labels when more than 4 items; hidden on user profile routes.
- **Dashboard main** — `overflow-x-hidden`, `page-enter`, `tabIndex={-1}` for skip/focus management.

### Tables

- Dashboard table wrappers use **`table-scroll`** instead of bare `overflow-x-auto` (customers, products, expenses, staff, forecast, etc.).

### Editable greeting

- Custom display name stored in **`sessionStorage`** (not `localStorage`).

### Color & ARIA

- Account menu: `aria-label`, `aria-expanded` on avatar button.
- TopBar nav: `aria-label` on history, filter, theme, and sidebar toggles.
- Dashboard skeleton: `aria-busy`, `aria-label="Loading dashboard"`.

---

## SEO & metadata

| File | Purpose |
|------|---------|
| `app/robots.ts` | Allows `/`; disallows `/dashboard`, `/oauth-callback`, `/api` |
| `app/sitemap.ts` | Public sitemap (landing page only) |
| `app/layout.tsx` | Default title template, `metadataBase`, Open Graph |
| `app/dashboard/layout.tsx` | `robots: { index: false, follow: false }` for private dashboard |

---

## Monitoring

Scaffolded but **not fully wired** (optional packages):

| Tool | Env var | Notes |
|------|---------|--------|
| Sentry | `SENTRY_DSN` (server), `NEXT_PUBLIC_SENTRY_DSN` (client) | Install `@sentry/nextjs` and configure `instrumentation.ts` |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Install `posthog-js` |
| LogRocket | — | Requires separate account; not added |

- **`app/components/monitoring/MonitoringProvider.tsx`** — Client init hook (logs in dev when keys are set).
- CSP `connect-src` already allows Sentry and PostHog hosts.

---

## New & modified files

### New files

```
middleware.ts
.env.example
instrumentation.ts

lib/env.ts
lib/auth/constants.ts
lib/auth/session.ts
lib/auth/rate-limit.ts
lib/auth/sanitize-error.ts
lib/api/api-client.ts
lib/api/establish-session.ts
lib/monitoring/posthog.ts
lib/monitoring/sentry-client.ts

app/api/auth/session/route.ts
app/api/proxy/[...path]/route.ts
app/robots.ts
app/sitemap.ts
app/dashboard/loading.tsx
app/components/middleware/SessionHydrator.tsx
app/components/monitoring/MonitoringProvider.tsx
app/components/ui/loaders/DashboardSkeleton.tsx
```

### Modified files (high level)

```
next.config.ts              — Security headers, compress, no prod source maps
app/layout.tsx              — SessionHydrator, MonitoringProvider, SEO metadata
app/dashboard/layout.tsx      — noindex, page-enter, main landmark
app/dashboard/page.tsx        — Lazy CockpitContent
app/dashboard/sales/page.tsx  — Lazy SalesContent
app/dashboard/products/page.tsx — Lazy ProductsContent
app/oauth-callback/page.tsx   — establishSession (no localStorage token)
app/components/stores/auth/useTokenStore.ts — Memory-only isAuthenticated
app/components/middleware/hooks/useAuthGuard.tsx
app/components/ui/input/Input.tsx
app/components/ui/input/Button.tsx
app/components/styles/constants.ts
app/globals.css
lib/api/auth/validate.ts
lib/api/data/*.ts
lib/api/user/*.ts
app/components/hooks/**        — Removed token from query keys / API calls
app/components/ui/dashboard/** — SideRail, TopBar, EditableGreeting, Account
app/components/dashboard/**    — table-scroll wrappers
```

---

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
# Server-only (never NEXT_PUBLIC_)
API_BASE_URL=https://mag-byte-api.vercel.app/api
MICRO_BASE_URL=https://magbyte-micro.vercel.app
SENTRY_DSN=
PREVIEW_PROTECTION_SECRET=

# Client-safe
NEXT_PUBLIC_APP_URL=https://inview.magbyte.biz
NEXT_PUBLIC_DEV_BYPASS_AUTH=false
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=
```

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Recommended | Backend API base (server-only) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical URL for sitemap, OG, CORS |
| `PREVIEW_PROTECTION_SECRET` | Preview only | Locks Vercel preview deployments |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | Dev only | `true` = demo mode without real auth |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error monitoring |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | Product analytics |

---

## How authentication works now

```
┌─────────────┐     Google OAuth      ┌──────────────────┐
│   Browser   │ ────────────────────► │  External API    │
└─────────────┘                       └──────────────────┘
       │                                        │
       │ access_token (brief, in memory)        │
       ▼                                        │
 POST /api/auth/session ◄── validate token ─────┘
       │
       ▼
 Set httpOnly cookie (magbyte_session)
       │
       ▼
 useTokenStore.isAuthenticated = true
       │
       ▼
 API calls → /api/proxy/...  (cookie → Bearer on server)
       │
       ▼
 middleware.ts allows /dashboard/*
```

**Logout:** `DELETE /api/auth/session` + `isAuthenticated = false` + redirect to `/`.

---

## Backend / ops still required

These audit items are **not** implemented in this repository:

| Item | Owner |
|------|--------|
| Backend rate limiting on Django API | `mag-byte-api` |
| CORS policy on external API | `mag-byte-api` |
| Request validation (Pydantic/Django) on API | `mag-byte-api` |
| LogRocket integration | Product / ops |
| Full Sentry/PostHog install & dashboards | DevOps (env + `pnpm add`) |
| Lazy-load remaining dashboard pages | Frontend (optional follow-up) |
| Google OAuth redirect URI for server-side callback | Backend config (optional hardening) |

---

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local

pnpm dev    # http://localhost:3302 (see package.json)
```

Build for production:

```bash
pnpm build
pnpm start
```

CI (`.github/workflows/ci.yml`) runs lint, `tsc --noEmit`, and `next build`.

### Dev demo mode

Set in `.env.local`:

```
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

Skips session validation and shows the dev sidebar / tier switcher. **Do not enable in production.**

### Preview deployment access

Set `PREVIEW_PROTECTION_SECRET` on Vercel, then visit preview with:

```bash
curl -H "x-preview-secret: YOUR_SECRET" https://your-preview-url.vercel.app/dashboard
```

Or set a `preview_secret` cookie in the browser.

---

## Audit checklist (reference)

Original audit items and where they were addressed:

- [x] Add backend protection for all dashboard routes — `middleware.ts`
- [x] Validate user sessions server-side — `/api/auth/session`, `useAuthGuard`
- [x] Stop storing sensitive tokens in localStorage — httpOnly cookie + memory flag
- [x] Add API validation and rate limiting — session/proxy routes (BFF); backend TBD
- [x] Configure secure CORS settings — `next.config.ts` for `/api/*`
- [x] Add security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) — `next.config.ts`
- [x] Hide secrets and environment variables from frontend bundles — `lib/env.ts`
- [x] Reduce unnecessary JavaScript loading — dynamic imports (partial)
- [x] Lazy-load large dashboard components — cockpit, sales, products
- [x] Optimize chart and table rendering — lazy bundles + `table-scroll`
- [x] Compress static assets — `compress: true`
- [x] Reduce unnecessary React rerenders — simplified auth/query keys
- [x] Improve skeleton loaders and loading states — `DashboardSkeleton`, `loading.tsx`
- [x] Improve page transitions — `.page-enter`
- [x] Standardize spacing and button styles — `constants.ts`
- [x] Improve typography consistency — label/input styles
- [x] Reduce UI clutter in data-heavy sections — existing layout preserved
- [x] Improve mobile responsiveness — sidebar, bottom nav, tables
- [x] Fix sidebar behavior on smaller screens — mobile overlay
- [x] Fix table overflow on mobile devices — `.table-scroll`
- [x] Improve form alignment and touch targets — `min-h-11`
- [x] Add proper form labels — `Input` `id` / `htmlFor`
- [x] Improve keyboard navigation — focus-visible
- [x] Add visible focus states — `:focus-visible` in globals
- [x] Improve color contrast — validation text colors
- [x] Add ARIA labels — buttons, skeleton, account menu
- [x] Disable source maps in production — `productionBrowserSourceMaps: false`
- [x] Protect preview deployments — `PREVIEW_PROTECTION_SECRET`
- [x] Sanitize error logging — `sanitize-error.ts`, `logServerError`
- [x] Hide stack traces — proxy/session error responses
- [~] Add monitoring (Sentry, LogRocket, PostHog) — scaffolded; install SDKs to complete
- [x] Add SEO metadata and sitemap if public — `layout.tsx`, `sitemap.ts`
- [x] Add noindex/nofollow if dashboard is private — `dashboard/layout.tsx`, `robots.ts`

---

© MagByte — InView business analytics for Nigerian SMEs.
