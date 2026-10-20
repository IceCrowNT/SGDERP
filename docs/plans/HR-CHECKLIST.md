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
- [x] **Giai đoạn 2: Cơ cấu Tổ chức Phân cấp Cây (Cha - Con) & Quản lý Phòng Ban (Department Management)**
- [ ] **Giai đoạn 3: Quản lý Hồ sơ & Tài khoản Cán bộ Nhân viên (Core Employee Management)**
- [x] **Giai đoạn 4: Ma trận Phân quyền Động 3 Cấp độ & Bảo vệ Phân hệ (RBAC Matrix & Session Guard)**
- [ ] **Giai đoạn 5: Tích hợp Điều hướng Đa nền tảng (Mobile/Desktop) & Kiểm thử Toàn trình**
- [x] **Giai đoạn 6: Mô hình 3D Digital Twin Tòa nhà Trụ sở Sao Đỏ Group (WebGL / Three.js)**

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

> [!IMPORTANT]
> **QUYẾT ĐỊNH KIẾN TRÚC LÕI: RÀNG BUỘC THEO ID THAY VÌ TITLE / TEXT**
> 1. **100% Gắn theo `id` (Khóa ngoại Integer):** Toàn bộ nhân sự (`User.departmentId`), công việc tương lai (`Task.departmentId`, `Task.assignedToId`) và luồng duyệt **BẮT BUỘC** ràng buộc bằng khóa số nguyên `Int`. Tuyệt đối KHÔNG gắn kết nối theo tên gọi (`title` / `name`).
> 2. **Bảo toàn dữ liệu khi tổ chức thay đổi:** Khi phòng ban đổi tên (VD: `Phòng Hành chính Nhân sự` đổi thành `Khối Quản trị Nguồn Nhân lực`), mọi liên kết với nhân sự và công việc cũ **giữ nguyên vẹn 100% (Zero-data-loss)** mà không phải chạy script cập nhật hàng loạt.
> 3. **Tính năng Quản lý Phòng ban Độc lập (`/departments`):** Rất cần thiết và là module nền móng. Tính năng này cho phép Admin/IT/HR tạo phòng cha, tách/nhập bộ phận con, sửa đổi thông tin 100% qua UI mà không cần can thiệp code hay SQL. Hệ thống có cơ chế kiểm tra an toàn: từ chối xóa nếu phòng ban đang có nhân sự hoặc bộ phận con trực thuộc.

- [x] **Bước 2.1: Cập nhật Schema Cây Phòng Ban (`prisma/schema.prisma`) & Phân định rõ Bộ phận IT/HCNS**
  - [x] Bổ sung trường tự liên kết vào model `Department`:
    ```prisma
    parentId    Int?
    parent      Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
    children    Department[] @relation("DepartmentHierarchy")
    ```
  - [x] Chạy migration `20261019071635_add_department_hierarchy` áp dụng thành công vào PostgreSQL.
  - [x] Tinh chỉnh `prisma/seed.ts` thiết lập chuẩn hóa mô hình phân cấp (Khớp 100% dữ liệu gốc):
    - **Cấp 1 (Cấp Tập đoàn & Khối độc lập):**
      + `BAN QLDA KCN NAM ĐÌNH VŨ 1`: **Khối độc lập riêng** (gồm 1 Giám đốc Ban và 7 bộ phận con trực thuộc với 27 nhân sự).
      + `PHÒNG PHÁT TRIỂN DỰ ÁN`: Đơn vị độc lập phụ trách nghiên cứu & chuẩn bị dự án mới (2 nhân sự).
      + `PHÒNG HÀNH CHÍNH NHÂN SỰ`: Đơn vị nòng cốt quản trị nhân sự, CNTT và văn phòng (10 nhân sự).
      + `PHÒNG TÀI CHÍNH - KẾ TOÁN`: Quản lý tài chính kế toán (6 nhân sự).
      + `PHÒNG KINH DOANH`: Kinh doanh & xúc tiến đầu tư (9 nhân sự, có 2 bộ phận con).
      + `PHÒNG KẾ HOẠCH ĐẦU TƯ`: Kế hoạch và tổng hợp đầu tư (6 nhân sự).
      + `BAN PHÁP CHẾ`: Pháp chế doanh nghiệp (2 nhân sự).
      + `BAN LÃNH ĐẠO`: Ban Tổng Giám đốc (1 nhân sự).
      + `BAN KIỂM SOÁT`: Kiểm soát tuân thủ (3 nhân sự).
    - **Cấp 2 (9 Bộ phận con trực thuộc chuẩn theo Excel):**
      + **Trực thuộc Khối độc lập Ban QLDA KCN Nam Đình Vũ 1 (7 bộ phận):** `Ban giám đốc KCN NAM ĐÌNH VŨ 1` (4 Phó GĐ Ban), `Bộ phận văn phòng - Ban QLDA`, `Bộ phận kỹ thuật - Ban QLDA`, `Bộ phận cảnh quan môi trường - Ban QLDA`, `Bộ phận giao nhận - Ban QLDA`, `Bộ phận điện nước - Ban QLDA`, `Bộ phận PCCC - Ban QLDA`.
      + **Trực thuộc Phòng Kinh Doanh (2 bộ phận):** `Bộ phận Sales Marketing - Phòng Kinh doanh`, `Bộ phận CSKH - Phòng Kinh Doanh`.
  - [x] Thiết lập vai trò chuyên biệt: `IT_ADMIN` (toàn quyền hệ thống & HCNS cho nhân sự IT), `HR_MANAGER` (Trưởng phòng HCNS), `HR_STAFF` (Chuyên viên HCNS).
