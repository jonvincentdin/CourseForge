# UI_UX.md

## Design system: "steel & ember"

A forge working in cool structural tones with a single warm accent for
the moment a syllabus becomes a course. Chosen specifically to avoid
the current AI-generated-design tells (warm cream + terracotta;
near-black + acid accent; generic SaaS card kit with one border-radius
and one drop-shadow on everything) — see the design-plan review notes
in `DECISIONS.md` if you want the reasoning, not just the tokens.

### Colors (`src/app/globals.css`, Tailwind 4 `@theme inline`)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#f5f6f8` | page background |
| `paper-raised` | `#ffffff` | cards, inputs, elevated surfaces |
| `ink` | `#14171c` | primary text, primary buttons |
| `ink-soft` | `#4b525e` | secondary text |
| `steel` | `#48566b` | structural accents |
| `steel-soft` | `#6b7688` | tertiary text, placeholders |
| `line` / `line-strong` | `#dde1e7` / `#c3c9d3` | borders |
| `ember` | `#d1490f` | the one accent — focus rings, links-on-hover, the syllabus→course transform arrow |
| `ember-soft` | `#f1d9ce` | accent backgrounds (selection, badges) |
| `forge-green` / `forge-green-soft` | `#2f6b4f` / `#d9ebe1` | success/progress state |
| `danger` / `danger-soft` | `#b3311c` / `#f3d9d3` | errors |

### Typography

- Display/headings: **Fraunces** (`--font-display`) — a serif with
  enough character to carry the brand without a gradient doing the
  work.
- Body/UI: **IBM Plex Sans** (`--font-sans`) — technical/institutional
  register, fits "academic + technical."
- Code/data: **IBM Plex Mono** (`--font-mono`) — reserved for future
  Markdown code blocks and JSON views.

Loaded via `next/font/google` in `src/app/layout.tsx`. Requires
network access to `fonts.googleapis.com` / `fonts.gstatic.com` at
build time — this failed in the sandbox this milestone was built in
(domain not on the allowlist) but is not a code bug; verified by
temporarily stubbing the fonts and confirming the rest of the build
was clean. It will resolve normally with standard internet access.

### Layout

Left-aligned, editorial. Max content width `max-w-6xl` (marketing +
authenticated shell) or `max-w-sm` (auth forms). Numbered step markers
are used exactly once, on the landing page's 4-step explainer, because
that content is genuinely sequential — don't reach for numbering as
default decoration elsewhere.

### Components (`src/components/ui/`)

`Button` (variants: primary/secondary/ghost/danger; sizes: sm/md/lg —
also exports `buttonVariants()` so `<Link>` can share button styling
without nesting an `<a>` inside a `<button>`), `Input`, `Label`,
`Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`,
`Badge` (tones: neutral/ember/green/danger).

### Responsive behavior

Built mobile-first with Tailwind breakpoints; landing hero collapses
to a single column below `sm`, authenticated nav's link row hides
below `sm` (relies on future work to add a mobile menu — not built,
since there's only one nav row of links today and no mobile menu
component exists yet).

### Accessibility

`:focus-visible` uses a 2px ember outline site-wide. Forms use real
`<label htmlFor>` associations. No custom interactive widgets yet that
would need ARIA beyond native semantics.

### Animation rules

None yet beyond default `transition-colors` on interactive elements.
No page-load or scroll-triggered animation — intentional, per the
brief's warning against decorative motion; add a single deliberate
moment later if a specific interaction earns it (e.g. the generation
progress checklist in Milestone 6).

### Empty states

Dashboard shows real empty states ("No syllabus yet", "No courses
yet") rather than fabricated sample data, because no syllabus/course
functionality exists yet. When Milestone 2+ lands, these should be
replaced with real data-driven states, not deleted.

### Loading / error states

Not yet needed — Milestone 1 has no long-running operations. Auth
forms show inline `disabled` + "…" button label during submission and
an inline `role="alert"` error message on failure. Extend this pattern
rather than introducing a new one.
