# QUY CHUẨN FRONTEND & THIẾT KẾ GIAO DIỆN (FRONTEND, UI THEME & RESPONSIVE RULES)

Tệp quy tắc này là **Nguồn sự thật duy nhất (Single Source of Truth)** cho toàn bộ giao diện người dùng (UI/UX), kiến trúc mã nguồn Frontend, nhận diện thương hiệu và thiết kế đáp ứng đa thiết bị của Sao Đỏ Group (SDG). Mọi AI Agent và lập trình viên bắt buộc phải tuân thủ nghiêm ngặt.

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

## 3. Thiết Kế Đáp Ứng & Trải Nghiệm Di Động (Responsive & Mobile-First)

Mọi màn hình và tính năng mới được tạo ra BẮT BUỘC phải tương thích hoàn hảo trên cả điện thoại (Mobile), máy tính bảng (Tablet) và máy tính (Desktop):

- **Bố cục Khung & Navigation:**
  - Trên Desktop (`lg:` trở lên): Sidebar cố định bên trái (Fixed/Sticky Sidebar).
  - Trên Mobile / Tablet (`< 1024px`): Sidebar tự động ẩn và chuyển thành Menu Hamburger; khi bấm sẽ mở ra dưới dạng Mobile Drawer (`Sheet` từ `@/components/ui/sheet`).
  - Luôn sử dụng độ rộng co giãn: `w-full max-w-...`. **CẤM** gán chiều rộng cố định bằng pixel (như `w-[800px]`, `min-w-[1000px]` ngoài vùng cuộn) gây tràn ngang màn hình điện thoại.
- **Xử lý Bảng Dữ Liệu (Data Grid) trên Mobile:**
  - **Ưu tiên:** Tự động chuyển đổi dạng dòng của Bảng thành Thẻ thông tin (Card View) ở màn hình nhỏ (`block md:hidden`) và hiển thị dạng Bảng ở màn hình lớn (`hidden md:table`).
  - **Dự phòng:** Bắt buộc bọc bảng trong container cuộn ngang an toàn (`overflow-x-auto relative w-full`).
- **Form & Modal Popups:**
  - Bố cục Form luôn hiển thị 1 cột trên điện thoại (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
  - Hộp thoại Dialog trên điện thoại phải chiếm `w-[95vw]` và có giới hạn chiều cao `max-h-[85vh] overflow-y-auto` để không bị bàn phím ảo che mất nút Lưu.
- **Kích thước vùng chạm cảm ứng (Touch Targets):**
  - Mọi nút bấm, icon thao tác (sửa, xóa, xem) trên mobile phải có kích thước tối thiểu `40x40px` (`h-10 min-w-10`) để người dùng dễ bấm chính xác bằng ngón tay.
  - Font-size ô input tối thiểu `text-sm` (14px) để tránh việc trình duyệt tự động zoom màn hình trên điện thoại.

---

## 4. Giao Diện Tích Hợp Phân Quyền (Permission-Based UI Rendering)

Khi xây dựng các tính năng mới (Quản lý công việc, Phê duyệt, Nhân sự...):
- **Hiển thị Nút bấm có Điều kiện:**
  - Tuyệt đối KHÔNG hiển thị các nút hành động nhạy cảm (như "Thêm mới", "Sửa", "Xóa", "Duyệt", "Giao việc") nếu người dùng không sở hữu quyền tương ứng.
  - Sử dụng kiểm tra quyền trực tiếp từ Session truyền xuống:
    ```tsx
    {session.permissions.HR === "MANAGE" && (
      <Button className="bg-primary">Thêm nhân sự</Button>
    )}
    ```
- **Chặn Truy cập Giao diện (Route Guard):**
  - Nếu người dùng truy cập trực tiếp vào đường dẫn không có quyền (ví dụ `/settings` hoặc `/roles`): Phải chuyển hướng hoặc hiển thị màn hình thông báo "Không có quyền truy cập" (403 Forbidden Component).

---

## 5. Kiến Trúc Next.js App Router (Server vs Client Component)

- **Default Server Components:** Mặc định toàn bộ Page (`page.tsx`) và Layout (`layout.tsx`) phải là Server Components để tối ưu hóa SEO và tải dữ liệu trực tiếp trên Server.
- **Client Components cấp lá (Leaf Nodes):**
  - Chỉ đặt chỉ thị `"use client"` ở các component trực tiếp chứa state (`useState`, `useReducer`), vòng đời (`useEffect`), hoặc nhận tương tác DOM (`onClick`, `onChange`).
  - **CẤM:** Đặt `"use client"` ở đầu tệp `page.tsx`. Phải bọc phần tương tác thành các Client Component con và nhúng vào Server Component.

---

## 6. Tiêu Chuẩn Thành Phần & Biểu Mẫu (Shadcn/UI & Forms)

- **100% Sử dụng Shadcn/UI:**
  - Mọi thành phần giao diện cơ bản (Button, Input, Select, Dialog, Sheet, DropdownMenu, Checkbox, Switch, Tabs...) **BẮT BUỘC** import từ `@/components/ui/`.
  - **CẤM** sử dụng thẻ HTML thô sơ như `<input>`, `<select>`, `<button>` trực tiếp trong code.
- **Quản lý Form Nghiệp vụ:**
  - Form nghiệp vụ bắt buộc sử dụng combo **`React Hook Form`** + **`Zod Resolver`** (`@hookform/resolvers/zod`).
  - Hiển thị lỗi validation rõ ràng ngay dưới từng trường dữ liệu với `<FormMessage />`.
- **Hợp nhất Class an toàn:**
  - Luôn sử dụng hàm helper `cn()` (Tailwind-merge + Clsx) khi truyền hoặc mở rộng `className` để tránh lỗi xung đột CSS specificity.