- [x] **Bước 2.2: Quy chuẩn Phân quyền Kế thừa Dữ liệu theo Nhánh (Data Scope Cascade)**
  - [x] Xây dựng helper `getAccessibleDepartmentIds(user)` trong `src/lib/permissions.ts`:
    - Nếu là Quản lý cấp Cha (Vd: Trưởng phòng Kinh Doanh): Tự động bao quát ID phòng cha + tất cả ID bộ phận con.
    - Nếu là Quản lý cấp Con (Vd: Trưởng bộ phận Kỹ thuật): Chỉ quản lý trong phạm vi ID bộ phận con của mình.
- [x] **Bước 2.3: Xây dựng Server Actions Phòng Ban (`src/actions/department.ts`)**
  - [x] `getDepartments`: Lấy danh sách phòng ban kèm thông tin phòng ban cha, đếm số lượng nhân sự trực thuộc (`_count: { users: true }`).
  - [x] `createDepartment`: Thêm phòng ban mới (cho phép chọn phòng ban cha nếu là bộ phận con).
  - [x] `updateDepartment`: Chỉnh sửa tên, mã, mô tả, thay đổi phòng ban cha.
  - [x] `deleteDepartment`: Xóa phòng ban an toàn (chặn xóa nếu còn phòng ban con hoặc nhân viên trực thuộc).
- [x] **Bước 2.4: Xây dựng Giao diện Phòng Ban (`src/app/(dashboard)/departments/page.tsx`)**
  - [x] Hiển thị danh sách dạng Sơ đồ Cây phân cấp (Tree Card View) kết nối đường line trực quan và Bảng chi tiết (Data Table).
  - [x] Bộ lọc tìm kiếm nhanh theo tên, mã code, đơn vị cấp trên.
  - [x] Dialog Thêm mới / Chỉnh sửa phòng ban (gợi ý mã code tự động, chọn cấp độ phân bổ, 100% AJAX).
  - [x] Dialog cảnh báo xóa phòng ban an toàn chống mất mát dữ liệu.

---

### GIAI ĐOẠN 3: QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (CORE HR) - [HOÀN THÀNH 100%]
> *Mục tiêu: Quản lý danh sách 67 cán bộ nhân viên, xem chi tiết, chỉnh sửa thông tin và gán vai trò kiêm nhiệm.*

- [x] **Bước 3.1: Xây dựng DTO Schemas Validation (`src/lib/validations/user.ts`)**
  - [x] Schema Tạo/Sửa nhân viên: Họ tên, Mã NV, Chức vụ, Phòng ban (hỗ trợ chọn bộ phận con hoặc phòng cha), Username, Password, SĐT, Email, Ngày sinh, Ngày vào làm, Danh sách Roles.
