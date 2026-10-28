import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  if (typeof val === "string") {
    const parts = val.trim().split(/[\/\-]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function cleanPhone(val: any): string | null {
  if (!val) return null;
  const str = val.toString().replace(/[\s\.\-\(\)]/g, "").trim();
  return str.length >= 8 ? str : null;
}

async function main() {
  console.log("🚀 Bắt đầu quá trình nạp dữ liệu (Seed Data)...");

  // 1. Tạo Công ty Sao Đỏ Group mặc định
  const company = await prisma.company.upsert({
    where: { taxCode: "0200765782" },
    update: {},
    create: {
      name: "CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ SAO ĐỎ",
      taxCode: "0200765782",
      address: "Số 768B Ngô Gia Tự, Phường Thành Tô, Quận Hải An, Thành phố Hải Phòng",
      isActive: true,
    },
  });
  console.log(`✅ Công ty: ${company.name} (ID: ${company.id})`);

  // 2. Tạo các Nhóm vai trò chuẩn (Roles) tập trung cho HCNS & IT làm nòng cốt
  const roleDefs = [
    {
      code: "ADMIN",
      name: "Ban Giám Đốc / Quản Trị Tối Cao",
      description: "Toàn quyền quản trị và điều hành toàn bộ các phân hệ trong hệ thống",
      isSystem: true,
    },
    {
      code: "IT_ADMIN",
      name: "Quản Trị Kỹ Thuật & CNTT (HCNS)",
      description: "Quản trị hệ thống, tài khoản, phân quyền, cấu hình và giám sát nhật ký hoạt động",
      isSystem: true,
    },
    {
      code: "HR_MANAGER",
      name: "Trưởng Phòng Hành Chính Nhân Sự",
      description: "Toàn quyền quản lý danh bạ, hồ sơ nhân sự, phòng ban và phân công công việc",
      isSystem: true,
    },
    {
      code: "HR_STAFF",
      name: "Chuyên Viên Hành Chính Nhân Sự",
      description: "Cập nhật hồ sơ nhân sự, danh bạ nội bộ và hợp đồng lao động",
      isSystem: true,
    },
    {
      code: "DEPT_HEAD",
      name: "Trưởng Phòng / Bộ Phận / Ban QLDA",
      description: "Tra cứu danh bạ toàn công ty, quản lý và điều phối công việc đơn vị phụ trách",
      isSystem: true,
    },
    {
      code: "ACCOUNTANT",
      name: "Kế Toán Viên / Kế Toán Trưởng",
      description: "Tra cứu danh bạ đối soát nhân sự, theo dõi công việc tài chính",
      isSystem: true,
    },
    {
      code: "STAFF",
      name: "Cán Bộ Nhân Viên",
      description: "Tra cứu danh bạ nội bộ, xem thông tin cá nhân và báo cáo tiến độ công việc",
      isSystem: true,
    },
  ];

  const roleMap: Record<string, number> = {};
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: r.code,
        },
      },
      update: { name: r.name, description: r.description },
      create: {
        companyId: company.id,
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      },
    });
    roleMap[r.code] = role.id;
  }
  console.log(`✅ Đã khởi tạo ${Object.keys(roleMap).length} Nhóm Vai Trò (Roles).`);

  // 3. Tạo Danh mục Quyền cơ bản (Permissions)
  const permissionDefs = [
    { module: "HR", action: "VIEW", name: "Xem danh bạ nhân sự", scope: "ALL" },
    { module: "HR", action: "MANAGE", name: "Quản lý hồ sơ nhân sự & cơ cấu phòng ban", scope: "ALL" },
    { module: "TASK", action: "VIEW", name: "Xem danh sách công việc", scope: "ALL" },
    { module: "TASK", action: "CREATE", name: "Tạo công việc mới", scope: "ALL" },
    { module: "TASK", action: "ASSIGN", name: "Giao việc cho nhân sự", scope: "DEPARTMENT" },
    { module: "TASK", action: "APPROVE", name: "Nghiệm thu / Phê duyệt công việc", scope: "DEPARTMENT" },
    { module: "TASK", action: "MANAGE", name: "Toàn quyền quản trị phân hệ công việc", scope: "ALL" },
    { module: "SYSTEM", action: "MANAGE", name: "Cấu hình hệ thống & phân quyền", scope: "ALL" },
    { module: "APPROVAL", action: "MANAGE", name: "Quản lý quy trình phê duyệt", scope: "ALL" },
  ];

  const permMap: Record<string, number> = {};
  for (const p of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: {
        module_action: {
          module: p.module,
          action: p.action,
        },
      },
      update: { name: p.name, scope: p.scope },
      create: {
        module: p.module,
        action: p.action,
        name: p.name,
        scope: p.scope,
      },
    });
    permMap[`${p.module}:${p.action}`] = perm.id;
  }
  console.log(`✅ Đã khởi tạo ${Object.keys(permMap).length} Quyền Phân Hệ (Permissions).`);

  // 4. Liên kết Quyền với Vai Trò (RolePermission)
  const rolePermMappings: Record<string, string[]> = {
    ADMIN: Object.keys(permMap),
    IT_ADMIN: Object.keys(permMap),
    HR_MANAGER: [
      "HR:VIEW",
      "HR:MANAGE",
      "TASK:VIEW",
      "TASK:CREATE",
      "TASK:ASSIGN",
      "TASK:APPROVE",
    ],
    HR_STAFF: ["HR:VIEW", "HR:MANAGE", "TASK:VIEW", "TASK:CREATE"],
    DEPT_HEAD: ["HR:VIEW", "TASK:VIEW", "TASK:CREATE", "TASK:ASSIGN", "TASK:APPROVE"],
    ACCOUNTANT: ["HR:VIEW", "TASK:VIEW", "TASK:CREATE"],
    STAFF: ["HR:VIEW", "TASK:VIEW"],
  };

  for (const [rCode, pKeys] of Object.entries(rolePermMappings)) {
    const rId = roleMap[rCode];
    for (const pKey of pKeys) {
      const pId = permMap[pKey];
      if (rId && pId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: rId,
              permissionId: pId,
            },
          },
          update: {},
          create: {
            roleId: rId,
            permissionId: pId,
          },
        });
      }
    }
  }
  console.log(`✅ Đã gán ma trận quyền hạn cho các vai trò.`);

  // 5. Khởi tạo Cơ cấu Tổ chức Phân cấp Cây (6 Phòng ban Cha + Lãnh đạo + Bộ phận Con)
  // 5.1 Các Đơn vị cấp Cha (Cấp 1 - Trực thuộc Tập đoàn)
  const parentDeptDefs = [
    { code: "BLD", name: "BAN LÃNH ĐẠO", description: "Hội đồng Quản trị & Ban Tổng Giám đốc Tập đoàn" },
    { code: "HCNS", name: "PHÒNG HÀNH CHÍNH NHÂN SỰ", description: "Quản trị hành chính, nhân sự, CNTT và hậu cần" },
    { code: "TCKT", name: "PHÒNG TÀI CHÍNH - KẾ TOÁN", description: "Quản trị tài chính, kế toán và ngân sách" },
    { code: "KD", name: "PHÒNG KINH DOANH", description: "Kinh doanh, xúc tiến đầu tư và chăm sóc khách hàng" },
    { code: "KHDT", name: "PHÒNG KẾ HOẠCH ĐẦU TƯ", description: "Kế hoạch tổng thể và quản lý đầu tư" },
    { code: "PTDA", name: "PHÒNG PHÁT TRIỂN DỰ ÁN", description: "Nghiên cứu, phát triển và chuẩn bị các dự án" },
    { code: "PC", name: "BAN PHÁP CHẾ", description: "Pháp chế doanh nghiệp và tư vấn pháp lý" },
    { code: "BKS", name: "BAN KIỂM SOÁT", description: "Kiểm soát tuân thủ và kiểm toán nội bộ" },
    { code: "QLDA_NDV1", name: "BAN QLDA KCN NAM ĐÌNH VŨ 1", description: "Ban Quản lý Dự án Khu công nghiệp Nam Đình Vũ 1" },
  ];

  const departmentMap: Record<string, number> = {};

  for (const pDept of parentDeptDefs) {
    const dept = await prisma.department.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: pDept.code,
        },
      },
      update: { name: pDept.name, description: pDept.description, parentId: null },
      create: {
        companyId: company.id,
        code: pDept.code,
        name: pDept.name,
        description: pDept.description,
        parentId: null,
      },
    });
    departmentMap[pDept.name] = dept.id;
  }

  // 5.2 Khởi tạo các Bộ phận Con chuẩn 100% theo File Excel gốc:
  const childDeptDefs = [
    // 1. Các bộ phận con thuộc PHÒNG KINH DOANH (Khớp 100% Excel gốc):
    { parentName: "PHÒNG KINH DOANH", code: "KD_SM", name: "Bộ phận Sales Marketing - Phòng Kinh doanh", description: "Tiếp thị, quảng bá và bán hàng" },
    { parentName: "PHÒNG KINH DOANH", code: "KD_CSKH", name: "Bộ phận CSKH - Phòng Kinh Doanh", description: "Dịch vụ và chăm sóc khách hàng" },

    // 2. Các bộ phận con thuộc Khối độc lập BAN QLDA KCN NAM ĐÌNH VŨ 1 (Khớp 100% Excel gốc):
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_BGDKCN", name: "Ban giám đốc KCN NAM ĐÌNH VŨ 1", description: "Ban điều hành KCN Nam Đình Vũ 1" },
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_VP", name: "Bộ phận văn phòng - Ban QLDA", description: "Hành chính văn phòng ban QLDA" },
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_KT", name: "Bộ phận kỹ thuật - Ban QLDA", description: "Kỹ thuật và hạ tầng công trình" },
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_CQ", name: "Bộ phận cảnh quan môi trường - Ban QLDA", description: "Cảnh quan và môi trường KCN" },
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_GN", name: "Bộ phận giao nhận - Ban QLDA", description: "Giao nhận vật tư và điều phối kho bãi" },
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_DN", name: "Bộ phận điện nước - Ban QLDA", description: "Vận hành hệ thống điện nước KCN" },
    { parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1", code: "QLDA_PCCC", name: "Bộ phận PCCC - Ban QLDA", description: "Phòng cháy chữa cháy và an toàn lao động" },
  ];

  for (const cDept of childDeptDefs) {
    const parentId = departmentMap[cDept.parentName];
    const dept = await prisma.department.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: cDept.code,
        },
      },
      update: { name: cDept.name, description: cDept.description, parentId },
      create: {
        companyId: company.id,
        code: cDept.code,
        name: cDept.name,
        description: cDept.description,
        parentId,
      },
    });
    departmentMap[cDept.name] = dept.id;
  }

  console.log(`✅ Đã đồng bộ ${Object.keys(departmentMap).length} Đơn vị / Phòng ban theo mô hình Cây phân cấp.`);

  // 6. Mật khẩu mặc định băm sẵn (đơn giản hoá 123456 cho nội bộ)
  const defaultPassword = await bcrypt.hash("123456", 10);

  // 6.1 Tạo tài khoản Quản trị viên tối cao (Master Admin)
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {}, // Never reset credentials or change the existing account owner on reseed.
    create: {
      username: "admin", password: defaultPassword, displayName: "Quản Trị Viên Hệ Thống",
      isActive: true, companyId: company.id,
    },
  });

  const adminRoleId = roleMap["ADMIN"];
  if (adminRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRoleId,
        },
      },
      update: { isPrimary: true },
      create: {
        userId: adminUser.id,
        roleId: adminRoleId,
        isPrimary: true,
      },
    });
  }
  console.log(`✅ Đã đồng bộ tài khoản Master Admin (username: admin / 123456).`);

  // 7. Đọc tệp Excel và Nạp Phòng ban & Nhân sự thực tế
  const excelPath = path.join(
    process.cwd(),
    "docs",
    "HR_danhsachnhanvien",
    "67-ban-ghi-Ho-so-nhan-su-ngay-14102026.xlsx"
  );
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = rawData[0] as string[];
  const colIdx = (name: string) => headers.indexOf(name);

  const idxMaNS = colIdx("Mã NS");
  const idxHoTen = colIdx("Họ và tên");
  const idxPhongBan = colIdx("Phòng ban");
  const idxChucVu = colIdx("Chức vụ");
  const idxTenViTri = colIdx("Tên vị trí");
  const idxDienThoai = colIdx("Điện thoại");
  const idxEmail = colIdx("Email");
  const idxNgaySinh = colIdx("Ngày sinh");
  const idxNgayVaoLam = colIdx("Ngày bắt đầu làm việc");
  const idxTrangThai = colIdx("Trạng thái");

  let insertedUsers = 0;
  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    const rawMaNS = row[idxMaNS];
    const fullName = row[idxHoTen]?.toString().trim();
    if (!fullName) continue;

    const rawPhone = cleanPhone(row[idxDienThoai]);
    const rawEmail = row[idxEmail]?.toString().trim() || null;
    let deptName = row[idxPhongBan]?.toString().trim() || "";
    const position = row[idxTenViTri]?.toString().trim() || row[idxChucVu]?.toString().trim() || "Nhân viên";
    const dateOfBirth = parseExcelDate(row[idxNgaySinh]);
    const joinDate = parseExcelDate(row[idxNgayVaoLam]);
    const statusStr = row[idxTrangThai]?.toString().trim();

    const employeeCode = rawMaNS
      ? `SDG-${rawMaNS.toString().padStart(3, "0")}`
      : `SDG-${r.toString().padStart(3, "0")}`;


    // Import people only. Account creation and role assignment are separate operations.
    // Do not overwrite an existing profile using this old workbook.
    await prisma.employee.upsert({
      where: { companyId_employeeCode: { companyId: company.id, employeeCode } },
      update: {},
      create: {
        fullName, employeeCode, phone: rawPhone, email: rawEmail, position, dateOfBirth, joinDate,
        employmentStatus: statusStr === "Đang làm việc" ? "ACTIVE" : statusStr === "Nghỉ việc" ? "LEFT" : "UNKNOWN",
        companyId: company.id, departmentId: departmentMap[deptName] || null,
        externalSystem: "ONE_OFFICE", externalId: String(row[colIdx("ID Hồ sơ nhân sự")]),
        externalSnapshotAt: new Date("2026-10-14T00:00:00Z"),
      },
    });

    insertedUsers++;
  }

  console.log(`\n🎉 HOÀN THÀNH: Đã nạp thành công ${insertedUsers} cán bộ nhân viên vào hệ thống!`);
  console.log("Hồ sơ nhân sự không tự tạo tài khoản. Tạo tài khoản riêng tại /accounts.");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi trong quá trình Seed Data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
