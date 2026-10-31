<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MASTER AGENT ROUTER (SDG ERP)

Tệp này là **Bộ định tuyến ngữ cảnh trung tâm (Thin Router)** cho mọi AI Agent làm việc trong dự án Sao Đỏ Group ERP.
Khi nhận bất kỳ yêu cầu nào, AI Agent BẮT BUỘC tra cứu bảng định tuyến dưới đây để nạp tệp quy tắc chuyên biệt tương ứng trước khi sinh mã.

---

## 1. Bảng Định Tuyến Ngữ Cảnh (Routing Table)

| Phạm Vi Yêu Cầu | Tệp Quy Tắc Cần Đọc (Bắt buộc) | Trọng Tâm Nghiệp Vụ (Tham chiếu nhanh) |
| :--- | :--- | :--- |
| **Kiến Trúc & Danh Mục Thư Viện** | [docs/ARCHITECTURE.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/ARCHITECTURE.md) | Cấu trúc project, danh mục dependencies, hướng dẫn cài đặt từ đầu, mô hình 3D Digital Twin. |
| **Cơ sở dữ liệu & Schema** | [.agents/rules/DATABASE-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/DATABASE-RULES.md) | Migration chuẩn, Prisma Schema, Khóa chính Int, Cấu trúc cây, Audit fields. |
| **Backend & Logic Nghiệp Vụ** | [.agents/rules/BACKEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/BACKEND-RULES.md) | Next.js Server Actions, Zod Validation, Session Auth, Prisma Transactions. |
| **Giao diện & UI Theme** | [.agents/rules/FRONTEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/FRONTEND-RULES.md) | 100% Tailwind CSS & Shadcn/UI, Mobile-first Responsive, AJAX SPA. |
| **Kế hoạch: Quản lý Nhân sự (HR)** | [docs/plans/HR-CHECKLIST.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/plans/HR-CHECKLIST.md) | Hồ sơ Employee tách tài khoản User; /employees và /accounts, thống kê người thật và trạng thái đăng nhập độc lập. |
| **Quản lý vai trò & Phân quyền** | [docs/plans/ROLE-MANAGEMENT-CHECKLIST.md](docs/plans/ROLE-MANAGEMENT-CHECKLIST.md) | Trang /roles và ma trận quyền còn trong kế hoạch; /accounts và kiểm tra phiên DB đã triển khai, role thuộc tài khoản. |
| **Chiến lược số hóa & Hiện trạng hệ thống** | [docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md) | Vai trò của 1Office, phạm vi SDG ERP, rủi ro, nguyên tắc tích hợp và lộ trình 30–60–90 ngày. |
| **Mô hình dữ liệu quản trị & Tích hợp 1Office** | [docs/strategy/MO-HINH-DU-LIEU-QUAN-TRI-VA-TICH-HOP-1OFFICE.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/MO-HINH-DU-LIEU-QUAN-TRI-VA-TICH-HOP-1OFFICE.md) | Cơ cấu, tài khoản, nhóm quyền, quy trình, tri thức ngầm, dữ liệu nguồn và ranh giới tích hợp 1Office–SDG ERP. |
| **Master Data & RBAC SDG ERP–1Office** | [docs/strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md) | Đối chiếu dữ liệu nền, mapping đơn vị, phân lớp role, quyền sở hữu dữ liệu, quy tắc xung đột và luồng đồng bộ. |
| **Kế hoạch: Chuyển đổi số** | [docs/plans/DIGITAL-TRANSFORMATION-CHECKLIST.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/plans/DIGITAL-TRANSFORMATION-CHECKLIST.md) | Checklist khảo sát, xác nhận dữ liệu, hardening, tích hợp, pilot và mở rộng. |
| **Ý tưởng tính năng** | [docs/strategy/Y-TUONG-TINH-NANG.md](docs/strategy/Y-TUONG-TINH-NANG.md) | Ý tưởng để xem xét, gồm quét mã tài sản bằng camera điện thoại; không đồng nghĩa đã duyệt triển khai. |
| **Quản lý tài sản & Tích hợp 3D** | [.agents/rules/ASSET-MANAGEMENT-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/ASSET-MANAGEMENT-RULES.md), [docs/plans/ASSET-MANAGEMENT-CHECKLIST.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/plans/ASSET-MANAGEMENT-CHECKLIST.md), [docs/strategy/DANH-GIA-TICH-HOP-TAI-SAN-VA-MO-HINH-3D.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/DANH-GIA-TICH-HOP-TAI-SAN-VA-MO-HINH-3D.md) | TẠM HOÃN: đã gỡ bảng/seed tài sản ngày 31/10/2026; giữ thiết kế tham khảo, không tự khôi phục. 3D nhân sự vẫn hoạt động. |
| **Công cụ hồ sơ thanh toán AI** | [docs/plans/AI-DOCUMENTS-CHECKLIST.md](docs/plans/AI-DOCUMENTS-CHECKLIST.md) | TẠM HOÃN: đã gỡ pilot và menu; /ai-documents chỉ thông báo tạm hoãn. Giữ lịch sử và hướng khôi phục trong plan. |

