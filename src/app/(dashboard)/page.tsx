import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getSession, hasPermission } from "@/lib/auth";
import { canWorkflow } from "@/lib/role-catalog";
import { db } from "@/lib/db";
import { WORKFLOW_STATUS } from "@/lib/workflow-labels";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
function recentCutoff() {
  return new Date(Date.now() - 30 * 86400_000);
}
export const metadata = { title: "Bàn làm việc của tôi | SDG ERP" };
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const session = await getSession({ allowPasswordChange: true });
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/profile");
  const { view, page } = await searchParams;
  const workflow = canWorkflow(session.workflowActions);
  const manage = canWorkflow(session.workflowActions, "MANAGE");
  const person = session.employeeId
    ? await db.nhan_su.findFirst({
        where: {
          id: session.employeeId,
          company_id: session.companyId,
        },
        select: { tinh_trang_lam_viec: true },
      })
    : null;
  const active = person?.tinh_trang_lam_viec === "ACTIVE";
  type Panel = {
    key: string;
    title: string;
    where: Prisma.ho_so_quy_trinhWhereInput;
  };
  const panels: Panel[] = [];
  const own = {
    company_id: session.companyId,
    nguoi_gui_id: session.employeeId ?? -1,
  };
  for (const [key, title, kind, action] of [
    ["approve", "Chờ tôi duyệt", "APPROVAL", "APPROVE"],
    ["execute", "Việc tôi cần thực hiện", "TASK", "EXECUTE"],
  ] as const) {
    if (active && canWorkflow(session.workflowActions, action))
      panels.push({
        key,
        title,
        where: {
          company_id: session.companyId,
          trang_thai: "IN_PROGRESS",
          ...(kind === "APPROVAL"
            ? { nguoi_gui_id: { not: session.employeeId! } }
            : {}),
          danh_sach_buoc: {
            some: {
              nguoi_duoc_giao_id: session.employeeId!,
              trang_thai: "PENDING",
              buoc_mau: { loai_buoc: kind },
            },
          },
        },
      });
  }
  if (workflow && session.employeeId)
    panels.push(
      {
        key: "draft",
        title: "Bản nháp của tôi",
        where: { ...own, trang_thai: "DRAFT" },
      },
      {
        key: "sent",
        title: "Yêu cầu đang xử lý",
        where: { ...own, trang_thai: "IN_PROGRESS" },
      },
      {
        key: "ended",
        title: "Kết quả trong 30 ngày",
        where: {
          ...own,
          trang_thai: { in: ["COMPLETED", "REJECTED", "CANCELLED"] },
          updated_at: { gte: recentCutoff() },
        },
      },
    );
  if (manage)
    panels.push({
      key: "blocked",
      title: "Điều phối · Hồ sơ tạm dừng",
      where: {
        company_id: session.companyId,
        trang_thai: "IN_PROGRESS",
        danh_sach_buoc: { some: { trang_thai: "BLOCKED" } },
      },
    });
  const counts = await Promise.all(
    panels.map((p) => db.ho_so_quy_trinh.count({ where: p.where })),
  );
  const selected = panels.find((p) => p.key === view) ?? panels[0];
  const total = selected ? counts[panels.indexOf(selected)] : 0;
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const pageNumber = Math.min(
    pageCount,
    Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1),
  );
  const records = selected
    ? await db.ho_so_quy_trinh.findMany({
        where: selected.where,
        take: 10,
        skip: (pageNumber - 1) * 10,
        orderBy: [{ updated_at: "desc" }, { id: "desc" }],
        select: {
          id: true,
          ma: true,
          tieu_de: true,
          trang_thai: true,
          updated_at: true,
        },
      })
    : [];
  const shortcuts = [
    { href: "/profile", label: "Hồ sơ của tôi", allowed: true },
    {
      href: "/workflows",
      label: workflow ? "Quy trình và yêu cầu" : "Thiết lập quy trình",
      allowed: workflow || hasPermission(session, "ROLES", "MANAGE"),
    },
    {
      href: "/employees",
      label: "Nhân sự",
      allowed: hasPermission(session, "HR"),
    },
    {
      href: "/departments",
      label: "Phòng ban",
      allowed: hasPermission(session, "HR"),
    },
    {
      href: "/accounts",
      label: "Tài khoản",
      allowed: hasPermission(session, "ACCOUNTS", "MANAGE"),
    },
    {
      href: "/roles",
      label: "Vai trò và quyền",
      allowed: hasPermission(session, "ROLES"),
    },
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap gap-4 items-center rounded-2xl border bg-card p-6">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={session.avatarUrl ?? undefined}
            alt={session.fullName}
          />
          <AvatarFallback>
            {session.fullName
              .split(" ")
              .slice(-2)
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Bàn làm việc của tôi</p>
          <h1 className="text-2xl font-bold break-words">
            Xin chào, {session.fullName}
          </h1>
          <p className="text-muted-foreground">
            {[session.position, session.departmentName]
              .filter(Boolean)
              .join(" · ") || "Tài khoản nội bộ"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/profile">Hồ sơ của tôi</Link>
        </Button>
      </header>
      {panels.length > 0 && (
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Tổng quan công việc"
        >
          {panels.map((p, i) => (
            <Link
              key={p.key}
              href={`/?view=${p.key}`}
              aria-current={selected?.key === p.key ? "page" : undefined}
              className={`rounded-xl border p-5 transition-colors hover:border-primary ${selected?.key === p.key ? "border-primary bg-primary/5" : "bg-card"}`}
            >
              <h2 className="text-sm text-muted-foreground">{p.title}</h2>
              <p className="mt-2 text-3xl font-semibold">{counts[i]}</p>
            </Link>
          ))}
        </section>
      )}
      {selected ? (
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">{selected.title}</h2>
          <p className="text-sm text-muted-foreground">
            {records.length} hồ sơ / {total} hồ sơ phù hợp. Trang {pageNumber}/
            {pageCount}.
          </p>
          {pageCount > 1 && (
            <nav aria-label="Phân trang hồ sơ" className="flex gap-2">
              {pageNumber > 1 && (
                <Button asChild variant="outline">
                  <Link href={`/?view=${selected.key}&page=${pageNumber - 1}`}>
                    Trang trước
                  </Link>
                </Button>
              )}
              {pageNumber < pageCount && (
                <Button asChild variant="outline">
                  <Link href={`/?view=${selected.key}&page=${pageNumber + 1}`}>
                    Trang sau
                  </Link>
                </Button>
              )}
            </nav>
          )}
          {!records.length && (
            <p className="py-6 text-muted-foreground">
              Chưa có hồ sơ trong mục này.
            </p>
          )}
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/workflows/${r.id}`}
              className="block rounded-lg border p-4 transition-colors hover:border-primary"
            >
              <p className="font-medium break-words">{r.tieu_de}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.ma} · {WORKFLOW_STATUS[r.trang_thai]}
              </p>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Không gian cá nhân của bạn</h2>
          <p className="text-muted-foreground">
            Bạn có thể cập nhật thông tin liên hệ, ảnh đại diện và mật khẩu
            trong hồ sơ cá nhân. Công việc và yêu cầu sẽ xuất hiện khi bạn được
            cấp quyền sử dụng quy trình.
          </p>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">Truy cập nhanh</h2>
        <div className="flex flex-wrap gap-3">
          {shortcuts
            .filter((s) => s.allowed)
            .map((s) => (
              <Button key={s.href} asChild variant="outline">
                <Link href={s.href}>{s.label}</Link>
              </Button>
            ))}
        </div>
      </section>
    </div>
  );
}
