import { randomUUID } from "crypto";
import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courseModules,
  coursePermissions,
  courses,
  moduleProgress,
  quizQuestions,
  quizzes,
  users,
  type Course,
  type NewCourseModule,
  type NewQuizQuestion,
} from "@/db/schema";
import { getOwnedCourse, type FullCourse } from "@/lib/course-service";
import { generateShareToken, isShareTokenFormat } from "@/lib/share-token";
import {
  MAX_SHARE_PEOPLE,
  normalizeEmail,
  ownerDisplayName,
  parseShareEmail,
} from "@/lib/sharing-utils";

/**
 * Milestone 9 — Course Sharing.
 *
 * Two halves:
 * - Owner-side settings (visibility, link, people). Every function
 *   takes the session user id and scopes its own query by owner, so a
 *   non-owner gets exactly the same `null` as a nonexistent course.
 * - Viewer-side access, all of which goes through
 *   resolveSharedCourseAccess on every call. Nothing caches an access
 *   decision: unsharing, resetting the link, removing a person, or
 *   deleting the course takes effect on the very next request.
 *
 * Share tokens are never logged or echoed in errors (see logShareError
 * in sharing-utils.ts for why route-level logging is restricted too).
 */

export type ShareVisibility = "private" | "link";

export interface ShareSettings {
  visibility: ShareVisibility;
  shareToken: string | null;
  /** addedAt is an ISO string. */
  people: { email: string; role: "viewer"; addedAt: string }[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids from URL segments: a malformed uuid would be a Postgres error (→ 500), so it's "not found" instead. */
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Owner-side settings
// ---------------------------------------------------------------------------

async function loadShareSettings(
  course: { id: string; visibility: ShareVisibility; shareToken: string | null }
): Promise<ShareSettings> {
  const people = await db
    .select({
      email: coursePermissions.email,
      role: coursePermissions.role,
      createdAt: coursePermissions.createdAt,
    })
    .from(coursePermissions)
    .where(eq(coursePermissions.courseId, course.id))
    .orderBy(asc(coursePermissions.createdAt), asc(coursePermissions.email));

  return {
    visibility: course.visibility,
    shareToken: course.shareToken,
    people: people.map((p) => ({
      email: p.email,
      role: p.role,
      addedAt: p.createdAt.toISOString(),
    })),
  };
}

async function getOwnedShareRow(courseId: string, ownerId: string) {
  if (!isUuid(courseId)) return null;
  const [row] = await db
    .select({
      id: courses.id,
      visibility: courses.visibility,
      shareToken: courses.shareToken,
    })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

/** null = not found or not owned (indistinguishable on purpose). */
export async function getShareSettings(
  courseId: string,
  ownerId: string
): Promise<ShareSettings | null> {
  const row = await getOwnedShareRow(courseId, ownerId);
  return row ? loadShareSettings(row) : null;
}

/**
 * Creates the token the first time settings are saved (coalesce keeps
 * an existing one, so toggling private → link → private → link always
 * restores the same URL). Ownership is part of the UPDATE's WHERE.
 */
export async function updateVisibility(
  courseId: string,
  ownerId: string,
  visibility: ShareVisibility
): Promise<ShareSettings | null> {
  if (!isUuid(courseId)) return null;
  const [row] = await db
    .update(courses)
    .set({
      visibility,
      shareToken: sql`coalesce(${courses.shareToken}, ${generateShareToken()})`,
    })
    .where(and(eq(courses.id, courseId), eq(courses.ownerId, ownerId)))
    .returning({ id: courses.id, visibility: courses.visibility, shareToken: courses.shareToken });
  return row ? loadShareSettings(row) : null;
}

/** Rotates the token: the old link resolves to "invalid" from the next request on. */
export async function resetShareLink(
  courseId: string,
  ownerId: string
): Promise<ShareSettings | null> {
  if (!isUuid(courseId)) return null;
  const [row] = await db
    .update(courses)
    .set({ shareToken: generateShareToken() })
    .where(and(eq(courses.id, courseId), eq(courses.ownerId, ownerId)))
    .returning({ id: courses.id, visibility: courses.visibility, shareToken: courses.shareToken });
  return row ? loadShareSettings(row) : null;
}

export type AddPersonResult =
  | { ok: true; settings: ShareSettings }
  | { ok: false; status: 400 | 404; error: string };

/**
 * Grants viewer access to an email. Deliberately says nothing about
 * whether that email has an account (no enumeration) — access simply
 * starts working once someone signs in with it. Re-adding an existing
 * email is a no-op success.
 */
export async function addPerson(
  courseId: string,
  ownerId: string,
  rawEmail: string
): Promise<AddPersonResult> {
  const email = parseShareEmail(rawEmail);
  if (!email) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }
  if (!isUuid(courseId)) {
    return { ok: false, status: 404, error: "Course not found." };
  }

  return db.transaction(async (tx) => {
    // Row lock on the owned course serialises concurrent adds, so the
    // people cap below can't be overshot by two requests racing.
    const [course] = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, ownerId)))
      .limit(1)
      .for("update");
    if (!course) {
      return { ok: false, status: 404, error: "Course not found." } as const;
    }

    const [owner] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);
    if (owner && normalizeEmail(owner.email) === email) {
      return { ok: false, status: 400, error: "You already own this course." } as const;
    }

