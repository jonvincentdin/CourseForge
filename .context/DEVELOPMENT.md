# DEVELOPMENT.md

## Prerequisites

- Node.js 20+ (built and tested against Node 22)
- A Postgres database (local via Docker, or a hosted instance)

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in DATABASE_URL and AUTH_SECRET in .env.local
npx auth secret   # generates and writes AUTH_SECRET for you
npm run db:push   # push the schema to your database (no migrations yet — see below)
npm run dev
```

## Environment variables

See `.env.example`. As of Milestone 1: `DATABASE_URL`, `AUTH_SECRET`,
`NEXTAUTH_URL`. Nothing else is read by the app yet — the
`ENCRYPTION_KEY` line is a placeholder comment for Milestone 6, not a
variable the app currently uses.

## Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript` via `FlatCompat`) |
| `npm run db:generate` | Generate a SQL migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:push` | Push schema directly without a migration file (fine for early/local dev, not for shared environments) |
| `npm run db:studio` | Drizzle Studio, a GUI for the database |

## Testing

No automated tests yet. Milestone 1 was verified manually via
`tsc --noEmit`, `eslint .`, and `next build` (see `DECISIONS.md` for
the one build-environment caveat around font fetching). Add a real
test setup (Vitest is already available as a transitive dependency,
but not configured) when there's actual business logic worth testing
— Milestone 2's syllabus-extraction logic is a good place to start.

## Build process / deployment

Standard Next.js production build (`npm run build` → `npm run start`).
No deployment target has been chosen yet (Vercel is the path of least
resistance for Next.js + this stack, but nothing here assumes it).

## Coding conventions

- Server components by default; `"use client"` only where interactivity
  requires it (forms, sign-out button).
- Validate all external input with `zod` at the boundary before it
  touches the database — see `src/app/api/auth/signup/route.ts` as
  the reference pattern.
- Tailwind utility classes via the `cn()` helper
  (`src/lib/utils.ts`) rather than manual string concatenation.
- Design tokens live in `src/app/globals.css`'s `@theme inline` block
  — don't hardcode hex colors in components; use the token classes
  (`bg-paper`, `text-ink-soft`, `border-ember`, etc.).

## Important implementation notes

- `npm` on this machine had a reproducible arborist bug
  ("Cannot read properties of null (reading 'edgesOut')") on npm
  10.9.7 when adding new packages to an existing lockfile; upgrading
  to npm 12.0.2 (`npm install -g npm@latest`) resolved it. If you hit
  the same error elsewhere, try that first before troubleshooting
  the dependency tree itself.
- The sandbox this milestone was built in blocks
  `fonts.googleapis.com`/`fonts.gstatic.com` and `binaries.prisma.sh`.
  Neither is a code problem — both are just unreachable in that
  specific environment. A normal environment with internet access
  will resolve fonts at build time without any changes.
