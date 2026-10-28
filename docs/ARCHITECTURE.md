# TÀI LIỆU KIẾN TRÚC TỔNG THỂ & SỔ BỘ THƯ VIỆN

## Lưu trữ tài liệu và đầu ra — 28/10/2026

Git theo dõi mã nguồn, tài nguyên ứng dụng và tài liệu Markdown. Các thư mục `outputs/`, `output/`, `ouput/`, `tmp/`, `temp/`, export 1Office và tài liệu nhị phân/ảnh trong `docs/` chỉ lưu cục bộ theo `.gitignore`. Script tạo tài liệu dùng tạm đặt trong `outputs/`. Khi clone mới, các file nguồn phục vụ seed/import và tài liệu báo cáo phải được cung cấp riêng vào đúng đường dẫn; không tự tải lại 1Office. Bỏ theo dõi giữ nguyên file trên máy, không xóa chúng khỏi lịch sử commit cũ.

## Thiết kế điều chỉnh HR sau đánh giá 27/10/2026 — chưa triển khai

Giữ mô hình `Department → Employee → User` hiện có. Phòng ban chọn từ cây qua FK, chức danh giữ text và cho phép sửa có audit. Theo quyết định bổ sung 27/10/2026, giữ `employeeCode` bắt buộc và duy nhất trong công ty; ERP tự cấp thay vì yêu cầu nhập ở form. Mã ổn định có thể ẩn trên UI nhưng đưa vào Excel để đối chiếu nhập lại; đây là mã ERP, không phải mã HR chính thức. FK vẫn dùng `Employee.id`. Đề xuất cho mã nullable trước đây đã được thay thế; cơ chế tự cấp mã trong luồng tạo và xuất–nhập chưa triển khai. Luồng tạo người không tự tạo tài khoản hay gán role.

[Phương án trong HR-CHECKLIST](plans/HR-CHECKLIST.md) đề xuất làm sạch riêng dữ liệu HR/tài khoản, nạp 72 người từ final và giữ tài khoản quản trị hệ thống, cơ cấu, role/quyền và dữ liệu tài sản. Phải sửa seed cũ và importer phụ thuộc mã trước, không reset toàn DB hoặc sequence. Phần này là thiết kế đề xuất; schema và ứng dụng hiện vẫn theo mô tả triển khai bên dưới.


## Nguồn nhân sự HR chốt 26/10/2026

- `Employee.hrSourceFile`, `hrSnapshotAt`, `hrNotes` lưu nguồn HR chính thức, ngày chốt và ghi chú; không thay `externalSystem/externalId/externalSnapshotAt` của mapping 1Office.
- Migration `20261027033903_hr_final_source` chỉ thêm ba cột nullable; không xóa/đổi dữ liệu cũ.
- `prisma/hr-final-data.ts` đọc ngày Excel theo lịch UTC và mapping đã đối chiếu; `prisma/import-hr-final-20261026.ts` là lệnh nhập một lần, preview mặc định, khóa theo hash file, backup riêng tư ngoài repo, transaction và audit. Không phải API/sync định kỳ.
- Preview: `npx tsx prisma/import-hr-final-20261026.ts --company-id=1`; thêm `--apply` để nhập. Có marker ngăn nhập lại cùng snapshot, tránh đè sửa đổi mới.
- Người phụ trách chốt ưu tiên độ chính xác của file HR final 72 người (27/10/2026): tên, ngày sinh, chức danh, phòng ban gán cho người, ghi chú và danh sách người theo final. Export/API 1Office mới phải trình chênh lệch để chốt cập nhật, không tự ghi đè trường HR đã xác nhận. Không suy bộ phận con từ chức danh; giữ nguyên cây phòng ban và lưu phân bổ cũ trong audit. Không tạo tài khoản/đổi role khi nhập.
- Không thêm dependency hoặc biến môi trường; dùng `xlsx`, `tsx`, Prisma sẵn có. Kiểm thử importer: `npx tsx --test tests/unit/hr-final-data.test.ts`.


## Cập nhật nhân sự – tài khoản (26/10/2026)

