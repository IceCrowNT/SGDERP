# TÀI LIỆU KIẾN TRÚC TỔNG THỂ & SỔ BỘ THƯ VIỆN

## Không gian cá nhân — triển khai 05/11/2026

[Thiết kế tài khoản và không gian cá nhân](THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md) triển khai DEFAULT, tự sinh tên đăng nhập, `/profile`, dashboard theo người đăng nhập và quản lý quyền workflow tập trung tại `/roles`. Tái sử dụng bảng hiện có; dự kiến thêm cờ đổi mật khẩu lần đầu và lưu ảnh ngoài Git. Đã thêm cờ `bat_buoc_doi_mat_khau`, `/profile`, GET `/media/avatar/[file]` (phục vụ ảnh có kiểm tra quyền) và các Server Actions cá nhân. Dependency trực tiếp `sharp@0.35.5` giải mã/chuẩn hóa ảnh sang WebP, bỏ metadata, giới hạn 16 triệu pixel; đầu vào 2 MB, body Server Actions 3 MB. Ảnh lưu tại `var/avatars/` ngoài Git; tùy chọn env `AVATAR_STORAGE_DIR` trỏ tới volume bền vững khi triển khai (không thay `.env` hiện tại). Sao lưu thư mục ảnh cùng DB; không đặt vào `public/`. Session đọc cờ đổi mật khẩu từ DB mỗi request; các chức năng nghiệp vụ bị chặn cho tới khi đổi xong. Đổi mật khẩu thu hồi phiên cũ và cấp lại cookie phiên hiện tại. Các mutation profile/role/account cùng khóa hàng công ty trước advisory phân quyền, thống nhất với HR/workflow. Khóa cấp username toàn hệ thống `(260127, 0)` sau khóa công ty/phân quyền; không cộng quyền giữa các tài khoản. Quyền workflow cấp tại `/roles`; màn hình workflow chỉ đọc quyền, không có action tự cấp hoặc xác nhận kích hoạt. Menu workflow chỉ hiện khi có quyền workflow. Dashboard đếm theo người/quyền và phân trang 10 dòng. Kiểm chứng: 38 E2E + 7 unit, TypeScript/lint và schema diff đạt; build Webpack đạt (còn cảnh báo bảo mật Next.js/middleware có sẵn). DB giữ nguyên 73 người, 61 tài khoản, 19 phòng và toàn bộ grant cũ; chỉ thêm DEFAULT không grant. Theo dõi tại [checklist](plans/PROFILE-DASHBOARD-CHECKLIST.md).

## Workflow thử nghiệm — 05/11/2026

- Thêm `src/actions/workflow.ts`, `src/lib/workflow-access.ts`, `src/lib/workflow-labels.ts`, validation dùng chung và `src/components/workflows/`. Route `/workflows` và `/workflows/[id]`, không REST/worker/queue/dependency/env mới.
- Prisma thêm 5 bảng workflow, tổng 14 bảng; migration `20261105090000_quy_trinh_thu_nghiem` đã chạy toàn chuỗi trên DB tạm rồi áp dụng local sau backup. Không reset, không chạy seed. Backup nhất quán 9 bảng lõi trước migration lưu ngoài repo; vị trí tại `outputs/workflow/backup-path.txt`.
- Session bổ sung danh sách hành động workflow, `/roles` có nhóm checkbox riêng. Quyền quản lý không duyệt thay; người gửi/người được giao quyết định phạm vi đọc/xử lý. Không tự gán quyền hoặc trưởng phòng thực tế.
- Phát hành khóa nội dung mẫu; đổi mẫu tạo phiên bản. Hồ sơ chốt phòng người gửi, bước chốt người lúc bắt đầu, thao tác và lịch sử cùng transaction. Hộp việc bản đầu giới hạn 200 hồ sơ gần nhất; chưa có tệp/form động/nhắc việc.
- Kiểm thử: 10 E2E workflow, 20 E2E hồi quy, 6 unit đạt; TypeScript/lint và schema diff đạt. Build `npm run build -- --webpack` đạt; Turbopack gặp lỗi mở cổng tiến trình xử lý CSS (os error 1). Build còn cảnh báo có sẵn về middleware/Edge và nhắc cập nhật bảo mật Next.js; chưa nâng phiên bản. Kiểm thử tại `tests/e2e/workflow.spec.ts`; ảnh và đầu ra trong `outputs/workflow/`. Sau generate cần khởi động lại dev/Studio nếu đang mở để nạp 14 model mới.


