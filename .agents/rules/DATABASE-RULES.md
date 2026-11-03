# QUY TRÌNH & RÀNG BUỘC CƠ SỞ DỮ LIỆU (DATABASE RULES)

## Đồng nhất tên Prisma Studio và PostgreSQL — 03/11/2026

- Yêu cầu mới đã thay quy ước giữ model/field tiếng Anh: tên ở cả hai lớp phải đồng nhất. Đổi tên API Prisma nhưng giữ nguyên tên vật lý thì chỉ generate client, kiểm tra migrate diff; không tạo migration rỗng hoặc đụng dữ liệu.

## Tên theo nghĩa nghiệp vụ — 03/11/2026

- Hồ sơ người thật là `nhan_su`; tài khoản đăng nhập là `tai_khoan`; gán vai trò cho tài khoản là `tai_khoan_vai_tro`. Không dùng lại tên vật lý cũ `nguoi_dung` cho bảng hiện hành.
- Mã hiển thị “Mã nhân sự” là `ma_nhan_su`; trạng thái tài khoản “Cho phép đăng nhập” là `cho_phep_dang_nhap`, độc lập `nhan_su.tinh_trang_lam_viec`. Mã/tên đối tượng phải rõ nghĩa: `ma_phong_ban`, `ten_phong_ban`, `ma_vai_tro`, `ten_vai_tro`, `ten_quyen`.
- FK tài khoản dùng `dinh_danh_tai_khoan`, FK phòng ban cha dùng `dinh_danh_phong_ban_cha`. Từ điển DB là bảng đối chiếu nhãn UI – tên PostgreSQL – API Prisma.
- Khi rename cột được dùng trong hàm/trigger SQL, phải sửa thân hàm trong cùng migration; PostgreSQL không tự viết lại tên field trong thân PL/pgSQL. Giữ tên constraint/index/sequence lịch sử và ghim `map:` khi tên mặc định Prisma thay đổi.
- Đổi tên không đổi quyền, tên vai trò, người được gán, ID hoặc mã đã cấp. Chức vụ text không phải vai trò; quan hệ phụ trách phòng và quyền tài khoản độc lập.


## Phòng ban độc lập — áp dụng 03/11/2026

- ERP là nơi quản lý cây phòng ban hiện hành; các trường nguồn chỉ là lịch sử nhập, không khóa tên/phòng ban cha hoặc yêu cầu khớp 1Office. Không chạy lại script đồng bộ đã ngừng.
- Tạo/sửa/xóa phòng ban qua HR MANAGE, cùng công ty; mã unique trong công ty. Chặn chọn chính mình/đơn vị con làm cha và chặn phong_ban_cha khác công ty. Khóa hàng cong_ty trong transaction cho mọi mutation cơ cấu để tránh vòng lặp do đổi cha đồng thời.
- Chỉ xóa khi không còn con hoặc nhân sự ở mọi trạng thái. Khóa hàng phòng ban trước kiểm tra/xóa, không dựa vào FK SetNull để tự đẩy con ra cấp công ty. Mutation và nhat_ky_hoat_dong cùng transaction.
- Seed chỉ khởi tạo cây khi công ty chưa có phòng ban, nhân sự hoặc nhật ký DEPARTMENT; không tái tạo đơn vị người dùng đã đổi mã/xóa. Giữ ID người/phòng/tài khoản và metadata nguồn hiện có.

## 5. Nhân sự và tài khoản — áp dụng 26/10/2026

- Hồ sơ người thật nằm ở `nhan_su`; `tai_khoan` chỉ là tài khoản. `tai_khoan.dinh_danh_nhan_su` nullable để giữ tài khoản hệ thống; không đặt unique vì một người có nhiều tài khoản.
- Khóa ngoại kép `(dinh_danh_phong_ban, dinh_danh_cong_ty)` và `(dinh_danh_nhan_su, dinh_danh_cong_ty)` bảo đảm nhân sự–phòng ban và tài khoản–nhân sự cùng công ty. Mã nhân viên và định danh nguồn duy nhất trong công ty.
- `nhan_su.tinh_trang_lam_viec` (ACTIVE/LEFT/UNKNOWN) độc lập `tai_khoan.cho_phep_dang_nhap`. Không dùng số tài khoản/vai_tro làm số người. Không suy nghỉ việc từ tài khoản khóa hoặc thiếu trong một export.
- Đã bỏ 9 cột `tai_khoan.legacy*` sau backup và yêu cầu làm sạch 28/10/2026. `ten_hien_thi` chỉ là nhãn tài khoản; tên người lấy từ `nhan_su.ho_ten`. Không thêm lại hồ sơ người vào bảng tài khoản.
- nhat_ky_hoat_dong tham chiếu tài khoản tai_khoan. Các bảng và quan hệ tài sản đã gỡ theo yêu cầu 31/10/2026; không tự phục hồi chúng khi làm việc với HR/tài khoản.
- Migration chuyển đổi dùng workbook 14/10/2026; mã SDG-074 có tên nguồn chung, giữ tên ERP hiện có. Không chạy lại seed để chuyển đổi DB; seed mới nhập hồ sơ mà không tạo tài khoản hàng loạt.


