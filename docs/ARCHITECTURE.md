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
        OneOffice[1Office - Nguồn chuẩn Nhân sự & Cơ cấu]
        AccountingServer[(Server Kế Toán Riêng - Tương Lai)]
    end

    NextMonolith --> TailwindUI
    NextMonolith --> DigitalTwin3D
    NextMonolith --> AppRouter
    AppRouter --> ServerActions
    ServerActions --> PrismaORM --> LocalPostgres
    OneOffice -.->|Export/API một chiều + mapping| ServerActions
    ServerActions -.->|Tích hợp 2 chiều| AccountingServer
```

### Các Trục Nghiệp Vụ Trọng Tâm:
1. **Quản trị Nhân sự & Định danh (Core HR & IAM):** 67 nhân sự, cây phòng ban 2 cấp gắn ID số nguyên (`Int`), liên kết kế thừa quyền.
2. **Không gian số 3D Tòa nhà (Digital Twin 3D Office):** Trực quan hóa mặt bằng văn phòng, định vị phòng ban và hiển thị tức thì nhân sự ngồi tại từng phòng bằng WebGL Three.js.
3. **Quản trị Tài sản & Thiết bị IT (IT Asset Management):** Quản lý vòng đời máy móc, camera, bản quyền phần mềm cho phòng HCNS & IT.
4. **Điều hành Xe Công Vụ (Fleet Management):** Xếp lịch điều xe đưa đón giữa Tập đoàn và KCN Nam Đình Vũ.
5. **Cầu nối Phê duyệt Dự án (Executive Bridge):** Luân chuyển hồ sơ, biên bản bàn giao đất, nghiệm thu giữa Tập đoàn và Ban QLDA Nam Đình Vũ.

### Nền tảng dữ liệu tài sản IT và không gian

Phân hệ tài sản tách ba lớp: chứng từ/số lượng kiểm kê (`AssetInventoryDocument`, `AssetInventoryLine`), tài sản cá thể (`Asset`) và lịch sử vận hành (`AssetAssignment`, `AssetLocationHistory`, `AssetMaintenance`). Cây `PhysicalLocation` quản lý Tòa nhà → Tầng → Phòng → Khu vực/Rack/Kho; trường `threeDKey` ánh xạ vị trí nghiệp vụ với đối tượng trong Three.js mà không biến mesh thành khóa dữ liệu.

Ảnh BMHC 0501 chỉ là dữ liệu tham khảo tạm gồm 11 nhóm, tổng 90 thiết bị và được giữ ở trạng thái `DRAFT`. Không tự tạo 90 tài sản thật từ ảnh. Sau khi có giao diện, dữ liệu kiểm kê thực tế sẽ tạo một hồ sơ `Asset` cho từng thiết bị; mã nội bộ, loại và tình trạng là tối thiểu, các trường chi tiết được bổ sung dần.

### Nguồn dữ liệu nhân sự và cơ cấu

1Office là nguồn chuẩn cho hồ sơ nhân sự và cây cơ cấu tổ chức. SDG ERP nhận snapshot/export hoặc API một chiều, giữ external ID và bảng mapping, sau đó cung cấp bản đọc cho các nghiệp vụ nội bộ. Không sửa cơ cấu độc lập trong ERP theo cách tạo ra một phiên bản cạnh tranh với 1Office. Trạng thái con người, quan hệ làm việc và tài khoản đăng nhập phải được tách riêng để tài khoản khóa hoặc chưa được cấp không làm mất hồ sơ nhân sự.

`Department` hiện giữ snapshot nguồn gồm `externalSystem`, `externalId`, `externalParentId`, `externalName`, `externalPath`, `externalLevel`, người giám sát và thời điểm snapshot. UI tính trạng thái `MATCHED`, `NAME_MISMATCH`, `PARENT_MISMATCH` hoặc `UNLINKED` ở thời điểm đọc. Tên và quan hệ cha/con của đơn vị đã liên kết là read-only trong ERP; mã và mô tả nội bộ vẫn có thể quản lý tại ERP.

---

## 2. BẢN ĐỒ CẤU TRÚC THƯ MỤC DỰ ÁN

```
SGDERP/
├── .agents/                          # Quy tắc & Kỹ năng dành cho AI Agent
│   └── rules/                        # [3 TRỤ CỘT] DATABASE-RULES, BACKEND-RULES, FRONTEND-RULES
├── docs/                             # Tài liệu nghiệp vụ & Kế hoạch
│   ├── ARCHITECTURE.md               # [TỆP NÀY] Kiến trúc tổng thể & Sổ bộ thư viện
│   ├── plans/                        # Kế hoạch & Checklist phân hệ (HR-CHECKLIST.md...)
│   ├── strategy/                     # Bối cảnh hiện trạng, chiến lược số hóa và ranh giới hệ thống
│   ├── 1office-sources/               # Manifest và export 1Office nội bộ được quản lý trong repo riêng tư
│   └── HR_danhsachnhanvien/          # Dữ liệu nguồn Excel 67 cán bộ nhân sự
├── prisma/                           # Schema PostgreSQL, Migrations & Seed data
│   ├── schema.prisma                 # Lược đồ quan hệ thực thể (Data Model)
│   ├── migrations/                   # Lịch sử các bản migration chính thức
│   ├── seed.ts                       # Script khởi tạo 67 nhân viên, 18 phòng ban, 7 roles
│   ├── seed-it-assets.ts             # Nạp chứng từ nháp BMHC 0501 và 11 danh mục tài sản IT
│   └── sync-oneoffice-departments.ts # Nhập snapshot cơ cấu 1Office và cập nhật mapping 18 đơn vị
├── src/
│   ├── actions/                      # Server Actions xử lý logic nghiệp vụ (Direct-to-DB)
│   ├── app/                          # Next.js App Router (Giao diện & Điều hướng)
│   │   ├── (auth)/login/             # Đăng nhập
│   │   ├── (dashboard)/              # Không gian làm việc chính
│   │   │   ├── [...slug]/             # Fallback thống nhất cho URL/tính năng chưa phát triển
│   │   │   ├── departments/          # Quản lý cơ cấu phòng ban (Tree & Table)
│   │   │   ├── employees/            # Quản lý hồ sơ & danh bạ nhân sự
│   │   │   └── office-3d/            # [3D Digital Twin] Không gian văn phòng 3D
│   │   └── globals.css               # Theme tokens & CSS toàn cục
│   ├── components/                   # Thư viện UI Components
│   │   ├── ui/                       # Atomic UI (Shadcn/UI components)
│   │   ├── layout/                   # Sidebar, Navbar, Header
│   │   │   └── FeatureInDevelopment  # Thông báo dùng chung cho chức năng chưa sẵn sàng
│   │   ├── departments/              # Giao diện Phòng ban
│   │   ├── employees/                # Giao diện Nhân sự
│   │   └── office-3d/                # Canvas 3D Three.js & Controls
│   └── lib/                          # Tiện ích dùng chung (db, auth, audit, permissions, utils)
├── tests/e2e/                        # Playwright E2E bằng Chrome hệ thống
├── .env                              # Biến môi trường local (PORT, DATABASE_URL, JWT_SECRET)
├── .env.example                      # File mẫu biến môi trường chuẩn
├── package.json                      # Danh mục dependencies và scripts chạy
├── playwright.config.ts              # Cấu hình base URL, web server, trace và Chrome channel
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
| **Kiểm Thử Trình Duyệt** | `@playwright/test` | `^1.64.1` | Kiểm thử E2E bằng trình duyệt thật, khảo sát DOM và xác minh giao diện desktop/mobile của SDG ERP. |

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