- DB: `Employee` → `nhan_su` là hồ sơ người thật; `User` → `nguoi_dung` là tài khoản. `Department.employees` và `Employee.accounts` thay cho dùng tài khoản làm hồ sơ. Một người có 0..N tài khoản; role gắn từng tài khoản.
- Migration `20261026100000_split_employees_accounts`: bổ sung bảng, chuyển dữ liệu và FK tài sản; giữ ID/mật khẩu/quyền tài khoản, không xóa cột hồ sơ cũ. Các field `User.legacy*` dùng `@ignore`, chỉ phục vụ đối chiếu, không đọc/ghi trong ứng dụng.
- `/employees`: hồ sơ và tình trạng làm việc. `/accounts`: tạo/sửa/liên kết tài khoản, khóa/mở, đặt lại mật khẩu và gán role hiện có; chỉ ADMIN/IT_ADMIN. `/roles` vẫn chưa triển khai ma trận quản lý role.
- `src/actions/account.ts`, `src/lib/account-access.ts`, `src/lib/account-session.ts`, `src/lib/session-token.ts` (JWT cho middleware, không import Prisma), `src/components/accounts/AccountManager.tsx` là các tệp mới. `src/components/ui/checkbox.tsx` dùng Radix đã có; không thêm thư viện.
- Server xác minh tài khoản còn mở, phiên bản phiên và quyền hiện tại từ DB. Thay đổi tài khoản tăng `sessionVersion`; phiên cũ bị từ chối. Đăng nhập bằng username, không dùng mã nhân sự vì một người có nhiều tài khoản.
- Nhân sự giữ mapping 1Office; file HR final ưu tiên theo mục nguồn HR phía trên. Tên/mã/phòng/chức vụ của hồ sơ đã liên kết nguồn hoặc được HR chốt không sửa qua form. Có thể thêm hồ sơ nội bộ chưa có mapping, cần đối chiếu trước khi đồng bộ. Chưa có importer nhân sự định kỳ/API/webhook.
- Bộ đếm: tổng hồ sơ gồm lịch sử, đang làm việc chỉ `ACTIVE`, `UNKNOWN` tách riêng. 3D chỉ hiển thị `Employee.ACTIVE`; phòng ban hiển thị tổng hồ sơ gắn đơn vị. Không đổi quy tắc vị trí ngồi 3D trong lần này.
- Giữ Next.js 16.4.0 theo yêu cầu; không thay package/dependency/env. Sau khi sinh Prisma Client cần khởi động lại dev server để tránh giữ client cũ.

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
1. **Quản trị Nhân sự & Định danh (Core HR & IAM):** 72 người theo danh sách HR chốt 26/10/2026 (80 hồ sơ lưu trữ), cây phòng ban 2 cấp gắn ID số nguyên (`Int`), liên kết kế thừa quyền.
2. **Không gian số 3D Tòa nhà (Digital Twin 3D Office):** Trực quan hóa mặt bằng văn phòng, định vị phòng ban và hiển thị tức thì nhân sự ngồi tại từng phòng bằng WebGL Three.js.
3. **Quản trị Tài sản & Thiết bị IT (IT Asset Management):** Quản lý vòng đời máy móc, camera, bản quyền phần mềm cho phòng HCNS & IT.
4. **Điều hành Xe Công Vụ (Fleet Management):** Xếp lịch điều xe đưa đón giữa Tập đoàn và KCN Nam Đình Vũ.
5. **Cầu nối Phê duyệt Dự án (Executive Bridge):** Luân chuyển hồ sơ, biên bản bàn giao đất, nghiệm thu giữa Tập đoàn và Ban QLDA Nam Đình Vũ.

### Nền tảng dữ liệu tài sản IT và không gian

Phân hệ tài sản tách ba lớp: chứng từ/số lượng kiểm kê (`AssetInventoryDocument`, `AssetInventoryLine`), tài sản cá thể (`Asset`) và lịch sử vận hành (`AssetAssignment`, `AssetLocationHistory`, `AssetMaintenance`). Cây `PhysicalLocation` quản lý Tòa nhà → Tầng → Phòng → Khu vực/Rack/Kho; trường `threeDKey` ánh xạ vị trí nghiệp vụ với đối tượng trong Three.js mà không biến mesh thành khóa dữ liệu.