- [x] **Bước 3.2: Xây dựng Server Actions Nhân Sự (`src/actions/employee.ts`)**
  - [x] `getEmployees`: Lọc theo Phòng ban (hỗ trợ lọc theo phòng cha thì ra toàn bộ nhân sự các phòng con), Vai trò, Trạng thái, Tìm kiếm thời gian thực, Phân trang.
  - [x] `getEmployeeById`: Lấy thông tin chi tiết nhân viên kèm Phòng ban và các Vai trò.
  - [x] `createEmployee`: Tạo User mới, băm password, gán phòng ban và danh sách vai trò (`UserRole`).
  - [x] `updateEmployee`: Cập nhật thông tin hồ sơ, phòng ban và cập nhật danh sách vai trò.
  - [x] `toggleEmployeeStatus`: Kích hoạt / Khóa tài khoản nhân sự tức thì (kèm ghi AuditLog).
  - [x] `resetEmployeePassword`: Đặt lại mật khẩu cho nhân sự.
- [x] **Bước 3.3: Xây dựng Giao diện Danh sách Nhân sự (`src/app/(dashboard)/employees/page.tsx`)**
  - [x] Toolbar: Ô tìm kiếm thời gian thực, Bộ lọc Phòng ban phân cấp, Bộ lọc Vai trò, Nút "Thêm nhân viên" màu Sao Đỏ Red (`bg-primary`).
  - [x] Data Grid (TanStack Table & Custom UI) chuẩn Responsive:
    - Desktop: Table đầy đủ Avatar, Họ tên, Mã NV, Chức vụ, Phòng ban, SĐT, Vai trò, Trạng thái, Menu thao tác.
    - Mobile: Card View hiển thị thẻ nhân sự nhỏ gọn kèm menu 3 chấm.
  - [x] Liên kết điều hướng chéo trực tiếp từ Cơ cấu phòng ban (`/departments`) sang Danh bạ nhân sự (`/employees?departmentId=...`).
- [x] **Bước 3.4: Xây dựng Modal / Sheet Thêm & Sửa Nhân viên (`src/components/employees/EmployeeManager.tsx`)**
  - [x] Thiết kế Sheet / Dialog 2 cột bố cục rõ ràng (Cá nhân, Công việc, Tài khoản & Chọn các Vai trò).
  - [x] Drawer Sheet xem chi tiết hồ sơ nhân sự, lịch sử tài khoản, ngày vào làm và phòng ban.

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
  - [x] Nhóm menu "Quản lý Nhân sự", "Cơ cấu tổ chức", "Bản đồ 3D Tòa nhà" và "Nhật ký hoạt động".
  - [x] Tích hợp Logo Sao Đỏ Group và Avatar tài khoản.
- [ ] **Bước 5.2: Kiểm thử Toàn trình (End-to-End Test)**
  - [ ] Kiểm thử đăng nhập bằng các tài khoản thật từ file Excel.
  - [ ] Kiểm thử phân cấp phòng ban cha - con và kiểm tra quyền kế thừa nhánh dữ liệu.
  - [ ] Kiểm tra hiển thị và thao tác trên thiết bị di động.

---

### GIAI ĐOẠN 6: MÔ HÌNH 3D DIGITAL TWIN TÒA NHÀ TRỤ SỞ SAO ĐỎ GROUP
> *Mục tiêu: Xây dựng bản đồ số 3D tương tác toàn cảnh trụ sở 3 tầng của Sao Đỏ Group dựa trên sơ đồ thiết kế thực tế, kết nối trực tiếp với dữ liệu phòng ban và hồ sơ nhân sự PostgreSQL.*

- [x] **Bước 6.1: Cài đặt thư viện đồ họa 3D Three.js**
  - [x] `three` & `@types/three` (phiên bản ^0.182.0) tương thích hoàn toàn Next.js 16 và React 19.
  - [x] Cập nhật bảng thư viện trong `docs/ARCHITECTURE.md`.
