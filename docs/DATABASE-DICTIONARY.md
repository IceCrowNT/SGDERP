# Từ điển dữ liệu — PostgreSQL và Prisma Studio

Cập nhật 03/11/2026: **tên model và trường Prisma trùng tên bảng và cột PostgreSQL**, dùng tiếng Việt không dấu, snake_case. Prisma Studio 5555 hiển thị trực tiếp các tên này. Quy ước cũ giữ Employee/User/fullName trong Prisma đã được thay thế theo yêu cầu người phụ trách.

## Danh mục hiện hành

| Chức năng / ý nghĩa | Tên chung PostgreSQL và Prisma Studio | Model Prisma trước đây |
| --- | --- | --- |
| Công ty | `cong_ty` | Company |
| Phòng ban | `phong_ban` | Department |
| Hồ sơ nhân sự | `nhan_su` | Employee |
| Tài khoản đăng nhập | `tai_khoan` | User |
| Vai trò | `vai_tro` | Role |
| Quyền thao tác | `quyen` | Permission |
| Quyền được cấp cho vai trò | `vai_tro_quyen` | RolePermission |
| Vai trò được gán cho tài khoản | `tai_khoan_vai_tro` | UserRole |
| Nhật ký hoạt động | `nhat_ky_hoat_dong` | AuditLog |

DB có 9 bảng nghiệp vụ, ngoài bảng hệ thống `_prisma_migrations`. Nhân sự là người thật; tài khoản dùng để đăng nhập. Một người có 0..N tài khoản; vai trò gắn từng tài khoản. Chức vụ text không cấp quyền và không xác định người phụ trách phòng. Cột người phụ trách và các bảng workflow vẫn chỉ là đề xuất trong [plan workflow](plans/WORKFLOW-CHECKLIST.md).

Các giá trị enum `ACTIVE / LEFT / UNKNOWN`, mã quyền `HR / VIEW / MANAGE`, constraint/index/sequence lịch sử và JSON nhật ký cũ được giữ nguyên. Đây không phải tên bảng/cột. Relation field của Prisma là liên kết, không tạo cột PostgreSQL; tên liên kết cũng dùng tiếng Việt.

Ví dụ truy vấn hiện hành:

```ts
await db.nhan_su.findMany({
  where: { dinh_danh_cong_ty: session.companyId },
  select: { dinh_danh: true, ma_nhan_su: true, ho_ten: true },
});
```

Form/session là hợp đồng ứng dụng riêng, có thể giữ tên như fullName/companyId; Server Action chuyển tường minh sang trường DB. Không tạo model hoặc lớp Prisma alias tiếng Anh song song. Nhãn người dùng trên ERP vẫn là tiếng Việt có dấu.

## `cong_ty` — Công ty

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh` | Int | Khóa chính · Có mặc định |
| `ten_cong_ty` | String | Không NULL |
| `ma_so_thue` | String | Có thể trống |
| `dia_chi` | String | Có thể trống |
| `dang_hoat_dong` | Boolean | Không NULL · Có mặc định |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |
| `thoi_diem_cap_nhat` | DateTime | Không NULL |

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
| `dinh_danh` | Int | Khóa chính · Có mặc định |
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
| `dinh_danh_phong_ban_cha` | Int | Có thể trống |
| `dinh_danh_cong_ty` | Int | Không NULL |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |
| `thoi_diem_cap_nhat` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `phong_ban_cha` | `phong_ban` | Một bản ghi hoặc trống |
| `phong_ban_con` | `phong_ban` | Danh sách |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `danh_sach_nhan_su` | `nhan_su` | Danh sách |

## `nhan_su` — Hồ sơ nhân sự

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh` | Int | Khóa chính · Có mặc định |
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
| `dinh_danh_cong_ty` | Int | Không NULL |
| `dinh_danh_phong_ban` | Int | Có thể trống |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |
| `thoi_diem_cap_nhat` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `phong_ban` | `phong_ban` | Một bản ghi hoặc trống |
| `danh_sach_tai_khoan` | `tai_khoan` | Danh sách |

## `tai_khoan` — Tài khoản đăng nhập

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh` | Int | Khóa chính · Có mặc định |
| `ten_dang_nhap` | String | Không NULL |
| `mat_khau_bam` | String | Không NULL |
| `ten_hien_thi` | String | Không NULL |
| `cho_phep_dang_nhap` | Boolean | Không NULL · Có mặc định |
| `phien_ban_dang_nhap` | Int | Không NULL · Có mặc định |
| `dinh_danh_cong_ty` | Int | Không NULL |
| `dinh_danh_nhan_su` | Int | Có thể trống |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |
| `thoi_diem_cap_nhat` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `nhan_su` | `nhan_su` | Một bản ghi hoặc trống |
| `danh_sach_vai_tro` | `tai_khoan_vai_tro` | Danh sách |
| `danh_sach_nhat_ky` | `nhat_ky_hoat_dong` | Danh sách |

## `vai_tro` — Vai trò

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh` | Int | Khóa chính · Có mặc định |
| `ma_vai_tro` | String | Không NULL |
| `ten_vai_tro` | String | Không NULL |
| `mo_ta` | String | Có thể trống |
| `la_vai_tro_he_thong` | Boolean | Không NULL · Có mặc định |
| `dinh_danh_cong_ty` | Int | Không NULL |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |
| `thoi_diem_cap_nhat` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `cong_ty` | `cong_ty` | Một bản ghi |
| `danh_sach_quyen` | `vai_tro_quyen` | Danh sách |
| `danh_sach_tai_khoan` | `tai_khoan_vai_tro` | Danh sách |

