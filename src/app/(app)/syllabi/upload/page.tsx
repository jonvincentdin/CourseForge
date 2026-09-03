import type { Metadata } from "next";
import Link from "next/link";
import { UploadForm } from "@/components/syllabi/upload-form";

export const metadata: Metadata = {
  title: "Upload Syllabus — CourseForge",
};

export default function UploadSyllabusPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/syllabi" className="text-sm text-steel-soft hover:text-ink">
        ← My Syllabi
      </Link>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink">
        Upload a syllabus
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload once — you can generate courses from it whenever you need to,
        without uploading it again.
      </p>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  );
}
