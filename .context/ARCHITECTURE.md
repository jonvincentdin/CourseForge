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
  - `src/app/(app)/*` — `/dashboard` and every other authenticated
    page, behind a server-side session check in `(app)/layout.tsx`
  - `src/app/share/*` (Milestone 9) — the public shared-course shell,
    deliberately **outside** both groups: `(app)`'s layout would
    redirect anonymous visitors to `/login`
- `src/components/ui/*` — unstyled-opinion primitives (Button, Input,
  Label, Card, Badge, and since Milestone 8 Select, ConfirmDialog,
  ActionMenu; since Milestone 9 the base Dialog that ConfirmDialog is
  built on) that encode the design system
- `src/components/marketing/*` — landing-page-only components
- `src/components/app/*` — authenticated-shell components (nav, nav
  links, sign-out)
- `src/components/auth/*` — login/signup forms (client components;
  everything else defaults to server components) and the pure
  `auth-callback.ts` helpers
- `src/components/share/*` (Milestone 9) — shared-page client pieces:
  Add to My Courses, Start learning, the header's Sign in / Create
  account links

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
| `/login` | Public (redirects away if signed in — to a sanitised `callbackUrl` since Milestone 9, else `/dashboard`) | Built |
| `/signup` | Public (same redirect rule as `/login`) | Built — honours a sanitised `callbackUrl` after creating the account |
| `/dashboard` | Authenticated | Built — shows real syllabus data when it exists |
| `/syllabi` | Authenticated | Built |
| `/syllabi/upload` | Authenticated | Built |
| `/syllabi/[id]` | Authenticated, ownership-checked | Built |
| `/syllabi/[id]/review` | Authenticated, ownership-checked | Built |
| `/generate` | Authenticated | Built — chooser/redirect across ready syllabi |
| `/generate/[id]` | Authenticated, ownership-checked, `ready`-only | Built — year/semester/subject selection |
| `/generate/[id]/prompt` | Authenticated, ownership-checked | Built — generation settings, per-subject AI prompt + copy + JSON import |
| `/courses` | Authenticated | Built — course library: search, source/progress filters, sort, "Show older versions", sharing badges, per-card Share/Regenerate/Export/Delete menu |
| `/courses/[id]` | Authenticated, ownership-checked | Built — real learning experience (module nav, progress bar, interactive quizzes with server-side grading), plus source/version metadata (copy provenance for Course Copies), a versions disclosure, and Share/Regenerate/Export/Delete header actions. `?share=1` opens the share dialog on load |
| `/courses/[id]/regenerate` | Authenticated, ownership-checked | Built — regeneration settings (depth, focus, objectives) + Direct AI or External AI prompt/JSON; an explanatory state when the source subject/syllabus is gone |
| `/settings` | Authenticated | Built — AI provider configuration |
| `/shared` | Authenticated | Built (Milestone 9) — "Shared with me": private-share invites for your email, with your own progress |
| `/share/[token]` | Public, authorized server-side on every request | Built (Milestone 9) — shared course page: link-not-valid / private-sign-in / access-restricted / course states, owner banner, Add to My Courses, the normal viewer against the share API. `noindex`, `no-referrer` |

`GET /api/courses/schema` is deliberately **public/unauthenticated** —
static format documentation, not user data.

Course API routes added or changed in Milestone 8:

| Route | Behaviour |
|---|---|
| `DELETE /api/courses/[id]` | Deletes one owned course version. `401` / `404 {error:"Course not found."}` / `200 {ok:true}` |
| `POST /api/courses/[id]/regenerate` | Body `{depth, includeLearningObjectives, focus?}` (zod). Accepts no subject/syllabus ids — the source comes from the owned course in the URL. `404` not owned, `409` source unlinked, `400`/`422`/`502` from generation, `201 {course}` on success |
| `POST /api/courses/import` | Now also accepts optional `regenerateFromCourseId` (uuid) — imports the pasted JSON as the next version of that owned course |
| `POST /api/courses/generate` | Request/response unchanged; now a thin wrapper over `generateCourseWithAI`, and optionally accepts `focus` |
| `GET /api/courses/[id]/export` | `?format=json` (default, unchanged) or `?format=markdown` (`text/markdown; charset=utf-8`, `.md` attachment); any other format → `400` |

