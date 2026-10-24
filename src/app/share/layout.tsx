import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { ShareAuthLinks } from "@/components/share/share-auth-links";

// Share URLs are bearer links: keep them out of search results and
// out of the Referer header (next.config.ts sets the same as HTTP headers).
export const metadata: Metadata = {
  title: "Shared course — CourseForge",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Public shell for /share/* — deliberately outside the (app) group,
 * whose layout redirects anonymous visitors to /login. A light header
 * only: no app navigation for guests, a way back to My Courses for
 * signed-in students.
 */
export default async function ShareLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <header className="border-b border-line bg-paper-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="font-display text-lg font-medium tracking-tight text-ink"
          >
            CourseForge
          </Link>
          {signedIn ? (
            <nav aria-label="Your CourseForge" className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/shared"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "hidden min-[420px]:inline-flex",
                })}
              >
                Shared with me
              </Link>
              <Link href="/courses" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                My Courses
              </Link>
            </nav>
          ) : (
            <ShareAuthLinks />
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-steel-soft sm:px-6">
          Made with{" "}
          <Link href="/" className="font-medium text-ink-soft hover:text-ink">
            CourseForge
          </Link>{" "}
          — turn your syllabus into structured courses you can learn from and share.
        </p>
      </footer>
    </div>
  );
}
