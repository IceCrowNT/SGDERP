# QUY TRÌNH & RÀNG BUỘC CƠ SỞ DỮ LIỆU (DATABASE RULES)

## 5. Nhân sự và tài khoản — áp dụng 26/10/2026

- Hồ sơ người thật nằm ở `Employee`/`nhan_su`; `User`/`nguoi_dung` chỉ là tài khoản. `User.employeeId` nullable để giữ tài khoản hệ thống; không đặt unique vì một người có nhiều tài khoản.
- Khóa ngoại kép `(departmentId, companyId)` và `(employeeId, companyId)` bảo đảm nhân sự–phòng ban và tài khoản–nhân sự cùng công ty. Mã nhân viên và định danh nguồn duy nhất trong công ty.
- `Employee.employmentStatus` (ACTIVE/LEFT/UNKNOWN) độc lập `User.isActive`. Không dùng số tài khoản/role làm số người. Không suy nghỉ việc từ tài khoản khóa hoặc thiếu trong một export.
- Đã bỏ 9 cột `User.legacy*` sau backup và yêu cầu làm sạch 28/10/2026. `displayName` / `ten_hien_thi` chỉ là nhãn tài khoản; tên người lấy từ `employee.fullName`. Không thêm lại hồ sơ người vào bảng tài khoản.
- AuditLog tham chiếu tài khoản User. Các bảng và quan hệ tài sản đã gỡ theo yêu cầu 31/10/2026; không tự phục hồi chúng khi làm việc với HR/tài khoản.
- Migration chuyển đổi dùng workbook 14/10/2026; mã SDG-074 có tên nguồn chung, giữ tên ERP hiện có. Không chạy lại seed để chuyển đổi DB; seed mới nhập hồ sơ mà không tạo tài khoản hàng loạt.


Tệp quy tắc này định hướng mọi hoạt động liên quan đến Prisma ORM và Database. Mọi AI Agent tham gia vào codebase phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

## 1. Cơ chế Đồng bộ Database
- **CẤM:** Không bao giờ sử dụng lệnh `npx prisma db push` trong quá trình phát triển thông thường. Việc này sẽ phá hủy lịch sử di trú và gây mất dữ liệu ở các môi trường staging/production.
- **BẮT BUỘC:** Mọi thay đổi schema (thêm cột, sửa bảng) đều phải sử dụng `npx prisma migrate dev --name <ten_thay_doi>`.
- Nếu môi trường không tương tác khiến `migrate dev --create-only` bị từ chối: được tạo thư mục migration/SQL tường minh, kiểm tra SQL bảo toàn dữ liệu rồi áp dụng bằng `prisma migrate deploy`. Không dùng reset hoặc `db push` để vượt qua lỗi này.
- Khóa cứng Prisma Version ở v6.x (Hiện tại là `6.19.3`). Tuyệt đối không tự ý nâng cấp lên Prisma 7/8.

## 2. Tiêu chuẩn Thiết kế Lược đồ (Prisma Schema)
- **Primary Key:** Mọi bảng sử dụng số nguyên tự tăng `id Int @id @default(autoincrement())` để tối ưu trực quan khi rà soát dữ liệu CSDL nội bộ, giảm dung lượng chỉ mục và tăng tốc độ JOIN.
- **Audit Columns:** Mọi bảng Dữ liệu nghiệp vụ (Master & Transactional Data) đều bắt buộc phải có:
  ```prisma
  createdAt DateTime @default(now()) @map("thoi_diem_tao")
  updatedAt DateTime @updatedAt @map("thoi_diem_cap_nhat")
  ```
- **Naming Conventions:**
  - **Tên vật lý PostgreSQL:** tất cả bảng và cột nghiệp vụ dùng tiếng Việt không dấu, `snake_case`; ví dụ `phong_ban`, `ten`, `dinh_danh_cong_ty`, `thoi_diem_tao`. Tra [từ điển dữ liệu](../../docs/DATABASE-DICTIONARY.md) trước khi đặt tên mới.
  - Dùng `@@map` cho bảng và `@map` cho mọi cột scalar trong Prisma. Relation field không tạo cột vật lý nên không dùng `@map`.
  - Tên model/field trong TypeScript/Prisma tiếp tục theo quy ước dưới đây. Các tài liệu dùng tên như `Department.companyId` đang nói về API Prisma; tên PostgreSQL tương ứng là `phong_ban.dinh_danh_cong_ty`.
  - Với DB hiện có, đổi tên bằng migration `ALTER TABLE ... RENAME TO`/`RENAME COLUMN`, không drop/create bảng hoặc cột. Tạo migration bằng `migrate dev --create-only`, sửa SQL được sinh thành rename trước khi áp dụng. Không sửa migration đã chạy.
  - Giữ tên constraint/index/sequence cũ khi đổi tên bảng/cột; khai báo `map:` để Prisma không tự đổi các ràng buộc. Bảng hệ thống `_prisma_migrations`, enum và giá trị enum/JSON không thuộc phạm vi đổi tên bảng/cột nghiệp vụ.
  - `Model`: PascalCase, Danh từ số ít (Ví dụ: `User`, `Task`, `Department`).
  - `Field`: camelCase (Ví dụ: `companyId`, `dateOfBirth`).
  - `Relation Field`: Số nhiều cho quan hệ 1-N (Ví dụ: `users User[]`), Số ít cho quan hệ 1-1/N-1 (Ví dụ: `company Company`).

