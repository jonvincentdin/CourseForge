"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  callbackUrl = "/",
  variant = "ghost",
}: {
  /** Where to land after signing out — the shared page passes itself, so the student can switch accounts. */
  callbackUrl?: string;
  variant?: "ghost" | "secondary";
}) {
  return (
    <Button variant={variant} size="sm" onClick={() => signOut({ callbackUrl })}>
      Sign out
    </Button>
  );
}