    const existing = await tx
      .select({ email: coursePermissions.email })
      .from(coursePermissions)
      .where(eq(coursePermissions.courseId, courseId));
    const alreadyAdded = existing.some((p) => p.email === email);

    if (!alreadyAdded) {
      if (existing.length >= MAX_SHARE_PEOPLE) {
        return {
          ok: false,
          status: 400,
          error: `A course can be shared with at most ${MAX_SHARE_PEOPLE} people.`,
        } as const;
      }
      await tx
        .insert(coursePermissions)
        .values({ courseId, email, role: "viewer" })
        .onConflictDoNothing({ target: [coursePermissions.courseId, coursePermissions.email] });
    }

    // Adding a person is "saving share settings", so the link exists
    // from here on — the owner needs it to tell that person where to go.
    const [row] = await tx
      .update(courses)
      .set({ shareToken: sql`coalesce(${courses.shareToken}, ${generateShareToken()})` })
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, ownerId)))
      .returning({ id: courses.id, visibility: courses.visibility, shareToken: courses.shareToken });

    const people = await tx
      .select({
        email: coursePermissions.email,
        role: coursePermissions.role,
        createdAt: coursePermissions.createdAt,
      })
      .from(coursePermissions)
      .where(eq(coursePermissions.courseId, courseId))
      .orderBy(asc(coursePermissions.createdAt), asc(coursePermissions.email));

    const settings: ShareSettings = {
      visibility: row.visibility,
      shareToken: row.shareToken,
      people: people.map((p) => ({
        email: p.email,
        role: p.role,
        addedAt: p.createdAt.toISOString(),
      })),
    };
    return { ok: true, settings } as const;
  });
}

/** Revokes immediately (the next share request re-reads the permission list). Removing an absent email is a no-op. */
export async function removePerson(
  courseId: string,
  ownerId: string,
  rawEmail: string
): Promise<ShareSettings | null> {
  const row = await getOwnedShareRow(courseId, ownerId);
  if (!row) return null;

  // Normalise the same way addPerson did; an unparseable value can't
  // match a stored row, so there's simply nothing to delete.
  const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";
  if (email) {
    await db
      .delete(coursePermissions)
      .where(and(eq(coursePermissions.courseId, row.id), eq(coursePermissions.email, email)));
  }

  return loadShareSettings(row);
}

// ---------------------------------------------------------------------------
// Viewer-side access — the single gate
// ---------------------------------------------------------------------------

export type SharedCourseAccess =
  | { status: "invalid" } // unknown token (deleted course, rotated token, garbage)
  | { status: "sign_in_required" } // private, anonymous visitor
  | { status: "forbidden" } // private, signed in, not invited
  | {
      status: "allowed";
      course: Course;
      isOwner: boolean;
      viewerUserId: string | null;
      ownerDisplayName: string;
    };

/**
 * The single authorization gate for every /share request.
 * viewerUserId comes from the session, never the client — and is
 * re-resolved against the `user` table here, so a session for a user
 * that no longer exists is treated as anonymous, and the email used
 * for the permission check is always the account's stored email.
 *
 * Order matters only for what an unauthorised caller learns: an
 * unknown token is "invalid" regardless of who asks.
 */
export async function resolveSharedCourseAccess(
  token: string,
  viewerUserId: string | null
): Promise<SharedCourseAccess> {
  if (!isShareTokenFormat(token)) return { status: "invalid" };

  const [row] = await db
    .select({ course: courses, ownerName: users.name })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.ownerId))
    .where(eq(courses.shareToken, token))
    .limit(1);
  if (!row) return { status: "invalid" };

  const { course } = row;
  const displayName = ownerDisplayName(row.ownerName);

  let viewer: { id: string; email: string } | null = null;
  if (viewerUserId && isUuid(viewerUserId)) {
    const [found] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, viewerUserId))
      .limit(1);
    viewer = found ?? null;
  }

  const allowed = (isOwner: boolean): SharedCourseAccess => ({
    status: "allowed",
    course,
    isOwner,
    viewerUserId: viewer?.id ?? null,
    ownerDisplayName: displayName,
  });

  if (viewer && viewer.id === course.ownerId) return allowed(true);
  if (course.visibility === "link") return allowed(false);

  // Private: only invited emails.
  if (!viewer) return { status: "sign_in_required" };

  const [permission] = await db
    .select({ id: coursePermissions.id })
    .from(coursePermissions)
    .where(
      and(
        eq(coursePermissions.courseId, course.id),
        eq(coursePermissions.email, normalizeEmail(viewer.email))
      )
    )
    .limit(1);

  return permission ? allowed(false) : { status: "forbidden" };
}

