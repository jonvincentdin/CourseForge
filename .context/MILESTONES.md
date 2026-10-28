# MILESTONES.md

Status legend: `[ ]` not started · `[~]` in progress · `[✓]` complete
· `[!]` needs attention

A milestone is **not** `[✓]` just because UI exists for it. It's
complete when the feature works end-to-end, data persists correctly,
loading/error states exist, it's responsive, security is addressed,
existing features still work, `.context` is updated, and there's some
form of verification (tests, or at minimum a documented manual check).

---

## Milestone 1 — Foundation — `[✓]` Complete

- [x] Project setup — Next.js 15, TypeScript, Tailwind 4
- [x] Architecture — route groups, component folders, API route
      pattern established (see `ARCHITECTURE.md`)
- [x] Design system — "steel & ember" tokens, Fraunces + IBM Plex
      fonts, Button/Input/Label/Card/Badge primitives (see `UI_UX.md`)
- [x] Routing — marketing `/`, `/login`, `/signup`, protected
      `/dashboard`
- [x] Database foundation — Postgres via Drizzle, `user`/`account`/
      `session`/`verification_token` schema (see `DATABASE.md`)
- [x] Authentication foundation — Auth.js v5 Credentials provider,
      bcrypt hashing, JWT sessions, edge middleware + server-side
      redirect double-check (see `SECURITY.md`, `ARCHITECTURE.md`)
- [x] `.context` — this directory

**Verified live** (not just build-clean) in a follow-up session: a
real Postgres 16 instance, a real dev server, real HTTP requests.
Confirmed signup → credentials login → session with correct
`user.id` → `/dashboard` returns 200 authenticated / 307-redirects to
`/login` unauthenticated → authenticated visit to `/login` redirects
to `/dashboard`. This closes the verification gap flagged when
Milestone 1 was first written.

---

## Milestone 2 — Syllabus Management — `[✓]` Complete

- [x] PDF upload (drag/drop + file picker)
- [x] File validation — type, size (20MB), `%PDF-` magic-byte
      integrity check
- [x] PDF extraction — `unpdf`, verified against a real generated PDF
- [x] Syllabus storage — original PDF persisted (local filesystem
      abstraction, see `DECISIONS.md`), not just extracted text
