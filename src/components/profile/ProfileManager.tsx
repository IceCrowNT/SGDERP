"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getMyProfile,
  saveMyProfile,
  changeMyPassword,
  saveMyAvatar,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
type Profile = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;
export function ProfileManager({ data }: { data: Profile }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [tab, setTab] = useState<"personal" | "password">(
    data.mustChangePassword ? "password" : "personal",
  );
  const router = useRouter();
  const p = data.person;
  const initials = data.name
    .split(" ")
    .slice(-2)
    .map((n) => n[0])
    .join("");
  const date = (v: Date | null) =>
    v
      ? new Date(v).toLocaleDateString("vi-VN", { timeZone: "UTC" })
      : "Chưa cập nhật";
  const readOnly = p
    ? {
        "Họ và tên": p.ho_ten,
        "Mã nhân sự": p.ma_nhan_su,
        "Phòng ban": p.phong_ban?.ten_phong_ban,
        "Chức vụ": p.chuc_vu,
        "Ngày sinh": date(p.ngay_sinh),
        "Ngày vào làm": date(p.ngay_vao_lam),
        "Tình trạng":
          p.tinh_trang_lam_viec === "ACTIVE"
            ? "Đang làm việc"
            : "Chưa xác nhận",
        "Phòng phụ trách": p.danh_sach_phong_phu_trach
          .map((d) => d.ten_phong_ban)
          .join(", "),
      }
    : {};
  function handleResult(r: {
    success: boolean;
    message: string;
    fieldErrors?: Record<string, string[] | undefined>;
  }) {
    if (!r.success) {
      setErrors(r.fieldErrors ?? {});
      toast.error(r.message);
      return;
    }
    setErrors({});
    toast.success(r.message);
    router.refresh();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hồ sơ của tôi</h1>
      {data.mustChangePassword && (
        <p
          role="alert"
          className="rounded-xl border border-primary/30 bg-primary/5 p-4"
        >
          Bạn đang dùng mật khẩu tạm. Hãy đổi mật khẩu trước khi sử dụng hệ
          thống.
        </p>
      )}
      <section className="flex flex-wrap items-center gap-5 rounded-2xl border bg-card p-5">
        <Avatar className="h-20 w-20">
          <AvatarImage src={data.avatar ?? undefined} alt={data.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold break-words">{data.name}</h2>
          <p className="text-muted-foreground">
            {p?.chuc_vu || "Tài khoản nội bộ"}
          </p>
          <p className="text-sm text-muted-foreground">
            {p?.phong_ban?.ten_phong_ban}
          </p>
        </div>
        {p && !data.mustChangePassword && (
          <form
            className="w-full space-y-2 sm:w-auto"
            action={(f) =>
              start(async () => {
                handleResult(await saveMyAvatar(f));
              })
            }
          >
            <label htmlFor="avatar-file" className="text-sm">
              Ảnh JPEG, PNG hoặc WebP · tối đa 2 MB
            </label>
            <Input
              id="avatar-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending}
            />
            <div className="flex gap-2">
              <Button
                name="command"
                value="upload"
                disabled={pending}
                variant="outline"
              >
                {pending ? "Đang lưu…" : "Thay ảnh"}
              </Button>
              {data.avatar && (
                <Button
                  name="command"
                  value="remove"
                  disabled={pending}
                  variant="ghost"
                >
                  Xóa ảnh
                </Button>
              )}
            </div>
          </form>
        )}
      </section>
      <div
        role="tablist"
        aria-label="Hồ sơ cá nhân"
        className="flex flex-wrap gap-2"
      >
        <Button
          role="tab"
          aria-selected={tab === "personal"}
          variant={tab === "personal" ? "default" : "outline"}
          disabled={data.mustChangePassword}
          onClick={() => {
            setTab("personal");
            setErrors({});
          }}
        >
          Thông tin cá nhân
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "password"}
          variant={tab === "password" ? "default" : "outline"}
          onClick={() => {
            setTab("password");
            setErrors({});
          }}
        >
          Tài khoản và mật khẩu
        </Button>
      </div>
      {tab === "personal" && !data.mustChangePassword ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-semibold">Thông tin nhân sự</h2>
            {p ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                {Object.entries(readOnly).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v || "Chưa cập nhật"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                Tài khoản hệ thống chưa liên kết hồ sơ nhân sự. Bạn vẫn có thể
                đổi mật khẩu.
              </p>
            )}
          </section>
          {p && (
            <form
              className="space-y-4 rounded-xl border bg-card p-5"
              action={(f) =>
                start(async () => {
                  handleResult(
                    await saveMyProfile({
                      phone: String(f.get("phone") ?? ""),
                      email: String(f.get("email") ?? ""),
                      address: String(f.get("address") ?? ""),
                    }),
                  );
                })
              }
            >
              <h2 className="font-semibold">Thông tin liên hệ</h2>
              {(
                [
                  { key: "phone", label: "Điện thoại", value: p.so_dien_thoai },
                  { key: "email", label: "Email", value: p.thu_dien_tu },
                  { key: "address", label: "Địa chỉ", value: p.dia_chi },
                ] as const
              ).map((f) => (
                <div key={f.key} className="space-y-2">
                  <label htmlFor={f.key}>{f.label}</label>
                  <Input
                    id={f.key}
                    name={f.key}
                    defaultValue={f.value ?? ""}
                    disabled={pending}
                    aria-invalid={Boolean(errors[f.key])}
                    aria-describedby={`${f.key}-error`}
                  />
                  <p id={`${f.key}-error`} className="text-sm text-destructive">
                    {errors[f.key]?.[0]}
                  </p>
                </div>
              ))}
              <Button disabled={pending}>
                {pending ? "Đang lưu…" : "Lưu thông tin cá nhân"}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Tài khoản đăng nhập</h2>
            <p className="break-all">{data.username}</p>
            <p>Vai trò: {data.roles.join(", ") || "Quyền cá nhân cơ bản"}</p>
            <p className="text-sm text-muted-foreground">
              Đổi mật khẩu chỉ áp dụng cho tài khoản này và sẽ thu hồi các phiên
              đăng nhập cũ.
            </p>
          </section>
          <form
            className="rounded-xl border bg-card p-5 space-y-4"
            action={(f) =>
              start(async () => {
                const r = await changeMyPassword({
                  currentPassword: f.get("currentPassword"),
                  newPassword: f.get("newPassword"),
                  confirmation: f.get("confirmation"),
                });
                handleResult(r);
                if (r.success) router.replace("/profile");
              })
            }
          >
            <h2 className="font-semibold">Đổi mật khẩu</h2>
            <p className="text-sm text-muted-foreground">
              <span className="text-destructive">*</span> Trường bắt buộc
            </p>
            {[
              { key: "currentPassword", label: "Mật khẩu hiện tại" },
              { key: "newPassword", label: "Mật khẩu mới" },
              { key: "confirmation", label: "Nhập lại mật khẩu mới" },
            ].map((f) => (
              <div key={f.key} className="space-y-2">
                <label htmlFor={f.key}>
                  {f.label} <span className="text-destructive">*</span>
                </label>
                <Input
                  aria-label={f.label}
                  id={f.key}
                  name={f.key}
                  type="password"
                  autoComplete={
                    f.key === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  aria-required
                  required
                  disabled={pending}
                  aria-invalid={Boolean(errors[f.key])}
                  aria-describedby={`${f.key}-error`}
                />
                <p id={`${f.key}-error`} className="text-sm text-destructive">
                  {errors[f.key]?.[0]}
                </p>
              </div>
            ))}
            <Button disabled={pending}>
              {pending ? "Đang lưu…" : "Đổi mật khẩu"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
