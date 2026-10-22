# QUY TRÌNH & RÀNG BUỘC CƠ SỞ DỮ LIỆU (DATABASE RULES)

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
