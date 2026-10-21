"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";
import { z } from "zod";
import Image from "next/image";
import { loginAction } from "@/actions/auth";

const LoginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tài khoản hoặc mã nhân viên"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginInput = z.infer<typeof LoginSchema>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "admin",
      password: "",
    },
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const onSubmit = (values: LoginInput) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await loginAction(values);
        if (result?.error) {
          setServerError(result.error);
          toast.error("Đăng nhập không thành công", {
            description: result.error,
          });
        } else if (result?.success) {
          toast.success("Đăng nhập thành công!", {
            description: "Đang chuyển hướng vào hệ thống ERP...",
          });
          router.replace("/");
          router.refresh();
        }
      } catch (error: unknown) {
        setServerError(error instanceof Error ? error.message : "Lỗi kết nối máy chủ");
        toast.error("Lỗi kết nối", {
          description: "Không thể kết nối đến máy chủ xác thực.",
        });
      }
    });
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden">
      <CardHeader className="space-y-3 text-center pt-8 pb-6 border-b border-border/40 bg-muted/20">
        <div className="mx-auto h-16 flex items-center justify-center hover:scale-105 transition-transform duration-300">
          <Image
            src="/logo.png"
            alt="Tập đoàn Sao Đỏ"
            width={124}
            height={75}
            className="h-14 w-auto object-contain drop-shadow-sm"
            priority
          />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-900 to-primary bg-clip-text text-transparent">
            SAO ĐỎ GROUP ERP
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Hệ thống Quản trị & Điều hành Doanh nghiệp Nội bộ
          </CardDescription>
        </div>
      </CardHeader>

      <Form {...form}>
        <form method="post" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-6">
            {serverError && (
              <div className="bg-destructive/15 text-destructive text-sm p-3.5 rounded-xl border border-destructive/20 animate-in fade-in duration-200">
                {serverError}
              </div>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Tài khoản / Mã nhân viên</FormLabel>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <FormControl>
                      <Input
                        placeholder="Nhập username (vd: admin, sdg_001...)"
                        {...field}
                        disabled={!isHydrated || isPending}
                        className="pl-10 h-11 rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium">Mật khẩu</FormLabel>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Nhập mật khẩu"
                        {...field}
                        disabled={!isHydrated || isPending}
                        className="pl-10 h-11 rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">💡 Tài khoản trải nghiệm:</p>
              <p>• Admin tối cao: <code className="text-primary font-mono font-bold">admin</code> / <code className="font-mono">123456</code></p>
              <p>• Hoặc bất kỳ nhân sự trong 67 cán bộ công ty (mật khẩu chung <code className="font-mono">123456</code>)</p>
            </div>
          </CardContent>

          <CardFooter className="pb-8 pt-2">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 cursor-pointer"
              disabled={!isHydrated || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
