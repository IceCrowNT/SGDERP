# Kế hoạch khảo sát và định hướng số hóa

## Tài liệu cục bộ, không đưa lên GitHub — 28/10/2026

- [x] Cập nhật `.gitignore`: bỏ qua toàn bộ outputs/output/ouput, tmp/temp, ảnh và tài liệu nhị phân trong docs, export 1Office; bỏ ngoại lệ đưa workbook export vào Git.
- [x] Bỏ theo dõi 24 file đã có trong Git bằng `git rm --cached`; đối chiếu SHA-256 xác nhận các file còn trên máy không đổi. File `outputs/ai-api-key-mobile.png` đã bị xóa từ trước, không khôi phục hay xóa thêm file cục bộ.
- [x] Giữ logo/icon ứng dụng và mã nguồn được theo dõi; kiểm tra không còn file tracked thuộc các quy tắc ignore. Cập nhật AGENTS, ARCHITECTURE và README nguồn 1Office.
- [x] Đây là thay đổi working tree/index để áp dụng ở commit tiếp theo; chưa commit/push hoặc viết lại lịch sử Git. Các bản đã commit trước đây vẫn còn trong lịch sử.

## Giai đoạn 0 — Khảo sát ban đầu

- [x] Ngày 27/10/2026: rà soát tài liệu hiện có để phân nhóm thành bộ hồ sơ dự án phát triển SDG ERP; repository đã có nền tảng chiến lược, kiến trúc, dữ liệu và checklist phân hệ, nhưng còn cần chuẩn hóa hồ sơ khởi động/phạm vi, yêu cầu nghiệp vụ, kiểm thử–UAT, triển khai–nghiệm thu và vận hành–bàn giao.
- [x] Đổi tên 5 tài liệu trong `docs/strategy` sang tiếng Việt không dấu; cập nhật tham chiếu trong AGENTS.md, kiến trúc, checklist và tài liệu liên quan; kiểm tra không còn tên file cũ.

- [x] Ngày 22/10/2026: làm sạch file bối cảnh, gộp ý trùng, bỏ câu hỏi nguồn chuẩn đã chốt và lộ trình chung chưa được duyệt; cập nhật trạng thái prototype, cơ cấu và hướng bản sao nhân sự/API/webhook. Các số liệu cũ giữ mốc snapshot rõ ràng.
- [x] Ghi nhận mỗi phòng có tài khoản GPTpro5x riêng theo thông tin người phụ trách; định hướng người dùng tự kết nối tài khoản được cấp, sử dụng và phân bổ chi phí/hạn mức theo phòng, không tự chuyển sang nguồn trả phí chung. Tên gói, cách tích hợp và quyền sử dụng còn cần xác minh; chưa triển khai AI.

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
- [x] Tạo tài liệu `docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md`.
- [x] Đối chiếu từng hồ sơ giữa file 67 nhân sự và 66 tài khoản người dùng 1Office; xác nhận không có sai lệch phòng ban/vị trí ở các cặp đã khớp và nhận diện hồ sơ mã 71 chưa có tài khoản.
- [x] Đối chiếu 18 đơn vị SDG với 18 đơn vị nghiệp vụ 1Office, lập mapping code SDG–ID 1Office và tách nút công ty ID 23.
- [x] Đối chiếu role seed với nhóm 1Office; xác nhận hai mô hình không thể ánh xạ 1–1.
- [x] Lập thiết kế `docs/strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md` cho master data, RBAC, nguồn sở hữu, trạng thái và luồng đồng bộ.
- [x] Xác minh PostgreSQL local tại `localhost:5432` đang hoạt động; lỗi kết nối trước đó do sandbox. Migration tài sản đã được áp dụng và seed BMHC 0501 đã nạp 11 nhóm, tổng 90 thiết bị ở mức số lượng.
- [x] Ghi nhận bối cảnh người phụ trách nhận bàn giao ít thông tin; phần lớn hiện trạng phải tự khảo sát, tìm kiếm và kiểm chứng dần.
- [x] Chốt 1Office là nguồn chuẩn cho hồ sơ nhân sự và cơ cấu tổ chức dùng làm base cho SDG ERP.
- [x] Hoàn thiện cơ cấu phòng ban giai đoạn hiện tại: lưu snapshot/mapping 1Office trên 18 đơn vị, khóa trường nguồn, hiển thị cây và tab đối chiếu 18/18 khớp.
- [x] Đọc đủ 21 trang cẩm nang hội nhập dạng ảnh và lập báo cáo đối chiếu cơ cấu/chức năng/đầu mối/bảo mật tại `docs/strategy/DOI-CHIEU-CAM-NANG-HOI-NHAP-VA-CO-CAU.md`.

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

