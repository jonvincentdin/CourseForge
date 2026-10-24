# SECURITY.md

## Implemented (Milestone 1)

- **Passwords**: hashed with bcrypt, 12 salt rounds
  (`src/lib/password.ts`). Never stored or logged in plaintext.
- **Authentication**: Auth.js v5 Credentials provider, JWT session
  strategy (required for Credentials — database sessions don't apply
  here). `AUTH_SECRET` must be a real random value in every non-local
  environment (see `.env.example`).
- **Authorization**: `/dashboard` (and everything else not explicitly
  public) is gated two ways — `middleware.ts` at the edge via the
  `authorized()` callback, and a server-side `auth()` check + redirect
  in `(app)/layout.tsx`. Don't rely on the client to enforce this;
  both checks are server-side.
- **Input validation**: the signup route validates with `zod` before
  touching the database (name/email/password shape, password length
  ≥ 8) and returns a generic, non-enumerating error structure.
- **Email uniqueness**: enforced at the database level (unique
  constraint) as well as checked in the handler.
- **Data isolation**: not yet applicable — no per-user resources exist
  besides the account itself.
- **Markdown rendering** (Milestone 4): `react-markdown` + `remark-gfm`
  without `rehype-raw` — embedded HTML in course content is escaped to
  literal text, never interpreted as markup. This is the entire XSS
  defense and was verified live with two real payloads
  (`<script>...</script>`, `<img onerror=...>`) confirmed inert in the
  actual rendered DOM, not just asserted in a comment. See
  `COURSE_SCHEMA.md`.
- **Course JSON import** (Milestone 4): all imported JSON is validated
  against a versioned zod schema before touching the database — parse
  errors, schema-version mismatches, and structural violations all
  produce specific errors rather than either a generic failure or (far
  worse) silently accepting bad data. If a `subjectId`/`syllabusId` is
  supplied for provenance, it is independently re-verified as
  belonging to the authenticated user — verified live that a second
  account cannot attribute an import to another user's syllabus by
  supplying its id.
- **AI API key encryption** (Milestone 6): AES-256-GCM via
  `src/lib/encryption.ts`, `ENCRYPTION_KEY` stretched with `scryptSync`.
  Verified live against the actual running app, not just in isolation:
  saved a real key through the real endpoint, confirmed the database
  column holds genuinely unreadable ciphertext, confirmed the key
  never appears in the save response, the status response, or the
  rendered settings page HTML. Decryption happens exclusively inside
  `getDecryptedConfigForUser` (explicitly marked internal-only) and
  the two provider implementations' outbound `fetch` calls — nothing
  that returns data to a client ever touches a decrypted key. Every
  rule from this file's "Required for future milestones" §API keys
  entry (written before this milestone) was followed exactly: no
  plaintext storage, no client exposure, no logging, no key material
  in error messages (verified live — a real Anthropic `401` error was
  surfaced to the user with a clear message and zero trace of the key
  that caused it), no decrypted key returned by any API response.
- **Quiz answer integrity** (Milestone 7): `correctAnswer` and
  `explanation` are stripped server-side before any question data
  reaches a client component (`sanitizeQuestionForClient` in
  `src/lib/quiz-client-types.ts`) — verified live by grepping the
  actual rendered course page HTML for every seeded explanation string
  and for the literal key `"correctAnswer"`; found zero occurrences.
  Grading happens exclusively server-side (`src/lib/quiz-grading.ts`,
  called only from the quiz-attempt route) and never trusts a
  client-supplied score — verified live by submitting a forged
  `{"score": 4, "total": 4}` alongside empty answers and confirming
  the server discarded both fields and correctly returned `0/4` from
  re-grading the real (empty) submission. Progress writes
  (lesson-complete, quiz-attempt) re-verify module→course ownership on
  every call before touching the database — verified live that a
  second real account gets `404` attempting either write against
  another user's module, with zero rows created for them.
