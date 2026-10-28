# Từ điển tên bảng và cột PostgreSQL

Ngày áp dụng: 22/10/2026. Migration: `20261022090000_viet_hoa_ten_bang_va_cot`. Phạm vi: 16 bảng, 194 cột scalar. Đã kiểm tra dữ liệu trước/sau không đổi và Prisma diff không có khác biệt.

Tên vật lý trong PostgreSQL dùng tiếng Việt không dấu, `snake_case`. Tên model/field Prisma giữ nguyên để tương thích mã ứng dụng, ánh xạ bằng `@@map`/`@map`. Tên kỹ thuật của constraint, index, sequence, enum và bảng hệ thống `_prisma_migrations` được giữ nguyên; giá trị enum và khóa JSON lịch sử không đổi.

Cập nhật 26/10/2026: `Employee`/`nhan_su` là hồ sơ người thật, `User`/`nguoi_dung` là tài khoản. Các cột hồ sơ cũ được lưu trữ qua field `legacy*` có `@ignore`, không dùng làm nguồn nghiệp vụ. `currentDepartmentId` vẫn là phòng đang sử dụng, chưa phải phòng chịu trách nhiệm quản lý.

## `Company` → `cong_ty`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `name` | `ten` |
| `taxCode` | `ma_so_thue` |
| `address` | `dia_chi` |
| `isActive` | `dang_hoat_dong` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `Department` → `phong_ban`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `code` | `ma` |
| `name` | `ten` |
| `description` | `mo_ta` |
| `externalSystem` | `he_thong_nguon` |
| `externalId` | `dinh_danh_nguon` |
| `externalParentId` | `dinh_danh_cap_tren_nguon` |
| `externalName` | `ten_nguon` |
| `externalPath` | `duong_dan_nguon` |
| `externalLevel` | `cap_nguon` |
| `externalSupervisorName` | `ten_nguoi_giam_sat_nguon` |
| `externalSnapshotAt` | `thoi_diem_chup_du_lieu_nguon` |
| `parentId` | `dinh_danh_cap_tren` |
| `companyId` | `dinh_danh_cong_ty` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `Employee` → `nhan_su`

Quyết định 27/10/2026: `id` là khóa liên kết nội bộ; `employeeCode` là mã nhân sự ERP bắt buộc, duy nhất trong công ty, ổn định để xuất Excel và đối chiếu nhập lại. Mã không phải STT Excel hoặc username. Giữ cấu trúc hiện có; cơ chế tự cấp mã khi tạo, ẩn ở UI và xuất–nhập theo mã là yêu cầu chờ triển khai trong HR-CHECKLIST.

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `employeeCode` | `ma_nhan_vien` |
| `fullName` | `ho_ten` |
| `position` | `chuc_vu` |
| `email` | `thu_dien_tu` |
| `phone` | `so_dien_thoai` |
| `dateOfBirth` | `ngay_sinh` |
| `joinDate` | `ngay_vao_lam` |
| `avatarUrl` | `duong_dan_anh_dai_dien` |
| `address` | `dia_chi` |
| `employmentStatus` | `tinh_trang_lam_viec` |
| `externalSystem` | `he_thong_nguon` |
| `externalId` | `dinh_danh_nguon` |
| `externalSnapshotAt` | `thoi_diem_chup_du_lieu_nguon` |
| `hrSourceFile` | `tep_nguon_nhan_su_hr` |
| `hrSnapshotAt` | `ngay_chot_nhan_su_hr` (DATE) |
| `hrNotes` | `ghi_chu_nhan_su_hr` |
| `companyId` | `dinh_danh_cong_ty` |
| `departmentId` | `dinh_danh_phong_ban` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `User` → `nguoi_dung`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `username` | `ten_dang_nhap` |
| `password` | `mat_khau_bam` |
| `displayName` | `ho_ten` |
| `isActive` | `dang_hoat_dong` |
| `sessionVersion` | `phien_ban_dang_nhap` |
| `companyId` | `dinh_danh_cong_ty` |
| `employeeId` | `dinh_danh_nhan_su` |
| `legacyEmail` (lưu trữ, @ignore) | `thu_dien_tu` |
| `legacyPhone` (lưu trữ, @ignore) | `so_dien_thoai` |
| `legacyEmployeeCode` (lưu trữ, @ignore) | `ma_nhan_vien` |
| `legacyPosition` (lưu trữ, @ignore) | `chuc_vu` |
| `legacyDateOfBirth` (lưu trữ, @ignore) | `ngay_sinh` |
| `legacyJoinDate` (lưu trữ, @ignore) | `ngay_vao_lam` |
| `legacyAvatarUrl` (lưu trữ, @ignore) | `duong_dan_anh_dai_dien` |
| `legacyAddress` (lưu trữ, @ignore) | `dia_chi` |
| `legacyDepartmentId` (lưu trữ, @ignore) | `dinh_danh_phong_ban` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `Role` → `vai_tro`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `code` | `ma` |
| `name` | `ten` |
| `description` | `mo_ta` |
| `isSystem` | `thuoc_he_thong` |
| `companyId` | `dinh_danh_cong_ty` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `Permission` → `quyen`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `module` | `phan_he` |
| `action` | `hanh_dong` |
| `name` | `ten` |
| `description` | `mo_ta` |
| `scope` | `pham_vi` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `RolePermission` → `vai_tro_quyen`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `roleId` | `dinh_danh_vai_tro` |
| `permissionId` | `dinh_danh_quyen` |
| `assignedAt` | `thoi_diem_gan` |