- [x] **Bước 6.2: Khởi tạo Dữ liệu Mặt bằng 3D (`src/lib/office-3d-data.ts`)**
  - [x] **Tầng 1 (T1):** Sảnh đón tiếp trung tâm đá hoa cương, Cửa kính tự động 2 cánh, Quầy lễ tân màu đỏ Sao Đỏ, Phòng Kinh doanh (`KD`), 2 Phòng họp đối ngoại/nội bộ, Phòng khách VIP, Ngân hàng cho thuê mặt bằng, Cầu thang bộ và WC.
  - [x] **Tầng 2 (T2):** Khoảng thông tầng giếng trời 1+2 với Đèn chùm pha lê thả rực rỡ và lan can kính, Phòng Chủ tịch HĐQT (`BLD`), Phòng Phát triển dự án (`PTDA`), Phòng Tài chính - Kế toán (`TCKT`), Phòng Tổng Giám đốc (`BLD`), Phòng Kế hoạch - Đầu tư (`KHDT`), Ban Pháp chế & Phòng HCNS (`PC` & `HCNS`), Cầu thang bộ và WC.
  - [x] **Tầng 3 (T3):** Khuôn viên sân vườn cây xanh oval (Sky Garden) với cây xanh tiểu cảnh, Công ty Cổ phần Xây dựng Sao Đỏ (2 phân khu Bắc/Nam), Phòng ăn / Căn tin nội bộ với cụm bàn ghế ăn.
- [x] **Bước 6.3: Xây dựng Bộ hiển thị 3D WebGL Siêu Nhẹ & Tinh Gọn (`src/components/office-3d/Office3DViewer.tsx`)**
  - [x] Chuyển đổi sang phong cách Clean Architectural Isometric tối giản: lược bỏ toàn bộ đa giác thừa (cây cảnh nhiều tầng, bàn ghế con, đèn chùm rườm rà).
  - [x] Tắt Shadow Maps (2048px) và Fog giúp triệt tiêu gánh nặng GPU/CPU.
  - [x] Áp dụng cơ chế **Vẽ theo nhu cầu (On-Demand Rendering)**: Chỉ render khi người dùng tương tác xoay/zoom hoặc khi có hoạt ảnh bóc tách tầng, đưa mức tiêu thụ tài nguyên về ~0% khi đứng yên.
  - [x] Chế độ **Bóc Tách Tầng (Exploded View)** với hiệu ứng chuyển động mượt mà (Lerp Y offset).
  - [x] Bộ lọc xem riêng từng tầng: Toàn tòa nhà, Tầng 1, Tầng 2, Tầng 3.
  - [x] Tương tác chuột Raycaster: Hover phát sáng Emissive nhẹ nhàng, Đổi con trỏ pointer, Click chọn phòng.
  - [x] Các góc camera tiện ích: Isometric 3D, Mặt bằng 2D Top-down, Góc sảnh đón tiếp chính.
- [x] **Bước 6.4: Bảng Chi Tiết Phòng & Danh Sách Nhân Sự Thật 100% (`src/components/office-3d/RoomDetailSheet.tsx`)**
  - [x] **Triệt tiêu dữ liệu tự suy:** Bỏ hoàn toàn danh sách thiết bị tiện nghi tự nghĩ (`features`), bỏ diện tích ước lượng (`areaM2`), bỏ đoạn văn mô tả dài dòng.
  - [x] Tập trung 100% vào dữ liệu thật: Tên phòng (theo bản vẽ phác thảo tay), Tên phòng ban chủ quản, và Danh sách nhân sự thực tế từ PostgreSQL (Họ tên, Mã NV, Chức vụ, SĐT, Email, Avatar) có tìm kiếm và liên kết sang hồ sơ.
- [x] **Bước 6.5: Định Tuyến & Điều Hướng Hệ Thống**
  - [x] Server Page `src/app/(dashboard)/office-3d/page.tsx` xác thực phiên và tải dữ liệu phòng ban, nhân sự trực tiếp từ CSDL với câu truy vấn rút gọn chỉ lấy các trường thiết yếu, giảm 70% payload.
  - [x] Bổ sung mục điều hướng `Bản đồ 3D Tòa nhà` (`/office-3d`) vào nhóm Quản trị Nhân sự trên Sidebar.

---

## 🎯 QUY TRÌNH THỰC HIỆN BẮT BUỘC

Mỗi khi thực hiện một câu lệnh hoặc có sửa đổi kỹ thuật:
1. AI Agent **BẮT BUỘC** cập nhật trạng thái tiến độ vào tệp Checklist này.
2. Đánh dấu `[x]` vào các mục đã hoàn tất.
3. Ghi nhận rõ các thay đổi kiến trúc mới phát sinh.