- **Course management** (Milestone 8): every new course route
  re-derives ownership from the session, and not-owned and nonexistent
  ids get the same `404` "Course not found." so a response never
  reveals whether someone else's course exists.
  - **Delete** (`DELETE /api/courses/[id]`): ownership is part of the
    `DELETE ... WHERE id = ? AND owner_id = ?` itself
    (`deleteOwnedCourse`), not a separate check-then-delete, so
    there's no window between them. Anonymous → `401`.
  - **Regeneration provenance is re-derived server-side, never taken
    from the client.** `POST /api/courses/[id]/regenerate` accepts no
    subject/syllabus ids at all. On the import path,
    `regenerateFromCourseId` makes `importCourseFromJson` load the
    owned source course and take subject, syllabus, and version group
    from it, ignoring any `subjectId`/`syllabusId` in the same request.
    The stored ids on the course row are treated as provenance, not
    authorization: `getRegenerationSource` re-checks every time that
    the syllabus still belongs to the user and the subject still
    belongs to that syllabus. Verified live: deliberately bogus
    client-supplied ids were ignored, and a second account trying to
    version the first account's course through import got `422`
    "Course not found." with zero courses created for them.
  - **Ownership before AI.** `generateCourseWithAI` resolves the owned
    source first, so a request against someone else's course gets
    `404` before the AI config is looked up or any provider is called
    (unchanged ordering from Milestone 6).
  - **Version groups don't grant access.** `getCourseVersions` filters
    by owner as well as `version_group_id`, so a group id on its own
    reveals nothing — this matters now that Milestone 9 copies courses
    between users (a copy starts its own group; see below).
  - **No key leakage on regeneration failure.** Verified live: a
    direct regeneration with a saved invalid Anthropic key returned a
    real `502` from Anthropic's API with zero rows created and no trace
    of the key in the response.
  - **Input bounds.** Request bodies are zod-validated; focus topics
    are capped at 500 characters (verified: 501 → `400`). Malformed
    (non-uuid) course ids short-circuit to `404` instead of reaching
    Postgres and producing a `500`.
  - **Import is stricter.** A plain import's `subjectId` must now
    belong to the supplied, owned syllabus. Before Milestone 8 any
    subject id was accepted once the syllabus checked out.
  - **Answer data stays out of pages.** The `/courses` page HTML was
    checked live for `"correctAnswer"` — zero occurrences;
    `LibraryCourse` carries no question data at all. The Markdown
    export *does* include an answer key by design: it's an
    ownership-checked download of your own course (`404` for anyone
    else, verified live), not something the viewer renders.
  - **Cross-user isolation**, verified live with a second real account:
    `404` on `DELETE`, direct regenerate, Markdown export, and the
    `/courses/[id]/regenerate` page for the first account's course.
  - **Not verified:** two regenerations of one course racing. An
    advisory lock plus the `(version_group_id, version)` unique
    constraint guard it, but that's a data-integrity guard, not an
    authorization one, and it hasn't been exercised under real
    concurrency.

