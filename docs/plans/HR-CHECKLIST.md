# QUY TRÌNH & CHECKLIST TRIỂN KHAI PHÂN HỆ QUẢN LÝ NHÂN SỰ & MA TRẬN PHÂN QUYỀN (HR & RBAC MATRIX MODULE)
> **Dự án:** Sao Đỏ Group ERP (SDG ERP)  
> **Kiến trúc:** CSDL Tối ưu ERP (Khóa chính số nguyên tự tăng `Int autoincrement`, Hồ sơ `User` phẳng kết hợp Cơ cấu tổ chức cây phân cấp `Department` và Ma trận Phân quyền động đa chiều `Role` - `Permission` - `UserRole`).  
> **Khả năng mở rộng (Dynamic Scalability):**  
> • **Cơ cấu Tổ chức Phân cấp (Hierarchical Tree):** Cấu trúc Phòng ban Cha - Con linh hoạt (`parentId`), hỗ trợ xem dạng cây Org Chart và tự động kế thừa phạm vi quản lý dữ liệu.  
> • **Mở rộng Phòng ban 100% qua UI:** Tự do thêm phòng ban cấp cha hoặc bộ phận con trực thuộc mà không cần can thiệp code hay chạy migration CSDL.  
> • **Mở rộng Vai trò & Phân quyền 100% qua UI:** Tự do tạo thêm Role mới, hệ thống tự động sinh thêm cột trên bảng Ma trận để phân quyền 3 cấp độ (`NONE`, `VIEW`, `MANAGE`).  
> • **Sẵn sàng cho Module tương lai:** Làm nền móng vững chắc cho Quản lý công việc (`TASK`), Phê duyệt (`APPROVAL`), Kho vận...  
> **Quy chuẩn áp dụng:** Tuân thủ 100% [DATABASE-RULES.md](file:///g:/VS%20code/SGDERP/.agents/rules/DATABASE-RULES.md), [BACKEND-RULES.md](file:///g:/VS%20code/SGDERP/.agents/rules/BACKEND-RULES.md), [FRONTEND-RULES.md](file:///g:/VS%20code/SGDERP/.agents/rules/FRONTEND-RULES.md) và [AGENTS.md](file:///g:/VS%20code/SGDERP/AGENTS.md).

---

## 📌 BẢNG TIẾN ĐỘ TỔNG QUAN

- [x] **Bước Chuẩn bị: Thiết lập Cấu trúc CSDL Khóa Số Nguyên & Bộ Nhận Diện Sao Đỏ**
- [x] **Giai đoạn 1: Khởi tạo Thư viện UI & Nạp Dữ liệu thực tế 67 Nhân sự từ Excel**
- [ ] **Giai đoạn 2: Cơ cấu Tổ chức Phân cấp Cây (Cha - Con) & Quản lý Phòng Ban (Department Management)**
- [ ] **Giai đoạn 3: Quản lý Hồ sơ & Tài khoản Cán bộ Nhân viên (Core Employee Management)**
- [x] **Giai đoạn 4: Ma trận Phân quyền Động 3 Cấp độ & Bảo vệ Phân hệ (RBAC Matrix & Session Guard)**
- [ ] **Giai đoạn 5: Tích hợp Điều hướng Đa nền tảng (Mobile/Desktop) & Kiểm thử Toàn trình**

---

## 📋 CHI TIẾT TỪNG BƯỚC TRIỂN KHAI

---

### BƯỚC CHUẨN BỊ: THIẾT LẬP CƠ SỞ DỮ LIỆU & NHẬN DIỆN THƯƠNG HIỆU
- [x] Thiết lập model `Role`, `Permission`, `RolePermission`, `UserRole` với cờ `isPrimary` cho phép kiêm nhiệm.
- [x] Thêm bảng `AuditLog` ghi vết nhật ký hoạt động (LOGIN, LOGOUT, LOGIN_FAILED, CREATE, UPDATE, DELETE).
- [x] **Chuẩn hóa Khóa chính:** Chuyển đổi toàn bộ `id` từ UUID sang số nguyên tự tăng `Int @id @default(autoincrement())` (1, 2, 3...) giúp đối soát trực quan, tăng tốc JOIN và giảm dung lượng chỉ mục.
- [x] Tạo migration `20261018142939_init_autoincrement_erp` và áp dụng thành công vào PostgreSQL.
- [x] Sinh Prisma Client v6.19.3 tương thích kiểu `Int`.
- [x] **Nhận diện Thương hiệu:** Tích hợp logo chính thức Sao Đỏ Group từ trang chủ `saodogroup.com` (`public/logo.png`), Tab Favicon (`src/app/icon.png`) và thiết lập **Chế độ Sáng (`Light Mode`) mặc định**.
- [x] Bổ sung quy chuẩn bắt buộc về kiểm tra quyền RBAC, Responsive Mobile và nguyên tắc **Bắt buộc đồng bộ Checklist** vào `AGENTS.md`.

---

### GIAI ĐOẠN 1: THƯ VIỆN UI & NẠP DỮ LIỆU THỰC TẾ TỪ EXCEL
> *Mục tiêu: Đảm bảo đầy đủ component giao diện và nạp toàn bộ danh mục, 67 nhân sự thật của Sao Đỏ Group vào CSDL.*

- [x] **Bước 1.1: Bổ sung các Shadcn UI Components cần thiết**
  - [x] Table, Dialog, Sheet, Dropdown Menu, Select, Badge, Avatar, Tabs, Tooltip, Sonner Toast.
- [x] **Bước 1.2: Cài đặt các thư viện bổ trợ**
  - [x] `@tanstack/react-table` (cho Data Grid phân trang/lọc dữ liệu chuyên nghiệp).
  - [x] `lucide-react` (Bộ icon chuẩn).
  - [x] `jose` (Mã hóa và xác thực JWT Session an toàn trên Edge/Node).
  - [x] `bcryptjs` & `@types/bcryptjs` (Băm mật khẩu tài khoản người dùng).
  - [x] `xlsx` (Đọc dữ liệu Excel).
- [x] **Bước 1.3: Viết Script Nạp Dữ Liệu Thực Tế (`prisma/seed.ts`)**
  - [x] Khởi tạo Công ty mặc định: `CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ SAO ĐỎ` (ID: 1).
  - [x] Khởi tạo danh mục 5 Nhóm vai trò chuẩn: `ADMIN`, `DEPT_HEAD`, `HR`, `ACCOUNTANT`, `STAFF` (ID: 1 đến 5).
  - [x] Khởi tạo 7 Quyền cơ bản cho phân hệ `HR`, `TASK` và `SYSTEM`.
  - [x] Khởi tạo tài khoản Quản trị viên tối cao: `admin / 123456` (ID: 1).
  - [x] Nạp toàn bộ **67 Cán bộ Nhân viên thật** (`User` ID: 2 đến 68) với mật khẩu mặc định `123456`.

---

### GIAI ĐOẠN 2: CƠ CẤU TỔ CHỨC CÂY PHÂN CẤP (CHA - CON) & QUẢN LÝ PHÒNG BAN
> *Mục tiêu: Quản lý danh mục cơ cấu tổ chức theo mô hình cây 2 tầng (Khối/Ban/Phòng cấp Tập đoàn -> Bộ phận trực thuộc) và cơ chế phân quyền kế thừa theo nhánh.*

- [ ] **Bước 2.1: Cập nhật Schema Cây Phòng Ban (`prisma/schema.prisma`)**
  - [ ] Bổ sung trường tự liên kết:
    ```prisma
    parentId    Int?
    parent      Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
    children    Department[] @relation("DepartmentHierarchy")
    ```
  - [ ] Chạy migration cập nhật CSDL và cập nhật `prisma/seed.ts` để đọc chính xác cột `Phòng ban cha` trong Excel:
    - **Cấp 1 (9 Đơn vị cấp Tập đoàn):** `BAN LÃNH ĐẠO`, `PHÒNG KINH DOANH`, `BAN QLDA KCN NAM ĐÌNH VŨ 1`, `PHÒNG TÀI CHÍNH - KẾ TOÁN`, `PHÒNG HÀNH CHÍNH NHÂN SỰ`, `BAN PHÁP CHẾ`, `PHÒNG KẾ HOẠCH ĐẦU TƯ`, `PHÒNG PHÁT TRIỂN DỰ ÁN`, `BAN KIỂM SOÁT`.
    - **Cấp 2 (Bộ phận con trực thuộc):**
      + Trực thuộc Phòng Kinh Doanh: `Bộ phận Sales Marketing`, `Bộ phận CSKH`.
      + Trực thuộc Ban QLDA KCN Nam Đình Vũ 1: `Ban giám đốc KCN`, `Bộ phận Kỹ thuật`, `Bộ phận Điện nước`, `Bộ phận Giao nhận`, `Bộ phận Cảnh quan`, `Bộ phận Văn phòng`, `Bộ phận PCCC`.
- [ ] **Bước 2.2: Quy chuẩn Phân quyền Kế thừa Dữ liệu theo Nhánh (Data Scope Cascade)**
  - [ ] Xây dựng helper `getAccessibleDepartmentIds(user)`:
    - Nếu là Quản lý cấp Cha (Vd: Trưởng phòng Kinh Doanh): Tự động bao quát ID phòng cha + tất cả ID bộ phận con.
    - Nếu là Quản lý cấp Con (Vd: Trưởng bộ phận Kỹ thuật): Chỉ quản lý trong phạm vi ID bộ phận con của mình.
- [ ] **Bước 2.3: Xây dựng Server Actions Phòng Ban (`src/actions/department.ts`)**
  - [ ] `getDepartments`: Lấy danh sách phòng ban kèm thông tin phòng ban cha, đếm số lượng nhân sự trực thuộc (`_count: { users: true }`).
  - [ ] `createDepartment`: Thêm phòng ban mới (cho phép chọn phòng ban cha nếu là bộ phận con).
  - [ ] `updateDepartment`: Chỉnh sửa tên, mã, mô tả, thay đổi phòng ban cha.
  - [ ] `deleteDepartment`: Xóa phòng ban an toàn (từ chối xóa nếu còn phòng ban con hoặc nhân viên trực thuộc).
- [ ] **Bước 2.4: Xây dựng Giao diện Phòng Ban (`src/app/(dashboard)/departments/page.tsx`)**
  - [ ] Hiển thị danh sách dạng Cây phân cấp (Tree View) hoặc Nhóm lồng nhau trực quan.
  - [ ] Hỗ trợ Responsive Mobile (Card View lồng nhau trên mobile, Data Table trên desktop).
  - [ ] Dialog Thêm mới / Chỉnh sửa phòng ban (React Hook Form + Zod, 100% AJAX).

---

### GIAI ĐOẠN 3: QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (CORE HR)
> *Mục tiêu: Quản lý danh sách 67 cán bộ nhân viên, xem chi tiết, chỉnh sửa thông tin và gán vai trò kiêm nhiệm.*

- [ ] **Bước 3.1: Xây dựng DTO Schemas Validation (`src/lib/validations/user.ts`)**
  - [ ] Schema Tạo/Sửa nhân viên: Họ tên, Mã NV, Chức vụ, Phòng ban (hỗ trợ chọn bộ phận con hoặc phòng cha), Username, Password, SĐT, Email, Ngày sinh, Ngày vào làm, Danh sách Roles.
- [ ] **Bước 3.2: Xây dựng Server Actions Nhân Sự (`src/actions/employee.ts`)**
  - [ ] `getEmployees`: Lọc theo Phòng ban (hỗ trợ lọc theo phòng cha thì ra toàn bộ nhân sự các phòng con), Vai trò, Trạng thái, Tìm kiếm thời gian thực, Phân trang.
  - [ ] `getEmployeeById`: Lấy thông tin chi tiết nhân viên kèm Phòng ban và các Vai trò.
  - [ ] `createEmployee`: Tạo User mới, băm password, gán phòng ban và danh sách vai trò (`UserRole`).
  - [ ] `updateEmployee`: Cập nhật thông tin hồ sơ, phòng ban và cập nhật danh sách vai trò.
  - [ ] `toggleEmployeeStatus`: Kích hoạt / Khóa tài khoản nhân sự tức thì (kèm ghi AuditLog).
  - [ ] `resetEmployeePassword`: Đặt lại mật khẩu cho nhân sự.
- [ ] **Bước 3.3: Xây dựng Giao diện Danh sách Nhân sự (`src/app/(dashboard)/employees/page.tsx`)**
  - [ ] Toolbar: Ô tìm kiếm thời gian thực, Bộ lọc Phòng ban phân cấp, Bộ lọc Vai trò, Nút "Thêm nhân viên" màu Sao Đỏ Red (`bg-primary`).
  - [ ] Data Grid (TanStack Table) chuẩn Responsive:
    - Desktop: Table đầy đủ Avatar, Họ tên, Mã NV, Chức vụ, Phòng ban, SĐT, Vai trò, Trạng thái, Menu thao tác.
    - Mobile: Card View hiển thị thẻ nhân sự nhỏ gọn kèm menu 3 chấm.
- [ ] **Bước 3.4: Xây dựng Modal / Sheet Thêm & Sửa Nhân viên**
  - [ ] Thiết kế Sheet / Dialog 2 cột bố cục rõ ràng (Cá nhân, Công việc, Tài khoản & Chọn các Vai trò).

---

### GIAI ĐOẠN 4: MA TRẬN PHÂN QUYỀN ĐỘNG 3 CẤP ĐỘ & BẢO VỆ PHÂN HỆ (RBAC MATRIX)
> *Mục tiêu: Quản lý ma trận phân quyền 3 cấp độ (NONE, VIEW, MANAGE) cho từng Phân hệ (HR, TASK, SYSTEM...), nạp vào Session để kiểm tra tức thì (0ms) ở Server Action và Giao diện.*

- [x] **Bước 4.1: Xây dựng Thư viện Auth & Session Guard (`src/lib/auth.ts`)**
  - [x] Khởi tạo Session chứa danh tính người dùng và quyền phân hệ: `{ HR: "NONE" | "VIEW" | "MANAGE", TASK: "NONE" | "VIEW" | "MANAGE" }`.
  - [x] Đăng nhập xác thực với bcrypt và ghi nhận nhật ký vào `AuditLog`.
- [ ] **Bước 4.2: Xây dựng Server Actions Phân Quyền (`src/actions/role.ts`)**
  - [ ] `getRolesWithPermissions`: Lấy danh sách các vai trò và cấp độ quyền tương ứng theo phân hệ.
  - [ ] `createRole`: Tạo thêm Nhóm vai trò mới trực tiếp trên UI.
  - [ ] `updateRolePermissions`: Cập nhật cấp độ quyền cho vai trò theo từng phân hệ.
  - [ ] `assignRolesToUser`: Gán/gỡ vai trò chính và vai trò kiêm nhiệm cho nhân sự.
- [ ] **Bước 4.3: Xây dựng Giao diện Ma trận Phân quyền (`src/app/(dashboard)/roles/page.tsx`)**
  - [ ] Bảng Ma trận trực quan: Cột là các Vai trò, Dòng là các Phân hệ với các tùy chọn cấp độ (`NONE` / `VIEW` / `MANAGE`).
  - [ ] Nút "Thêm vai trò mới" tạo nhanh role mới và cập nhật phân quyền tức thì.

---

### GIAI ĐOẠN 5: TÍCH HỢP ĐIỀU HƯỚNG & KIỂM THỬ TOÀN TRÌNH
- [x] **Bước 5.1: Cập nhật Sidebar Navigation chuẩn Responsive**
  - [x] Menu Desktop cố định, Menu Mobile dạng Drawer trượt (`Sheet`).
  - [x] Nhóm menu "Quản lý Nhân sự", "Cơ cấu tổ chức" và "Nhật ký hoạt động".
  - [x] Tích hợp Logo Sao Đỏ Group và Avatar tài khoản.
- [ ] **Bước 5.2: Kiểm thử Toàn trình (End-to-End Test)**
  - [ ] Kiểm thử đăng nhập bằng các tài khoản thật từ file Excel.
  - [ ] Kiểm thử phân cấp phòng ban cha - con và kiểm tra quyền kế thừa nhánh dữ liệu.
  - [ ] Kiểm tra hiển thị và thao tác trên thiết bị di động.

---

## 🎯 QUY TRÌNH THỰC HIỆN BẮT BUỘC

Mỗi khi thực hiện một câu lệnh hoặc có sửa đổi kỹ thuật:
1. AI Agent **BẮT BUỘC** cập nhật trạng thái tiến độ vào tệp Checklist này.
2. Đánh dấu `[x]` vào các mục đã hoàn tất.
3. Ghi nhận rõ các thay đổi kiến trúc mới phát sinh.
