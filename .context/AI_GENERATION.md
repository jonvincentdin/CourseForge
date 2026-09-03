# AI_GENERATION.md

**Status: not started.** Owned by Milestone 5 (external AI workflow)
and Milestone 6 (direct AI generation). Nothing below is implemented —
this file records the requirements so the eventual implementation
doesn't drift from the brief.

## Required shape (from the product brief)

- Provider-agnostic architecture — adding a new AI provider later
  should not require rewriting the generation pipeline.
- Direct generation must be grounded in the actual stored syllabus and
  subject data, not a generic "create a course about X" prompt.
- External-AI path: generate a complete, copyable prompt (subject,
  code, year, semester, syllabus info, learning objectives, module/
  Markdown/quiz requirements, the JSON schema, validation
  requirements) plus a downloadable copy of the JSON schema itself.
  Users must be able to use CourseForge fully without ever configuring
  an API key.
- All AI-provided JSON — from either path — gets validated against the
  versioned schema before it touches the database. See
  `COURSE_SCHEMA.md` (also not started yet).
- API key handling must follow `SECURITY.md`'s "Required for future
  milestones" section exactly.
