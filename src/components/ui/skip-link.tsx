/** The id every layout puts on its <main>, so the skip link always has a target. */
export const MAIN_CONTENT_ID = "main-content";

/**
 * "Skip to content" — the first focusable element on every page.
 * Hidden until it receives keyboard focus, then shown over the header.
 * Targets <main id="main-content" tabIndex={-1}> so focus (not just the
 * scroll position) moves past the navigation.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper-raised focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
