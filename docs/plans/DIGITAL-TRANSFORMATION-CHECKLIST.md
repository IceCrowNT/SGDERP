# Kế hoạch khảo sát và định hướng số hóa

## Giai đoạn 0 — Khảo sát ban đầu

- [x] Ghi nhận ràng buộc mới: không truy cập lại 1Office bằng credential cũ; chỉ xem/export khi được cấp lại cho yêu cầu cụ thể; giữ nguyên quyền và không thay đổi dữ liệu/cấu hình.
- [x] Kiểm tra repository không chứa chuỗi mật khẩu 1Office đã cung cấp trong hội thoại.
- [x] Ghi nhận toàn bộ tính năng SDG ERP hiện tại là bản nháp; báo cáo có thể đề xuất xây lại nhưng chưa phải lệnh triển khai.
- [x] Kiểm kê tài liệu quy trình trong `docs/SDGSources`.
- [x] Rà soát kiến trúc, rules, schema và mã nguồn SDG ERP hiện tại.
- [x] Truy cập 1Office bằng tài khoản được cấp trong chế độ chỉ đọc.
- [x] Kiểm kê 33 phân hệ/đường dẫn trong bảng ứng dụng 1Office.
- [x] Kiểm kê trang quản trị: người dùng, phòng ban, nhóm quyền, lịch sử, SSO/OIDC và gói ứng dụng.
- [x] Xuất và lưu cục bộ 4 nguồn quản trị: 56 tài khoản hoạt động, 11 tài khoản khóa, 19 đơn vị và 11 nhóm quyền.
- [x] Lập manifest checksum và đính kèm 4 workbook vào project theo phạm vi Git riêng cho nguồn 1Office.
- [x] Đọc toàn bộ sheet, dòng và cột của 4 workbook; ghi nhận độ đầy đủ và các sai lệch dữ liệu.
- [x] Kiểm kê 34 mẫu quy trình, trạng thái, lượt chạy, form và một phần sơ đồ phiên bản.
- [x] Phân tích sâu các sơ đồ HCNS01, PC01, HCNS03, KHĐT01 và KHĐT05.
- [x] Lập mô hình dữ liệu tích hợp và ranh giới tính năng 1Office–SDG ERP.
- [x] Ghi nhận mức sử dụng hiển thị của Công việc, Dự án, Quy trình, Ký số, HRM, CRM và các module Advance.
- [x] Ghi nhận các khoảng trống và vấn đề từ lịch sử ticket hỗ trợ.
- [x] Tạo tài liệu `docs/strategy/CURRENT-STATE-AND-DIGITAL-TRANSFORMATION-DIRECTION.md`.
- [x] Đối chiếu từng hồ sơ giữa file 67 nhân sự và 66 tài khoản người dùng 1Office; xác nhận không có sai lệch phòng ban/vị trí ở các cặp đã khớp và nhận diện hồ sơ mã 71 chưa có tài khoản.
- [x] Đối chiếu 18 đơn vị SDG với 18 đơn vị nghiệp vụ 1Office, lập mapping code SDG–ID 1Office và tách nút công ty ID 23.
- [x] Đối chiếu role seed với nhóm 1Office; xác nhận hai mô hình không thể ánh xạ 1–1.
- [x] Lập thiết kế `docs/strategy/MASTER-DATA-AND-RBAC-SYNCHRONIZATION.md` cho master data, RBAC, nguồn sở hữu, trạng thái và luồng đồng bộ.
- [x] Xác minh PostgreSQL local tại `localhost:5432` đang hoạt động; lỗi kết nối trước đó do sandbox. Migration tài sản đã được áp dụng và seed BMHC 0501 đã nạp 11 nhóm, tổng 90 thiết bị ở mức số lượng.
- [x] Ghi nhận bối cảnh người phụ trách nhận bàn giao ít thông tin; phần lớn hiện trạng phải tự khảo sát, tìm kiếm và kiểm chứng dần.
- [x] Chốt 1Office là nguồn chuẩn cho hồ sơ nhân sự và cơ cấu tổ chức dùng làm base cho SDG ERP.
- [x] Hoàn thiện cơ cấu phòng ban giai đoạn hiện tại: lưu snapshot/mapping 1Office trên 18 đơn vị, khóa trường nguồn, hiển thị cây và tab đối chiếu 18/18 khớp.
- [x] Đọc đủ 21 trang cẩm nang hội nhập dạng ảnh và lập báo cáo đối chiếu cơ cấu/chức năng/đầu mối/bảo mật tại `docs/strategy/ONBOARDING-HANDBOOK-ORGANIZATION-RECONCILIATION.md`.

## Giai đoạn 1 — Xác nhận hiện trạng

