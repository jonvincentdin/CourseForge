# COURSE_SCHEMA.md

**Status: built (Milestone 4), verified live** against a real Postgres
database — including a full import → DB → export round-trip validated
against the app's own schema, and two real XSS payloads confirmed
neutralized in the rendered output.

## The versioned JSON schema

`src/lib/course-schema.ts` is the single source of truth. Current
version: `schema_version: "1.0"` (`CURRENT_SCHEMA_VERSION`). Shape
matches the product brief §31:

```json
{
  "schema_version": "1.0",
  "course": {
    "title": "...",
    "subject_code": "...",
    "year": 2,
    "semester": "1st Semester",
    "description": "...",
    "learning_objectives": ["..."],
    "modules": [
      {
        "id": "module-1",
        "title": "...",
        "description": "...",
        "learning_objectives": ["..."],
        "content_markdown": "# ...",
        "quiz": {
          "title": "...",
          "questions": [
            {
              "type": "multiple_choice",
              "prompt": "...",
              "options": [{ "id": "a", "text": "..." }],
              "correctAnswer": "a",
              "explanation": "..."
            }
          ]
        }
      }
    ]
  }
}
```

`EXAMPLE_COURSE_IMPORT` in the same file is a complete, valid example —
used to seed the Milestone 4 import UI's "Use example JSON" button,
and available to reuse for Milestone 5's schema-download feature so
the two never drift apart.

## Question types (product brief §34)

All four are implemented and validated with type-specific rules, not
just a generic shape check:

| Type | `correctAnswer` shape | Extra validation |
|---|---|---|
| `multiple_choice` | `string` (an option id) | must match one of the supplied option ids |
| `multiple_select` | `string[]` (option ids) | every id must match a supplied option |
| `true_false` | `boolean` | — |
| `identification` | `string[]` (accepted answers) | at least 1 accepted answer required |

Every module's quiz needs **at least 1 question** — enforced by the
schema, not left optional, matching the brief's "every module MUST
have a small quiz."

## Validation (`validateCourseImport`)

Returns `{ ok, data?, errors: string[] }` with specific, field-path
messages (`course.modules.0.quiz.questions: ...`), not a generic
"invalid JSON." Verified live against: a completely malformed
non-JSON string, an unsupported `schema_version`, a module with empty
Markdown, a quiz with zero questions, and a `multiple_choice` question
whose `correctAnswer` doesn't match any supplied option id — every
case produced the correct, specific error.

## Markdown support

Content is authored/stored as plain Markdown (`content_markdown`
column, `text`, not `jsonb` — it's not structured data). Rendered via
`src/components/courses/markdown-content.tsx` using `react-markdown` +
`remark-gfm` (tables, strikethrough, etc.), **without** `rehype-raw`.
That omission is the entire XSS defense: `react-markdown` without
`rehype-raw` never interprets embedded HTML as markup — it's escaped
to literal text instead. Verified live with two real payloads
(`<script>alert(1)</script>` and `<img src=x onerror=alert(2)>`)
imported through the actual API and rendered on the actual course
page: both came through as inert, escaped text in the DOM, never as
executable markup or a live attribute.

## Import (Milestone 4's UI slice)

`POST /api/courses/import` (`src/app/api/courses/import/route.ts`) →
`src/lib/course-service.ts`'s `importCourseFromJson`. Accepts raw JSON
text (not pre-parsed — parse errors get their own clear message
before schema validation even runs), an optional `subjectId`/
`syllabusId` for provenance. If a `syllabusId` is supplied, it's
independently re-verified as belonging to the authenticated user
before the course is created — **never trust a client-supplied
provenance id on its own**. Verified live: a second real account
attempting to import with the first account's real syllabus id as
provenance was correctly rejected ("That syllabus doesn't belong to
you."), while the same account importing with no provenance at all
succeeded normally.

The entire course (row + every module + its quiz + all questions) is
written inside a single `db.transaction(...)` — a failure partway
through leaves nothing behind rather than an orphaned, broken course.

**The UI import form itself is intentionally bare** — a plain paste-JSON
textarea, no prompt generator, no "copy this into ChatGPT" flow. That
polish is explicitly Milestone 5's job (external AI workflow); this
milestone only needed the underlying accept-and-validate-JSON
capability to exist and work correctly.

## Export

`GET /api/courses/[id]/export` reconstructs the exact versioned JSON
shape from the DB rows (`courseToExportJson`) and serves it as a
downloadable `.json` file. Ownership-checked — confirmed live that a
second account gets `404`, not another user's course data.
**Round-trip verified**: exported JSON was re-validated against the
app's own `validateCourseImport` and passed with zero errors — a real
proof that import and export agree on the schema, not just an
assumption.

## Multi-subject → independent courses (product brief §36)

Each selected subject in the Milestone 3 selector gets its own
separate paste-JSON form on `/generate/[id]/import`, and each import
call creates its own fully independent `course` row — there is no
code path that could merge two subjects into one course. Verified
live with a two-subject syllabus: the import page rendered two
distinct forms, one per subject.

## Not yet built (owned by later milestones)

- Prompt generation ("copy this prompt into any AI") and the
  schema-download button — Milestone 5
- Direct AI generation calling a configured provider — Milestone 6
- Interactive quiz-taking, scoring, module navigation, progress
  tracking — Milestone 7 (the current `/courses/[id]` page is a
  read-only structural preview: collapsible modules, rendered
  Markdown, a quiz *question count* badge — no actual quiz UI)
- Regeneration, versioning, delete, search/filter on `/courses` —
  Milestone 8 (the current `/courses` list is intentionally minimal,
  matching the same pattern Milestone 2 used for `/syllabi` before
  Milestone 8 exists)
