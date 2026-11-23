/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS maintenance script. */
/* Backup DB + immutable task files from one PostgreSQL snapshot. No data is changed. */
require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client"),
  { spawn } = require("node:child_process"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
const db = new PrismaClient();
async function main() {
  const out = path.resolve(
    process.argv[2] ||
      "outputs/task-backup-" + new Date().toISOString().replace(/[:.]/g, "-"),
  );
  const source = path.resolve(
    process.env.TASK_ATTACHMENT_STORAGE_DIR || "var/task-attachments",
  );
  await fs.mkdir(out, { recursive: true, mode: 0o700 });
  await fs.mkdir(path.join(out, "files"), { recursive: true, mode: 0o700 });
  const url = new URL(process.env.DATABASE_URL),
    env = {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: url.pathname.slice(1),
    };
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode) env.PGSSLMODE = sslmode;
  const manifest = await db.$transaction(
    async (tx) => {
      const [{ snapshot }] = await tx.$queryRawUnsafe(
        "SELECT pg_export_snapshot() AS snapshot",
      );
      const files = await tx.tep_cong_viec.findMany({
        select: {
          id: true,
          khoa_luu_tru: true,
          sha256: true,
          kich_thuoc_byte: true,
        },
      });
      await new Promise((resolve, reject) => {
        const child = spawn(
          process.env.PG_DUMP_BIN || "pg_dump",
          [
            "-Fc",
            "--snapshot=" + snapshot,
            "-f",
            path.join(out, "database.dump"),
          ],
          { env, stdio: ["ignore", "ignore", "pipe"] },
        );
        child.on("error", reject);
        child.stderr.resume();
        child.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(
                Error(
                  "pg_dump failed; check PostgreSQL client version and connection.",
                ),
              ),
        );
      });
      return files;
    },
    { isolationLevel: "RepeatableRead", timeout: 300000 },
  );
  for (const f of manifest) {
    if (!/^[0-9a-f-]{36}$/.test(f.khoa_luu_tru))
      throw Error("Unexpected storage key");
    const bytes = await fs.readFile(path.join(source, f.khoa_luu_tru));
    if (
      BigInt(bytes.length) !== f.kich_thuoc_byte ||
      createHash("sha256").update(bytes).digest("hex") !== f.sha256
    )
      throw Error("File integrity check failed for " + f.id);
    await fs.writeFile(path.join(out, "files", f.khoa_luu_tru), bytes, {
      mode: 0o600,
      flag: "wx",
    });
  }
  await fs.writeFile(
    path.join(out, "manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        files: manifest.map((f) => ({
          ...f,
          kich_thuoc_byte: String(f.kich_thuoc_byte),
        })),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(`Backup complete: ${out}; ${manifest.length} files verified.`);
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