- [x] Ngừng sử dụng credential 1Office cũ trong phạm vi Agent; khi cần khảo sát mới phải nhận lại tài khoản và phạm vi từ người phụ trách.
- [ ] Chỉ định người bảo trợ dự án số hóa.
- [ ] Chốt đầu mối nghiệp vụ của HCNS, TCKT, Pháp chế, Kinh doanh, KHĐT và Ban QLDA.
- [ ] HCNS xác nhận phiên bản/ngày hiệu lực cẩm nang; HCNS/BQLDA xác nhận quan hệ Ban Giám đốc QLDA với sáu bộ phận và cách phân loại Ban Kiểm soát.
- [ ] Nhận snapshot/export 1Office tại thời điểm chốt gồm cơ cấu, nhân sự, vị trí và quản lý trực tiếp; ghi nhận riêng các ngoại lệ cần người phụ trách xác minh.
- [x] Nhận export quản trị cho tài khoản, phòng ban và nhóm quyền để xác minh số liệu quan sát trên giao diện.
- [ ] Nhận export/API chính thức cho hồ sơ nhân sự, node/cạnh quy trình, điều kiện, form và lịch sử chạy.
- [ ] Xác nhận danh mục quy trình đang có hiệu lực và phiên bản áp dụng.
- [ ] Xác nhận các hệ thống/file khác đang dùng ngoài 1Office.
- [ ] Làm việc với 1Office về API, webhook, export, backup và môi trường test.
- [ ] Lập phiếu khảo sát chuẩn cho từng phân hệ 1Office: chủ sở hữu, người dùng, dữ liệu, quyền, vấn đề, tích hợp và quyết định đề xuất.
- [ ] Phỏng vấn người dùng thực tế trước khi kết luận một module trống là không cần thiết.
- [ ] Rà soát quyền `Xem tất cả` hồ sơ nhân sự của nhóm Nhân viên và Quản lý.
- [ ] Kiểm tra bằng tài khoản Nhân viên các trường hồ sơ thực sự nhìn thấy trước khi đề xuất đổi quyền.
- [ ] Kiểm thử việc thu hồi session/token của một tài khoản đã khóa mà không tác động tài khoản thật đang dùng.
- [x] Đối soát kỹ thuật trạng thái người/tài khoản: 67 người = 66 người có tài khoản + 1 hồ sơ chưa có tài khoản; 56 active gồm 55 người + tài khoản hệ thống `admin`.
- [ ] Tìm hiểu dần lý do 11 tài khoản bị khóa và hồ sơ mã 71 chưa có tài khoản; đây là ngoại lệ vòng đời account, không chặn việc dùng hồ sơ/cơ cấu 1Office làm dữ liệu nền.
- [ ] Xử lý thành viên nhóm có trạng thái khóa/đã xóa theo chính sách lưu trữ được phê duyệt.
- [ ] Xác minh 3 tài khoản thiếu phòng ban và 1 tài khoản thiếu nhóm là tài khoản kỹ thuật hay dữ liệu thiếu.

## Giai đoạn 2 — Làm an toàn SDG ERP

- [x] Tạo trang fallback responsive “Tính năng đang được phát triển” cho toàn bộ URL chưa tồn tại trong dashboard; giữ nguyên sidebar, header và theme.
- [x] Đánh dấu `Sắp có` trên các menu Công việc, Phân quyền vai trò và Cài đặt chung chưa được triển khai.
- [x] Ánh xạ tên hiển thị cho `/tasks`, `/tasks/department`, `/roles`, `/settings` và hồ sơ nhân sự chi tiết chưa tồn tại.
- [x] Chạy lint toàn project; ghi nhận 26 lỗi và 15 cảnh báo có sẵn ngoài phạm vi trang fallback. Sửa kiểu icon `any` trong Sidebar vừa thay đổi; tiếp tục kiểm tra riêng các file mới.
- [x] Lint riêng page catch-all, component thông báo và Sidebar: đạt, không có lỗi/cảnh báo.
- [x] Production build bằng webpack: biên dịch, TypeScript và sinh route thành công; route động `ƒ /[...slug]` đã có trong route table. Turbopack mặc định vẫn bị giới hạn mở cổng nội bộ trong sandbox và middleware cũ có cảnh báo chuyển sang `proxy`.
- [ ] Xử lý password hash trong DTO và audit snapshot.
- [ ] Hoàn thiện kiểm tra permission và `companyId` ở mọi truy vấn.
- [ ] Thêm cơ chế vô hiệu hóa session khi khóa tài khoản, đổi mật khẩu hoặc thay quyền.
- [ ] Tách seed demo khỏi import/sync dữ liệu thật.
- [ ] Thống nhất secret môi trường và loại bỏ secret dự phòng trong mã.
- [ ] Kiểm thử phân quyền, tenant scope, backup và restore.
- [ ] Chưa đưa dữ liệu nhạy cảm hoặc người dùng thật vào hệ thống trước khi hoàn thành các mục trên.

