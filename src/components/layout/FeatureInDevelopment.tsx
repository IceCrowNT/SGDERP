import Link from "next/link"
import {
  ArrowLeft,
  Blocks,
  CheckCircle2,
  Clock3,
  Hammer,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface FeatureInDevelopmentProps {
  featureName?: string
}

const developmentSteps = [
  {
    title: "Phân tích nghiệp vụ",
    description: "Đang rà soát nhu cầu và phạm vi sử dụng thực tế.",
    icon: CheckCircle2,
    active: true,
  },
  {
    title: "Thiết kế giải pháp",
    description: "Giao diện và luồng dữ liệu sẽ được đề xuất để phê duyệt.",
    icon: Blocks,
    active: false,
  },
  {
    title: "Phát triển & kiểm thử",
    description: "Tính năng sẽ được mở sau khi hoàn thành kiểm thử.",
    icon: Hammer,
    active: false,
  },
]

export function FeatureInDevelopment({
  featureName = "Tính năng này",
}: FeatureInDevelopmentProps) {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-muted/20 px-4 py-10 sm:min-h-[calc(100vh-9rem)] sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <Card className="relative w-full max-w-3xl overflow-hidden border-border/60 bg-background/85 py-0 shadow-xl shadow-primary/5 backdrop-blur-xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />

        <CardHeader className="items-center gap-4 px-5 pb-2 pt-8 text-center sm:px-10 sm:pt-10">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm sm:h-24 sm:w-24">
            <Hammer className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true" />
            <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-accent text-accent-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>

          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-primary"
          >
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Bản nháp • Đang phát triển
          </Badge>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {featureName} đang được phát triển
            </CardTitle>
            <CardDescription className="mx-auto max-w-xl text-sm leading-6 sm:text-base">
              Chức năng chưa sẵn sàng để sử dụng. Đội ngũ phụ trách đang hoàn thiện
              yêu cầu, thiết kế và kiểm thử trước khi đưa vào hệ thống.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-5 pb-8 pt-4 sm:px-10 sm:pb-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {developmentSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left transition-all duration-200 hover:border-primary/25 hover:bg-muted/50"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span
                    className={
                      step.active
                        ? "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                        : "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    }
                  >
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{step.title}</span>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-6 sm:flex-row sm:items-center sm:justify-center">
            <Button asChild variant="outline" size="lg" className="h-11 rounded-xl px-5">
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Xem tính năng hiện có
              </Link>
            </Button>
            <Button asChild size="lg" className="h-11 rounded-xl px-5 shadow-sm">
              <Link href="/">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Về trang tổng quan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
