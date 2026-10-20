import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { Office3DClientWrapper } from "@/components/office-3d/Office3DClientWrapper"

export const metadata: Metadata = {
  title: "Bản Đồ 3D Tòa Nhà Sao Đỏ | SDG ERP",
  description: "Mô hình 3D Digital Twin không gian làm việc 3 tầng tích hợp sơ đồ phòng ban và nhân sự thực tế",
}

export default async function Office3DPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  // Fetch departments with active personnel in the current company
  const departments = await db.department.findMany({
    where: {
      companyId: session.companyId,
    },
    include: {
      users: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
          position: true,
          phone: true,
          email: true,
          avatarUrl: true,
          isActive: true,
          departmentId: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  })

  // Count total active personnel in company
  const totalPersonnel = await db.user.count({
    where: {
      companyId: session.companyId,
      isActive: true,
    },
  })

  return (
    <Office3DClientWrapper
      departments={departments}
      totalPersonnel={totalPersonnel}
    />
  )
}