Ảnh BMHC 0501 chỉ là dữ liệu tham khảo tạm gồm 11 nhóm, tổng 90 thiết bị và được giữ ở trạng thái `DRAFT`. Không tự tạo 90 tài sản thật từ ảnh. Sau khi có giao diện, dữ liệu kiểm kê thực tế sẽ tạo một hồ sơ `Asset` cho từng thiết bị; mã nội bộ, loại và tình trạng là tối thiểu, các trường chi tiết được bổ sung dần.

### Quy ước tên vật lý PostgreSQL — 22/10/2026

16 bảng nghiệp vụ và 194 cột được ánh xạ sang tên tiếng Việt không dấu bằng `@@map`/`@map` trong Prisma. Ví dụ `Company` → `cong_ty`, `Department` → `phong_ban`, `User` → `nguoi_dung`, `Asset` → `tai_san`; `companyId` → `dinh_danh_cong_ty`. API Prisma/TypeScript giữ nguyên để các action, seed và giao diện tiếp tục hoạt động. Danh mục đầy đủ tại [DATABASE-DICTIONARY.md](./DATABASE-DICTIONARY.md); quy tắc bắt buộc tại [DATABASE-RULES.md](../.agents/rules/DATABASE-RULES.md). Migration chỉ đổi tên, không chuyển đổi dữ liệu nghiệp vụ.

### Nguồn cơ cấu và cách ánh xạ

1Office là nguồn chuẩn cho hồ sơ nhân sự và cây cơ cấu tổ chức. SDG ERP nhận snapshot/export hoặc API một chiều, giữ external ID và bảng mapping, sau đó cung cấp bản đọc cho các nghiệp vụ nội bộ. Không sửa cơ cấu độc lập trong ERP theo cách tạo ra một phiên bản cạnh tranh với 1Office. Trạng thái con người, quan hệ làm việc và tài khoản đăng nhập phải được tách riêng để tài khoản khóa hoặc chưa được cấp không làm mất hồ sơ nhân sự.

`Department` hiện giữ snapshot nguồn gồm `externalSystem`, `externalId`, `externalParentId`, `externalName`, `externalPath`, `externalLevel`, người giám sát và thời điểm snapshot. UI tính trạng thái `MATCHED`, `NAME_MISMATCH`, `PARENT_MISMATCH` hoặc `UNLINKED` ở thời điểm đọc. Tên và quan hệ cha/con của đơn vị đã liên kết là read-only trong ERP; mã và mô tả nội bộ vẫn có thể quản lý tại ERP.

---

## 2. BẢN ĐỒ CẤU TRÚC THƯ MỤC DỰ ÁN

Tài liệu trong `docs/strategy` dùng tên tiếng Việt không dấu, viết hoa và phân cách bằng dấu gạch ngang. File bối cảnh chính là [BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md](./strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md). Khi đổi tên phải cập nhật các liên kết trong router, checklist và tài liệu liên quan.