Sharing API routes added in Milestone 9 (details and status codes in
`SHARING.md`):

| Route | Behaviour |
|---|---|
| `GET` / `PATCH /api/courses/[id]/share` | Owner only. Read settings / set `{visibility}` (creates the token if missing). `401` / `404` not owned / `400` bad visibility |
| `POST /api/courses/[id]/share/reset-link` | Owner only. Rotates the token |
| `POST` / `DELETE /api/courses/[id]/share/people` | Owner only. Add `{email}` (`400` invalid / own email / over 100) / remove `?email=` |
| `POST /api/share/[token]/copy` | Add to My Courses. Body ignored. `401` anonymous, `404` bad token, `403` not allowed, `400` owner, `409 {existingCourseId}` duplicate, `201 {course:{id,title}}` |
| `POST /api/share/[token]/modules/[moduleId]/quiz-attempt` | Session optional. `{results, score, total, saved}`; `404 "Module not found."` for any access failure |
| `POST /api/share/[token]/modules/[moduleId]/complete-lesson` | Signed-in viewers only (`401` otherwise) |

Every route the authenticated nav (`AppNav`) links to now exists —
`/settings` was the last forward reference and Milestone 6 built it;
Milestone 9 added `/shared` together with its nav link.

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
middleware. `/share/*` is public on both counts: middleware lets it
through, and it isn't under `(app)`. Its pages call `auth()` only to
learn *who* is asking, then authorize through the share gate.

**Post-auth redirects (Milestone 9).** Every `callbackUrl` goes through
`safeCallbackUrl` (`src/lib/safe-redirect.ts`, pure and edge-safe).
That covers the login form, the signup form, and `authorized()`'s
already-signed-in redirect away from `/login`/`/signup`. Anything that
isn't unambiguously a same-origin path falls back to `/dashboard`.
`src/components/auth/auth-callback.ts` keeps the callback on the
login ↔ signup cross-links and swaps in context copy when the
destination is a shared course.

## AI architecture (Milestone 6)

