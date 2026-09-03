# SHARING.md

**Status: not started.** Owned by Milestone 9. Nothing below is
implemented.

## Required shape (from the product brief)

- Two visibility modes per course: **Anyone with the link** (public,
  view-only, non-guessable share token) and **Private** (explicit
  per-user invitations, view-only for the initial implementation).
- Public share URLs use cryptographically secure random tokens —
  never sequential/guessable IDs.
- Server-side authorization on every protected request, not just at
  share-link generation time. Disabling a public link or removing a
  private invitee must take effect immediately.
- Shared-course viewers get the same course-viewer UI, but never
  owner-only controls (edit, regenerate, delete, change visibility,
  manage permissions).
- **Add to My Courses**: the primary, only user-facing term for saving
  someone else's shared course (never "Clone"/"Fork"/"Duplicate
  Import"). Internally this creates a **Course Copy** — a fully
  independent record (own ID, own owner, own progress, own module/
  quiz state). The original is never modified, and the copy survives
  even if the original is later unshared. No automatic sync between
  original and copy in this initial version.
- Viewing a public course never requires an account; adding it to My
  Courses does. Unauthenticated "Add to My Courses" must redirect to
  login/signup and return the user to the same shared course
  afterward — the person should never have to re-find the link.
- Viewer progress is isolated per viewer; the owner doesn't
  automatically see private viewer learning activity.
- Duplicate handling: if the user already has a copy, offer to open
  it rather than silently creating unlimited duplicates.

## Security requirements

See `SECURITY.md`'s "Required for future milestones" section — this
feature is the primary reason that section exists. In particular:
never trust a client-supplied course ID, owner ID, or permission when
handling "Add to My Courses."
