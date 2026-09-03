import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-line-strong bg-paper-raised px-3 text-sm text-ink",
        "placeholder:text-steel-soft",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:border-ember",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "transition-colors duration-150",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
