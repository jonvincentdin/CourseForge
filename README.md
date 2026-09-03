# CourseForge

**Turn Your Syllabus Into a Course.**

Upload your university syllabus once. CourseForge organizes your
subjects by academic year and semester, then turns any of them into a
structured course — Markdown lessons, module quizzes, progress
tracking — generated directly via your own AI provider or via a
grounded prompt you run in any external AI and import back as JSON.

## Status

**Milestone 1 (Foundation) is complete.** Accounts, sign in/out, a
protected dashboard shell, and the design system are built and
verified. Syllabus upload, course generation, the learning experience,
and sharing are not built yet.

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