# 4. Sau khi migration tài sản đã áp dụng, nạp chứng từ BMHC 0501 ở trạng thái DRAFT
npm run db:seed:it-assets

# 5. Nhập snapshot cơ cấu 1Office đã lưu trong project (chỉ ghi SDG ERP)
npm run db:sync:oneoffice-departments

# 6. Khởi động hệ thống
npm run dev
# Truy cập: http://localhost:4000 (Tài khoản mẫu: admin / 123456)

# 7. Chạy E2E bằng Chrome đã cài trên máy
E2E_ADMIN_USERNAME=<local-admin> E2E_ADMIN_PASSWORD=<local-password> npm run test:e2e
# Thêm E2E_ALLOW_WRITES=1 để chạy ca ghi metadata có hoàn tác.
```

Playwright 1.64 không cung cấp Chromium đóng gói cho macOS 13; cấu hình local dùng `channel: "chrome"` để chạy Google Chrome hệ thống. Video mặc định tắt để không phụ thuộc FFmpeg; trace và screenshot lỗi vẫn được giữ. Không ghi tài khoản kiểm thử vào repository.

Next.js 16 mặc định ghi tên, đối số và thời gian chạy của Server Function trong môi trường development. Vì action đăng nhập nhận mật khẩu, `next.config.ts` đặt `logging.serverFunctions: false` để tránh mật khẩu và dữ liệu form nhạy cảm xuất hiện trong terminal; request log thông thường vẫn được giữ.
Base URL E2E mặc định phải dùng `http://localhost:4000`; Next.js 16 dev HMR trên môi trường này không hydrate ổn định khi truy cập bằng `127.0.0.1`.

---

## 6. QUY TRÌNH CẬP NHẬT TÀI LIỆU KHI THÊM THƯ VIỆN HOẶC ĐỔI CẤU HÌNH

Khi AI Agent hoặc kỹ sư thêm thư viện mới hoặc thay đổi hạ tầng, **thực hiện quy trình 3 bước sau**:

1. **Thực thi cài đặt:** Chạy lệnh `npm install <package>`.
2. **Cập nhật Bảng Mục 3 (Sổ bộ thư viện):** 
   - Thêm 1 dòng tương ứng gồm: Nhóm, Tên gói, Phiên bản cài đặt, và **Mục đích nghiệp vụ cụ thể** (Tại sao phải cài, phục vụ tính năng gì).
3. **Cập nhật `.env.example` & Mục 4 (nếu có biến môi trường mới):** Đảm bảo không lộ secret keys nhưng vẫn đủ thông số mẫu cho môi trường khác.
