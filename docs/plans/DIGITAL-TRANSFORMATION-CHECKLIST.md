# Kế hoạch số hóa và báo cáo công việc

Cập nhật: **05/11/2026**. Trọng tâm hiện tại: hoàn thiện nền SDG ERP và phân quyền; tài sản/AI tạm hoãn. Kế hoạch phát triển không đồng nghĩa đã nghiệm thu hoặc thay thế 1Office.

## Hiện trạng đã nắm

- [x] Khảo sát tài liệu nội bộ, cẩm nang hội nhập, phân hệ/quản trị và một số luồng 1Office; lưu các export, đối chiếu và báo cáo nguồn cục bộ.
- [x] Nhận file HR final 72 người; HR/cơ cấu ERP hiện quản lý độc lập sau nhập ban đầu, không còn yêu cầu đồng bộ HR từ 1Office.
- [x] Có nền nhân sự, tài khoản, cơ cấu/head, 3D nhân sự và kiểm tra phiên/quyền; tiến độ kỹ thuật theo từng kế hoạch phân hệ.
- [x] Đồng bộ Excel ngày 05/11 từ bản Word người phụ trách tự chỉnh: kỳ lũy kế đến 05/11, bốn dữ liệu nền, sơ đồ mạng/tổng đài, thử nghiệm tìm hiểu 1Office, 27 quy trình mẫu, tài sản dự phòng, vòng lặp phát triển và kế hoạch tên miền/VPS. Excel giữ 5 sheet; đã kiểm tra trực quan và quét lỗi công thức. File tại `outputs/bao-cao-2-thang-project-20261102/`, không đưa Git.
- [x] Rút gọn sáu kế hoạch ngày 04/11; giữ quyết định hiện hành, bỏ lịch sử lặp và chuyển thiết kế workflow sang tài liệu riêng.

Thông tin cập nhật trong báo cáo: 1Office phục vụ các quy trình của công ty; đang nghiên cứu và hỗ trợ thao tác theo 27 quy trình mẫu. Số mẫu đang xây dựng không đồng nghĩa toàn bộ đã được duyệt hoặc đang sử dụng thực tế.

## Ưu tiên tiếp theo

| Thứ tự | Công việc | Kết quả cần có |
| --- | --- | --- |
| 1 | Hoàn thiện phân quyền ERP | Trang role, quyền thực thi ở server, kiểm thử thu hồi quyền |
| 2 | Xác nhận người phụ trách phòng và đầu mối nghiệp vụ | Phân công thực tế, phạm vi quyền rõ ràng |
| 3 | Thử một workflow nhỏ | Một luồng chạy được, có lịch sử và người nghiệm thu |
| 4 | Đánh giá lại nhu cầu tài sản/3D và AI | Chỉ khởi động lại phân hệ được duyệt |
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

Báo cáo tập trung bốn nhóm: **phần cứng–mạng; phát triển phần mềm/DB; nghiên cứu quy trình/1Office; hỗ trợ IT**. Thẻ/CCCD và thủ tục hội nhập mặc định đã qua, không đưa vào việc chờ.

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
