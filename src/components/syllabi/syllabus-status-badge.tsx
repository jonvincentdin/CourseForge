import { Badge } from "@/components/ui/badge";
import type { Syllabus } from "@/db/schema";

export function SyllabusStatusBadge({ status }: { status: Syllabus["status"] }) {
  switch (status) {
    case "ready":
      return <Badge tone="green">Ready</Badge>;
    case "needs_review":
      return <Badge tone="ember">Needs review</Badge>;
    case "processing":
      return <Badge tone="neutral">Processing…</Badge>;
    case "failed":
      return <Badge tone="danger">Processing failed</Badge>;
  }
}
