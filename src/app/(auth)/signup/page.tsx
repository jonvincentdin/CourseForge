import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account — CourseForge",
};

export default function SignupPage() {
  // useSearchParams (for callbackUrl) needs a Suspense boundary on a static page.
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
