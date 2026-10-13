# QUY TRÌNH & CHECKLIST TRIỂN KHAI PHÂN HỆ QUẢN LÝ NHÂN SỰ (HR & RBAC MODULE)
> **Dự án:** Sao Đỏ Group ERP (SDG ERP)  
> **Mục tiêu:** Xây dựng module Quản lý Nhân sự toàn diện (Hồ sơ nhân viên, Sơ đồ phòng ban, Tài khoản người dùng) tích hợp Ma trận Phân quyền truy cập đa phân mảnh (RBAC) làm nền tảng mở rộng các tính năng tương lai (Quản lý công việc, Quy trình phê duyệt...).  
> **Quy chuẩn áp dụng:** Tuân thủ 100% [DATABASE-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/DATABASE-RULES.md), [BACKEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/BACKEND-RULES.md), và [FRONTEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/FRONTEND-RULES.md).

---

## 📌 BẢNG TIẾN ĐỘ TỔNG QUAN

- [ ] **Giai đoạn 1: Chuẩn bị Nền tảng & Cấu hình Dữ liệu khởi tạo (Seed Data & UI Setup)**
- [ ] **Giai đoạn 2: Quản lý Cơ cấu Tổ chức & Phòng Ban (Department Management)**
- [ ] **Giai đoạn 3: Quản lý Hồ sơ & Tài khoản Nhân viên (Core Employee Management)**
- [ ] **Giai đoạn 4: Quản lý Vai trò & Ma trận Phân quyền truy cập (RBAC & Module Permissions)**
- [ ] **Giai đoạn 5: Tích hợp Điều hướng (Sidebar Navigation) & Kiểm thử Hoàn thiện (E2E Testing)**

---

## 📋 CHI TIẾT TỪNG BƯỚC TRIỂN KHAI

---

### GIAI ĐOẠN 1: CHUẨN BỊ NỀN TẢNG & SEED DATA
> *Mục tiêu: Đảm bảo đầy đủ thư viện UI, component chuẩn Shadcn và có dữ liệu mẫu ban đầu để phát triển.*

- [ ] **Bước 1.1: Khởi tạo Seed Script (`prisma/seed.ts`)**
  - [ ] Tạo Công ty mặc định: `Công ty Cổ phần Tập đoàn Sao Đỏ` (`Company`).
  - [ ] Khởi tạo danh sách Phòng ban mẫu: Ban Giám Đốc, Phòng Kế Toán, Phòng Kỹ Thuật & Vận Hành, Phòng HCNS (`Department`).
  - [ ] Khởi tạo danh mục Phân hệ & Hành động mẫu: Module `HR` (READ, CREATE, UPDATE, DELETE), Module `TASK_MANAGEMENT` (READ, CREATE, UPDATE, ASSIGN) (`Permission`).
  - [ ] Khởi tạo các Nhóm vai trò mẫu: `ADMIN` (Quản trị hệ thống), `HR_MANAGER` (Quản lý nhân sự), `DEPARTMENT_HEAD` (Trưởng bộ phận), `EMPLOYEE` (Nhân viên) (`Role` & `RolePermission`).
  - [ ] Tạo Tài khoản Siêu quản trị (`Super Admin`) ban đầu với đầy đủ hồ sơ nhân viên (`User` + `EmployeeProfile`).
  - [ ] Cấu hình lệnh `npm run db:seed` trong `package.json` và thực thi seed vào PostgreSQL `sdg_erp`.

- [ ] **Bước 1.2: Bổ sung các Shadcn UI Components cần thiết**
  - [ ] Cài đặt Table: `npx shadcn@latest add table`
  - [ ] Cài đặt Dialog & Sheet (Modal popups): `npx shadcn@latest add dialog sheet`
  - [ ] Cài đặt Dropdown Menu & Select: `npx shadcn@latest add dropdown-menu select`
  - [ ] Cài đặt Badge & Avatar: `npx shadcn@latest add badge avatar`
  - [ ] Cài đặt Tabs & Tooltip: `npx shadcn@latest add tabs tooltip`
  - [ ] Cài đặt Thư viện Thông báo Toast/Sonner: `npx shadcn@latest add sonner`

- [ ] **Bước 1.3: Cài đặt thư viện xử lý Bảng & Biểu mẫu**
  - [ ] Kiểm tra và cài đặt `@tanstack/react-table` (cho Data Grid phân trang/lọc dữ liệu).
  - [ ] Kiểm tra và cài đặt `lucide-react` (icons), `bcryptjs` (băm mật khẩu cho tài khoản nhân viên).