Tệp quy tắc này định hướng mọi hoạt động liên quan đến Prisma ORM và Database. Mọi AI Agent tham gia vào codebase phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

## 1. Cơ chế Đồng bộ Database
- **CẤM:** Không bao giờ sử dụng lệnh `npx prisma db push` trong quá trình phát triển thông thường. Việc này sẽ phá hủy lịch sử di trú và gây mất dữ liệu ở các môi trường staging/production.
- **BẮT BUỘC:** Mọi thay đổi schema (thêm cột, sửa bảng) đều phải sử dụng `npx prisma migrate dev --name <ten_thay_doi>`.
- Nếu môi trường không tương tác khiến `migrate dev --create-only` bị từ chối: được tạo thư mục migration/SQL tường minh, kiểm tra SQL bảo toàn dữ liệu rồi áp dụng bằng `prisma migrate deploy`. Không dùng reset hoặc `db push` để vượt qua lỗi này.
- Khóa cứng Prisma Version ở v6.x (Hiện tại là `6.19.3`). Tuyệt đối không tự ý nâng cấp lên Prisma 7/8.

## 2. Tiêu chuẩn Thiết kế Lược đồ (Prisma Schema)
- **Primary Key:** Bảng nghiệp vụ sử dụng số nguyên tự tăng `dinh_danh Int @id @default(autoincrement())`. Hai bảng nối `tai_khoan_vai_tro` và `vai_tro_quyen` giữ khóa kép hiện hữu để chặn gán trùng; không thêm ID chỉ để đổi tên.
- **Audit Columns:** Mọi bảng Dữ liệu nghiệp vụ (Master & Transactional Data) đều bắt buộc phải có:
  ```prisma
  thoi_diem_tao DateTime @default(now())
  thoi_diem_cap_nhat DateTime @updatedAt
  ```
- **Naming Conventions:**
  - **Tên vật lý PostgreSQL:** tất cả bảng và cột nghiệp vụ dùng tiếng Việt không dấu, `snake_case`; ví dụ `phong_ban`, `ten_phong_ban`, `dinh_danh_cong_ty`, `thoi_diem_tao`. Tra [từ điển dữ liệu](../../docs/DATABASE-DICTIONARY.md) trước khi đặt tên mới.
  - Model Prisma và mọi trường scalar phải trùng chính xác tên bảng/cột PostgreSQL. Không dùng @map/@@map để duy trì hai bộ tên Anh–Việt. Giữ map: của constraint/index lịch sử; relation field không phải cột vật lý, cũng đặt tên tiếng Việt.
  - Prisma Client dùng trực tiếp `db.phong_ban`, `db.nhan_su`, `db.tai_khoan`; trường `dinh_danh_cong_ty` là cùng một tên trong schema, query và Studio. Form/session có hợp đồng riêng, chuyển tường minh tại Server Action; không thêm lớp alias Prisma tiếng Anh.
  - Với DB hiện có, đổi tên bằng migration `ALTER TABLE ... RENAME TO`/`RENAME COLUMN`, không drop/create bảng hoặc cột. Tạo migration bằng `migrate dev --create-only`, sửa SQL được sinh thành rename trước khi áp dụng. Không sửa migration đã chạy.
  - Giữ tên constraint/index/sequence cũ khi đổi tên bảng/cột; khai báo `map:` để Prisma không tự đổi các ràng buộc. Bảng hệ thống `_prisma_migrations`, enum và giá trị enum/JSON không thuộc phạm vi đổi tên bảng/cột nghiệp vụ.
  - `Model`: tiếng Việt không dấu snake_case, giống bảng (ví dụ `tai_khoan`, `nhan_su`, `phong_ban`).
  - `Field`: tiếng Việt không dấu snake_case, giống cột (ví dụ `dinh_danh_cong_ty`, `ngay_sinh`).
  - `Relation Field`: tên tiếng Việt rõ nghĩa; danh sách dùng `danh_sach_*`, cây dùng `phong_ban_cha`/`phong_ban_con`, liên kết một bản ghi như `cong_ty`, `nhan_su`, `vai_tro`.

## 3. Quản lý Chỉ mục & Ràng buộc (Indexes & Constraints)
- Bắt buộc khai báo `@unique` cho các mã nghiệp vụ (Ví dụ: `ma_nhan_su`, `ma_so_thue`).
- Các Foreign Key phải khai báo rõ `onDelete: Cascade` hoặc `Restrict` tùy theo luồng nghiệp vụ. Mặc định dùng Cascade cho các bảng con trực thuộc (ví dụ Task bị xóa thì TaskChecklist bị Cascade theo).

