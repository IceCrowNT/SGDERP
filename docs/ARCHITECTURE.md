# TÀI LIỆU KIẾN TRÚC TỔNG THỂ & SỔ BỘ THƯ VIỆN
## SAO ĐỎ GROUP ERP (SDG ERP)

> **Vị trí tệp:** `docs/ARCHITECTURE.md`  
> **Vai trò:** Bản thiết kế kiến trúc hệ thống cấp cao (High-Level Architecture) & Sổ bộ quản lý Dependencies/Cấu hình hạ tầng.  
> **Nguyên tắc Single Source of Truth:** Tệp này **không lặp lại** các quy chuẩn chi tiết viết mã (Coding Standards). Khi cần tra cứu chi tiết cách lập trình, tham chiếu trực tiếp đến 3 tệp quy tắc trụ cột:
> * Cơ sở dữ liệu: [.agents/rules/DATABASE-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/DATABASE-RULES.md)
> * Backend & Server Actions: [.agents/rules/BACKEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/BACKEND-RULES.md)
> * Frontend & UI Theme: [.agents/rules/FRONTEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/FRONTEND-RULES.md)

---

## 1. TỔNG QUAN HỆ THỐNG & ĐỊNH VỊ CHIẾN LƯỢC

SDG ERP là hệ thống điều hành doanh nghiệp nội bộ tập trung của **Tập đoàn Sao Đỏ**, phục vụ Trụ sở Tập đoàn và **Khối độc lập Ban QLDA KCN Nam Đình Vũ 1**.

```mermaid
graph TD
    UserClient[Người Dùng: Web / Mobile Browser] --> NextMonolith[Next.js 16 Monolith - Port 4000]
    
    subgraph Presentation & Spatial
        TailwindUI[Tailwind CSS v4 + Shadcn/UI]
        DigitalTwin3D[Three.js WebGL - 3D Building Floorplan]
    end
    
    subgraph Core Execution
        AppRouter[App Router / Server Components]
        ServerActions[Direct-to-DB Server Actions]
    end
    
    subgraph Storage & External
        PrismaORM[Prisma ORM v6.19.3]
        LocalPostgres[(PostgreSQL 5432 - Dedicated Server)]
        AccountingServer[(Server Kế Toán Riêng - Tương Lai)]
    end

    NextMonolith --> TailwindUI
    NextMonolith --> DigitalTwin3D
    NextMonolith --> AppRouter
    AppRouter --> ServerActions
    ServerActions --> PrismaORM --> LocalPostgres
    ServerActions -.->|Tích hợp 2 chiều| AccountingServer
```

### Các Trục Nghiệp Vụ Trọng Tâm:
1. **Quản trị Nhân sự & Định danh (Core HR & IAM):** 67 nhân sự, cây phòng ban 2 cấp gắn ID số nguyên (`Int`), liên kết kế thừa quyền.
2. **Không gian số 3D Tòa nhà (Digital Twin 3D Office):** Trực quan hóa mặt bằng văn phòng, định vị phòng ban và hiển thị tức thì nhân sự ngồi tại từng phòng bằng WebGL Three.js.
3. **Quản trị Tài sản & Thiết bị IT (IT Asset Management):** Quản lý vòng đời máy móc, camera, bản quyền phần mềm cho phòng HCNS & IT.
4. **Điều hành Xe Công Vụ (Fleet Management):** Xếp lịch điều xe đưa đón giữa Tập đoàn và KCN Nam Đình Vũ.
5. **Cầu nối Phê duyệt Dự án (Executive Bridge):** Luân chuyển hồ sơ, biên bản bàn giao đất, nghiệm thu giữa Tập đoàn và Ban QLDA Nam Đình Vũ.

---

## 2. BẢN ĐỒ CẤU TRÚC THƯ MỤC DỰ ÁN

