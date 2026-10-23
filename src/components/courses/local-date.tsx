"use client";

import { useEffect, useState } from "react";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Renders a date in the viewer's own time zone. The server and the
 * first client render both use UTC (so hydration always matches), then
 * it switches to local time after mount — otherwise a course created at
 * 7am in Manila would show yesterday's date when the server runs in UTC.
 */
export function LocalDate({ iso, className }: { iso: string; className?: string }) {
  const [timeZone, setTimeZone] = useState<string | undefined>("UTC");

  useEffect(() => {
    setTimeZone(undefined);
  }, []);

  return (
    <time dateTime={iso} className={className}>
      {new Date(iso).toLocaleDateString("en-US", { ...DATE_FORMAT, timeZone })}
    </time>
  );
}