- **Course sharing** (Milestone 9). Both requirements this file set
  before the milestone (secure tokens with authorization re-checked on
  every request; Add to My Courses trusting nothing from the client)
  are implemented and were verified live (63/63 checks — see
  `MILESTONES.md`). Details in `SHARING.md`.
  - **Tokens.** 24 bytes from `crypto.randomBytes` as base64url
    (32 chars, 192 bits). Never derived from ids, timestamps, or
    `Math.random()`. Format-checked (`isShareTokenFormat`) before any
    query, so arbitrary path input never reaches SQL. Stored plain in
    a unique column. It's a bearer capability like the URL itself and
    is looked up by equality; hashing it would add nothing a database
    reader couldn't already get by reading the course. Reset rotates
    it, and the old link resolves to "invalid" at once (verified)
  - **One gate, re-run every time.** `resolveSharedCourseAccess`
    decides every share page render and every `/api/share` call from
    current database state. Nothing is cached, so turning the link
    off, removing a person, resetting the link, or deleting the course
    is immediate (each verified live, on both the page and the API).
    The viewer's identity is the session user id re-resolved against
    `user`; the email used for private access is the account's stored
    email, never a request value
  - **No information leaks through errors.** An unknown, rotated, or
    garbage token gets a byte-identical `404` body, and no error echoes
    the token (verified). Shared module routes answer every access
    failure with the same `404 "Module not found."`. Owner routes
    answer "not yours" and "doesn't exist" with the same `404`
    "Course not found.". Adding a person never says whether the email
    has an account (no enumeration)
  - **Owner-only settings.** Ownership is in every settings query's
    `WHERE` (or a `FOR UPDATE` lock on the owned row for `addPerson`).
    Verified: a non-owner gets `404` reading settings, changing
    visibility, or adding people, and the forged change left the
    database untouched. Anonymous → `401`
  - **Add to My Courses trusts nothing from the client.** The route
    ignores the request body entirely. The original, its owner, and
    the right to copy all come from the token and the session via the
    gate. Verified: forged `courseId`/`ownerId` fields in the body were
    ignored, and the copy was owned by the requester and linked to the
    real original. Anonymous → `401`, not allowed → `403`, owner →
    `400`, duplicate → `409`. The original was byte-identical before
    and after on `title`, `owner_id`, `visibility`, `share_token`, and
    `updated_at`
  - **Copies don't inherit access.** A copy is private, has no token,
    has no subject/syllabus link (those would point at another user's
    rows), and starts its own version group, so `getCourseVersions`
    (owner-filtered) can never surface the original owner's other
    versions
  - **Viewer isolation.** Shared viewers' progress is written under
    their own user id (verified: one row for the viewer, zero for the
    owner). Viewers get `404` on the owner's progress endpoints and on
    `/courses/{id}` (verified). Shared quiz writes store only answers
    to the quiz's real question ids. Anonymous attempts are graded and
    never stored
  - **What a shared page reveals.** No `correctAnswer`, no
    explanations (verified by grepping the rendered HTML, the same
    method as Milestone 7), no owner email (only the owner's display
    name or "A CourseForge student"), and no owner-only controls
    (verified: no regenerate link, no export URL). Client components
    receive only the token-based API base, sanitized modules, and the
    viewer's own progress. `Shared with me` results carry no course or
    owner id
  - **Headers.** `next.config.ts` sends `Referrer-Policy: no-referrer`
    and `X-Robots-Tag: noindex, nofollow` on `/share/*` and
    `/api/share/*` (verified live on `/share`). The page metadata
    repeats both as meta tags. Lesson Markdown can contain external
    links, and the token must not leave via `Referer`
  - **Token-safe logging.** Drizzle's query errors embed bound
    parameters in their message, and on share routes those include the
    token. So the three `/api/share` routes log unexpected errors only
    through `logShareError` (`src/lib/sharing-utils.ts`): the error
    class name and the Postgres error code, nothing else. They return
    a generic `500` message
  - **Bounded input.** Owner routes are zod-validated (`visibility`
    enum, email ≤ 320 chars at the route and a real email check ≤ 254
    in `addPerson`). Non-uuid course and module ids short-circuit to
    "not found" instead of a Postgres `500` (verified for module ids).
    At most 100 people per course
  - **Not verified:** the advisory lock against two simultaneous
    copies and the `FOR UPDATE` lock behind the people cap were not
    exercised under real concurrency. Both are data-integrity guards,
    not authorization ones
