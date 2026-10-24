# SHARING.md

**Status: built and verified (Milestone 9).** See `MILESTONES.md` for
the checklist, the 63 live checks, what wasn't verified, and the known
limitations. Security reasoning is in `SECURITY.md`. The design calls
are in `DECISIONS.md` (2026-10-25).

User-facing terms: "Anyone with the link", "Private", "Add to My
Courses", "My Courses", "Shared with me". Internally the result of Add
to My Courses is a **Course Copy** (`course.source = "shared_copy"`).
Never "clone", "fork", or "duplicate" in the UI.

## The model in one paragraph

Every course has one share URL, `/share/{token}`, used by both modes.
`course.visibility` decides who the URL works for. With `link`, it
works for anyone, signed in or not. With `private` (the default), it
works only for the owner and the emails listed in `course_permission`.
Every page render and every share API call re-runs one authorization
gate against the current database state. Nothing is cached, so turning
the link off, resetting it, removing a person, or deleting the course
takes effect on the very next request.

## Share links and tokens

- **Token:** `randomBytes(24).toString("base64url")`, exactly 32
  URL-safe characters (192 bits), in `src/lib/share-token.ts`. Never
  derived from ids or timestamps.
- **Stored plain** in `course.share_token` (unique constraint). It's a
  bearer capability, like the URL it lives in, and it's looked up by
  equality on that unique index. `isShareTokenFormat` rejects anything
  that isn't exactly 32 base64url characters before a query runs.
- **Created lazily** the first time the owner saves share settings:
  changing visibility, "Create link" (which re-saves the current
  visibility), or adding a person. Each of those does
  `coalesce(share_token, <new token>)`, so it never replaces an
  existing token.
- **Turning "Anyone with the link" off** sets `visibility = 'private'`
  and keeps the token. Turning it back on restores the same URL. The
  old public link still stops working right away, because the gate
  checks visibility on every request.
- **Reset link** (`POST /api/courses/[id]/share/reset-link`) writes a
  new token. The old one resolves to "invalid" from the next request.
- **Deleting the course** removes the row, and with it the token, so
  the link is dead. Its `course_permission` rows cascade.

## Private sharing (by email)

`course_permission(course_id, email, role)`, `unique(course_id,
email)`, with an index on `email`.

- Access is granted to an **email**, not a user id. That covers people
  who don't have an account yet: once they sign up with that email,
  the link works. There is no invitation table and no invitation
  state.
- The gate reads the viewer's email from the `user` table by session
  user id and compares it to the permission rows. The email never
  comes from the request.
- Emails are trimmed and lowercased (`normalizeEmail` in
  `src/lib/sharing-utils.ts`), the same normalisation signup applies to
  `user.email`, so they compare by equality.
- `addPerson` rejects an invalid address (zod `email()`, max 254), the
  owner's own email ("You already own this course."), and a 101st
  person (`MAX_SHARE_PEOPLE = 100`). The cap is checked under a
  `SELECT … FOR UPDATE` lock on the owned course row. Re-adding an
  email that's already there is a no-op success.
- **No account enumeration.** No response says whether an email has an
  account.
- **No email is sent.** CourseForge has no email infrastructure. The
  dialog tells the owner to copy the link and send it themselves.
- **Removal** deletes the row, and the next request from that person
  gets "Access restricted".
- Only the `viewer` role exists. The `course_permission_role` enum
  exists so an `editor` role can be added later without a table change.
- The people list persists across visibility changes. In link mode
  it doesn't limit anything (the dialog says so); switch back to
  Private and it's the access list again.

## The authorization gate

`resolveSharedCourseAccess(token, viewerUserId)` in
`src/lib/sharing-service.ts` is the single gate for every `/share`
request. `viewerUserId` always comes from `auth()` on the server.

1. Token fails the format check, or no course has it → `invalid`.
   This happens before any question of who's asking, so an unknown
   token looks the same to everyone.
2. The session user id is re-resolved against `user`. A session for a
   user who no longer exists counts as anonymous.
3. Viewer is the owner → `allowed` (`isOwner: true`).
4. `visibility = 'link'` → `allowed`.
5. Private and anonymous → `sign_in_required`.
6. Private, signed in, a permission row for the viewer's stored email
   → `allowed`, otherwise `forbidden`.

`allowed` carries the course row, `isOwner`, the DB-verified viewer id,
and `ownerDisplayName`: the owner's `name`, or "A CourseForge student".
**It never falls back to the email.**