```
SGDERP/
├── .agents/                          # Quy tắc & Kỹ năng dành cho AI Agent
│   └── rules/                        # [3 TRỤ CỘT] DATABASE-RULES, BACKEND-RULES, FRONTEND-RULES
├── docs/                             # Tài liệu nghiệp vụ & Kế hoạch
│   ├── ARCHITECTURE.md               # [TỆP NÀY] Kiến trúc tổng thể & Sổ bộ thư viện
│   ├── plans/                        # Kế hoạch & Checklist phân hệ (HR-CHECKLIST.md...)
│   └── HR_danhsachnhanvien/          # Dữ liệu nguồn Excel 67 cán bộ nhân sự
├── prisma/                           # Schema PostgreSQL, Migrations & Seed data
│   ├── schema.prisma                 # Lược đồ quan hệ thực thể (Data Model)
│   ├── migrations/                   # Lịch sử các bản migration chính thức
│   └── seed.ts                       # Script khởi tạo 67 nhân viên, 18 phòng ban, 7 roles
├── src/
│   ├── actions/                      # Server Actions xử lý logic nghiệp vụ (Direct-to-DB)
│   ├── app/                          # Next.js App Router (Giao diện & Điều hướng)
│   │   ├── (auth)/login/             # Đăng nhập
│   │   ├── (dashboard)/              # Không gian làm việc chính
│   │   │   ├── departments/          # Quản lý cơ cấu phòng ban (Tree & Table)
│   │   │   ├── employees/            # Quản lý hồ sơ & danh bạ nhân sự
│   │   │   └── office-3d/            # [3D Digital Twin] Không gian văn phòng 3D
│   │   └── globals.css               # Theme tokens & CSS toàn cục
│   ├── components/                   # Thư viện UI Components
│   │   ├── ui/                       # Atomic UI (Shadcn/UI components)
│   │   ├── layout/                   # Sidebar, Navbar, Header
│   │   ├── departments/              # Giao diện Phòng ban
│   │   ├── employees/                # Giao diện Nhân sự
│   │   └── office-3d/                # Canvas 3D Three.js & Controls
│   └── lib/                          # Tiện ích dùng chung (db, auth, audit, permissions, utils)
├── .env                              # Biến môi trường local (PORT, DATABASE_URL, JWT_SECRET)
├── .env.example                      # File mẫu biến môi trường chuẩn
├── package.json                      # Danh mục dependencies và scripts chạy
└── tsconfig.json                     # Cấu hình TypeScript
```

---

## 3. SỔ BỘ THƯ VIỆN & CÔNG NGHỆ (DEPENDENCY REGISTRY)
> **Quy định:** Mỗi khi chạy lệnh `npm install`, Agent **bắt buộc** bổ sung thông tin thư viện vào bảng này.

