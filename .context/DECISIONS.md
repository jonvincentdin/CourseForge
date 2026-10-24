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

**Decision:** One AI provider configuration per user (unique on
`user_id`), not multiple simultaneous configs.

**Reason:** The settings UI the brief describes (§37) is a single
provider/key/model form, not a list of saved providers to switch
between. Multiple simultaneous configs would need a "which one is
active" concept the brief never asks for, adding real complexity for
a need that doesn't currently exist. Provider-agnosticism is satisfied
by the swap-the-provider-id-and-values Replace flow already built,
which works fine for the "I use one provider" and "I occasionally
switch providers" cases alike — only "use two providers side by side"
would need a real schema change, and nothing in the brief asks for
that.

**Date:** 2026-09-04

---

**Decision:** The AI model field in `/settings` is free text with a
provider-specific placeholder, not a hardcoded dropdown of known model
ids.

**Reason:** Any hardcoded list of "current" model ids for a fast-moving
API landscape risks going stale (a genuinely valid model released
after this was written would be unusable through a fixed dropdown, or
worse, a dropdown could list a since-deprecated one as if it still
worked). Free text with a realistic placeholder example is honest
about not knowing the future, costs nothing to keep correct, and still
guides the user toward a reasonable value. If a future session wants a
curated dropdown, fetching the real current list from each provider's
own models-list endpoint (rather than hand-maintaining one) would be
the more honest approach — not hardcoding one from training-data
knowledge that may already be stale by the time it's written.

**Date:** 2026-09-04

---

**Decision:** A module counts as "done" when its lesson is marked
complete **and** its quiz has been attempted at least once —
regardless of score. Quiz retakes overwrite the stored score rather
than appending an attempt history.

**Reason:** The product brief never specifies a passing threshold for
"Complete" status, and inventing one (e.g. "70% to pass") would be a
real, opinionated product decision the brief didn't ask for. Requiring
*attempt* rather than *mastery* keeps completion meaningful (you can't
be "done" with a module you never engaged with) without silently
gatekeeping progress behind an arbitrary score. Attempt history was
considered and left out for the same reason as several earlier
simplifications in this project: nothing in the brief asks "show me
every time I took this quiz," and the schema (`quiz_answers` jsonb,
singular, not an array of past attempts) can be extended later if that
need becomes real, without touching anything else.

**Date:** 2026-09-06

---

**Decision:** Course versioning uses a **version group** — every
course row has `version_group_id` (the root version's own `id`) and an
integer `version` — not a parent pointer (`regenerated_from_id`) or a
separate `course_version` table. Regeneration always inserts a new,
complete course row with `version = max(version in group) + 1`; it
never updates or deletes an existing one. `version_group_id` is
deliberately not a foreign key.

**Reason:** Product brief §42 says regeneration must not
automatically destroy the old version, and every version has to stay
a fully working course of its own (own modules, quizzes, progress) —
so each version is a whole `course` row either way; the only question
was how to link them. A parent pointer forms a chain, and deleting a
middle or root version either breaks the chain or needs re-parenting
logic; "all versions of this course" becomes a recursive query; and
"next version number" means walking the chain. A shared group id
makes all three trivial: list = `WHERE version_group_id = ?`, next
number = `max + 1`, and deleting any version — including the root —
leaves the rest intact because nothing points at a row. That's also
why it isn't an FK: the root can be deleted, so there's no row it
could safely reference. A separate version table would have meant
moving the existing `course` → module → quiz tree under a new parent,
a much larger migration for no gain. Numbering is serialised per
group with `pg_advisory_xact_lock` inside the insert transaction,
backed by `unique(version_group_id, version)`. Accepted consequence:
deleting the *newest* version lowers the max, so its number is handed
out again by the next regeneration (deleting an older one never
frees its number).

**Date:** 2026-10-23

---

**Decision:** `/courses` loads the user's whole library in one server
call (`listCourseLibrary`) and does search, filtering, and sorting
client-side (`src/lib/course-library-filter.ts`), rather than
server-side with query parameters and pagination.

**Reason:** A student's library is tens of courses, not thousands.
At that size, client-side filtering is instant on every keystroke
with no request per change, no debouncing, and no loading states, and
the logic is a pure function that's unit-tested without a database.
The server query is already bounded (two queries total, no N+1, an
index on `course.owner_id`). Costs: the whole list goes to the browser
on every visit, and filter state isn't in the URL (not shareable or
bookmarkable). Revisit with server-side filtering and pagination if
real libraries get large enough for the payload or render time to
matter — `LibraryFilters` already describes the parameters a server
version would take.

**Date:** 2026-10-23

---

**Decision:** Vitest is pinned to `^3.2.7`, not the latest major.

**Reason:** Vitest 5 requires `@types/node >= 22`, and this project
pins `@types/node ^20` (it's built against Node 20+ per
`DEVELOPMENT.md`). Bumping `@types/node` to satisfy a test runner
would quietly widen the Node APIs the type checker accepts beyond what
the app is meant to run on. Vitest 3 does everything the current
pure-logic unit tests need. Revisit both pins together, deliberately,
if the project's minimum Node version moves to 22 — same principle as
the Next.js pin above.

