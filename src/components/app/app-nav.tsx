import Link from "next/link";
import { SignOutButton } from "@/components/app/sign-out-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/syllabi", label: "My Syllabi" },
  { href: "/courses", label: "My Courses" },
  { href: "/generate", label: "Generate" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ userName }: { userName: string | null }) {
  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="font-display text-lg font-medium tracking-tight text-ink"
          >
            CourseForge
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {userName && (
            <span className="hidden text-sm text-steel-soft sm:inline">
              {userName}
            </span>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
