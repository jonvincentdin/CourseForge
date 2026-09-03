import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { dirname, join, resolve } from "path";

/**
 * Storage abstraction so the rest of the app never talks to the
 * filesystem directly. Only implementation is local disk right now —
 * fine for local development, NOT fine for most deployment targets
 * with ephemeral filesystems. Swap this file for an S3-compatible
 * implementation before deploying; nothing else should need to change
 * (see .context/DECISIONS.md open question on storage).
 */

const STORAGE_ROOT = resolve(process.env.STORAGE_DIR ?? "./storage");

export interface StoredFile {
  /** Opaque key to pass back into readFile/deleteFile. Never a raw path the client controls. */
  key: string;
}

function assertSafeKey(key: string) {
  const resolved = resolve(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export async function saveFile(
  key: string,
  data: Buffer
): Promise<StoredFile> {
  const fullPath = assertSafeKey(key);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
  return { key };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const fullPath = assertSafeKey(key);
  return readFile(fullPath);
}

export async function deleteStoredFile(key: string): Promise<void> {
  const fullPath = assertSafeKey(key);
  await unlink(fullPath).catch((err) => {
    // Already gone is fine — deleting is idempotent from the caller's view.
    if (err.code !== "ENOENT") throw err;
  });
}

export function syllabusStorageKey(userId: string, syllabusId: string) {
  return join("syllabi", userId, `${syllabusId}.pdf`);
}
