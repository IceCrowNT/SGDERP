import { LayoutDashboard } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan hệ thống</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl border border-border/50 bg-card text-card-foreground shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Chỉ số {i}</p>
                <h3 className="text-2xl font-bold">12,345</h3>
              </div>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-96 rounded-2xl border border-border/50 bg-card flex items-center justify-center text-muted-foreground shadow-sm">
        Biểu đồ dữ liệu sẽ hiển thị ở đây
      </div>
    </div>
  );
}
