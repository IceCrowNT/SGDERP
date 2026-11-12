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
| **Cơ sở dữ liệu & Schema** | [.agents/rules/DATABASE-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/DATABASE-RULES.md) | Prisma/PostgreSQL cùng tên; bảng tiếng Việt, khóa kỹ thuật Anh ngắn gọn, FK nghiệp vụ Việt + `_id`; migration, cây và audit. |
| **Backend & Logic Nghiệp Vụ** | [.agents/rules/BACKEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/BACKEND-RULES.md) | Next.js Server Actions, Zod Validation, Session Auth, Prisma Transactions. |
| **Giao diện & UI Theme** | [.agents/rules/FRONTEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/FRONTEND-RULES.md) | 100% Tailwind CSS & Shadcn/UI, Mobile-first Responsive, AJAX SPA. |
| **Kế hoạch: Quản lý Nhân sự (HR)** | [HR-RULES](.agents/rules/HR-RULES.md), [docs/plans/HR-CHECKLIST.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/plans/HR-CHECKLIST.md) | Employee tách User; HR và phòng ban vận hành độc lập sau khởi tạo. /departments có CRUD, không đối soát/đồng bộ 1Office. |
| **Báo cáo công việc tuần dùng chung** | [WEEKLY-REPORT-RULES](.agents/rules/WEEKLY-REPORT-RULES.md), [Plan báo cáo tuần](docs/plans/WEEKLY-REPORT-CHECKLIST.md) | Đã lập plan, chưa triển khai: bảng giống Excel, sao chép kỳ cũ giữ hạn năm, sửa chung có lịch sử, trưởng phòng chốt và xuất/in. Dự kiến một bảng báo cáo JSONB, tái sử dụng audit; quyền/phạm vi và mẫu in cần xác nhận. |
| **Quản lý vai trò & Phân quyền** | [ROLE-MANAGEMENT-RULES](.agents/rules/ROLE-MANAGEMENT-RULES.md), [docs/plans/ROLE-MANAGEMENT-CHECKLIST.md](docs/plans/ROLE-MANAGEMENT-CHECKLIST.md) | Trang /roles có ma trận quyền và gán role tài khoản; kiểm tra quyền DB theo HR/ACCOUNTS/ROLES/AUDIT. Workflow có quyền riêng VIEW/CREATE/APPROVE/EXECUTE/MANAGE và lọc theo hồ sơ; scope phòng tổng quát còn kế hoạch. |
| **Quy trình & Duyệt công việc** | [WORKFLOW-RULES](.agents/rules/WORKFLOW-RULES.md), [docs/plans/WORKFLOW-CHECKLIST.md](docs/plans/WORKFLOW-CHECKLIST.md) | Workflow bản thử nghiệm 05/11/2026: 5 bảng, mẫu có phiên bản, bước tuần tự, `/workflows`. Quyền riêng, đúng người được giao; chưa gán pilot thực tế. |
| **Tài khoản mặc định, Profile & Dashboard cá nhân** | [PROFILE-DASHBOARD-RULES](.agents/rules/PROFILE-DASHBOARD-RULES.md), [docs/plans/PROFILE-DASHBOARD-CHECKLIST.md](docs/plans/PROFILE-DASHBOARD-CHECKLIST.md), [docs/THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md](docs/THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md) | Đã triển khai: DEFAULT tối thiểu, tên đăng nhập tự sinh, mật khẩu tạm, /profile và dashboard cá nhân. Quyền workflow cấp tập trung tại /roles; không tự cấp grant cho dữ liệu cũ. |
| **Chiến lược số hóa & Hiện trạng hệ thống** | [docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md) | Vai trò của 1Office, phạm vi SDG ERP, rủi ro, nguyên tắc tích hợp và lộ trình 30–60–90 ngày. |
| **Mô hình dữ liệu quản trị & Tích hợp 1Office** | [docs/strategy/MO-HINH-DU-LIEU-QUAN-TRI-VA-TICH-HOP-1OFFICE.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/MO-HINH-DU-LIEU-QUAN-TRI-VA-TICH-HOP-1OFFICE.md) | Cơ cấu, tài khoản, nhóm quyền, quy trình, tri thức ngầm, dữ liệu nguồn và ranh giới tích hợp 1Office–SDG ERP. |
| **Master Data & RBAC SDG ERP–1Office** | [docs/strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md) | Đối chiếu dữ liệu nền, mapping đơn vị, phân lớp role, quyền sở hữu dữ liệu, quy tắc xung đột và luồng đồng bộ. |
| **Kế hoạch: Chuyển đổi số** | [docs/plans/DIGITAL-TRANSFORMATION-CHECKLIST.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/plans/DIGITAL-TRANSFORMATION-CHECKLIST.md) | Checklist khảo sát, xác nhận dữ liệu, hardening, tích hợp, pilot và mở rộng. |
| **Ý tưởng tính năng** | [docs/strategy/Y-TUONG-TINH-NANG.md](docs/strategy/Y-TUONG-TINH-NANG.md) | Ý tưởng để xem xét, gồm quét mã tài sản bằng camera điện thoại; không đồng nghĩa đã duyệt triển khai. |
| **Vị trí & không gian dùng chung** | [LOCATION-MANAGEMENT-RULES](.agents/rules/LOCATION-MANAGEMENT-RULES.md), [Plan vị trí](docs/plans/LOCATION-MANAGEMENT-CHECKLIST.md) | Đã có `/locations`, cây `vi_tri`, quyền LOCATIONS riêng, mã tự sinh, lịch sử. Đã nhập 10 vị trí HCNS; HR gán vị trí hai chiều; xóa vị trí tự bỏ gán người khi đủ quyền/xác nhận. Tài sản dùng FK vị trí riêng; chặn xóa/ngừng dùng vị trí còn tài sản. |
| **Mô hình 3D tòa nhà & HCNS** | [OFFICE-3D-RULES](.agents/rules/OFFICE-3D-RULES.md), [Plan 3D](docs/plans/OFFICE-3D-CHECKLIST.md) | Tòa nhà/tầng/HCNS dùng một Canvas tại `/office-3d`, cấp xem và điểm chọn theo URL, giữ camera khi quay lại/lưu dữ liệu. Nhấp đúp HCNS trong tầng phóng gần; chọn bàn/hình người, nhãn tên thay nút số. Fiber/Drei, phong cách mở mái. Quyền LOCATIONS; thêm HR VIEW xem người, HR MANAGE gán/chuyển/bỏ gán người; ASSETS VIEW/MANAGE xem/gán/chuyển/bỏ gán thiết bị tại chi tiết HCNS. Không suy nhân sự từ phòng ban; phòng chưa có nội thất chỉ hiển thị không gian tham khảo. |
| **Quản lý tài sản & Tích hợp 3D** | [.agents/rules/ASSET-MANAGEMENT-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/ASSET-MANAGEMENT-RULES.md), [docs/plans/ASSET-MANAGEMENT-CHECKLIST.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/plans/ASSET-MANAGEMENT-CHECKLIST.md), [docs/strategy/DANH-GIA-TICH-HOP-TAI-SAN-VA-MO-HINH-3D.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/strategy/DANH-GIA-TICH-HOP-TAI-SAN-VA-MO-HINH-3D.md) | Mức 1 đã có /assets: loại, danh sách/tìm lọc, hồ sơ, chọn người/vị trí và lịch sử; 2 bảng và quyền ASSETS tại /roles. Dùng vị trí chung và RBAC/audit; người dùng đã tạo PC đầu tiên. HCNS 3D có gán/chuyển/bỏ gán theo ASSETS riêng; vật tư làm sau; không khôi phục schema/seed cũ. |