## `UserRole` → `nguoi_dung_vai_tro`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `userId` | `dinh_danh_nguoi_dung` |
| `roleId` | `dinh_danh_vai_tro` |
| `isPrimary` | `la_chinh` |
| `assignedAt` | `thoi_diem_gan` |

## `AuditLog` → `nhat_ky_hoat_dong`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `userId` | `dinh_danh_nguoi_dung` |
| `username` | `ten_dang_nhap` |
| `fullName` | `ho_ten` |
| `action` | `hanh_dong` |
| `module` | `phan_he` |
| `targetId` | `dinh_danh_doi_tuong` |
| `targetName` | `ten_doi_tuong` |
| `description` | `mo_ta` |
| `oldData` | `du_lieu_cu` |
| `newData` | `du_lieu_moi` |
| `ipAddress` | `dia_chi_ip` |
| `userAgent` | `thong_tin_trinh_duyet` |
| `companyId` | `dinh_danh_cong_ty` |
| `createdAt` | `thoi_diem_tao` |

## `AssetCategory` → `loai_tai_san`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `code` | `ma` |
| `name` | `ten` |
| `description` | `mo_ta` |
| `trackingMode` | `che_do_theo_doi` |
| `isActive` | `dang_hoat_dong` |
| `companyId` | `dinh_danh_cong_ty` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `PhysicalLocation` → `vi_tri_vat_ly`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `code` | `ma` |
| `name` | `ten` |
| `type` | `loai` |
| `description` | `mo_ta` |
| `floorNumber` | `so_tang` |
| `threeDKey` | `khoa_khong_gian_3d` |
| `positionX` | `toa_do_x` |
| `positionY` | `toa_do_y` |
| `positionZ` | `toa_do_z` |
| `isActive` | `dang_hoat_dong` |
| `parentId` | `dinh_danh_cap_tren` |
| `companyId` | `dinh_danh_cong_ty` |
| `departmentId` | `dinh_danh_phong_ban` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `AssetInventoryDocument` → `chung_tu_kiem_ke`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `documentNumber` | `so_chung_tu` |
| `documentDate` | `ngay_chung_tu` |
| `title` | `tieu_de` |
| `transferorName` | `ten_ben_giao` |
| `transferorPosition` | `chuc_vu_ben_giao` |
| `recipientName` | `ten_ben_nhan` |
| `recipientPosition` | `chuc_vu_ben_nhan` |
| `sourceFile` | `tep_nguon` |
| `status` | `trang_thai` |
| `notes` | `ghi_chu` |
| `companyId` | `dinh_danh_cong_ty` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `AssetInventoryLine` → `dong_kiem_ke`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `lineNumber` | `so_thu_tu_dong` |
| `itemName` | `ten_hang_muc` |
| `quantity` | `so_luong` |
| `unit` | `don_vi_tinh` |
| `notes` | `ghi_chu` |
| `companyId` | `dinh_danh_cong_ty` |
| `documentId` | `dinh_danh_chung_tu` |
| `categoryId` | `dinh_danh_loai_tai_san` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `Asset` → `tai_san`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `assetCode` | `ma_tai_san` |
| `name` | `ten` |
| `serialNumber` | `so_se_ri` |
| `manufacturer` | `nha_san_xuat` |
| `model` | `kieu_may` |
| `specifications` | `thong_so_ky_thuat` |
| `purchaseDate` | `ngay_mua` |
| `warrantyEndDate` | `ngay_het_bao_hanh` |
| `originalValue` | `nguyen_gia` |
| `status` | `trang_thai` |
| `condition` | `tinh_trang` |
| `notes` | `ghi_chu` |
| `companyId` | `dinh_danh_cong_ty` |
| `categoryId` | `dinh_danh_loai_tai_san` |
| `sourceLineId` | `dinh_danh_dong_nguon` |
| `currentLocationId` | `dinh_danh_vi_tri_hien_tai` |
| `currentCustodianId` | `dinh_danh_nguoi_giu_hien_tai` |
| `currentDepartmentId` | `dinh_danh_phong_ban_hien_tai` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `AssetAssignment` → `ban_giao_tai_san`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `assignmentType` | `loai_ban_giao` |
| `assignedAt` | `thoi_diem_gan` |
| `expectedReturnAt` | `thoi_diem_du_kien_tra` |
| `returnedAt` | `thoi_diem_tra` |
| `conditionOnAssign` | `tinh_trang_khi_giao` |
| `conditionOnReturn` | `tinh_trang_khi_tra` |
| `notes` | `ghi_chu` |
| `companyId` | `dinh_danh_cong_ty` |
| `assetId` | `dinh_danh_tai_san` |
| `assignedToEmployeeId` | `dinh_danh_nguoi_nhan` |
| `assignedToDepartmentId` | `dinh_danh_phong_ban_nhan` |
| `assignedById` | `dinh_danh_nguoi_giao` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `AssetLocationHistory` → `lich_su_vi_tri_tai_san`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `placedAt` | `thoi_diem_dat` |
| `removedAt` | `thoi_diem_di_doi` |
| `notes` | `ghi_chu` |
| `companyId` | `dinh_danh_cong_ty` |
| `assetId` | `dinh_danh_tai_san` |
| `locationId` | `dinh_danh_vi_tri` |
| `changedById` | `dinh_danh_nguoi_thay_doi` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## `AssetMaintenance` → `bao_tri_tai_san`

