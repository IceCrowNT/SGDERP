# Kế hoạch số hóa và báo cáo công việc

Cập nhật: **20/11/2026**. Đây là lộ trình số hóa chung, không phải plan của một tính năng hoặc bảng DB riêng. Nền phân quyền, tài sản, vật tư, vị trí/3D và các công cụ AI đã có kết quả kỹ thuật ở mức khác nhau; bước tiếp theo vẫn là phân công, dùng thử và nghiệm thu theo từng plan. Kế hoạch phát triển không đồng nghĩa đã nghiệm thu hoặc thay thế 1Office. Đối chiếu code/DB tại [tổng quan](README.md#đối-chiếu-plan-với-code-và-db).

## Hiện trạng đã nắm

- [x] Khảo sát tài liệu nội bộ, cẩm nang hội nhập, phân hệ/quản trị và một số luồng 1Office; lưu các export, đối chiếu và báo cáo nguồn cục bộ.
- [x] Nhận file HR final 72 người; HR/cơ cấu ERP hiện quản lý độc lập sau nhập ban đầu, không còn yêu cầu đồng bộ HR từ 1Office.
- [x] Có nền nhân sự, tài khoản, cơ cấu/head, 3D nhân sự và kiểm tra phiên/quyền; tiến độ kỹ thuật theo từng kế hoạch phân hệ.
- [x] Đồng bộ Excel ngày 05/11 từ bản Word người phụ trách tự chỉnh: kỳ lũy kế đến 05/11, bốn dữ liệu nền, sơ đồ mạng/tổng đài, thử nghiệm tìm hiểu 1Office, 27 quy trình mẫu, tài sản dự phòng, vòng lặp phát triển và kế hoạch tên miền/VPS. Excel giữ 5 sheet; đã kiểm tra trực quan và quét lỗi công thức. File tại `outputs/bao-cao-2-thang-project-20261102/`, không đưa Git.
- [x] Rút gọn sáu kế hoạch ngày 04/11; giữ quyết định hiện hành, bỏ lịch sử lặp và chuyển thiết kế workflow sang tài liệu riêng.
- [x] Điều chỉnh báo cáo theo xác nhận ngày 20/11: **chỉ phần mềm ERP**, gồm 13 phân hệ và 113 hạng mục; **chỉ Quy trình về 0% — chờ đánh giá plan**. Giữ 10 hạng mục Quy trình trong bảng dự định làm; khôi phục thanh tiến độ của 12 phân hệ còn lại theo hiện trạng kỹ thuật đã đối chiếu. Quy đổi chưa triển khai/khảo sát/thiết kế/bản thử/kiểm chứng kỹ thuật thành 0/25/50/75/100%; trung bình các phân hệ là 76%, không phải tỷ lệ nghiệm thu. Loại vận hành IT, khảo sát mạng–thiết bị và lộ trình 1Office; Công việc/ticket độc lập, làm trước báo cáo tuần. Ngày và thời hạn tiếp theo chờ chốt. Nguồn, bản trước chỉnh sửa và đầu ra tại `outputs/bao-cao-tinh-nang-tien-do-20261119/`, không đưa Git. Kiểm tra DB Quy trình không có bản ghi cần xóa; giữ cấu trúc và plan, chi tiết tại [plan Quy trình](WORKFLOW-CHECKLIST.md).
- [x] Xuất DOCX/PDF A4 ngang 17 trang; kiểm tra trực quan đủ 17 trang, thanh tiến độ, bảng và tiếng Việt. Rà 13 bảng chi tiết/113 hạng mục, Quy trình có 10 hạng mục 0%; các hạng mục thuộc 12 phân hệ khác giữ trạng thái và tỷ lệ kỹ thuật của bản báo cáo trước khi đặt lại tiến độ. Kết quả và checksum ở `outputs/bao-cao-tinh-nang-tien-do-20261119/kiem-tra-tien-do-thuc-te/validation.json`. Chỉ sửa báo cáo/tài liệu theo dõi; không thay mã ứng dụng hoặc dữ liệu DB.
- [x] Rút gọn và soát chính tả bản trình bày ngày 20/11: bỏ các đoạn định nghĩa lặp về phạm vi ERP, cách quy đổi và ngoại lệ Quy trình; giữ một chú thích ngắn trên trang đầu. Bỏ mục kiểm tra DB khỏi báo cáo quản lý, cột mốc lặp trong kế hoạch, phần mô tả mục tiêu và ghi chú giống nhau dưới từng phân hệ. Chuẩn hóa các từ Anh–Việt không cần thiết như `plan`, `dashboard`, `backup–restore`, `form`, `usage`, `nullable`, `credential`, `revision`, `audit`; sửa câu gượng nhưng không thay đổi phạm vi hoặc tiến độ. Kế hoạch tiếp theo được trình bày lại thành timeline ngang từ 11–12/2026 đến Q4/2027, có mốc bắt đầu/kết thúc và giãn thời gian theo quý; các ô thời gian chỉ giữ thanh và mốc, không lặp nhãn công việc. Lộ trình Công việc tách ba phạm vi Việc của tôi, Việc của phòng ban và Việc của tập đoàn. Các đề xuất ERP rời được thay bằng hạng mục mở rộng trong phân hệ Nhân sự: KPI từ công việc/quy trình; xin nghỉ và tổng hợp ngày công; bảng tính lương dựa trên ngày công, KPI sau khi chốt quy tắc. Các hạng mục mở rộng chưa tính vào tiến độ hiện tại. Số liệu giữ nguyên 13 phân hệ, 113 hạng mục và 76%; đã xuất lại DOCX/PDF bằng Microsoft Word và kiểm tra trực quan đủ 17 trang.
- [x] Bản Word người phụ trách tự sửa đến hết mục 3 được giữ nguyên làm nguồn; bản cập nhật riêng không ghi đè file gốc. Mục 2 bổ sung đúng ba quan hệ dữ liệu: Công việc phát sinh/Quy trình/công việc cố định → Đánh giá KPI tháng; Đơn từ/Chấm công → Ngày công → Bảng lương; KPI + Ngày công + Phụ cấp/khấu trừ → Kết quả tính lương. Từ mục 4, thay hạng mục chung về dữ liệu nhạy cảm bằng KPI, Chấm công, Đơn từ và Bảng lương, mỗi tính năng có quyền riêng; tiến độ 93% của nền Nhân sự không tính các phần mở rộng. Bản `*-NGAN-GON.docx` tiếp tục rút 110 mô tả từ mục 4 trở đi theo văn phong bảng tiến độ: câu ngắn, một ý chính; tên tính năng, trạng thái và tỷ lệ giữ nguyên. Đã đối chiếu cấu trúc, kiểm tra gói DOCX và xem trước toàn bộ nội dung bằng Quick Look; Microsoft Word không phản hồi khi xuất tự động nên chưa xác nhận lại phân trang bằng Word.
- [x] Chi tiết hóa sơ đồ quan hệ dữ liệu tại mục 2 thành ba dòng, bảy cột: tách riêng từng nguồn, dấu cộng/mũi tên, dữ liệu trung gian và kết quả. Giữ đúng ba luồng: Công việc phát sinh + Quy trình + Công việc cố định → Đánh giá KPI tháng; Đơn từ + Chấm công → Ngày công → Bảng lương; KPI tháng + Ngày công + Phụ cấp/khấu trừ → Kết quả tính lương. Mỗi ô có một mô tả ngắn về dữ liệu. Đầu ra `*-QUAN-HE-DU-LIEU-CHI-TIET.docx`; đã xuất bằng Microsoft Word và kiểm tra trực quan đủ 17 trang.
- [x] Làm lại bản báo cáo kèm ảnh theo giao diện ngày 23/11, không dùng bộ ảnh cũ. Bản `BAO-CAO-KEM-ANH-MOI-NHAT.docx` giữ nguyên 17 trang báo cáo nguồn và nối 15 ảnh: bàn làm việc/Trợ lý AI, Nhân sự, tài khoản, vai trò, hồ sơ cá nhân, tổng quan tài sản–vật tư, danh sách tài sản, vật tư, vị trí, mô hình 3D, Công việc, trình sửa tài liệu Office, quản trị hệ thống, cấu hình AI và nhật ký hoạt động. Ảnh Công việc dùng kịch bản thử nghiệm có dữ liệu và được ghi rõ trong chú thích; không đưa ảnh Quy trình và Báo cáo tuần. Đã kiểm tra cấu trúc DOCX, xuất bằng Microsoft Word và rà trực quan đủ 32 trang; ảnh, tiêu đề và chú thích không tràn trang.

Thông tin cập nhật trong báo cáo: 1Office phục vụ các quy trình của công ty; đang nghiên cứu và hỗ trợ thao tác theo 27 quy trình mẫu. Số mẫu đang xây dựng không đồng nghĩa toàn bộ đã được duyệt hoặc đang sử dụng thực tế.

## Ưu tiên tiếp theo

| Thứ tự | Công việc | Kết quả cần có |
| --- | --- | --- |
| 1 | Dùng thử nền phân quyền đã triển khai | Xác nhận người dùng, quyền thực tế và nghiệm thu; không coi trang role/server guard là chưa xây |
| 2 | Xác nhận người phụ trách phòng và đầu mối nghiệp vụ | Phân công thực tế, phạm vi quyền rõ ràng |
| 3 | Thử một workflow nhỏ | Một luồng chạy được, có lịch sử và người nghiệm thu |
| 4 | Triển khai tài sản và mở rộng 3D khi được yêu cầu | Theo plan riêng; dùng lại nền vị trí đã có, xác nhận dữ liệu và phạm vi trước triển khai |
| 5 | Mở rộng từng đợt | Có người dùng, dữ liệu, đào tạo và tiêu chí thành công |

## Việc cần chốt và chuẩn bị

- [ ] Xác định người bảo trợ/quản lý trực tiếp, đầu mối các phòng và 3 KPI đánh giá công việc.
- [ ] Xác nhận quy trình thực sự đang dùng, phiên bản hiệu lực, hệ thống/file ngoài 1Office và vấn đề người dùng gặp; không kết luận module trống là không cần.
- [ ] Phân loại từng nhu cầu: tối ưu 1Office, tích hợp hoặc xây ERP; không nhập/duyệt chính thức hai nơi cho cùng hồ sơ.
- [ ] Chốt quyền đọc HR nhạy cảm và phạm vi nghiệp vụ; hoàn thiện secret môi trường, kiểm thử quyền/khác công ty, backup–restore trước mở dùng thật.
- [ ] Chuẩn bị hồ sơ phạm vi/yêu cầu, UAT, triển khai–nghiệm thu, vận hành–bàn giao; rà soát lint và nợ kỹ thuật ngoài các phần đã kiểm thử.
- [ ] Chọn nhóm pilot, đo trước/sau, ghi lỗi/phản hồi và tiêu chí nghiệm thu/quay lui.
- [ ] Nếu phát sinh nhu cầu tích hợp: xác minh API/webhook/export và nguồn sở hữu từng dữ liệu; chưa xây đồng bộ tổng quát hoặc cho phép ghi ngược.

## Báo cáo và mốc theo dõi

Báo cáo tổng hợp tính năng/tiến độ hiện tại **chỉ tập trung phần mềm ERP**. Riêng Quy trình ở 0% và chờ người phụ trách đánh giá plan; các phân hệ khác có thanh tiến độ theo trạng thái kỹ thuật, không đồng nghĩa đã nghiệm thu. Các báo cáo công việc/thử việc trước đây có bốn nhóm phần cứng–mạng, phần mềm/DB, nghiên cứu quy trình/1Office và hỗ trợ IT là tài liệu khác; không đưa các nhóm ngoài ERP vào báo cáo tính năng này. Thẻ/CCCD và thủ tục hội nhập mặc định đã qua, không đưa vào việc chờ.

| Mốc | Nội dung đối chiếu |
| --- | --- |
| Tuần đầu | Công việc đã làm, khảo sát, bản nháp và đề xuất |
| Cuối tháng 1 | Chỉ tiêu đã thống nhất so với kết quả có minh chứng |
| Tháng 2 nếu thuộc thử việc | Tiến độ phát triển, hỗ trợ IT và kết quả dùng thử |
| Trước hết thử việc 5 ngày (T−5) | Báo cáo tổng hợp kết quả, tồn đọng và kế hoạch tiếp theo |

- [ ] Chốt ngày bắt đầu/kết thúc để quy đổi thành lịch cụ thể. Tách chỉ tiêu cam kết khỏi mục tiêu phấn đấu vượt; không bảo đảm vượt khi chưa có bằng chứng.
- [ ] Định hướng 6–12 tháng, kể cả khả năng thay phần lớn/toàn bộ 1Office, chỉ xem xét sau đánh giá nhu cầu, nguồn lực và nghiệm thu; chưa phải phạm vi được duyệt.

**Ràng buộc:** không truy cập 1Office bằng tài khoản/session cũ; phải được cấp lại và nêu phạm vi, mặc định chỉ đọc/export. Tài liệu nội bộ, ảnh, bản xuất và script tạm lưu cục bộ; Git giữ mã nguồn cùng tài liệu thiết kế/plan/rule Markdown.

Tham khảo: [Tổng quan kế hoạch](README.md) · [Bối cảnh công ty](../strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md) · [Nguồn 1Office](../1office-sources/README.md).
