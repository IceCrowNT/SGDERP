<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MASTER AGENT ROUTER (SDG ERP)

Tệp này là **Bộ định tuyến ngữ cảnh trung tâm (Thin Router)** cho mọi AI Agent làm việc trong dự án Sao Đỏ Group ERP.
Khi nhận bất kỳ yêu cầu nào, AI Agent BẮT BUỘC tra cứu bảng định tuyến dưới đây để nạp tệp quy tắc chuyên biệt tương ứng trước khi sinh mã.

---

## 1. Bảng Định Tuyến Ngữ Cảnh (Routing Table)

| Phạm Vi Yêu Cầu | Tệp Quy Tắc Cần Đọc (Bắt buộc) | Trọng Tâm Nghiệp Vụ (Tham chiếu nhanh) |
| :--- | :--- | :--- |
| **Cơ sở dữ liệu & Schema** | [.agents/rules/DATABASE-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/DATABASE-RULES.md) | Migration chuẩn, Prisma Schema, UUID, Cấu trúc phẳng, Audit fields. |
| **Backend & Logic Nghiệp Vụ** | [.agents/rules/BACKEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/BACKEND-RULES.md) | Next.js Server Actions, Zod Validation, Session Auth, Prisma Transactions. |
| **Giao diện & UI Theme** | [.agents/rules/FRONTEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/FRONTEND-RULES.md) | 100% Tailwind CSS & Shadcn/UI, Mobile-first Responsive, AJAX SPA. |
| **Kế hoạch: Quản lý Nhân sự (HR)** | [docs/plans/HR-CHECKLIST.md](file:///d:/VS%20code/SDG/docs/plans/HR-CHECKLIST.md) | Lộ trình từng bước triển khai phân hệ Quản lý Nhân sự & Phân quyền. |

---

## 2. Nguyên Tắc Vận Hành Lõi (Core Operational Principles)

1. **Direct-to-DB:** Mọi Server Action tương tác trực tiếp với Prisma Client. Không tạo các tầng trừu tượng trung gian rườm rà (Repository, Service Interface).
2. **Single Source of Truth:** Không khai báo chi tiết mã màu, tokens hay cấu trúc code cụ thể tại file Router này. Mọi quy tắc kỹ thuật chi tiết phải nằm trong các tệp tương ứng thuộc thư mục `.agents/rules/`.
3. **Tính Toàn Vẹn Dữ Liệu:** Không bao giờ tự ý chạy các lệnh xóa cột (`drop column`), reset CSDL làm mất dữ liệu của người dùng mà không có xác nhận.
4. **Đồng Bộ Kế Hoạch Bắt Buộc (Mandatory Checklist Sync):** Mỗi khi thực thi một lệnh, hoàn thành một bước hoặc có bất kỳ sửa đổi kỹ thuật/kiến trúc nào, AI Agent **BẮT BUỘC** phải cập nhật ngay vào tệp Checklist tương ứng (`docs/plans/<TEN-PHAN-HE>-CHECKLIST.md`), đánh dấu `[x]` các việc đã xong và ghi nhận các quyết định kiến trúc mới.

---

## 3. Quản Lý Kế Hoạch & Mở Rộng Phân Hệ Mới (Plans Extensibility)

Khi dự án mở rộng thêm các phân hệ mới (ví dụ: `TASK`, `APPROVAL`, `WAREHOUSE`...):
1. **Kế hoạch triển khai:** BẮT BUỘC tạo tại thư mục `docs/plans/<TEN-PHAN-HE>-CHECKLIST.md`.
2. **Quy tắc chuyên biệt (nếu có):** Tạo tại `.agents/rules/<TEN-PHAN-HE>-RULES.md`.
3. **Đăng ký định tuyến:** Bổ sung các đường dẫn trên vào Bảng Định Tuyến (Mục 1) của tệp này để AI tự động nạp ngữ cảnh khi nhận việc.
