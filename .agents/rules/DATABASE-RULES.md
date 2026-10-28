# QUY TRÌNH & RÀNG BUỘC CƠ SỞ DỮ LIỆU (DATABASE RULES)

## 5. Nhân sự và tài khoản — áp dụng 26/10/2026

- Hồ sơ người thật nằm ở `Employee`/`nhan_su`; `User`/`nguoi_dung` chỉ là tài khoản. `User.employeeId` nullable để giữ tài khoản hệ thống; không đặt unique vì một người có nhiều tài khoản.
- Khóa ngoại kép `(departmentId, companyId)` và `(employeeId, companyId)` bảo đảm nhân sự–phòng ban và tài khoản–nhân sự cùng công ty. Mã nhân viên và định danh nguồn duy nhất trong công ty.
- `Employee.employmentStatus` (ACTIVE/LEFT/UNKNOWN) độc lập `User.isActive`. Không dùng số tài khoản/role làm số người. Không suy nghỉ việc từ tài khoản khóa hoặc thiếu trong một export.
- Các cột `User.legacy*` giữ nguyên dữ liệu cũ, `@ignore` trong Prisma; không dùng làm nguồn sống, không xóa khi chưa được duyệt. `displayName` chỉ là nhãn tài khoản, tên người lấy từ `employee.fullName`.
- Người giữ tài sản, người nhận bàn giao và kỹ thuật viên tham chiếu Employee. Người tạo bàn giao, người ghi nhận vị trí, người báo yêu cầu trong ứng dụng và AuditLog vẫn tham chiếu tài khoản User.
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

## 6. Danh sách HR chính thức — 27/10/2026

- **Quyết định người phụ trách 27/10/2026:** `DS_nhan_su_Sao_Do_26.10.2026.xlsx` là nguồn chuẩn ưu tiên về độ chính xác cho danh sách 72 người, họ tên, ngày sinh, phòng ban được gán, chức danh và ghi chú. Khi các trường này khác export 1Office, dùng giá trị HR final; không yêu cầu xác nhận lại chỉ vì nguồn cũ khác.
- Export/API 1Office, kể cả bản mới hơn, không tự giành quyền ưu tiên đối với các trường HR đã chốt. Phải trình chênh lệch để người phụ trách/HR chốt bản cập nhật hoặc thay đổi nguồn chuẩn. Trường không có trong file final có thể giữ thông tin nguồn cũ kèm nguồn gốc, không coi là đã được HR xác nhận.
- `hrSourceFile/hrSnapshotAt/hrNotes` độc lập mapping 1Office; không gán STT Excel thành mã người hay ID nguồn. Công ty chưa dùng mã nhân sự; mã SDG tự sinh không phải mã chính thức HR cấp.
- Phân biệt độ chính xác của hồ sơ HR với độ chắc chắn của liên kết nguồn: ưu tiên final không đồng nghĩa đã xác nhận hồ sơ chung “Nhân viên IT”, “Lễ tân” hoặc người trùng tên thuộc tài khoản nào. Không tự gộp hồ sơ/chuyển tài khoản từ quyết định ưu tiên dữ liệu.
- 8 hồ sơ cũ ngoài danh sách final chỉ phục vụ lưu trữ/đối chiếu, không cộng vào 72 người chuẩn. Cây đơn vị 1Office và tài khoản/quyền vẫn là dữ liệu riêng; phòng ban gán cho từng người theo final, không suy bộ phận con nếu final không nêu.
- Giữ ID/mã ERP đã có, mã mới do ERP cấp; ghép tên không được tự gộp trường hợp trùng/khác cách viết. Mapping đặc biệt đã rà soát nằm trong importer của snapshot này.
- Danh sách final xác nhận người hiện tại: hồ sơ ACTIVE vắng mặt chuyển UNKNOWN để đối chiếu, không chuyển LEFT hoặc khóa tài khoản. Giữ LEFT đã xác nhận. Ghi chú thời hạn tương lai không kích hoạt nghỉ việc tự động.
- Đọc ngày Excel từ serial thành UTC calendar date; không dùng local Date rồi cắt ISO. Nhập theo transaction, backup, audit và kiểm tra dữ liệu bảo toàn.
- Đồng bộ 1Office tương lai phải so sánh với nguồn HR đã chốt, không ghi đè âm thầm. Script này chỉ phục vụ đúng file đã kiểm hash, không dùng như importer tổng quát.

## 7. Phòng ban và chức danh — yêu cầu cập nhật 27/10/2026

- Phòng ban của người tham chiếu một nút có sẵn trong cây cơ cấu cùng công ty; không dùng text chức danh để tạo/suy phòng ban. File HR là căn cứ gán ban đầu vào cơ cấu, không thay thế cây đơn vị.
- Chức danh là text có thể chỉnh nội bộ bởi người có quyền, kể cả hồ sơ có nguồn HR/1Office; file final cung cấp giá trị ban đầu. Ghi audit sửa đổi và tránh import sau ghi đè sửa tay. Không dùng chức danh như role hoặc quyền truy cập.
- Quyết định mới 27/10/2026: giữ `employeeCode` bắt buộc, duy nhất trong công ty; ERP tự cấp, không bắt nhập tay. Đây là mã nội bộ ERP phục vụ Excel, không phải mã HR/1Office. Giữ ổn định, không đổi theo tên/phòng ban và không cấp lại cho người khác. FK vẫn dùng `Employee.id`. Có thể ẩn mã ở UI; export phục vụ cập nhật phải giữ mã dạng text. Import có mã đối chiếu trong công ty, báo mã lạ/trùng hoặc mâu thuẫn danh tính; file không mã cần đối chiếu ban đầu. Không lấy STT Excel làm mã.
- Trạng thái triển khai: các yêu cầu này đã ghi nhận, UI/backend đang khóa chức danh và còn bắt mã; xem phương án khởi tạo lại trong HR-CHECKLIST. Không nhầm phần thiết kế với trạng thái code hiện tại.
