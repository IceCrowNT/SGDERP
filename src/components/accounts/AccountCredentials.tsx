"use client";
import { Button } from "@/components/ui/button";
export function AccountCredentials({
  credentials,
  requirePasswordChange = false,
  done,
}: {
  credentials: { username: string; password: string };
  requirePasswordChange?: boolean;
  done: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5" role="status">
      <h3 className="font-semibold">Thông tin bàn giao tài khoản</h3>
      <p className="text-sm text-muted-foreground">
        Mật khẩu chỉ hiển thị lần này để bàn giao.{" "}
        {requirePasswordChange
          ? "Người dùng cần đổi mật khẩu ở lần đăng nhập tiếp theo."
          : "Người dùng có thể đăng nhập và sử dụng ngay; đổi mật khẩu trong Hồ sơ của tôi khi cần."}
      </p>
      <dl className="space-y-3">
        <div>
          <dt>Tên đăng nhập</dt>
          <dd
            className="font-mono break-all select-all"
            data-testid="issued-username"
          >
            {credentials.username}
          </dd>
        </div>
        <div>
          <dt>{requirePasswordChange ? "Mật khẩu tạm" : "Mật khẩu"}</dt>
          <dd
            className="font-mono break-all select-all"
            data-testid="issued-password"
          >
            {credentials.password}
          </dd>
        </div>
      </dl>
      <Button onClick={done}>Đã lưu thông tin bàn giao</Button>
    </div>
  );
}