- [x] Subject / year / semester detection — heuristic/regex-based (see
      `SYLLABUS_PROCESSING.md` for exactly what it can and can't do)
- [x] Review/edit workflow — per-field autosave, add/remove subjects,
      warnings surfaced from extraction, explicit "Save and finish"
      transition to `ready`
- [x] Syllabus library (`/syllabi`) — view / edit / delete / reprocess
- [x] Versioning — each upload is an independent record; see
      `DECISIONS.md` for why that satisfies the brief's requirement
      without a lineage/parent model

**Verified live**, not just build-clean — run against a real Postgres
instance and a real dev server with actual HTTP requests in this
session:

- Signup → login → upload a real generated PDF → correct extraction
  (5/5 subjects, correct codes/years/semesters) → PATCH a subject
  (confirmed `autoDetected` flips to `false`) → POST a manual subject
  → finalize (status → `ready`) → detail page renders → dashboard
  reflects the real syllabus instead of the empty state
- Reprocess correctly discards the manual subject and the manual edit,
  re-detecting fresh from the stored original PDF
- Delete cascades subjects and removes the file from disk (confirmed
  both in Postgres and on the filesystem)
- Cross-user isolation: a second real account gets `404` — not another
  user's data — both loading the first user's syllabus page directly
  and calling `DELETE` on their syllabus id via the API
- Invalid uploads (non-PDF content posing as a PDF, a plain-text file)
  both correctly rejected with `422` and a specific message

**Explicitly out of scope / known limitations** (do not treat as
bugs): subject detection is regex-based, not AI — it will miss or
misgroup subjects in syllabi that don't use clear "Year N" / "1st/2nd
Semester" heading conventions, which is exactly why the review step
exists and is mandatory. No PDF is ever auto-finalized as `ready`
without a human passing through review. Local-disk file storage won't
survive most deployment targets' ephemeral filesystems — flagged
already in `DECISIONS.md`, still unresolved. Delete/reprocess
confirmations use the browser's native `confirm()`, not a proper
modal — fine for Milestone 2, worth revisiting in Milestone 10. Nav
links to `/courses`, `/generate`, `/settings` still 404 — unchanged
until their milestones land.

---

## Milestone 3 — Academic Organization — `[✓]` Complete

- [x] Year selector — dynamically built from the distinct years
      actually present in a syllabus's subjects, never hardcoded
- [x] Semester selector — dynamically built per selected year, only
      showing semesters that actually have subjects
- [x] Subject selector — checkbox list, scoped to the selected
      year+semester (matches the brief's literal flow order: year →
      semester → subject(s), not a cross-group picker)
- [x] Multi-select with a live "N Subjects Selected" summary + chips
- [x] Search — filters the visible year/semester group by name or code
- [x] Filtering — Select all / Deselect all (scoped to what's visible
      under the current search) / Clear selection
- [x] Dashboard — "Generate a course" is now a real link to `/generate`
      instead of a disabled stub; per-subject "Generate course" links
      on the syllabus detail page deep-link into `/generate/[id]` with
      the right year/semester/subject pre-selected

**Verified live** against a real Postgres instance, a real dev server,
and a freshly-applied migration (not `db:push` this time — confirming
the committed migration file from Milestone 2 actually works for a
new setup):

- Uploaded a real two-year, four-semester test PDF; confirmed both
  years extracted correctly and the selector's year tabs matched
- `/generate` correctly auto-redirects straight to `/generate/[id]`
  when exactly one `ready` syllabus exists, shows a real empty state
  with zero, and shows a chooser listing both when a second syllabus
  was uploaded and finalized
- Syllabus detail page's per-subject "Generate course" links carry the
  correct `year`/`semester`/`subject` query params for every subject
  across both years — confirmed by inspecting the actual rendered
  hrefs, not just trusting the code
- `/generate/[id]` rejects a non-`ready` syllabus and a syllabus
  belonging to another user with `404` (tested with a second real
  account, same pattern as Milestone 2's isolation check)
- Dashboard's "Generate a course" CTA is a real `href="/generate"`

**Explicitly out of scope / known limitations** (do not treat as
bugs): Selection is scoped to a single year+semester at a time and
resets when you change either — cross-year/semester bundled selection
was considered and deliberately not built, since the brief's own flow
(§16) lists year → semester → subjects as sequential steps, not a
cross-cutting picker. *(Update from Milestone 4: "Continue" now
navigates into the real import flow — see below. It's no longer a
disabled stub.)*

---

## Milestone 4 — Course Data Model — `[✓]` Complete

- [x] Course schema — `course` table: owner, provenance (nullable
      `subjectId`/`syllabusId`, `set null` on delete so a course
      survives its source syllabus being deleted), title, metadata,
      `learning_objectives` (jsonb), `schema_version`, `source`
- [x] Module schema — `course_module`: title, description, learning
      objectives, `content_markdown` (plain text, not structured)
- [x] Quiz schema — `quiz` (one per module, enforced by a unique
      constraint on `module_id`) + `quiz_question` (4 types: multiple
      choice, multiple select, true/false, identification — each with
      its own `correctAnswer` shape and validation)
- [x] Markdown support — `react-markdown` + `remark-gfm`, rendered
      without `rehype-raw` as the entire XSS defense (see
      `COURSE_SCHEMA.md` and `SECURITY.md`)
- [x] JSON validation — `src/lib/course-schema.ts`, versioned
      (`schema_version: "1.0"`), specific field-path error messages
- [x] Import/export — `POST /api/courses/import` (bare paste-JSON UI;
      the polished prompt-generator UI is Milestone 5's job, not this
      one's), `GET /api/courses/[id]/export` (downloadable, round-trips
      through the app's own validator)

**Verified live**, not just build-clean — run against a real Postgres
instance, a real dev server, and (this time) migrations generated
*and* applied fresh to a brand-new database in the same session:

- Imported a real course via the actual API; confirmed every row
  (course, module, quiz, question) persisted correctly in Postgres,
  not just that the API returned `201`
- Exported that same course and re-validated the exported JSON against
  the app's own schema validator — passed with zero errors, proving
  import and export genuinely agree on the shape rather than just
  hoping they do
- Fed the validator five different malformed/invalid inputs (non-JSON,
  unsupported `schema_version`, empty Markdown, zero-question quiz, a
  `multiple_choice` `correctAnswer` that doesn't match any option) —
  every one produced the correct, specific error message
- Imported two real XSS payloads (`<script>alert(1)</script>` and
  `<img src=x onerror=alert(2)>`) and inspected the actual rendered
  HTML: both came through as inert escaped text, never as live markup
  or an executable attribute
- Cross-user isolation, extended to courses: a second real account
  gets `404` on both viewing and exporting the first account's course;
  separately, that same second account's attempt to import while
  claiming the *first* account's real syllabus id as provenance was
  correctly rejected server-side ("That syllabus doesn't belong to
  you.") — the ownership check is real, not just present in the code
- Multi-subject independence: uploaded a two-subject syllabus, and the
  `/generate/[id]/import` page rendered two separate paste-JSON forms,
  one per subject — confirming the "independent courses, never
  merged" requirement holds at the UI level, not only the DB level

**Explicitly out of scope / known limitations** (do not treat as
bugs): the import UI is a bare textarea, not the polished "copy this
prompt into ChatGPT" experience — that's Milestone 5. `/courses/[id]`
is a read-only structural preview (collapsible modules, rendered
Markdown, a quiz question-count badge) — there's no actual
quiz-taking, scoring, or progress tracking yet, that's Milestone 7.
`/courses` (the list) has no delete/search/regenerate — that's
Milestone 8, matching the same staged pattern Milestone 2 used for
`/syllabi` before Milestone 8 existed. A course's Markdown/quiz
content does not currently escape `<` and `>` characters typed
*literally as prose* (e.g. "x < y") any differently from a real tag —
that's expected Markdown behavior, not a bug, but worth knowing if a
course author writes math-like comparisons in prose without code
formatting.

---

## Milestone 5 — External AI Workflow — `[✓]` Complete

- [x] Prompt generator — `src/lib/prompt-generator.ts`, grounded in
      real subject + syllabus data (never generic), depth-aware,
      recomputes live client-side as settings change
- [x] JSON schema — real JSON Schema (draft 2020-12) generated
      directly from the Milestone 4 zod schema via zod v4's native
      `z.toJSONSchema()`, so it cannot drift from the actual validator
- [x] Prompt copying — clipboard button per subject, with a fallback
      if the clipboard API is unavailable
- [x] JSON schema download — `GET /api/courses/schema`, deliberately
      public/unauthenticated since it's static format documentation,
      not user data
- [x] JSON import — reuses Milestone 4's `importCourseFromJson`
      unchanged, now exercised through the real UI form with real
      subject/syllabus provenance for the first time
- [x] Validation — unchanged from Milestone 4, this milestone adds no
      new validation logic, only a better front-end to the same rules
- [x] Error handling — unchanged, same specific field-path errors

**Verified live**, not just build-clean — real Postgres, real dev
server, real HTTP requests in the same session:

- Generated a real prompt from real syllabus/subject rows pulled from
  Postgres and confirmed the actual embedded syllabus excerpt, subject
  fields, and `schema_version` appeared correctly in the rendered page
- Confirmed the JSON Schema download works with **zero** auth cookies
  — deliberately public, and verified it actually is
- Uploaded a real 2-subject syllabus; confirmed `/generate/[id]/prompt`
  rendered two independent prompt+import panels, one per subject
- Imported a real course through the actual UI form's code path (not
  a bypassing direct API call) and confirmed the resulting course
  correctly carried `subject_id`/`syllabus_id` provenance — Milestone
  4's own verification hadn't exercised that path, so this closes a
  real gap rather than repeating the same test
- A tampered/nonexistent subject id in the page's query string
  correctly 404s

**Explicitly out of scope / known limitations** (do not treat as
bugs): "Direct AI Generation" is shown but genuinely disabled with a
"Coming in Milestone 6" label — not hidden, not faked. Modules,
Markdown lessons, and Module quizzes in the "Include" section are
locked/required, not real toggles — unchecking any of them would
produce JSON that fails Milestone 4's own schema validation, so
offering them as working options would be dishonest. The syllabus
context embedded in each prompt is capped at 4,000 characters — for a
very long syllabus PDF this means only the first ~4,000 characters of
extracted text ground the prompt, not the whole document; revisit if
this proves too limiting in practice.

---

## Milestone 6 — Direct AI Generation — `[✓]` Complete

- [x] AI provider architecture — `src/lib/ai/`: a real `AIProvider`
      interface, two implementations (Anthropic, OpenAI), one
      registry. Adding a provider means one new file + one registry
      line, nothing else changes — verified true by construction, not
      just claimed
- [x] AI configuration — `/settings`, provider select, API key input,
      free-text model, Test Connection, Save/Replace/Remove, matching
      the product brief §37 mockup
- [x] Secure API-key encryption — AES-256-GCM
      (`src/lib/encryption.ts`), `ENCRYPTION_KEY` env var stretched via
      `scryptSync`
- [x] Course generation — `POST /api/courses/generate`, reuses the
      exact same prompt (`buildCoursePrompt`) and the exact same
      validation/persistence pipeline (`importCourseFromJson`) that
      Milestones 4/5 already built, tagged `source: "generated"`
- [x] Progress UI — staged checklist per product brief §79, honestly
      documented as client-side simulated (no real per-stage server
      signal — see `AI_GENERATION.md` for why)
- [x] AI validation — no new validation logic; the AI's raw response
      goes through the identical schema validation as any pasted JSON
- [x] Error handling — provider-specific errors (invalid key, missing
      model, rate limit) surfaced with specific, non-leaking messages;
      generation failures create zero orphaned data

**Verified live against a real provider API, not a mock** — the
strongest verification any milestone has had so far:

- Confirmed `api.anthropic.com` is actually reachable from this build
  sandbox, then made a real HTTP call with a deliberately invalid key
  and got a genuine `401` back from Anthropic's real API — not a
  simulated error
- That real rejection was correctly translated into a specific,
  non-leaking error message at every layer it passed through: the
  provider implementation, the `/api/ai-config/test` route, the
  `/api/courses/generate` route (as a `502`), and the UI
- Saved a real (fake) key through the real `/api/ai-config` endpoint
  and confirmed, by querying Postgres directly, that the stored
  `encrypted_api_key` column is genuinely unreadable ciphertext — not
  just "assumed encrypted because the code calls `encryptSecret`"
- Confirmed the key never appears in the save response, the status
  response, or the rendered `/settings` page HTML — checked all three
  with a direct string search, not just a visual skim
- Confirmed the "test my already-saved key" code path (no `apiKey` in
  the request body) correctly decrypts server-side and makes a real
  outbound call — proving the full save → store → retrieve → decrypt
  → use round-trip actually works, not just the encrypt/decrypt
  functions in isolation
- Ran a full generation attempt through the real API with the invalid
  key and confirmed it fails with the correct error and creates
  **zero** rows in `course` — no orphaned/partial data from a failed
  generation
- Cross-user isolation extended to AI config and generation: a second
  real account has no access to the first account's configuration,
  and correctly gets `404` (not an AI-related error) when attempting
  to generate against the first account's syllabus — ownership is
  checked before the AI config is ever looked up
- Confirmed removing a configuration actually deletes the database row
  (checked via a direct count query), not just flips a flag

**Explicitly out of scope / known limitations** (do not treat as
bugs): the OpenAI provider was written to match OpenAI's real API
shape but **could not be live-verified** — `api.openai.com` wasn't
reachable from this build sandbox (only `api.anthropic.com` was). If
you add real OpenAI usage, verify it the same rigorous way before
trusting it. Model selection is free text, not a curated dropdown —
see `DECISIONS.md`. No usage/cost tracking, no retry on transient
provider errors (a `429` surfaces immediately rather than
auto-retrying). Prompt injection via syllabus text is a known,
documented, not-yet-mitigated gap — see `SECURITY.md`'s "Known gap"
section; it's a content-quality risk, not a data-integrity one, since
generated output still passes through full schema validation.

---

## Milestone 7 — Learning Experience — `[✓]` Complete

- [x] Course viewer — `/courses/[id]` is now a real learning
      interface, not a structural preview: module sidebar, progress
      bar, active-module lesson panel, quiz panel
- [x] Module navigation — sidebar list with status icons (✓/→/○),
      click to switch; the viewer auto-selects the first incomplete
      module on load rather than always defaulting to module 1
- [x] Markdown renderer (sanitized) — unchanged from Milestone 4,
      reused as-is
- [x] Progress tracking — `module_progress` table (Milestone 7's only
      new table), a module counts as done when its lesson is marked
      complete **and** its quiz has been attempted at least once;
      course-level percentage is `completed / total` modules,
      genuinely computed from real rows, not estimated
- [x] Module quizzes — all 4 question types (multiple choice, multiple
      select, true/false, identification) have real input UIs and are
      graded server-side
- [x] Quiz explanations — shown per-question after submission, never
      before
- [x] Completion tracking — "Mark lesson complete" button,
      `lessonCompleted` boolean persisted per module/user

**The single most important thing this milestone had to get right —
and the thing most rigorously verified — is that a user cannot see
quiz answers before submitting, and cannot fake a score.** Both were
checked directly, not assumed:

- Fetched the actual rendered course page HTML and grepped for every
  question's explanation text and for the literal string
  `"correctAnswer"` — **zero** occurrences. The data sent to the
  client before submission (`ClientQuizQuestion` in
  `src/lib/quiz-client-types.ts`) genuinely excludes both fields; this
  isn't a client-side hide, it's server-side omission
- Submitted a request with a forged `{"score": 4, "total": 4}`
  alongside empty answers — the server ignored both fields entirely,
  re-graded from the actual submitted answers against the real
  `quiz_question` rows, and correctly returned `0/4`

**Also verified live, real Postgres, real HTTP requests:**

- Imported a real 2-module, 5-question course (all 4 question types
  represented) and confirmed correct grading on both a mixed-correct
  submission and an all-correct retake — including a case-insensitive,
  whitespace-trimmed identification match (`"  INDEXING  "` correctly
  matched `"indexing"`) and an order-independent multiple-select match
- Confirmed retaking a quiz **updates** the existing `module_progress`
  row (upsert) rather than creating a duplicate — checked via a direct
  row-count query before and after
- Marked a lesson complete, confirmed the DB row, and confirmed the
  course's progress percentage on `/courses`, the dashboard, and the
  course detail page all agreed (50% for 1-of-2 modules done) —
  computed from three different queries, not copy-pasted from one
- Confirmed the viewer correctly auto-advances to the next incomplete
  module once the current one is marked done, rather than always
  reopening module 1
- Cross-user isolation extended to the two new write endpoints: a
  second real account attempting to submit a quiz or mark a lesson
  complete against the first account's module correctly gets `404`
  ("Module not found" — not a permissions-specific message that would
  confirm the module *exists*), and zero rows were created for them

**Explicitly out of scope / known limitations** (do not treat as
bugs): no pass/fail threshold — a module counts as "done" once its
quiz has been attempted at all, regardless of score, since the brief
never specifies a passing threshold. No quiz attempt history — only
the most recent attempt's score is kept (`quizAnswers` is overwritten,
not appended to a log); revisit if "show me how I did each time"
becomes a real requirement. No time-based estimates or lesson
scroll-tracking — "complete" is purely the explicit button click. The
Milestone 8 concerns (regeneration, versioning, delete, search on
`/courses`) remain untouched by this milestone, as do all of
Milestone 9's sharing/viewer-isolation work (this milestone's
`user_id`-keyed progress table is *designed* to support that later
without a schema change, but nothing sharing-related is built yet).

---

## Milestone 8 — Course Management — `[✓]` Complete

- [x] Course library — `/courses` rebuilt from a minimal list into a
      real library (`CourseLibrary`, client): one card per course with
      title, subject-code badge, source line, Year · Semester, module
      count, progress bar + label ("Not started" / "N% Complete" /
      "Completed"), and a Start / Continue / Review primary action. All
      of it comes from `listCourseLibrary` — exactly two queries
      regardless of library size, no N+1
- [x] Search — matches title, subject code, description, and source
      syllabus title, case-insensitive; every whitespace-separated term
      must match (`src/lib/course-library-filter.ts`, pure, unit-tested)
- [x] Filtering — Source (All / Generated / Imported / Added from
      shared), Progress (Any / Not started / In progress / Completed),
      Sort (Most recent / Title A–Z / Progress), "Show older versions"
      toggle (only rendered when older versions exist). Live
      `aria-live` result count, a filtered-to-zero state with "Clear
      filters". Runs client-side over the full per-user list — see
      `DECISIONS.md`
- [x] Regeneration — `/courses/[id]/regenerate` (product brief §42):
      depth, focus (Full syllabus / Specific topics with a 500-char
      textarea + counter / Exam preparation), learning-objectives
      toggle, and either Direct AI (`POST /api/courses/[id]/regenerate`)
      or External AI prompt + JSON paste (`POST /api/courses/import` with
      `regenerateFromCourseId`). Subject/syllabus provenance is always
      re-derived server-side from the owned course, never taken from the
      client. A course whose source subject/syllabus is gone gets an
      explanatory page instead of a form, and the API returns `409`
- [x] Versioning — `course.version_group_id` + `course.version`
      (migration `0004`, hand-edited to backfill existing rows).
      Regeneration never modifies or deletes the old course: it inserts
      a new row in the same group with `version = max(version in group)
      + 1`, computed inside the insert transaction under a
      `pg_advisory_xact_lock` on the group, with a
      `unique(version_group_id, version)` backstop. Deleting an older
      version never frees its number (only deleting the newest does —
      see `DATABASE.md`). The course page shows a "N versions of this
      course" disclosure; library cards show "v2 of 3" and an "Older
      version" marker
- [x] Delete — `DELETE /api/courses/[id]` behind a real `ConfirmDialog`
      (native `<dialog>`, no browser `confirm()`), from both the library
      card menu and the course page header. Deletes exactly one version;
      the dialog says so and says how many other versions stay.
      Cascades remove modules, quizzes, questions, and progress rows
- [x] Export — `GET /api/courses/[id]/export?format=json|markdown`.
      JSON (the default) is unchanged and still lossless/re-importable;
      Markdown (`src/lib/course-markdown-export.ts`) is a readable study
      document with a per-module answer key — see `COURSE_SCHEMA.md`.
      Filenames carry `-v{n}` for versions above 1
- [x] Course source metadata — `course.source` is finally shown:
      "Generated from {syllabus title}" / "Generated" (source syllabus
      gone) / "Imported from JSON" / "Added from a shared course"
      (Milestone 9's `shared_copy`, already labelled correctly), on
      library cards and in the course page header alongside "Version N
      · Created {date}"
- [x] Automated tests — the project's first: vitest, `npm test`, unit
      tests for pure logic only (library filtering, Markdown export,
      prompt focus). See `DEVELOPMENT.md`

**Verified** — static checks, unit tests, a real migration against
existing data, and live HTTP checks against a real production build
(`next build` + `next start`), a real Postgres database, and two real
accounts:

- `tsc --noEmit` clean, `eslint src` clean, `next build` succeeds,
  `npm test` (vitest 3.x) **42/42 pass** across 3 test files
  (`course-library-filter`, `course-markdown-export`,
  `prompt-generator`)
- Migration `0004` applied to a real Postgres 16 database that already
  held two pre-Milestone-8 course rows: both were backfilled with
  `version_group_id = id`, `version = 1`; the `NOT NULL`, the
  `(version_group_id, version)` unique constraint, and
  `course_owner_id_idx` were all present afterwards
- **34/34 live checks passed:**
  - Imported v1 → `version = 1`, group id equals its own id
  - Regenerated via import with `regenerateFromCourseId` → v2 in the
    same group, with subject/syllabus provenance re-derived
    server-side; deliberately bogus `subjectId`/`syllabusId` values
    sent alongside it were ignored. v1 was left untouched
  - User B cannot version user A's course via import (`422` "Course
    not found.", zero courses created for B). B gets `404` on
    `DELETE`, direct regenerate, Markdown export, and the regenerate
    page for A's course. Anonymous `DELETE` → `401`
  - Direct regenerate with no AI config → `400`; oversized focus topics
    (501 chars) → `400`
  - Direct regenerate with a saved invalid Anthropic key → a real `502`
    from Anthropic's live API ("Anthropic rejected the API key…"),
    zero rows created, key absent from the response
  - Markdown export → `200 text/markdown`, filename
    `introduction-to-data-structures-v2.md`, containing the title,
    `## Module 1`, and the answer key. JSON export unchanged
  - `/courses`, `/courses/[id]`, `/courses/[id]/regenerate` all render
    `200`; the `/courses` HTML contains no `"correctAnswer"`
  - Owner deletes v1 → its modules are gone, v2 survives. The next
    regeneration after deleting v1 gets **v3** (max + 1 of what
    remains; the deleted v1's number is not handed out again)
  - After deleting the source syllabus: regenerate → `409`, the
    regenerate page renders its explanatory state, and the courses
    themselves survive the syllabus deletion

**Not verified** (know this before relying on it):

- Concurrent regenerations racing each other. The advisory lock and
  the unique constraint are both in place, but nothing exercised them
  under real concurrency
- No in-browser/manual UI pass of keyboard behaviour in the
  `ActionMenu` or `ConfirmDialog` (focus trap, Escape, focus return,
  arrow keys). Reviewed in code only
- No successful real AI generation. No valid provider key was
  available, so the focus prompts (topics / exam) are verified only by
  unit tests, not by a real model's output

**Explicitly out of scope / known limitations** (do not treat as
bugs):

- ~~Reprocessing a syllabus breaks regeneration for its courses.~~
  **Resolved 2026-10-25:** reprocess now re-links courses to the new
  subjects by subject code (see `SYLLABUS_PROCESSING.md` and
  `DECISIONS.md`). Courses whose code matches nothing (or several
  subjects) after reprocess still can't be regenerated
- Library search/filter/sort is client-side over the full per-user
  list. Fine at a student's course count; revisit with server-side
  pagination if libraries get large
- Syllabus delete/reprocess, subject removal, and AI-config removal
  still use browser `confirm()`/`alert()` (Milestone 10).
  `subject-prompt-panel.tsx` still uses `alert()` when copying fails.
  Everything new in this milestone uses `ConfirmDialog` or inline
  messages instead
- **Behaviour change:** a plain (non-regeneration) import now rejects
  a `subjectId` that doesn't belong to the supplied, owned syllabus
  ("That subject doesn't belong to that syllabus."). Previously any
  subject id was accepted once the syllabus checked out
- Malformed (non-uuid) course ids now return `404` instead of a `500`
  from Postgres
- Unrelated fix that came along: the "Download JSON Schema" link in
  `course-prompt-generator.tsx` gained a `download` attribute. That
  fixed a pre-existing `@next/next/no-html-link-for-pages` lint error
  that was blocking `next build`
- The dashboard's progress figures still come from
  `getCourseProgressSummaries` (Milestone 7), not `listCourseLibrary`.
  Both use the same "done" definition
- Sharing was not part of this milestone (Milestone 9 built it).
  Only the display label for `shared_copy` existed at the time

---

## Milestone 9 — Course Sharing — `[✓]` Complete

- [x] Two visibility modes — `course.visibility`: `private` (the
      default) or `link` ("Anyone with the link"). Migration `0005`
      adds the column with a constant default, so every existing course
      became private with no share token
- [x] Secure share links — one URL per course, `/share/{token}`, used
      by both modes. The token is 24 CSPRNG bytes as base64url (exactly
      32 characters, 192 bits, `src/lib/share-token.ts`), created
      lazily the first time the owner saves share settings, stored in a
      unique-indexed column, and shape-checked before any database
      lookup. Turning "Anyone with the link" off keeps the token (turning
      it back on restores the same link), but every request re-checks
      visibility, so the public link stops working on the next request.
      "Reset link" rotates the token and the old link dies at once
- [x] Private sharing by email — `course_permission(course_id, email,
      role)`. The owner adds and removes emails in the share dialog.
      Emails are trimmed and lowercased. The owner's own email, invalid
      addresses, and more than 100 people are rejected; re-adding an
      existing email is a no-op success. Responses never say whether an
      email has an account, and access starts working for someone who
      signs up with that email later. CourseForge sends no email: the
      owner copies the link and passes it on
- [x] One server-side authorization gate — `resolveSharedCourseAccess
      (token, sessionUserId)` in `src/lib/sharing-service.ts` runs on
      every share page render and every share API call. It returns
      `invalid` / `sign_in_required` / `forbidden` / `allowed`, reads
      the viewer's email from the `user` table by session id (never
      from the request), and caches nothing
- [x] Share dialog — "Share" in the course page header and "Share…" in
      each library card's menu. Visibility radios, the link with Copy
      link (and a select-the-text fallback) and Reset link (inline
      confirmation), and a People section with Add / Remove. Every
      change saves immediately, and every outcome goes through one
      polite live region
- [x] Shared course page — `/share/[token]`, public, outside the
      `(app)` group. It has four states (link not valid / private, sign
      in / access restricted / the course), with a "This is how others
      see your course" banner for the owner. Questions go through
      `sanitizeQuestionForClient`, the owner's email never appears (only
      a display name), and `Referrer-Policy: no-referrer` +
      `X-Robots-Tag: noindex, nofollow` are set on `/share/*` and
      `/api/share/*`
- [x] Learning on a shared course — `CourseViewer` and `ModuleQuiz`
      take `apiBase` + `persistence` and run against
      `/api/share/{token}/...`. Anonymous visitors get graded quiz
      results with nothing saved, and "Mark lesson complete" is
      local-only. Signed-in viewers' progress goes into `module_progress`
      under their own user id. The owner never sees viewer progress
- [x] Add to My Courses — creates a Course Copy: an independent deep
      copy (course, modules, quizzes, questions) owned by the copier,
      `source = "shared_copy"`, `source_course_id` → the original,
      `original_creator_name` (display-name snapshot, never an email),
      `copied_at`, its own version group at v1, private, no token, no
      subject/syllabus link, no progress. Duplicates → `409` with
      `existingCourseId` ("✓ In My Courses" + Open course). The owner
      gets `400`, anonymous users `401`, and anyone the page wouldn't
      show the course to `403`
- [x] Auth flow that returns to the shared course — an anonymous "Add
      to My Courses" opens a sign-in dialog. Its links carry
      `callbackUrl=/share/{token}?add=1`; after login or signup the page
      performs the add once on its own, then drops `?add=1` with
      `router.replace`. Every callbackUrl (login form, signup form, and
      middleware's already-signed-in redirect) now goes through
      `safeCallbackUrl` (`src/lib/safe-redirect.ts`). This also **closes
      a pre-existing open redirect**: `login-form.tsx` used to push any
      `callbackUrl` it was given
- [x] Shared with me — `/shared` lists private-share invites for the
      signed-in user's email, with their own progress, opening through
      the share link. "Shared with me" is in the app nav, and the nav
      now has a scrollable link row below `lg` instead of hiding every
      link below `sm`
- [x] Library and course page — library cards show "Shared by link" /
      "Shared" badges and, for copies, "Added from a shared course · by
      {name}". Library search also matches the original creator's name.
      The course page shows "Added from a shared course — Original
      creator: {name} · Added {date}" for copies and an "Anyone with the
      link can view" badge for link-shared courses
- [x] Automated tests — `safe-redirect.test.ts` and
      `sharing-utils.test.ts` added (see `DEVELOPMENT.md`)

**Verified** — static checks, unit tests, a real migration against
existing data, and live HTTP checks against a real production build
(`next build` + `next start`), a real Postgres 16 database, and four
real clients (owner, viewer, invitee, anonymous):

- `tsc --noEmit` clean, `eslint src` clean, `next build` succeeds,
  `npm test` **95/95 pass** across 5 test files. New:
  `safe-redirect` (28 tests, 22 of them parametrised open-redirect
  rejections) and `sharing-utils` (token format and uniqueness, email
  parsing/normalisation, display names, the copy-provenance line);
  `course-library-filter` is now 21
- Migration `0005` applied to a real Postgres 16 database holding 8
  existing courses: all 8 defaulted to `visibility = 'private'` with no
  share token, and `course_permission` was created
- **63/63 live checks passed** (`verify-m9.mjs`):
  - **Owner-only settings:** a new course's settings default to
    private. A non-owner gets `404` on GET and PATCH, and the forged
    PATCH changed nothing in the database. Anonymous PATCH → `401`.
    Enabling the link issues a ≥32-character URL-safe token
  - **Anonymous viewing of a link-shared course:** the page renders
    the course. Its HTML contains no `correctAnswer`, no quiz
    explanation text, and no owner email, and does show the owner's
    display name. `Referrer-Policy: no-referrer` and an `X-Robots-Tag`
    containing `noindex` are set, and no owner-only controls are
    present (no regenerate link, no export URL)
  - **Anonymous actions:** a quiz attempt is graded (`saved: false`).
    Complete-lesson and Add to My Courses → `401`
  - **Viewer progress isolation:** a signed-in viewer's quiz attempt
    returns `saved: true`, and complete-lesson succeeds. Exactly one
    `module_progress` row exists under the viewer's id, and zero under
    the owner's. A module id from outside the course → `404`, and a
    non-uuid module id → `404` (not `500`). The viewer gets `404` on
    the owner's progress endpoint and on `/courses/{id}`
  - **Add to My Courses:** `201`. The copy is owned by the viewer, with
    `source = shared_copy` and `source_course_id` = the original. It
    has `original_creator_name` = the owner's display name,
    `copied_at` set, its own version group, `version = 1`, private, no
    token, no subject or syllabus link, the same module and question
    counts as the original, and zero progress rows. The original's
    `title`, `owner_id`, `visibility`, `share_token`, and `updated_at`
    were identical before and after the copy. Forged `courseId` /
    `ownerId` fields in the request body were ignored. A second add →
    `409` with the first copy's id as `existingCourseId`. The owner
    adding their own course → `400`. The copy appears in the viewer's
    `/courses`
  - **Disabling the link:** anonymous visitors no longer see the
    content, and the share API rejects both them and an uninvited
    signed-in viewer immediately. The viewer's copy survives
  - **Private sharing:** adding the owner's own email → `400`, an
    invalid email → `400`, a non-owner adding people → `404`.
    `"  INVITEE@…  "` is stored normalised. Anonymous visitors get the
    sign-in state with no course content. An invitee who **signed up
    after being invited** can view (no answers in the HTML). An
    uninvited signed-in user gets the restricted state with no content.
    `/shared` lists the course for the invitee and not for anyone else.
    The invitee can Add to My Courses. Removing the invitee revokes
    access immediately, on both the page and the API
  - **Reset link:** a new token is issued and the old link is dead. A
    rotated token and a garbage token get byte-identical `404` bodies,
    neither of which echoes the token. The new link works
  - **Deleting the original:** the share link dies, and copies survive
    with `source_course_id` set to null and `original_creator_name`
    kept
  - The login page renders normally with a hostile
    `callbackUrl=//evil.example.com`
- **Milestone 8's 34 live checks re-run after Milestone 9: 34/34**
  (no regression)
- **Open-redirect fix, checked live:** a signed-in user requesting
  `/login?callbackUrl=…` with `/share/abc?add=1` gets a `302` there;
  with `//evil.example.com`, `https://evil.example.com`, or
  `/\evil.example.com` they get a `302` to `/dashboard`

**Not verified** (know this before relying on it):

- **No in-browser pass.** The client-side `?add=1` auto-add after a
  real login/signup round trip, Copy link and its select-the-text
  fallback, the native `<dialog>` returning focus to its opener, the
  360px layouts, and focus rings were reviewed in code only. The
  server half of each was checked live (the API calls, the `302`s, the
  rendered states)
- **No real concurrency.** The advisory lock that stops two
  simultaneous Add to My Courses requests from making two copies, and
  the `FOR UPDATE` row lock behind the 100-person cap, are in place,
  but nothing exercised them with racing requests
- **No email delivery**, by design. Nothing sends email, so there was
  nothing to verify

**Explicitly out of scope / known limitations** (do not treat as
bugs):

- **Emails aren't verified at signup**, so private access is only as
  strong as account ownership of that email. Whoever registers an
  invited email first gets access to everything shared with it. See
  `SECURITY.md`
- **No email sending.** The owner shares the link manually; the dialog
  says so
- **Only the `viewer` role exists.** The `course_permission_role` enum
  and the table are ready for more, but nothing else is built
- **"Add Another Copy"** (brief §61, optional) is not built. A second
  add returns `409` and the UI offers the existing copy
- **`listSharedWithMe` lists every course with a permission row for the
  user's email, whatever its visibility** — so an invite on a course
  that was later switched to "Anyone with the link" still shows up.
  Deliberate (the invite still stands and access still works); making
  it private-only is a one-line `where` change in
  `src/lib/sharing-service.ts`
- **Copies of copies credit the first creator.** `original_creator_name`
  carries the root author's name forward, while `source_course_id`
  points at the course the copy was actually made from
- Version numbers can be reused after deleting the newest version
  (Milestone 8 behaviour, unchanged — see `DATABASE.md`)
- No rate limiting on the public share endpoints, including anonymous
  quiz grading (same gap as signup/sign-in — Milestone 11)
- Milestone 10 still has to replace the syllabus delete/reprocess,
  subject removal, and AI-config removal `confirm()`/`alert()` calls.
  Everything new in this milestone uses `Dialog` / `ConfirmDialog` or
  inline messages

---

## Milestone 10 — Performance & UX — `[✓]` Complete (2026-10-26)

- [x] Performance — the per-module query loop in `getOwnedCourse`
      replaced by a fixed number of batched queries; independent page
      queries run in parallel; migration `0006` adds 7 FK indexes
      (`syllabus.user_id`, `subject.syllabus_id`, `course_module.course_id`,
      `quiz_question.quiz_id`, `course.syllabus_id`, `course.subject_id`,
      `module_progress.user_id`)
- [x] Caching — per-request `cache()` dedupe only. No cross-request
      caching of per-user data (every page is user-specific and must
      re-check authorization)
- [x] AI responses — cut-off (`max_tokens` / `length`) and refusal are
      reported clearly instead of as "invalid JSON"
      (`src/lib/ai/response-end.ts`, tested); generation cap 8000 → 16000
      tokens
- [x] Skeleton loaders — `Skeleton` primitive; one generic
      `(app)/loading.tsx` plus `share/[token]/loading.tsx`
- [x] Error states — `(app)/error.tsx`, `global-error.tsx`, root
      `not-found.tsx` (`StatePanel`); never shows server error text, only
      the digest as a reference. The share page handles its own load
      errors through `logShareError` so the token never reaches logs
- [x] Every browser `confirm()`/`alert()` replaced (syllabus
      delete/reprocess, subject removal, AI-config removal, copy failure)
- [x] Accessibility — skip link to `<main id="main-content">` on app,
      share and auth layouts; one `<h1>` per page (lesson Markdown
      headings render one level down: `#` → `<h2>`)
- [x] Responsive — no horizontal scroll at 360px on any page; nav links
      become a scrollable strip below `lg`

**Verified in a real browser** (Chrome via Playwright, production build,
real Postgres) — **88/88 checks**: every authenticated page at 360px and
1280px with zero horizontal overflow, axe-core (WCAG 2.1 A/AA + best
practice) with zero serious/critical violations, exactly one `<h1>`, skip
link present; `ActionMenu` keyboard (Enter opens, focus moves in, arrows
move, Escape closes and returns focus); `ConfirmDialog` (labelled, focus
moves in, Tab trapped, Escape closes without acting); share dialog (link
shown, Copy link writes the real clipboard, axe clean, focus returns);
the full `?add=1` round trip (anonymous → sign-in dialog → real login
form → back on the share page → auto-add → param removed → exactly one
copy → reload shows "In My Courses"); remove-subject and delete-syllabus
use in-page dialogs and no native browser dialog appeared anywhere.
The Milestone 8 (34/34), Milestone 9 (63/63) and re-link (8/8) suites
still pass; 123 unit tests.

**Known behaviour change:** with `loading.tsx`, Next.js streams the
response, so a page that calls `notFound()` (someone else's course, a
deleted course) now returns HTTP **200** with the not-found page and
`noindex`, instead of a 404 status. Verified no course data is in that
response, and it's byte-for-byte the same page as a course that never
existed, so it reveals nothing. API routes still return 404. To get the
404 status back on a route, remove the loading screen from it.

**Not verified / limitations:** no screen-reader (NVDA/VoiceOver) pass,
only axe and keyboard; the generic skeleton causes a small layout shift
on pages that don't look like a card grid; react-markdown still passes a
harmless `node="[object Object]"` attribute onto lesson elements;
`share/[token]` has no `error.tsx` of its own (its data errors are
handled in the page; render errors fall back to `global-error.tsx`).

## Milestone 11 — Production Readiness — `[ ]` Not started

Security audit, auth audit, API-key audit, sharing-security audit,
database audit, edge cases, real test coverage, deployment prep. For
sharing specifically: email verification (private sharing depends on
it), rate limiting on the public `/share` and `/api/share` endpoints,
and a real-concurrency test of the copy and add-person locks.

---

## Recommended immediate next step

Milestone 11 (Production Readiness) is next: email verification (private
sharing depends on it), rate limiting on `/share` and `/api/share`, a
real-concurrency test of the copy and add-person locks, moving syllabus
PDF storage off local disk, and choosing a deployment target.

Fixed between Milestones 9 and 10 (2026-10-25): syllabus extraction
now requires subject codes and recognises single-course syllabi (a real
one-course PDF had produced 482 bogus subjects), and reprocess re-links
courses by subject code. Both verified live; 105 unit tests. Syllabi
uploaded before the fix keep their old, wrong subjects until the user
clicks Reprocess.
