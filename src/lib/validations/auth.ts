import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên tài khoản hoặc mã nhân viên"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
