# COURSE_SCHEMA.md

**Status: built (Milestone 4), verified live** against a real Postgres
database — including a full import → DB → export round-trip validated
against the app's own schema, and two real XSS payloads confirmed
neutralized in the rendered output. Milestone 8 added a Markdown
export format, regeneration-as-a-new-version through import, and a
stricter subject check on import (see Import and Export below). The
JSON schema itself is unchanged — still `schema_version: "1.0"`.

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

**Milestone 8 changes to import:**

- If a `subjectId` is supplied, it must now belong to the supplied
  (owned) syllabus — otherwise the import is rejected with "That
  subject doesn't belong to that syllabus." Before Milestone 8 any
  subject id was accepted once the syllabus checked out. A `subjectId`
  without a `syllabusId` is rejected the same way.
- Optional `regenerateFromCourseId` (uuid): the pasted JSON becomes the
  next version of that owned course (the External-AI regeneration
  path). Provenance — subject, syllabus, version group — is re-derived
  server-side from the source course, and any `subjectId`/`syllabusId`
  in the same request is ignored. A course id the user doesn't own →
  `422` "Course not found.", nothing created. Verified live, including
  that deliberately bogus client-supplied ids were ignored. See
  `DATABASE.md` for how the version number is assigned.

The entire course (row + every module + its quiz + all questions) is
written inside a single `db.transaction(...)` — a failure partway
through leaves nothing behind rather than an orphaned, broken course.

**The UI import form itself is intentionally bare** — a plain paste-JSON
textarea, no prompt generator, no "copy this into ChatGPT" flow. That
polish is explicitly Milestone 5's job (external AI workflow); this
milestone only needed the underlying accept-and-validate-JSON
capability to exist and work correctly.

## Export

`GET /api/courses/[id]/export?format=json|markdown` — `json` is the
default when `format` is omitted; any other value → `400`.
Ownership-checked for both formats — confirmed live that a second
account gets `404`, not another user's course data (Milestone 4 for
JSON, Milestone 8 for Markdown).

Filenames come from `courseExportFilename` in
`src/lib/course-markdown-export.ts`: the title slugified to ASCII
letters/digits and hyphens, lowercased, falling back to `course` if
nothing is left (e.g. a title entirely in a non-Latin script), with
`-v{n}` appended when `version > 1` so v1 and v2 exports don't
collide. Example, verified live: `introduction-to-data-structures-v2.md`.

### JSON (Milestone 4)

Reconstructs the exact versioned JSON shape from the DB rows
(`courseToExportJson`) and serves it as a downloadable `.json` file.
This is the lossless, re-importable format. **Round-trip verified**:
exported JSON was re-validated against the app's own
`validateCourseImport` and passed with zero errors — a real proof that
import and export agree on the schema, not just an assumption.
Milestone 8 left its content unchanged (re-checked live); only the
filename gained the `-v{n}` suffix. Version metadata
(`version_group_id`, `version`) is **not** part of the JSON — it's not
in the versioned schema, and re-importing an export always creates a
new, independent v1.

### Markdown (Milestone 8, product brief §43)

`courseToMarkdown(full)` in `src/lib/course-markdown-export.ts` — a
pure formatter (type-only imports, no DB) that produces a readable
study document. It is **not** re-importable; JSON stays the lossless
format. Served as `text/markdown; charset=utf-8` with a `.md`
attachment. Structure:

```markdown
# Course title

CS201 · Year 2 · 1st Semester

Course description.

## Course learning objectives

- Objective

## Module 1: Module title

Module description.

**Learning objectives**

- Objective

…the lesson's own Markdown, headings shifted down two levels…

### Quiz: Quiz title

1. Question prompt
   *Choose one.*
   - **A.** First option
   - **B.** Second option

#### Answer key

1. **B.** Second option — Explanation.
```

Rules worth knowing before changing it:

- The metadata line includes only the parts that exist (subject code,
  `Year N`, semester), joined with ` · `; sections with no content
  (description, objectives) are omitted entirely.
