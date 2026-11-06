"use client";
import { Button } from "@/components/ui/button";
export function AccountCredentials({
  credentials,
  done,
}: {
  credentials: { username: string; password: string };
  done: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5" role="status">
      <h3 className="font-semibold">Thông tin bàn giao tài khoản</h3>
      <p className="text-sm text-muted-foreground">
        Mật khẩu tạm chỉ hiển thị lần này. Người dùng cần đổi mật khẩu khi đăng
        nhập lần đầu.
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
          <dt>Mật khẩu tạm</dt>
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