`getSharedCourse` runs the gate and only then loads the full course,
through the owner-scoped `getOwnedCourse` with the owner id from the
row the gate resolved. There is no unscoped course loader. The result
still contains answers and private columns, so the page passes
questions through `sanitizeQuestionForClient` and hands client
components only what they render.

## The shared course page

`src/app/share/[token]/page.tsx`, under `src/app/share/layout.tsx`.
It's deliberately outside the `(app)` route group, whose layout
redirects anonymous visitors to `/login`.

| Gate result | What the visitor sees |
|---|---|
| `invalid` | "This link isn't valid": it may have been reset or turned off, or the course deleted. Go to CourseForge |
| `sign_in_required` | "This course is private. Sign in with an authorized account to continue." Sign in / Create account, both with `callbackUrl=/share/{token}` |
| `forbidden` | "Access restricted": you don't have permission, ask the owner to invite you. Shows which email you're signed in as, Sign out (returns to the same link), Go to My Courses |
| `allowed` | Header ("Shared course" badge, title, "Shared by {name}", Year · Semester · N Modules · N Quizzes, description, objectives), Start learning, Add to My Courses (not for the owner), then the normal `CourseViewer` |

The owner opening their own link sees the same page, plus a banner
("This is how others see your course" + "Manage sharing", which opens
`/courses/{id}?share=1` and pops the share dialog) and no Add button.

The page's metadata sets `robots: { index: false, follow: false }` and
`referrer: "no-referrer"`. The tab title includes the course title only
for an `allowed` viewer. `next.config.ts` also sends
`Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow` on
`/share/*` and `/api/share/*`. Lesson Markdown can contain external
links, and the token must not leak through `Referer`.

## Learning on a shared course

`CourseViewer` and `ModuleQuiz` take `apiBase` (owner default
`/api/courses/{id}`, shared `/api/share/{token}`) and `persistence`
(`"saved"` | `"anonymous"`). The owner's own course page behaves
exactly as before.

- **Anonymous** (link-shared course): quizzes are graded server-side
  and the results shown, with `saved: false` and the note "This score
  isn't saved — sign in to keep your quiz results." "Mark lesson
  complete" only updates local state. The progress bar reflects this
  visit, under the line "Progress isn't saved while you're signed
  out. Sign in to save your progress".
- **Signed-in viewers** write to `module_progress` keyed by **their own
  user id**. The `(module_id, user_id)` unique key from Milestone 7
  made this possible with no schema change. The owner never sees it.
- `submitSharedQuizAttempt` / `markSharedLessonComplete`
  (`src/lib/progress-service.ts`) re-run the gate on every call, then
  check that the module belongs to the course the gate resolved. A bad
  or rotated token, revoked access, someone else's module id, or a
  non-uuid id all get the same `404 "Module not found."`. Stored quiz
  answers are filtered to the quiz's real question ids.

## Add to My Courses (Course Copies)

`POST /api/share/[token]/copy` → `addSharedCourseToMyCourses(token,
sessionUserId)`. **The request body is ignored entirely.** The original
course, its owner, and the user's right to copy it all come from the
gate.

| Situation | Result |
|---|---|
| Anonymous | `401` "Sign in to add this course to My Courses." |
| Unknown token | `404` "This share link isn't valid." |
| Gate says `sign_in_required` / `forbidden` | `403` |
| The owner | `400` "This is already your course." |
| Already has a copy of this original | `409` `{ error, existingCourseId }` |
| Otherwise | `201` `{ course: { id, title } }` |

Who may copy: anyone the share page currently shows the course to,
except the owner. With a link, that's any signed-in user. With a
private course, it's only the invited emails.

The copy is made inside one transaction. A `pg_advisory_xact_lock` on
`(copier, original)` makes a double click or a second tab wait for the
first copy instead of racing the duplicate check. The copy gets:

- new ids for the course, every module, quiz, and question (modules,
  quizzes, and questions each go in as one multi-row insert)
- `owner_id` = the copier, `source = "shared_copy"`
- `source_course_id` = the original (FK, `ON DELETE SET NULL`)
- `original_creator_name` = the owner's display name, snapshotted.
  If the original is itself a copy, its `original_creator_name` is
  carried forward instead, so the root author keeps the credit
- `copied_at` = now, `version_group_id = id`, `version = 1`
- `visibility = 'private'`, no token, and `subject_id` / `syllabus_id`
  = null, because those belong to another user
