import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
const companies: number[] = [];
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account,
  viewer: Account,
  staff: Account,
  hr: Account,
  roleAdmin: Account;
let company: number, foreignId: number, managerRole: number;
const isAction = (r: Request) =>
  r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, request: Request, value: unknown) {
  return (
    await page.request.post(new URL(request.url()).pathname, {
      headers: {
        "Next-Action": request.headers()["next-action"],
        "Content-Type": request.headers()["content-type"],
      },
      data: JSON.stringify([value]),
    })
  ).text();
}
async function input(id: number) {
  const r = await db.vi_tri.findUniqueOrThrow({ where: { id } });
  return {
    id,
    version: r.updated_at.toISOString(),
    name: r.ten_vi_tri,
    type: r.loai_vi_tri,
    parentId: r.parent_id,
    active: r.dang_su_dung,
    description: r.mo_ta ?? "",
    confirmMove: true,
  };
}
test.beforeAll(async () => {
  for (const label of ["Main", "Other"])
    companies.push(
      (
        await db.cong_ty.create({
          data: { ten_cong_ty: `Locations ${label} ${randomUUID()}` },
        })
      ).id,
    );
  company = companies[0];
  foreignId = (
    await db.vi_tri.create({
      data: {
        company_id: companies[1],
        ten_vi_tri: "Foreign hidden",
        loai_vi_tri: "PHONG",
      },
    })
  ).id;
  for (const [name, module, action] of [
    ["manager", "LOCATIONS", "MANAGE"],
    ["viewer", "LOCATIONS", "VIEW"],
    ["staff", "", ""],
    ["hr", "HR", "MANAGE"],
    ["roleAdmin", "ROLES", "MANAGE"],
  ]) {
    const permission = module
      ? await db.quyen.findFirstOrThrow({
          where: { phan_he: module, hanh_dong: action },
        })
      : null;
    const role = await db.vai_tro.create({
      data: {
        company_id: company,
        ma_vai_tro: name.toUpperCase(),
        ten_vai_tro: name,
        danh_sach_quyen: {
          create: permission ? [{ permission_id: permission.id }] : [],
        },
      },
    });
    const account = await db.tai_khoan.create({
      data: {
        company_id: company,
        ten_dang_nhap: `loc-${name}-${randomUUID()}`,
        ten_hien_thi: name,
        mat_khau_bam: "disabled",
        danh_sach_vai_tro: { create: { role_id: role.id } },
      },
    });
    if (name === "manager") {
      manager = account;
      managerRole = role.id;
    }
    if (name === "viewer") viewer = account;
    if (name === "staff") staff = account;
    if (name === "hr") hr = account;
    if (name === "roleAdmin") roleAdmin = account;
  }
  // RBAC management preserves the last administrator invariant.
  const p = await db.quyen.findFirstOrThrow({
    where: { phan_he: "ACCOUNTS", hanh_dong: "MANAGE" },
  });
  const role = await db.vai_tro.findFirstOrThrow({
    where: { company_id: company, ma_vai_tro: "ROLEADMIN" },
  });
  await db.vai_tro_quyen.create({
    data: { role_id: role.id, permission_id: p.id },
  });
});
test.afterAll(async () => {
  for (const id of companies) {
    await db.nhat_ky_hoat_dong.deleteMany({ where: { company_id: id } });
    await db.vi_tri.deleteMany({ where: { company_id: id } });
    await db.tai_khoan.deleteMany({ where: { company_id: id } });
    await db.vai_tro.deleteMany({ where: { company_id: id } });
    await db.cong_ty.delete({ where: { id } });
  }
  await db.$disconnect();
});

