"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/syllabi", label: "My Syllabi" },
  { href: "/courses", label: "My Courses" },
  { href: "/shared", label: "Shared with me" },
  { href: "/generate", label: "Generate" },
  { href: "/settings", label: "Settings" },
];

/**
 * The app's primary links. `layout="row"` is the desktop header row;
 * `layout="scroll"` is the small-screen strip under the header — a
 * horizontally scrollable row rather than a hidden menu, so every
 * destination stays one tap away.
 */
export function AppNavLinks({ layout }: { layout: "row" | "scroll" }) {
  const pathname = usePathname();

  return (
    <ul
      role="list"
      className={cn(
        "flex items-center",
        layout === "row" ? "gap-5" : "mx-auto max-w-6xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]"
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap text-sm font-medium transition-colors",
                layout === "row"
                  ? active
                    ? "text-ink"
                    : "text-ink-soft hover:text-ink"
                  : cn(
                      "inline-flex h-9 items-center rounded-md px-3",
                      active ? "bg-paper text-ink" : "text-ink-soft hover:bg-paper hover:text-ink"
                    )
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
