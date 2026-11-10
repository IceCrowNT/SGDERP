import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { bootstrapHrFinal } from "./bootstrap-hr-final";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu quá trình nạp dữ liệu (Seed Data)...");

  // 1. Tạo Công ty Sao Đỏ Group mặc định
  const company = await prisma.cong_ty.upsert({
    where: { ma_so_thue: "0200765782" },
    update: {},
    create: {
      ten_cong_ty: "CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ SAO ĐỎ",
      ma_so_thue: "0200765782",
      dia_chi:
        "Số 768B Ngô Gia Tự, Phường Thành Tô, Quận Hải An, Thành phố Hải Phòng",
      dang_hoat_dong: true,
    },
  });
  console.log(`✅ Công ty: ${company.ten_cong_ty} (ID: ${company.id})`);

  // 2. Chỉ khởi tạo bộ vai trò tối thiểu; vai trò nghiệp vụ tùy chỉnh tại /roles.
  const roleDefs = [
    { code: "DEFAULT", name: "Nhân viên cơ bản", description: "Dashboard cá nhân, hồ sơ của tôi và đổi mật khẩu", isSystem: true },
    {
      code: "ADMIN",
      name: "Quản trị hệ thống",
      description: "Quản lý tài khoản, phân quyền, nhân sự và xem nhật ký; quyền mới được cấp riêng tại /roles",
      isSystem: true,
    },
    {
      code: "HR_MANAGER",
      name: "Quản lý hành chính nhân sự",
      description: "Quản lý hồ sơ nhân sự và cơ cấu phòng ban; không tự cấp quyền tài khoản hoặc quyền duyệt",
      isSystem: false,
    },
  ];

  // Never restore permissions that administrators changed in the UI.
  const bootstrapRoles =
    await prisma.vai_tro.count({ where: { company_id: company.id, ma_vai_tro: { not: "DEFAULT" } } }) === 0 &&
    await prisma.tai_khoan.count({ where: { company_id: company.id } }) === 0
    && await prisma.nhat_ky_hoat_dong.count({ where: { company_id: company.id, phan_he: "ROLE" } }) === 0;
  const roleMap: Record<string, number> = {};
  for (const r of roleDefs) {
    // Do not recreate a business role deliberately removed from an existing company.
    const existing = await prisma.vai_tro.findUnique({
      where: { company_id_ma_vai_tro: { company_id: company.id, ma_vai_tro: r.code } },
    });
    if (!existing && !bootstrapRoles && r.code !== "DEFAULT") continue;
    const role = await prisma.vai_tro.upsert({
      where: {
        company_id_ma_vai_tro: {
          company_id: company.id,
          ma_vai_tro: r.code,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        ma_vai_tro: r.code,
        ten_vai_tro: r.name,
        mo_ta: r.description,
        la_vai_tro_he_thong: r.isSystem,
      },
    });
    roleMap[r.code] = role.id;
  }
  console.log(
    `✅ Đã khởi tạo ${Object.keys(roleMap).length} Nhóm Vai Trò (Roles).`,
  );

  // 3. Tạo Danh mục Quyền cơ bản (Permissions)
  const permissionDefs = [
    { module: "ACCOUNTS", action: "MANAGE", name: "Quản lý tài khoản đăng nhập", scope: "ALL" },
    { module: "ROLES", action: "VIEW", name: "Xem vai trò và quyền hiệu lực", scope: "ALL" },
    { module: "ROLES", action: "MANAGE", name: "Quản lý vai trò và phân quyền", scope: "ALL" },
    { module: "AUDIT", action: "VIEW", name: "Xem nhật ký hoạt động", scope: "ALL" },
    { module: "HR", action: "VIEW", name: "Xem danh bạ nhân sự", scope: "ALL" },
    {
      module: "HR",
      action: "MANAGE",
      name: "Quản lý hồ sơ nhân sự & cơ cấu phòng ban",
      scope: "ALL",
    },
    // Workflow permissions exist in the catalog, but are not granted by default.
    ...[
      ["VIEW", "Xem hồ sơ quy trình liên quan"],
      ["CREATE", "Tạo và gửi hồ sơ quy trình"],
      ["APPROVE", "Duyệt bước được giao"],
      ["EXECUTE", "Thực hiện bước được giao"],
      ["MANAGE", "Quản lý mẫu và điều phối quy trình"],
    ].map(([action, name]) => ({ module: "WORKFLOW", action, name, scope: "ALL" })),
  ];

  const permMap: Record<string, number> = {};
  for (const p of permissionDefs) {
    const perm = await prisma.quyen.upsert({
      where: {
        phan_he_hanh_dong: {
          phan_he: p.module,
          hanh_dong: p.action,
        },
      },
      update: {},
      create: {
        phan_he: p.module,
        hanh_dong: p.action,
        ten_quyen: p.name,
        pham_vi: p.scope,
      },
    });
    permMap[`${p.module}:${p.action}`] = perm.id;
  }
  console.log(
    `✅ Đã khởi tạo ${Object.keys(permMap).length} Quyền Phân Hệ (Permissions).`,
  );

  // 4. Liên kết Quyền với Vai Trò (RolePermission)
  const rolePermMappings: Record<string, string[]> = {
    ADMIN: ["ACCOUNTS:MANAGE", "ROLES:MANAGE", "AUDIT:VIEW", "HR:MANAGE"],
    HR_MANAGER: ["HR:MANAGE"],
  };

  if (bootstrapRoles) for (const [rCode, pKeys] of Object.entries(rolePermMappings)) {
    const rId = roleMap[rCode];
    for (const pKey of pKeys) {
      const pId = permMap[pKey];
      if (rId && pId) {
        await prisma.vai_tro_quyen.upsert({
          where: {
            role_id_permission_id: {
              role_id: rId,
              permission_id: pId,
            },
          },
          update: {},
          create: {
            role_id: rId,
            permission_id: pId,
          },
        });
      }
    }
  }
  console.log(`✅ Đã gán ma trận quyền hạn cho các vai trò.`);

  // Only bootstrap organization data on a pristine company. Never recreate renamed/deleted units.
  const hasOrganizationData = await prisma.phong_ban.count({ where: { company_id: company.id } })
    || await prisma.nhan_su.count({ where: { company_id: company.id } })
    || await prisma.nhat_ky_hoat_dong.count({ where: { company_id: company.id, phan_he: "DEPARTMENT" } });
  if (!hasOrganizationData) {
  // 5. Khởi tạo Cơ cấu Tổ chức Phân cấp Cây (6 Phòng ban Cha + Lãnh đạo + Bộ phận Con)
  // 5.1 Các Đơn vị cấp Cha (Cấp 1 - Trực thuộc Tập đoàn)
  const parentDeptDefs = [
    {
      code: "BLD",
      name: "BAN LÃNH ĐẠO",
      description: "Hội đồng Quản trị & Ban Tổng Giám đốc Tập đoàn",
    },
    {
      code: "HCNS",
      name: "PHÒNG HÀNH CHÍNH NHÂN SỰ",
      description: "Quản trị hành chính, nhân sự, CNTT và hậu cần",
    },
    {
      code: "TCKT",
      name: "PHÒNG TÀI CHÍNH - KẾ TOÁN",
      description: "Quản trị tài chính, kế toán và ngân sách",
    },
    {
      code: "KD",
      name: "PHÒNG KINH DOANH",
      description: "Kinh doanh, xúc tiến đầu tư và chăm sóc khách hàng",
    },
    {
      code: "KHDT",
      name: "PHÒNG KẾ HOẠCH ĐẦU TƯ",
      description: "Kế hoạch tổng thể và quản lý đầu tư",
    },
    {
      code: "PTDA",
      name: "PHÒNG PHÁT TRIỂN DỰ ÁN",
      description: "Nghiên cứu, phát triển và chuẩn bị các dự án",
    },
    {
      code: "PC",
      name: "BAN PHÁP CHẾ",
      description: "Pháp chế doanh nghiệp và tư vấn pháp lý",
    },
    {
      code: "BKS",
      name: "BAN KIỂM SOÁT",
      description: "Kiểm soát tuân thủ và kiểm toán nội bộ",
    },
    {
      code: "QLDA_NDV1",
      name: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      description: "Ban Quản lý Dự án Khu công nghiệp Nam Đình Vũ 1",
    },
  ];

  const departmentMap: Record<string, number> = {};

  for (const pDept of parentDeptDefs) {
    const dept = await prisma.phong_ban.upsert({
      where: {
        company_id_ma_phong_ban: {
          company_id: company.id,
          ma_phong_ban: pDept.code,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        ma_phong_ban: pDept.code,
        ten_phong_ban: pDept.name,
        mo_ta: pDept.description,
        parent_id: null,
      },
    });
    departmentMap[pDept.name] = dept.id;
  }

  // 5.2 Khởi tạo các Bộ phận Con chuẩn 100% theo File Excel gốc:
  const childDeptDefs = [
    // 1. Các bộ phận con thuộc PHÒNG KINH DOANH (Khớp 100% Excel gốc):
    {
      parentName: "PHÒNG KINH DOANH",
      code: "KD_SM",
      name: "Bộ phận Sales Marketing - Phòng Kinh doanh",
      description: "Tiếp thị, quảng bá và bán hàng",
    },
    {
      parentName: "PHÒNG KINH DOANH",
      code: "KD_CSKH",
      name: "Bộ phận CSKH - Phòng Kinh Doanh",
      description: "Dịch vụ và chăm sóc khách hàng",
    },

    // 2. Các bộ phận con thuộc Khối độc lập BAN QLDA KCN NAM ĐÌNH VŨ 1 (Khớp 100% Excel gốc):
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_BGDKCN",
      name: "Ban giám đốc KCN NAM ĐÌNH VŨ 1",
      description: "Ban điều hành KCN Nam Đình Vũ 1",
    },
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_VP",
      name: "Bộ phận văn phòng - Ban QLDA",
      description: "Hành chính văn phòng ban QLDA",
    },
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_KT",
      name: "Bộ phận kỹ thuật - Ban QLDA",
      description: "Kỹ thuật và hạ tầng công trình",
    },
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_CQ",
      name: "Bộ phận cảnh quan môi trường - Ban QLDA",
      description: "Cảnh quan và môi trường KCN",
    },
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_GN",
      name: "Bộ phận giao nhận - Ban QLDA",
      description: "Giao nhận vật tư và điều phối kho bãi",
    },
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_DN",
      name: "Bộ phận điện nước - Ban QLDA",
      description: "Vận hành hệ thống điện nước KCN",
    },
    {
      parentName: "BAN QLDA KCN NAM ĐÌNH VŨ 1",
      code: "QLDA_PCCC",
      name: "Bộ phận PCCC - Ban QLDA",
      description: "Phòng cháy chữa cháy và an toàn lao động",
    },
  ];

  for (const cDept of childDeptDefs) {
    const parentId = departmentMap[cDept.parentName];
    const dept = await prisma.phong_ban.upsert({
      where: {
        company_id_ma_phong_ban: {
          company_id: company.id,
          ma_phong_ban: cDept.code,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        ma_phong_ban: cDept.code,
        ten_phong_ban: cDept.name,
        mo_ta: cDept.description,
        parent_id: parentId,
      },
    });
    departmentMap[cDept.name] = dept.id;
  }

  console.log(
    `✅ Đã khởi tạo ${Object.keys(departmentMap).length} Đơn vị / Phòng ban theo mô hình Cây phân cấp.`,
  );

  } else {
    console.log("Giữ nguyên cơ cấu phòng ban đang được quản lý độc lập trong ERP.");
  }

  // 6. Mật khẩu mặc định băm sẵn (đơn giản hoá 123456 cho nội bộ)
  const defaultPassword = await bcrypt.hash("123456", 10);

  // 6.1 Tạo tài khoản Quản trị viên tối cao (Master Admin)
  const existingAdmin = await prisma.tai_khoan.findUnique({ where: { ten_dang_nhap: "admin" } });
  const adminUser = await prisma.tai_khoan.upsert({
    where: { ten_dang_nhap: "admin" },
    update: {}, // Never reset credentials or change the existing account owner on reseed.
    create: {
      ten_dang_nhap: "admin",
      mat_khau_bam: defaultPassword,
      ten_hien_thi: "Quản Trị Viên Hệ Thống",
      cho_phep_dang_nhap: true,
      company_id: company.id,
    },
  });

  const adminRoleId = roleMap["ADMIN"];
  if (adminRoleId && !existingAdmin && bootstrapRoles) {
    await prisma.tai_khoan_vai_tro.upsert({
      where: {
        account_id_role_id: {
          account_id: adminUser.id,
          role_id: adminRoleId,
        },
      },
      update: { la_vai_tro_chinh: true },
      create: {
        account_id: adminUser.id,
        role_id: adminRoleId,
        la_vai_tro_chinh: true,
      },
    });
  }
  console.log(
    "✅ Tài khoản quản trị sẵn sàng; không thay đổi mật khẩu tài khoản đã có.",
  );

  // HR is initialized only once; subsequent seeds preserve all manual changes.
  const result = await bootstrapHrFinal(prisma, company.id);
  console.log(
    result.skipped
      ? "Đã có dữ liệu HR: giữ nguyên, không đồng bộ lại từ nguồn."
      : `Đã khởi tạo ${result.created} người từ HR final, không tạo tài khoản hàng loạt.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Lỗi trong quá trình Seed Data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
