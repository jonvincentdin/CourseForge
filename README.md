# CourseForge

**Turn Your Syllabus Into a Course.**

Upload your university syllabus once. CourseForge organizes your
subjects by academic year and semester, then turns any of them into a
structured course — Markdown lessons, module quizzes, progress
tracking — generated directly via your own AI provider or via a
grounded prompt you run in any external AI and import back as JSON.

## Status

**Milestones 1–6 are complete and verified end-to-end** against a real
Postgres database, real HTTP requests, and — for Milestone 6 — a real
call to Anthropic's live API (not a mock): accounts, sign in/out,
syllabus PDF upload/extraction/review/finalize/reprocess/delete, the
year/semester/subject selection flow, the full course data model with
both working generation paths (copy-a-prompt-and-paste-JSON, and
direct AI generation with encrypted per-user API keys), a verified
export round-trip, and confirmed XSS-safe Markdown rendering.
Cross-user data isolation is enforced and verified throughout. The
interactive learning experience and sharing are not built yet.

See [`.context/MILESTONES.md`](.context/MILESTONES.md) for the full
status, and [`.context/README.md`](.context/README.md) for how this
project's documentation is organized — read that directory before
making changes.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL via
Drizzle ORM · Auth.js v5

## Getting started

```bash
npm install
cp .env.example .env.local
npx auth secret          # writes AUTH_SECRET into .env.local
# set DATABASE_URL in .env.local to a real Postgres connection string
npm run db:push
npm run dev
```

Open http://localhost:3000.

See [`.context/DEVELOPMENT.md`](.context/DEVELOPMENT.md) for the full
command reference and known environment notes.
