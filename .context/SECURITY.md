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

## Required for future milestones (do not build these features without this)

- **API keys** (Milestone 6): encrypt server-side before persistence;
  decrypt only server-side; never return a decrypted key from any API
  response; never log a key; never send a key in an error message.
  Frontend only ever sees a masked value + a configured/not-configured
  status.
- **Share tokens** (Milestone 9): cryptographically secure random
  tokens, not sequential/guessable IDs. Every protected read must
  re-check authorization server-side, not just at link-generation
  time — revoked/deleted/private-again courses must actually stop
  being accessible.
- **Add to My Courses** (Milestone 9): the server must independently
  validate the share token, confirm the course is currently
  shareable, and confirm the requesting user is authenticated — never
  trust a client-supplied course ID, owner ID, or permission.
- **Syllabus/JSON import** (Milestone 2 / 5): treat all uploaded and
  AI-returned content as untrusted; validate structurally before
  storing or rendering; watch for prompt-injection payloads hidden in
  syllabus text that could otherwise leak into AI calls.

## Explicitly not done yet

- No rate limiting on `/api/auth/signup` or the credentials sign-in
  path. Worth adding before any public deployment.
- No email verification flow (the `email_verified` column exists but
  is unused).
- No CSRF-specific handling beyond what Auth.js provides by default
  for its own routes.
