"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setFileName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/syllabi", {
      method: "POST",
      body: formData,
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setIsUploading(false);
      setError(body?.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push(`/syllabi/${body.syllabus.id}/review`);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors ${
          isDragging ? "border-ember bg-ember-soft/30" : "border-line-strong"
        }`}
      >
        <p className="font-display text-lg text-ink">
          {isUploading
            ? `Processing ${fileName}…`
            : "Drop your syllabus PDF here"}
        </p>
        {!isUploading && (
          <>
            <p className="text-sm text-steel-soft">or</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Choose a file
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-steel-soft">
        PDF only, up to 20MB. CourseForge stores the original file and
        does its best to detect your subjects, years, and semesters —
        you&apos;ll review and correct everything before it&apos;s saved.
      </p>
    </div>
  );
}
