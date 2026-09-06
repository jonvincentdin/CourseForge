# CourseForge — `.context`

This directory is CourseForge's long-term memory. It describes the REAL
current state of the application — not the plan, not the aspiration,
the actual implementation as it exists in this repository right now.

## What CourseForge is

CourseForge is a student-focused learning platform. A student uploads
their university syllabus once; CourseForge organizes the subjects it
finds by academic year and semester; the student picks one or several
subjects and generates a structured, Markdown-based course — with
modules and quizzes — either directly via their own AI provider, or by
copying a grounded prompt into any external AI and importing the JSON
it returns.

## Target users

University students who want a syllabus turned into something they can
actually study from, rather than a wall of PDF text.

## Main workflow

```
Login → Dashboard → Upload Syllabus → Extract Subjects → Review/Edit
  → Select Year → Select Semester → Select Subject(s)
  → Generate (Direct AI or External AI + JSON import)
  → Course Viewer → Modules → Markdown Lessons → Quiz → Progress
  → Manage / Export / Share
```

## Development rules (from the product brief)

1. Inspect the repository and this `.context` directory before making
   substantial changes. Don't assume a milestone is complete just
   because UI exists — check the actual implementation.
2. Preserve working functionality. Improve, don't rewrite, unless
   there's a real reason.
3. Never mark a milestone `[✓]` in `MILESTONES.md` unless it works
   end-to-end: data persists, errors are handled, it's responsive, and
   security is addressed.
4. After any meaningful change, update the relevant file(s) in this
   directory. A stale `.context` is worse than no `.context` — it lies
   to the next session (human or Claude) about what's real.
5. Do not describe planned or aspirational features as implemented.
   Where something is intentionally deferred, say so and name the
   milestone that owns it.

## How Claude should use this directory

Before implementing: read `MILESTONES.md` to find the active
milestone, then read whichever of `ARCHITECTURE.md`, `DATABASE.md`,
`UI_UX.md`, `AI_GENERATION.md`, `SYLLABUS_PROCESSING.md`,
`COURSE_SCHEMA.md`, `SHARING.md`, and `SECURITY.md` are relevant to
the work. Check `DECISIONS.md` for prior calls that shouldn't be
silently re-litigated.

## Current project status

**Milestones 1 through 7 are complete and verified live** — not just
build-clean, but exercised against a real running Postgres database,
real HTTP requests throughout, a real call to Anthropic's live API for
Milestone 6, and for Milestone 7, direct verification (by inspecting
actual rendered HTML and by submitting a forged score) that quiz
answers can't be read early and can't be faked. Cross-user data
isolation is verified on every ownership-checked route, now including
progress-tracking writes. CourseForge supports the full loop: upload a
syllabus, select subjects, generate a course either path, then
actually learn from it with real progress and graded quizzes. See
`MILESTONES.md` for the precise completion checklist and what's
explicitly out of scope so far.

Course management (search, delete, regeneration on `/courses`) and
sharing are not built yet — that's Milestones 8 and 9.