---

## 2. Nguyên Tắc Vận Hành Lõi (Core Operational Principles)

1. **Direct-to-DB:** Mọi Server Action tương tác trực tiếp với Prisma Client. Không tạo các tầng trừu tượng trung gian rườm rà (Repository, Service Interface).
2. **Single Source of Truth:** Router chỉ điều phối. Ba rule Frontend/Backend/Database chỉ giữ quy chuẩn kỹ thuật dùng chung, ổn định; không thêm cấu hình tính năng, lịch sử migration, số liệu demo hoặc kết quả kiểm thử. Nghiệp vụ riêng nằm trong rule phân hệ; quyết định DB, tiến độ và kết quả triển khai nằm trong plan phân hệ hoặc tài liệu thiết kế được plan liên kết. Khi nội dung đã có nơi quản lý, dùng liên kết thay vì sao chép.
3. **Tính Toàn Vẹn Dữ Liệu:** Không bao giờ tự ý chạy các lệnh xóa cột (`drop column`), reset CSDL làm mất dữ liệu của người dùng mà không có xác nhận.
4. **Đồng Bộ Kế Hoạch Bắt Buộc (Mandatory Checklist Sync):** Mỗi khi thực thi một lệnh, hoàn thành một bước hoặc có bất kỳ sửa đổi kỹ thuật/kiến trúc nào, AI Agent **BẮT BUỘC** phải cập nhật ngay vào tệp Checklist tương ứng (`docs/plans/<TEN-PHAN-HE>-CHECKLIST.md`), đánh dấu `[x]` các việc đã xong và ghi nhận các quyết định kiến trúc mới. Cập nhật/gộp vào mục hiện có, không nối nhật ký từng lệnh hoặc lặp lịch sử; checklist giữ trạng thái hiện hành và bước tiếp theo. Tổng quan tại [docs/plans/README.md](docs/plans/README.md), thiết kế chi tiết workflow tại [docs/THIET-KE-QUY-TRINH.md](docs/THIET-KE-QUY-TRINH.md).
5. **Đồng Bộ Kiến Trúc & Thư Viện Bắt Buộc (Mandatory Architecture & Dependency Sync):** Mỗi khi chạy lệnh cài đặt/gỡ bỏ thư viện (`package.json`), cập nhật biến môi trường (`.env`), hoặc thay đổi cấu trúc thư mục/hạ tầng, AI Agent **BẮT BUỘC** phải cập nhật ngay vào tệp [docs/ARCHITECTURE.md](file:///Users/duonghoangnam/Desktop/SGDERP/docs/ARCHITECTURE.md) (cập nhật bảng dependencies, cấu trúc thư mục hoặc hướng dẫn cài đặt).
6. **Không tự truy cập 1Office:** Không dùng lại tài khoản, mật khẩu, cookie hoặc session 1Office từ lịch sử hội thoại hay lần khảo sát trước. Chỉ được truy cập khi người phụ trách cấp lại thông tin trong yêu cầu hiện tại và nêu rõ phạm vi; mặc định chỉ xem và export, tuyệt đối không tạo, sửa, duyệt, xóa, đổi quyền hoặc đổi cấu hình trên 1Office.
7. **Không lưu thông tin đăng nhập 1Office:** Không ghi credential vào mã nguồn, tài liệu, script, log, file môi trường hoặc bộ nhớ dùng lại. Sau lần sử dụng, coi credential đã hết hiệu lực đối với Agent và yêu cầu người phụ trách cấp lại khi cần.
8. **Trạng thái prototype:** Toàn bộ tính năng SDG ERP hiện có là bản nháp phục vụ khảo sát. Agent được phép đề xuất giữ, sửa lớn hoặc xây lại; báo cáo/phân tích không đồng nghĩa được duyệt triển khai. Không thực hiện thay đổi kiến trúc hoặc chức năng theo đề xuất trước khi có yêu cầu triển khai rõ ràng.
9. **Duyệt thay đổi ba rule kỹ thuật chung:** Mọi thay đổi đối với [DATABASE-RULES.md](.agents/rules/DATABASE-RULES.md), [FRONTEND-RULES.md](.agents/rules/FRONTEND-RULES.md) hoặc [BACKEND-RULES.md](.agents/rules/BACKEND-RULES.md) phải theo quy trình dưới đây. Quyền full access/cấu hình tự động cho phép chạy công cụ không thay thế chấp thuận nội dung của người dùng.

### Quy trình duyệt ba rule kỹ thuật chung

1. **Đề xuất trước khi sửa:** Đọc hiện trạng và chuẩn bị nội dung cụ thể. Câu trả lời cuối của lượt đề xuất phải liệt kê từng file/mục bị ảnh hưởng, đầy đủ nội dung cũ → mới của phần sửa, nguyên văn phần thêm hoặc xóa, lý do, phân tích tác động và các thay đổi mã nguồn/DB/tài liệu liên quan nếu có. Không chỉ nói “đã/cần cập nhật rule” hoặc bắt người dùng tự mở diff mới hiểu.
2. **Chờ lượt tiếp theo:** Chưa ghi thay đổi vào ba file trên hoặc triển khai phần phụ thuộc vào chuẩn mới trong lượt đề xuất. Chỉ thực hiện khi người dùng gửi yêu cầu triển khai ở lượt sau, ví dụ “Hãy thực hiện”, cho đề xuất đã trình bày. Im lặng, hết thời gian hoặc full access không được coi là duyệt. Nếu cần dừng, nêu rõ đang chờ duyệt theo mục này và liên kết tới `AGENTS.md`; công việc độc lập đã được cho phép vẫn tiếp tục.
3. **Thực hiện đúng phạm vi đã duyệt:** Không hỏi lại phần đã được duyệt; phát sinh thay đổi ngoài phạm vi thì trình bày riêng để duyệt tiếp. Đồng bộ plan/tài liệu liên quan theo quy định hiện có. Câu trả lời sau triển khai ghi đầy đủ các thay đổi thực tế và nội dung rule đã sửa, phân tích ảnh hưởng, kết quả kiểm tra và phần còn lại nếu có.

Quy trình này áp dụng cho việc sửa ba rule chung, không tự mở rộng thành bước duyệt bắt buộc cho mọi sửa đổi tính năng, rule phân hệ hoặc plan. `AGENTS.md` là nơi quản lý quy trình; các tài liệu khác chỉ dẫn liên kết, không sao chép quy định.

---

## Lưu tài liệu cục bộ — cập nhật 28/10/2026

Ảnh tài liệu, file nguồn/export nội bộ, Word/PDF/PowerPoint và file tạm/script hỗ trợ tạo tài liệu chỉ lưu trên máy, không đưa lên GitHub. Đặt đầu ra và script dùng tạm trong `outputs/` (các thư mục `output/`, `ouput/`, `tmp/`, `temp/` cũng được bỏ qua). Không dùng `git add -f` để đưa các file này vào Git. Tài liệu thiết kế/plan/rule Markdown và tài nguyên ứng dụng trong `public/`, `src/` vẫn được quản lý bằng Git. Khi bỏ theo dõi file đã có trong Git, dùng `git rm --cached` để giữ bản trên máy; không tự xóa file hoặc viết lại lịch sử Git.

## 3. Quản Lý Kế Hoạch & Mở Rộng Phân Hệ Mới (Plans Extensibility)

Khi tạo hoặc cập nhật plan, Agent **BẮT BUỘC** đọc và tuân thủ [Quy chuẩn lập và cập nhật plan](docs/plans/README.md#quy-chuẩn-lập-và-cập-nhật-plan); đây là nguồn chính về bố cục và cách trình bày kế hoạch.

Khi dự án mở rộng thêm các phân hệ mới (ví dụ: `TASK`, `APPROVAL`, `OFFICE-3D`, `WAREHOUSE`...):
1. **Kế hoạch triển khai:** BẮT BUỘC tạo tại thư mục `docs/plans/<TEN-PHAN-HE>-CHECKLIST.md`.
2. **Quy tắc chuyên biệt:** Khi phân hệ có nghiệp vụ/hành vi riêng, BẮT BUỘC tạo `.agents/rules/<TEN-PHAN-HE>-RULES.md`; không đưa nội dung đó vào ba rule kỹ thuật chung. Rule riêng dẫn tới plan/thiết kế DB, không chép lại chuẩn chung hoặc lịch sử triển khai.
3. **Đăng ký định tuyến:** Bổ sung các đường dẫn trên vào Bảng Định Tuyến (Mục 1) của tệp này để AI tự động nạp ngữ cảnh khi nhận việc.
4. **Phân tách nội dung DB:** `DATABASE-RULES.md` chỉ giữ chuẩn thiết kế chung; chỉ sửa khi thay đổi chuẩn được chốt. Ràng buộc/thiết kế DB riêng của tính năng ghi trong mục `Thiết kế DB cần giữ` của plan tương ứng; chi tiết dài liên kết sang tài liệu thiết kế. Lịch sử migration ở Git/SQL migration, plan chỉ giữ mốc và kết quả cần thiết để hiểu trạng thái hiện tại. Không nối nhật ký triển khai vào rule chung hoặc tạo bản sao cùng một quy định tại nhiều file.