/**
 * Same FullCourse shape as getOwnedCourse, gated by
 * resolveSharedCourseAccess. NOTE: like getOwnedCourse, `full` still
 * contains quiz correctAnswer/explanation and private course columns
 * (ownerId, shareToken, …) — callers must pass questions through
 * sanitizeQuestionForClient and only hand client components the
 * fields they render.
 */
export async function getSharedCourse(
  token: string,
  viewerUserId: string | null
): Promise<{ access: SharedCourseAccess; full: FullCourse | null }> {
  const access = await resolveSharedCourseAccess(token, viewerUserId);
  if (access.status !== "allowed") return { access, full: null };

  // Loaded through the owner-scoped loader using the owner id from the
  // course row the gate just resolved — there is no un-scoped loader.
  const full = await getOwnedCourse(access.course.id, access.course.ownerId);
  if (!full) return { access: { status: "invalid" }, full: null };

  return { access, full };
}

// ---------------------------------------------------------------------------
// Add to My Courses (creates a Course Copy)
// ---------------------------------------------------------------------------

export type AddToMyCoursesResult =
  | { ok: true; course: Course }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string; existingCourseId?: string };

export const SHARE_LINK_INVALID_ERROR = "This share link isn't valid.";

/** The id of this user's existing Course Copy of `sourceCourseId`, or null. */
export async function findExistingCopy(
  sourceCourseId: string,
  userId: string
): Promise<string | null> {
  if (!isUuid(sourceCourseId) || !isUuid(userId)) return null;
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.sourceCourseId, sourceCourseId), eq(courses.ownerId, userId)))
    .orderBy(asc(courses.createdAt))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Deep-copies a shared course into the user's library. The only
 * inputs are the token (from the URL path) and the session user id —
 * the original course, its owner, and the user's right to copy it are
 * all re-derived by resolveSharedCourseAccess, never taken from the
 * client.
 *
 * The copy is fully independent: new ids throughout, owned by the
 * copier, its own version group (v1), private with no token, no
 * subject/syllabus link (those belong to someone else), no progress.
 * Quiz questions keep correctAnswer/explanation — the copier owns this
 * content now, exactly as if they'd imported it.
 */
export async function addSharedCourseToMyCourses(
  token: string,
  userId: string
): Promise<AddToMyCoursesResult> {
  const access = await resolveSharedCourseAccess(token, userId);
  switch (access.status) {
    case "invalid":
      return { ok: false, status: 404, error: SHARE_LINK_INVALID_ERROR };
    case "sign_in_required":
    case "forbidden":
      return {
        ok: false,
        status: 403,
        error: "You don't have permission to add this course.",
      };
  }
  if (access.isOwner || !access.viewerUserId) {
    return { ok: false, status: 400, error: "This is already your course." };
  }

  const copierId = access.viewerUserId;
  const original = access.course;

  return db.transaction(async (tx) => {
    // Serialise copies of the same original by the same user (double
    // click, two tabs) so the duplicate check below can't be raced.
    // Released automatically at commit/rollback.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`share-copy:${copierId}:${original.id}`}))`
    );

    const [existing] = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.sourceCourseId, original.id), eq(courses.ownerId, copierId)))
      .limit(1);
    if (existing) {
      return {
        ok: false,
        status: 409,
        error: "This course is already in My Courses.",
        existingCourseId: existing.id,
      } as const;
    }

    const modules = await tx
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, original.id))
      .orderBy(asc(courseModules.sortOrder));

    const moduleIds = modules.map((m) => m.id);
    const sourceQuizzes = moduleIds.length
      ? await tx.select().from(quizzes).where(inArray(quizzes.moduleId, moduleIds))
      : [];
    const quizIds = sourceQuizzes.map((q) => q.id);
    const sourceQuestions = quizIds.length
      ? await tx
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.quizId, quizIds))
          .orderBy(asc(quizQuestions.sortOrder))
      : [];

    const now = new Date();
    const copyId = randomUUID();

    const [copy] = await tx
      .insert(courses)
      .values({
        id: copyId,
        versionGroupId: copyId,
        version: 1,
        ownerId: copierId,
        subjectId: null,
        syllabusId: null,
        title: original.title,
        subjectCode: original.subjectCode,
        academicYear: original.academicYear,
        semester: original.semester,
        description: original.description,
        learningObjectives: original.learningObjectives,
        schemaVersion: original.schemaVersion,
        source: "shared_copy",
        visibility: "private",
        shareToken: null,
        sourceCourseId: original.id,
        // A copy of a copy credits whoever originally made the content,
        // not the intermediate sharer.
        originalCreatorName:
          original.source === "shared_copy" && original.originalCreatorName
            ? original.originalCreatorName
            : access.ownerDisplayName,
        copiedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Ids are generated here so modules → quizzes → questions can each
    // go in as one multi-row insert without relying on RETURNING order.
    const newModuleIds = new Map(modules.map((m) => [m.id, randomUUID()]));
    const newQuizIds = new Map(sourceQuizzes.map((q) => [q.id, randomUUID()]));

    if (modules.length) {
      await tx.insert(courseModules).values(
        modules.map(
          (m): NewCourseModule => ({
            id: newModuleIds.get(m.id)!,
            courseId: copy.id,
            title: m.title,
            description: m.description,
            learningObjectives: m.learningObjectives,
            contentMarkdown: m.contentMarkdown,
            sortOrder: m.sortOrder,
          })
        )
      );
    }

    if (sourceQuizzes.length) {
      await tx.insert(quizzes).values(
        sourceQuizzes.map((q) => ({
          id: newQuizIds.get(q.id)!,
          moduleId: newModuleIds.get(q.moduleId)!,
          title: q.title,
        }))
      );
    }

    if (sourceQuestions.length) {
      await tx.insert(quizQuestions).values(
        sourceQuestions.map(
          (q): NewQuizQuestion => ({
            quizId: newQuizIds.get(q.quizId)!,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            sortOrder: q.sortOrder,
          })
        )
      );
    }

    return { ok: true, course: copy } as const;
  });
}