- the original's title, code, year, semester, description,
  objectives, and schema version, and every module's content and
  objectives, and every question **including** its correct answer and
  explanation. The copier owns this content now, exactly as if they'd
  imported it
- **no progress**: the copier starts from zero

The original is never modified (verified byte-for-byte on `title`,
`owner_id`, `visibility`, `share_token`, `updated_at`). There is no
sync in either direction. Copies survive the original being unshared
or deleted. Deletion only nulls `source_course_id`.

**Duplicates:** `findExistingCopy` and the in-transaction check look
for a course owned by this user with `source_course_id` = the original.
The page passes `existingCopyId` to the button, which then shows "✓ In
My Courses" + "Open course" from the start. A `409` race lands in the
same state. "Add Another Copy" (brief §61, optional) isn't built. If
the user deletes their copy, they can add the course again.

**The sign-in round trip:** for an anonymous visitor, the button opens a
dialog ("Sign in to save this course") whose Sign in / Create account
links carry `callbackUrl=/share/{token}?add=1`. Login and signup push
that sanitised path afterwards. On landing with `?add=1` and a session,
`AddToMyCourses` runs the add once, then `router.replace`s to
`/share/{token}` so a reload doesn't repeat it. This was checked in
code; the server side was checked live, but no real browser round trip
was run (see `MILESTONES.md`).

## Shared with me

`/shared` (`src/app/(app)/shared/page.tsx`) shows `listSharedWithMe`.
That's every course with a permission row for the signed-in user's
email that the user doesn't own. Each card shows the title, code,
"Shared by {name}", Year · Semester · modules, "Shared {date}", and the
viewer's own progress. "Open" goes to `/share/{token}`. The result
deliberately carries no course id or owner id: the token is the
handle, so every visit goes back through the gate. The empty state
names the user's email.

This lists invites **regardless of current visibility**: an invite on a
course later switched to "Anyone with the link" still appears, because
the invite still stands. It's a one-line change if private-only is
wanted. Link-shared courses you merely opened don't appear. They open
from the link.

## Owner UI

- **Share dialog** (`src/components/courses/share-course-dialog.tsx`),
  opened from the course header's "Share" button or the library card
  menu's "Share…". It loads `GET /api/courses/[id]/share` on every
  open and saves each action immediately. See `UI_UX.md` for the
  layout and states.
- Library cards show "Shared by link" (visibility `link`) or "Shared"
  (private, with at least one person), from `LibraryCourse.visibility`
  and `sharedPeopleCount`. The menu item's description summarises it
  ("Anyone with the link can view" / "Private · shared with N people" /
  "Private").
- The course page shows an "Anyone with the link can view" badge for
  link-shared courses.

## API

Owner routes. All return `401` when signed out and `404` "Course not
found." when the course isn't yours or doesn't exist (same response
either way):

| Route | Body | Returns |
|---|---|---|
| `GET /api/courses/[id]/share` | — | `ShareSettings` `{ visibility, shareToken, people: [{ email, role, addedAt }] }` |
| `PATCH /api/courses/[id]/share` | `{ visibility: "private" \| "link" }` | `ShareSettings` (creates the token if missing); `400` for anything else |
| `POST /api/courses/[id]/share/reset-link` | — | `ShareSettings` with a new token |
| `POST /api/courses/[id]/share/people` | `{ email }` | `ShareSettings`, or `400 { error }` (invalid, own email, over 100) |
| `DELETE /api/courses/[id]/share/people?email=…` | — | `ShareSettings` (removing an absent email is a no-op); `400` if `email` is missing |

Share routes. Token in the path, session optional:

| Route | Returns |
|---|---|
| `POST /api/share/[token]/copy` | see the Add to My Courses table above |
| `POST /api/share/[token]/modules/[moduleId]/quiz-attempt` | `{ answers }` → `{ results, score, total, saved }`; `404 "Module not found."` for any access failure |
| `POST /api/share/[token]/modules/[moduleId]/complete-lesson` | `401` when anonymous, else `{ ok: true }` or the same `404` |

Invalid and rotated tokens get byte-identical `404` bodies, and no
error echoes the token. Unexpected errors in these three routes are
logged through `logShareError`, which logs only the error class and
Postgres code (see `SECURITY.md`).

## Not built

- Email sending of any kind (invites, notifications)
- Roles beyond `viewer`
- "Add Another Copy" (§61, optional)
- Any sync between an original and its copies
- Email verification. This matters here: private access is only as
  strong as the account that holds the invited email (see `SECURITY.md`)