---

### GIAI ĐOẠN 2: QUẢN LÝ PHÒNG BAN & TỔ CHỨC (DEPARTMENT)
> *Mục tiêu: Tạo cơ cấu tổ chức để gán nhân viên vào phòng ban.*

- [ ] **Bước 2.1: Xây dựng Server Actions Phòng Ban (`src/actions/department.ts`)**
  - [ ] `getDepartments`: Lấy danh sách phòng ban thuộc công ty kèm đếm số lượng nhân sự (`_count: { users: true }`).
  - [ ] `createDepartment`: Thêm phòng ban mới (Kiểm tra trùng mã code trong công ty, validate Zod).
  - [ ] `updateDepartment`: Chỉnh sửa tên, mã, mô tả phòng ban.
  - [ ] `deleteDepartment`: Xóa phòng ban (Có ràng buộc: nếu phòng ban đang có nhân viên thì từ chối xóa).

- [ ] **Bước 2.2: Xây dựng Giao diện Phòng Ban (`src/app/(dashboard)/departments/page.tsx`)**
  - [ ] Bảng danh sách phòng ban (Mã, Tên, Số lượng nhân sự, Ngày tạo, Thao tác).
  - [ ] Dialog Thêm mới / Chỉnh sửa phòng ban (Sử dụng React Hook Form + Zod, không reload trang).
  - [ ] Nút xóa kèm Dialog xác nhận an toàn.

---

### GIAI ĐOẠN 3: QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (CORE HR)
> *Mục tiêu: Quản lý thông tin chi tiết của từng cán bộ nhân viên và tài khoản đăng nhập.*

- [ ] **Bước 3.1: Xây dựng DTO Schemas Validation (`src/lib/validations/employee.ts`)**
  - [ ] Schema Tạo nhân viên mới: Họ tên, Mã nhân viên, Chức vụ, Phòng ban, Tên đăng nhập (username), Mật khẩu, SĐT, Email, Ngày sinh, Ngày vào làm, Vai trò phân quyền (Role IDs).
  - [ ] Schema Cập nhật nhân viên: Cho phép chỉnh sửa thông tin hồ sơ, đổi trạng thái hoạt động (Active/Inactive), đổi phòng ban, cập nhật vai trò.

- [ ] **Bước 3.2: Xây dựng Server Actions Nhân Sự (`src/actions/employee.ts`)**
  - [ ] `getEmployees`: Lấy danh sách nhân viên có bộ lọc (theo Phòng ban, Trạng thái, Tìm kiếm từ khóa Tên/Mã NV/SĐT), hỗ trợ Phân trang.
  - [ ] `getEmployeeById`: Lấy chi tiết hồ sơ 1 nhân viên kèm quan hệ Department, User, Roles.
  - [ ] `createEmployee`: Sử dụng `prisma.$transaction` để:
    1. Tạo bản ghi `User` (băm password, kiểm tra username/sđt duy nhất).
    2. Tạo bản ghi `EmployeeProfile` gắn liền với `User`.
    3. Gán phòng ban và danh sách vai trò `UserRole`.
  - [ ] `updateEmployee`: Cập nhật đồng bộ `EmployeeProfile`, thông tin đăng nhập của `User` và bảng trung gian `UserRole`.
  - [ ] `toggleEmployeeStatus`: Kích hoạt / Khóa tài khoản nhân viên.
  - [ ] `resetEmployeePassword`: Đặt lại mật khẩu cho nhân sự.

- [ ] **Bước 3.3: Xây dựng Giao diện Danh sách Nhân sự (`src/app/(dashboard)/employees/page.tsx`)**
  - [ ] Thanh công cụ (Toolbar): Thanh tìm kiếm thời gian thực, Bộ lọc Phòng ban, Bộ lọc Trạng thái (Đang làm việc / Đã nghỉ việc), Nút "Thêm nhân viên" nổi bật với màu Sao Đỏ Red (`bg-primary`).
  - [ ] Data Grid (TanStack Table):
    - Cột Nhân viên: Avatar + Họ và tên + Chức vụ.
    - Cột Mã nhân viên: Mã định danh nội bộ.
    - Cột Phòng ban: Badge màu Navy (`bg-accent/10 text-accent`).
    - Cột Liên hệ: SĐT & Email.
    - Cột Tài khoản: Username & Trạng thái hoạt động (Badge Hoạt động / Khóa).
    - Cột Vai trò: Hiển thị các Role được cấp.
    - Cột Thao tác: Menu Xem chi tiết, Chỉnh sửa, Đổi mật khẩu, Khóa/Mở khóa.
  - [ ] Phân trang (Pagination) mượt mà 100% AJAX.

