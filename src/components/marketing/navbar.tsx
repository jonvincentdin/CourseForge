import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-xl font-medium tracking-tight text-ink"
        >
          CourseForge
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex h-10 items-center px-4 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Sign in
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "md" })}>
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
