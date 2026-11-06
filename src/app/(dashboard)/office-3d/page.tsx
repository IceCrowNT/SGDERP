import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession, hasPermission } from "@/lib/auth"
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

  if (!hasPermission(session, "HR")) return <p>Không có quyền xem nhân sự.</p>

  // Fetch departments with active personnel in the current company
  const departments = await db.phong_ban.findMany({
    where: {
      company_id: session.companyId,
    },
    include: {
      danh_sach_nhan_su: {
        where: {
          tinh_trang_lam_viec: "ACTIVE",
        },
        select: {
          id: true,
          ho_ten: true,
          ma_nhan_su: true,
          chuc_vu: true,
          so_dien_thoai: true,
          thu_dien_tu: true,
          duong_dan_anh_dai_dien: true,
          tinh_trang_lam_viec: true,
          department_id: true,
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
  const totalPersonnel = await db.nhan_su.count({
    where: {
      company_id: session.companyId,
      tinh_trang_lam_viec: "ACTIVE",
    },
  })

  return (
    <Office3DClientWrapper
      departments={departments}
      totalPersonnel={totalPersonnel}
    />
  )
}
