# Từ điển dữ liệu — PostgreSQL và Prisma Studio

## Quy ước tên hiện hành — 06/11/2026

Prisma và PostgreSQL dùng cùng tên. Khóa chính là `id`; khóa ngoại phổ biến là `company_id`, `department_id`, `employee_id`, `account_id`, `role_id`, `permission_id`; thời gian kỹ thuật là `created_at`, `updated_at`. Quan hệ nghiệp vụ phức tạp dùng tiếng Việt không dấu kèm `_id`, như `mau_quy_trinh_id` và `nguoi_duoc_giao_id`. Tên bảng vẫn bằng tiếng Việt không dấu. Migration `20261106113000_quy_uoc_ten_lai` chỉ đổi tên cột, giữ nguyên dữ liệu và tên constraint/index lịch sử.

`dinh_danh_nguon` và `dinh_danh_cap_tren_nguon` là mã truy nguyên từ hệ thống ngoài, không phải khóa nội bộ, nên không đổi tên.

## Tài khoản cá nhân — 05/11/2026

Migration `20261105120000_khong_gian_ca_nhan` thêm `tai_khoan.bat_buoc_doi_mat_khau Boolean @default(false)`; mật khẩu tạm mới/reset đặt true, tài khoản cũ giữ false. Thêm role DEFAULT cho từng công ty, không gán hàng loạt cho tài khoản cũ; trigger chặn cấp quyền nghiệp vụ vào DEFAULT. Profile tái sử dụng ảnh/liên hệ/địa chỉ trong `nhan_su`. Vẫn **14 bảng**, không tạo bảng profile/dashboard. Tên đăng nhập unique toàn hệ thống; khóa cấp tên không đổi ID hoặc mã nhân sự. Chi tiết tại [thiết kế](THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md).

## Workflow — 05/11/2026

Hiện có **14 bảng nghiệp vụ**. Migration thêm 5 bảng workflow và unique `(id, company_id)` trên `tai_khoan`. Giữ dữ liệu lõi; thêm 5 quyền WORKFLOW, không tự cấp cho vai trò. Bảng/cột và ý nghĩa đầy đủ tại [Thiết kế quy trình](THIET-KE-QUY-TRINH.md).

## Cập nhật quyền — 04/11/2026 (lịch sử)

Giữ nguyên tên bảng/cột Việt và 9 bảng. `vai_tro.ma_vai_tro` là mã ổn định, không tự cấp quyền. `quyen` có thêm ACCOUNTS MANAGE, ROLES VIEW/MANAGE, AUDIT VIEW. `la_vai_tro_chinh` chỉ là nhãn chính, tối đa một trên tài khoản; mọi role vẫn cộng quyền. Trigger chặn gán role khác công ty và chuyển công ty role/tài khoản. Quyền theo phòng chưa triển khai; ma trận hiện tại quản lý grant `pham_vi=ALL`, giữ grant cũ khác phạm vi để tra cứu. Không phát sinh mã nhân sự, tài khoản hay bảng mới trong đợt này.


Cập nhật 04/11/2026: **tên model và trường Prisma trùng tên bảng và cột PostgreSQL**. Quy ước tiếng Việt hoàn toàn ở thời điểm đó đã được quy ước lai ngày 06/11/2026 phía trên thay thế; Prisma Studio hiển thị trực tiếp tên hiện hành.

## Tài sản và vị trí — 11/11/2026

[Tài sản mức 1](plans/ASSET-MANAGEMENT-CHECKLIST.md) đã có `loai_tai_san`, `tai_san` và FK vị trí qua migration `20261111095809_tai_san_muc_1`. FK nullable `nhan_su.vi_tri_lam_viec_id` đã có từ migration `20261110160000_vi_tri_lam_viec_nhan_su`, cùng công ty/Restrict, không unique. Form HR và chi tiết vị trí cùng quản lý một liên kết; 3D HCNS chỉ đọc người ACTIVE theo quyền. Khi xóa vị trí qua ERP, action có đủ quyền/xác nhận tự bỏ gán nhân sự và audit nguyên tử trước khi xóa; FK Restrict vẫn giữ để chặn thao tác SQL làm mất liên kết. Vị trí còn tài sản thì chặn xóa/ngừng dùng; không tự gỡ thiết bị. Giao diện `/assets` đã có; dữ liệu thiết bị vận hành chưa nhập.

## Danh mục hiện hành