**Date:** 2026-10-23

---

**Decision:** One share URL per course, `/share/[token]`, used by both
sharing modes. The token is `randomBytes(24).toString("base64url")`
(32 characters, 192 bits), stored **plain** in a unique-indexed
`course.share_token`, and created lazily the first time the owner
saves share settings.

**Reason:** One URL means the owner never has to know which link goes
with which mode. Switching modes changes who the same link works for,
and the dialog has a single link to copy. 192 CSPRNG bits can't be
guessed or enumerated. The token is a bearer capability, exactly like
the URL it lives in, and it's looked up by equality on a unique index.
Unlike a password, it guards nothing a database reader couldn't read
directly, so hashing it would add cost (and remove the owner's ability
to see their own link again) for no real protection. Lazy creation
means courses that are never shared never get a token.

**Date:** 2026-10-25

---

**Decision:** `course.visibility` is `"private"` (default) or `"link"`.
Turning "Anyone with the link" off just sets `"private"`: the token
stays, so turning it back on restores the same link. Every request
re-checks visibility. "Reset link" is the way to kill a link for good:
it rotates the token.

**Reason:** Owners toggle sharing on and off, and making them
re-distribute a new link every time would punish that. Revocation
still has to be immediate (product brief), and it is: nothing caches
an access decision, so the next request after "off" fails. A leaked
link is a different problem from "stop sharing for now", so it gets
its own explicit action (Reset link, with a confirmation that says the
current link will stop working).

**Date:** 2026-10-25

---

**Decision:** Private access is granted **by email**:
`course_permission(course_id, email, role)`. The access check
compares the signed-in user's email, read from the DB by session user
id and never taken from the client, against that list. There is no
invitation table and no email sending. The owner adds an email, then
shares the link themselves. Responses never reveal whether an email
has an account.

**Reason:** Keying on email covers people who don't have an account
yet. They get access the moment they sign up with that email, with no
pending-invitation state to model, expire, or clean up. CourseForge
has no email infrastructure, so "send an invite" isn't available
anyway; the dialog says so plainly. Removal is just deleting the row,
which takes effect on the next request. Saying "no account with that
email" would let anyone probe which addresses are registered, so the
add flow behaves identically either way. **Accepted limitation:**
signup doesn't verify email ownership, so private access is only as
strong as the app's account ownership of that email. Whoever
registers an invited address first gets that access. Acceptable for
class study material; revisit with email verification (see
`SECURITY.md`).

**Date:** 2026-10-25

---

**Decision:** The permission role enum, `course_permission_role`,
has a single value, `"viewer"`.

**Reason:** The brief asks for view-only sharing in the initial
version. The enum and the `role` column make an `editor` role a
code-and-enum change later rather than a table redesign. Building
editing now would mean deciding what shared editing even means next to
versioning and Course Copies, which nobody has asked for yet.

**Date:** 2026-10-25

---

**Decision:** Anonymous visitors to a link-shared course can read
lessons **and take quizzes**. Quizzes are graded server-side and the
results shown, but nothing is persisted, and "Mark lesson complete"
is local state only. Signed-in viewers' progress is persisted in
`module_progress` under their own user id. The owner never sees viewer
progress.

**Reason:** The brief says viewing a public course never requires an
account. A course whose quizzes refuse to work until you sign up isn't
really viewable, so grading is allowed while storage needs an account
to attach to. Server-side grading keeps answers off the page exactly
as on the owner's course (Milestone 7). Keying progress by the
viewer's id reuses the Milestone 7 table unchanged and isolates every
viewer by construction. Not exposing viewer activity to the owner is
the brief's privacy requirement (§64), and there's no UI asking for it.

**Date:** 2026-10-25

---

