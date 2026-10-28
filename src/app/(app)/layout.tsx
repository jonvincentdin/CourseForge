import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppNav } from "@/components/app/app-nav";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/ui/skip-link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <SkipLink />
      <AppNav userName={session.user.name ?? session.user.email ?? null} />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 focus:outline-none sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
