import * as XLSX from "xlsx";

export const HR_FILE = "DS_nhan_su_Sao_Do_26.10.2026.xlsx";
export const HR_SHA256 =
  "ff7b5573f0896bac588649dbc869a233dd7cc9a280814d19f21b97992994a9a8";
export const HR_DATE = new Date("2026-10-26T00:00:00Z");
const departments: Record<string, string> = {
  "Ban lãnh đạo": "BLD",
  "Ban Kiểm soát": "BKS",
  "Phòng Kinh doanh": "KD",
  "Phòng Tài chính – Kế toán": "TCKT",
  "Phòng HCNS": "HCNS",
  "Ban Pháp chế": "PC",
  "Phòng Kế hoạch – Đầu tư": "KHDT",
  "Phòng Phát triển Dự án": "PTDA",
  "Ban QLDA": "QLDA_NDV1",
};
export const normalizeName = (s: string) =>
  s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

// Calendar dates, never local midnight: local Date -> ISO previously lost one day.
export function excelDate(value: unknown): Date {
  if (typeof value !== "number" || !Number.isInteger(value))
    throw Error("Ngày sinh Excel không hợp lệ.");
  const d = XLSX.SSF.parse_date_code(value);
  if (
    !d ||
    d.y < 1900 ||
    d.y > 2026 ||
    (d.y === 1900 && d.m === 2 && d.d === 29)
  )
    throw Error("Ngày sinh ngoài khoảng hợp lệ.");
  return new Date(Date.UTC(d.y, d.m - 1, d.d));
}
export type HrRow = {
  row: number;
  fullName: string;
  departmentCode: string;
  position: string;
  dateOfBirth: Date;
  hrNotes: string | null;
};
export function readHrRows(buffer: Buffer): HrRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  if (workbook.Workbook?.WBProps?.date1904)
    throw Error("Không hỗ trợ workbook ngày 1904 trong lần nhập này.");
  const sheet = workbook.Sheets["Danh sach nhan su"];
  if (!sheet) throw Error("Không tìm thấy sheet nhân sự.");
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: true,
  });
  if (
    data[4]?.slice(0, 6).join("|") !==
    "STT|Họ và tên|Phòng ban/Bộ phận|Chức danh|Ngày sinh|Ghi chú"
  )
    throw Error("Cấu trúc cột đã đổi.");
  const rows: HrRow[] = [];
  const names = new Set<string>();
  for (let i = 5; i < data.length; i++) {
    const r = data[i];
    if (!r.some((v) => v !== null && v !== undefined && v !== "")) continue;
    if (r[0] !== rows.length + 1)
      throw Error(`STT không liên tục tại dòng ${i + 1}.`);
    const [fullName, department, position] = r
      .slice(1, 4)
      .map((v) => String(v ?? "").trim());
    if (
      !fullName ||
      !position ||
      position.length > 100 ||
      !departments[department]
    )
      throw Error(
        `Thiếu thông tin hoặc phòng ban không có mapping tại dòng ${i + 1}.`,
      );
    const key = normalizeName(fullName);
    if (names.has(key))
      throw Error(
        `Tên trùng trong file tại dòng ${i + 1}; cần định danh bổ sung.`,
      );
    names.add(key);
    rows.push({
      row: i + 1,
      fullName,
      departmentCode: departments[department],
      position,
      dateOfBirth: excelDate(r[4]),
      hrNotes: r[5] ? String(r[5]).trim() : null,
    });
  }
  if (rows.length !== 72) throw Error("File chốt phải có đúng 72 dòng người.");
  return rows;
}

// Explicit reviewed crosswalk, not fuzzy matching. The two Trang profiles are NOT merged.
export function matchEmployee<
  T extends { employeeCode: string; fullName: string },
>(row: Pick<HrRow, "fullName">, employees: T[]): T | undefined {
  const reviewedCode =
    row.fullName === "YOON JOON SUN"
      ? "SDG-010"
      : row.fullName === "Đào Thị Thu Trang"
        ? "SDG-018"
        : null;
  if (reviewedCode) {
    const person = employees.find((e) => e.employeeCode === reviewedCode);
    const expectedNames =
      reviewedCode === "SDG-010"
        ? ["Joonsun Yoon", "YOON JOON SUN"]
        : ["Đào Thị Thu Trang"];
    if (!person || !expectedNames.includes(person.fullName))
      throw Error(`Mapping đã đối chiếu ${reviewedCode} không còn khớp.`);
    return person;
  }
  const matches = employees.filter(
    (e) => normalizeName(e.fullName) === normalizeName(row.fullName),
  );
  if (matches.length > 1)
    throw Error(`Trùng tên ${row.fullName}; không tự ghép hồ sơ.`);
  return matches[0];
}
