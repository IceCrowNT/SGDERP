# QUY TRÌNH & CHECKLIST TRIỂN KHAI PHÂN HỆ QUẢN LÝ NHÂN SỰ (HR & ACCESS CONTROL)
> **Dự án:** Sao Đỏ Group ERP (SDG ERP)  
> **Kiến trúc:** CSDL Tinh giản thực dụng (3 Bảng: `Company`, `Department`, `User` + `RoleCode Enum`).  
> **Mục tiêu:** Xây dựng module Quản lý Nhân sự hoàn chỉnh (Hồ sơ cán bộ nhân viên, Sơ đồ phòng ban, Tài khoản đăng nhập, Phân quyền vai trò) theo tiêu chuẩn trải nghiệm 100% AJAX SPA.  
> **Quy chuẩn áp dụng:** Tuân thủ 100% [DATABASE-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/DATABASE-RULES.md), [BACKEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/BACKEND-RULES.md), và [FRONTEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/FRONTEND-RULES.md).

---

## 📌 BẢNG TIẾN ĐỘ TỔNG QUAN

- [x] **Bước Chuẩn bị: Tinh giản Cấu trúc Cơ sở dữ liệu (3 Bảng: Company, Department, User)**
- [ ] **Giai đoạn 1: Khởi tạo Nền tảng, Thư viện UI & Dữ liệu mẫu (Seed Data & UI Components)**
- [ ] **Giai đoạn 2: Quản lý Cơ cấu Tổ chức & Phòng Ban (Department Management)**
- [ ] **Giai đoạn 3: Quản lý Hồ sơ & Tài khoản Nhân viên (Core Employee Management)**
- [ ] **Giai đoạn 4: Cơ chế Kiểm tra Quyền Hạn & Bảo vệ Server Actions (Role Guards & Security)**
- [ ] **Giai đoạn 5: Tích hợp Điều hướng (Sidebar Navigation) & Kiểm thử Toàn trình (E2E Testing)**

---

## 📋 CHI TIẾT TỪNG BƯỚC TRIỂN KHAI

---

### BƯỚC CHUẨN BỊ: TINH GIẢN CƠ SỞ DỮ LIỆU
- [x] Tái cấu trúc schema về 3 bảng cốt lõi (`Company`, `Department`, `User`).
- [x] Tạo migration `20261013155200_simplify_hr_schema` và áp dụng thành công qua `prisma migrate deploy`.
- [x] Sinh lại Prisma Client v6.19.3.

---

### GIAI ĐOẠN 1: KHỞI TẠO NỀN TẢNG & SEED DATA
> *Mục tiêu: Bổ sung các Shadcn UI components còn thiếu và nạp dữ liệu mẫu ban đầu để phát triển giao diện.*

- [ ] **Bước 1.1: Bổ sung các Shadcn UI Components cần thiết**
  - [ ] Cài đặt Table: `npx shadcn@latest add table`
  - [ ] Cài đặt Dialog & Sheet (Modal / Drawer form): `npx shadcn@latest add dialog sheet`
  - [ ] Cài đặt Dropdown Menu & Select: `npx shadcn@latest add dropdown-menu select`
  - [ ] Cài đặt Badge & Avatar: `npx shadcn@latest add badge avatar`
  - [ ] Cài đặt Tabs & Tooltip: `npx shadcn@latest add tabs tooltip`
  - [ ] Cài đặt Thông báo Sonner (Toast notifications): `npx shadcn@latest add sonner`

- [ ] **Bước 1.2: Cài đặt các thư viện bổ trợ**
  - [ ] `@tanstack/react-table` (cho Data Grid phân trang/lọc dữ liệu chuyên nghiệp).
  - [ ] `lucide-react` (Bộ icon chuẩn).
  - [ ] `bcryptjs` & `@types/bcryptjs` (Băm mật khẩu người dùng an toàn).

