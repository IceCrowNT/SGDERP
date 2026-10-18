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

function makeDeptCode(name: string): string {
  const norm = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return norm.slice(0, 30) || "DEPT";
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
  console.log(`✅ Công ty: ${company.name} (${company.id})`);

  // 2. Tạo các Nhóm vai trò chuẩn (Roles)
  const roleDefs = [
    {
      code: "ADMIN",
      name: "Ban Giám Đốc / Quản Trị Hệ Thống",
      description: "Toàn quyền quản trị và điều hành toàn bộ các phân hệ trong hệ thống",
      isSystem: true,
    },
    {
      code: "DEPT_HEAD",
      name: "Trưởng Phòng / Bộ Phận / Ban QLDA",
      description: "Quản lý và điều phối công việc, nhân sự nội bộ đơn vị phụ trách",
      isSystem: true,
    },
    {
      code: "HR",
      name: "Chuyên Viên Hành Chính Nhân Sự",
      description: "Quản lý hồ sơ nhân sự, hợp đồng, danh mục phòng ban và tuyển dụng",
      isSystem: true,
    },
    {
      code: "ACCOUNTANT",
      name: "Kế Toán Viên / Kế Toán Trưởng",
      description: "Quản lý tài chính, kế toán và theo dõi thanh toán",
      isSystem: true,
    },
    {
      code: "STAFF",
      name: "Cán Bộ Nhân Viên",
      description: "Xem thông tin cá nhân, tiếp nhận và báo cáo tiến độ công việc được giao",
      isSystem: true,
    },
  ];

  const roleMap: Record<string, string> = {};
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
    { module: "HR", action: "MANAGE", name: "Quản lý hồ sơ nhân sự", scope: "ALL" },
    { module: "TASK", action: "VIEW", name: "Xem danh sách công việc", scope: "ALL" },
    { module: "TASK", action: "CREATE", name: "Tạo công việc mới", scope: "ALL" },
    { module: "TASK", action: "ASSIGN", name: "Giao việc cho nhân sự", scope: "DEPARTMENT" },
    { module: "TASK", action: "APPROVE", name: "Nghiệm thu / Phê duyệt công việc", scope: "DEPARTMENT" },
    { module: "SYSTEM", action: "MANAGE", name: "Cấu hình hệ thống & phân quyền", scope: "ALL" },
  ];

  const permMap: Record<string, string> = {};
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
    DEPT_HEAD: ["HR:VIEW", "TASK:VIEW", "TASK:CREATE", "TASK:ASSIGN", "TASK:APPROVE"],
    HR: ["HR:VIEW", "HR:MANAGE", "TASK:VIEW", "TASK:CREATE"],
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

  // 5. Đọc tệp Excel và Nạp Phòng ban & Nhân sự thực tế
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
  const idxTaiKhoan = colIdx("Tài khoản 1Office");
  const idxPhongBan = colIdx("Phòng ban");
  const idxChucVu = colIdx("Chức vụ");
  const idxTenViTri = colIdx("Tên vị trí");
  const idxDienThoai = colIdx("Điện thoại");
  const idxEmail = colIdx("Email");
  const idxNgaySinh = colIdx("Ngày sinh");
  const idxNgayVaoLam = colIdx("Ngày bắt đầu làm việc");
  const idxTrangThai = colIdx("Trạng thái");

  // 5.1 Tạo danh sách Phòng ban trước
  const departmentMap: Record<string, string> = {};
  const deptsSet = new Set<string>();

  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    const deptName = row[idxPhongBan];
    if (deptName && deptName.toString().trim()) {
      deptsSet.add(deptName.toString().trim());
    }
  }

  for (const deptName of deptsSet) {
    const deptCode = makeDeptCode(deptName);
    const dept = await prisma.department.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: deptCode,
        },
      },
      update: { name: deptName },
      create: {
        companyId: company.id,
        code: deptCode,
        name: deptName,
      },
    });
    departmentMap[deptName] = dept.id;
  }
  console.log(`✅ Đã đồng bộ ${Object.keys(departmentMap).length} Phòng ban / Ban QLDA thực tế.`);

  // 5.2 Mật khẩu mặc định băm sẵn (đơn giản hoá 123456 cho nội bộ)
  const defaultPassword = await bcrypt.hash("123456", 10);

  // 5.2.1 Tạo tài khoản Quản trị viên tối cao (Master Admin full quyền)
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      password: defaultPassword,
      fullName: "Quản Trị Viên Hệ Thống",
      employeeCode: "SDG-ADMIN",
      position: "Quản trị hệ thống",
      isActive: true,
      companyId: company.id,
    },
    create: {
      username: "admin",
      password: defaultPassword,
      fullName: "Quản Trị Viên Hệ Thống",
      employeeCode: "SDG-ADMIN",
      position: "Quản trị hệ thống",
      email: "admin@saodogroup.com",
      phone: "0900000000",
      isActive: true,
      companyId: company.id,
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
  console.log(`✅ Đã đồng bộ tài khoản Master Admin (username: admin / Sdg@123456).`);

  // 5.3 Nạp từng Nhân sự
  let insertedUsers = 0;
  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    const rawMaNS = row[idxMaNS];
    const fullName = row[idxHoTen]?.toString().trim();
    if (!fullName) continue;

    const rawUsername = row[idxTaiKhoan]?.toString().trim();
    const rawPhone = cleanPhone(row[idxDienThoai]);
    const rawEmail = row[idxEmail]?.toString().trim() || null;
    const deptName = row[idxPhongBan]?.toString().trim();
    const position = row[idxTenViTri]?.toString().trim() || row[idxChucVu]?.toString().trim() || "Nhân viên";
    const dateOfBirth = parseExcelDate(row[idxNgaySinh]);
    const joinDate = parseExcelDate(row[idxNgayVaoLam]);
    const statusStr = row[idxTrangThai]?.toString().trim();
    const isActive = statusStr !== "Nghỉ việc";

    // Format employee code: SDG-001, SDG-010...
    const employeeCode = rawMaNS
      ? `SDG-${rawMaNS.toString().padStart(3, "0")}`
      : `SDG-${r.toString().padStart(3, "0")}`;

    // Username: Ưu tiên tài khoản 1Office, nếu không có thì lấy mã nhân viên
    const username = rawUsername ? rawUsername.toLowerCase() : `sdg_${rawMaNS || r}`;

    // Xác định vai trò ban đầu dựa trên chức danh & phòng ban
    let assignedRoleCode = "STAFF";
    const posLower = position.toLowerCase();
    const deptLower = (deptName || "").toLowerCase();

    if (
      posLower.includes("tổng giám đốc") ||
      posLower.includes("chủ tịch") ||
      deptLower.includes("ban lãnh đạo")
    ) {
      assignedRoleCode = "ADMIN";
    } else if (
      posLower.includes("trưởng phòng") ||
      posLower.includes("phó phòng") ||
      posLower.includes("trưởng bộ phận") ||
      posLower.includes("phó bộ phận") ||
      posLower.includes("giám đốc ban") ||
      posLower.includes("phó giám đốc ban") ||
      posLower.includes("phó ban")
    ) {
      assignedRoleCode = "DEPT_HEAD";
    } else if (deptLower.includes("hành chính nhân sự") || deptLower.includes("hcns")) {
      assignedRoleCode = "HR";
    } else if (deptLower.includes("tài chính - kế toán") || deptLower.includes("kế toán")) {
      assignedRoleCode = "ACCOUNTANT";
    }

    const deptId = deptName ? departmentMap[deptName] : null;

    // Upsert User
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        password: defaultPassword,
        fullName,
        employeeCode,
        phone: rawPhone,
        email: rawEmail,
        position,
        dateOfBirth,
        joinDate,
        isActive,
        departmentId: deptId,
      },
      create: {
        username,
        password: defaultPassword,
        fullName,
        employeeCode,
        phone: rawPhone,
        email: rawEmail,
        position,
        dateOfBirth,
        joinDate,
        isActive,
        companyId: company.id,
        departmentId: deptId,
      },
    });

    // Gán Role vào UserRole
    const targetRoleId = roleMap[assignedRoleCode] || roleMap["STAFF"];
    if (targetRoleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: targetRoleId,
          },
        },
        update: { isPrimary: true },
        create: {
          userId: user.id,
          roleId: targetRoleId,
          isPrimary: true,
        },
      });
    }

    insertedUsers++;
  }

  console.log(`\n🎉 HOÀN THÀNH: Đã nạp thành công ${insertedUsers} cán bộ nhân viên vào hệ thống!`);
  console.log(`🔑 Mật khẩu mặc định cho tất cả tài khoản: 123456`);
}

main()
  .catch((e) => {
    console.error("❌ Lỗi trong quá trình Seed Data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