`src/lib/ai/types.ts` defines the provider-agnostic contract
(`AIProvider`: `testConnection`, `generateCompletion`).
`src/lib/ai/providers/{anthropic,openai}.ts` are the two current
implementations; `src/lib/ai/index.ts`'s `AI_PROVIDERS` map is the
single registry everything else reads from. `src/lib/encryption.ts` is
the only place a plaintext API key is ever encrypted/decrypted;
`src/lib/ai-config-service.ts` wraps it with DB access and marks the
decrypt path (`getDecryptedConfigForUser`) explicitly internal-only.
`generateCourseWithAI` in `src/lib/course-generation-service.ts`
(extracted from the Milestone 6 route in Milestone 8) is the only
caller of that internal path — it builds the same prompt Milestone 5's
UI shows the user, calls the provider, and feeds the raw response
through the same `importCourseFromJson` pipeline as every other import
path, tagged `source: "generated"`. `POST /api/courses/generate` and
`POST /api/courses/[id]/regenerate` are both thin HTTP wrappers over
it. See `AI_GENERATION.md` for what was and wasn't
live-verified (Anthropic: yes, against a real API call; OpenAI: code
matches the real API shape but wasn't network-reachable to verify).

## Learning experience architecture (Milestone 7)

The server→client boundary is the load-bearing design decision here:
`src/lib/quiz-client-types.ts`'s `sanitizeQuestionForClient` strips
`correctAnswer` and `explanation` before any question data reaches a
client component — verified live by grepping the actual rendered page
HTML for both, finding zero occurrences. The real values only travel
back to the client inside a grading *response*, per-question, after
the user has already submitted an answer for that question.
`src/lib/quiz-grading.ts` is the only place grading logic exists — it
runs exclusively server-side inside
`POST /api/courses/[id]/modules/[moduleId]/quiz-attempt`, which
ignores any client-supplied score entirely and always re-derives it
from the real `quiz_question` rows (verified live by submitting a
forged score and confirming the server discarded it and re-graded from
scratch). `src/lib/progress-service.ts` owns all progress reads/writes
and re-verifies module→course ownership on every call
(`assertOwnedModule`) before touching `module_progress` — the same
ownership-re-derivation pattern used everywhere else in the app.
`CourseViewer` (client) holds the active-module and progress state;
`ModuleQuiz` (client) is a controlled, per-question-type input UI that
POSTs answers and renders the graded response.

## Course architecture (Milestone 4, extended in Milestones 5–7)

`src/lib/course-schema.ts` defines the versioned JSON schema (zod) and
is the single source of truth every generation path (Milestone 4's
manual import, Milestone 5's external-AI-prompt path, Milestone 6's
direct-AI path) must satisfy — none of them define their own parallel
validation. `buildCoursePrompt` (`src/lib/prompt-generator.ts`) is
shared unchanged between Milestones 5 and 6 — the only difference
between "copy this into ChatGPT" and "generate directly" is who sends
the prompt to the AI and who pastes the response back.
`getCourseJsonSchema()` derives a real JSON Schema from the same zod
schema via `z.toJSONSchema()` — nothing that could drift out of sync.
`src/lib/course-service.ts` orchestrates: parse (defensively stripping
a Markdown code fence if present — common in real AI output) →
validate → (if provenance supplied) re-verify ownership → persist
inside one `db.transaction`. `courseToExportJson` is the exact
inverse, used by the export route — verified live to round-trip
cleanly through the same validator.

## Course management architecture (Milestone 8)

**Versioning model.** Every course row carries `version_group_id` and
`version`. A brand-new course roots its own group (group id == its own
id, `version = 1`). Regeneration never updates or deletes anything: it
inserts a new course row in the same group with `version = max(version
in group) + 1`. `versionGroupId` is deliberately not a foreign key, so
deleting any version — including the root — leaves the others intact.
See `DATABASE.md` and `DECISIONS.md`.

**Service layer** (`src/lib/course-service.ts`):

- `importCourseFromJson` gained `regenerateFromCourseId`. When set,
  provenance (subject, syllabus, version group) is re-derived from the
  owned source course via `getRegenerationSource`; any
  client-supplied `subjectId`/`syllabusId` is ignored. Not owned →
  `{ ok: false, errors: ["Course not found."] }`.
- `persistImportedCourse` computes the next version inside the same
  `db.transaction` as the inserts, after taking
  `pg_advisory_xact_lock(hashtext(versionGroupId))`, so two
  regenerations of one course finishing together serialise instead of
  colliding. The `unique(version_group_id, version)` constraint is the
  backstop. (Not exercised under real concurrency — see
  `MILESTONES.md`.)
- `listCourseLibrary(userId)` — everything `/courses` needs in
  parallel queries that don't grow with library size: courses +
  provenance joins + window functions for
  `versionCount`/`isLatestVersion`, one `GROUP BY` for module and
  completed-module counts (same "done" rule as `progress-service`),
  and since Milestone 9 a third `GROUP BY` counting each course's
  `course_permission` rows (`sharedPeopleCount`). `LibraryCourse` also
  gained `visibility` and `originalCreatorName`.
  The syllabus/subject joins carry the same ownership conditions as
  `getRegenerationSource`, so `canRegenerate` on a card and the
  regenerate page can't disagree.
- `getCourseVersions` — all versions in an owned course's group,
  highest first, still filtered by owner (a group id is not a
  capability).
- `deleteOwnedCourse` — ownership is part of the `DELETE`'s own
  `WHERE`, not a separate check-then-delete.
- `getRegenerationSource` — `null` if not owned; `subject`/`syllabus`
  are `null` unless the syllabus is still the user's and the subject
  is still inside that syllabus. Stored ids are provenance, re-verified
  every time.
- Every course-id lookup short-circuits malformed (non-uuid) ids to
  "not found" (`404`) instead of letting Postgres throw (`500`).

**Generation** (`src/lib/course-generation-service.ts`):
`generateCourseWithAI` resolves an owned subject/syllabus first (from
ids, or from the source course when regenerating — `404` before any
AI-config lookup, `409` if the source is unlinked), then AI config →
provider → `importCourseFromJson`. See `AI_GENERATION.md`.

**Export** (`src/lib/course-markdown-export.ts`): a pure formatter
(type imports only, no DB) — the route does the ownership-checked
load, this only formats. See `COURSE_SCHEMA.md` for the format.

**UI.** `/courses` is a server page that calls `listCourseLibrary`
once and hands the list to the client `CourseLibrary`, which filters,
searches, and sorts in the browser via the pure
`src/lib/course-library-filter.ts`. Deletes go to the API followed by
`router.refresh()`, so the server stays the source of truth.
`/courses/[id]` keeps `CourseViewer` untouched and adds
`CourseHeaderActions` (client) and `CourseVersions` (server, native
`<details>`). `/courses/[id]/regenerate` is a server page that renders
either an explanatory card or `RegenerateCourseForm` (client).
`DeleteCourseDialog` wraps `ConfirmDialog` and is shared by the
library cards and the course header. `LocalDate` renders dates in the
viewer's time zone after hydration. See `UI_UX.md`.

## Sharing architecture (Milestone 9)

Full behaviour is in `SHARING.md`. The structure:

**One gate.** `resolveSharedCourseAccess(token, viewerUserId)` in
`src/lib/sharing-service.ts` is the only place that decides whether a
share request may see a course. It returns `invalid` /
`sign_in_required` / `forbidden` / `allowed`. It's called by the share
page (once per request, deduped between `generateMetadata` and the page
with React `cache`), by `getSharedCourse`, by
`addSharedCourseToMyCourses`, and by `progress-service`'s
`resolveSharedModule` (behind `submitSharedQuizAttempt` and
`markSharedLessonComplete`). Nothing stores an access decision, so
revocation is immediate.

**Owner-side settings** (`getShareSettings`, `updateVisibility`,
`resetShareLink`, `addPerson`, `removePerson`) put ownership in each
query's `WHERE` (or lock the owned row first, for `addPerson`). "Not
yours" and "doesn't exist" both come back as `null` → `404`.

**Loading a shared course** reuses `getOwnedCourse(course.id,
course.ownerId)` with the ids from the row the gate resolved. There's
no unscoped loader to misuse. The page strips answers with
`sanitizeQuestionForClient` and gives client components only the
token-based API base, sanitized modules, and progress.

**Viewer progress** reuses `module_progress` unchanged: rows are keyed
by the viewer's own user id. `CourseViewer` / `ModuleQuiz` take
`apiBase` and `persistence`, so the same components serve the owner
(`/api/courses/{id}`) and shared viewers (`/api/share/{token}`,
anonymous or saved).

**Course Copies** are made in one transaction: an advisory lock per
(copier, original), a duplicate check, then multi-row inserts of the
course, modules, quizzes, and questions with ids generated up front.
The copy starts its own version group, so `getCourseVersions` (which
filters by owner) can never show it the original owner's other
versions.

**Pure helpers** live in `src/lib/sharing-utils.ts` (email
normalisation/parsing, display names, the copy-provenance label,
`logShareError`) and `src/lib/share-token.ts` (token generation and
format check, server-only), both unit-tested. `next.config.ts`
`headers()` adds `Referrer-Policy: no-referrer` and
`X-Robots-Tag: noindex, nofollow` to `/share/*` and `/api/share/*`.

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
        page.tsx                  course library (search/filter/sort,
                                   versions, per-card actions)
        [id]/page.tsx             course viewer + source/version
                                   metadata, versions, header actions
        [id]/regenerate/page.tsx  regeneration settings + Direct AI /
                                   External AI prompt + JSON
      shared/
        page.tsx                  "Shared with me" (Milestone 9)
      settings/
        page.tsx                  AI provider configuration
    share/                        public — outside (auth) and (app)
      layout.tsx                  light header (wordmark, Sign in /
                                   Create account or My Courses),
                                   noindex + no-referrer metadata
      [token]/page.tsx            shared course page: access states,
                                   owner banner, Add to My Courses,
                                   CourseViewer against /api/share
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
      courses/[id]/route.ts                              DELETE
      courses/[id]/regenerate/route.ts                   POST
      courses/[id]/export/route.ts                       GET (?format=json|markdown)
      courses/schema/route.ts                            GET (public)
      courses/generate/route.ts                          POST
      courses/[id]/modules/[moduleId]/complete-lesson/route.ts   POST
      courses/[id]/modules/[moduleId]/quiz-attempt/route.ts      POST
      courses/[id]/share/route.ts                        GET, PATCH (owner)
      courses/[id]/share/reset-link/route.ts             POST (owner)
      courses/[id]/share/people/route.ts                 POST, DELETE (owner)
      share/[token]/copy/route.ts                        POST (Add to My Courses)
      share/[token]/modules/[moduleId]/quiz-attempt/route.ts     POST (session optional)
      share/[token]/modules/[moduleId]/complete-lesson/route.ts  POST (signed in)
      ai-config/route.ts                                 GET, POST, DELETE
      ai-config/test/route.ts                            POST
  components/
    ui/                           button, input, label, card, badge,
                                   select, dialog (Dialog +
                                   ConfirmDialog), menu (ActionMenu)
    marketing/                    navbar, hero-visual
    app/                          app-nav, app-nav-links,
                                   sign-out-button
    auth/                         login-form, signup-form,
                                   auth-callback (pure helpers)
    syllabi/                      upload-form, review-form, subject-row,
                                   add-subject-form, status badge,
                                   delete/reprocess buttons
    generate/                     subject-selector, course-prompt-generator
                                   (settings), subject-prompt-panel,
                                   import-course-form, direct-generate-panel,
                                   generation-progress (shared staged
                                   checklist)
    courses/                      markdown-content (sanitized renderer),
                                   course-viewer, module-quiz,
                                   course-library, course-header-actions,
                                   course-versions, delete-course-dialog,
                                   regenerate-course-form, local-date,
                                   share-course-dialog
    share/                        add-to-my-courses, start-learning-button,
                                   share-auth-links
    settings/                     ai-config-form
  db/
    schema.ts                     user/account/session/verification_token,
                                   syllabus, subject, course, course_module,
                                   quiz, quiz_question, ai_provider_config,
                                   module_progress, course_permission
    index.ts                      Drizzle client
    migrations/                   generated by drizzle-kit (0000: M1/M2 tables,
                                   0001: M4, 0002: M6, 0003: M7, 0004: M8
                                   course versioning, hand-edited backfill,
                                   0005: M9 sharing)
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
    course-service.ts             import/export orchestration, library,
                                   versions, delete, regeneration source
    course-generation-service.ts  direct-AI pipeline shared by generate
                                   and regenerate
    course-markdown-export.ts     pure course → Markdown formatter
    course-library-filter.ts      pure library search/filter/sort +
                                   progress/source labels
    prompt-generator.ts           syllabus-grounded AI prompt builder
                                   (+ CourseFocus since Milestone 8)
    *.test.ts                     vitest unit tests (pure logic only)
    encryption.ts                 AES-256-GCM for AI API keys
    ai-config-service.ts          save/read/delete AI config (the only
                                   place decrypted keys exist besides
                                   a provider's own outbound call)
    ai/
      types.ts                    AIProvider contract
      index.ts                    provider registry
      providers/anthropic.ts
      providers/openai.ts
    quiz-grading.ts                server-side-only grading for all 4
                                    question types
    progress-service.ts            lesson/quiz progress reads+writes,
                                    ownership re-verified on every call;
                                    shared-viewer variants re-run the
                                    share gate (Milestone 9)
    quiz-client-types.ts           strips correctAnswer/explanation
                                    before any question data reaches
                                    the client
    sharing-service.ts             share settings, the share access
                                    gate, Course Copies, Shared with me
    sharing-utils.ts               pure: email normalisation, display
                                    names, copy label, logShareError
    share-token.ts                 CSPRNG token generation + format
                                    check (server-only)
    safe-redirect.ts               safeCallbackUrl (open-redirect guard)
  types/
    next-auth.d.ts                session.user.id augmentation
drizzle.config.ts
next.config.ts                    /share + /api/share response headers
vitest.config.ts                  node environment, `@` → ./src alias
.env.example
```
