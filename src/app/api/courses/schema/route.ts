import { NextResponse } from "next/server";
import { getCourseJsonSchema } from "@/lib/course-schema";

/**
 * Public, unauthenticated on purpose — this is static documentation
 * of CourseForge's own import format, not user data. Someone should
 * be able to hand this file to an AI provider or a teammate without
 * needing a CourseForge account.
 */
export async function GET() {
  return new NextResponse(JSON.stringify(getCourseJsonSchema(), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="courseforge-course-schema.json"',
    },
  });
}
