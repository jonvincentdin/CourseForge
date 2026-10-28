import Link from "next/link";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/ui/skip-link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-paper px-4 py-12 sm:px-6 sm:py-16">
      <SkipLink />
      <Link
        href="/"
        className="font-display text-xl font-medium tracking-tight text-ink"
      >
        CourseForge
      </Link>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="mt-8 w-full max-w-sm focus:outline-none">
        {children}
      </main>
    </div>
  );
}
