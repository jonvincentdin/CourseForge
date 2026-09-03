import { Badge } from "@/components/ui/badge";

const syllabusEntries = [
  "Data Structures and Algorithms",
  "Network 1",
  "Object-Oriented Programming",
];

const courseModules = [
  { title: "Arrays & Linked Lists", done: true },
  { title: "Stacks & Queues", done: true },
  { title: "Trees & Graphs", done: false },
  { title: "Sorting & Searching", done: false },
];

export function HeroVisual() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
      <div className="rounded-lg border border-line bg-paper-raised p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-steel-soft">
          2026–2027 curriculum · Year 2, 1st semester
        </p>
        <ul className="mt-3 space-y-2.5">
          {syllabusEntries.map((entry) => (
            <li key={entry} className="flex items-center gap-2.5 text-sm">
              <span className="h-4 w-4 shrink-0 rounded border border-line-strong" />
              <span className="text-ink-soft">{entry}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center">
        <div
          aria-hidden
          className="h-8 w-8 rotate-90 text-ember sm:rotate-0"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
            <path
              d="M3 12h15M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-paper-raised p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-medium text-ink">
            Data Structures and Algorithms
          </p>
          <Badge tone="green">2 of 4 done</Badge>
        </div>
        <ul className="mt-3 space-y-2.5">
          {courseModules.map((module, index) => (
            <li key={module.title} className="flex items-center gap-2.5 text-sm">
              <span
                className={
                  module.done
                    ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forge-green text-[10px] text-paper-raised"
                    : "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line-strong text-[10px] text-steel-soft"
                }
              >
                {module.done ? "✓" : index + 1}
              </span>
              <span className={module.done ? "text-ink-soft" : "text-ink"}>
                {module.title}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
