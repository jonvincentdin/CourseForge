"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReprocessButton({ syllabusId }: { syllabusId: string }) {
  const router = useRouter();
  const [isReprocessing, setIsReprocessing] = useState(false);

  async function handleReprocess() {
    if (
      !confirm(
        "Reprocessing re-reads the original PDF and replaces the detected subjects. Any manual edits will be lost. Continue?"
      )
    ) {
      return;
    }

    setIsReprocessing(true);
    const response = await fetch(`/api/syllabi/${syllabusId}/reprocess`, {
      method: "POST",
    });

    setIsReprocessing(false);

    if (!response.ok) {
      alert("Couldn't reprocess this syllabus. Please try again.");
      return;
    }

    router.push(`/syllabi/${syllabusId}/review`);
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleReprocess}
      disabled={isReprocessing}
    >
      {isReprocessing ? "Reprocessing…" : "Reprocess"}
    </Button>
  );
}
