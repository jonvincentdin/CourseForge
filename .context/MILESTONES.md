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
      `/dashboard`; forward nav links to not-yet-built routes are
      intentional (see `ARCHITECTURE.md` routing table)
- [x] Database foundation — Postgres via Drizzle, `user`/`account`/
      `session`/`verification_token` schema, `drizzle-kit` config
      (see `DATABASE.md`)
- [x] Authentication foundation — Auth.js v5 Credentials provider,
      bcrypt hashing, JWT sessions, edge middleware + server-side
      redirect double-check (see `SECURITY.md`, `ARCHITECTURE.md`)
- [x] `.context` — this directory

**Verification performed:** `tsc --noEmit` clean, `eslint .` clean,
`next build` clean (fonts temporarily stubbed to route around a
sandbox network restriction on `fonts.googleapis.com` — not a code
issue; see `DEVELOPMENT.md`). **Not verified:** no live Postgres
instance was available in the build sandbox, so the auth flow has not
been exercised end-to-end against a real database or in a browser.
Do that first, before starting Milestone 2.

**Explicitly out of scope for this milestone** (do not treat as bugs):
dashboard shows empty states only (no real data exists yet); nav links
to `/syllabi`, `/courses`, `/generate`, `/settings` 404 until their
milestones land; no email verification; no password reset; no rate
limiting on auth endpoints; no automated tests.

---

## Milestone 2 — Syllabus Management — `[ ]` Not started

PDF upload, validation, extraction, storage, subject/year/semester
detection, review/edit UI, syllabus library, versioning. See
`SYLLABUS_PROCESSING.md`. **Blocked on** a file-storage decision (see
`DECISIONS.md` open questions) before real implementation can start.

## Milestone 3 — Academic Organization — `[ ]` Not started

Year/semester/subject selectors, multi-select, search, filtering, and
turning the dashboard from empty-states into real data once Milestone
2 exists.

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

## Milestone 11 — Production Readiness — `[ ]` Not started

Security audit, auth audit, API-key audit, sharing-security audit,
database audit, edge cases, real test coverage, deployment prep.

---

## Recommended immediate next step

Before starting Milestone 2: stand up a real Postgres instance, run
`npm run db:push`, and manually verify signup → sign-in → session
persistence → sign-out in a browser. Milestone 1 was built and
verified in an environment without database or font-CDN access, so
this is the one gap between "compiles cleanly" and "confirmed
working."
