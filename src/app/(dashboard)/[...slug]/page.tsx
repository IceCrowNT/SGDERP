import type { Metadata } from "next"

import { FeatureInDevelopment } from "@/components/layout/FeatureInDevelopment"

export const metadata: Metadata = {
  title: "Tính năng đang phát triển | SDG ERP",
  description: "Thông báo tính năng đang được hoàn thiện trên hệ thống SDG ERP.",
}

const featureNames: Record<string, string> = {
  tasks: "Quản lý công việc",
  "tasks/department": "Công việc phòng ban và dự án",
  roles: "Phân quyền vai trò",
  settings: "Cài đặt chung",
}

function resolveFeatureName(slug: string[]) {
  const path = slug.join("/")

  if (featureNames[path]) {
    return featureNames[path]
  }

  if (slug[0] === "employees" && slug.length > 1) {
    return "Hồ sơ nhân sự chi tiết"
  }

  return "Tính năng này"
}

export default async function UnavailableFeaturePage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params

  return <FeatureInDevelopment featureName={resolveFeatureName(slug)} />
}
