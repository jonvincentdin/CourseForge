# PROJECT.md

## Product vision

Turn a syllabus PDF a student already has into a course they'll
actually finish: organized by year/semester, broken into sensible
modules, written as Markdown lessons, checked with quizzes, and
trackable.

## Product goals

- Students upload a syllabus exactly once and reuse it indefinitely.
- Course generation is grounded in the actual syllabus content, not a
  generic "write me a course about X" prompt.
- Works whether or not the student has (or wants to pay for) their own
  AI API access — the external-AI-prompt path is a first-class flow,
  not an afterthought.
- Courses can be shared, and a shared course can be added to another
  student's own library as an independent copy.

## Target users

University students, any subject, any curriculum structure. No
assumption of a specific institution's syllabus format.

## Main features (see MILESTONES.md for what's actually built)

- Syllabus PDF upload, extraction, review/edit, persistent storage,
  versioning
- Year / semester / multi-subject selection
- Direct AI course generation (provider-agnostic, user's own API key)
- External AI prompt generation + JSON import
- Markdown-based, modular courses with quizzes
- Progress tracking
- Course management (regenerate, export, delete)
- Public ("anyone with the link") and private course sharing
- "Add to My Courses" — independent course copies

## Current implementation

Milestones 1–5: accounts, sign in/out, protected dashboard shell,
design system, syllabus upload/extraction/review/management, the
year/semester/subject selection flow, the course data model (schema,
Markdown rendering, JSON import/export), and the external AI workflow
(syllabus-grounded prompt generation, JSON Schema download, prompt
copying). Direct AI generation (Milestone 6) is the only generation
method still missing — CourseForge is already fully usable without an
AI API key. See `MILESTONES.md`.

## Important constraints

- User-provided AI API keys must never be stored in plaintext, exposed
  to the client, logged, or returned by any API response (Milestone 6
  / see `SECURITY.md`).
- Share links must use cryptographically secure random tokens, never
  sequential/guessable IDs (Milestone 9 / see `SHARING.md`).
- Adding a shared course to your library must always create an
  independent copy — never a live reference to the original
  (Milestone 9).

## Product terminology (use consistently)

| Term | Meaning |
|---|---|
| CourseForge | The product name. Not Syllabuild, Reviso, or Memora. |
| Anyone with the link | Public sharing mode |
| Private | Restricted sharing mode, explicit invitees only |
| Add to My Courses | User-facing action for saving someone else's shared course |
| Course Copy | Internal name for the resource created by "Add to My Courses" |
| My Courses | The user's own course library |

Avoid: Clone, Fork, Duplicate Import, External Course, Saved Object.