- [ ] **Bước 1.3: Khởi tạo Seed Script (`prisma/seed.ts`)**
  - [ ] Tạo Công ty mặc định: `Công ty Cổ phần Tập đoàn Sao Đỏ` (`Company`).
  - [ ] Khởi tạo danh sách Phòng ban mẫu: Ban Giám Đốc, Phòng Kế Toán, Phòng Kỹ Thuật & Vận Hành, Phòng HCNS (`Department`).
  - [ ] Khởi tạo Tài khoản Siêu quản trị `ADMIN` ban đầu (`User`) có đầy đủ mã NV, chức danh, mật khẩu đã băm.
  - [ ] Tạo 3-5 nhân sự mẫu thuộc các phòng ban và vai trò khác nhau (`MANAGER`, `HR`, `STAFF`).
  - [ ] Thực thi nạp seed data vào PostgreSQL `sdg_erp` (Xem kết quả trực tiếp tại Prisma Studio).

---

### GIAI ĐOẠN 2: QUẢN LÝ PHÒNG BAN & TỔ CHỨC (DEPARTMENT)
> *Mục tiêu: Quản lý danh mục phòng ban và đếm số lượng nhân viên trực thuộc.*

- [ ] **Bước 2.1: Xây dựng Server Actions Phòng Ban (`src/actions/department.ts`)**
  - [ ] `getDepartments`: Lấy danh sách phòng ban kèm đếm số lượng nhân sự (`_count: { users: true }`).
  - [ ] `createDepartment`: Thêm phòng ban mới (Validate Zod, kiểm tra mã phòng ban duy nhất).
  - [ ] `updateDepartment`: Chỉnh sửa tên, mã, mô tả phòng ban.
  - [ ] `deleteDepartment`: Xóa phòng ban (Có ràng buộc: nếu phòng ban đang có nhân viên thì từ chối xóa).

- [ ] **Bước 2.2: Xây dựng Giao diện Phòng Ban (`src/app/(dashboard)/departments/page.tsx`)**
  - [ ] Bảng danh sách phòng ban (Mã, Tên, Số lượng nhân sự, Ngày tạo, Thao tác).
  - [ ] Dialog Thêm mới / Chỉnh sửa phòng ban (React Hook Form + Zod, 100% AJAX không reload).
  - [ ] Dialog xác nhận xóa an toàn.

---

### GIAI ĐOẠN 3: QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (CORE HR)
> *Mục tiêu: Quản lý toàn diện thông tin cá nhân, công việc, tài khoản và vai trò của nhân viên trong 1 bảng User.*

- [ ] **Bước 3.1: Xây dựng DTO Schemas Validation (`src/lib/validations/user.ts`)**
  - [ ] Schema Tạo nhân viên mới: Họ tên, Mã NV, Chức vụ, Phòng ban, Username, Password, SĐT, Email, Ngày sinh, Ngày vào làm, Vai trò (`RoleCode`), Địa chỉ.
  - [ ] Schema Cập nhật nhân viên: Chỉnh sửa thông tin hồ sơ, đổi trạng thái hoạt động (Active/Inactive), đổi phòng ban, cập nhật vai trò.

- [ ] **Bước 3.2: Xây dựng Server Actions Nhân Sự (`src/actions/employee.ts`)**
  - [ ] `getEmployees`: Lấy danh sách nhân viên có bộ lọc (Phòng ban, Vai trò, Trạng thái hoạt động, Tìm kiếm Họ tên/Mã NV/SĐT), hỗ trợ Phân trang.
  - [ ] `getEmployeeById`: Lấy thông tin chi tiết của 1 nhân viên kèm quan hệ Phòng ban, Công ty.
  - [ ] `createEmployee`: Tạo mới nhân viên vào bảng `User` (Băm password, kiểm tra username/mã NV duy nhất).
  - [ ] `updateEmployee`: Cập nhật thông tin hồ sơ, vai trò hoặc phòng ban.
  - [ ] `toggleEmployeeStatus`: Kích hoạt / Khóa tài khoản nhân sự tức thì.
  - [ ] `resetEmployeePassword`: Đặt lại mật khẩu cho nhân sự.

