# SYLLABUS_PROCESSING.md

**Status: not started.** Owned by Milestone 2. Nothing below is
implemented.

## Required shape (from the product brief)

- PDF upload with file-type/size/integrity validation.
- Text extraction, then structural analysis to detect academic years,
  semesters, and subjects.
- If extraction is uncertain, don't silently invent information —
  surface it for the user to review/correct rather than guessing
  quietly.
- Editable fields per detected subject: name, code, description, year,
  semester, units, other metadata.
- Persistent storage of the **original PDF** (not just extracted
  text) — needed later for reprocessing, regeneration, and auditing.
- A dedicated "My Syllabi" page: view / rename / edit / delete /
  reprocess / generate-course-from.
- Versioning: uploading a new syllabus must not destroy the old one.
  Existing courses keep a relationship to the syllabus version they
  were generated from.
- Treat syllabus text as untrusted input — validate before storage,
  and be mindful of prompt-injection payloads that could later reach
  an AI call (see `SECURITY.md`).

## Dependencies

Needs a file-storage decision (local disk vs. object storage) before
implementation — flagged as an open question in `DECISIONS.md`.
