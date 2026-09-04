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

## Milestone 7 — Learning Experience — `[ ]` Not started

Course viewer, module navigation, Markdown renderer (sanitized),
progress tracking, module quizzes with explanations.

## Milestone 8 — Course Management — `[ ]` Not started

Course library, search/filter, regeneration, versioning, delete,
export, source metadata.

## Milestone 9 — Course Sharing — `[ ]` Not started

Public/private sharing, secure tokens, share dialog, invitations,
server-side authorization, Add to My Courses / Course Copies,
auth-required-to-add flow with return-to-shared-course, duplicate
handling. See `SHARING.md` and `SECURITY.md`.

## Milestone 10 — Performance & UX — `[ ]` Not started

Caching, skeleton loaders, responsive polish, accessibility audit,
animation polish, error/empty states for everything built by then.
Replace `confirm()`/`alert()` browser dialogs (used in Milestone 2 for
delete/reprocess confirmations) with proper modals.

## Milestone 11 — Production Readiness — `[ ]` Not started

Security audit, auth audit, API-key audit, sharing-security audit,
database audit, edge cases, real test coverage, deployment prep.

---

## Recommended immediate next step

Milestone 7 (Learning Experience) is next: turn `/courses/[id]`'s
read-only structural preview into a real course viewer — module
navigation (previous/next, a sidebar/progress list), the interactive
quiz UI (all 4 question types already have their data shape defined in
`course-schema.ts`, they just need a UI: submit → score → correct/
incorrect per question → explanation), and `CourseProgress` tracking
(the one remaining "not yet modeled" table from `DATABASE.md`). The
Markdown renderer, quiz question data, and course structure all
already exist and are verified — this milestone is UI and one new
small table, not new data-model work.
