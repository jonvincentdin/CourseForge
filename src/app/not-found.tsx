import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CompassIcon, StatePanel } from "@/components/ui/state-panel";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/ui/skip-link";

// Same page for "doesn't exist" and "not yours" — the wording must not reveal which.
export default function NotFound() {
  return (
    <>
      <SkipLink />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 px-4 sm:px-6">
        <StatePanel
          icon={<CompassIcon />}
          title="We couldn’t find that page"
          actions={
            <>
              <Link href="/dashboard" className={buttonVariants()}>
                Go to Dashboard
              </Link>
              <Link href="/courses" className={buttonVariants({ variant: "secondary" })}>
                My Courses
              </Link>
            </>
          }
        >
          <p>The link may be mistyped, or the page may have been moved or deleted.</p>
        </StatePanel>
      </main>
    </>
  );
}
