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

Added in Milestone 8:

- **`Select`** (`select.tsx`) — a native `<select>` styled to match
  `Input` (same height, border, ember focus ring) with a chevron
  overlay. Native on purpose: platform picker on mobile, full
  keyboard and screen-reader support for free. `wrapperClassName`
  positions the wrapper; `className` styles the select.
- **`Dialog`** (`dialog.tsx`, split out as the base in Milestone 9) —
  built on the native `<dialog>` + `showModal()`, which provides the
  focus trap, inert background, Escape handling, and focus return to
  the opener without a portal or focus-trap library. Props: `open`,
  `onOpenChange`, `title` (any node), `description` (optional, wired to
  `aria-describedby` only when present), `children`, `busy` (every way
  of dismissing — Escape, backdrop, × — is ignored while true),
  `initialFocusRef` (what to focus on open; otherwise the browser's
  first focusable), `showCloseButton` (a 36px × in the header), and
  `className` (width; default `max-w-md`). The panel caps at
  `100dvh - 2rem` and scrolls inside, so tall content works on small
  phones. The parent owns `open`; every dismissal goes through
  `onOpenChange(false)`.
- **`ConfirmDialog`** (`dialog.tsx`) — the Milestone 8 confirmation,
  now a thin layer over `Dialog` with the same props and behaviour as
  before: `title`, `description`, `confirmLabel`, `pendingLabel`
  (default "Working…"), `cancelLabel`, `confirmVariant` (`"danger"` |
  `"primary"`), `pending`, `onConfirm`, `error`. Dismissal is
  **ignored while `pending`** (passed through as `busy`), so an
  in-flight request can't be orphaned. Focus starts on Cancel (the
  safe choice for destructive confirmations). `error` renders inline
  with `role="alert"`. Buttons stack full-width on mobile, right-aligned
  from `sm`. **Use this for every new confirmation, and `Dialog` for
  anything richer — never browser `confirm()`.**
- **`ActionMenu`** (`menu.tsx`) — WAI-ARIA menu button. Trigger has
  `aria-haspopup="menu"`/`aria-expanded`; ArrowDown/ArrowUp on the
  trigger open the menu on the first/last item; inside, arrow keys,
  Home and End move between items (wrapping), Escape closes and returns
  focus to the trigger, Tab or an outside click closes without
  pulling focus back. Items are links (`href`; `download` renders a
  plain `<a download>` for file exports instead of a client-side
  `<Link>`) or buttons (`onSelect`), with optional `description`,
  `tone: "danger"`, `separatorBefore`, and `disabled` (stays
  focusable with `aria-disabled` so its reason can still be read).
  Default trigger is a three-dots icon; pass `trigger` +
  `triggerClassName` (e.g. `buttonVariants(...)`) for a labelled one.