## 3. Quản lý Chỉ mục & Ràng buộc (Indexes & Constraints)
- Bắt buộc khai báo `@unique` cho các mã nghiệp vụ (Ví dụ: `employeeCode`, `taxCode`).
- Các Foreign Key phải khai báo rõ `onDelete: Cascade` hoặc `Restrict` tùy theo luồng nghiệp vụ. Mặc định dùng Cascade cho các bảng con trực thuộc (ví dụ Task bị xóa thì TaskChecklist bị Cascade theo).

## 4. Bảo mật kết nối
- Chuỗi kết nối Database `DATABASE_URL` bắt buộc phải đặt trong tệp `.env`.
- Không hardcode mật khẩu, username hay cấu hình kết nối trong bất kỳ file TypeScript hay Script nào.

## 6. HR hoạt động độc lập — áp dụng 28/10/2026

- Dữ liệu 1Office chỉ là nguồn khởi tạo/đối chiếu ban đầu. File `DS_nhan_su_Sao_Do_26.10.2026.xlsx` xác nhận baseline 72 người; sau đó ERP là nơi quản lý hồ sơ hiện hành. Không tự đồng bộ hoặc nhập lại nguồn để ghi đè sửa đổi nội bộ.
- `hrSourceFile/hrSnapshotAt/hrNotes` và `externalSystem/externalId/externalSnapshotAt` chỉ là provenance lịch sử, không khóa trường hoặc cấp quyền. `notes` / `ghi_chu` là ghi chú vận hành chỉnh được; ban đầu sao từ ghi chú HR. Không coi mapping nguồn mơ hồ là đã xác nhận danh tính.
- HR MANAGE được sửa tên/chức danh/phòng ban/liên hệ/ngày/tình trạng/ghi chú trong cùng công ty, có audit. Chọn phòng ban theo cây; không suy quyền từ chức danh hoặc trạng thái làm việc.
- 8 hồ sơ ngoài final và 8 tài khoản tương ứng đã bỏ theo yêu cầu làm sạch sau backup; giữ ID/mã của 72 người và 60 tài khoản còn lại. Không tự tái tạo dữ liệu đó từ seed cũ.
- Seed HR chỉ bootstrap khi chưa có hồ sơ và chưa có marker khởi tạo; chạy lại không ghi đè, không bổ sung người vắng và không tạo tài khoản hàng loạt. Importer snapshot cũ đã ngừng sử dụng.
- Đọc ngày Excel theo UTC calendar date, không đổi ngày vì timezone. File final không có mã; STT không dùng làm định danh.

## 7. Phòng ban và chức danh — yêu cầu cập nhật 27/10/2026

- Phòng ban của người tham chiếu một nút có sẵn trong cây cơ cấu cùng công ty; không dùng text chức danh để tạo/suy phòng ban. File HR là căn cứ gán ban đầu vào cơ cấu, không thay thế cây đơn vị.
- Chức danh là text có thể chỉnh nội bộ bởi người có quyền, kể cả hồ sơ có nguồn HR/1Office; file final cung cấp giá trị ban đầu. Ghi audit sửa đổi và tránh import sau ghi đè sửa tay. Không dùng chức danh như role hoặc quyền truy cập.
- Quyết định mới 27/10/2026: giữ `employeeCode` bắt buộc, duy nhất trong công ty; ERP tự cấp, không bắt nhập tay. Đây là mã nội bộ ERP phục vụ Excel, không phải mã HR/1Office. Giữ ổn định, không đổi theo tên/phòng ban và không cấp lại cho người khác. FK vẫn dùng `Employee.id`. Có thể ẩn mã ở UI; export phục vụ cập nhật phải giữ mã dạng text. Import có mã đối chiếu trong công ty, báo mã lạ/trùng hoặc mâu thuẫn danh tính; file không mã cần đối chiếu ban đầu. Không lấy STT Excel làm mã.
- Đã triển khai ngày 28/10/2026: mã tự sinh bằng sequence `so_thu_tu_ma_nhan_su` và default `tao_ma_nhan_su()`; trigger `ma_nhan_su_bat_bien` chặn thay đổi mã tại DB. Action không nhận mã từ client. Sequence chỉ tăng, có thể nhảy số khi rollback/xóa, không reset để lấp chỗ trống. Mã không chứa mã phòng ban.
- UI/backend đã bỏ khóa nguồn, bắt chọn phòng ban hợp lệ và cho sửa ghi chú; không tự đổi tài khoản khi sửa hồ sơ.

## 8. Phạm vi DB hiện hành — 31/10/2026

- Chỉ còn 9 bảng nghiệp vụ cho công ty, cơ cấu, nhân sự, tài khoản, vai trò, quyền, hai bảng nối và nhật ký. Bảng tài sản cùng enum đã gỡ bằng migration, không xóa migration lịch sử.
- Role là nhóm quyền; Permission là quyền đơn lẻ; RolePermission gán quyền vào nhóm; UserRole gán nhóm cho tài khoản. Giữ hai bảng nối nhiều–nhiều, không gộp chỉ vì giao diện Studio khó đọc.
- Lần gỡ tài sản không thay quyền/tài khoản/nhân sự. Các điểm cần chỉnh RBAC được lưu trong ROLE-MANAGEMENT-CHECKLIST, không coi là đã triển khai.