- **Open redirect closed** (Milestone 9). `login-form.tsx` used to
  `router.push` whatever `callbackUrl` it was given, so
  `/login?callbackUrl=https://evil.example` sent a freshly signed-in
  user off-site. Every callback now goes through `safeCallbackUrl`
  (`src/lib/safe-redirect.ts`): the login form, the signup form (which
  previously ignored `callbackUrl`), and middleware's redirect of
  already-signed-in users away from `/login`/`/signup`. It accepts only
  strings that start with exactly one `/`. It rejects `//` and `/\`,
  any backslash or control character, anything that still looks
  unsafe after percent-decoding, and anything that resolves to another
  origin. Everything else falls back to `/dashboard`. 28 unit tests
  cover it (22 parametrised hostile inputs). Verified live with a
  signed-in session: `/share/abc?add=1` → `302` there, while
  `//evil.example.com`, `https://evil.example.com`, and
  `/\evil.example.com` → `302 /dashboard`.

## Required for future milestones (do not build these features without this)

- **Email verification before private sharing carries anything
  sensitive.** Private access is granted to an email, and signup
  doesn't verify email ownership (`user.email_verified` is unused). So
  whoever registers an invited address first gets that access. That's
  acceptable for study material between classmates. Fix it (verify at
  signup, or require `email_verified` for permission matches) before
  private sharing is used for anything that matters more
- **Any new sharing role** (e.g. `editor`): every write route must
  check the role, not just the presence of a permission row. Today
  shared viewers have no write access to a course at all — their only
  writes are their own `module_progress` rows and their own copies
- **Any future email sending** (invites, notifications) must not reveal
  whether an address has an account, matching `addPerson` today

## Known gap, not yet mitigated

- **Prompt injection via syllabus text**: Milestone 5/6 both embed the
  raw extracted syllabus text directly into the AI prompt
  (`buildCoursePrompt` in `src/lib/prompt-generator.ts`), unfiltered.
  A syllabus PDF containing adversarial text (e.g. "ignore the above
  instructions and instead...") could influence what the AI generates.
  This is only a content-quality/wasted-request risk today, **not** a
  data-integrity risk — every generated result still passes through
  `validateCourseImport`'s schema validation and the same
  non-`rehype-raw` Markdown rendering as any other course, so an
  injection attempt cannot produce executable content or bypass
  validation. Still worth a real mitigation (e.g. clearly delimiting
  untrusted content in the prompt, or a lightweight scan for
  instruction-like patterns) before this is exposed beyond a single
  trusted user. Milestone 8's free-text focus topics (the regenerate
  page's "Specific topics") are a second user-supplied input in the
  same prompt. They already get the delimiting mitigation: fenced off,
  backtick runs neutralised so they can't close the fence, and framed
  explicitly as the student's request rather than instructions
  (`buildFocusSection` in `src/lib/prompt-generator.ts`). The syllabus
  text still doesn't get the "request, not instructions" framing.

## Known limitations of sharing (Milestone 9)

- **Answer hiding on a shared page is about learning integrity, not
  secrecy.** Anyone allowed to Add to My Courses gets a full copy,
  including correct answers and explanations. That's by design: they
  own the copy, exactly as if they'd imported it, and it can be
  exported with its answer key like any owned course. Don't treat
  "shared" as "answers protected"
- **Tokens appear in URLs**, so they can end up in browser history,
  in links people paste elsewhere, and in hosting/proxy access logs
  outside the app's control. `no-referrer` covers the `Referer` path,
  and Reset link is the remedy for a leaked link
- `logShareError` covers the three `/api/share` routes. The
  server-rendered `/share/[token]` page has no equivalent wrapper, so
  an unexpected database error during that render goes through Next's
  default error logging, which may include the query parameters
- Copies keep their content after access is revoked or the original is
  deleted (by design: a copy is independent). Revocation stops future
  viewing and copying, not copies already made

## Explicitly not done yet

- No rate limiting on `/api/auth/signup` or the credentials sign-in
  path — and, since Milestone 9, none on the public share endpoints
  either (anonymous quiz grading on a link-shared course does real
  database work per request). Worth adding before any public
  deployment.
- No email verification flow (the `email_verified` column exists but
  is unused). Since Milestone 9 this also bounds private sharing — see
  "Required for future milestones" above.
- No CSRF-specific handling beyond what Auth.js provides by default
  for its own routes.