- [ ] **Bước 3.4: Xây dựng Modal / Form Thêm & Sửa Nhân viên**
  - [ ] Thiết kế Sheet hoặc Dialog 2 cột bố cục gọn gàng, chia 3 tab/khối:
    - Khối 1: *Thông tin cá nhân* (Họ tên, Mã NV, SĐT, Email, Ngày sinh, Địa chỉ).
    - Khối 2: *Thông tin công việc* (Phòng ban, Chức danh, Ngày vào làm).
    - Khối 3: *Tài khoản & Phân quyền* (Tên đăng nhập, Mật khẩu ban đầu, Chọn các vai trò gán cho nhân viên).
  - [ ] Tích hợp React Hook Form + Zod, xử lý validation và hiển thị thông báo kết quả bằng Sonner toast.

---

### GIAI ĐOẠN 4: MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC & MODULE ACCESS)
> *Mục tiêu: Thiết lập cơ chế phân quyền động, sẵn sàng cho việc mở rộng các phân hệ tương lai.*

- [ ] **Bước 4.1: Xây dựng Server Actions Phân Quyền (`src/actions/role.ts`)**
  - [ ] `getRoles`: Danh sách các vai trò trong hệ thống kèm số lượng thành viên.
  - [ ] `getPermissionsMatrix`: Lấy toàn bộ danh mục Quyền được phân loại theo từng Module (`HR`, `TASK_MANAGEMENT`, `ADMIN`).
  - [ ] `createRole` / `updateRole`: Thêm hoặc chỉnh sửa thông tin nhóm vai trò.
  - [ ] `updateRolePermissions`: Cập nhật danh sách quyền cho một vai trò bằng `prisma.$transaction`.

- [ ] **Bước 4.2: Xây dựng Giao diện Ma trận Phân quyền (`src/app/(dashboard)/roles/page.tsx`)**
  - [ ] Tab Danh sách Vai trò (Quản trị viên, Trưởng phòng, Nhân sự, Nhân viên...).
  - [ ] Bảng Ma trận Phân quyền (Grid Checkbox):
    - Dòng: Từng phân hệ tính năng (Quản lý Nhân sự, Quản lý Công việc, Cấu hình hệ thống...).
    - Cột: Các quyền hạn (Xem, Thêm mới, Chỉnh sửa, Xóa bỏ, Toàn quyền).
    - Checkbox cập nhật trực tiếp quyền theo thời gian thực (AJAX feedback tức thì).

---

### GIAI ĐOẠN 5: TÍCH HỢP ĐIỀU HƯỚNG & KIỂM THỬ HOÀN THIỆN
> *Mục tiêu: Đưa các tính năng lên thanh menu hệ thống, kiểm thử toàn trình và tinh chỉnh UX.*

- [ ] **Bước 5.1: Cập nhật Thanh Điều hướng (Sidebar Navigation)**
  - [ ] Bổ sung nhóm menu **"Quản lý Nhân sự"** vào Sidebar chung (`src/components/layout/sidebar.tsx` hoặc dashboard layout):
    - 👥 Danh sách nhân sự (`/employees`)
    - 🏢 Cơ cấu phòng ban (`/departments`)
    - 🛡️ Phân quyền & Vai trò (`/roles`)
  - [ ] Áp dụng hiệu ứng hover chuyển động mượt mà, active state chuẩn Sao Đỏ Red/Navy.

- [ ] **Bước 5.2: Kiểm thử Toàn trình (End-to-End Test)**
  - [ ] Kiểm thử tạo mới phòng ban -> Tạo nhân viên mới gán vào phòng ban đó.
  - [ ] Kiểm thử trùng lặp mã nhân viên, username hoặc số điện thoại (báo lỗi chính xác).
  - [ ] Kiểm thử thay đổi vai trò và cập nhật quyền hạn.
  - [ ] Kiểm tra phản hồi trên màn hình di động (Responsive Layout).

---

## 🎯 QUY TRÌNH THỰC HIỆN TỪNG BƯỚC CÙNG BẠN

Mỗi khi bắt đầu 1 bước:
1. **AI thông báo nội dung chi tiết bước sắp làm.**
2. **AI tiến hành viết code/chạy lệnh theo đúng chuẩn.**
3. **Người dùng kiểm tra trên trình duyệt / Prisma Studio.**
4. **Đánh dấu `[x]` vào checklist và chuyển sang bước tiếp theo.**