| Chức năng / ý nghĩa | Tên chung PostgreSQL và Prisma Studio | Model Prisma trước đây |
| --- | --- | --- |
| Công ty | `cong_ty` | Company |
| Phòng ban | `phong_ban` | Department |
| Vị trí & không gian dùng chung | `vi_tri` | — |
| Bố trí vật thể bổ sung trên 3D | `vat_the_3d` | — |
| Loại thiết bị | `loai_tai_san` | — (thiết kế mức 1 mới) |
| Hồ sơ từng thiết bị | `tai_san` | — (thiết kế mức 1 mới) |
| Hồ sơ nhân sự | `nhan_su` | Employee |
| Tài khoản đăng nhập | `tai_khoan` | User |
| Vai trò | `vai_tro` | Role |
| Quyền thao tác | `quyen` | Permission |
| Quyền được cấp cho vai trò | `vai_tro_quyen` | RolePermission |
| Vai trò được gán cho tài khoản | `tai_khoan_vai_tro` | UserRole |
| Nhật ký hoạt động | `nhat_ky_hoat_dong` | AuditLog |
| Mẫu và phiên bản quy trình | `mau_quy_trinh` | — |
| Bước trong mẫu | `buoc_mau_quy_trinh` | — |
| Hồ sơ/yêu cầu chạy quy trình | `ho_so_quy_trinh` | — |
| Bước xử lý của từng hồ sơ | `buoc_xu_ly_quy_trinh` | — |
| Lịch sử xử lý | `lich_su_quy_trinh` | — |

DB có 18 bảng nghiệp vụ, ngoài bảng hệ thống `_prisma_migrations`. Nhân sự là người thật; tài khoản dùng để đăng nhập. Một người có 0..N tài khoản; vai trò gắn từng tài khoản. Chức vụ text không cấp quyền và không xác định người phụ trách phòng. Cột `phong_ban.nguoi_phu_trach_id` đã triển khai; workflow đã có bản thử nghiệm theo [plan workflow](plans/WORKFLOW-CHECKLIST.md).

Các giá trị enum `ACTIVE / LEFT / UNKNOWN`, mã quyền `HR / VIEW / MANAGE`, constraint/index/sequence lịch sử và JSON nhật ký cũ được giữ nguyên. Đây không phải tên bảng/cột. Relation field của Prisma là liên kết, không tạo cột PostgreSQL; tên liên kết cũng dùng tiếng Việt.

Ví dụ truy vấn hiện hành:

```ts
await db.nhan_su.findMany({
  where: { company_id: session.companyId },
  select: { id: true, ma_nhan_su: true, ho_ten: true },
});
```

Form/session là hợp đồng ứng dụng riêng, có thể giữ tên như fullName/companyId; Server Action chuyển tường minh sang trường DB. Không tạo model hoặc lớp Prisma alias tiếng Anh song song. Nhãn người dùng trên ERP vẫn là tiếng Việt có dấu.

## `loai_tai_san` và `tai_san` — Thiết bị mức 1

