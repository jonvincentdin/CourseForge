/*
  Small pure helpers shared by the login and signup forms for carrying a
  (already sanitised — see safeCallbackUrl) callbackUrl through the auth
  flow, so a student who arrived from a shared course lands back on it.
*/

const DEFAULT_DESTINATION = "/dashboard";

/** "/signup" or "/login", keeping the callbackUrl when it's anything but the default. */
export function authCrossLink(path: "/login" | "/signup", callbackUrl: string): string {
  if (callbackUrl === DEFAULT_DESTINATION) return path;
  return `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** Context-specific card description when the student is on their way to a shared course. */
export function authIntro(callbackUrl: string, form: "login" | "signup"): string | null {
  if (!callbackUrl.startsWith("/share/")) return null;
  const adding = new URL(callbackUrl, "http://n").searchParams.get("add") === "1";

  if (adding) {
    return form === "login"
      ? "Sign in and we'll add the shared course to My Courses."
      : "Create your account and we'll add the shared course to My Courses.";
  }
  return form === "login"
    ? "Sign in to continue to the shared course."
    : "Create your account to continue to the shared course.";
}