Other shared pieces from Milestone 8: `GenerationProgress` /
`useGenerationStages` (`src/components/generate/generation-progress.tsx`
— the staged generation checklist, used by both direct generation and
regeneration), `DeleteCourseDialog` (`ConfirmDialog` preset for
deleting one course version), and `LocalDate` (renders a date in UTC
on the server and first client render so hydration matches, then
switches to the viewer's own time zone).

### Course library patterns (Milestone 8, `/courses`)

- **Toolbar** in a raised bordered panel, `role="search"`: Search
  (with icon; matches title, code, description, source syllabus),
  Source, Progress, Sort — all labelled. One column on phones, two
  from 420px, a single row from `lg`. "Show older versions" is a
  checkbox with the count of hidden older versions, and only appears
  when older versions exist.
- **Result count** is a `role="status"` `aria-live="polite"` line
  ("3 courses" / "Showing 2 of 5 courses"). After a delete it also
  carries "Deleted …" in forge green and receives focus, because the
  card and the menu button the dialog would return focus to are gone.
- **Cards** in a 1 / 2 / 3-column grid: subject-code badge, version
  chip ("v2 of 3", ember when latest, neutral otherwise) and an "Older
  version" marker; older versions get a dashed border on the paper
  background so they read as secondary. Title links to the course.
  Then source line, Year · Semester · N Modules, a two-line-clamped
  description, and a progress label + bar (`role="progressbar"`). The
  primary action reads Start / Continue / Review by progress, and is
  the filled primary button only for "in progress". A three-dots
  `ActionMenu` holds "Share…" (Milestone 9; its description reads
  "Anyone with the link can view" / "Private · shared with N people" /
  "Private"), Regenerate (disabled with "No linked syllabus subject to
  rebuild from" when it can't), Export JSON, Export Markdown, and a
  separated danger "Delete…". Since Milestone 9 the badge row can also
  show a neutral **"Shared by link"** (link icon) or **"Shared"**
  (people icon, private with at least one person) badge, with the
  full summary in screen-reader-only text. The share and delete
  dialogs stay mounted once used (only `open` toggles), so closing one
  runs the native `close()` and focus returns to the card's menu
  button.
- **Wording is shared** through `src/lib/course-library-filter.ts` so
  the library and the course page never disagree: progress
  ("Not started" / "N% Complete" / "Completed") and source ("Generated
  from {syllabus}" / "Generated" / "Imported from JSON" / "Added from a
  shared course · by {original creator}", falling back to "Added from a
  shared course" with no name). Search also matches the original
  creator's name.
- **Delete copy** always says exactly what goes: one version, its
  lessons, quizzes, and your progress in it, and how many other
  versions stay.
- **Course page header**: source line + "Version N · Created {date}"
  (for a Course Copy instead: "Added from a shared course — Original
  creator: {name} · Added {date} · Version N"), an "Anyone with the
  link can view" badge when link-shared, then the actions: a secondary
  **Share** button (Milestone 9, `aria-haspopup="dialog"`), Regenerate
  as a secondary button (when it can't regenerate it stays focusable
  with `aria-disabled` and an `aria-describedby` reason underneath;
  copies never can, having no syllabus link), an Export `ActionMenu`
  (JSON — "Re-importable into CourseForge" / Markdown — "A readable
  study document"), and a ghost danger Delete. A native `<details>` "N
  versions of this course" disclosure lists every version, marks the
  current one "Viewing" (`aria-current="page"`), and links to the
  others. `?share=1` opens the share dialog on load and is then
  dropped with `router.replace`.

### Sharing patterns (Milestone 9)

- **Share dialog** (`share-course-dialog.tsx`, on `Dialog`,
  `max-w-lg`, × close). The title is `Share "{title}"`, with the
  description "Choose who can open this course. Changes save as you
  make them." It loads on every open (pulse skeleton while loading;
  inline error + Close / Try again on failure) and resets all of its
  state, because the library reuses one dialog for every card. Late
  responses from an earlier open are dropped. Three sections:
  - **Who can view**: two radio cards, "Anyone with the link" (link
    icon) — "Anyone with the link can view it." and "Private" (lock
    icon) — "Only people you add can view it." Selecting one saves
    at once ("Saving…" beside the label). The radios use
    `aria-disabled`, not `disabled`, while saving, so keyboard focus
    isn't dropped
  - **Course link**: a read-only monospace field (selects on focus)
    plus **Copy link**, which flips to "✓ Copied" for 2.5s. If the
    Clipboard API fails, the field is focused and selected instead,
    and the hint becomes "press Ctrl+C (⌘C on a Mac)". The hint line
    explains the current mode. "Reset link" is a quiet text button
    that expands an inline confirmation (danger-tinted panel: "Reset
    this link? The current link will stop working…", **Keep current
    link** focused first, then a danger **Reset link**). A course with
    no token yet shows "This course doesn't have a link yet" + **Create
    link**
  - **People with access**: the explanation ("Each person signs in
    with the email you add here." — or, in link mode, that the list
    doesn't currently limit access) plus "CourseForge doesn't send
    emails — copy the link and share it with them yourself." Then
    one row per email (label "Viewer", ghost-danger Remove with
    `aria-label="Remove {email}"`, "Removing…"), or "No one has been
    added yet.", and an "Add a person by email" form (`type="email"`,
    Add / "Adding…", inline `role="alert"` error tied to the input
    with `aria-describedby`)
  - Footer: one polite `role="status"` line for every outcome ("Saved.
    Anyone with the link can now view this course.", "Link copied.",
    "Link reset. The old link no longer works.", "Added … as a
    viewer.", "Removed …. They no longer have access.") and **Done**.
    Focus is managed after actions that remove the focused control:
    after Create/Reset it moves to Copy link, and after Add/Remove to
    the email input. If anything changed, closing calls
    `router.refresh()` so badges update
- **Shared course page** (`/share/[token]`). A light public header:
  the wordmark (→ `/` or `/dashboard`) plus either Sign in / Create
  account (both returning to the current share path) or, signed in,
  "Shared with me" (from 420px) and "My Courses". A short footer
  ("Made with CourseForge"). The course state is a header with an
  ember "Shared course" badge, the code badge, the title, "Shared by
  **{name}**", and Year · Semester · N Modules · N Quizzes, then the
  description, then actions: **Start learning** (scrolls to the viewer,
  honouring `prefers-reduced-motion`, and moves focus to it) and **Add
  to My Courses** (secondary). Learning objectives sit in a raised
  panel, and the normal `CourseViewer` below. The owner sees an
  ember-tinted `role="note"` banner, "This is how others see your
  course" + **Manage sharing**, and no Add button. Signed-out viewers
  see "Progress isn't saved while you're signed out. Sign in to save
  your progress" under the progress bar, and "This score isn't saved —
  sign in to keep your quiz results." after grading
- **Access states** share one centred card (icon in a circle, display
  heading, body, actions stacking full-width on phones):
  - "This link isn't valid" (broken-link icon) + Go to CourseForge
  - "This course is private" (lock) + Sign in / Create account
  - "Access restricted" (lock) + the email you're signed in as +
    Sign out (returns to the same link, so you can switch accounts) /
    Go to My Courses
- **Add to My Courses** (`add-to-my-courses.tsx`), states per brief
  §70:
  - idle: secondary button with a plus icon, "Add to My Courses"
  - adding: "Adding…", disabled
  - added: a green panel, "✓ Added to My Courses — This course is now
    available in your CourseForge library." with **Go to My Courses**
    and **Continue learning →** (→ the copy). It takes focus, since the
    button that had focus is gone
  - already added (from the server, or a `409`): a green "✓ In My
    Courses" chip + **Open course**, with the server's message when it
    came from a `409`
  - error: inline `role="alert"` under the button
  - signed out (or a `401` because the session ended): a `Dialog`, "Sign
    in to save this course — Create an account or sign in to add this
    course to your CourseForge library. You'll come right back here,
    and we'll add it for you." with Sign in (focused first) and Create
    account. Both carry `callbackUrl=/share/{token}?add=1`. On return
    the add runs once and `?add=1` is removed
  - A polite live region announces Adding / Added / already-added
- **Auth forms on the way to a shared course.** When the sanitised
  `callbackUrl` starts with `/share/`, the card description changes:
  "Sign in to continue to the shared course." / "Create your account
  to continue to the shared course.", or with `?add=1`, "Sign in and
  we'll add the shared course to My Courses." / "Create your account
  and we'll add the shared course to My Courses." The "Create one" /
  "Sign in" cross-links keep the callback
- **Shared with me** (`/shared`): heading + "Private courses other
  students have shared with you. Your progress in them is your own.",
  a count, and a 1 / 2 / 3-column card grid. Each card has the code
  badge and an ember "Shared course" badge, the title link, "Shared by
  {name}", Year · Semester · N Modules · Shared {date}, the progress
  label + bar (`aria-label="Your progress in …"`), "N of M done", and
  **Open →** (filled only when in progress)

### Responsive behavior

Built mobile-first with Tailwind breakpoints; landing hero collapses
to a single column below `sm`. The authenticated nav (Milestone 9,
`AppNavLinks`) shows its six links (Dashboard, My Syllabi, My Courses,
Shared with me, Generate, Settings) inline beside the wordmark from
`lg`. Below `lg` they move to a second, horizontally scrollable strip
under the header (36px-tall tap targets, scrollbar hidden), rather
than a hidden menu, so every destination stays one tap away. Before
Milestone 9 the links were simply hidden below `sm` with no
replacement. The active link gets `aria-current="page"`. The user's
name shows only from `lg`, truncated. Milestone 9's new screens use the
same patterns as Milestone 8: action rows stack full-width on phones
and go inline from 420px or `sm`, long titles and emails wrap with
`overflow-wrap: anywhere`, and dialogs scroll inside their own panel.
None of this has been checked at 360px in a real browser yet.

### Accessibility

`:focus-visible` uses a 2px ember outline site-wide. Forms use real
`<label htmlFor>` associations. Milestone 8 introduced the first
custom interactive widgets — `ActionMenu` (ARIA menu-button pattern)
and `ConfirmDialog` (native `<dialog>`) — plus live regions for result
counts and async status. Milestone 9 added the base `Dialog`, the
share dialog (a radio `fieldset`/`legend`, focus rings on the radio
cards via `has-[:focus-visible]`, labelled sections, a single status
region, focus moved deliberately after Create/Reset/Add/Remove), the
Add to My Courses sign-in dialog, Start learning's focus move, and the
nav strip with `aria-current`. **All of it was reviewed in code only;
no manual in-browser keyboard or screen-reader pass has been done
yet** — including native `<dialog>` focus return, which is the browser's
job but hasn't been watched happening. That belongs to Milestone 10's
accessibility audit. Prefer native elements (`<select>`, `<dialog>`,
`<details>`, radio inputs) over rebuilding them, as Milestones 8 and 9
did.

### Animation rules

None yet beyond default `transition-colors` on interactive elements.
No page-load or scroll-triggered animation — intentional, per the
brief's warning against decorative motion; add a single deliberate
moment later if a specific interaction earns it (e.g. the generation
progress checklist in Milestone 6).

### Empty states

`/courses` has two distinct states: the original "No courses yet"
card (zero courses at all, with "Generate a course"), and a
filtered-to-zero state (a dashed panel naming the query if there is
one, plus "Clear filters") when filters hide everything. Don't merge
them — "you have nothing" and "your filters hide everything" need
different next steps.

`/shared` has its own empty state: a people icon, "Nothing shared with
you yet", "When someone shares a private course with **{your email}**,
it shows up here. Courses shared with "Anyone with the link" open
straight from the link instead.", and Go to My Courses. The share
dialog's people list shows "No one has been added yet."

Dashboard shows real empty states ("No syllabus yet", "No courses
yet") rather than fabricated sample data, because no syllabus/course
functionality exists yet. When Milestone 2+ lands, these should be
replaced with real data-driven states, not deleted.

### Loading / error states

Auth forms show inline `disabled` + "…" button label during
submission and an inline `role="alert"` error message on failure.
Extend this pattern rather than introducing a new one — Milestone 8
did: `ConfirmDialog` swaps its confirm label for `pendingLabel`
("Deleting…") and shows failures inline in the dialog; the regenerate
form locks its settings while generating, shows the
`GenerationProgress` checklist, moves focus to the result
(`role="status"`) on success, and shows the error, any validation
errors, and "Try again" on failure. Milestone 9 follows the same
rules: per-action pending labels in the share dialog ("Saving…",
"Creating…", "Resetting…", "Adding…", "Removing…"), inline errors per
section, a network-failure message distinct from a server error
("Couldn't reach CourseForge — check your connection and try again.",
also used by Add to My Courses and quiz submission), and quiz errors
gained `role="alert"`. "Mark lesson complete" still fails silently on
a network error (it just stays unmarked). No `alert()`/`confirm()` in
anything new — the remaining ones (syllabus delete/reprocess, subject
removal, AI-config removal, `subject-prompt-panel.tsx`'s copy
failure) are Milestone 10's to replace.
