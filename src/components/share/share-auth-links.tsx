"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

/**
 * Sign in / Create account for the public /share header. The layout
 * can't see the [token] segment, so the return path comes from the
 * current pathname — every auth link on a shared page brings the
 * student back to the same course.
 */
export function ShareAuthLinks() {
  const pathname = usePathname();
  const callback = pathname?.startsWith("/share/")
    ? `?callbackUrl=${encodeURIComponent(pathname)}`
    : "";

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href={`/login${callback}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Sign in
      </Link>
      <Link href={`/signup${callback}`} className={buttonVariants({ size: "sm" })}>
        Create account
      </Link>
    </div>
  );
}