## Giai đoạn 3 — Dữ liệu nền và tích hợp

- [ ] Chốt hệ thống nguồn cho các nhóm dữ liệu còn lại; riêng hồ sơ nhân sự và cơ cấu tổ chức đã chốt lấy 1Office làm chuẩn.
- [ ] Chuẩn hóa ID công ty, đơn vị, vị trí, nhân viên và địa điểm.
- [x] Thiết kế logic mapping ID SDG ERP–1Office và chốt nguyên tắc code SDG + external ID 1Office; mapping `Department` đã triển khai, mapping tổng quát cho các thực thể khác chưa tạo migration.
- [x] Triển khai mapping trực tiếp cho `Department` bằng migration `20261021181500_add_department_oneoffice_snapshot` và script nhập export; lớp mapping tổng quát cho các thực thể khác vẫn để ở giai đoạn sau.
- [x] Thiết kế mục tiêu tách Person, Employment, OrganizationAssignment, ExternalAccount và GroupMembership; chưa tạo bảng/migration.
- [ ] Tạo migration cho ExternalSystem, ExternalMapping, SyncRun, SyncIssue và các bảng external snapshot sau khi thiết kế được duyệt.
- [ ] Tách Person/Employment/ApplicationAccount sau khi có snapshot 1Office tại thời điểm chốt và kế hoạch migration dữ liệu được duyệt.
- [ ] Dừng suy role đặc quyền và tạo login tự động trong luồng import sản xuất; giữ seed hiện tại cho demo/bootstrap cho tới khi có importer mới.
- [ ] Chuyển scope từ Permission sang grant/assignment; giữ action chi tiết thay vì nén còn `NONE/VIEW/MANAGE`.
- [ ] Thêm scope đơn vị, hiệu lực, nguồn và người duyệt vào RoleAssignment.
- [ ] Xây dựng staging → validate → diff → approval → transaction → reconciliation; lần đầu chỉ tạo báo cáo, không tự áp dụng.
- [ ] Lưu mapping WorkflowDefinition, WorkflowVersion và WorkflowInstanceRef để deep-link, không sao chép workflow engine.
- [ ] Thiết kế đồng bộ một chiều có log, đối soát và idempotency.
- [ ] Thử nghiệm trên môi trường test bằng dữ liệu đã ẩn thông tin nhạy cảm.

## Giai đoạn 4 — Pilot

- [x] Chọn pilot quản lý tài sản IT gắn không gian 3D trên SDG ERP; phạm vi này không trùng luồng công việc/quy trình đang vận hành ổn định trên 1Office.
- [ ] Pilot kho Tài liệu công ty với một nhóm quy chế/biểu mẫu đã được xác nhận.
- [ ] Đánh giá module Tài sản 1Office để chốt ranh giới tích hợp và tránh nhập liệu kép; việc này không chặn pilot tài sản IT trên SDG ERP.
- [ ] Đối chiếu NP01/NP02 và VPP01/VPP02/VPP03 để quyết định giữ riêng hay hợp nhất.
- [ ] Thiết kế cách kết hợp module Văn bản đến với HCNS07 mà không nhập dữ liệu hai lần.
- [ ] Xác định chủ sở hữu, nhóm dùng thử và tiêu chí thành công.
- [ ] Ghi nhận số liệu trước triển khai.
- [ ] Triển khai thử cho phạm vi nhỏ.
- [ ] Đo kết quả, lỗi, mức sử dụng và phản hồi.
- [ ] Nghiệm thu hoặc quay lui theo tiêu chí đã thống nhất.

## Giai đoạn 5 — Roadmap mở rộng

- [ ] Phân loại từng nhu cầu: cấu hình 1Office, tích hợp hoặc xây SDG ERP.
- [ ] Chốt danh mục module 1Office: dùng thật, pilot, chờ quyết định, lưu trữ và không sử dụng.
- [ ] Gắn mức độ chắc chắn và bằng chứng cho từng quyết định giữ/tối ưu/hợp nhất/chuyển sang SDG ERP.
- [ ] Ẩn mẫu test/tạm dừng khỏi lựa chọn khởi tạo mới sau khi chủ quy trình xác nhận.
- [ ] Chốt roadmap 6–12 tháng và ngân sách.
- [ ] Mở rộng theo từng đợt có đào tạo và hỗ trợ sau triển khai.
- [ ] Rà soát quyền, chất lượng dữ liệu và hiệu quả theo quý.
