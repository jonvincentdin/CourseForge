# AI_GENERATION.md

## External AI workflow — Milestone 5 — built, verified live

CourseForge needs no AI provider connected to generate courses. The
user copies a generated prompt into any AI they already have access
to, then pastes the JSON it returns back into CourseForge.

### Prompt generation (`src/lib/prompt-generator.ts`)

`buildCoursePrompt({ subject, syllabus, depth, includeLearningObjectives })`
is a pure function (no server-only APIs — it runs client-side, so the
prompt updates instantly when the user changes depth/objectives
without a round trip) that produces a single grounded prompt
containing, per the product brief §30's exact list:

- Subject, subject code, academic year, semester (from the real
  `subject` row, never hardcoded)
- Syllabus information — the actual `syllabus.extractedText`, capped
  at 4,000 characters as grounding context, not the whole raw PDF
  reproduced unbounded
- Course requirements — depth-dependent guidance (concise: 3-5
  modules/150-300 words each; standard: 5-8 modules/300-600 words;
  detailed: 8-12 modules/600+ words)
- Module requirements, Markdown requirements (explicitly: no raw
  HTML/JS, no redundant top-level heading), quiz requirements (every
  module needs ≥1 question, mix of types, explanations required,
  `correctAnswer` must reference real option ids)
- The JSON schema — embedded as the actual `EXAMPLE_COURSE_IMPORT`
  object from `course-schema.ts`, so the prompt and the real
  validator can never drift out of sync
- Validation requirements — explicit instruction to return only raw
  JSON, no prose, no code fences, with `schema_version` set correctly

Verified live: generated a real prompt from real syllabus/subject
data pulled from Postgres and confirmed the actual embedded syllabus
excerpt, subject fields, and `schema_version` all appeared correctly
in the rendered page — not just checked in isolation.

### JSON Schema download

`GET /api/courses/schema` — real JSON Schema (draft 2020-12), generated
directly from the same zod schema (`course-schema.ts`'s
`courseImportSchema`) via zod v4's native `z.toJSONSchema()`. No
separate schema definition to maintain or let drift from the actual
validator. **Deliberately unauthenticated** — this is static
documentation of CourseForge's own format, not user data; verified
live that it downloads correctly with no session cookie at all.

### Prompt copying

"Copy prompt" button per subject, `navigator.clipboard.writeText`,
with a fallback alert if the clipboard API is unavailable (e.g.
insecure context) rather than failing silently.

### The UI (`/generate/[id]/prompt`)

Replaces Milestone 4's bare `/generate/[id]/import` route. One panel
per selected subject, each showing: the generated prompt in a
scrollable `<pre>` block, a Copy button, and — directly below it —
the same `ImportCourseForm` from Milestone 4 (now supporting a
`hideHeader` mode so it can sit inside the panel without a redundant
nested card). Above the panels, a generation-settings block matching
the product brief §28's mockup:

- **Generation method**: "External AI Prompt + JSON" (selected, the
  only functional option) vs. "Direct AI Generation" (visibly
  disabled, labeled "Coming in Milestone 6" — not hidden, not silently
  omitted)
- **Course depth**: Concise / Standard / Detailed, changes the prompt
  live
- **Include**: Modules and Markdown lessons and Module quizzes are
  shown as locked/required checkboxes (unchecking any of them would
  produce JSON that fails Milestone 4's own validation — the schema
  requires at least one module with Markdown content and a quiz with
  at least one question — so offering them as optional would be
  dishonest); only "Learning objectives" is a real, working toggle

Verified live end-to-end: uploaded a real 2-subject syllabus, loaded
the prompt page, confirmed both subjects got independent prompt panels
with correct grounded content, imported a real course through the
actual form (not a direct API call bypassing the UI's data path) and
confirmed the resulting `course` row correctly carried
`subject_id`/`syllabus_id` provenance this time (Milestone 4's own
test hadn't exercised that path). A tampered/nonexistent subject id in
the page's query string correctly 404s rather than leaking any data.

## Direct AI generation — Milestone 6 — not started

Provider-agnostic AI architecture, AI configuration UI, encrypted
API-key storage, generation with progress UI. See `SECURITY.md`'s
"Required for future milestones" for the non-negotiable API-key
handling rules that must be followed exactly when this is built —
those requirements were written before this milestone and still
stand unchanged.
