# SYLLABUS_PROCESSING.md

**Status: built (Milestone 2), verified against a real PDF and a real
database.** This file describes what actually exists, including its
real limits — not the aspiration.

## Upload

`POST /api/syllabi`, multipart form data, `file` field. Handled by
`src/app/api/syllabi/route.ts` → `src/lib/syllabus-service.ts`.

## Validation (`src/lib/file-validation.ts`)

- Rejects empty files
- Rejects files over 20MB
- Rejects anything not named `*.pdf` with a `application/pdf` (or
  blank) MIME type
- Rejects anything that doesn't start with the real `%PDF-` magic
  bytes — catches a renamed non-PDF before it ever reaches the parser

Verified live: a plain-text file renamed with PDF-shaped multipart
metadata was correctly rejected with a `422` and a specific message,
not a generic error or a silent crash.

## Extraction pipeline

1. **Text extraction** (`src/lib/pdf.ts`) — `unpdf` (a pdf.js wrapper
   with no native binary dependency, chosen so it would actually run
   in a network-restricted build environment — confirmed working
   against a real generated PDF).
2. **Structure detection** (`src/lib/syllabus-extraction.ts`) — a
   **regex-based heuristic parser**, not an AI call. It looks for:
   - Year headings: `"Year 2"`, `"2nd Year"`, etc.
   - Semester headings: `"1st Semester"` / `"First Semester"`, `"2nd
     Semester"` / `"Second Semester"`, `"Summer"`
   - Subject lines: an optional course-code prefix (`CS201`, `IT-201`,
     `CS 201A`) followed by a name; falls back to treating the whole
     line as the subject name if no code pattern matches
   - The first line of the document, if it doesn't look like a
     year/semester heading, becomes the suggested syllabus title

   **What this genuinely cannot do:** syllabi that don't use
   recognizable "Year N" / "Nst/nd Semester" headings, multi-column
   PDF layouts where `unpdf` extracts text out of visual order, or
   subject lists embedded in tables rather than plain lines. This is
   why every extraction result lands in `needs_review` status, never
   `ready` — the brief is explicit that uncertain extraction must
   never be silently presented as fact, and this parser is uncertain
   often enough that skipping review would be a real problem, not a
   theoretical one.

3. **Warnings** — if no year heading, no semester heading, or zero
   subjects were detected, a specific warning is generated and
   persisted (`syllabus.extraction_warnings`) so it's visible on the
   review page even on a later visit, not just immediately after
   upload.

## Review/edit workflow

`/syllabi/[id]/review` — every detected subject is independently
editable (code, name, year, semester, units), autosaving per-field on
blur/change (`PATCH /api/syllabi/[id]/subjects/[subjectId]`). Editing
or manually adding a subject flips `auto_detected` to `false`, so the
data itself records what a human confirmed versus what was guessed.
Subjects can be removed. New subjects can be added manually
(`POST /api/syllabi/[id]/subjects`). Nothing is queryable elsewhere in
the app as `ready` until the user explicitly clicks "Save and finish"
(`POST /api/syllabi/[id]/finalize`).

## Persistence

The original PDF is stored via `src/lib/storage.ts` (see
`DECISIONS.md` for the local-disk-for-now caveat), not just the
extracted text — required for `reprocess` to work, and for the
brief's explicit "don't only store extracted text" requirement.

## Reprocessing

`POST /api/syllabi/[id]/reprocess` re-reads the *original stored PDF*
and re-runs extraction, **replacing** all current subjects. This
discards any manual edits or manually-added subjects — the UI
(`ReprocessButton`) shows a confirm dialog saying exactly that before
calling it. Verified live: reprocessing after an edit + a manual add
correctly reverted to the freshly re-detected 5 subjects.

## Syllabus library (`/syllabi`)

View / rename (API only right now, no rename UI yet — see below) /
delete / reprocess / open for review or viewing, depending on status.
Deleting a syllabus cascades to its subjects in the database and
deletes the stored PDF file — both verified live.

## Versioning

Each upload is a fully independent `syllabus` row — re-uploading a new
version of a curriculum does not touch or delete any older syllabus.
See `DECISIONS.md` for why this satisfies the brief's versioning
requirement without a parent/lineage model.

## Explicitly not built yet

- No rename UI (the `PATCH /api/syllabi/[id]` route exists and works,
  but nothing in the UI calls it yet)
- No way to download/re-view the original PDF from the UI (it's
  stored and retrievable via `readStoredFile()`, just not wired to a
  route yet)
- No object storage — see `DECISIONS.md`'s open question
- Course generation from a subject (`Generate course` buttons are
  visibly disabled stubs) — Milestone 5/6
