# Kế hoạch quy trình và duyệt công việc

Cập nhật: **20/11/2026**. **Tiến độ ghi nhận của Quy trình: 0%. Người phụ trách xác nhận chưa đánh giá phân hệ ở bước plan, chưa thử nghiệm và nghiệm thu.** Giữ file plan để xem xét; mã nguồn/schema hiện có và kết quả kiểm thử trước đây chỉ là bản nháp kỹ thuật, không coi là thiết kế đã được người phụ trách chấp thuận hoặc kết quả hoàn thành. Hướng kéo thả, biểu mẫu, thông báo và dashboard dưới đây là đề xuất chờ đánh giá. Xem [bảng đối chiếu](README.md#đối-chiếu-plan-với-code-và-db) và [Thiết kế quy trình](../THIET-KE-QUY-TRINH.md).

## Làm gọn hệ thống, giữ hướng phát triển Quy trình — 25/11/2026

Người phụ trách làm rõ vẫn muốn dùng Quy trình về sau; mục tiêu hiện tại là giảm phức tạp và tránh bản nháp chưa kiểm duyệt ảnh hưởng các phân hệ đang phát triển. Phương án xóa toàn bộ ở lượt trước chưa được duyệt và được đưa lại vào diện xem xét. Đã rà phạm vi, chưa gỡ/tắt mã, đổi schema hoặc ghi DB. Công việc/ticket SUPPORT_TASK độc lập.

- [x] Đối chiếu route/component/action, dashboard/AI, session/quyền, seed và tests: 12 file runtime riêng; phần dùng chung cần tách riêng tham chiếu WORKFLOW. Tài liệu riêng gồm plan này, `docs/THIET-KE-QUY-TRINH.md`, `.agents/rules/WORKFLOW-RULES.md`; cần phân biệt bản tham khảo chưa duyệt với tài liệu hướng dẫn hệ thống đang dùng.
- [x] Kiểm tra DB vận hành bằng transaction READ ONLY/RepeatableRead lúc 11:17 +07: 5 bảng lõi và `dong_vat_tu_quy_trinh` đều 0 hàng; `giao_dich_vat_tu.dong_vat_tu_id` không có giá trị khác null. Có 5 quyền WORKFLOW và 10 gán quyền cần gỡ riêng. Giữ 7 loại/9 mặt hàng/18 giao dịch vật tư, audit chung và 4 bảng Công việc. Catalog/count tại `outputs/workflow-removal-audit-20261125/snapshot.json`.
- [ ] Chốt phạm vi tạm ngừng: bỏ điểm vào/UI/truy vấn dashboard, ngăn cả truy cập trực tiếp và Server Actions; đưa mã nháp ra khỏi phần ứng dụng đang sử dụng/biên dịch, giữ bản sao đủ cả thay đổi chưa commit. Ngừng sử dụng/cấp mới quyền WORKFLOW trong hệ thống hiện hành.
- [ ] Tách nhánh vật tư theo workflow khỏi nhập/xuất trực tiếp; rà và tháo liên kết/trigger riêng sau backup và thử trên DB riêng. Không xóa sổ giao dịch, tồn hoặc audit chung.
- [ ] Giữ plan/thiết kế dưới nhãn chưa duyệt, tạm ngừng; tổng quan hiện hành chỉ có trạng thái và nơi tra cứu. Chưa cần xóa bảng lõi rỗng hoặc viết lại migration cũ; xem xét schema sau khi duyệt yêu cầu Quy trình mới.
- [ ] Kiểm chứng Công việc, dashboard/AI, phân quyền, vật tư trực tiếp, build và bảo toàn dữ liệu. Chưa coi rà soát này là đã cô lập hoặc loại bỏ phân hệ. Mọi sửa ba rule chung vẫn theo [AGENTS.md](../../AGENTS.md#quy-trình-duyệt-ba-rule-kỹ-thuật-chung).

## Trạng thái chờ đánh giá plan — 20/11/2026

- [x] Ghi nhận yêu cầu chỉ đưa **Quy trình** về 0%; các phân hệ khác tiếp tục báo cáo tiến độ kỹ thuật theo thực tế. Checkbox kỹ thuật bên dưới là bằng chứng công việc trên bản nháp, không phải xác nhận nghiệm thu hoặc duyệt plan.
- [x] Kiểm tra DB local `sdg_erp` bằng transaction chỉ đọc: `mau_quy_trinh`, `buoc_mau_quy_trinh`, `ho_so_quy_trinh`, `buoc_xu_ly_quy_trinh`, `lich_su_quy_trinh` và `dong_vat_tu_quy_trinh` đều có 0 hàng; không có giao dịch vật tư liên kết. Không có bản ghi để xóa; giữ cấu trúc bảng, quyền và mã nguồn. Bằng chứng cục bộ: `outputs/workflow-status-review-20261120/db-check.json`.
- [ ] Người phụ trách đánh giá yêu cầu và thiết kế trong plan, xác nhận phạm vi trước khi tiếp tục triển khai/cấu hình pilot. Không tự phát hành mẫu hoặc coi việc giữ bản nháp là phê duyệt.

Rule nghiệp vụ: [WORKFLOW-RULES](../../.agents/rules/WORKFLOW-RULES.md).

## Ô chọn có tìm kiếm — 12/11/2026

- [x] Ô chọn mẫu và người xử lý/chuyển giao: đã chuyển sang tìm/chọn có hỗ trợ không dấu; kiểm thử giao diện và hồi quy đạt. Cách dùng chung và kiểm chứng tại [tổng quan](README.md#ô-chọn-dữ-liệu-có-tìm-kiếm--12112026). Không đổi dữ liệu hoặc quyền.

## Đồng bộ giao diện — 09/11/2026

- [x] Workspace có thẻ số liệu trong tối đa 200 hồ sơ được tải (ghi rõ phạm vi, không thay số đếm dashboard); bước mẫu dạng ô đánh số, chi tiết hồ sơ dạng timeline có nhãn trạng thái. Trạng thái trống/thiếu quyền có biểu tượng; không đổi quyền hoặc logic quy trình.
- [x] Nhóm workflow 10/10 E2E đạt; kiểm tra workspace và ảnh chi tiết quy trình trên desktop/mobile. TypeScript/lint đạt; giữ quyền, chuyển bước và lịch sử xử lý.

## Bản đầu

`/workflows`: tạo mẫu có phiên bản → phát hành → nhân sự gửi hồ sơ → duyệt/thực hiện tuần tự → kết quả và lịch sử. Luồng hỗ trợ IT được kiểm thử bằng công ty và tài khoản giả; chưa gán người hoặc quyền cho dữ liệu vận hành.

Nhu cầu ngày 17/11: ticket hỗ trợ có dòng vật tư thực dùng do IT bổ sung; hoàn thành ticket đồng thời chốt xuất tiêu hao. Yêu cầu, giới hạn và bước thiết kế tại [plan vật tư](INVENTORY-MANAGEMENT-CHECKLIST.md#nhu-cầu-tồn-chung-và-tiêu-hao-theo-ticket--17112026). Đợt 18/11 đã triển khai/kiểm chứng tích hợp dòng vật tư có cấu trúc: lưu nháp ở bước TASK chưa trừ tồn, hoàn thành hồ sơ mới xuất nguyên tử. Người sửa cần WORKFLOW EXECUTE và INVENTORY MANAGE, đúng người được giao; người chốt cuối có dòng tiêu hao cần thêm INVENTORY MANAGE. Không tự chuyển nội dung ghi chú thành giao dịch hoặc tự cấu hình mẫu/người pilot.

- [x] Tách nghiệp vụ khỏi rule Frontend/Backend chung sang `WORKFLOW-RULES.md`; đăng ký router, giữ quyết định DB trong plan. Chỉ sắp xếp tài liệu, không thay tính năng.

- [x] 5 bảng tiếng Việt, thêm vào 9 bảng lõi; migration chạy trên DB tạm trước khi áp dụng local sau backup. Không seed lại HR/tài khoản/quyền đang có.
- [x] Tách ràng buộc DB workflow khỏi rule tổng quát; tập trung tại mục thiết kế DB bên dưới, không đổi động cơ quy trình.
- [x] `/roles` chọn riêng VIEW, CREATE, APPROVE, EXECUTE, MANAGE; server kiểm tra quyền **và** quan hệ hồ sơ/người được giao.
- [x] Mẫu nháp, phát hành, ngừng dùng, sao chép phiên bản; mẫu đã phát hành bất biến, một bản phát hành cho mỗi mã/công ty.
- [x] Hồ sơ nháp, gửi, từ chối, lập lại thành hồ sơ mới; hộp việc, chi tiết, lịch sử. Chỉ lấy tối đa 200 hồ sơ được cập nhật gần nhất theo phạm vi quyền.
- [x] Chọn nhân sự cụ thể hoặc phụ trách phòng người gửi; thiếu người/quyền chặn gửi hoặc tạm dừng bước. Điều phối chuyển giao có lý do, không duyệt thay.
- [x] Chốt phòng lúc gửi, chốt người lúc kích hoạt bước; không tự duyệt kể cả qua tài khoản thứ hai. Mất quyền/nghỉ việc chặn xử lý ở server.
- [x] Khóa công ty → khóa phân quyền → hàng hồ sơ; trạng thái, phân công và lịch sử cùng transaction. Trigger giữ mẫu/nội dung đã gửi/lịch sử, FK cùng công ty/cùng mẫu và một bước mở.
- [x] Chuẩn hóa khóa workflow sang `id`, `company_id` và các FK nghiệp vụ có hậu tố `_id`; cập nhật trigger bảo vệ mẫu/hồ sơ, thử đủ 15 migration trên DB tạm và giữ nguyên dữ liệu hiện có.
- [x] 10 E2E workflow + 20 E2E hồi quy phân quyền/HR/phòng ban + 6 unit đạt. TypeScript, lint phần thay đổi, schema diff rỗng và `git diff --check` đạt. Đã xem desktop/mobile.
- [x] Build Webpack đạt; build Turbopack gặp lỗi môi trường mở cổng tiến trình khi xử lý CSS. Không đổi framework/config/dependency để vượt lỗi.
- [x] Đối chiếu backup: 72 nhân sự, 60 tài khoản, 19 phòng ban, 7 role và các grant cũ không đổi. Chỉ thêm 5 quyền và 5 bảng rỗng; dữ liệu kiểm thử đã dọn.
- [ ] Người phụ trách chọn pilot thực tế, cấp quyền qua `/roles`, chọn head/người xử lý và nghiệm thu.
- [x] Sửa trải nghiệm khởi tạo theo [thiết kế không gian cá nhân](../THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md): quyền cấp tập trung tại `/roles`, mở giao diện và nút tạo mẫu khi đủ quyền. Đã bỏ bước xác nhận/tự cấp quyền tại workflow theo yêu cầu 06/11. Kiểm tra 05/11: chưa role vận hành nào có WORKFLOW, chưa có mẫu; đây là nguyên nhân admin chỉ thấy hướng dẫn sang `/roles`.

Kiểm tra bổ sung 05/11: bộ 38 E2E tích hợp và 7 unit đạt sau bổ sung onboarding và dashboard cá nhân. Không cấp thêm grant cho công ty thật khi kiểm thử.

Kiểm tra 06/11: E2E Chrome luồng cấp/gỡ quyền tại `/roles` đạt; tài khoản nhận quyền dùng workflow ngay, thu hồi quyền chặn truy cập, người thiếu quyền không có nút tự cấp. TypeScript, lint phần thay đổi và `git diff --check` đạt. Không sửa dữ liệu/quyền vận hành.

Kiểm tra sau đổi tên DB 06/11: toàn bộ 51 E2E và 9 unit đạt trên bản build mới; mẫu quy trình 1, bước mẫu 4, chưa có hồ sơ chạy, đúng bằng backup trước migration. Trigger bảo vệ không còn tham chiếu cột cũ.

Sau khi tạo lại database demo cùng ngày: 5 bảng workflow đã được tạo đúng schema và đang rỗng; mẫu/bước thử cũ không phục hồi. Tạo mẫu demo mới qua `/workflows` sau khi cấp quyền tại `/roles`.

## Phạm vi quyền

| Quyền | Có thể làm |
| --- | --- |
| VIEW | Xem mẫu phát hành; hồ sơ mình gửi, được giao hoặc đã xử lý |
| CREATE | Kèm VIEW: tạo/sửa/gửi/hủy nháp của mình |
| APPROVE | Kèm VIEW: duyệt hoặc từ chối bước đang giao cho mình |
| EXECUTE | Kèm VIEW: hoàn tất bước thực hiện đang giao cho mình |
| MANAGE | Gồm VIEW toàn công ty, quản lý mẫu, chuyển giao, hủy hồ sơ đang chạy; không bao gồm CREATE/APPROVE/EXECUTE |

`pham_vi=ALL` chỉ xác nhận grant workflow hợp lệ trong tenant; quyền VIEW vẫn có bộ lọc theo hồ sơ, không có nghĩa thấy tất cả. Chưa xây scope phòng ban tổng quát. Chức vụ và head không tự cấp quyền.

Chưa gồm tệp đính kèm, biểu mẫu động, duyệt song song, điều kiện, hạn mức tiền, ủy quyền, nhắc việc/email hoặc kéo–thả trong mã nguồn hiện tại. Không tạo hai nơi phê duyệt chính thức cho cùng hồ sơ với 1Office.

## Thiết kế DB cần giữ

- Bản tuần tự gồm `mau_quy_trinh`, `buoc_mau_quy_trinh`, `ho_so_quy_trinh`, `buoc_xu_ly_quy_trinh`, `lich_su_quy_trinh`. FK kép bảo đảm cùng công ty, bước thuộc đúng mẫu/hồ sơ, dùng Restrict; `tai_khoan` có unique `(id, company_id)` để tham chiếu cùng công ty.
- Migration `20261105090000_quy_trinh_thu_nghiem` thêm bảng/enum/ràng buộc và 5 quyền WORKFLOW, không cấp role tự động. Mã hồ sơ do sequence `so_thu_tu_ho_so_quy_trinh` cấp; không thay ID/mã dữ liệu lõi.
- Partial unique: một mẫu PUBLISHED cho mỗi mã/công ty; một bước PENDING/BLOCKED cho mỗi hồ sơ. Trigger giữ mẫu/bước phát hành bất biến, nội dung hồ sơ đã gửi và lịch sử chỉ ghi thêm. Chuyển trạng thái, thứ tự bước và quyền vẫn kiểm tra trong transaction action.
- Lịch sử giữ tài khoản, nhân sự và tên tại thời điểm thao tác; thời gian cập nhật chỉ cấp khi tạo. Không sửa/xóa qua ứng dụng; kiểm thử chỉ dọn tenant giả trong transaction riêng, không tắt trigger cho kết nối ứng dụng.
- Thứ tự khóa: hàng công ty → advisory phân quyền `(260126, companyId)` → hàng hồ sơ. Trạng thái, phân công và lịch sử cùng commit. Schema/luồng chi tiết tại [Thiết kế quy trình](../THIET-KE-QUY-TRINH.md); phần kéo thả bên dưới còn là kế hoạch.

## Hướng mở rộng trình thiết kế kéo thả

- [x] Lập đề xuất giao diện dạng flowchart tương tự Visio với bảng công cụ, vùng vẽ, bảng cấu hình, kiểm tra và phát hành phiên bản; chờ người phụ trách đánh giá.
- [x] Đề xuất 8 hình ban đầu: bắt đầu, kết thúc, xử lý, phê duyệt, điều kiện, nhập dữ liệu, dữ liệu và điểm nối.
- [x] Đề xuất tách người thiết kế mẫu với người tạo hồ sơ; dữ liệu tự lấy theo người tạo hồ sơ, người đang xử lý, hệ thống, bước trước hoặc danh mục được phép.
- [x] Đề xuất hai luồng giao diện: quản trị viên thiết kế/phát hành mẫu; người dùng chọn mẫu, điền biểu mẫu và tạo yêu cầu/hồ sơ quy trình.
- [x] Đề xuất dashboard ưu tiên “đang đến lượt tôi”; thông báo chỉ là tín hiệu, bước PENDING và quyền tại server mới quyết định khả năng xử lý.
- [x] Đề xuất nguyên tắc phát hành: một điểm bắt đầu, có điểm kết thúc, không có hình rời, nhánh điều kiện có mặc định, phiên bản đã phát hành bất biến.
- [ ] Lập bản mẫu kỹ thuật vùng kéo thả và đánh giá thư viện phù hợp; chưa cài thêm dependency.
- [ ] Thiết kế migration từ danh sách bước tuần tự sang nút, liên kết và trường dữ liệu; phải giữ mẫu/hồ sơ hiện có và thử trên DB tạm trước.
- [ ] Triển khai cấu hình biểu mẫu, tự điền dữ liệu và chạy một nhánh tại một thời điểm; chưa hỗ trợ vòng lặp hoặc song song ở giai đoạn đầu.
- [ ] Thiết kế và triển khai thông báo trong ứng dụng khi bước được kích hoạt, chống tạo trùng và liên kết đúng hồ sơ; email/thông báo đẩy để sau.
- [ ] Kiểm thử phân quyền, cùng công ty, phiên bản mẫu, điều kiện nhánh, dữ liệu tự điền và khả năng khôi phục khi migration lỗi.

## Khảo sát thông báo và phê duyệt qua Zalo OA — 25/11/2026

### A. Đặc tả yêu cầu

**Đang khảo sát, chưa duyệt triển khai; không thay trạng thái 0% của phân hệ.** Người phụ trách muốn nhận thông báo công việc/bước cần duyệt trên Zalo và xử lý ngay, ví dụ nhân sự xin nghỉ, không đăng nhập ERP lại mỗi lần.

Hai phương án: (1) Mẫu phản hồi nhanh nhận lựa chọn trực tiếp trong tin nhắn, phù hợp chấp thuận đơn giản; (2) nút mở trang xử lý hoặc Mini App để xem hồ sơ/nhập lý do rồi xác nhận. Phương án 2 cần thiết kế liên kết và xác thực danh tính để giảm đăng nhập lặp lại; mở link tự nó không cấp quyền duyệt. Từ chối vẫn cần lý do theo rule hiện có, không thay bằng lý do mặc định. Chỉ đề xuất mẫu nội dung; phải xác nhận Zalo chấp thuận mục đích thông báo/phê duyệt nội bộ trước khi cam kết sử dụng.

Tiêu chí dự kiến: đúng người đang được giao mới xử lý được; không xử lý lại hồ sơ đã xong/hủy/chuyển giao hoặc đã đổi nội dung; phản hồi trên Zalo chỉ được báo là duyệt thành công sau khi ERP lưu; giữ lịch sử chung với thao tác trong ERP. Thông báo có tin nhắn mới/việc mới dùng mẫu phù hợp riêng, không mặc định mọi nội dung đều được gửi.

### B. Thiết kế kỹ thuật

- [x] Đối chiếu tài liệu chính thức: [Mẫu phản hồi nhanh](https://zalo.solutions/news/cap-nhat-moi-ra-mat-mau-phan-hoi-nhanh-thu-thap-phan-hoi-nguoi-dung-ngay-trong-tin-nhan/wj4xuakz8b3b36fpzbq7e6cg) hỗ trợ 1–5 nút, chỉ gửi theo số điện thoại, mỗi tin chọn một lần trong 7 ngày; không ghép nút link vào cùng mẫu. [Webhook](https://docs.zaloplatforms.com/docs/ZBS/quan-ly-template/template-webhook/su-kien-nguoi-dung-phan-hoi-template-phan-hoi-nhanh) có chữ ký, `msg_id`, `tracking_id` và nội dung nút; không trả trực tiếp ID tài khoản ERP. [Quy định duyệt mẫu](https://zalo.solutions/business-message/guidelines/quy-dinh-chung-khi-kiem-duyet-mau-zbs-template-message) cần được đối chiếu với mục đích nội bộ.
- [ ] Chốt phương án, phạm vi pilot, mẫu được duyệt và cách liên kết số Zalo đã xác minh với một tài khoản ERP cụ thể; không gộp quyền của nhiều tài khoản cùng nhân sự.
- [ ] Thiết kế tiếp nhận webhook xác thực chữ ký; ánh xạ thông báo đã gửi → người nhận → hồ sơ/bước/phiên bản; kiểm tra lại quyền, phân công và trạng thái hiện tại trong transaction; chống gửi lại sự kiện và duyệt đồng thời. Dùng chung quy tắc chuyển trạng thái/lịch sử, không cập nhật trạng thái thẳng từ nhãn nút.
- [ ] Thiết kế màn hình bổ sung cho từ chối có lý do/xem tệp; phiên xác thực giới hạn đúng người và tác vụ, không duyệt bằng GET hoặc chỉ dựa vào việc sở hữu đường link. Thông báo xác nhận lựa chọn của Zalo không thay xác nhận nghiệp vụ từ ERP.
- [ ] Thiết kế DB cần giữ: dùng các bảng workflow/lịch sử hiện có; liên kết danh tính, sổ gửi/nhận và chống trùng chưa thiết kế schema/migration. Gửi tin ngoài transaction; ERP là nguồn trạng thái chính, cần xử lý lỗi gửi và thử lại.
- [ ] Kiểm thử tích hợp thật, giả chữ ký, phản hồi lặp, mất quyền, nghỉ việc, chuyển giao, hủy/đổi hồ sơ và lỗi gửi. Chưa tạo kết nối, gửi tin hoặc sửa code/DB trong lượt khảo sát.

## Cách bắt đầu dùng thử

1. Tại `/roles`, cấp MANAGE quy trình cho tài khoản cấu hình; người gửi cần VIEW + CREATE, người duyệt VIEW + APPROVE, người thực hiện VIEW + EXECUTE. Quyền gắn từng tài khoản, không mặc định theo chức vụ.
2. Tại `/departments`, chọn người phụ trách phòng nếu mẫu dùng cách tìm head. Người gửi/duyệt/thực hiện phải gắn nhân sự đang làm việc.
3. Tại `/workflows`, tạo mẫu “Hỗ trợ IT”: bước duyệt bởi phụ trách phòng → bước thực hiện bởi nhân sự IT được chọn. Phát hành rồi gửi một hồ sơ thử; người gửi không tự duyệt.

Quyền được quản lý tại `/roles`; phải kiểm tra grant đang có trước khi cấu hình pilot, không tự cấp lại. DB tại mốc đối chiếu chưa có mẫu/hồ sơ nghiệp vụ. Người phụ trách chọn đối tượng dùng thử trước khi nghiệm thu; không cần đổi schema để cấu hình luồng trên.