- **Heading shifting** (`shiftHeadings`): lessons are standalone
  Markdown and may use `#`/`##`, which would outrank the
  `## Module N` heading they sit under. Every ATX heading is pushed
  down two levels, capped at `######`. Lines inside fenced code blocks
  (``` or ~~~, closed per CommonMark's same-character,
  at-least-as-long rule) are left alone, so a `# comment` in a code
  sample stays code. A lesson that ends inside an unclosed fence gets
  a closing fence appended, so it can't swallow the rest of the
  document. Setext headings (`===`/`---` underlines) are not shifted.
- **Questions** are a numbered list with a type hint (*Choose one.* /
  *Choose all that apply.* / *True or false?* / *Write your answer.*);
  multiple-choice and multiple-select options get `A.`, `B.`, `C.`…
  labels (numbers after `Z`).
- **Answer key**, one per module, after that module's quiz:
  multiple choice → the labelled option; multiple select → every
  correct option in option order, joined with `; `; true/false →
  **True**/**False**; identification → every accepted answer joined
  with ` or `. The explanation follows after ` — ` when present. If a
  stored answer id doesn't match any option (shouldn't happen —
  validation forbids it), the raw id is shown rather than dropped.
- Titles, options, and list items are collapsed to a single line so
  they can't break the surrounding structure; multi-line prompts and
  explanations are indented to stay inside their list item.
- The document ends with a newline.

Covered by unit tests (`src/lib/course-markdown-export.test.ts`:
heading shifting, code fences left untouched, answer keys for all four
question types, filenames) and checked live: `200 text/markdown`, the
expected filename, and the title, `## Module 1`, and answer key present
in the body.

**Security note:** the Markdown export contains the answer key by
design — it's a download for the course's owner, ownership-checked
like everything else. It never feeds the course viewer, which still
receives only sanitized questions (see `SECURITY.md`).

## Multi-subject → independent courses (product brief §36)

Each selected subject in the Milestone 3 selector gets its own
separate paste-JSON form on `/generate/[id]/import`, and each import
call creates its own fully independent `course` row — there is no
code path that could merge two subjects into one course. Verified
live with a two-subject syllabus: the import page rendered two
distinct forms, one per subject.

## Course copies (Milestone 9)

"Add to My Courses" on a shared course creates a **Course Copy**: a
new `course` row with `source: "shared_copy"` and its own modules,
quizzes, and questions, every one with a new id. It's a copy of the
stored rows, not a round trip through the JSON schema. Nothing is
re-validated or re-imported, and the content is byte-for-byte what the
original held at that moment:

- Course: title, subject code, academic year, semester, description,
  learning objectives, and `schema_version` are copied. Provenance is
  new: `source_course_id` → the original, `original_creator_name` (a
  display-name snapshot), `copied_at`, and its own version group at
  v1. `subject_id`/`syllabus_id` are null, so a copy can't be
  regenerated (the course page explains why)
- Modules: title, description, learning objectives,
  `content_markdown`, and `sort_order`
- Quizzes and questions: title, type, prompt, options,
  `correct_answer`, `explanation`, and `sort_order`. The copier owns
  the copy, so the answers come with it, exactly as with an import
- **Not copied:** progress, visibility (a copy is always private),
  the share token, and the people list

There's no sync: later edits or regenerations of the original never
reach the copy. Exporting a copy works like any owned course. The JSON
export is the standard format with no sharing provenance in it, so
re-importing it gives an ordinary `imported` course. See `SHARING.md`
for who may copy and how duplicates are handled.

## Not yet built

Nothing schema-related is outstanding from the milestone plan.
Regeneration, versioning, delete, and search/filter on `/courses` are
built (Milestone 8) — see `MILESTONES.md`, `DATABASE.md`'s `course`
Versioning notes, and `ARCHITECTURE.md`'s "Course management
architecture" section. Interactive quiz-taking, module navigation, and progress tracking are
now built — see `.context/MILESTONES.md`'s Milestone 7 entry and
`ARCHITECTURE.md`'s "Learning experience architecture" section for
details, including how quiz answers are kept from the client until
after submission.
