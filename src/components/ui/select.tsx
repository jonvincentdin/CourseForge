import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native <select> styled to match Input. Native on purpose: it brings
 * the platform picker on mobile and full keyboard/screen-reader support
 * that a custom listbox would have to rebuild.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(({ className, wrapperClassName, children, ...props }, ref) => {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-line-strong bg-paper-raised pl-3 pr-9 text-sm text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:border-ember",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "transition-colors duration-150",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-soft"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
Select.displayName = "Select";
