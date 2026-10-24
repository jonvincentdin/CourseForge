import Link from "next/link";
import { SignOutButton } from "@/components/app/sign-out-button";
import { AppNavLinks } from "@/components/app/app-nav-links";

export function AppNav({ userName }: { userName: string | null }) {
  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="font-display text-lg font-medium tracking-tight text-ink"
          >
            CourseForge
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <AppNavLinks layout="row" />
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {userName && (
            <span className="hidden max-w-48 truncate text-sm text-steel-soft lg:inline">
              {userName}
            </span>
          )}
          <SignOutButton />
        </div>
      </div>
      {/* Below lg the six links don't fit beside the wordmark — they get their own scrollable row. */}
      <nav aria-label="Main" className="border-t border-line lg:hidden">
        <AppNavLinks layout="scroll" />
      </nav>
    </header>
  );
}
