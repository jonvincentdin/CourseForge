import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function SharedCourseLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <LoadingStatus>Loading shared course…</LoadingStatus>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-48" />
      <Skeleton className="mt-6 h-10 w-44" />
      <div className="mt-10 grid gap-6 md:grid-cols-[14rem_1fr]">
        <Skeleton className="h-48" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