// ---------------------------------------------------------------------------
// Shared with me
// ---------------------------------------------------------------------------

export interface SharedWithMeCourse {
  title: string;
  subjectCode: string | null;
  academicYear: number | null;
  semester: Course["semester"];
  ownerDisplayName: string;
  shareToken: string;
  totalModules: number;
  completedModules: number;
  /** ISO string — when this user's email was added. */
  sharedAt: string;
}

/**
 * Courses whose permission list contains the user's email (excludes
 * their own courses). Deliberately returns no course id or owner id —
 * the share token is the handle, so opening one always goes back
 * through resolveSharedCourseAccess.
 *
 * Includes invites on courses the owner later switched to "Anyone with
 * the link": the invite still stands and access still works, so the
 * course vanishing from this list would be surprising.
 */
export async function listSharedWithMe(userId: string): Promise<SharedWithMeCourse[]> {
  if (!isUuid(userId)) return [];

  const [viewer] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!viewer) return [];
  const email = normalizeEmail(viewer.email);

  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      subjectCode: courses.subjectCode,
      academicYear: courses.academicYear,
      semester: courses.semester,
      shareToken: courses.shareToken,
      ownerName: users.name,
      sharedAt: coursePermissions.createdAt,
    })
    .from(coursePermissions)
    .innerJoin(courses, eq(courses.id, coursePermissions.courseId))
    .innerJoin(users, eq(users.id, courses.ownerId))
    .where(
      and(
        eq(coursePermissions.email, email),
        isNotNull(courses.shareToken),
        ne(courses.ownerId, userId)
      )
    )
    .orderBy(desc(coursePermissions.createdAt));

  if (rows.length === 0) return [];

  // Same "done" definition as everywhere else (lesson completed AND
  // quiz attempted), for this viewer's own progress rows only.
  const progressRows = await db
    .select({
      courseId: courseModules.courseId,
      totalModules: sql<number>`count(*)`.mapWith(Number),
      completedModules: sql<number>`count(*) filter (where ${moduleProgress.lessonCompleted} and ${moduleProgress.quizScore} is not null)`.mapWith(
        Number
      ),
    })
    .from(courseModules)
    .leftJoin(
      moduleProgress,
      and(eq(moduleProgress.moduleId, courseModules.id), eq(moduleProgress.userId, userId))
    )
    .where(
      inArray(
        courseModules.courseId,
        rows.map((r) => r.id)
      )
    )
    .groupBy(courseModules.courseId);
  const progressByCourse = new Map(progressRows.map((p) => [p.courseId, p]));

  return rows.map((row) => {
    const progress = progressByCourse.get(row.id);
    return {
      title: row.title,
      subjectCode: row.subjectCode,
      academicYear: row.academicYear,
      semester: row.semester,
      ownerDisplayName: ownerDisplayName(row.ownerName),
      // Non-null by the WHERE above.
      shareToken: row.shareToken!,
      totalModules: progress?.totalModules ?? 0,
      completedModules: progress?.completedModules ?? 0,
      sharedAt: row.sharedAt.toISOString(),
    };
  });
}
