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
| `/generate` | Authenticated | Built — chooser/redirect across ready syllabi |
| `/generate/[id]` | Authenticated, ownership-checked, `ready`-only | Built — year/semester/subject selection |
| `/generate/[id]/prompt` | Authenticated, ownership-checked | Built — generation settings, per-subject AI prompt + copy + JSON import |
| `/courses` | Authenticated | Built — minimal list (full management is Milestone 8) |
| `/courses/[id]` | Authenticated, ownership-checked | Built — read-only structural preview (interactive learning is Milestone 7) |
| `/settings` | Authenticated | Not built (Milestone 6) |
| `/share/[token]` | Public, server-authorized | Not built (Milestone 9) |

`GET /api/courses/schema` is deliberately **public/unauthenticated** —
static format documentation, not user data.

The authenticated nav (`AppNav`) still links to `/settings` as a
forward reference — it will 404 until Milestone 6 lands.

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

## Course architecture (Milestone 4, extended in Milestone 5)

`src/lib/course-schema.ts` defines the versioned JSON schema (zod) and
is the single source of truth both the import path (built in
Milestone 4) and Milestone 5's prompt-generation path (built now) must
satisfy — Milestone 5 adds no new validation logic, only a better
front-end (`buildCoursePrompt` in `src/lib/prompt-generator.ts`) that
tells an external AI how to produce JSON that already satisfies the
Milestone 4 rules, plus `getCourseJsonSchema()` which derives a real
JSON Schema from the same zod schema via `z.toJSONSchema()` — nothing
that could drift out of sync. `src/lib/course-service.ts` orchestrates:
parse → validate → (if provenance supplied) re-verify ownership →
persist inside one `db.transaction`. `courseToExportJson` is the exact
inverse, used by the export route — verified live to round-trip
cleanly through the same validator.

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
      generate/
        page.tsx                  syllabus chooser / auto-redirect
        [id]/page.tsx             year/semester/subject selector
        [id]/prompt/page.tsx      generation settings, per-subject
                                   prompt + copy + JSON import
      courses/
        page.tsx                  minimal list
        [id]/page.tsx             read-only structural preview
    api/
      auth/[...nextauth]/route.ts
      auth/signup/route.ts
      syllabi/route.ts                                  POST (upload)
      syllabi/[id]/route.ts                              PATCH, DELETE
      syllabi/[id]/finalize/route.ts                     POST
      syllabi/[id]/reprocess/route.ts                    POST
      syllabi/[id]/subjects/route.ts                     POST
      syllabi/[id]/subjects/[subjectId]/route.ts         PATCH, DELETE
      courses/import/route.ts                            POST
      courses/[id]/export/route.ts                       GET
      courses/schema/route.ts                            GET (public)
  components/
    ui/                           button, input, label, card, badge
    marketing/                    navbar, hero-visual
    app/                          app-nav, sign-out-button
    auth/                         login-form, signup-form
    syllabi/                      upload-form, review-form, subject-row,
                                   add-subject-form, status badge,
                                   delete/reprocess buttons
    generate/                     subject-selector, course-prompt-generator
                                   (settings), subject-prompt-panel,
                                   import-course-form
    courses/                      markdown-content (sanitized renderer)
  db/
    schema.ts                     user/account/session/verification_token,
                                   syllabus, subject, course, course_module,
                                   quiz, quiz_question
    index.ts                      Drizzle client
    migrations/                   generated by drizzle-kit (0000: M1/M2 tables, 0001: M4 tables)
  lib/
    auth.ts / auth.config.ts
    password.ts                   bcrypt hash/verify
    utils.ts                      cn()
    storage.ts                    file storage abstraction (local disk)
    pdf.ts                        PDF text extraction (unpdf)
    file-validation.ts            upload validation
    syllabus-extraction.ts        heuristic structure detection
    syllabus-service.ts           upload/reprocess/delete orchestration
    course-schema.ts              versioned JSON schema (zod) + validator
                                   + real JSON Schema export
    course-service.ts             import/export orchestration
    prompt-generator.ts           syllabus-grounded AI prompt builder
  types/
    next-auth.d.ts                session.user.id augmentation
drizzle.config.ts
.env.example
```