| Field Prisma | Cột PostgreSQL |
| :--- | :--- |
| `id` | `dinh_danh` |
| `maintenanceCode` | `ma_bao_tri` |
| `type` | `loai` |
| `status` | `trang_thai` |
| `title` | `tieu_de` |
| `description` | `mo_ta` |
| `reportedAt` | `thoi_diem_bao_hong` |
| `scheduledAt` | `thoi_diem_du_kien` |
| `startedAt` | `thoi_diem_bat_dau` |
| `completedAt` | `thoi_diem_hoan_tat` |
| `vendorName` | `ten_nha_cung_cap` |
| `cost` | `chi_phi` |
| `result` | `ket_qua` |
| `nextMaintenanceAt` | `thoi_diem_bao_tri_tiep` |
| `companyId` | `dinh_danh_cong_ty` |
| `assetId` | `dinh_danh_tai_san` |
| `requestedById` | `dinh_danh_nguoi_yeu_cau` |
| `technicianId` | `dinh_danh_ky_thuat_vien` |
| `createdAt` | `thoi_diem_tao` |
| `updatedAt` | `thoi_diem_cap_nhat` |

## Quan hệ hồ sơ – tài khoản (26/10/2026)

- `Employee.departmentId + companyId` → `Department.id + companyId`.
- `User.employeeId + companyId` → `Employee.id + companyId`, không unique employeeId; cho phép nhiều tài khoản/người.
- `Employee.employmentStatus`: ACTIVE (đang làm), LEFT (nghỉ việc), UNKNOWN (chưa xác nhận); độc lập `User.isActive`.
- `Asset.currentCustodianId`, `AssetAssignment.assignedToEmployeeId`, `AssetMaintenance.technicianId` → Employee. Nhật ký và tác giả thao tác → User.
- Tên bảng tài khoản vẫn là `nguoi_dung` để giữ tương thích. Migration bổ sung bảng thứ 17; mô tả 16 bảng ở đầu là phạm vi đổi tên năm 2026 trước lần tách này.
