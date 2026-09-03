import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { buttonVariants } from "@/components/ui/button";

const steps = [
  {
    title: "Upload your syllabus",
    description:
      "One PDF, once. CourseForge reads it and organizes every subject by academic year and semester.",
  },
  {
    title: "Choose what to study",
    description:
      "Select a year, a semester, and one or several subjects — CourseForge builds an independent course for each.",
  },
  {
    title: "Generate with AI, your way",
    description:
      "Connect your own AI provider for direct generation, or copy a grounded prompt into any AI and import the result.",
  },
  {
    title: "Learn, track, share",
    description:
      "Markdown lessons, module quizzes, and progress you can actually see — plus courses you can share or hand off.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h1 className="font-display text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl">
                Turn your syllabus into a course.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
                Upload your university syllabus once. CourseForge organizes
                your subjects by year and semester, then turns any of them
                into a structured course with lessons and quizzes you can
                actually learn from.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                  Get started free
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  Sign in
                </Link>
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section className="border-t border-line bg-paper-raised">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <h2 className="font-display text-2xl font-medium text-ink">
              From PDF to a course you&apos;ll finish
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <span className="font-display text-2xl font-medium text-line-strong">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-steel-soft">
          CourseForge — Turn Your Syllabus Into a Course.
        </div>
      </footer>
    </div>
  );
}
