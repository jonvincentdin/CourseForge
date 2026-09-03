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

## Milestone 3 — Academic Organization — `[ ]` Not started

Year/semester/subject selectors, multi-select, search, filtering for
choosing subjects ahead of course generation. The dashboard and
`/syllabi` already show real data (done in Milestone 2) — this
milestone is specifically about the multi-subject *selection* UI that
feeds into Milestone 4/5/6 course generation, not about the syllabus
data itself.

## Milestone 4 — Course Data Model — `[ ]` Not started

Course/module/quiz schema, Markdown support, JSON validation,
import/export. See `COURSE_SCHEMA.md`.

## Milestone 5 — External AI Workflow — `[ ]` Not started

Prompt generator, JSON schema download, JSON import + validation. See
`AI_GENERATION.md`.

## Milestone 6 — Direct AI Generation — `[ ]` Not started

Provider-agnostic AI architecture, AI configuration UI, encrypted
API-key storage, generation with progress UI. See `AI_GENERATION.md`
and `SECURITY.md`'s "Required for future milestones."

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

Before starting Milestone 3: decide the real file-storage target
(local disk won't survive most deployments — see `DECISIONS.md` open
questions) if deployment is imminent; otherwise proceed straight to
Milestone 3's subject-selection UI, which builds on the now-real
syllabus/subject data from Milestone 2.
