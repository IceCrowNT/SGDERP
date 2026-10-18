# QUY TRÌNH & RÀNG BUỘC CƠ SỞ DỮ LIỆU (DATABASE RULES)

Tệp quy tắc này định hướng mọi hoạt động liên quan đến Prisma ORM và Database. Mọi AI Agent tham gia vào codebase phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

## 1. Cơ chế Đồng bộ Database
- **CẤM:** Không bao giờ sử dụng lệnh `npx prisma db push` trong quá trình phát triển thông thường. Việc này sẽ phá hủy lịch sử di trú và gây mất dữ liệu ở các môi trường staging/production.
- **BẮT BUỘC:** Mọi thay đổi schema (thêm cột, sửa bảng) đều phải sử dụng `npx prisma migrate dev --name <ten_thay_doi>`.
- Khóa cứng Prisma Version ở v6.x (Hiện tại là `6.19.3`). Tuyệt đối không tự ý nâng cấp lên Prisma 7/8.

## 2. Tiêu chuẩn Thiết kế Lược đồ (Prisma Schema)
- **Primary Key:** Mọi bảng phải sử dụng `id String @id @default(uuid())`. Không dùng auto-increment integer trừ khi có yêu cầu nghiệp vụ bắt buộc.
- **Audit Columns:** Mọi bảng Dữ liệu nghiệp vụ (Master & Transactional Data) đều bắt buộc phải có:
  ```prisma
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ```
- **Naming Conventions:**
  - `Model`: PascalCase, Danh từ số ít (Ví dụ: `User`, `Task`, `Department`).
  - `Field`: camelCase (Ví dụ: `companyId`, `dateOfBirth`).
  - `Relation Field`: Số nhiều cho quan hệ 1-N (Ví dụ: `users User[]`), Số ít cho quan hệ 1-1/N-1 (Ví dụ: `company Company`).

## 3. Quản lý Chỉ mục & Ràng buộc (Indexes & Constraints)
- Bắt buộc khai báo `@unique` cho các mã nghiệp vụ (Ví dụ: `employeeCode`, `taxCode`).
- Các Foreign Key phải khai báo rõ `onDelete: Cascade` hoặc `Restrict` tùy theo luồng nghiệp vụ. Mặc định dùng Cascade cho các bảng con trực thuộc (ví dụ Task bị xóa thì TaskChecklist bị Cascade theo).

## 4. Bảo mật kết nối
- Chuỗi kết nối Database `DATABASE_URL` bắt buộc phải đặt trong tệp `.env`.
- Không hardcode mật khẩu, username hay cấu hình kết nối trong bất kỳ file TypeScript hay Script nào.
