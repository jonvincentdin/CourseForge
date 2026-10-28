import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

// One skeleton for every authenticated page: a heading, a subtitle and a few cards.
// shortcut: generic layout causes a small shift on pages that don't look like this, add a per-route loading.tsx if one feels jumpy.
export default function AppLoading() {
  return (
    <div>
      <LoadingStatus>Loading…</LoadingStatus>
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-paper-raised p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-5 h-1.5 w-full" />
            <Skeleton className="mt-5 h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
