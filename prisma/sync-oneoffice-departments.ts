import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ONE_OFFICE_SYSTEM = "ONE_OFFICE";
const COMPANY_EXTERNAL_ID = "23";
const SNAPSHOT_AT = new Date("2026-10-21T00:00:00+07:00");

const codeByExternalId: Record<string, string> = {
  "5": "BLD",
  "11": "KD",
  "14": "TCKT",
  "17": "HCNS",
  "20": "PC",
  "32": "KHDT",
  "35": "PTDA",
  "38": "QLDA_NDV1",
  "41": "QLDA_BGDKCN",
  "44": "QLDA_VP",
  "47": "QLDA_KT",
  "50": "QLDA_CQ",
  "53": "QLDA_GN",
  "56": "QLDA_DN",
  "59": "QLDA_PCCC",
  "62": "BKS",
  "65": "KD_CSKH",
  "68": "KD_SM",
};

type OneOfficeDepartmentRow = {
  "Tiêu đề"?: string;
  "ID"?: string | number;
  "ID phòng ban cha"?: string | number;
  "Cấp của phòng ban"?: string | number;
  "Phòng ban đầy đủ"?: string;
  "Người giám sát công việc"?: string;
};

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

async function main() {
  const sourcePath = path.join(
    process.cwd(),
    "docs/1office-sources/exports/2026-10-21/departments-19-19-ban-ghi-Phong-ban-chi-nhanh-ngay-21102026.xlsx"
  );
  const workbook = XLSX.readFile(sourcePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<OneOfficeDepartmentRow>(worksheet, {
    defval: null,
    raw: false,
  });

  const company = await prisma.company.findFirst({
    where: { taxCode: "0200765782" },
    select: { id: true },
  });
  if (!company) throw new Error("Không tìm thấy công ty Sao Đỏ trong database.");

  const sourceRows = rows.filter((row) => asString(row.ID) !== COMPANY_EXTERNAL_ID);
  if (sourceRows.length !== Object.keys(codeByExternalId).length) {
    throw new Error(
      `Export có ${sourceRows.length} đơn vị nghiệp vụ, mapping có ${Object.keys(codeByExternalId).length}. Dừng để tránh đồng bộ thiếu.`
    );
  }

  const existing = await prisma.department.findMany({
    where: { companyId: company.id },
    select: { id: true, code: true },
  });
  const idByCode = new Map(existing.map((department) => [department.code, department.id]));

  for (const code of Object.values(codeByExternalId)) {
    if (!idByCode.has(code)) throw new Error(`Không tìm thấy phòng ban ERP có mã ${code}.`);
  }

  await prisma.$transaction(
    sourceRows.map((row) => {
      const externalId = asString(row.ID);
      const externalParentId = asString(row["ID phòng ban cha"]);
      const externalName = asString(row["Tiêu đề"]);
      if (!externalId || !externalName) throw new Error("Export có dòng thiếu ID hoặc Tiêu đề.");

      const code = codeByExternalId[externalId];
      if (!code) throw new Error(`Chưa có mapping cho ID 1Office ${externalId}.`);

      const parentCode = externalParentId ? codeByExternalId[externalParentId] : undefined;
      const parentId = parentCode ? idByCode.get(parentCode) ?? null : null;

      return prisma.department.update({
        where: {
          companyId_code: { companyId: company.id, code },
        },
        data: {
          name: externalName,
          parentId,
          externalSystem: ONE_OFFICE_SYSTEM,
          externalId,
          externalParentId,
          externalName,
          externalPath: asString(row["Phòng ban đầy đủ"]),
          externalLevel: Number(asString(row["Cấp của phòng ban"]) ?? 0),
          externalSupervisorName: asString(row["Người giám sát công việc"]),
          externalSnapshotAt: SNAPSHOT_AT,
        },
      });
    })
  );

  console.log(
    `Đã đồng bộ ${sourceRows.length} đơn vị từ snapshot 1Office ngày 21/10/2026; nút công ty ID ${COMPANY_EXTERNAL_ID} được ánh xạ ở cấp Company.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
