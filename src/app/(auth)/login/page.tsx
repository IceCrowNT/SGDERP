import { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";


export const metadata: Metadata = {
  title: "Đăng nhập | SDG ERP - Sao Đỏ Group",
  description: "Cổng đăng nhập hệ thống hoạch định tài nguyên doanh nghiệp Sao Đỏ Group",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background relative overflow-hidden">
      {/* Decorative Brand Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <LoginForm />
      </div>
    </main>
  );
}