| Nhóm Phân Loại | Gói Thư Viện (Package) | Phiên Bản | Mục Đích Nghiệp Vụ & Lý Do Cài Đặt |
| :--- | :--- | :---: | :--- |
| **Framework Lõi** | `next` | `16.4.0` | Nền tảng Fullstack chính (App Router, Server Components & Actions). |
| | `react`, `react-dom` | `19.3.0` | Thư viện Render UI Core. |
| | `typescript` | `^5` | Đảm bảo tính an toàn kiểu dữ liệu tĩnh (Type-safety). |
| **Cơ Sở Dữ Liệu** | `@prisma/client`, `prisma` | `^6.19.3` | ORM kết nối PostgreSQL. *(Khóa cứng v6, không lên v7/v8).* |
| | `dotenv` | `^18.0.7` | Nạp biến môi trường cho các tiến trình chạy CLI độc lập (seed, studio). |
| **Giao Diện & Style** | `tailwindcss`, `@tailwindcss/postcss` | `^4.3.3` | Engine styling thế hệ mới theo biến CSS Variables. |
| | `radix-ui` | `^1.7.0` | Headless Accessible UI primitives cho modal, dropdown, popover. |
| | `lucide-react` | `^1.52.0` | Bộ biểu tượng vector giao diện chuẩn nhất quán. |
| | `sonner` | `^2.0.8` | Hệ thống Toast thông báo trạng thái thao tác người dùng. |
| | `clsx`, `tailwind-merge`, `cva` | Latest | Hợp nhất class style an toàn qua hàm helper `cn()`. |
| **Không Gian Số 3D** | `three` | `^0.182.0` | **Engine WebGL dựng mô hình Tòa nhà & Mặt bằng 3D Digital Twin.** |
| | `@types/three` | `^0.182.0` | Type definitions đầy đủ cho Three.js. |
| **Bảo Mật & Xác Thực** | `jose` | `^6.2.12` | Ký & giải mã JWT Session Cookie cho kiến trúc Edge/Serverless. |
| | `bcryptjs` | `^3.0.3` | Băm mật khẩu tài khoản người dùng với Salt. |
| **Form & Xử Lý Dữ Liệu**| `zod` | `^3.25.76` | Xác thực Schema dữ liệu đầu vào phía Server Action. |
| | `react-hook-form`, `@hookform/resolvers` | `^7.89.0` | Quản lý trạng thái và validation biểu mẫu phức tạp. |
| | `@tanstack/react-table` | `^9.2.6` | Quản lý bảng dữ liệu nhân sự lớn (phân trang, lọc, sắp xếp). |
| | `xlsx` | `^0.18.5` | Đọc và nạp dữ liệu danh bạ nhân sự gốc từ file Excel. |

---

## 4. HẠ TẦNG & CẤU HÌNH MÔI TRƯỜNG (INFRASTRUCTURE & CONFIG)

### Các Cổng Dịch Vụ Mặc Định:
* **`4000`**: Cổng chạy ứng dụng Next.js ERP (`http://localhost:4000`).
* **`5432`**: Cổng máy chủ CSDL PostgreSQL (`localhost:5432`).
* **`5555`**: Cổng giao diện trực quan Prisma Studio (`http://localhost:5555`).

### Biến Môi Trường Chuẩn (`.env`):
```env
# Kết nối PostgreSQL (Cơ sở dữ liệu nội bộ)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sdg_erp?schema=public"

# Khóa bí mật ký JWT Session (tối thiểu 32 ký tự)
JWT_SECRET="sdg-erp-super-secret-key-saodogroup-2026-very-secure"

# Cổng khởi chạy hệ thống
PORT=4000
```

---

## 5. HƯỚNG DẪN KHỞI CHẠY NHANH (QUICKSTART)

Dành cho nhà phát triển mới hoặc thiết lập máy chủ triển khai:

```bash
# 1. Cài đặt các thư viện trong package.json
npm install

# 2. Cấu hình biến môi trường
cp .env.example .env

# 3. Đồng bộ cấu trúc bảng và nạp 67 cán bộ nhân sự gốc
npx prisma migrate dev
npm run db:seed

# 4. Khởi động hệ thống
npm run dev
# Truy cập: http://localhost:4000 (Tài khoản mẫu: admin / 123456)
```

---

## 6. QUY TRÌNH CẬP NHẬT TÀI LIỆU KHI THÊM THƯ VIỆN HOẶC ĐỔI CẤU HÌNH

Khi AI Agent hoặc kỹ sư thêm thư viện mới hoặc thay đổi hạ tầng, **thực hiện quy trình 3 bước sau**:

1. **Thực thi cài đặt:** Chạy lệnh `npm install <package>`.
2. **Cập nhật Bảng Mục 3 (Sổ bộ thư viện):** 
   - Thêm 1 dòng tương ứng gồm: Nhóm, Tên gói, Phiên bản cài đặt, và **Mục đích nghiệp vụ cụ thể** (Tại sao phải cài, phục vụ tính năng gì).
3. **Cập nhật `.env.example` & Mục 4 (nếu có biến môi trường mới):** Đảm bảo không lộ secret keys nhưng vẫn đủ thông số mẫu cho môi trường khác.
