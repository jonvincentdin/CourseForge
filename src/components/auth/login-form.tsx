"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { authCrossLink, authIntro } from "@/components/auth/auth-callback";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Never push a raw callbackUrl — that's an open redirect.
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const intro = authIntro(callbackUrl, "login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorId = useId();
  // The error is about the pair, so both fields point at it.
  const errorProps = error
    ? { "aria-invalid": true as const, "aria-describedby": errorId }
    : {};

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("That email and password don't match an account.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Sign in</CardTitle>
        <CardDescription>
          {intro ?? "Welcome back. Sign in to reach your syllabi and courses."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              {...errorProps}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...errorProps}
            />
          </div>

          {error && (
            <p id={errorId} role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-steel-soft">
          Don&apos;t have an account?{" "}
          <Link
            href={authCrossLink("/signup", callbackUrl)}
            className="font-medium text-ink hover:text-ember-ink"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