## Quản lý vai trò — 04/11/2026

- `/roles` dùng `src/actions/role.ts` và `src/components/roles/RoleManager.tsx`: ma trận, gán/gỡ role, xem quyền hợp nhất. `src/components/ui/skeleton.tsx` dùng cho trạng thái tải trang. `role-catalog.ts` giữ danh mục chức năng hiện hành; `rbac-server.ts` chỉ chứa helper kiểm tra quyền/tính toàn vẹn dùng chung, actions vẫn gọi Prisma trực tiếp.
- Quyền HR/ACCOUNTS/ROLES/AUDIT lấy từ DB mỗi request; không suy quyền từ mã ADMIN/IT_ADMIN, chức danh hoặc head. Scope hiện hành toàn công ty; quyền scoped cũ không mở truy cập toàn công ty. Các quyền workflow cũ giữ nguyên, chưa đưa vào ma trận.
- Migration `20261104110000_quan_ly_vai_tro`: thêm bốn quyền, chuyển đặc quyền quản trị ngầm thành gán quyền DB; chuẩn hóa nhãn ADMIN/cờ vai trò chính. Partial unique index và trigger SQL kiểm tra tối đa một role chính, gán role cùng công ty, chặn chuyển công ty tài khoản/role. Không thêm bảng/cột, không đổi ID/mật khẩu; vẫn 9 bảng.
- Action role/account/HR dùng chung advisory lock theo công ty, kiểm tra lại quyền trong transaction; chống mất quản trị cuối cùng và audit cùng transaction. Sửa role/gán role dùng phiên bản cập nhật để chặn ghi đè; đổi quyền hiệu lực từ request sau. Nhật ký lọc công ty và yêu cầu AUDIT VIEW.
- `SESSION_SECRET` có sẵn bắt buộc ít nhất 32 ký tự; bỏ fallback công khai. Không đổi giá trị `.env`, không thêm dependency. Seed chỉ cấp ma trận mặc định khi khởi tạo, không phục hồi quyền bị thu hồi. Bộ khởi tạo hiện còn ADMIN/DEFAULT/HR_MANAGER; HCNS là role tùy chỉnh, seed không tạo lại role nghiệp vụ đã xóa. Cách bổ sung quyền tính năng mới theo [plan phân quyền](plans/ROLE-MANAGEMENT-CHECKLIST.md#khi-thêm-tính-năng-hoặc-quyền-mới).
- Bản sao trước migration: JSON nhất quán của 9 bảng tại thư mục backup riêng tư ngoài repo; vị trí lưu cục bộ trong `outputs/role-management/backup-path.txt`. Không đưa backup hoặc ảnh kiểm thử lên Git.


## Tổ chức kế hoạch — 04/11/2026

[docs/plans/README.md](plans/README.md) là bảng đọc nhanh; sáu checklist chỉ giữ trạng thái hiện hành, việc còn lại và tiêu chí nghiệm thu. Thiết kế bảng/cột và luồng workflow chuyển sang [THIET-KE-QUY-TRINH.md](THIET-KE-QUY-TRINH.md), vẫn là đề xuất chưa triển khai. Không thay mã ứng dụng, DB hoặc thứ tự ưu tiên trong lần rút gọn tài liệu.


## Phân công quản lý và vòng đời truy cập — 04/11/2026

- Migration `20261104082452_nguoi_phu_trach_phong` thêm cột nullable/index/FK kép `phong_ban.nguoi_phu_trach_id` → `nhan_su`; Prisma/Studio/PostgreSQL cùng tên. Vẫn 9 bảng, không seed lại hoặc tự gán trưởng phòng từ chức danh.
- `/departments` chọn người phụ trách cùng công ty; một người phụ trách nhiều phòng. `/employees` hiển thị các phòng phụ trách và hỗ trợ tạo hồ sơ kèm tài khoản tùy chọn cho người đủ quyền; khi sửa thấy các tài khoản liên kết, có thể thêm tài khoản, quản trị tài khoản cũ tại `/accounts`.
- Lưu nghỉ việc tự khóa các tài khoản đang mở, thu hồi phiên, giữ lịch sử, không tự mở lại khi tái tuyển. Server session kiểm tra cả trạng thái tài khoản và nhân sự LEFT. Mutation HR/account phối hợp advisory lock theo công ty, bảo vệ admin cuối cùng, audit và mutation nguyên tử.
- Không thêm dependency hoặc biến môi trường. Sau migrate deploy cần prisma generate và khởi động lại dev/Studio để nạp schema mới.
- Ma trận quyền theo phòng và động cơ workflow chưa triển khai; chọn head không tự cấp quyền phần mềm. Các mô tả lịch sử “sửa hồ sơ không đổi tài khoản” bên dưới được thay thế riêng với tình huống nghỉ việc/cấp tài khoản tùy chọn.


## Thống nhất tên DB với nghiệp vụ — 03/11/2026

Migration `20261103090000_thong_nhat_ten_nghiep_vu` đổi tên `nguoi_dung` → `tai_khoan`, `nguoi_dung_vai_tro` → `tai_khoan_vai_tro`; mã hồ sơ thành `nhan_su.ma_nhan_su`, trạng thái tài khoản thành `cho_phep_dang_nhap`. Tên/mã công ty, phòng ban, vai trò, quyền và FK được làm rõ theo [từ điển DB](DATABASE-DICTIONARY.md). Không thêm bảng, thư viện, biến môi trường hoặc thay quyền.

Yêu cầu tiếp theo cùng ngày đã đồng nhất **model/field Prisma với bảng/cột PostgreSQL**, ví dụ `db.nhan_su` và `nhan_su.ho_ten`. Từ 06/11/2026 áp dụng quy ước lai: bảng và trường nghiệp vụ dùng tiếng Việt không dấu; khóa/trường kỹ thuật phổ biến dùng `id`, `company_id`, `department_id`, `employee_id`, `account_id`, `role_id`, `permission_id`, `created_at`, `updated_at`; FK nghiệp vụ phức tạp dùng tiếng Việt + `_id`. Giữ map của constraint/index lịch sử. Các tên cũ trong phần lịch sử phía dưới chỉ mô tả thời điểm trước thay đổi này.

Migration `20261106113000_quy_uoc_ten_lai` thực hiện toàn bộ bằng đổi tên cột và cập nhật thân trigger, đã thử đủ chuỗi 15 migration trên DB tạm trước khi áp dụng. Sau áp dụng, Prisma diff rỗng, build Webpack và 51 E2E + 9 unit đạt; không thêm dependency hay biến môi trường.

Database local được tạo lại từ đầu ngày 06/11/2026 vì dữ liệu hiện tại chỉ dùng demo. Sau 15 migration và seed: 1 công ty, 18 phòng ban, 72 nhân sự, 1 tài khoản quản trị, 8 vai trò, 18 quyền; các bảng workflow rỗng để cấu hình mẫu demo mới. Bản JSON trước reset được lưu ngoài Git trong thư mục backup cục bộ.

Migration dùng RENAME và sửa hàm trigger bảo vệ mã trong cùng transaction; đã thử trên bản restore với fingerprint 9 bảng không đổi, sau đó áp dụng local. Cần khởi động lại dev server và Studio sau khi generate client để tránh dùng mapping cũ. Giữ nguyên 72 hồ sơ, 60 tài khoản, 19 phòng ban tại thời điểm đổi tên; không chạy lại seed/import.

## Phòng ban độc lập — 03/11/2026

ERP quản lý tên, mã, mô tả và cây cha/con qua `/departments` với HR MANAGE. Bỏ đối soát snapshot và khóa nguồn; metadata 1Office chỉ giữ lịch sử. Các action CRUD kiểm tra cùng công ty, vòng lặp cơ cấu, mã trùng và dữ liệu liên kết trước khi xóa; khóa theo công ty và ghi audit cùng transaction. Không thêm bảng, thư viện hay biến môi trường.

Đã bỏ npm script `db:sync:oneoffice-departments`; file script cũ chỉ báo ngừng sử dụng, không đọc file hay ghi DB. Seed không khôi phục cơ cấu nếu đã có phòng ban, nhân sự hoặc nhật ký phòng ban. Mọi yêu cầu nhập/đối soát 1Office cũ bên dưới là lịch sử, không là điều kiện sử dụng CRUD. Mapping vị trí 3D vẫn dựa trên mã, nên đổi mã/thêm đơn vị chưa tự tạo vị trí trên mô hình; quản lý vị trí thuộc bước riêng.

## Địa chỉ development được phép — 03/11/2026

`next.config.ts` bổ sung `allowedDevOrigins: ["127.0.2.2"]` để trang được mở tại `http://127.0.2.2:4000` có thể kết nối HMR và khởi tạo giao diện. `http://localhost:4000` vẫn được Next cho phép mặc định. Cấu hình chỉ áp dụng dev, không phải CORS/API hay quyền đăng nhập; không mở wildcard, không đổi thư viện/env. Sau khi đổi config cần dev server khởi động lại (Next dev thường tự khởi động lại). Test hồi quy: `tests/e2e/login-origin.spec.ts`.

## Đề xuất workflow sơ khai — 02/11/2026

[Thiết kế workflow](THIET-KE-QUY-TRINH.md) và [kế hoạch triển khai](plans/WORKFLOW-CHECKLIST.md) đề xuất 5 bảng cho mẫu có phiên bản, bước mẫu, hồ sơ, bước xử lý và lịch sử; tái sử dụng nhân sự/tài khoản/RBAC, bổ sung head phòng ban nếu hỗ trợ tự tìm người duyệt. Bản đầu tuần tự, một người mỗi bước, xử lý bằng Server Actions/Prisma transaction. **Chưa triển khai hoặc migration; DB vẫn 9 bảng nghiệp vụ.** Không cài dependency, đổi môi trường, thêm worker hoặc gọi 1Office trong bước thiết kế.

## Thu gọn DB, ưu tiên tài khoản và phân quyền — 31/10/2026

- Theo yêu cầu, gỡ 8 model/bảng tài sản và 8 enum bằng migration `20261031090000_remove_asset_module`; giữ nguyên các migration đã chạy. DB còn 9 bảng nghiệp vụ: Company, Department, Employee, User, Role, Permission, RolePermission, UserRole, AuditLog (ngoài `_prisma_migrations`).
- Bỏ quan hệ tài sản khỏi bảng lõi, xóa `prisma/seed-it-assets.ts` và npm script `db:seed:it-assets`. Không thêm/gỡ thư viện, không đổi biến môi trường. Script cleanup HR một lần `prisma/clean-hr-legacy.ts` đã ngừng để không truy vấn các bảng tài sản đã gỡ hoặc xóa lại dữ liệu đang dùng.
- Code 3D hiện chỉ đọc Department/Employee nên tiếp tục hoạt động. PhysicalLocation thuộc thiết kế tài sản, chưa có dữ liệu và đã gỡ cùng phân hệ.
- Tài liệu và file nguồn tài sản giữ làm lịch sử, không tự tạo lại bảng hoặc seed. Khi khởi động lại phân hệ cần kế hoạch/migration mới.
- Bốn bảng RBAC đều có vai trò riêng, giữ nguyên dữ liệu/quyền. [Kế hoạch phân quyền](plans/ROLE-MANAGEMENT-CHECKLIST.md) có sơ đồ, số liệu thực tế và các điểm chưa hoàn thiện.



## Lưu trữ tài liệu và đầu ra — 28/10/2026

Git theo dõi mã nguồn, tài nguyên ứng dụng và tài liệu Markdown. Các thư mục `outputs/`, `output/`, `ouput/`, `tmp/`, `temp/`, export 1Office và tài liệu nhị phân/ảnh trong `docs/` chỉ lưu cục bộ theo `.gitignore`. Script tạo tài liệu dùng tạm đặt trong `outputs/`. Khi clone mới, các file nguồn phục vụ seed/import và tài liệu báo cáo phải được cung cấp riêng vào đúng đường dẫn; không tự tải lại 1Office. Bỏ theo dõi giữ nguyên file trên máy, không xóa chúng khỏi lịch sử commit cũ.

## HR độc lập — triển khai 28/10/2026

- Giữ mô hình `Department → Employee → User`. PostgreSQL dùng tên Việt (`phong_ban`, `nhan_su`, `nguoi_dung`); Ở thời điểm 28/10 Studio dùng model tiếng Anh; từ 03/11 đã đồng nhất tên như phần đầu tài liệu. Không phải hai bộ bảng trùng nhau.
- Migration `20261028090000_independent_hr`: bỏ 9 cột hồ sơ legacy trong tài khoản, đổi nhãn tài khoản `ho_ten` → `ten_hien_thi`, thêm `Employee.notes` / `ghi_chu`. Mã tự cấp qua sequence/default và trigger bất biến; schema Prisma giữ `employeeCode` required có default DB. Không reset sequence.
- HR final 72 là dữ liệu khởi tạo; sau đó sửa trực tiếp trong ERP theo HR MANAGE, cùng công ty và có audit. Metadata nguồn chỉ phục vụ truy nguyên. Họ tên, chức danh, phòng ban và ghi chú không còn bị khóa vì nguồn.
- Giữ ID/mã của 72 người cùng 60 tài khoản hợp lệ/admin; loại 8 hồ sơ cũ và 8 tài khoản tương ứng sau backup. Không dựng lại toàn DB. Phòng ban, role, quyền và dữ liệu tài sản giữ nguyên.
- `prisma/bootstrap-hr-final.ts`: bootstrap final một lần cho HR rỗng, có marker/khóa theo công ty chống chạy lặp; không tạo tài khoản hàng loạt. `prisma/seed.ts` không đọc file 67 người, không ghi đè HR/phòng ban khi chạy lại. `prisma/import-hr-final-20261026.ts` đã vô hiệu hóa.
- `prisma/clean-hr-legacy.ts`: đã hoàn thành lần làm sạch 28/10, ngừng chạy từ 31/10; thuật toán cũ nằm trong backup riêng, không dùng lại cho dữ liệu vận hành.
- Form/action sử dụng validation strict, không nhận mã/metadata nguồn từ client; chọn phòng theo cây. Ghi chú vận hành chỉnh được, ghi chú file HR gốc nằm trong mục nguồn nhập. Không thêm dependency hoặc biến môi trường.
- Kiểm thử: `npx playwright test tests/e2e/hr-independent.spec.ts tests/e2e/identity.spec.ts --workers=1`. File nguồn final lưu cục bộ, cần được cấp riêng khi clone máy mới để bootstrap/kiểm thử bootstrap.

Các mục bên dưới ghi lịch sử các đợt triển khai trước; quyết định HR độc lập phía trên là hiện hành.

## Nguồn nhân sự HR chốt 26/10/2026

- `Employee.hrSourceFile`, `hrSnapshotAt`, `hrNotes` lưu nguồn HR chính thức, ngày chốt và ghi chú; không thay `externalSystem/externalId/externalSnapshotAt` của mapping 1Office.
- Migration `20261027033903_hr_final_source` chỉ thêm ba cột nullable; không xóa/đổi dữ liệu cũ.
- `prisma/hr-final-data.ts` đọc ngày Excel theo lịch UTC và mapping đã đối chiếu; `prisma/import-hr-final-20261026.ts` là lệnh nhập một lần, preview mặc định, khóa theo hash file, backup riêng tư ngoài repo, transaction và audit. Không phải API/sync định kỳ.
- Preview: `npx tsx prisma/import-hr-final-20261026.ts --company-id=1`; thêm `--apply` để nhập. Có marker ngăn nhập lại cùng snapshot, tránh đè sửa đổi mới.
- Người phụ trách chốt ưu tiên độ chính xác của file HR final 72 người (27/10/2026): tên, ngày sinh, chức danh, phòng ban gán cho người, ghi chú và danh sách người theo final. Export/API 1Office mới phải trình chênh lệch để chốt cập nhật, không tự ghi đè trường HR đã xác nhận. Không suy bộ phận con từ chức danh; giữ nguyên cây phòng ban và lưu phân bổ cũ trong audit. Không tạo tài khoản/đổi role khi nhập.
- Không thêm dependency hoặc biến môi trường; dùng `xlsx`, `tsx`, Prisma sẵn có. Kiểm thử importer: `npx tsx --test tests/unit/hr-final-data.test.ts`.


## Cập nhật nhân sự – tài khoản (26/10/2026)

- DB: `Employee` → `nhan_su` là hồ sơ người thật; `User` → `nguoi_dung` là tài khoản. `Department.employees` và `Employee.accounts` thay cho dùng tài khoản làm hồ sơ. Một người có 0..N tài khoản; role gắn từng tài khoản.
- Migration `20261026100000_split_employees_accounts`: bổ sung bảng, chuyển dữ liệu và FK tài sản; giữ ID/mật khẩu/quyền tài khoản, không xóa cột hồ sơ cũ. Các field `User.legacy*` từng giữ tạm để đối chiếu và đã được loại ở migration 28/10/2026.
- `/employees`: hồ sơ và tình trạng làm việc. `/accounts`: tạo/sửa/liên kết tài khoản, khóa/mở, đặt lại mật khẩu và gán role hiện có; chỉ ADMIN/IT_ADMIN. `/roles` vẫn chưa triển khai ma trận quản lý role.
- `src/actions/account.ts`, `src/lib/account-access.ts`, `src/lib/account-session.ts`, `src/lib/session-token.ts` (JWT cho middleware, không import Prisma), `src/components/accounts/AccountManager.tsx` là các tệp mới. `src/components/ui/checkbox.tsx` dùng Radix đã có; không thêm thư viện.
- Server xác minh tài khoản còn mở, phiên bản phiên và quyền hiện tại từ DB. Thay đổi tài khoản tăng `sessionVersion`; phiên cũ bị từ chối. Đăng nhập bằng username, không dùng mã nhân sự vì một người có nhiều tài khoản.
- Nhân sự giữ mapping 1Office; file HR final ưu tiên theo mục nguồn HR phía trên. Từ 28/10/2026 chỉ mã không sửa; tên/phòng/chức vụ sửa được theo HR MANAGE. Có thể thêm hồ sơ nội bộ chưa có mapping, cần đối chiếu trước khi đồng bộ. Chưa có importer nhân sự định kỳ/API/webhook.
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
        OneOffice[1Office - Nguồn tham khảo khởi tạo trước đây]
        AccountingServer[(Server Kế Toán Riêng - Tương Lai)]
    end

    NextMonolith --> TailwindUI
    NextMonolith --> DigitalTwin3D
    NextMonolith --> AppRouter
    AppRouter --> ServerActions
    ServerActions --> PrismaORM --> LocalPostgres
    OneOffice -.->|Lịch sử nhập ban đầu, không đồng bộ hiện hành| ServerActions
    ServerActions -.->|Tích hợp 2 chiều| AccountingServer
```

### Các Trục Nghiệp Vụ Trọng Tâm:
1. **Quản trị Nhân sự & Định danh (Core HR & IAM):** 72 người theo danh sách HR chốt 26/10/2026 (đã làm sạch hồ sơ dư), cây phòng ban 2 cấp gắn ID số nguyên (`Int`), liên kết kế thừa quyền.
2. **Không gian số 3D Tòa nhà (Digital Twin 3D Office):** Trực quan hóa mặt bằng văn phòng, định vị phòng ban và hiển thị tức thì nhân sự ngồi tại từng phòng bằng WebGL Three.js.
3. **Tài sản IT — tạm hoãn:** bảng và seed đã gỡ ngày 31/10/2026; chỉ giữ thiết kế tham khảo.
4. **Điều hành Xe Công Vụ (Fleet Management):** Xếp lịch điều xe đưa đón giữa Tập đoàn và KCN Nam Đình Vũ.
5. **Cầu nối Phê duyệt Dự án (Executive Bridge):** Luân chuyển hồ sơ, biên bản bàn giao đất, nghiệm thu giữa Tập đoàn và Ban QLDA Nam Đình Vũ.

### Tài sản và không gian — thiết kế lưu trữ

Phân hệ tài sản đã được gỡ khỏi DB ngày 31/10/2026 để tập trung user/phân quyền. Mô hình cũ, số lượng tham khảo và hướng tích hợp 3D nằm trong [kế hoạch tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md); chúng không mô tả bảng đang hoạt động.

### Quy ước tên vật lý PostgreSQL — 22/10/2026

16 bảng nghiệp vụ và 194 cột được ánh xạ sang tên tiếng Việt không dấu bằng `@@map`/`@map` trong Prisma. Ví dụ `Company` → `cong_ty`, `Department` → `phong_ban`, `User` → `nguoi_dung`, `Asset` → `tai_san`; `companyId` → `company_id`. API Prisma/TypeScript giữ nguyên để các action, seed và giao diện tiếp tục hoạt động. Danh mục đầy đủ tại [DATABASE-DICTIONARY.md](./DATABASE-DICTIONARY.md); quy tắc bắt buộc tại [DATABASE-RULES.md](../.agents/rules/DATABASE-RULES.md). Migration chỉ đổi tên, không chuyển đổi dữ liệu nghiệp vụ.

### Nguồn cơ cấu và cách ánh xạ

Từ 03/11/2026, cả hồ sơ nhân sự và cơ cấu phòng ban đều do ERP quản lý độc lập sau khởi tạo. Metadata `Department.external*` giữ lịch sử nhập, không được dùng để khóa tên/cấp trên hoặc tính trạng thái khớp nguồn. Không còn giao diện đối soát hay tác vụ đồng bộ phòng ban từ 1Office. Khi sửa, khóa liên kết Employee.departmentId vẫn giữ nguyên; chỉ xóa đơn vị không còn nhân sự hoặc đơn vị con.

---

## 2. BẢN ĐỒ CẤU TRÚC THƯ MỤC DỰ ÁN

`src/components/ui/feature-overview.tsx` cung cấp thẻ số liệu, hướng dẫn mở rộng, trạng thái trống và avatar chữ cho các màn hình nghiệp vụ. Component chỉ trình bày dữ liệu đã được phân quyền từ màn hình gọi; không truy vấn DB, không cài thư viện hoặc thêm biến môi trường.

Ba rule kỹ thuật Frontend/Backend/Database giữ chuẩn chung. Rule riêng tại `.agents/rules/`: [HR](../.agents/rules/HR-RULES.md), [phân quyền](../.agents/rules/ROLE-MANAGEMENT-RULES.md), [workflow](../.agents/rules/WORKFLOW-RULES.md), [tài khoản/profile/dashboard](../.agents/rules/PROFILE-DASHBOARD-RULES.md), và [tài sản](../.agents/rules/ASSET-MANAGEMENT-RULES.md) đang tạm hoãn. Nghiệp vụ đọc tại rule riêng; thiết kế DB, trạng thái và kiểm thử theo plan liên kết. Định tuyến do `AGENTS.md` quản lý; không thêm dependency hoặc cấu hình chạy khi sắp xếp tài liệu.

Tài liệu trong `docs/strategy` dùng tên tiếng Việt không dấu, viết hoa và phân cách bằng dấu gạch ngang. File bối cảnh chính là [BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md](./strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md). Khi đổi tên phải cập nhật các liên kết trong router, checklist và tài liệu liên quan.

```
SGDERP/
├── .agents/                          # Quy tắc & Kỹ năng dành cho AI Agent
│   └── rules/                        # 3 rule kỹ thuật chung + rule nghiệp vụ từng phân hệ
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
| **Ảnh đại diện** | `sharp` | `^0.35.5` | Kiểm tra, giới hạn kích thước, chuẩn hóa ảnh cá nhân sang WebP trên server. |
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

# 3. Đồng bộ cấu trúc bảng và khởi tạo HR final 72 người một lần
# Cần cung cấp riêng file HR final vào docs/HR_danhsachnhanvien/
npx prisma migrate dev
npm run db:seed

# 4. Khởi tạo cơ cấu từ snapshot cục bộ đã được cấp riêng, chỉ khi cần
# Không truy cập 1Office hoặc đồng bộ lại nhân sự
npm run db:sync:oneoffice-departments

# 5. Khởi động hệ thống
npm run dev
# Truy cập: http://localhost:4000 (Tài khoản mẫu: admin / 123456)

# 6. Chạy E2E bằng Chrome đã cài trên máy
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