## `quyen` — Quyền thao tác

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh` | Int | Khóa chính · Có mặc định |
| `phan_he` | String | Không NULL |
| `hanh_dong` | String | Không NULL |
| `ten_quyen` | String | Không NULL |
| `mo_ta` | String | Có thể trống |
| `pham_vi` | String | Không NULL · Có mặc định |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |
| `thoi_diem_cap_nhat` | DateTime | Không NULL |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `danh_sach_vai_tro` | `vai_tro_quyen` | Danh sách |

## `vai_tro_quyen` — Quyền được cấp cho vai trò

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh_vai_tro` | Int | Không NULL |
| `dinh_danh_quyen` | Int | Không NULL |
| `thoi_diem_gan` | DateTime | Không NULL · Có mặc định |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `vai_tro` | `vai_tro` | Một bản ghi |
| `quyen` | `quyen` | Một bản ghi |

## `tai_khoan_vai_tro` — Vai trò được gán cho tài khoản

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh_tai_khoan` | Int | Không NULL |
| `dinh_danh_vai_tro` | Int | Không NULL |
| `la_vai_tro_chinh` | Boolean | Không NULL · Có mặc định |
| `thoi_diem_gan` | DateTime | Không NULL · Có mặc định |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `tai_khoan` | `tai_khoan` | Một bản ghi |
| `vai_tro` | `vai_tro` | Một bản ghi |

## `nhat_ky_hoat_dong` — Nhật ký hoạt động

| Cột PostgreSQL = trường Prisma Studio | Kiểu Prisma | Yêu cầu |
| --- | --- | --- |
| `dinh_danh` | Int | Khóa chính · Có mặc định |
| `dinh_danh_tai_khoan` | Int | Có thể trống |
| `ten_dang_nhap` | String | Không NULL |
| `ho_ten` | String | Không NULL |
| `hanh_dong` | String | Không NULL |
| `phan_he` | String | Không NULL |
| `dinh_danh_doi_tuong` | String | Có thể trống |
| `ten_doi_tuong` | String | Có thể trống |
| `mo_ta` | String | Không NULL |
| `du_lieu_cu` | Json | Có thể trống |
| `du_lieu_moi` | Json | Có thể trống |
| `dia_chi_ip` | String | Có thể trống |
| `thong_tin_trinh_duyet` | String | Có thể trống |
| `dinh_danh_cong_ty` | Int | Không NULL |
| `thoi_diem_tao` | DateTime | Không NULL · Có mặc định |

| Liên kết trong Prisma Studio (không phải cột vật lý) | Bảng đích | Quan hệ |
| --- | --- | --- |
| `tai_khoan` | `tai_khoan` | Một bản ghi hoặc trống |
| `cong_ty` | `cong_ty` | Một bản ghi |

## Quy tắc dữ liệu cần giữ

- `nhan_su.ma_nhan_su` tự cấp bởi `tao_ma_nhan_su()`, duy nhất trong công ty, không được sửa; FK dùng `dinh_danh`. Không reset sequence để lấp số trống.
- `nhan_su.tinh_trang_lam_viec`: ACTIVE = đang làm, LEFT = nghỉ việc, UNKNOWN = chưa xác nhận; độc lập với `tai_khoan.cho_phep_dang_nhap`.
- Phòng ban và nhân sự quản lý độc lập trong ERP sau khởi tạo. Metadata nguồn chỉ giữ lịch sử, không khóa sửa/đồng bộ 1Office. `ghi_chu` là ghi chú vận hành; `ghi_chu_nhan_su_hr` là ghi chú nguồn.
- FK nhân sự–phòng ban và tài khoản–nhân sự dùng cặp định danh + công ty. Mọi truy vấn nghiệp vụ cần giới hạn công ty từ phiên đăng nhập.
- `tai_khoan_vai_tro` và `vai_tro_quyen` dùng khóa chính kép; mỗi cặp chỉ xuất hiện một lần. `la_vai_tro_chinh` không thay thế phép cộng quyền từ các vai trò.
- Bảng tài sản đã gỡ ngày 31/10/2026; không tự khôi phục khi seed hoặc migrate.

## Lịch sử chuyển tên

- 22/10: migration `20261022090000_viet_hoa_ten_bang_va_cot` Việt hóa tên vật lý.
- 03/11: migration `20261103090000_thong_nhat_ten_nghiep_vu` thống nhất tên tài khoản/mã nhân sự và các cột nghiệp vụ; giữ nguyên dữ liệu.
- 03/11, theo yêu cầu tiếp theo: đổi cả model/field Prisma thành tên vật lý hiện hành, bao gồm quan hệ trong Studio. Không cần migration mới vì Prisma diff không có DDL. Không sửa migration lịch sử; chúng vẫn chứa tên của thời điểm áp dụng.
