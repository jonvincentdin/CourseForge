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
# also set ENCRYPTION_KEY (openssl rand -base64 32) — see below
npm run db:migrate   # apply the committed migrations (0000–0005)
npm test             # unit tests, no database needed
npm run dev
```

## Environment variables

See `.env.example`. Read by the app today:

| Variable | Since | Notes |
|---|---|---|
| `DATABASE_URL` | Milestone 1 | Postgres connection string |
| `AUTH_SECRET` | Milestone 1 | `npx auth secret` |
| `NEXTAUTH_URL` | Milestone 1 | base URL for Auth.js redirects (read by Auth.js itself, not app code) |
| `STORAGE_DIR` | Milestone 2 | where syllabus PDFs go; defaults to `./storage` |
| `ENCRYPTION_KEY` | Milestone 6 | encrypts saved AI API keys; must differ from `AUTH_SECRET`. Without it, saving an AI config and every direct generation/regeneration with a saved key throws |

Milestones 8 and 9 added no environment variables. `npm test` needs
none of them — the unit tests never touch the database. Share links
are built from `window.location.origin` in the browser, so there's no
base-URL setting for them either.

## Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript` via `FlatCompat`) |
| `npm test` | `vitest run` — unit tests (Milestone 8) |
| `npm run db:generate` | Generate a SQL migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:push` | Push schema directly without a migration file (fine for early/local dev, not for shared environments) |
| `npm run db:studio` | Drizzle Studio, a GUI for the database |

## Testing

**Vitest** (Milestone 8), `npm test` → `vitest run`. Pinned to
**`^3.2.7`**, not the latest major: vitest 5 requires
`@types/node >= 22`, and this project pins `@types/node ^20` — see
`DECISIONS.md` before bumping either.

`vitest.config.ts`: `environment: "node"`, includes
`src/**/*.test.ts`, and aliases `@` → `./src` to mirror `tsconfig`'s
`@/*` paths. Tests sit next to the module they test.

Scope is **pure logic only** — nothing touches the database, so
there's no test DB to provision. Current suite, **95 tests in 5 files,
all passing** (42 in 3 files at the end of Milestone 8):

| File | Covers |
|---|---|
| `src/lib/course-library-filter.test.ts` (21) | progress status/percent/label, source labels (including the copy's "· by {creator}"), search/filter/sort/older-version rules, `hasActiveFilters` |
| `src/lib/course-markdown-export.test.ts` | heading shifting (incl. code fences and unclosed fences), document structure, answer keys for all 4 question types, option labels, export filenames |
| `src/lib/prompt-generator.test.ts` | omitted vs. `full` focus give identical output with no Focus section; topics/exam sections (placement, fencing, backtick neutralising); `courseFocusSchema` trims and rejects empty/oversized topics and unknown kinds |
| `src/lib/safe-redirect.test.ts` (28, Milestone 9) | `safeCallbackUrl`: same-origin paths keep query + hash, the share page's encoded callback round-trips, dot segments normalise, 22 parametrised hostile inputs fall back (protocol-relative, backslash variants, absolute/`javascript:`/`data:` URLs, tab/newline/NUL/DEL smuggling, percent-encoded slashes/backslash/tab, malformed `%`, empty), non-strings, overlong input, custom fallback |
| `src/lib/sharing-utils.test.ts` (23, Milestone 9) | share tokens (32 base64url chars decoding to 24 bytes, 2,000 generated with no repeats, malformed shapes and non-strings rejected), email normalisation and parsing, owner display names never falling back to anything but "A CourseForge student", the copy-provenance label |

Everything with a database or HTTP in it is still verified by live
checks against a real Postgres and a real server (see `MILESTONES.md`
for each milestone's list). Good next candidates for unit tests:
`src/lib/syllabus-extraction.ts`, `src/lib/quiz-grading.ts`, and
`src/lib/course-schema.ts`'s validator — all pure, all currently
covered only by live checks.

The static checks used to sign off Milestones 8 and 9: `npx tsc
--noEmit`, `npx eslint src`, `npm run build`, `npm test` — all clean.
Sharing's database and HTTP behaviour (63 checks) was verified live,
not by unit tests; see `MILESTONES.md`.

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
- No browser `confirm()`/`alert()`/`prompt()` in new UI (Milestone 8
  onward): use `ConfirmDialog` (`src/components/ui/dialog.tsx`) for
  confirmations and inline `role="alert"`/`role="status"` messages
  for results. See `UI_UX.md`.
- Keep formatting/filtering logic that a client component needs in a
  pure, DB-free module under `src/lib/` with a `*.test.ts` beside it
  (the Milestone 8 pattern: `course-library-filter.ts`,
  `course-markdown-export.ts`, `prompt-generator.ts`; Milestone 9 added
  `sharing-utils.ts` and `safe-redirect.ts`). Don't import a
  `*-service.ts` module from a client component. Those pull in the
  database; import the pure helper directly (or `import type`).
- Never push or redirect to a raw `callbackUrl` or any other
  user-supplied URL. Run it through `safeCallbackUrl`
  (`src/lib/safe-redirect.ts`).
- Never log a share token. In `/api/share` routes, log unexpected
  errors with `logShareError` only (see `SECURITY.md`).

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
- Both Milestone 1 and 2 were, in a later session, verified live
  against a real local Postgres 16 instance and a real running dev
  server (not just `tsc`/`eslint`/`next build`) — signup, login,
  session, route protection, full syllabus upload/extract/review/
  finalize/reprocess/delete, and cross-user data isolation were all
  exercised with real HTTP requests. Milestones 3, 4, and 5 continued
  the same practice: real multi-year PDF extraction, real course JSON
  import with a verified export round-trip, two real XSS payloads
  confirmed neutralized in actual rendered output, and a real
  generated prompt confirmed grounded in real DB-backed data.
  Milestone 6 made a real HTTP call to `api.anthropic.com` with a
  deliberately invalid key and verified the entire encryption/
  error-handling pipeline against a genuine external API rejection.
  Milestone 7 verified the two properties that actually matter for a
  quiz feature: that answers can't be read early (grepped rendered
  HTML for explanation text and the `"correctAnswer"` key — zero
  hits) and that scores can't be faked (submitted a forged score,
  confirmed the server discarded it and re-graded for real). If
  you're picking this project up fresh, `apt-get install postgresql`,
  `service postgresql start`, `createdb courseforge`,
  `npm run db:migrate` (there are now six migration files — `0000`
  from Milestones 1/2, `0001` from Milestone 4, `0002` from Milestone
  6, `0003` from Milestone 7, `0004` from Milestone 8, `0005` from
  Milestone 9) gets you a
  working local database fast for the same kind of verification. Set a
  real `ENCRYPTION_KEY` before testing anything AI-config-related, or
  `saveAiConfig`/`decryptSecret` will throw. Milestone 8 went a step
  further than earlier milestones: its 34 live checks ran against a
  production build (`npm run build` + `npm run start`), not the dev
  server, with two real accounts, and migration `0004` was applied to
  a database that already held course rows to prove its backfill.
  Milestone 9 did the same with four real clients (owner, viewer,
  invitee, anonymous): 63 checks, plus a re-run of Milestone 8's 34.
  Migration `0005` was applied to a database holding 8 courses.
  Plain `fetch` with a hand-rolled cookie jar and `redirect: "manual"`
  was enough to drive the Auth.js credentials flow (CSRF token → POST
  `/api/auth/callback/credentials`) for each account.
- **Migration `0004` is hand-edited.** drizzle-kit generated a
  `NOT NULL` column add that fails on any database with existing
  courses; the committed file adds `version_group_id` nullable,
  backfills it, then sets `NOT NULL` (see `DATABASE.md`). If you
  regenerate migrations, check it still does that. `drizzle-kit
  generate` doesn't connect to the database, but it does need
  `DATABASE_URL` set to *some* Postgres URL string.
- **Don't run `next build`/`next start` while `next dev` is running in
  the same checkout.** They share the `.next` directory and corrupt
  each other. The symptom is `Cannot read properties of undefined
  (reading 'call')` from `webpack-runtime`. Stop the dev server first
  (and delete `.next` if it's already broken), or build from a
  separate copy of the repo.