---

## 2. Nguyên Tắc Vận Hành Lõi (Core Operational Principles)

1. **Direct-to-DB:** Mọi Server Action tương tác trực tiếp với Prisma Client. Không tạo các tầng trừu tượng trung gian rườm rà (Repository, Service Interface).
2. **Single Source of Truth:** Không khai báo chi tiết mã màu, tokens hay cấu trúc code cụ thể tại file Router này. Mọi quy tắc kỹ thuật chi tiết phải nằm trong các tệp tương ứng thuộc thư mục `.agents/rules/`.
3. **Tính Toàn Vẹn Dữ Liệu:** Không bao giờ tự ý chạy các lệnh xóa cột (`drop column`), reset CSDL làm mất dữ liệu của người dùng mà không có xác nhận.
4. **Đồng Bộ Kế Hoạch Bắt Buộc (Mandatory Checklist Sync):** Mỗi khi thực thi một lệnh, hoàn thành một bước hoặc có bất kỳ sửa đổi kỹ thuật/kiến trúc nào, AI Agent **BẮT BUỘC** phải cập nhật ngay vào tệp Checklist tương ứng (`docs/plans/<TEN-PHAN-HE>-CHECKLIST.md`), đánh dấu `[x]` các việc đã xong và ghi nhận các quyết định kiến trúc mới.
5. **Đồng Bộ Kiến Trúc & Thư Viện Bắt Buộc (Mandatory Architecture & Dependency Sync):** Mỗi khi chạy lệnh cài đặt/gỡ bỏ thư viện (`package.json`), cập nhật biến môi trường (`.env`), hoặc thay đổi cấu trúc thư mục/hạ tầng, AI Agent **BẮT BUỘC** phải cập nhật ngay vào tệp [docs/ARCHITECTURE.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/ARCHITECTURE.md) (cập nhật bảng dependencies, cấu trúc thư mục hoặc hướng dẫn cài đặt).
6. **Không tự truy cập 1Office:** Không dùng lại tài khoản, mật khẩu, cookie hoặc session 1Office từ lịch sử hội thoại hay lần khảo sát trước. Chỉ được truy cập khi người phụ trách cấp lại thông tin trong yêu cầu hiện tại và nêu rõ phạm vi; mặc định chỉ xem và export, tuyệt đối không tạo, sửa, duyệt, xóa, đổi quyền hoặc đổi cấu hình trên 1Office.
7. **Không lưu thông tin đăng nhập 1Office:** Không ghi credential vào mã nguồn, tài liệu, script, log, file môi trường hoặc bộ nhớ dùng lại. Sau lần sử dụng, coi credential đã hết hiệu lực đối với Agent và yêu cầu người phụ trách cấp lại khi cần.
8. **Trạng thái prototype:** Toàn bộ tính năng SDG ERP hiện có là bản nháp phục vụ khảo sát. Agent được phép đề xuất giữ, sửa lớn hoặc xây lại; báo cáo/phân tích không đồng nghĩa được duyệt triển khai. Không thực hiện thay đổi kiến trúc hoặc chức năng theo đề xuất trước khi có yêu cầu triển khai rõ ràng.

---

## Lưu tài liệu cục bộ — cập nhật 28/10/2026

Ảnh tài liệu, file nguồn/export nội bộ, Word/PDF/PowerPoint và file tạm/script hỗ trợ tạo tài liệu chỉ lưu trên máy, không đưa lên GitHub. Đặt đầu ra và script dùng tạm trong `outputs/` (các thư mục `output/`, `ouput/`, `tmp/`, `temp/` cũng được bỏ qua). Không dùng `git add -f` để đưa các file này vào Git. Tài liệu thiết kế/plan/rule Markdown và tài nguyên ứng dụng trong `public/`, `src/` vẫn được quản lý bằng Git. Khi bỏ theo dõi file đã có trong Git, dùng `git rm --cached` để giữ bản trên máy; không tự xóa file hoặc viết lại lịch sử Git.

## 3. Quản Lý Kế Hoạch & Mở Rộng Phân Hệ Mới (Plans Extensibility)

Khi dự án mở rộng thêm các phân hệ mới (ví dụ: `TASK`, `APPROVAL`, `OFFICE-3D`, `WAREHOUSE`...):
1. **Kế hoạch triển khai:** BẮT BUỘC tạo tại thư mục `docs/plans/<TEN-PHAN-HE>-CHECKLIST.md`.
2. **Quy tắc chuyên biệt (nếu có):** Tạo tại `.agents/rules/<TEN-PHAN-HE>-RULES.md`.
3. **Đăng ký định tuyến:** Bổ sung các đường dẫn trên vào Bảng Định Tuyến (Mục 1) của tệp này để AI tự động nạp ngữ cảnh khi nhận việc.
