/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS maintenance script. */
/* Read-only reconciliation. Never deletes files, including possible in-flight uploads. */
require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
const db = new PrismaClient();
async function main() {
  const dir = path.resolve(
    process.env.TASK_ATTACHMENT_STORAGE_DIR || "var/task-attachments",
  );
  const rows = await db.tep_cong_viec.findMany({
      select: {
        id: true,
        khoa_luu_tru: true,
        sha256: true,
        kich_thuoc_byte: true,
      },
    }),
    known = new Set(rows.map((r) => r.khoa_luu_tru));
  const invalid = [];
  for (const r of rows) {
    try {
      const bytes = await fs.readFile(path.join(dir, r.khoa_luu_tru));
      if (
        BigInt(bytes.length) !== r.kich_thuoc_byte ||
        createHash("sha256").update(bytes).digest("hex") !== r.sha256
      )
        invalid.push(r.id);
    } catch {
      invalid.push(r.id);
    }
  }
  const names = await fs.readdir(dir).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  const unreferenced = [];
  for (const name of names) {
    if (!known.has(name)) {
      const stat = await fs.stat(path.join(dir, name));
      if (Date.now() - stat.mtimeMs > 86400000) unreferenced.push(name);
    }
  }
  console.log(
    JSON.stringify(
      {
        checked: rows.length,
        missingOrCorruptFileIds: invalid,
        unreferencedOlderThan24Hours: unreferenced,
      },
      null,
      2,
    ),
  );
  if (invalid.length) process.exitCode = 1;
}
main()
  .catch(() => {
    console.error("Could not reconcile task file storage.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
