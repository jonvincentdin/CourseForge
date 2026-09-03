# ARCHITECTURE.md

## Framework

Next.js 15 (App Router), TypeScript, React 18.

**Deliberately pinned below "latest".** `create-next-app@latest` at the
time this was built resolved to a Next.js 16 prerelease with breaking
changes from the stable API surface, and `prisma@latest` resolved to
an 8.0.0 release candidate. Both were downgraded to their newest
*stable* line (Next 15.5.x) for reliability across a long-running,
multi-session build. Revisit this pin deliberately, not by accident —
see `DECISIONS.md`.

## Frontend architecture

- App Router, route groups to separate concerns without affecting
  URLs:
  - `src/app/page.tsx` — marketing landing page (public)
  - `src/app/(auth)/*` — `/login`, `/signup`, centered auth layout
  - `src/app/(app)/*` — `/dashboard` and future authenticated pages,
    behind a server-side session check in `(app)/layout.tsx`
- `src/components/ui/*` — unstyled-opinion primitives (Button, Input,
  Label, Card, Badge) that encode the design system
- `src/components/marketing/*` — landing-page-only components
- `src/components/app/*` — authenticated-shell components (nav,
  sign-out)
- `src/components/auth/*` — login/signup forms (client components;
  everything else defaults to server components)

## Backend architecture

- Next.js Route Handlers under `src/app/api/*` for anything that isn't
  natively a Server Action.
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js handlers
- `src/app/api/auth/signup/route.ts` — credential account creation
- No separate backend process. Postgres is accessed directly via
  Drizzle from route handlers / server components — no ORM-over-HTTP
  layer.

## Routing

| Route | Access | Status |
|---|---|---|
| `/` | Public | Built |
| `/login` | Public (redirects away if signed in) | Built |
| `/signup` | Public (redirects away if signed in) | Built |
| `/dashboard` | Authenticated | Built — shows real syllabus data when it exists |
| `/syllabi` | Authenticated | Built |
| `/syllabi/upload` | Authenticated | Built |
| `/syllabi/[id]` | Authenticated, ownership-checked | Built |
| `/syllabi/[id]/review` | Authenticated, ownership-checked | Built |
| `/courses` | Authenticated | Not built (Milestone 8) |
| `/generate` | Authenticated | Not built (Milestone 5/6) |
| `/settings` | Authenticated | Not built (Milestone 6) |
| `/share/[token]` | Public, server-authorized | Not built (Milestone 9) |

The authenticated nav (`AppNav`) still links to `/courses`,
`/generate`, `/settings` as forward references — they will 404 until
their milestones land.

## API architecture

REST-ish JSON route handlers, not a formal API framework. Input
validated with `zod` at the handler boundary before touching the
database (see `src/app/api/auth/signup/route.ts` for the pattern to
follow).

## Authentication architecture

Auth.js v5 (`next-auth@beta`), Credentials provider (email + bcrypt
password hash), JWT session strategy (required for the Credentials
provider), `DrizzleAdapter` for account/session persistence.

Split into two files for edge-runtime compatibility:
- `src/lib/auth.config.ts` — edge-safe: pages, session strategy, the
  `authorized()` redirect logic, the `session()` callback. No DB
  driver, no bcrypt. This is what `src/middleware.ts` imports.
- `src/lib/auth.ts` — full config: spreads `authConfig`, adds the
  `DrizzleAdapter` and the `Credentials` provider (which does need the
  DB + bcrypt). Exports `handlers`, `auth`, `signIn`, `signOut`. This
  is what route handlers and server components import.

Route protection: `src/middleware.ts` runs `NextAuth(authConfig).auth`
against every route except static assets; `authorized()` in
`auth.config.ts` decides per-path whether to require a session.
Protected server layouts (`(app)/layout.tsx`) additionally call
`auth()` and redirect server-side — defense in depth, not just
middleware.

## AI architecture

Not built. See `AI_GENERATION.md`.

## Course architecture

Not built. See `COURSE_SCHEMA.md`.

## Sharing architecture

Not built. See `SHARING.md`.

## Syllabus architecture (Milestone 2)

`src/lib/syllabus-service.ts` is the single place that orchestrates
upload/reprocess: validate → save the original file
(`src/lib/storage.ts`) → extract text (`src/lib/pdf.ts`) → detect
structure (`src/lib/syllabus-extraction.ts`) → persist. Route handlers
under `src/app/api/syllabi/**` stay thin wrappers around this service
plus an ownership check (`getOwnedSyllabus`) — every mutation route
re-derives ownership from the session, never trusts a client-supplied
syllabus/subject id on its own. This was exercised live: a second real
account gets a `404` from both the page and the API when it tries to
reach the first account's syllabus.

## File structure (current)

```
src/
  app/
    page.tsx                      marketing landing
    layout.tsx                    root layout, fonts, metadata
    globals.css                   design tokens (Tailwind 4 @theme)
    (auth)/
      layout.tsx
      login/page.tsx
      signup/page.tsx
    (app)/
      layout.tsx                  session gate
      dashboard/page.tsx
      syllabi/
        page.tsx                  library
        upload/page.tsx
        [id]/page.tsx             detail (grouped by year/semester)
        [id]/review/page.tsx      review/edit
    api/
      auth/[...nextauth]/route.ts
      auth/signup/route.ts
      syllabi/route.ts                                  POST (upload)
      syllabi/[id]/route.ts                              PATCH, DELETE
      syllabi/[id]/finalize/route.ts                     POST
      syllabi/[id]/reprocess/route.ts                    POST
      syllabi/[id]/subjects/route.ts                     POST
      syllabi/[id]/subjects/[subjectId]/route.ts         PATCH, DELETE
  components/
    ui/                           button, input, label, card, badge
    marketing/                    navbar, hero-visual
    app/                          app-nav, sign-out-button
    auth/                         login-form, signup-form
    syllabi/                      upload-form, review-form, subject-row,
                                   add-subject-form, status badge,
                                   delete/reprocess buttons
  db/
    schema.ts                     user/account/session/verification_token,
                                   syllabus, subject
    index.ts                      Drizzle client
    migrations/                   generated by drizzle-kit (none generated yet — see DATABASE.md)
  lib/
    auth.ts / auth.config.ts
    password.ts                   bcrypt hash/verify
    utils.ts                      cn()
    storage.ts                    file storage abstraction (local disk)
    pdf.ts                        PDF text extraction (unpdf)
    file-validation.ts            upload validation
    syllabus-extraction.ts        heuristic structure detection
    syllabus-service.ts           upload/reprocess/delete orchestration
  types/
    next-auth.d.ts                session.user.id augmentation
drizzle.config.ts
.env.example
```