- [ ] **Bước 3.3: Xây dựng Giao diện Danh sách Nhân sự (`src/app/(dashboard)/employees/page.tsx`)**
  - [ ] Thanh công cụ (Toolbar): Thanh tìm kiếm thời gian thực, Bộ lọc Phòng ban, Bộ lọc Vai trò, Bộ lọc Trạng thái, Nút "Thêm nhân viên" nổi bật Sao Đỏ Red (`bg-primary`).
  - [ ] Data Grid (TanStack Table):
    - Cột Nhân viên: Avatar + Họ tên + Chức vụ.
    - Cột Mã nhân viên: Mã định danh nội bộ (VD: `SDG-001`).
    - Cột Phòng ban: Badge nhận diện.
    - Cột Vai trò: Badge phân màu sắc (`ADMIN` đỏ, `MANAGER` xanh navy, `HR` vàng cam, `STAFF` xám).
    - Cột Liên hệ: SĐT & Email.
    - Cột Trạng thái: Badge Xanh (Hoạt động) / Đỏ (Khóa).
    - Cột Thao tác: Menu Xem chi tiết, Chỉnh sửa, Đổi mật khẩu, Khóa/Mở khóa.
  - [ ] Phân trang (Pagination) mượt mà 100% AJAX.

- [ ] **Bước 3.4: Xây dựng Modal / Form Thêm & Sửa Nhân viên**
  - [ ] Sheet / Dialog thiết kế 2 cột chuẩn mực, bố cục rõ ràng:
    - *Thông tin cá nhân:* Họ và tên, Mã nhân viên, SĐT, Email, Ngày sinh, Địa chỉ.
    - *Công việc & Tổ chức:* Phòng ban, Chức danh công việc, Ngày vào làm việc.
    - *Tài khoản & Phân quyền:* Tên đăng nhập (Username), Mật khẩu ban đầu, Vai trò hệ thống (`ADMIN`, `MANAGER`, `HR`, `STAFF`).
  - [ ] Tích hợp React Hook Form + Zod, phản hồi thông báo tức thì bằng Sonner toast.

---

### GIAI ĐOẠN 4: CƠ CHẾ BẢO VỆ PHÂN QUYỀN (ROLE GUARDS)
> *Mục tiêu: Đảm bảo tính bảo mật và phân quyền truy cập chặt chẽ cho các Server Actions.*

- [ ] **Bước 4.1: Helper kiểm tra quyền hạn (`src/lib/auth-guard.ts`)**
  - [ ] Hàm `requireAuth(session)`: Kiểm tra đăng nhập.
  - [ ] Hàm `requireRoles(session, ['ADMIN', 'HR'])`: Chỉ cho phép Quản trị viên hoặc Nhân sự thực hiện tác vụ CRUD nhân viên.
  - [ ] Hàm `canManageDepartment(session, targetDepartmentId)`: Kiểm tra Trưởng phòng (`MANAGER`) chỉ xem/duyệt dữ liệu trong phòng của mình.
- [ ] **Bước 4.2: Tích hợp Role Guards vào toàn bộ Server Actions.**

---

### GIAI ĐOẠN 5: TÍCH HỢP ĐIỀU HƯỚNG & KIỂM THỬ TOÀN TRÌNH
> *Mục tiêu: Đưa tính năng lên Menu hệ thống và kiểm thử hoàn thiện toàn bộ luồng hoạt động.*

- [ ] **Bước 5.1: Cập nhật Sidebar Navigation (`src/components/layout/sidebar.tsx`)**
  - [ ] Nhóm menu **"Quản lý Nhân sự"**:
    - 👥 Danh sách nhân sự (`/employees`)
    - 🏢 Cơ cấu phòng ban (`/departments`)
  - [ ] Trạng thái Active/Hover chuẩn Design System Sao Đỏ (Đỏ `#da241b` & Navy `#003388`).
- [ ] **Bước 5.2: Kiểm thử Toàn trình (End-to-End Test)**
  - [ ] Thêm phòng ban mới -> Thêm nhân viên mới vào phòng ban.
  - [ ] Kiểm tra bắt lỗi trùng lặp Mã NV / Username / SĐT.
  - [ ] Kiểm tra chức năng Khóa / Mở khóa tài khoản nhân viên.
  - [ ] Kiểm tra hiển thị responsive trên thiết bị di động.

---

## 🎯 QUY TRÌNH DUYỆT TỪNG BƯỚC

Mỗi khi bắt đầu một bước:
1. AI nêu rõ nội dung và mã nguồn chuẩn bị triển khai.
2. AI thực thi mã nguồn và kiểm tra độ chính xác.
3. Người dùng trải nghiệm và xác nhận.
4. AI đánh dấu `[x]` vào checklist và tiến sang bước tiếp theo.
