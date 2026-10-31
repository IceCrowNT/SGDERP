# Từ điển tên bảng và cột PostgreSQL

Ngày áp dụng: 22/10/2026. Migration: `20261022090000_viet_hoa_ten_bang_va_cot`. Phạm vi: 16 bảng, 194 cột scalar. Đã kiểm tra dữ liệu trước/sau không đổi và Prisma diff không có khác biệt.

Tên vật lý trong PostgreSQL dùng tiếng Việt không dấu, `snake_case`. Tên model/field Prisma giữ nguyên để tương thích mã ứng dụng, ánh xạ bằng `@@map`/`@map`. Tên kỹ thuật của constraint, index, sequence, enum và bảng hệ thống `_prisma_migrations` được giữ nguyên; giá trị enum và khóa JSON lịch sử không đổi.

Hiện trạng 31/10/2026: còn **9 bảng nghiệp vụ**, chưa tính `_prisma_migrations`; các số 16 bảng/194 cột đầu tài liệu là lịch sử Việt hóa.

Cập nhật 26/10/2026: `Employee`/`nhan_su` là hồ sơ người thật, `User`/`nguoi_dung` là tài khoản. Cập nhật 28/10/2026: đã bỏ 9 cột hồ sơ `legacy*` trong tài khoản sau backup; hồ sơ sống chỉ nằm ở `nhan_su`. Các bảng tài sản đã gỡ ngày 31/10/2026.

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

Quyết định 27/10/2026: `id` là khóa liên kết nội bộ; `employeeCode` là mã nhân sự ERP bắt buộc, duy nhất trong công ty, ổn định để xuất Excel và đối chiếu nhập lại. Mã không phải STT Excel hoặc username. Ngày 28/10/2026 đã triển khai tự cấp mã bằng default `tao_ma_nhan_su()`/sequence `so_thu_tu_ma_nhan_su` và trigger chặn đổi mã; form không nhận mã nhập tay. Xuất–nhập Excel theo mã vẫn là việc sau.

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
| `notes` (ghi chú vận hành, chỉnh được) | `ghi_chu` |
| `hrNotes` (ghi chú nguồn ban đầu) | `ghi_chu_nhan_su_hr` |
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
| `displayName` | `ten_hien_thi` |
| `isActive` | `dang_hoat_dong` |
| `sessionVersion` | `phien_ban_dang_nhap` |
| `companyId` | `dinh_danh_cong_ty` |
| `employeeId` | `dinh_danh_nhan_su` |
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

## Các bảng tài sản đã gỡ — 31/10/2026

Migration `20261031090000_remove_asset_module` gỡ `loai_tai_san`, `vi_tri_vat_ly`, `chung_tu_kiem_ke`, `dong_kiem_ke`, `tai_san`, `ban_giao_tai_san`, `lich_su_vi_tri_tai_san`, `bao_tri_tai_san` và enum liên quan. Bảng/cột cũ xem trong migration lịch sử và bản schema backup; không còn là từ điển DB hiện hành.

## Quan hệ hồ sơ – tài khoản (26/10/2026)

- `Employee.departmentId + companyId` → `Department.id + companyId`.
- `User.employeeId + companyId` → `Employee.id + companyId`, không unique employeeId; cho phép nhiều tài khoản/người.
- `Employee.employmentStatus`: ACTIVE (đang làm), LEFT (nghỉ việc), UNKNOWN (chưa xác nhận); độc lập `User.isActive`.
- Nhật ký thao tác tham chiếu User; các quan hệ tài sản đã gỡ ngày 31/10/2026.
- Tên bảng tài khoản vẫn là `nguoi_dung` để giữ tương thích. Migration bổ sung bảng thứ 17; mô tả 16 bảng ở đầu là phạm vi đổi tên năm 2026 trước lần tách này.
