# COURSE_SCHEMA.md

**Status: not started.** Owned by Milestone 4. Nothing below is
implemented.

## Required shape (from the product brief)

- A strict, **versioned** JSON schema (`schema_version` field) for
  course / module / quiz data, matching the shape in the product
  brief section 31 (course → modules[] → quiz → questions[]).
- Educational content stored as Markdown, not HTML — rendered with
  headings, lists, tables, code blocks, blockquotes, links, and
  sanitized before render (see `SECURITY.md`).
- Every module has a small quiz (multiple choice / multiple select /
  true-false / identification), each question tied to real module
  content, with post-submission score + correct/incorrect state +
  explanation.
- All imported JSON (from the external-AI path) must be validated
  against the schema with useful, specific error messages — not a
  generic "invalid JSON" — since a student pasting output from a
  different AI is the expected common case, not an edge case.
- Import/export must round-trip through the same versioned schema.

## Dependencies

Depends on `AI_GENERATION.md`'s prompt/schema-download requirements
being implemented in step with this — they share the same schema
definition, so build them together rather than the schema drifting
from what the generated prompt promises.
