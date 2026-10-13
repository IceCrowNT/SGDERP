<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HỆ THỐNG QUY CHUẨN PHÁT TRIỂN DỰ ÁN (MASTER AGENT ROUTER)

Tệp này là **Menu tổng và bộ định tuyến trung tâm (Master Router)** cho tất cả AI Agent làm việc trong dự án Sao Đỏ Group ERP (SDG ERP). 

Khi nhận bất kỳ yêu cầu lập trình nào từ người dùng, AI Agent BẮT BUỘC tra cứu bảng định tuyến dưới đây để nạp và thực thi đúng các file quy tắc chuyên biệt tương ứng trong thư mục `.agents/rules/`.

---

## 1. Bảng Định Tuyến Quy Chuẩn (Rules Routing Table)

| Phạm Vi Công Việc | Tệp Quy Tắc Cần Đọc & Áp Dụng | Mô Tả & Ràng Buộc Trọng Tâm |
| :--- | :--- | :--- |
| **Cơ sở dữ liệu & Prisma ORM** | [DATABASE-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/DATABASE-RULES.md) | **CẤM** dùng `prisma db push`. Luôn dùng `prisma migrate dev`. Khóa Prisma v6.19.3. Bắt buộc `id UUID`, audit fields (`createdAt`, `updatedAt`). |
| **Backend & Logic Nghiệp Vụ** | [BACKEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/BACKEND-RULES.md) | 100% Server Actions (`"use server"`). Xác thực Schema với `Zod`. Lấy danh tính từ Session (không tin tưởng Client). Dùng `prisma.$transaction` khi ghi từ 2 bảng trở lên. |
| **Giao diện & UI Theme** | [FRONTEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/FRONTEND-RULES.md) | 100% Tailwind CSS & Shadcn/UI (CẤM HTML input/button thô). Hệ màu Sao Đỏ Red `#da241b` & Navy `#003388`. Next.js App Router (Server/Client components). Form với React Hook Form + Zod. Bảng với TanStack Table. 100% AJAX (không reload trang). |
| **Kế hoạch & Checklist Nhân sự (HR)** | [HR-CHECKLIST.md](file:///d:/VS%20code/SDG/HR-CHECKLIST.md) | Kế hoạch 5 giai đoạn triển khai chi tiết module Quản lý Nhân sự & Phân quyền RBAC. |

---

## 2. Hướng Dẫn Mở Rộng Quy Chuẩn Mới (Extensibility Guide)

Khi dự án mở rộng thêm các nghiệp vụ hoặc phân hệ mới (ví dụ: Quản lý Nhân sự, Quản lý Công việc, Quy trình Phê duyệt, Kiểm thử):
1. **Tạo tệp quy tắc mới** trong thư mục `.agents/rules/` theo định dạng `<TEN-QUY-TAC>.md` (ví dụ: `HR-RULES.md`, `TASK-RULES.md`, `TESTING-RULES.md`).
2. **Khai báo vào Bảng Định Tuyến** ở mục 1 của tệp `AGENTS.md` này kèm theo đường dẫn và điều kiện kích hoạt.
3. Khi người dùng yêu cầu code liên quan đến phân hệ đó, AI Agent sẽ tự động đối chiếu vào `AGENTS.md` và tuân thủ tệp quy chuẩn chuyên biệt.

---

## 3. Các Nguyên Tắc Bất Di Bất Dịch (Immutable Principles)
1. **Tính Toàn Vẹn Dữ Liệu:** Không bao giờ chạy migration hoặc script có nguy cơ làm mất dữ liệu (`drop column`, `reset db`) mà không có cảnh báo và xác nhận từ người dùng.
2. **Bảo Mật Phân Quyền (RBAC):** Mọi hành động Backend đều phải kiểm tra quyền hạn của User đối với tài nguyên trước khi thực thi.
3. **Thống Nhất Giao Diện:** Không tự ý thêm thư viện CSS bên ngoài (như Bootstrap, Ant Design hay Tailwind raw hardcoded styles). Tuyệt đối đồng bộ theo Design System của Sao Đỏ Group.