Hai bảng có `id`, `company_id`, `created_at`, `updated_at`. Mã unique trong công ty; FK nghiệp vụ kép cùng công ty/Restrict. Enum và ràng buộc vận hành do [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md#thiết-kế-db-cần-giữ) quản lý.

| Bảng | Cột nghiệp vụ | Kiểu / ý nghĩa |
| --- | --- | --- |
| `loai_tai_san` | `ma_loai` | String(50), mã loại bất biến |
| | `ten_loai` | String(255), tên bắt buộc |
| | `mo_ta` | Text?, mô tả |
| | `dang_su_dung` | Boolean, cho phép chọn mới |
| `tai_san` | `ma_tai_san` | String(50), mã TS tự cấp/bất biến |
| | `ten_tai_san` | String(255), tên bắt buộc |
| | `loai_tai_san_id` | Int, FK loại bắt buộc |
| | `phong_quan_ly_id` | Int?, FK phòng quản lý |
| | `nguoi_su_dung_id` | Int?, FK nhân sự dùng thiết bị |
| | `vi_tri_id` | Int?, FK vị trí vật lý |
| | `tinh_trang` | Enum `TinhTrangTaiSan`, mặc định `CHUA_XAC_NHAN` |
| | `hinh_thuc_su_dung` | Enum `HinhThucSuDungTaiSan`, mặc định `CHUA_XAC_DINH` |
| | `so_serial`, `hang_model` | String(255)?, serial không unique |
| | `ghi_chu` | Text?, ghi chú vận hành |

Quan hệ Prisma của thiết bị: `cong_ty`, `loai_tai_san`, `phong_quan_ly`, `nguoi_su_dung`, `vi_tri`; các bảng đích có `danh_sach_tai_san`. Công ty có thêm `danh_sach_loai_tai_san`. Audit tra bằng `company_id`, `ASSETS` và `tai_san:<id>` hoặc `loai_tai_san:<id>`, không tạo bảng lịch sử riêng.

## `vi_tri` — Vị trí & không gian

| Cột PostgreSQL = trường Prisma | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | Int | Khóa chính tự tăng |
| `company_id` | Int | Công ty sở hữu |
| `ma_vi_tri` | String | Mã VT tự cấp, bất biến |
| `ten_vi_tri` | String | Tên vị trí |
| `loai_vi_tri` | String | Tòa nhà, tầng, phòng, khu vực, chỗ ngồi, điểm đặt thiết bị; DB check giới hạn giá trị |
| `parent_id` | Int? | Cha cùng bảng/công ty; null là vị trí gốc |
| `mo_ta` | String? | Hướng dẫn tìm/mô tả |
| `dang_su_dung` | Boolean | Cho phép bố trí mới |
| `created_at`, `updated_at` | DateTime | Thời gian tạo/cập nhật |

Quan hệ Prisma: `cong_ty`, `vi_tri_cha`, `danh_sach_vi_tri_con`, `danh_sach_nhan_su` (không phải cột). Ràng buộc và vòng đời tại [plan vị trí](plans/LOCATION-MANAGEMENT-CHECKLIST.md). Migration `20261110100000_vi_tri_khong_gian` thêm bảng và quyền LOCATIONS, không cấp grant hoặc gán chỗ ngồi.

## `vat_the_3d` — Bố trí vị trí bổ sung trên mô hình

Migration `20261112160000_vi_tri_bo_sung_3d` bổ sung một bảng, giữ 17 bảng cũ. Thiết kế/ràng buộc nghiệp vụ do [plan 3D](plans/OFFICE-3D-CHECKLIST.md#thử-nghiệm-thêm-vị-trí-trên-mô-hình) quản lý.

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id`, `company_id` | Int | Khóa kỹ thuật, công ty |
| `vi_tri_id` | Int | FK kép cùng công ty, unique `(vi_tri_id, company_id)`; mỗi vị trí tối đa một hình bổ sung |
| `phong_id` | Int | FK kép tới phòng gốc của hình |
| `loai_vat_the` | String | `BAN` hoặc `DIEM` |
| `toa_do_x`, `toa_do_z` | Float | Tọa độ tương đối trong phòng, giới hạn hữu hạn |
| `goc_xoay` | Int | Góc 0/90/180/270 độ |
| `created_at`, `updated_at` | DateTime | Thời điểm và phiên bản bố trí |

Quan hệ Prisma: `cong_ty`, `vi_tri`, `phong`. Xóa vị trí hợp lệ cascade hình phụ thuộc; FK phòng Restrict. Không đổi liên kết tài sản/nhân sự khi chỉnh bố trí. `vi_tri` có quan hệ `vat_the_3d` và `danh_sach_vat_the_3d`; không thêm cột tọa độ vào danh mục vị trí.

## `cong_ty` — Công ty

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `ten_cong_ty` | String | Không NULL |
| `ma_so_thue` | String | Có thể trống |
| `dia_chi` | String | Có thể trống |
| `dang_hoat_dong` | Boolean | Không NULL · Có mặc định |
| `created_at` | DateTime | Không NULL · Có mặc định |
| `updated_at` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `danh_sach_tai_khoan` | `tai_khoan` | Danh sách |
| `danh_sach_nhan_su` | `nhan_su` | Danh sách |
| `danh_sach_phong_ban` | `phong_ban` | Danh sách |
| `danh_sach_vai_tro` | `vai_tro` | Danh sách |
| `danh_sach_nhat_ky` | `nhat_ky_hoat_dong` | Danh sách |

## `phong_ban` — Phòng ban

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `ma_phong_ban` | String | Không NULL |
| `ten_phong_ban` | String | Không NULL |
| `mo_ta` | String | Có thể trống |
| `he_thong_nguon` | String | Có thể trống |
| `dinh_danh_nguon` | String | Có thể trống |
| `dinh_danh_cap_tren_nguon` | String | Có thể trống |
| `ten_nguon` | String | Có thể trống |
| `duong_dan_nguon` | String | Có thể trống |
| `cap_nguon` | Int | Có thể trống |
| `ten_nguoi_giam_sat_nguon` | String | Có thể trống |
| `thoi_diem_chup_du_lieu_nguon` | DateTime | Có thể trống |
| `parent_id` | Int | Có thể trống |
| `nguoi_phu_trach_id` | Int | FK nhân sự cùng công ty; có thể trống, một người phụ trách nhiều phòng |
| `company_id` | Int | Không NULL |
| `created_at` | DateTime | Không NULL · Có mặc định |
| `updated_at` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `nguoi_phu_trach` | `nhan_su` | Một bản ghi hoặc trống |
| `phong_ban_cha` | `phong_ban` | Một bản ghi hoặc trống |
| `phong_ban_con` | `phong_ban` | Danh sách |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `danh_sach_nhan_su` | `nhan_su` | Danh sách |

## `nhan_su` — Hồ sơ nhân sự

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `ma_nhan_su` | String | Không NULL · Có mặc định |
| `ho_ten` | String | Không NULL |
| `chuc_vu` | String | Có thể trống |
| `thu_dien_tu` | String | Có thể trống |
| `so_dien_thoai` | String | Có thể trống |
| `ngay_sinh` | DateTime | Có thể trống |
| `ngay_vao_lam` | DateTime | Có thể trống |
| `duong_dan_anh_dai_dien` | String | Có thể trống |
| `dia_chi` | String | Có thể trống |
| `tinh_trang_lam_viec` | EmploymentStatus | Không NULL · Có mặc định |
| `he_thong_nguon` | String | Có thể trống |
| `dinh_danh_nguon` | String | Có thể trống |
| `thoi_diem_chup_du_lieu_nguon` | DateTime | Có thể trống |
| `tep_nguon_nhan_su_hr` | String | Có thể trống |
| `ngay_chot_nhan_su_hr` | DateTime | Có thể trống |
| `ghi_chu` | String | Có thể trống |
| `ghi_chu_nhan_su_hr` | String | Có thể trống |
| `company_id` | Int | Không NULL |
| `department_id` | Int | Có thể trống |
| `vi_tri_lam_viec_id` | Int | Có thể trống; FK vị trí chính cùng công ty, Restrict |
| `created_at` | DateTime | Không NULL · Có mặc định |
| `updated_at` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `phong_ban` | `phong_ban` | Một bản ghi hoặc trống |
| `vi_tri_lam_viec` | `vi_tri` | Một vị trí chính hoặc trống |
| `danh_sach_tai_khoan` | `tai_khoan` | Danh sách |
| `danh_sach_phong_phu_trach` | `phong_ban` | Các phòng người này phụ trách |

## `tai_khoan` — Tài khoản đăng nhập

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `ten_dang_nhap` | String | Không NULL |
| `mat_khau_bam` | String | Không NULL |
| `ten_hien_thi` | String | Không NULL |
| `cho_phep_dang_nhap` | Boolean | Không NULL · Có mặc định |
| `phien_ban_dang_nhap` | Int | Không NULL · Có mặc định |
| `bat_buoc_doi_mat_khau` | Boolean | Mặc định false; true với mật khẩu tạm mới/reset, chặn nghiệp vụ tới khi đổi mật khẩu |
| `company_id` | Int | Không NULL |
| `employee_id` | Int | Có thể trống |
| `created_at` | DateTime | Không NULL · Có mặc định |
| `updated_at` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `nhan_su` | `nhan_su` | Một bản ghi hoặc trống |
| `danh_sach_vai_tro` | `tai_khoan_vai_tro` | Danh sách |
| `danh_sach_nhat_ky` | `nhat_ky_hoat_dong` | Danh sách |

## `vai_tro` — Vai trò

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `ma_vai_tro` | String | Không NULL |
| `ten_vai_tro` | String | Không NULL |
| `mo_ta` | String | Có thể trống |
| `la_vai_tro_he_thong` | Boolean | Không NULL · Có mặc định |
| `company_id` | Int | Không NULL |
| `created_at` | DateTime | Không NULL · Có mặc định |
| `updated_at` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `danh_sach_quyen` | `vai_tro_quyen` | Danh sách |
| `danh_sach_tai_khoan` | `tai_khoan_vai_tro` | Danh sách |

## `quyen` — Quyền thao tác

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `phan_he` | String | Không NULL |
| `hanh_dong` | String | Không NULL |
| `ten_quyen` | String | Không NULL |
| `mo_ta` | String | Có thể trống |
| `pham_vi` | String | Không NULL · Có mặc định |
| `created_at` | DateTime | Không NULL · Có mặc định |
| `updated_at` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `danh_sach_vai_tro` | `vai_tro_quyen` | Danh sách |

## `vai_tro_quyen` — Quyền được cấp cho vai trò

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `role_id` | Int | Không NULL |
| `permission_id` | Int | Không NULL |
| `thoi_diem_gan` | DateTime | Không NULL · Có mặc định |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `vai_tro` | `vai_tro` | Một bản ghi |
| `quyen` | `quyen` | Một bản ghi |

## `tai_khoan_vai_tro` — Vai trò được gán cho tài khoản

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `account_id` | Int | Không NULL |
| `role_id` | Int | Không NULL |
| `la_vai_tro_chinh` | Boolean | Không NULL · Có mặc định |
| `thoi_diem_gan` | DateTime | Không NULL · Có mặc định |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `tai_khoan` | `tai_khoan` | Một bản ghi |
| `vai_tro` | `vai_tro` | Một bản ghi |

## `nhat_ky_hoat_dong` — Nhật ký hoạt động

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `id` | Int | Khóa chính · Có mặc định |
| `account_id` | Int | Có thể trống |
| `ten_dang_nhap` | String | Không NULL |
| `ho_ten` | String | Không NULL |
| `hanh_dong` | String | Không NULL |
| `phan_he` | String | Không NULL |
| `doi_tuong_id` | String | Có thể trống |
| `ten_doi_tuong` | String | Có thể trống |
| `mo_ta` | String | Không NULL |
| `du_lieu_cu` | Json | Có thể trống |
| `du_lieu_moi` | Json | Có thể trống |
| `dia_chi_ip` | String | Có thể trống |
| `thong_tin_trinh_duyet` | String | Có thể trống |
| `company_id` | Int | Không NULL |
| `created_at` | DateTime | Không NULL · Có mặc định |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `tai_khoan` | `tai_khoan` | Một bản ghi hoặc trống |
| `cong_ty` | `cong_ty` | Một bản ghi |

## Quy tắc dữ liệu cần giữ

- `nhan_su.ma_nhan_su` tự cấp bởi `tao_ma_nhan_su()`, duy nhất trong công ty, không được sửa; FK dùng `id`. Không reset sequence để lấp số trống.
- `nhan_su.tinh_trang_lam_viec`: ACTIVE = đang làm, LEFT = nghỉ việc, UNKNOWN = chưa xác nhận; lưu riêng với `tai_khoan.cho_phep_dang_nhap`. Từ 04/11/2026, lưu LEFT qua ERP tự khóa tài khoản và thu hồi phiên, không tự mở lại khi ACTIVE. Sửa trực tiếp DB không chạy action/audit; session vẫn chặn nhân sự LEFT.
- Phòng ban và nhân sự quản lý độc lập trong ERP sau khởi tạo. Metadata nguồn chỉ giữ lịch sử, không khóa sửa/đồng bộ 1Office. `ghi_chu` là ghi chú vận hành; `ghi_chu_nhan_su_hr` là ghi chú nguồn.
- FK nhân sự–phòng ban và tài khoản–nhân sự dùng cặp định danh + công ty. Mọi truy vấn nghiệp vụ cần giới hạn công ty từ phiên đăng nhập.
- `tai_khoan_vai_tro` và `vai_tro_quyen` dùng khóa chính kép; mỗi cặp chỉ xuất hiện một lần. `la_vai_tro_chinh` không thay thế phép cộng quyền từ các vai trò.
- Schema tài sản cũ đã gỡ ngày 31/10/2026; không khôi phục bằng seed. Hai bảng mức 1 mới được triển khai độc lập ngày 11/11/2026 theo plan tài sản.

## Lịch sử chuyển tên

- 22/10: migration `20261022090000_viet_hoa_ten_bang_va_cot` Việt hóa tên vật lý.
- 03/11: migration `20261103090000_thong_nhat_ten_nghiep_vu` thống nhất tên tài khoản/mã nhân sự và các cột nghiệp vụ; giữ nguyên dữ liệu.
- 03/11, theo yêu cầu tiếp theo: đổi cả model/field Prisma thành tên vật lý hiện hành, bao gồm quan hệ trong Studio. Không cần migration mới vì Prisma diff không có DDL. Không sửa migration lịch sử; chúng vẫn chứa tên của thời điểm áp dụng.