```
SGDERP/
├── .agents/                          # Quy tắc & Kỹ năng dành cho AI Agent
│   └── rules/                        # [3 TRỤ CỘT] DATABASE-RULES, BACKEND-RULES, FRONTEND-RULES
├── docs/                             # Tài liệu nghiệp vụ & Kế hoạch
│   ├── ARCHITECTURE.md               # [TỆP NÀY] Kiến trúc tổng thể & Sổ bộ thư viện
│   ├── plans/                        # Kế hoạch & Checklist phân hệ (HR-CHECKLIST.md...)
│   ├── strategy/                     # Bối cảnh hiện trạng, chiến lược số hóa và ranh giới hệ thống
│   ├── 1office-sources/               # Manifest trong Git; export nội bộ chỉ lưu cục bộ
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

### Tài liệu báo cáo nội bộ

- `docs/bao-cao/`: bản trình bày phục vụ báo cáo thử việc và trao đổi nội bộ. `BAO-CAO-TUAN-THU-VIEC-DAU-TIEN-BAN-NHAP-01.pptx` bám 5 đầu việc tại trang 20 cẩm nang hội nhập, là bản nháp chờ người báo cáo xác nhận thông tin cá nhân và quản lý chốt KPI; không phải quyết định triển khai tính năng.
- Việc tạo báo cáo không bổ sung dependency hoặc thay đổi cấu hình ứng dụng.




### Sơ đồ tổ chức — 23/10/2026
- `src/components/departments/OrganizationChart.tsx`: client component vẽ cây ngang bằng SVG và các nút Shadcn trong foreignObject, không thêm dependency. Tọa độ/kích thước SVG tính từ cây DB; màu dùng theme Tailwind.
- Trang `/departments` có hai tab danh sách và sơ đồ dùng chung dữ liệu; tên công ty được truy vấn theo session. Đối soát snapshot chuyển vào dialog cho HR MANAGE. Sơ đồ không sửa quan hệ tổ chức.



### Cập nhật bố cục cơ cấu — 24/10/2026
- `OrganizationChart.tsx` chuyển từ cây ngang sang cây từ trên xuống, x phân theo nhánh và y phân theo cấp; đường nối SVG từ đáy nút cha tới đỉnh nút con. Không thay nguồn dữ liệu hoặc dependency.

### Kế hoạch phân quyền — 24/10/2026
- Thêm tài liệu [ROLE-MANAGEMENT-CHECKLIST.md](plans/ROLE-MANAGEMENT-CHECKLIST.md), đăng ký router AGENTS. Đây là kế hoạch, chưa thay kiến trúc chạy thật hoặc dependencies.
- Tái sử dụng Role/Permission/RolePermission/UserRole, dự kiến tách quyền RBAC, xử lý hiệu lực phiên và thêm quản lý phạm vi theo giai đoạn; xem plan cho các bước chưa thực hiện.

### Danh mục ý tưởng — 24/10/2026
- Thêm [Ý tưởng tính năng](strategy/Y-TUONG-TINH-NANG.md), ghi nhận quét mã tài sản qua web điện thoại và liên kết checklist tài sản. Chưa thay kiến trúc vận hành, schema hoặc dependency.

### Công cụ kiểm tra lần tách nhân sự (27/10/2026)

TypeScript, ESLint, Prisma validate/migrate diff và production build webpack; Playwright Chrome kiểm thử trên tài khoản tạm và dọn sau test. Prettier 3 chạy qua npm exec để định dạng tệp mới, không thêm dependency vào package.json hoặc thay lockfile. Snapshot trước chuyển đổi được lưu ngoài repo; không công khai nội dung mật khẩu băm trong báo cáo.

### Tạm hoãn mô-đun AI — 27/10/2026

- Gỡ nhóm menu AI, thư mục `src/components/ai-documents`, `src/lib/payment-document.ts` và test pilot. `/ai-documents/page.tsx` chỉ hiển thị thông báo tạm hoãn sau đăng nhập; không có form, xử lý ảnh, xuất Word hoặc cấu hình AI.
- Gỡ `docx` khỏi dependencies/lockfile; không thay phiên bản Next.js hoặc thư viện nghiệp vụ khác. Biến OPENAI_API_KEY/OPENAI_MODEL không còn được mã ứng dụng sử dụng; không yêu cầu cấu hình chúng. Không đọc/in giá trị hay thay secret hiện có.
- Không thay DB/role/quyền dùng chung; giữ các Word đã xuất và tài liệu nghiệp vụ. Không có API AI hoặc worker nền cần dừng.
- Điểm lưu mã cục bộ: `archive/ai-documents-20261027` (`168109ff0d995b250001b67f1fcf0cc79bdf3b68`); hướng khôi phục từng tệp trong [plan AI](plans/AI-DOCUMENTS-CHECKLIST.md). Không đóng gói mã archive trong ứng dụng.
