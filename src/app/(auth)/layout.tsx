import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-paper px-6 py-16">
      <Link
        href="/"
        className="font-display text-xl font-medium tracking-tight text-ink"
      >
        CourseForge
      </Link>
      <div className="mt-8 w-full max-w-sm">{children}</div>
    </div>
  );
}
