# QUY TRÌNH & CHECKLIST TRIỂN KHAI PHÂN HỆ QUẢN LÝ NHÂN SỰ & MA TRẬN PHÂN QUYỀN (HR & RBAC MATRIX MODULE)
> **Dự án:** Sao Đỏ Group ERP (SDG ERP)  
> **Kiến trúc:** CSDL Tối ưu ERP (Hồ sơ `User` phẳng kết hợp Ma trận Phân quyền động đa chiều `Role` - `Permission` - `UserRole`).  
> **Khả năng mở rộng (Dynamic Scalability):**  
> • **Mở rộng Phòng ban 100% qua UI:** Tự do thêm phòng ban, ban QLDA, chi nhánh mới mà không cần can thiệp code hay chạy migration CSDL.  
> • **Mở rộng Vai trò & Phân quyền 100% qua UI:** Tự do tạo thêm Role mới (Chỉ huy trưởng, Kiểm toán...), hệ thống tự động sinh thêm cột trên bảng Ma trận Checkbox để tích chọn quyền.  
> • **Sẵn sàng cho Module tương lai:** Làm nền móng vững chắc cho Quản lý công việc (`TASK`), Phê duyệt (`APPROVAL`), Kho vận...  
> **Quy chuẩn áp dụng:** Tuân thủ 100% [DATABASE-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/DATABASE-RULES.md), [BACKEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/BACKEND-RULES.md), và [FRONTEND-RULES.md](file:///d:/VS%20code/SDG/.agents/rules/FRONTEND-RULES.md).

---

## 📌 BẢNG TIẾN ĐỘ TỔNG QUAN

- [x] **Bước Chuẩn bị: Thiết lập Cấu trúc CSDL Phân quyền Ma trận (Prisma Migration `erp_rbac_matrix`)**
- [x] **Giai đoạn 1: Khởi tạo Thư viện UI & Nạp Dữ liệu thực tế 67 Nhân sự từ Excel**
- [ ] **Giai đoạn 2: Quản lý Cơ cấu Tổ chức & 19 Phòng Ban / Ban QLDA (Department Management)**
- [ ] **Giai đoạn 3: Quản lý Hồ sơ & Tài khoản Cán bộ Nhân viên (Core Employee Management)**
- [ ] **Giai đoạn 4: Ma trận Phân quyền theo Phân hệ & Cơ chế Bảo vệ Động (RBAC Guards & Matrix UI)**
- [ ] **Giai đoạn 5: Tích hợp Điều hướng Đa nền tảng (Mobile/Desktop) & Kiểm thử Toàn trình**

---

## 📋 CHI TIẾT TỪNG BƯỚC TRIỂN KHAI

---

### BƯỚC CHUẨN BỊ: THIẾT LẬP CƠ SỞ DỮ LIỆU
- [x] Thiết lập model `Role`, `Permission`, `RolePermission`, `UserRole` với cờ `isPrimary` cho phép kiêm nhiệm.
- [x] Tạo migration `20261014112000_erp_rbac_matrix` và chạy `npx prisma migrate deploy` thành công.
- [x] Sinh lại Prisma Client v6.19.3.
- [x] Bổ sung quy chuẩn bắt buộc về kiểm tra quyền RBAC và Responsive Mobile vào `BACKEND-RULES.md`, `FRONTEND-RULES.md` và `AGENTS.md`.

---

### GIAI ĐOẠN 1: THƯ VIỆN UI & NẠP DỮ LIỆU THỰC TẾ TỪ EXCEL
> *Mục tiêu: Đảm bảo đầy đủ component giao diện và nạp toàn bộ 19 phòng ban, 67 nhân sự thật của Sao Đỏ Group vào CSDL.*

- [x] **Bước 1.1: Bổ sung các Shadcn UI Components cần thiết**
  - [x] Cài đặt Table: `npx shadcn@latest add table`
  - [x] Cài đặt Dialog & Sheet (Modal / Drawer form): `npx shadcn@latest add dialog sheet`
  - [x] Cài đặt Dropdown Menu & Select: `npx shadcn@latest add dropdown-menu select`
  - [x] Cài đặt Badge & Avatar: `npx shadcn@latest add badge avatar`
  - [x] Cài đặt Tabs & Tooltip: `npx shadcn@latest add tabs tooltip`
  - [x] Cài đặt Thông báo Sonner (Toast notifications): `npx shadcn@latest add sonner`

- [x] **Bước 1.2: Cài đặt các thư viện bổ trợ**
  - [x] `@tanstack/react-table` (cho Data Grid phân trang/lọc dữ liệu chuyên nghiệp).
  - [x] `lucide-react` (Bộ icon chuẩn).
  - [x] `bcryptjs` & `@types/bcryptjs` (Băm mật khẩu tài khoản người dùng).
  - [x] `xlsx` (Đọc dữ liệu Excel).

- [x] **Bước 1.3: Viết Script Nạp Dữ Liệu Thực Tế (`prisma/seed.ts`)**
  - [x] Đọc trực tiếp tệp `docs/HR_danhsachnhanvien/67-ban-ghi-Ho-so-nhan-su-ngay-14102026.xlsx`.
  - [x] Khởi tạo Công ty mặc định: `CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ SAO ĐỎ`.
  - [x] Trích xuất và tạo tự động **18 Phòng ban / Ban QLDA thật**.
  - [x] Khởi tạo danh mục các Nhóm vai trò chuẩn ban đầu (`Role`): `ADMIN`, `DEPT_HEAD`, `HR`, `ACCOUNTANT`, `STAFF`.
  - [x] Khởi tạo danh mục Quyền cơ bản (`Permission`) cho phân hệ `HR`, `TASK` và `SYSTEM`.
  - [x] Nạp toàn bộ **67 Cán bộ Nhân viên thật** (`User`):
    - Mã NV từ `Mã NS` (chuẩn hóa `SDG-xxx`).
    - Username từ `Tài khoản 1Office`.
    - Họ tên, SĐT, Ngày sinh, Ngày vào làm, Chức vụ.
    - Mật khẩu băm mặc định an toàn (`Sdg@123456`).
    - Gán vào phòng ban tương ứng và cấp vai trò (`UserRole`).

---

### GIAI ĐOẠN 2: QUẢN LÝ PHÒNG BAN & MỞ RỘNG TỔ CHỨC ĐỘNG (DEPARTMENT)
> *Mục tiêu: Quản lý danh mục 19 phòng ban hiện hữu và cho phép người dùng tự do mở rộng phòng ban mới 100% qua UI mà không cần sửa code.*

- [ ] **Bước 2.1: Xây dựng Server Actions Phòng Ban (`src/actions/department.ts`)**
  - [ ] `getDepartments`: Lấy danh sách phòng ban kèm đếm số lượng nhân sự (`_count: { users: true }`).
  - [ ] `createDepartment`: Thêm phòng ban mới (Kiểm tra quyền `HR:MANAGE`, validate Zod, tự động xuất hiện ở các dropdown toàn hệ thống).
  - [ ] `updateDepartment`: Chỉnh sửa tên, mã, mô tả phòng ban.
  - [ ] `deleteDepartment`: Xóa phòng ban (Ràng buộc an toàn: từ chối xóa nếu còn nhân viên đang trực thuộc).

- [ ] **Bước 2.2: Xây dựng Giao diện Phòng Ban (`src/app/(dashboard)/departments/page.tsx`)**
  - [ ] Bảng danh sách phòng ban hỗ trợ Mobile Responsive (Card View trên mobile, Table trên desktop).
  - [ ] Dialog Thêm mới / Chỉnh sửa phòng ban (React Hook Form + Zod, 100% AJAX không reload trang).
  - [ ] Cơ chế tìm kiếm nhanh phòng ban và xem số lượng nhân sự trực thuộc.

---

### GIAI ĐOẠN 3: QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (CORE HR)
> *Mục tiêu: Quản lý danh sách 67 cán bộ nhân viên, xem chi tiết, chỉnh sửa thông tin và gán vai trò kiêm nhiệm.*

- [ ] **Bước 3.1: Xây dựng DTO Schemas Validation (`src/lib/validations/user.ts`)**
  - [ ] Schema Tạo/Sửa nhân viên: Họ tên, Mã NV, Chức vụ, Phòng ban, Username, Password, SĐT, Email, Ngày sinh, Ngày vào làm, Danh sách Roles được gán (phân rõ vai trò chính và vai trò kiêm nhiệm).

- [ ] **Bước 3.2: Xây dựng Server Actions Nhân Sự (`src/actions/employee.ts`)**
  - [ ] `getEmployees`: Lọc theo Phòng ban, Vai trò, Trạng thái, Tìm kiếm thời gian thực, Phân trang.
  - [ ] `getEmployeeById`: Lấy thông tin chi tiết nhân viên kèm Phòng ban và các Vai trò.
  - [ ] `createEmployee`: Tạo User mới, băm password, gán phòng ban và danh sách vai trò (`UserRole`).
  - [ ] `updateEmployee`: Cập nhật thông tin hồ sơ, phòng ban và cập nhật danh sách vai trò.
  - [ ] `toggleEmployeeStatus`: Kích hoạt / Khóa tài khoản nhân sự tức thì.
  - [ ] `resetEmployeePassword`: Đặt lại mật khẩu cho nhân sự.

- [ ] **Bước 3.3: Xây dựng Giao diện Danh sách Nhân sự (`src/app/(dashboard)/employees/page.tsx`)**
  - [ ] Thanh công cụ (Toolbar): Ô tìm kiếm thời gian thực, Bộ lọc Phòng ban (tự động cập nhật khi có phòng mới), Bộ lọc Vai trò (tự động cập nhật khi có role mới), Nút "Thêm nhân viên" màu Sao Đỏ Red (`bg-primary`).
  - [ ] Data Grid (TanStack Table) chuẩn Responsive:
    - Desktop: Table đầy đủ Avatar, Họ tên, Mã NV, Chức vụ, Phòng ban, SĐT, Vai trò, Trạng thái, Menu thao tác.
    - Mobile: Card View hiển thị thẻ nhân sự nhỏ gọn kèm menu 3 chấm, tối ưu vùng chạm cảm ứng (`min-h-10`).
  - [ ] Phân trang 100% AJAX.

- [ ] **Bước 3.4: Xây dựng Modal / Sheet Thêm & Sửa Nhân viên**
  - [ ] Thiết kế Sheet / Dialog 2 cột bố cục rõ ràng (Cá nhân, Công việc, Tài khoản & Chọn các Vai trò).
  - [ ] Tích hợp React Hook Form + Zod, phản hồi thông báo bằng Sonner toast.

---

### GIAI ĐOẠN 4: MA TRẬN PHÂN QUYỀN ĐỘNG & BẢO VỆ PHÂN HỆ (RBAC MATRIX)
> *Mục tiêu: Cho phép người quản trị tự do tạo Role mới, sinh cột ma trận trên giao diện web và tích chọn quyền theo Module/Scope.*

- [ ] **Bước 4.1: Xây dựng Thư viện Auth & Permission Guard (`src/lib/permissions.ts`)**
  - [ ] `hasPermission(session, module, action)`: Kiểm tra quyền tức thì từ Session (0ms, không query DB).
  - [ ] `requirePermission(session, module, action)`: Ném lỗi 403 nếu không đủ quyền.
  - [ ] Hỗ trợ Data Scope: `ALL` (Toàn công ty), `DEPARTMENT` (Nội bộ phòng), `PERSONAL` (Cá nhân).

- [ ] **Bước 4.2: Xây dựng Server Actions Phân Quyền (`src/actions/role.ts`)**
  - [ ] `getRolesWithPermissions`: Lấy danh sách các vai trò và toàn bộ danh mục quyền theo từng Module (`HR`, `TASK`, `SYSTEM`).
  - [ ] `createRole`: Tạo thêm Nhóm vai trò mới trực tiếp trên UI (tự sinh cột mới trên bảng ma trận).
  - [ ] `updateRolePermissions`: Cập nhật ma trận quyền hạn cho một vai trò bằng cách tích/bỏ tích checkbox.
  - [ ] `assignRolesToUser`: Gán/gỡ vai trò chính và vai trò kiêm nhiệm cho nhân viên.

- [ ] **Bước 4.3: Xây dựng Giao diện Ma trận Phân quyền (`src/app/(dashboard)/roles/page.tsx`)**
  - [ ] Bảng Ma trận Checkbox tương tác thời gian thực: Dòng là các Quyền theo Phân hệ, Cột là các Vai trò.
  - [ ] Nút "Thêm vai trò mới" -> Tự sinh ngay 1 cột mới trên bảng để tích chọn quyền.
  - [ ] AJAX phản hồi tức thì với hiệu ứng lưu ngầm không reload trang.

---

### GIAI ĐOẠN 5: TÍCH HỢP ĐIỀU HƯỚNG & KIỂM THỬ TOÀN TRÌNH
> *Mục tiêu: Đưa các tính năng lên Menu hệ thống và kiểm thử toàn trình.*

- [ ] **Bước 5.1: Cập nhật Sidebar Navigation chuẩn Responsive**
  - [ ] Menu Desktop cố định, Menu Mobile dạng Drawer trượt (`Sheet`).
  - [ ] Nhóm menu **"Quản lý Nhân sự"** và **"Phân quyền Hệ thống"**.
  - [ ] Ẩn/hiện mục menu dựa theo quyền sở hữu của User đăng nhập.
- [ ] **Bước 5.2: Kiểm thử Toàn trình (End-to-End Test)**
  - [ ] Kiểm thử đăng nhập bằng các tài khoản thật từ file Excel.
  - [ ] Kiểm thử thêm 1 phòng ban mới -> kiểm tra xuất hiện ngay ở bộ lọc và form nhân sự.
  - [ ] Kiểm thử thêm 1 role mới -> tích chọn quyền trên ma trận -> gán cho nhân viên -> kiểm tra quyền hiệu lực tức thì.
  - [ ] Kiểm tra hiển thị và thao tác trên thiết bị di động.

---

## 🎯 QUY TRÌNH THỰC HIỆN TỪNG BƯỚC

Mỗi khi bắt đầu một bước:
1. AI nêu rõ nội dung và mã nguồn chuẩn bị triển khai.
2. AI thực thi mã nguồn và kiểm tra độ chính xác.
3. Người dùng trải nghiệm và xác nhận.
4. AI đánh dấu `[x]` vào checklist và tiến sang bước tiếp theo.
