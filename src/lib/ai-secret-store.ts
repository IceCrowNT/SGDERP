import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, readdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { z } from "zod";
import { AiApiKeySchema, AiConnectionError } from "@/lib/validations/ai-settings";

const referenceSchema = z.string().uuid();
const envelopeSchema = z.object({ version: z.literal(1), iv: z.string(), tag: z.string(), ciphertext: z.string() }).strict();
const vaultError = () => new AiConnectionError("Không đọc/ghi được kho khóa AI. Kiểm tra quyền thư mục và khóa mã hóa trên máy chủ.");

async function directory() {
  const path = resolve(process.env.AI_SECRET_STORAGE_DIR || join(process.cwd(), "var", "ai-secrets"));
  const publicPath = resolve(process.cwd(), "public");
  if (path === publicPath || path.startsWith(publicPath + sep)) throw vaultError();
  await mkdir(path, { recursive: true, mode: 0o700 });
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw vaultError();
  return path;
}

async function readPrivate(path: string, limit: number) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > limit || (stat.mode & 0o077) !== 0) throw vaultError();
    return await file.readFile();
  } finally { await file.close(); }
}

async function master(directoryPath: string, allowCreate: boolean) {
  const path = join(directoryPath, "master.key");
  try {
    const key = await readPrivate(path, 32);
    if (key.length !== 32) throw vaultError();
    return key;
  } catch (error) {
    if (!allowCreate || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  // Never regenerate a missing master for an existing encrypted store.
  if ((await readdir(directoryPath)).some(name => name.endsWith(".secret.json"))) throw vaultError();
  const temporary = join(directoryPath, `.master-${randomUUID()}`);
  await writeFile(temporary, randomBytes(32), { flag: "wx", mode: 0o600 });
  try {
    try { await link(temporary, path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  } finally { await unlink(temporary); }
  const key = await readPrivate(path, 32);
  if (key.length !== 32) throw vaultError();
  return key;
}

export async function storeAiSecret(companyId: number, apiKey: string) {
  try {
    const key = AiApiKeySchema.parse(apiKey);
    const path = await directory(), encryptionKey = await master(path, true), reference = randomUUID();
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
    cipher.setAAD(Buffer.from(`sdg-ai:1:${companyId}:${reference}`));
    const ciphertext = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
    const envelope = { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
    await writeFile(join(path, `${reference}.secret.json`), JSON.stringify(envelope), { flag: "wx", mode: 0o600 });
    return reference;
  } catch { throw vaultError(); }
}

export async function readAiSecret(companyId: number, reference: string) {
  try {
    referenceSchema.parse(reference);
    const path = await directory(), encryptionKey = await master(path, false);
    const envelope = envelopeSchema.parse(JSON.parse((await readPrivate(join(path, `${reference}.secret.json`), 12000)).toString("utf8")));
    const iv = Buffer.from(envelope.iv, "base64"), tag = Buffer.from(envelope.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) throw vaultError();
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAAD(Buffer.from(`sdg-ai:1:${companyId}:${reference}`)); decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8");
    return AiApiKeySchema.parse(plaintext);
  } catch { throw vaultError(); }
}
