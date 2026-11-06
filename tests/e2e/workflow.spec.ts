import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
const run = randomUUID().slice(0, 8);
test.describe.configure({ mode: "serial" });
type Account = Awaited<ReturnType<typeof db.tai_khoan.create>>;
let company: number,
  foreignCompany: number,
  department: number,
  otherDepartment: number,
  manager: Account,
  requester: Account,
  head: Account,
  it: Account,
  outsider: Account,
  sibling: Account,
  foreign: Account;
let templateId: number,
  actReq: Request,
  draftReq: Request,
  templateReq: Request,
  changeReq: Request;
const isAction = (r: Request) =>
  r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, req: Request, input: unknown) {
  return (
    await page.request.post(new URL(req.url()).pathname, {
      headers: {
        "Next-Action": req.headers()["next-action"],
        "Content-Type": req.headers()["content-type"],
      },
      data: JSON.stringify([input]),
    })
  ).text();
}
async function role(code: string, actions: string[], tenant = company) {
  const perms = await db.quyen.findMany({
    where: {
      OR: [
        ...actions.map((hanh_dong) => ({ phan_he: "WORKFLOW", hanh_dong })),
        ...(code === "MANAGER"
          ? [
              { phan_he: "ROLES", hanh_dong: "MANAGE" },
              { phan_he: "ACCOUNTS", hanh_dong: "MANAGE" },
            ]
          : []),
      ],
    },
  });
  return db.vai_tro.create({
    data: {
      company_id: tenant,
      ma_vai_tro: code,
      ten_vai_tro: code,
      danh_sach_quyen: {
        create: perms.map((p) => ({ permission_id: p.id })),
      },
    },
  });
}
async function account(
  name: string,
  actions: string[],
  personId?: number,
  tenant = company,
) {
  const r = await role(name, actions, tenant);
  return db.tai_khoan.create({
    data: {
      company_id: tenant,
      employee_id: personId,
      ten_dang_nhap: `wf-${run}-${name}`,
      ten_hien_thi: name,
      mat_khau_bam: "test-disabled",
      danh_sach_vai_tro: { create: { role_id: r.id } },
    },
  });
}
async function person(
  name: string,
  tenant = company,
  dept: number | null = department,
) {
  return db.nhan_su.create({
    data: {
      company_id: tenant,
      department_id: dept,
      ho_ten: name,
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
}
async function as(page: Page, a: Account) {
  await signAccount(page.context(), a);
}
async function command(
  page: Page,
  id: number,
  cmd: string,
  extra: Record<string, unknown> = {},
) {
  const r = await db.ho_so_quy_trinh.findUniqueOrThrow({
    where: { id: id },
    include: { danh_sach_buoc: true },
  });
  const step = r.danh_sach_buoc.find((b) =>
    ["PENDING", "BLOCKED"].includes(b.trang_thai),
  );
  return replay(page, actReq, {
    id,
    version: r.updated_at.toISOString(),
    command: cmd,
    stepId: step?.id,
    reason: "Kiểm thử quy trình",
    ...extra,
  });
}
async function draft(page: Page, title: string, tid = templateId) {
  await as(page, requester);
  expect(
    await replay(page, draftReq, {
      templateId: tid,
      title,
      content: "Nội dung thử nghiệm",
    }),
  ).toContain('"success":true');
  return db.ho_so_quy_trinh.findFirstOrThrow({
    where: { company_id: company, tieu_de: title },
  });
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: false }).click();
}
test.beforeAll(async () => {
  company = (
    await db.cong_ty.create({ data: { ten_cong_ty: `WORKFLOW TEST ${run}` } })
  ).id;
  foreignCompany = (
    await db.cong_ty.create({
      data: { ten_cong_ty: `WORKFLOW FOREIGN ${run}` },
    })
  ).id;
  department = (
    await db.phong_ban.create({
      data: {
        company_id: company,
        ma_phong_ban: "TEST",
        ten_phong_ban: "Phòng thử nghiệm",
      },
    })
  ).id;
  otherDepartment = (
    await db.phong_ban.create({
      data: {
        company_id: company,
        ma_phong_ban: "OTHER",
        ten_phong_ban: "Phòng mới",
      },
    })
  ).id;
  manager = await account("MANAGER", ["MANAGE"]);
  requester = await account(
    "REQUESTER",
    ["VIEW", "CREATE"],
    (await person("Người gửi thử nghiệm")).id,
  );
  head = await account(
    "HEAD",
    ["VIEW", "APPROVE"],
    (await person("Trưởng phòng thử nghiệm")).id,
  );
  it = await account(
    "IT",
    ["VIEW", "EXECUTE"],
    (await person("IT thử nghiệm")).id,
  );
  outsider = await account(
    "OUTSIDER",
    ["VIEW", "APPROVE"],
    (await person("Người duyệt khác")).id,
  );
  sibling = await account(
    "SECOND_ACCOUNT",
    ["VIEW", "CREATE", "APPROVE"],
    requester.employee_id!,
  );
  foreign = await account(
    "FOREIGN",
    ["VIEW", "MANAGE"],
    undefined,
    foreignCompany,
  );
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: head.employee_id },
  });
});
test.afterAll(async () => {
  // Only isolated fixture tenants; local transaction disables immutable-history triggers for cleanup.
  if (company)
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SET LOCAL session_replication_role = replica",
      );
      await tx.lich_su_quy_trinh.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.buoc_xu_ly_quy_trinh.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.ho_so_quy_trinh.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.buoc_mau_quy_trinh.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.mau_quy_trinh.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.nhat_ky_hoat_dong.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      const accs = await tx.tai_khoan.findMany({
        where: { company_id: { in: [company, foreignCompany] } },
        select: { id: true },
      });
      const roles = await tx.vai_tro.findMany({
        where: { company_id: { in: [company, foreignCompany] } },
        select: { id: true },
      });
      await tx.tai_khoan_vai_tro.deleteMany({
        where: { account_id: { in: accs.map((a) => a.id) } },
      });
      await tx.vai_tro_quyen.deleteMany({
        where: { role_id: { in: roles.map((a) => a.id) } },
      });
      await tx.tai_khoan.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.nhan_su.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.phong_ban.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.vai_tro.deleteMany({
        where: { company_id: { in: [company, foreignCompany] } },
      });
      await tx.cong_ty.deleteMany({
        where: { id: { in: [company, foreignCompany] } },
      });
    });
  await db.$disconnect();
});
test("tạo mẫu qua UI, phát hành, gửi → head duyệt → IT hoàn tất", async ({
  page,
}) => {
  test.setTimeout(120000);
  await as(page, manager);
  await page.goto("/workflows");
  await page.getByRole("button", { name: "Tạo mẫu", exact: true }).click();
  await page.getByRole("button", { name: "Lưu mẫu nháp", exact: true }).click();
  await expect(page.getByText("Nhập mã mẫu", { exact: true })).toBeVisible();
  await page.getByLabel("Mã mẫu", { exact: true }).fill("IT_SUPPORT");
  await page
    .getByLabel("Tên mẫu", { exact: true })
    .fill("Hỗ trợ IT thử nghiệm");
  await page.getByRole("button", { name: "Thêm bước", exact: true }).click();
  await page.getByLabel("Tên bước 2", { exact: true }).fill("IT xử lý");
  await choose(page, "Người xử lý bước 2", "IT thử nghiệm");
  let sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Lưu mẫu nháp", exact: true }).click();
  templateReq = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Mẫu quy trình", exact: true }).click();
  await page.getByRole("button", { name: "Phát hành", exact: true }).click();
  sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  changeReq = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  templateId = (
    await db.mau_quy_trinh.findFirstOrThrow({
      where: { company_id: company, ma: "IT_SUPPORT" },
    })
  ).id;
  await as(page, requester);
  await page.goto("/workflows");
  await page.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
  await page
    .getByLabel("Tiêu đề yêu cầu", { exact: true })
    .fill("Máy tính không khởi động");
  await page
    .getByLabel("Nội dung yêu cầu", { exact: true })
    .fill("Kiểm tra máy tính bàn ở phòng thử nghiệm.");
  sent = page.waitForRequest(isAction);
  await page
    .getByRole("button", { name: "Lưu hồ sơ nháp", exact: true })
    .click();
  draftReq = await sent;
  await expect(page).toHaveURL(/\/workflows\/\d+/);
  const id = Number(page.url().split("/").pop());
  await page.getByRole("button", { name: "Gửi hồ sơ", exact: true }).click();
  sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  actReq = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Đang xử lý", { exact: true })).toBeVisible();
  await as(page, head);
  await page.goto(`/workflows/${id}`);
  await page.getByRole("button", { name: "Duyệt", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await as(page, it);
  await page.goto(`/workflows/${id}`);
  await page
    .getByRole("button", { name: "Hoàn tất công việc", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await db.ho_so_quy_trinh.findUniqueOrThrow({ where: { id: id } }))
      .trang_thai,
  ).toBe("COMPLETED");
  await expect(
    page.getByText("Hoàn tất quy trình", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "outputs/workflow/desktop-detail.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "outputs/workflow/mobile-detail.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("server chặn khác công ty, sai người, MANAGE duyệt thay, payload thừa và hai lần gửi/duyệt", async ({
  page,
  browser,
}) => {
  const r = await draft(page, "Kiểm tra quyền");
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await as(page, outsider);
  await page.goto(`/workflows/${r.id}`);
  await expect(
    page.getByText("Không tìm thấy hồ sơ hoặc không có quyền xem."),
  ).toBeVisible();
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":false',
  );
  await as(page, foreign);
  expect(await command(page, r.id, "CANCEL")).toContain(
    '"success":false',
  );
  await as(page, manager);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":false',
  );
  await as(page, head);
  expect(
    await command(page, r.id, "APPROVE", { companyId: company }),
  ).toContain('"success":false');
  const before = await db.ho_so_quy_trinh.findUniqueOrThrow({
    where: { id: r.id },
    include: { danh_sach_buoc: true },
  });
  const payload = {
    id: r.id,
    version: before.updated_at.toISOString(),
    stepId: before.danh_sach_buoc.find((b) => b.trang_thai === "PENDING")!
      .id,
    command: "APPROVE",
    reason: "",
  };
  const other = await browser.newPage();
  await as(other, head);
  const results = await Promise.all([
    replay(page, actReq, payload),
    replay(other, actReq, payload),
  ]);
  expect(results.filter((r) => r.includes('"success":true'))).toHaveLength(1);
  await other.close();
  expect(
    await db.lich_su_quy_trinh.count({
      where: { ho_so_quy_trinh_id: r.id, hanh_dong: "APPROVED" },
    }),
  ).toBe(1);
});
test("không tự duyệt qua tài khoản thứ hai; thiếu head chặn gửi", async ({
  page,
}) => {
  const r = await draft(page, "Tự duyệt");
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: requester.employee_id },
  });
  await as(page, sibling);
  expect(await command(page, r.id, "SUBMIT")).toContain(
    "không được tự duyệt",
  );
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: null },
  });
  expect(await command(page, r.id, "SUBMIT")).toContain(
    "Chưa chọn người xử lý",
  );
  expect(
    await db.buoc_xu_ly_quy_trinh.count({
      where: { ho_so_quy_trinh_id: r.id },
    }),
  ).toBe(0);
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: head.employee_id },
  });
});
test("đổi head không đổi người đang duyệt; chốt phòng, mất quyền thì chuyển giao có lịch sử", async ({
  page,
}) => {
  const r = await draft(page, "Bàn giao bước");
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: outsider.employee_id },
  });
  await db.nhan_su.update({
    where: { id: requester.employee_id! },
    data: { department_id: otherDepartment },
  });
  expect(
    (
      await db.buoc_xu_ly_quy_trinh.findFirstOrThrow({
        where: { ho_so_quy_trinh_id: r.id, trang_thai: "PENDING" },
      })
    ).nguoi_duoc_giao_id,
  ).toBe(head.employee_id);
  await db.tai_khoan.update({
    where: { id: it.id },
    data: { cho_phep_dang_nhap: false },
  });
  await as(page, head);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":true',
  );
  expect(
    (
      await db.buoc_xu_ly_quy_trinh.findFirstOrThrow({
        where: { ho_so_quy_trinh_id: r.id, trang_thai: "BLOCKED" },
      })
    ).ly_do_tam_dung,
  ).toContain("đủ quyền");
  expect(
    (
      await db.ho_so_quy_trinh.findUniqueOrThrow({
        where: { id: r.id },
      })
    ).phong_nguoi_gui_id,
  ).toBe(department);
  await db.tai_khoan.update({
    where: { id: it.id },
    data: { cho_phep_dang_nhap: true },
  });
  await as(page, manager);
  expect(
    await command(page, r.id, "REASSIGN", {
      employeeId: it.employee_id,
      reason: "",
    }),
  ).toContain('"success":false');
  expect(
    await command(page, r.id, "REASSIGN", {
      employeeId: it.employee_id,
    }),
  ).toContain('"success":true');
  await as(page, it);
  expect(await command(page, r.id, "COMPLETE")).toContain(
    '"success":true',
  );
  expect(
    await db.lich_su_quy_trinh.count({
      where: { ho_so_quy_trinh_id: r.id, hanh_dong: "REASSIGNED" },
    }),
  ).toBe(1);
  await db.nhan_su.update({
    where: { id: requester.employee_id! },
    data: { department_id: department },
  });
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: head.employee_id },
  });
});
test("thu hồi quyền đang mở áp dụng ngay; không cộng quyền giữa hai tài khoản của một người", async ({
  page,
}) => {
  const r = await draft(page, "Thu hồi quyền");
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await as(page, head);
  await page.goto(`/workflows/${r.id}`);
  const headRole = (
    await db.tai_khoan_vai_tro.findFirstOrThrow({
      where: { account_id: head.id },
    })
  ).role_id;
  const approval = await db.quyen.findUniqueOrThrow({
    where: { phan_he_hanh_dong: { phan_he: "WORKFLOW", hanh_dong: "APPROVE" } },
  });
  await db.vai_tro_quyen.delete({
    where: {
      role_id_permission_id: {
        role_id: headRole,
        permission_id: approval.id,
      },
    },
  });
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":false',
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Duyệt", exact: true }),
  ).toHaveCount(0);
  const split = await account("SPLIT", ["APPROVE"], head.employee_id!);
  await as(page, split);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":false',
  );
  await db.vai_tro_quyen.create({
    data: { role_id: headRole, permission_id: approval.id },
  });
  await db.nhan_su.update({
    where: { id: head.employee_id! },
    data: { tinh_trang_lam_viec: "LEFT" },
  });
  await as(page, head);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":false',
  );
  await db.nhan_su.update({
    where: { id: head.employee_id! },
    data: { tinh_trang_lam_viec: "ACTIVE" },
  });
  await as(page, manager);
  expect(
    await command(page, r.id, "REASSIGN", {
      employeeId: outsider.employee_id,
    }),
  ).toContain('"success":true');
  await as(page, head);
  await page.goto(`/workflows/${r.id}`);
  await expect(
    page.getByText("Không tìm thấy hồ sơ hoặc không có quyền xem."),
  ).toBeVisible();
  await as(page, outsider);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":true',
  );
});
test("từ chối cần lý do, lập hồ sơ mới, hủy không sửa lịch sử cũ", async ({
  page,
}) => {
  const r = await draft(page, "Từ chối thử");
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await as(page, head);
  expect(await command(page, r.id, "REJECT", { reason: "" })).toContain(
    '"success":false',
  );
  expect(
    await command(page, r.id, "REJECT", {
      reason: "Cần mô tả rõ thiết bị",
    }),
  ).toContain('"success":true');
  expect(
    (
      await db.ho_so_quy_trinh.findUniqueOrThrow({
        where: { id: r.id },
      })
    ).trang_thai,
  ).toBe("REJECTED");
  expect(
    await db.buoc_xu_ly_quy_trinh.count({
      where: { ho_so_quy_trinh_id: r.id, trang_thai: "CANCELLED" },
    }),
  ).toBe(1);
  await as(page, requester);
  expect(
    await replay(page, draftReq, {
      templateId,
      title: "Lập lại thử",
      content: "Đã bổ sung",
      previousId: r.id,
    }),
  ).toContain('"success":true');
  const copy = await db.ho_so_quy_trinh.findFirstOrThrow({
    where: { company_id: company, tieu_de: "Lập lại thử" },
  });
  expect(copy.ho_so_truoc_id).toBe(r.id);
  expect(await command(page, copy.id, "SUBMIT")).toContain(
    '"success":true',
  );
  expect(await command(page, copy.id, "CANCEL")).toContain(
    '"success":false',
  );
  await as(page, manager);
  expect(await command(page, copy.id, "CANCEL")).toContain(
    '"success":true',
  );
  expect(
    await db.buoc_xu_ly_quy_trinh.count({
      where: {
        ho_so_quy_trinh_id: copy.id,
        trang_thai: { in: ["WAITING", "PENDING", "BLOCKED"] },
      },
    }),
  ).toBe(0);
  await expect(
    db.lich_su_quy_trinh.updateMany({
      where: { ho_so_quy_trinh_id: r.id },
      data: { y_kien: "rewrite" },
    }),
  ).rejects.toThrow();
});
test("lỗi ghi lịch sử rollback toàn bộ quyết định", async ({ page }) => {
  const r = await draft(page, "Rollback lịch sử");
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await as(page, head);
  const fn = `wf_test_failure_${run}`;
  await db.$executeRawUnsafe(
    `CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id=${company} AND NEW.hanh_dong='APPROVED' THEN RAISE EXCEPTION 'Test history failure'; END IF; RETURN NEW; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER ${fn} BEFORE INSERT ON lich_su_quy_trinh FOR EACH ROW EXECUTE FUNCTION ${fn}()`,
  );
  try {
    expect(await command(page, r.id, "APPROVE")).toContain(
      '"success":false',
    );
    expect(
      (
        await db.buoc_xu_ly_quy_trinh.findFirstOrThrow({
          where: { ho_so_quy_trinh_id: r.id, trang_thai: "PENDING" },
        })
      ).nguoi_duoc_giao_id,
    ).toBe(head.employee_id);
    expect(
      await db.lich_su_quy_trinh.count({
        where: { ho_so_quy_trinh_id: r.id, hanh_dong: "APPROVED" },
      }),
    ).toBe(0);
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER ${fn} ON lich_su_quy_trinh`);
    await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`);
  }
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":true',
  );
});
test("mẫu phát hành bất biến, phiên bản mới không đổi hồ sơ đang chạy, FK ngăn ghép mẫu/công ty", async ({
  page,
}) => {
  const r = await draft(page, "Giữ phiên bản cũ");
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await as(page, manager);
  let t = await db.mau_quy_trinh.findUniqueOrThrow({
    where: { id: templateId },
  });
  expect(
    await replay(page, templateReq, {
      id: t.id,
      version: t.updated_at.toISOString(),
      code: t.ma,
      name: "Sửa bản đã phát hành",
      description: "",
      steps: [
        {
          name: "x",
          instructions: "",
          kind: "TASK",
          assignment: "SPECIFIC_EMPLOYEE",
          employeeId: it.employee_id,
        },
      ],
    }),
  ).toContain('"success":false');
  await expect(
    db.mau_quy_trinh.update({
      where: { id: templateId },
      data: { ten: "Sửa bằng SQL" },
    }),
  ).rejects.toThrow();
  expect(
    await replay(page, changeReq, {
      id: t.id,
      version: t.updated_at.toISOString(),
      command: "COPY",
    }),
  ).toContain('"success":true');
  const copied = await db.mau_quy_trinh.findFirstOrThrow({
    where: { ma: t.ma, company_id: company, phien_ban: 2 },
    include: { danh_sach_buoc: true },
  });
  expect(
    await replay(page, changeReq, {
      id: copied.id,
      version: copied.updated_at.toISOString(),
      command: "PUBLISH",
    }),
  ).toContain('"success":true');
  t = await db.mau_quy_trinh.findUniqueOrThrow({
    where: { id: templateId },
  });
  expect(t.trang_thai).toBe("RETIRED");
  expect(
    (
      await db.ho_so_quy_trinh.findUniqueOrThrow({
        where: { id: r.id },
      })
    ).mau_quy_trinh_id,
  ).toBe(templateId);
  const active = await db.buoc_xu_ly_quy_trinh.findFirstOrThrow({
    where: { ho_so_quy_trinh_id: r.id, trang_thai: "PENDING" },
  });
  await expect(
    db.buoc_xu_ly_quy_trinh.update({
      where: { id: active.id },
      data: { buoc_mau_quy_trinh_id: copied.danh_sach_buoc[0].id },
    }),
  ).rejects.toThrow();
  await expect(
    db.ho_so_quy_trinh.create({
      data: {
        company_id: foreignCompany,
        mau_quy_trinh_id: templateId,
        tieu_de: "foreign",
        noi_dung: "x",
        nguoi_gui_id: requester.employee_id!,
        phong_nguoi_gui_id: department,
        tai_khoan_tao_id: foreign.id,
      },
    }),
  ).rejects.toThrow();
  await as(page, head);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":true',
  );
});
test("ma trận vai trò lưu riêng quyền workflow và giữ quyền quản trị hiện có", async ({
  page,
}) => {
  await as(page, manager);
  await page.goto("/roles");
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  await page
    .getByLabel("Mã vai trò", { exact: true })
    .fill("WORKFLOW_REVIEWER");
  await page
    .getByLabel("Tên vai trò", { exact: true })
    .fill("Duyệt quy trình thử nghiệm");
  await page.getByLabel("Xem hồ sơ liên quan", { exact: true }).check();
  await page.getByLabel("Duyệt bước được giao", { exact: true }).check();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const r = await db.vai_tro.findFirstOrThrow({
    where: { company_id: company, ma_vai_tro: "WORKFLOW_REVIEWER" },
    include: { danh_sach_quyen: { include: { quyen: true } } },
  });
  expect(r.danh_sach_quyen.map((p) => p.quyen.hanh_dong).sort()).toEqual([
    "APPROVE",
    "VIEW",
  ]);
  await expect(
    page.getByText("Quy trình: Duyệt bước được giao", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sửa vai trò MANAGER", exact: true })
    .click();
  await page.getByLabel("Tạo và gửi hồ sơ", { exact: true }).check();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const mgr = await db.vai_tro.findFirstOrThrow({
    where: { company_id: company, ma_vai_tro: "MANAGER" },
    include: { danh_sach_quyen: { include: { quyen: true } } },
  });
  expect(
    mgr.danh_sach_quyen
      .map((p) => `${p.quyen.phan_he}:${p.quyen.hanh_dong}`)
      .sort(),
  ).toEqual([
    "ACCOUNTS:MANAGE",
    "ROLES:MANAGE",
    "WORKFLOW:CREATE",
    "WORKFLOW:MANAGE",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Sửa vai trò MANAGER", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "outputs/workflow/mobile-permissions.png",
    fullPage: true,
  });
});
test("head mới chỉ áp dụng bước chưa kích hoạt và vẫn theo phòng lúc gửi", async ({
  page,
}) => {
  await as(page, manager);
  expect(
    await replay(page, templateReq, {
      code: "HEAD_LATER",
      name: "Head ở bước sau",
      description: "",
      steps: [
        {
          name: "Duyệt đầu",
          instructions: "",
          kind: "APPROVAL",
          assignment: "SPECIFIC_EMPLOYEE",
          employeeId: head.employee_id,
        },
        {
          name: "Duyệt phòng",
          instructions: "",
          kind: "APPROVAL",
          assignment: "REQUESTER_DEPARTMENT_HEAD",
          employeeId: null,
        },
      ],
    }),
  ).toContain('"success":true');
  const t = await db.mau_quy_trinh.findFirstOrThrow({
    where: { company_id: company, ma: "HEAD_LATER" },
  });
  expect(
    await replay(page, changeReq, {
      id: t.id,
      version: t.updated_at.toISOString(),
      command: "PUBLISH",
    }),
  ).toContain('"success":true');
  const r = await draft(page, "Đổi head ở bước sau", t.id);
  expect(await command(page, r.id, "SUBMIT")).toContain(
    '"success":true',
  );
  await db.phong_ban.update({
    where: { id: department },
    data: { nguoi_phu_trach_id: outsider.employee_id },
  });
  await db.nhan_su.update({
    where: { id: requester.employee_id! },
    data: { department_id: otherDepartment },
  });
  await as(page, head);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":true',
  );
  const pending = await db.buoc_xu_ly_quy_trinh.findFirstOrThrow({
    where: { ho_so_quy_trinh_id: r.id, trang_thai: "PENDING" },
  });
  expect(pending.nguoi_duoc_giao_id).toBe(outsider.employee_id);
  await as(page, outsider);
  expect(await command(page, r.id, "APPROVE")).toContain(
    '"success":true',
  );
});