**Decision:** Add to My Courses creates an independent **deep copy**:
course, modules, quizzes, and questions, all with new ids, owned by
the copier. It gets `source: "shared_copy"` and `sourceCourseId` = the
original (FK, `set null` on delete), plus `originalCreatorName` (the
owner's display name, snapshotted; never an email) and `copiedAt`. It
starts a fresh version group (`versionGroupId = id`, `version = 1`),
is private with no token, and has `subjectId`/`syllabusId` null. No
progress is copied. There's no sync in either direction.

**Reason:** The brief requires the copy to be a fully independent
record that survives the original being unshared or deleted. Any
reference-based scheme (pointing at the original's modules) would break
on deletion and let the original's edits rewrite someone else's
study material. A fresh version group keeps the copy out of the
original owner's version history; `getCourseVersions` filters by owner
anyway. Subject and syllabus belong to another user, so carrying them
over would point a course at rows its owner can't see. A name snapshot
(not a join to `user`) means the credit survives the original owner
deleting their account, and it never exposes an email. `set null`
rather than cascade on `sourceCourseId` is what lets copies outlive
the original.

**Date:** 2026-10-25

---

**Decision:** Anyone the share page would currently show the course to
may copy it, except the owner. With a link, that's any signed-in user;
with a private course, the invited emails. The owner gets `400` "This
is already your course.". If the user already has a course with
`sourceCourseId` = the original, the API returns `409 { error,
existingCourseId }` instead of making a second copy.

**Reason:** "May copy" should never disagree with "may see", so it's
the same gate. Copying your own course would just be a confusing
duplicate. The brief asks that duplicates be handled rather than
silently multiplied, so returning the existing id lets the UI say "✓ In
My Courses" with Open course. An advisory lock per (copier, original)
inside the copy transaction stops a double click from racing past the
check. "Add Another Copy" (§61, optional) wasn't built; the `409` path
is where it would go.

**Date:** 2026-10-25

---

**Decision:** The owner opening their own share link sees the shared
view, with a banner ("This is how others see your course" + Manage
sharing) and no Add button.

**Reason:** "What does the person I sent this to actually see?" is the
question an owner opening their own link is asking. Redirecting them
to `/courses/[id]` would hide the answer. Manage sharing deep-links to
`/courses/[id]?share=1`, which opens the share dialog.

**Date:** 2026-10-25

---

**Decision:** `/share/*` and `/api/share/*` responses carry
`Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow`
(`next.config.ts` `headers()`). The page metadata also sets
`robots: { index: false }` and `referrer: "no-referrer"`.

**Reason:** The token is in the URL. Lesson Markdown can contain
external links, and without `no-referrer` following one would hand the
token to that site in the `Referer` header. `noindex` keeps a link that
someone posts publicly out of search results. Headers cover every
response; the meta tags are belt and braces for the HTML.

**Date:** 2026-10-25

---

**Decision:** Every post-login/signup `callbackUrl` is sanitised to a
same-origin relative path by `safeCallbackUrl(raw, fallback =
"/dashboard")`. It accepts only strings starting with a single `/`,
and rejects `//`, `/\`, any backslash, control characters, values that
become unsafe after percent-decoding, and anything that
`new URL(x, "http://n")` resolves to another origin.

**Reason:** The share flow needs "sign in, then come back to this
shared course", which means trusting a URL from the query string.
`login-form.tsx` already pushed any `callbackUrl` it was given: an
existing open redirect (`/login?callbackUrl=https://evil.example`).
Fixing it once, in a pure edge-safe helper used by both forms and by
middleware's already-signed-in redirect, closes that hole and makes
the new return path safe. An allow-list of "starts with one slash"
plus an origin check is simpler to reason about than trying to
recognise every hostile form.

**Date:** 2026-10-25

---

**Decision:** (made during implementation) `listSharedWithMe` lists
every course with a permission row for the user's email, **regardless
of current visibility**, not only private ones.

**Reason:** If an owner invites someone and later switches the course
to "Anyone with the link", the invite still stands and access still
works. The course vanishing from "Shared with me" at that moment would
look like access had been taken away. Restricting it to private
courses is a one-line `where` change in `src/lib/sharing-service.ts`
if that's preferred.

**Date:** 2026-10-25

---

**Decision:** (made during implementation) A copy of a copy keeps the
**first** creator's name: when the course being copied is itself a
`shared_copy` with an `originalCreatorName`, that name is carried
forward instead of the intermediate sharer's. `sourceCourseId` still
points at the course actually copied from.

**Reason:** "Original creator" should mean whoever made the content,
not whoever passed it on. `sourceCourseId` keeps the real lineage
anyway, for anything that needs the immediate parent.

**Date:** 2026-10-25

---

## Open questions (not yet decided — flag before Milestone 2 starts)

- **AI provider abstraction shape** (Milestone 6): what the common
  interface looks like across providers (OpenAI-compatible vs.
  Anthropic-style tool use vs. something else) isn't decided yet.
- **Deployment target:** nothing has been chosen. Affects the
  syllabus-file-storage decision below and how `DATABASE_URL` gets
  provisioned.
- **Should reprocessing a syllabus keep its courses regenerable?**
  (raised 2026-10-23, Milestone 8). Reprocess deletes and recreates
  the syllabus's subjects (`reprocessSyllabus` in
  `src/lib/syllabus-service.ts`), and `course.subject_id` is `set
  null` on delete, so every course generated from that syllabus loses
  its subject link. Those courses then show "can't regenerate" and
  `POST /api/courses/[id]/regenerate` returns `409` — even though the
  syllabus itself still exists. Options: (a) leave it — reprocess is
  rare and the UI explains the state; (b) on reprocess, re-link each
  course to the new subject with the same code in the same syllabus
  (falls apart for subjects without a code, or whose code changed
  between extractions); (c) make reprocess update subjects in place
  rather than delete and recreate them (a bigger change to Milestone
  2's flow, and it's the deliberate "discard manual edits" behaviour
  being changed). Nothing is decided; today's behaviour is (a) by
  default. The reprocess confirmation doesn't currently warn about
  this either.
- **Should private sharing require a verified email?** (raised
  2026-10-25, Milestone 9). Private access is granted to an email and
  signup doesn't verify ownership, so registering an invited address
  first grants its access. Options: (a) leave it for class material;
  (b) add email verification at signup; (c) only honour permission
  rows for accounts with `email_verified` set. (b) and (c) both need
  email sending, which CourseForge doesn't have. Today's behaviour is
  (a).

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
