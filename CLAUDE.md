# CLAUDE.md

Onboarding pointer for AI agents working on this project — read this before writing any code.

## ⚠️ Tech stack gotchas (differs from training data)

- **Next.js 16** — `params` and `searchParams` on pages are **Promises** — must `await` them
- **Next.js 16 middleware → proxy** — auth guard lives at [`src/proxy.ts`](src/proxy.ts), NOT `middleware.ts`
- **Dev server uses webpack** — run `npx next dev --webpack` (Turbopack misdetects workspace root)
- **base-ui (`@base-ui/react`), not Radix** — uses `render` prop, not `asChild`. **Never nest interactive elements (button, onClick) inside `DropdownMenuContent`** — it crashes
- **Tailwind v4** — uses `@import "tailwindcss"` syntax in CSS
- **Recharts** — every chart component must have `'use client'` directive
- **Pages = Server Components** — call server actions directly, pass data as props to chart components

Before writing Next.js code: read `node_modules/next/dist/docs/` to verify current API — there are breaking changes from v15.

## 🗄️ Database = Google Sheets (no other DB)

- Spreadsheet: `MAGIC ACCOUNTING` (`1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI`)
- All Sheet I/O goes through [`src/lib/google/sheets.ts`](src/lib/google/sheets.ts)
- **Source of truth for projects/AR = the `BL_Master` tab**, not Projects_Master or Invoice_Installments (legacy, removed)
- BL parsing logic (pure, no I/O) lives in [`src/lib/bl-parser.ts`](src/lib/bl-parser.ts)
- Full sheet tab schema + column indexes are in [`PROGRESS.md`](PROGRESS.md) — **never rename a tab or reorder columns**, the code references positions directly

## 📁 Structure to know

```
src/
├── actions/         server actions (data + mutations) — dashboard.ts aggregates all data fetches
├── app/(dashboard)/ 4 pages: executive, projects, cashflow, expenses + upload
├── components/
│   ├── charts/      Recharts ('use client')
│   └── dashboard/   KPI cards, AR table
├── lib/
│   ├── bl-parser.ts core BL logic (parse + auto-match Income → Paid)
│   └── google/      Sheets, Drive, Calendar, Tasks, Chat clients
├── proxy.ts         auth guard (NOT middleware.ts)
└── types/           TS interfaces
```

## 🛠️ Dev workflow

**Minimum env vars** in `.env.local` (enough to view dashboard data):
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI
NEXTAUTH_SECRET=<random>
```

**Run:**
```bash
npx next dev --webpack    # Turbopack is broken (workspace root detection)
```

**Dev auth bypass** — `src/proxy.ts` checks `NODE_ENV === "development"` and skips login (no need for `GOOGLE_CLIENT_ID/SECRET` in dev)

## 🚀 Production / Vercel

- **Hobby plan = daily cron only** — `sync-bl-status` (every 5 min) was moved to **cron-job.org**, no longer in `vercel.json`
- **Login allowlist** — env `ALLOWED_EMAILS` (comma-separated) — checked in the NextAuth `signIn` callback
- **OAuth redirect URI** — must add in Google Cloud Console: `https://<vercel-domain>/api/auth/callback/google`
- **NEXTAUTH_URL is unset** — Vercel auto-detects from `VERCEL_URL`

## 📚 Other docs to read

| File | When to read |
|---|---|
| [`PROGRESS.md`](PROGRESS.md) | Before changing any feature — has full Sheet schema, migration history, known issues |
| [`USER_GUIDE.md`](USER_GUIDE.md) | To understand user workflow (how data is entered in Sheet, how reminders fire) |
| [`src/types/index.ts`](src/types/index.ts) | All TypeScript interfaces |
| `node_modules/next/dist/docs/` | Before writing Next.js 16 code |

## 🎯 Conventions

- **URL period state** — every page reads `?from=YYYY-MM&to=YYYY-MM` from search params, then passes it down to server actions
- **`detectDataBoundary()`** — auto-detects the data range from the Sheet; never hardcode years
- **Period picker** appears in the header on every page, wrapped in `<Suspense>`
- **Comments** — only when the WHY is non-obvious (workarounds, hidden constraints). Don't explain WHAT
- **base-ui DropdownMenu** — never put interactive elements inside; use a custom popover instead
- **Auto-match logic** — to change how installments get marked Paid, see [`src/lib/bl-parser.ts`](src/lib/bl-parser.ts) `autoMatchWithIncome()` (greedy fill, oldest-first, per project)

## 🔗 Live resources

- **Production:** https://magic-financial-dashboard-v1.vercel.app
- **Spreadsheet:** https://docs.google.com/spreadsheets/d/1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI
- **Repo:** https://github.com/gzeeddestiny/magic_financial_dashboard
