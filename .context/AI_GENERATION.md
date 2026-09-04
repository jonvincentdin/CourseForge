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

## Direct AI generation — Milestone 6 — built, verified live against a real provider API

Per-user, provider-agnostic AI configuration and one-click course
generation, with no synthetic testing shortcuts — this milestone's
verification made real HTTP calls to `api.anthropic.com` (reachable
from this build environment) with a deliberately invalid key, and got
back a genuine `401` that the app correctly translated into a
specific, non-leaking error message. `api.openai.com` was not
reachable from this build environment, so the OpenAI provider is
implemented to the same pattern but **not** live-verified against a
real OpenAI response — see Known Limitations below.

### Provider abstraction (`src/lib/ai/`)

`types.ts` defines the entire contract a provider must implement:
`testConnection(apiKey, model)` and `generateCompletion({apiKey, model,
prompt})`. Two implementations exist (`providers/anthropic.ts`,
`providers/openai.ts`), registered in `index.ts`'s `AI_PROVIDERS` map.
Adding a third provider means writing one new file matching the
`AIProvider` interface and adding one line to the registry — nothing
else in the app (the settings UI, the generation route, the encryption
layer) needs to change. That's the literal test of product brief
§37's "addable later without rewriting the application," and it's true
by construction, not just by intention.

Both provider implementations are careful never to put the API key
into any error message they return — errors come from HTTP status
codes and the provider's own response body, never by echoing the
request.

### API key encryption (`src/lib/encryption.ts`)

AES-256-GCM, `ENCRYPTION_KEY` env var stretched via `scryptSync` into
a proper 32-byte key. Verified live: encrypted a real key, confirmed
the round-trip decrypts to the exact original, and confirmed a
single-byte tamper to the ciphertext is rejected (GCM auth tag
verification) rather than silently decrypting to garbage. Verified in
the actual running app, not just in isolation: saved a real (fake)
key through the real `/api/ai-config` endpoint, confirmed the
`encrypted_api_key` column in Postgres is genuinely unreadable
ciphertext, confirmed the key never appears in the save response, the
status response, or the rendered settings page HTML, and confirmed
the "test my saved key" path correctly decrypts it server-side and
uses it in a real outbound API call.

This module is the **only** place a decrypted key exists outside a
provider's own outbound `fetch` call. `getDecryptedConfigForUser` in
`src/lib/ai-config-service.ts` is explicitly marked internal-only —
nothing that returns data to the client may call it.

### AI configuration (`/settings`, `src/components/settings/ai-config-form.tsx`)

Matches product brief §37's mockup: Provider select, API Key input
(type=password), Model (free-text — see `DECISIONS.md` for why this
isn't a hardcoded dropdown), Test Connection, Save. Once configured,
shows only `providerName`, `model`, and a fully-masked
`••••••••••••••••` — never a partial reveal, matching §38's frontend
display requirement exactly. Replace/Remove both work; Remove asks for
confirmation and actually deletes the row (verified: `DELETE
/api/ai-config` → row count in Postgres goes to 0).

### Course generation (`POST /api/courses/generate`)

Re-derives subject/syllabus ownership server-side (never trusts the
client's ids alone — same pattern as every other milestone), builds
the exact same prompt Milestone 5's external flow shows the user
(`buildCoursePrompt`, unchanged), sends it to the configured provider,
and feeds the raw response through the **exact same**
`importCourseFromJson` pipeline Milestones 4 and 5 already built and
verified — with `source: "generated"` instead of `"imported"` so the
data honestly records how each course was created. No new validation
logic was written for this milestone; only a new way to produce the
JSON that gets fed into the existing one.

A defensive Markdown-code-fence stripper was added to
`course-service.ts`'s `importCourseFromJson` (used by every import
path, not just this one) because real AI models commonly wrap JSON in
` ```json ` fences despite being told not to — cheap to handle, common
enough to be worth handling.

### Progress UI

`src/components/generate/direct-generate-panel.tsx` shows the
brief's staged checklist (§79: "Reading syllabus" → ... → "Validating
course"). **This is honestly a client-side simulated progression, not
real per-stage signals from the server** — a single AI completion call
happens in one request/response; there's no true mid-flight progress
to report without building a streaming/SSE pipeline, which wasn't
judged worth the complexity for a once-per-course action. Documented
here so nobody mistakes the checklist for genuine server-reported
stages later.

### Known limitations (do not treat as bugs)

- The OpenAI provider is implemented to match OpenAI's real
  Chat Completions API shape but was **not** live-tested against a
  real OpenAI response — `api.openai.com` wasn't reachable from the
  sandbox this was built in. The Anthropic provider genuinely was
  live-tested against a real (rejecting) API call. If you add real
  OpenAI usage, verify it the same way before trusting it fully.
- Model selection is free text, not a curated dropdown of known-valid
  model ids — see `DECISIONS.md`.
- No usage/cost tracking, no per-request timeout beyond whatever the
  underlying `fetch` defaults to, no retry logic on transient provider
  errors (a 429 surfaces immediately as a user-facing error rather
  than auto-retrying).

## Not yet built (owned by later milestones)

- Interactive quiz-taking, scoring, module navigation, progress
  tracking — Milestone 7
- Regeneration, versioning, delete, search/filter on `/courses` —
  Milestone 8