test("locations: tree CRUD, move confirmation, history, concurrent guards, permissions and responsive UI", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await signAccount(context, manager);
  await page.goto("/locations");
  await expect(page.getByText("Chưa có vị trí", { exact: true })).toBeVisible();
  await expect(page.getByText("Foreign hidden")).toHaveCount(0);
  await page.getByRole("button", { name: "Thêm vị trí", exact: true }).click();
  await page.getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(
    page.getByText("Nhập tên vị trí", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Tên vị trí", { exact: true })
    .fill("Trụ sở thử nghiệm");
  await page
    .getByRole("combobox", { name: "Loại vị trí", exact: true })
    .click();
  await page.getByRole("option", { name: "Tòa nhà", exact: true }).click();
  const sending = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  const save = await sending;
  await expect(
    page.getByRole("dialog", { name: "Thêm vị trí", exact: true }),
  ).toHaveCount(0);
  const root = await db.vi_tri.findFirstOrThrow({
    where: { company_id: company, ten_vi_tri: "Trụ sở thử nghiệm" },
  });
  expect(root.ma_vi_tri).toMatch(/^VT-\d{6,}$/);
  await expect(
    page.getByRole("button", { name: "Sửa vị trí", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xem vị trí Trụ sở thử nghiệm", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm vị trí con", exact: true })
    .click();
  await page.getByLabel("Tên vị trí", { exact: true }).fill("Phòng Hành chính");
  await page.getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Thêm vị trí", exact: true }),
  ).toHaveCount(0);
  const child = await db.vi_tri.findFirstOrThrow({
    where: { company_id: company, ten_vi_tri: "Phòng Hành chính" },
  });
  expect(child.parent_id).toBe(root.id);
  await expect(
    page.getByRole("button", { name: "Sửa vị trí", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const trigger = `location_audit_failure_${company}`;
  await db.$executeRawUnsafe(
    `CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${company} AND NEW.phan_he = 'LOCATIONS' THEN RAISE EXCEPTION 'Test audit unavailable'; END IF; RETURN NEW; END $$`,
  );
  try {
    await db.$executeRawUnsafe(
      `CREATE TRIGGER ${trigger} BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ${trigger}()`,
    );
    const before = await input(root.id);
    expect(
      await replay(page, save, { ...before, name: "Audit failure overwrite" }),
    ).toContain('"success":false');
    expect(await input(root.id)).toEqual(before);
  } finally {
    await db.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS ${trigger} ON nhat_ky_hoat_dong`,
    );
    await db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`);
  }
  const valid = await input(root.id);
  expect(await replay(page, save, { ...valid, name: "  " })).toContain(
    "fieldErrors",
  );
  expect(
    await replay(page, save, { ...valid, companyId: companies[1] }),
  ).toContain('"success":false');
  expect(await replay(page, save, { ...valid, parentId: foreignId })).toContain(
    "cấp trên không hợp lệ",
  );
  expect(await replay(page, save, { ...valid, id: foreignId })).toContain(
    "không tồn tại",
  );
  expect(await replay(page, save, { ...valid, parentId: child.id })).toContain(
    "vị trí con làm cấp trên",
  );
  expect(await replay(page, save, { ...valid, active: false })).toContain(
    "còn vị trí con",
  );
  expect(
    await replay(page, save, { ...valid, name: "Trụ sở đã cập nhật" }),
  ).toContain('"success":true');
  expect(
    await replay(page, save, { ...valid, name: "Stale overwrite" }),
  ).toContain("đã thay đổi");
  const other = await db.vi_tri.create({
    data: {
      company_id: company,
      ten_vi_tri: "Tòa nhà thứ hai",
      loai_vi_tri: "TOA_NHA",
    },
  });
  expect(
    await replay(page, save, {
      ...(await input(child.id)),
      parentId: other.id,
      confirmMove: false,
    }),
  ).toContain("Xác nhận chuyển");
  await page.reload();
  await page
    .getByRole("button", { name: "Xem vị trí Phòng Hành chính", exact: true })
    .click();
  await page.getByRole("button", { name: "Sửa vị trí", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Vị trí cấp trên", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: /Phòng Hành chính/ }),
  ).toHaveCount(0);
  await page
    .getByRole("option", { name: "Tòa nhà thứ hai", exact: true })
    .click();
  await page.getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Xác nhận chuyển");
  await page
    .getByRole("checkbox", { name: "Tôi xác nhận chuyển cả nhánh" })
    .check();
  await page.getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Sửa vị trí", exact: true }),
  ).toHaveCount(0);
  expect(
    (await db.vi_tri.findUniqueOrThrow({ where: { id: child.id } })).parent_id,
  ).toBe(other.id);
  await expect(
    page.getByRole("button", { name: "Sửa vị trí", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Tìm vị trí").fill("hanh chinh");
  await expect(
    page.getByRole("button", {
      name: "Xem vị trí Tòa nhà thứ hai",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Xem vị trí Trụ sở đã cập nhật",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "outputs/locations/mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await page
    .getByRole("button", { name: "Xem vị trí Phòng Hành chính", exact: true })
    .click();
  const historyRequest = page.waitForRequest(isAction);
  await page
    .getByRole("button", { name: "Xem lịch sử vị trí", exact: true })
    .click();
  const history = await historyRequest;
  await expect(page.getByText("Tối đa 50 thay đổi gần nhất")).toBeVisible();
  expect(await replay(page, history, foreignId)).not.toContain(
    "Foreign hidden",
  );
  await page.screenshot({
    path: "outputs/locations/detail-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("button", { name: "Xóa vị trí", exact: true }).click();
  const removing = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  const remove = await removing;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await db.vi_tri.findUnique({ where: { id: child.id } })).toBeNull();
  expect(await replay(page, history, child.id)).toContain("Xóa vị trí trống");
  const a = await db.vi_tri.create({
    data: {
      company_id: company,
      ten_vi_tri: "Concurrent A",
      loai_vi_tri: "PHONG",
    },
  });
  const b = await db.vi_tri.create({
    data: {
      company_id: company,
      ten_vi_tri: "Concurrent B",
      loai_vi_tri: "PHONG",
    },
  });
  const results = await Promise.all([
    replay(page, save, { ...(await input(a.id)), parentId: b.id }),
    replay(page, save, { ...(await input(b.id)), parentId: a.id }),
  ]);
  expect(results.filter((r) => r.includes('"success":true'))).toHaveLength(1);
  expect(
    results.filter((r) => r.includes("vị trí con làm cấp trên")),
  ).toHaveLength(1);
  const parent =
    (await db.vi_tri.findUniqueOrThrow({ where: { id: a.id } })).parent_id ===
    null
      ? a
      : b;
  expect(
    await replay(page, remove, {
      id: parent.id,
      version: (await input(parent.id)).version,
    }),
  ).toContain("còn vị trí con");
  expect(
    await replay(page, save, { ...(await input(root.id)), active: false }),
  ).toContain('"success":true');
  expect(
    await replay(page, save, {
      name: "Invalid child",
      type: "PHONG",
      parentId: root.id,
      active: true,
      description: "",
    }),
  ).toContain("ngừng sử dụng");
  await page.getByLabel("Tìm vị trí").fill("");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole("combobox", { name: "Trạng thái vị trí" }),
  ).toContainText("Tất cả trạng thái");
  await page.screenshot({
    path: "outputs/locations/desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: "outputs/locations/dark.png", fullPage: true });

  await signAccount(context, viewer);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Thêm vị trí", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xem vị trí Tòa nhà thứ hai", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sửa vị trí", exact: true }),
  ).toHaveCount(0);
  expect(await replay(page, save, await input(root.id))).toContain(
    "không có quyền quản lý",
  );
  expect(
    await replay(page, remove, {
      id: root.id,
      version: (await input(root.id)).version,
    }),
  ).toContain("không có quyền quản lý");
  for (const account of [staff, hr]) {
    await signAccount(context, account);
    await page.reload();
    await expect(
      page.getByText("Không thể truy cập vị trí & không gian", { exact: true }),
    ).toBeVisible();
    expect(await replay(page, save, await input(root.id))).toContain(
      "không có quyền quản lý",
    );
    expect(await replay(page, history, root.id)).toContain(
      "Không có quyền xem lịch sử",
    );
  }
  await signAccount(context, manager);
  await db.vai_tro_quyen.deleteMany({ where: { role_id: managerRole } });
  expect(await replay(page, save, await input(root.id))).toContain(
    "không có quyền quản lý",
  );
  expect(browserErrors).toEqual([]);
});

test("location permission is configured centrally in the role matrix", async ({
  page,
  context,
}) => {
  await signAccount(context, roleAdmin);
  await page.goto("/roles");
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  await page.getByLabel("Mã vai trò", { exact: true }).fill("LOCATION_PILOT");
  await page
    .getByLabel("Tên vai trò", { exact: true })
    .fill("Quản lý không gian thử nghiệm");
  await page
    .getByRole("combobox", { name: "Vị trí & không gian", exact: true })
    .click();
  await page.getByRole("option", { name: "Quản lý", exact: true }).click();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const role = await db.vai_tro.findFirstOrThrow({
    where: { company_id: company, ma_vai_tro: "LOCATION_PILOT" },
    include: { danh_sach_quyen: { include: { quyen: true } } },
  });
  expect(
    role.danh_sach_quyen.map((p) => [p.quyen.phan_he, p.quyen.hanh_dong]),
  ).toEqual([["LOCATIONS", "MANAGE"]]);
});

test("location database preserves codes, tenant links and transactional history", async () => {
  const root = await db.vi_tri.create({
    data: {
      company_id: company,
      ten_vi_tri: "DB root",
      loai_vi_tri: "TOA_NHA",
    },
  });
  const child = await db.vi_tri.create({
    data: {
      company_id: company,
      ten_vi_tri: "DB child",
      loai_vi_tri: "TANG",
      parent_id: root.id,
    },
  });
  await expect(
    db.vi_tri.update({ where: { id: root.id }, data: { parent_id: child.id } }),
  ).rejects.toThrow();
  await expect(
    db.vi_tri.update({
      where: { id: child.id },
      data: { ma_vi_tri: "CHANGED" },
    }),
  ).rejects.toThrow();
  await expect(
    db.vi_tri.create({
      data: {
        company_id: companies[1],
        ten_vi_tri: "Wrong tenant",
        loai_vi_tri: "PHONG",
        parent_id: root.id,
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.vi_tri.update({ where: { id: root.id }, data: { dang_su_dung: false } }),
  ).rejects.toThrow();
  await expect(db.vi_tri.delete({ where: { id: root.id } })).rejects.toThrow();
  const created = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      db.vi_tri.create({
        data: {
          company_id: company,
          ten_vi_tri: `Concurrent code ${i}`,
          loai_vi_tri: "CHO_NGOI",
        },
      }),
    ),
  );
  expect(new Set(created.map((r) => r.ma_vi_tri)).size).toBe(8);
  await expect(
    db.$transaction(async (tx) => {
      await tx.vi_tri.create({
        data: {
          company_id: company,
          ten_vi_tri: "Audit must rollback",
          loai_vi_tri: "PHONG",
        },
      });
      await tx.nhat_ky_hoat_dong.create({
        data: {
          company_id: -1,
          ten_dang_nhap: "fixture",
          ho_ten: "fixture",
          phan_he: "LOCATIONS",
          hanh_dong: "CREATE",
          mo_ta: "Invalid audit FK",
        },
      });
    }),
  ).rejects.toThrow();
  expect(
    await db.vi_tri.count({
      where: { company_id: company, ten_vi_tri: "Audit must rollback" },
    }),
  ).toBe(0);
});
