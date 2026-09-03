# DECISIONS.md

Record of technical decisions and why they were made, so they aren't
silently re-litigated or accidentally reverted by a future session.

---

**Decision:** Pin Next.js to the stable 15.x line (`^15.5.25`) instead
of the `latest` tag, which resolved to a 16.x prerelease.

**Reason:** The 16.x prerelease ships its own AGENTS.md warning that
it has breaking changes from the Next.js most training data reflects,
and explicitly instructs agents to read its bundled docs before
writing any code. For a project meant to be built incrementally across
many sessions (possibly by different Claude instances), building on a
moving, agent-warned prerelease is a reliability risk that isn't worth
whatever new features it offers at this stage.

**Date:** 2026-09-03

---

**Decision:** Use Drizzle ORM instead of Prisma.

**Reason:** `prisma@latest` resolved to an 8.0.0 release candidate
with an unfamiliar CLI/config surface (`prisma.config.ts`, `prisma
skills sync`). More concretely, `prisma generate`/`prisma -v` failed
outright in the build sandbox because it needs to download engine
binaries from `binaries.prisma.sh`, a domain outside that sandbox's
network allowlist — meaning the ORM layer could not be verified at
all. Drizzle is pure TypeScript with no native binary/download step
and was fully verified (typecheck + build) in the same environment.
This is a genuine constraint, not just a preference, but Drizzle is
also a reasonable permanent choice for a Postgres + Next.js app of
this shape — no need to revisit unless there's a concrete reason
(e.g. a strong preference for Prisma's tooling/ecosystem).

**Date:** 2026-09-03

---

**Decision:** Design direction is "steel & ember" — cool structural
palette (paper/ink/steel) with a single warm ember accent — rather
than the warm-cream-and-terracotta or near-black-and-acid-accent
palettes that are currently the most common AI-generated-design
defaults.

**Reason:** Avoids the specific visual tells called out for generated
design (warm cream ~#F4F1EA + terracotta ~#D97757 in particular), and
"forge" as a name supports a steel/ember metaphor naturally — it's
grounded in the actual product name and subject matter rather than
picked arbitrarily.

**Date:** 2026-09-03

---

**Decision:** Route protection is enforced twice — once in
`middleware.ts` (edge, via Auth.js's `authorized()` callback) and
again server-side in `(app)/layout.tsx` via a direct `auth()` call and
redirect.

**Reason:** Defense in depth. Middleware matchers are easy to get
subtly wrong (a route added later and forgotten in the matcher, a
regex edge case); a second, simpler server-side check in the layout
itself means a mistake in the middleware config doesn't silently
expose a page.

**Date:** 2026-09-03

---

**Decision:** Syllabus versioning is "each upload is an independent
record," not a parent/lineage model with explicit version numbers.

**Reason:** The brief explicitly allows either "versions or separate
syllabus records" (§24). A lineage model (linking re-uploads to a
common curriculum, tracking which is "current") adds real complexity
— what counts as a new version vs. an unrelated syllabus? does
re-uploading auto-supersede the old one or coexist? — for a
requirement the brief itself says a simpler model satisfies. If a real
need for lineage emerges (e.g. "regenerate this course from the latest
version of the same curriculum"), revisit then with a concrete use
case driving the design, rather than speculatively now.

**Date:** 2026-09-03

---

**Decision:** Syllabus subject/year/semester detection is a
regex-based heuristic (`src/lib/syllabus-extraction.ts`), not an AI
call.

**Reason:** The brief's milestone breakdown puts AI capability
entirely in Milestones 5–6, scoped to *course generation*, not
syllabus extraction. Building an AI-dependent extraction step into
Milestone 2 would mean syllabus upload doesn't work at all until AI
configuration exists three-to-four milestones later — a real
regression for a feature the brief describes as usable standalone.
The heuristic parser is honest about its limits (see
`SYLLABUS_PROCESSING.md`): it's why every extraction lands in
`needs_review`, never auto-`ready`, and why the review UI exists as a
first-class step rather than an edge case. Revisit if/when Milestone
5/6's AI infrastructure exists and there's appetite to offer
AI-assisted extraction as an *upgrade* to this, not a replacement
requirement for basic upload to work.

**Date:** 2026-09-03

---

**Decision:** `course.subject_id` and `course.syllabus_id` are
nullable foreign keys with `onDelete: "set null"`, not cascade delete.

**Reason:** A course is a point-in-time snapshot of Markdown/quiz
content, not a live view of its source syllabus. If a user deletes the
syllabus a course was generated from, the course itself must keep
working — the brief never suggests deleting a syllabus should destroy
courses generated from it, and doing so would be a genuinely
surprising, destructive default. The FK is kept (not dropped entirely)
purely for provenance/display ("generated from X"); `set null` means
that display detail quietly degrades instead of the course vanishing.

**Date:** 2026-09-03

---

**Decision:** Markdown is rendered via `react-markdown` + `remark-gfm`
**without** `rehype-raw`, and no separate HTML-sanitizer library
(e.g. `dompurify`, `rehype-sanitize`) was added.

**Reason:** `react-markdown` without `rehype-raw` never parses
embedded HTML as markup in the first place — it's escaped to literal
text. That's a stronger default than "sanitize after parsing raw
HTML," and it means there's no sanitizer configuration to get subtly
wrong. Verified live with two real payloads (see `SECURITY.md`). If a
future milestone needs to support raw HTML in Markdown for some
legitimate reason, `rehype-raw` must not be added without a real
sanitizer alongside it in the same change — never as two separate
steps.

**Date:** 2026-09-03

---

**Decision:** The Milestone 4 import UI is a bare paste-JSON textarea
with an "Use example JSON" convenience button — no prompt generator,
no "copy this into ChatGPT" flow, no schema-download button.

**Reason:** Those are explicitly Milestone 5 deliverables (external AI
workflow — product brief's own milestone breakdown). Building them
into Milestone 4 would blur the boundary between "the data model and
its validation work" (this milestone's actual job) and "a polished
AI-assisted authoring experience" (Milestone 5's job), and risks doing
Milestone 5's UI work without yet having thought through its specific
requirements (prompt content grounded in syllabus data, JSON schema
download, copy-to-clipboard UX). The underlying `validateCourseImport`
+ `importCourseFromJson` functions this milestone built are exactly
what Milestone 5's polished UI will call — nothing here needs to be
rebuilt, only wrapped in better UI.

**Date:** 2026-09-03

---

## Open questions (not yet decided — flag before Milestone 2 starts)

- **AI provider abstraction shape** (Milestone 6): what the common
  interface looks like across providers (OpenAI-compatible vs.
  Anthropic-style tool use vs. something else) isn't decided yet.
- **Deployment target:** nothing has been chosen. Affects the
  syllabus-file-storage decision below and how `DATABASE_URL` gets
  provisioned.

## Resolved

**Decision:** Syllabus PDFs are stored on local disk
(`src/lib/storage.ts`, `STORAGE_DIR` env var, default `./storage`) for
now, behind a small abstraction (`saveFile`/`readStoredFile`/
`deleteStoredFile`) so the implementation can be swapped later without
touching any calling code.

**Reason:** No deployment target has been chosen yet (see the open
question above), so there's no concrete requirement to build against
an S3-compatible API today. Local disk is simplest for development and
was fully verified end-to-end in this session (file written on
upload, read back on reprocess, deleted on syllabus delete — all
confirmed against the real filesystem). **This will not survive most
deployment targets' ephemeral filesystems** — swap `storage.ts`'s
implementation for an object-storage backend before deploying
anywhere except a single long-lived server with a persistent disk.
Revisit once a deployment target is actually chosen, not before.

**Date:** 2026-09-03
