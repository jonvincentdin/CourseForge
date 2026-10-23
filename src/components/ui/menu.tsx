"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActionMenuItemBase {
  label: string;
  /** Secondary line under the label — e.g. why an item is disabled. */
  description?: string;
  tone?: "danger";
  /** Disabled items stay focusable (per the ARIA menu pattern) so their reason can still be read. */
  disabled?: boolean;
  /** Draws a divider above this item — used to set destructive actions apart. */
  separatorBefore?: boolean;
}

export interface ActionMenuLinkItem extends ActionMenuItemBase {
  href: string;
  /** Renders a plain <a download> instead of a client-side <Link> — for file exports. */
  download?: boolean | string;
}

export interface ActionMenuButtonItem extends ActionMenuItemBase {
  onSelect: () => void;
}

export type ActionMenuItem = ActionMenuLinkItem | ActionMenuButtonItem;

function isLinkItem(item: ActionMenuItem): item is ActionMenuLinkItem {
  return "href" in item;
}

/**
 * A small menu-button (WAI-ARIA "menu button" pattern): the trigger
 * opens a role="menu" list, arrow keys / Home / End move between items,
 * Escape closes and returns focus to the trigger, Tab or an outside
 * click closes without stealing focus back.
 */
export function ActionMenu({
  label,
  items,
  trigger,
  triggerLabel,
  triggerClassName,
  align = "end",
}: {
  /** Accessible name of the menu itself. */
  label: string;
  items: ActionMenuItem[];
  /** Trigger content. Defaults to a "more" (three dots) icon. */
  trigger?: React.ReactNode;
  /** aria-label for the trigger — required in practice when `trigger` is icon-only. */
  triggerLabel?: string;
  triggerClassName?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);
  const focusOnOpen = React.useRef<"first" | "last">("first");
  const menuId = React.useId();
  const triggerId = React.useId();

  const focusItem = React.useCallback(
    (index: number) => {
      const count = items.length;
      if (count === 0) return;
      const wrapped = ((index % count) + count) % count;
      itemRefs.current[wrapped]?.focus();
    },
    [items.length]
  );

  React.useEffect(() => {
    if (!open) return;

    focusItem(focusOnOpen.current === "first" ? 0 : items.length - 1);

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, focusItem, items.length]);

  function openMenu(focus: "first" | "last") {
    focusOnOpen.current = focus;
    setOpen(true);
  }

  function closeMenu(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        // Let focus move on naturally; just don't leave the menu hanging open.
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? closeMenu(false) : openMenu("first"))}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          trigger
            ? undefined
            : "inline-flex h-9 w-9 items-center justify-center rounded-md text-steel transition-colors hover:bg-paper hover:text-ink",
          open && !trigger && "bg-paper text-ink",
          triggerClassName
        )}
      >
        {trigger ?? <DotsIcon />}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          aria-labelledby={triggerLabel ? undefined : triggerId}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            "absolute top-full z-30 mt-1 min-w-52 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-paper-raised p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, index) => {
            const className = cn(
              "flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition-colors",
              "focus-visible:-outline-offset-2 focus:bg-paper",
              item.disabled
                ? "cursor-not-allowed text-steel-soft"
                : item.tone === "danger"
                  ? "text-danger hover:bg-danger-soft/50 focus:bg-danger-soft/50"
                  : "text-ink hover:bg-paper"
            );
            const content = (
              <>
                <span className="font-medium">{item.label}</span>
                {item.description && (
                  <span className="mt-0.5 text-xs font-normal text-steel-soft">
                    {item.description}
                  </span>
                )}
              </>
            );
            const ref = (el: HTMLElement | null) => {
              itemRefs.current[index] = el;
            };

            let node: React.ReactNode;
            if (item.disabled) {
              node = (
                <button
                  ref={ref}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled="true"
                  className={className}
                >
                  {content}
                </button>
              );
            } else if (isLinkItem(item) && item.download !== undefined) {
              node = (
                <a
                  ref={ref}
                  href={item.href}
                  download={item.download === true ? "" : item.download || undefined}
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => closeMenu(true)}
                >
                  {content}
                </a>
              );
            } else if (isLinkItem(item)) {
              node = (
                <Link
                  ref={ref}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => closeMenu(false)}
                >
                  {content}
                </Link>
              );
            } else {
              node = (
                <button
                  ref={ref}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => {
                    // Return focus first so a dialog opened by onSelect
                    // restores focus to the trigger when it closes.
                    closeMenu(true);
                    item.onSelect();
                  }}
                >
                  {content}
                </button>
              );
            }

            return (
              <React.Fragment key={item.label}>
                {item.separatorBefore && index > 0 && (
                  <div role="separator" className="my-1 h-px bg-line" />
                )}
                {node}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DotsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <circle cx="4" cy="10" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="16" cy="10" r="1.6" />
    </svg>
  );
}
