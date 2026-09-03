"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteSyllabusButton({ syllabusId }: { syllabusId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "Delete this syllabus? Its subjects and the original PDF will be permanently removed. This can't be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const response = await fetch(`/api/syllabi/${syllabusId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setIsDeleting(false);
      alert("Couldn't delete this syllabus. Please try again.");
      return;
    }

    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-danger hover:bg-danger-soft hover:text-danger"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
