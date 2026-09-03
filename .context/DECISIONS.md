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

## Open questions (not yet decided — flag before Milestone 2 starts)

- **Syllabus PDF storage:** local disk vs. object storage (S3-
  compatible). Local disk is simpler for early development but won't
  survive most deployment targets' ephemeral filesystems. Needs a
  decision before Milestone 2's persistent-storage requirement can be
  implemented for real.
- **AI provider abstraction shape** (Milestone 6): what the common
  interface looks like across providers (OpenAI-compatible vs.
  Anthropic-style tool use vs. something else) isn't decided yet.
- **Deployment target:** nothing has been chosen. Affects the file-
  storage decision above and how `DATABASE_URL` gets provisioned.