## Báo cáo tuần thử việc đầu tiên — 22/10/2026

- [x] Ngày 24/10/2026: bổ sung `.gitignore` cho toàn bộ PNG/PDF sinh ra khi render và kiểm tra tài liệu Word trong `outputs/word-tuan-dau/`; giữ DOCX, script và bản sao lưu hiển thị trong Git để người phụ trách chủ động quyết định quản lý.
- [x] Ngày 23/10/2026: theo yêu cầu khôi phục bản 2 trang, sửa lại riêng hình học bảng timeline trong `BAO-CAO-TUAN-DAU-DHN.docx`: đồng bộ độ rộng 03 cột theo lưới 3–6–7 cm, giữ nguyên nội dung người dùng đã bổ sung. Đã xuất lại bằng Microsoft Word và kiểm tra trực quan đủ 2 trang, bảng không còn co chữ hoặc tràn trang. Lưu bản trước khôi phục tại `outputs/word-tuan-dau/backups/BAO-CAO-TUAN-DAU-DHN-TRUOC-KHOI-PHUC-2-TRANG-20261023-1538.docx`.
- [x] Ngày 23/10/2026: kiểm tra lại bản người dùng hoàn thiện, không sửa file báo cáo. Nội dung đã gọn hơn và font Times New Roman đồng bộ; phát hiện bảng timeline có độ rộng ô không khớp lưới bảng, khi xuất bằng Microsoft Word bị co thành ba cột rất hẹp và kéo tài liệu thành 7 trang. Ghi nhận thêm các điểm cần người báo cáo tự cân nhắc: đầu ra tuần 3–4 và tháng 2 tuần 1–2 đang trùng nhau; “danh sách tài sản tại hiện trường” chưa khớp với nội dung “chưa bao gồm xác nhận thực tế”; tên riêng/thuật ngữ còn chưa thống nhất. Không có comment hoặc tracked changes trong DOCX.
- [x] Ngày 23/10/2026: đọc và đánh giá bản báo cáo hoàn thiện `BAO-CAO-TUAN-DAU-DHN.docx`, gồm nội dung, bảng timeline và bố cục Word 2 trang. Ghi nhận các điểm cần người báo cáo tự cân nhắc: kỳ báo cáo kết thúc sau ngày rà soát; cần tách kết quả đã có khỏi đầu ra tương lai, tách ô kết quả gộp theo từng mốc, sửa cụm “trước hết thử việc 5 ngày”, giới hạn AI ở mức khảo sát/prototype và thêm điều kiện pilot tài sản/quyền/dữ liệu. Không sửa file báo cáo.
- [x] Ngày 23/10/2026: sau khi người dùng tự tạo `BAO-CAO-TUAN-DAU-DHN copy.docx`, thực hiện lại việc đồng bộ font và thêm 12 ghi chú trong ngoặc trên `BAO-CAO-TUAN-DAU-DHN.docx` theo yêu cầu. Giữ nguyên text gốc theo kiểm tra chuỗi node, media không đổi; kiểm tra trực quan bằng Microsoft Word đủ 3 trang, không cắt/chồng chữ.
- [x] Ngày 23/10/2026: theo yêu cầu người dùng, khôi phục `docs/bao-cao/BAO-CAO-TUAN-DAU-DHN.docx` từ bản sao nguyên trạng ngay trước lần đồng bộ font/thêm ghi chú; checksum SHA-256 của file khôi phục khớp hoàn toàn với bản sao, tài liệu còn 29 đoạn, 2 bảng và không còn ghi chú được thêm ở lần xử lý đó.
- [x] Ngày 23/10/2026: sau khi người dùng dọn file, cập nhật trực tiếp báo cáo duy nhất `docs/bao-cao/BAO-CAO-TUAN-DAU-DHN.docx`; đồng bộ Times New Roman và cỡ chữ theo vai trò, giữ nguyên toàn bộ text gốc và nối thêm 12 ghi chú in nghiêng trong ngoặc tại các điểm cần xác nhận. Bản sao đối chiếu trước thay đổi lưu nội bộ ở `outputs/word-tuan-dau/backups/`; không tạo thêm báo cáo trong `docs/bao-cao`. Đã xuất bằng Microsoft Word và xem đủ 3 trang, không cắt/chồng chữ.
- [x] Ngày 23/10/2026: từ bản người dùng đang chỉnh sửa, tạo bản `TONG-HOP-BAO-CAO-TUAN-DAU-VA-CONG-VIEC-CAN-LAM-DONG-BO-FONT-VA-GHI-CHU.docx`; giữ nguyên toàn bộ câu chữ gốc, đồng bộ Times New Roman/cỡ chữ và chỉ nối thêm 12 ghi chú in nghiêng trong ngoặc tại các điểm cần xác nhận. Các ghi chú tập trung vào tên tài khoản/license, tài khoản thay thế, phạm vi SDG ERP, điều kiện dùng AI, tài sản phi vật lý, mốc T−10, cách ghi tiến độ, ô đầu ra dùng chung và tiêu chí vượt chỉ tiêu. Đã kiểm tra text gốc là chuỗi con đầy đủ theo thứ tự, media không đổi; xuất bằng Microsoft Word và xem đủ 3 trang, không cắt/chồng chữ.
- [x] Ngày 23/10/2026: tạo bản `TONG-HOP-BAO-CAO-TUAN-DAU-VA-CONG-VIEC-CAN-LAM-DONG-BO-FONT.docx` từ file người dùng đã bổ sung, không ghi đè file gốc. Chỉ chuẩn hóa Times New Roman và cỡ chữ theo vai trò: tiêu đề 16 pt, đề mục 13 pt, thân bài 12 pt, bảng 10,5 pt (hàng tiêu đề 11 pt), đầu trang/chân trang 9 pt. Đã đối chiếu toàn bộ text node và media trước–sau, xác nhận nội dung không thay đổi; xuất bằng Microsoft Word và kiểm tra trực quan đủ 2 trang, không cắt/chồng chữ.
- [x] Rút gọn bản Word theo phản hồi: gộp các ý trùng giữa trọng tâm, kết quả và kế hoạch; giữ 6 mục chính trong 2 trang; chuyển toàn bộ tiêu đề/nội dung sang đen trắng, Times New Roman. Bổ sung mục trình bày mẫu trực tiếp hoặc dùng ảnh chụp/video ngắn minh họa các chức năng và đầu ra. Đã xuất bằng Microsoft Word và kiểm tra trực quan đủ 2 trang, không có nội dung bị cắt, chồng hoặc ngắt mục bất hợp lý.
- [x] Dùng Microsoft Word (Office 365) có sẵn theo yêu cầu người dùng để xuất PDF kiểm tra; đã xem ảnh đủ 4 trang, xác nhận phần đầu hai cột, nội dung, ngắt trang và phần ký tên không bị cắt/chồng chữ. Hoàn tất kiểm tra trực quan từng bị chặn do thiếu LibreOffice; PDF/ảnh lưu nội bộ tại `outputs/word-tuan-dau/render/`.
- [x] Chỉnh phần đầu Word thành hai cột không viền theo yêu cầu: trái là quốc hiệu/tiêu ngữ, phải là TẬP ĐOÀN SAO ĐỎ và `Số: …/BC` chờ điền. Đã kiểm tra cấu trúc hai cột và giữ đủ 7 mục nội dung; chạy lại render nhưng vẫn thiếu `soffice`, chưa kiểm tra bằng ảnh.
- [x] Cập nhật tiếp bản Word hiện có theo yêu cầu: thêm quốc hiệu, tiêu ngữ, tiêu đề căn giữa, kính gửi và khối ký tên; bổ sung đầu ra cho 8 đầu việc và thứ tự thực hiện đề xuất. Giữ rõ kết quả khảo sát, prototype và đề xuất chưa được duyệt; họ tên, người nhận, kỳ báo cáo và ngày ký để người báo cáo điền.
- [x] Kiểm tra cấu trúc bản Word sau cập nhật: mở lại bằng python-docx, đủ 7 mục, 8 đầu ra công việc, quốc hiệu, tiêu ngữ và chữ ký. Đã chạy render_docx.py nhưng môi trường thiếu `soffice`; chưa xác nhận bố cục bằng ảnh từng trang.
- [x] Đọc lại trang 20 cẩm nang hội nhập và giữ đủ 5 đầu việc làm cấu trúc báo cáo.
- [x] Soạn [PowerPoint bản nháp 01](../bao-cao/BAO-CAO-TUAN-THU-VIEC-DAU-TIEN-BAN-NHAP-01.pptx), 10 slide; tách kết quả khảo sát, trạng thái prototype và đề xuất chưa được duyệt.
- [ ] Người báo cáo bổ sung họ tên, người nhận, kỳ báo cáo và xác nhận trạng thái tài khoản/email, BIDV, KPI, tham quan thực tế.
- [ ] Quản lý trực tiếp thống nhất 3 KPI, tiêu chí đánh giá và phạm vi thử nghiệm trước khi triển khai các đề xuất.
- [x] Soạn [bản Word tổng hợp báo cáo tuần đầu và công việc cần làm](../bao-cao/TONG-HOP-BAO-CAO-TUAN-DAU-VA-CONG-VIEC-CAN-LAM.docx); đã kiểm tra gói DOCX, 7 mục nội dung và các trường chờ xác nhận. Chưa kiểm tra bằng ảnh từng trang do máy thiếu LibreOffice/soffice.
- [x] Điều chỉnh bản Word theo yêu cầu mới: báo cáo tập trung vào công việc, kết quả khảo sát, đề xuất và kế hoạch. Thủ tục cá nhân (thẻ, CCCD, BIDV, tài khoản hội nhập) mặc định đã qua trong phạm vi báo cáo; thay thế yêu cầu chờ xác nhận các thủ tục này ở các ghi chú trước. KPI, đầu mối và phạm vi triển khai vẫn cần thống nhất.
- [x] Thêm menu và trang pilot hồ sơ thanh toán AI; phạm vi chuẩn bị yêu cầu thủ công, chưa tích hợp AI. Theo dõi tại [AI-DOCUMENTS-CHECKLIST.md](./AI-DOCUMENTS-CHECKLIST.md).

### Timeline báo cáo thử việc — 22/10/2026
- [x] Bổ sung timeline khái quát và đầu ra đối chiếu vào mục 5 bản Word báo cáo tuần đầu: tuần 1, cuối tháng 1, tháng 2 nếu thuộc kỳ thử việc và hạn T−5 ngày.
- [x] Phân biệt chỉ tiêu đề xuất với mục tiêu phấn đấu vượt; kết quả vượt cần minh chứng, không mặc định bảo đảm. Chưa có ngày bắt đầu/kết thúc để chốt lịch tuyệt đối.
- [x] Kiểm tra mở lại DOCX và cấu trúc bảng; chưa kiểm tra hình ảnh trang vì môi trường thiếu LibreOffice.