## 4. Bảo mật kết nối
- Chuỗi kết nối Database `DATABASE_URL` bắt buộc phải đặt trong tệp `.env`.
- Không hardcode mật khẩu, tên đăng nhập hay cấu hình kết nối trong bất kỳ file TypeScript hay Script nào.

## 6. HR hoạt động độc lập — áp dụng 28/10/2026

- Dữ liệu 1Office chỉ là nguồn khởi tạo/đối chiếu ban đầu. File `DS_nhan_su_Sao_Do_26.10.2026.xlsx` xác nhận baseline 72 người; sau đó ERP là nơi quản lý hồ sơ hiện hành. Không tự đồng bộ hoặc nhập lại nguồn để ghi đè sửa đổi nội bộ.
- `tep_nguon_nhan_su_hr/ngay_chot_nhan_su_hr/ghi_chu_nhan_su_hr` và `he_thong_nguon/dinh_danh_nguon/thoi_diem_chup_du_lieu_nguon` chỉ là provenance lịch sử, không khóa trường hoặc cấp quyền. `ghi_chu` là ghi chú vận hành chỉnh được; ban đầu sao từ ghi chú HR. Không coi mapping nguồn mơ hồ là đã xác nhận danh tính.
- HR MANAGE được sửa tên/chức danh/phòng ban/liên hệ/ngày/tình trạng/ghi chú trong cùng công ty, có audit. Chọn phòng ban theo cây; không suy quyền từ chức danh hoặc trạng thái làm việc.
- 8 hồ sơ ngoài final và 8 tài khoản tương ứng đã bỏ theo yêu cầu làm sạch sau backup; giữ ID/mã của 72 người và 60 tài khoản còn lại. Không tự tái tạo dữ liệu đó từ seed cũ.
- Seed HR chỉ bootstrap khi chưa có hồ sơ và chưa có marker khởi tạo; chạy lại không ghi đè, không bổ sung người vắng và không tạo tài khoản hàng loạt. Importer snapshot cũ đã ngừng sử dụng.
- Đọc ngày Excel theo UTC calendar date, không đổi ngày vì timezone. File final không có mã; STT không dùng làm định danh.

## 7. Phòng ban và chức danh — yêu cầu cập nhật 27/10/2026

- Phòng ban của người tham chiếu một nút có sẵn trong cây cơ cấu cùng công ty; không dùng text chức danh để tạo/suy phòng ban. File HR là căn cứ gán ban đầu vào cơ cấu, không thay thế cây đơn vị.
- Chức danh là text có thể chỉnh nội bộ bởi người có quyền, kể cả hồ sơ có nguồn HR/1Office; file final cung cấp giá trị ban đầu. Ghi audit sửa đổi và tránh import sau ghi đè sửa tay. Không dùng chức danh như vai_tro hoặc quyền truy cập.
- Quyết định mới 27/10/2026: giữ `ma_nhan_su` bắt buộc, duy nhất trong công ty; ERP tự cấp, không bắt nhập tay. Đây là mã nội bộ ERP phục vụ Excel, không phải mã HR/1Office. Giữ ổn định, không đổi theo tên/phòng ban và không cấp lại cho người khác. FK vẫn dùng `nhan_su.dinh_danh`. Có thể ẩn mã ở UI; export phục vụ cập nhật phải giữ mã dạng text. Import có mã đối chiếu trong công ty, báo mã lạ/trùng hoặc mâu thuẫn danh tính; file không mã cần đối chiếu ban đầu. Không lấy STT Excel làm mã.
- Đã triển khai ngày 28/10/2026: mã tự sinh bằng sequence `so_thu_tu_ma_nhan_su` và default `tao_ma_nhan_su()`; trigger `ma_nhan_su_bat_bien` chặn thay đổi mã tại DB. Action không nhận mã từ client. Sequence chỉ tăng, có thể nhảy số khi rollback/xóa, không reset để lấp chỗ trống. Mã không chứa mã phòng ban.
- UI/backend đã bỏ khóa nguồn, bắt chọn phòng ban hợp lệ và cho sửa ghi chú; không tự đổi tài khoản khi sửa hồ sơ.

## 8. Phạm vi DB hiện hành — 31/10/2026

- Chỉ còn 9 bảng nghiệp vụ cho công ty, cơ cấu, nhân sự, tài khoản, vai trò, quyền, hai bảng nối và nhật ký. Bảng tài sản cùng enum đã gỡ bằng migration, không xóa migration lịch sử.
- vai_tro là nhóm quyền; quyen là quyền đơn lẻ; vai_tro_quyen gán quyền vào nhóm; tai_khoan_vai_tro gán nhóm cho tài khoản. Giữ hai bảng nối nhiều–nhiều, không gộp chỉ vì giao diện Studio khó đọc.
- Lần gỡ tài sản không thay quyền/tài khoản/nhân sự. Các điểm cần chỉnh RBAC được lưu trong ROLE-MANAGEMENT-CHECKLIST, không coi là đã triển khai.
