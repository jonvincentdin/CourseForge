"use client";

import "./globals.css";

// Replaces the root layout when it fails, so it brings its own <html>/<body> and no app components.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink">
        <main className="w-full max-w-md rounded-lg border border-line bg-paper-raised p-6">
          <h1 className="text-xl font-medium">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-soft">
            CourseForge couldn&apos;t load. Please try again in a moment.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-steel-soft">
              Reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <button
            onClick={reset}
            className="mt-5 h-10 rounded-md bg-ink px-4 text-sm font-medium text-paper-raised"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
