# QUY CHUẨN FRONTEND & THIẾT KẾ GIAO DIỆN (FRONTEND & UI THEME RULES)

Tệp quy tắc này là **Nguồn sự thật duy nhất (Single Source of Truth)** cho toàn bộ giao diện người dùng (UI/UX), kiến trúc mã nguồn Frontend và nhận diện thương hiệu của Sao Đỏ Group (SDG). Mọi AI Agent và lập trình viên bắt buộc phải tuân thủ nghiêm ngặt.

---

## 1. Màu Sắc & Nhận Diện Thương Hiệu (Brand Colors & Tokens)

Hệ màu đã được cấu hình trong `src/app/globals.css`. Tuyệt đối tuân theo hệ thống CSS Variables:

- **Primary (Sao Đỏ Red):** `#da241b` — Màu đỏ thương hiệu chủ đạo. Dùng cho nút bấm hành động chính (Primary Action), thẻ trạng thái nổi bật, active states, điểm nhấn logo. Dùng class: `bg-primary`, `text-primary`, `hover:bg-primary/90`.
- **Accent / Secondary (Sao Đỏ Navy):** `#003388` — Màu xanh navy thương hiệu. Dùng cho sidebar, header phụ, thẻ tag thông tin, icon phụ trợ. Dùng class: `bg-accent`, `text-accent`, `text-blue-900`.
- **Màu nền & Thẻ (Background & Surface):** Tuân theo theme tokens `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground` (tự động thích ứng Light Mode / Dark Mode).
- **RÀNG BUỘC CẤM:**
  - **CẤM** hardcode mã màu HEX trực tiếp trong JSX (ví dụ: cấm `text-[#da241b]`, `bg-[#003388]`).
  - **CẤM** viết CSS inline kiểu `style={{ color: 'red' }}`.
  - **CẤM** tạo các class CSS "chế" như `<div className="my-custom-box">`. 100% sử dụng Tailwind CSS Utility classes.

---

## 2. Thẩm Mỹ & Trải Nghiệm Người Dùng (UI/UX & Aesthetics)

- **Ngôn ngữ thiết kế hiện đại & Tối giản (Modern Glassmorphism):**
  - Sử dụng viền mềm `border-border/50` kết hợp bo góc nhất quán `rounded-xl` hoặc `rounded-2xl` cho các Card, Panel, Dialog.
  - Áp dụng hiệu ứng mờ kính `bg-background/80 backdrop-blur-md` cho Header cố định hoặc Navbar.
- **Tương tác mượt mà (Micro-animations):**
  - Mọi trạng thái tương tác (hover, active, focus) đều phải có hiệu ứng chuyển đổi mượt: `transition-all duration-200`.
- **Trải nghiệm 100% AJAX (SPA Standard):**
  - Không bao giờ sử dụng thẻ `<a>` thuần túy gây tải lại trang (Full Page Reload). Luôn dùng `<Link href="...">` từ `next/link`.
  - Mọi thao tác gửi biểu mẫu (Form Submission) phải thực hiện qua Server Actions hoặc fetch API ngầm (No reload).
- **Trạng thái phản hồi (Feedback & Loading States):**
  - Khi tải dữ liệu: Bắt buộc dùng **Skeleton Loading** (`@/components/ui/skeleton`), không để màn hình trống trơn.
  - Khi submit dữ liệu: Bắt buộc hiển thị spinner hoặc disable nút kèm trạng thái `isPending`.
  - Thông báo kết quả: Sử dụng `sonner` hoặc toast component để phản hồi kết quả thao tác cho người dùng.

---

## 3. Kiến Trúc Next.js App Router (Server vs Client Component)

- **Default Server Components:** Mặc định toàn bộ Page (`page.tsx`) và Layout (`layout.tsx`) phải là Server Components để tối ưu hóa SEO và tải dữ liệu trực tiếp trên Server.
- **Client Components cấp lá (Leaf Nodes):**
  - Chỉ đặt chỉ thị `"use client"` ở các component trực tiếp chứa state (`useState`, `useReducer`), vòng đời (`useEffect`), hoặc nhận tương tác DOM (`onClick`, `onChange`).
  - **CẤM:** Đặt `"use client"` ở đầu tệp `page.tsx`. Phải bọc phần tương tác thành các Client Component con và nhúng vào Server Component.

---

## 4. Tiêu Chuẩn Thành Phần & Biểu Mẫu (Shadcn/UI & Forms)

- **100% Sử dụng Shadcn/UI:**
  - Mọi thành phần giao diện cơ bản (Button, Input, Select, Dialog, Sheet, DropdownMenu, Checkbox, Switch, Tabs...) **BẮT BUỘC** import từ `@/components/ui/`.
  - **CẤM** sử dụng thẻ HTML thô sơ như `<input>`, `<select>`, `<button>` trực tiếp trong code.
  - Nếu thiếu component nào, chạy lệnh `npx shadcn@latest add <component-name>` để bổ sung.
- **Quản lý Form Nghiệp vụ:**
  - Với các form nhập liệu nghiệp vụ (Quản lý hồ sơ nhân sự, phân quyền, cấu hình phòng ban): Bắt buộc sử dụng combo **`React Hook Form`** + **`Zod Resolver`** (`@hookform/resolvers/zod`).
  - Hiển thị lỗi validation rõ ràng ngay dưới từng trường dữ liệu với `<FormMessage />`.
- **Bảng dữ liệu (Data Grid):**
  - Các bảng danh sách có chức năng Phân trang (Pagination), Tìm kiếm/Lọc (Filter), Sắp xếp (Sort) phải được xây dựng dựa trên **`TanStack Table v8`** kết hợp với `@/components/ui/table`.
- **Hợp nhất Class an toàn:**
  - Luôn sử dụng hàm helper `cn()` (Tailwind-merge + Clsx) khi truyền hoặc mở rộng `className` để tránh lỗi xung đột CSS specificity.
