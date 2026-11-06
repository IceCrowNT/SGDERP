import path from "node:path";
import { unlink } from "node:fs/promises";
export const avatarDirectory = path.resolve(
  process.env.AVATAR_STORAGE_DIR || path.join(process.cwd(), "var", "avatars"),
);
export function avatarFilename(url: string | null | undefined) {
  return url?.match(/^\/media\/avatar\/([0-9a-f-]{36}\.webp)$/)?.[1] ?? null;
}
export async function removeAvatar(url: string | null | undefined) {
  const file = avatarFilename(url);
  if (file) await unlink(path.join(avatarDirectory, file)).catch(() => {});
}
