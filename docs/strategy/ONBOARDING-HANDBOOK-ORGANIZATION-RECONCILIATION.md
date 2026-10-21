# Đối chiếu cẩm nang hội nhập với cơ cấu và định hướng SDG ERP

**Ngày rà soát:** 21/10/2026  
**Nguồn:** `docs/SDGSources/Cẩm_nang_Hội_nhập_Tập_đoàn_Sao_Đỏ.pptx` (tên được hiển thị theo Unicode chuẩn)  
**Quy mô:** 21 trang, mỗi trang là một ảnh toàn trang  
**SHA-256:** `f48c85af992d9b1bc99a3cce58a5e55584e2168f98a2ade179e8582673c73b81`

## 1. Cách sử dụng nguồn

Cẩm nang là nguồn nội bộ có giá trị để hiểu cách công ty giới thiệu cơ cấu, chức năng phòng ban và quy tắc làm việc cho nhân sự mới. File không có lớp văn bản; nội dung dưới đây được đọc trực quan từ 21 ảnh trong bản trình chiếu.

Thời gian của các mục trong gói PPTX là 15/10/2026, nhưng metadata lõi mang ngày mẫu cũ và trang bìa vẫn còn ô ngày chưa điền. Vì vậy, ngày 15/10 chỉ là dấu hiệu kỹ thuật về lần đóng gói file, không được coi là ngày ban hành hoặc ngày hiệu lực. Cẩm nang cần HCNS xác nhận phiên bản trước khi dùng làm căn cứ chính sách.

Thứ tự ưu tiên hiện tại:

1. Snapshot/export 1Office ngày 21/10/2026 là chuẩn vận hành cho ID và cây đơn vị đang dùng trong SDG ERP.
2. Cẩm nang bổ sung ngữ nghĩa về tầng quản trị, chức năng đơn vị, đầu mối phối hợp và hành vi làm việc.
3. Quy trình/quy chế đã ban hành là căn cứ chi tiết cho thẩm quyền và luồng phê duyệt; khi có khác biệt phải chuyển chủ nghiệp vụ xác nhận.

Cẩm nang không tự động ghi đè dữ liệu 1Office hoặc tạo thay đổi schema.

## 2. Cơ cấu và chức năng được mô tả

### 2.1 Trục quản trị và điều hành

Trang 7 mô tả chuỗi điều hành:

`Đại hội đồng cổ đông → Hội đồng quản trị / Ban Kiểm soát → Tổng Giám đốc → Phó Tổng Giám đốc → Khối phòng ban và BQLDA`

Các đầu mối được nêu trong tài liệu:

| Vai trò | Nhân sự | Trọng tâm |
| :--- | :--- | :--- |
| Chủ tịch HĐQT | TS. Trần Văn Thắng | Hoạch định chiến lược vĩ mô |
| Tổng Giám đốc | Ông Nguyễn Thành Phương | Điều hành toàn diện trực tiếp |
| Phó Tổng Giám đốc | Bà Trần Thị Tố Loan | Chỉ đạo trực tiếp các khối nghiệp vụ |

Sơ đồ này cho thấy `Ban Kiểm soát` là một chủ thể quản trị cùng tầng với HĐQT trong cách diễn đạt của cẩm nang. Mô hình `Department` hiện tại chỉ phản ánh cây đơn vị vận hành nên chưa diễn đạt rõ khác biệt giữa cơ quan quản trị, đầu mối điều hành và phòng/ban nghiệp vụ.

### 2.2 Sáu khối phòng ban tại văn phòng Tập đoàn

| Đơn vị | Chức năng chính trong cẩm nang |
| :--- | :--- |
| Hành chính - Nhân sự | Nguồn nhân lực, phúc lợi, hành chính văn phòng và điều phối hỗ trợ IT |
| Tài chính - Kế toán | Dòng tiền, kế toán doanh nghiệp, chứng từ và điều khoản thanh toán |
| Kinh doanh | Chăm sóc khách hàng, xúc tiến thương mại và hợp đồng kinh tế |
| Kế hoạch - Đầu tư | Kế hoạch tổng thể, hồ sơ kỹ thuật/đầu tư và phối hợp dự án mới |
| Phát triển Dự án | Cơ hội thị trường, quỹ đất và mở rộng quy mô dự án |
| Ban Pháp chế | Rà soát pháp lý, hợp đồng, tư vấn nội bộ và rủi ro tuân thủ |

### 2.3 Khối Ban Quản lý Dự án

Trang 9 đặt `Ban Giám đốc QLDA` ở trung tâm chỉ đạo sáu bộ phận:

| Bộ phận | Chức năng chính trong cẩm nang |
| :--- | :--- |
| Văn phòng | Hành chính công trường và lái xe |
| Kỹ thuật | Giám sát kỹ thuật và trắc địa |
| Giao nhận | Quản lý luân chuyển vật tư |
| Môi trường | Cảnh quan và xử lý môi trường dự án |
| PCCC | An toàn phòng cháy chữa cháy |
| Điện nước | Vận hành hạ tầng điện và cấp thoát nước |

Snapshot 1Office lại thể hiện `Ban giám đốc KCN NAM ĐÌNH VŨ 1` và sáu bộ phận như bảy đơn vị con trực tiếp của `BAN QLDA KCN NAM ĐÌNH VŨ 1`. Đây có thể chỉ là khác biệt giữa sơ đồ chỉ đạo và cây hành chính, không đủ căn cứ để sửa parent ID. HCNS hoặc lãnh đạo BQLDA cần xác nhận:

- Ban Giám đốc là một đơn vị tổ chức hay một nút quản lý;
- sáu bộ phận báo cáo trực tiếp cho Ban QLDA hay cho Ban Giám đốc;
- hệ thống cần một cây hành chính, một quan hệ báo cáo, hay cả hai.

## 3. Dữ liệu nền mới cần chú ý

Trang 10 cho biết đầu mối xử lý phụ thuộc loại yêu cầu:

| Nhu cầu | Đầu mối được hướng dẫn |
| :--- | :--- |
| Công việc, ưu tiên, đánh giá | Quản lý trực tiếp/trưởng đơn vị |
| Lương, nghỉ phép, hợp đồng lao động, hồ sơ cá nhân, lỗi IT | Trưởng phòng HCNS |
| Tạm ứng, thanh toán, chứng từ | Trưởng phòng TCKT |
| Hợp đồng, cam kết, vấn đề pháp lý | Trưởng Ban Pháp chế qua đơn vị đầu mối |
| Dự án, hạ tầng, kỹ thuật hiện trường | Giám đốc BQLDA/trưởng bộ phận phụ trách |

Do đó, chỉ lưu `employee → department` là chưa đủ. Master data mục tiêu nên có:

- quản lý trực tiếp theo quan hệ làm việc và thời gian hiệu lực;
- trưởng/phụ trách đơn vị;
- vị trí/chức danh tách khỏi role ứng dụng;
- đơn vị chính và kiêm nhiệm;
- danh mục tuyến liên hệ/chuyển cấp theo loại yêu cầu;
- loại đơn vị như cơ quan quản trị, điều hành, phòng/ban, BQLDA và bộ phận.

Các trường trên là đề xuất mô hình, chưa được duyệt triển khai.

## 4. Ranh giới tính năng 1Office và SDG ERP

Trang 15 xác nhận nghỉ phép được thực hiện hoàn toàn trên 1Office: lập đơn, bàn giao công việc, HCNS kiểm tra phép, trình duyệt và thông báo kết quả. SDG ERP không nên dựng một luồng nghỉ phép cạnh tranh. Nếu có nhu cầu, ERP chỉ nên deep-link, lưu mã tham chiếu hoặc tổng hợp báo cáo qua tích hợp chính thức.

Trang 16–17 mô tả đánh giá thử việc và vòng đời giao việc. Đây là bằng chứng để ưu tiên tối ưu luồng sẵn có trên 1Office trước khi xây module tương tự. SDG ERP có thể bổ sung dữ liệu chuyên sâu như tài sản, vị trí 3D, hạ tầng/GIS và liên kết ngược tới công việc/quy trình 1Office.

Trang 19–20 tạo một nhu cầu phù hợp để số hóa nhẹ: checklist hội nhập theo mốc ngày đầu, tuần đầu, tháng đầu và trước khi hết thử việc. Checklist có thể tổng hợp trạng thái từ nhiều hệ thống nhưng không thay thế quy trình nhân sự chính thức.

## 5. Quy tắc bảo mật và sử dụng AI

Trang 18 đưa ra các yêu cầu cụ thể:

- không mở liên kết/tệp đính kèm không rõ nguồn và không cung cấp mật khẩu nội bộ;
- khóa màn hình khi rời máy và cảnh giác yêu cầu giả mạo lãnh đạo;
- báo sự cố cho HCNS/IT;
- có thể dùng AI cho ý tưởng, dịch và tóm tắt;
- không đưa dữ liệu tài chính, hợp đồng, khách hàng, bản vẽ KCN Nam Đình Vũ hoặc bí mật kinh doanh chưa công bố lên AI công cộng;
- dữ liệu đưa vào AI phải được ẩn danh đầy đủ.

Bối cảnh “công ty linh hoạt, yêu cầu bảo mật không cao” chỉ phù hợp để tránh làm quá nặng quy trình quản lý tài sản. Nó không loại bỏ các quy tắc bảo mật và phân loại dữ liệu đã nêu trong cẩm nang. SDG ERP phải tuân thủ các quy tắc này khi thiết kế export, log, AI và quyền xem dữ liệu.

## 6. Các thông tin vận hành khác

- Văn phòng làm việc 07:30–11:30 và 13:00–17:00, từ thứ Hai đến sáng thứ Bảy; BQLDA/công trường làm từ thứ Hai đến hết thứ Bảy.
- Người mới cần nhận thiết bị, tài khoản 1Office/email, đổi mật khẩu, cung cấp thông tin tài khoản BIDV cho HCNS và thống nhất ba mục tiêu/KPI chính với quản lý trực tiếp trong tuần đầu.
- Báo cáo thử việc phải hoàn thành chậm nhất năm ngày trước khi hết thử việc.
- Nhân sự làm việc hiện trường phải tuân thủ trang bị bảo hộ.

Các nội dung về giờ làm, phép, lương và hồ sơ là thông tin hướng dẫn trong cẩm nang; cần đối chiếu quy chế có hiệu lực trước khi mã hóa thành validation hoặc tự động hóa.

## 7. Việc cần xác nhận

1. HCNS xác nhận phiên bản, ngày hiệu lực và người phê duyệt cẩm nang.
2. HCNS/BQLDA xác nhận quan hệ giữa Ban Giám đốc QLDA và sáu bộ phận.
3. Lãnh đạo/HCNS xác nhận cách mô hình hóa Ban Kiểm soát và Ban Lãnh đạo trong danh mục tổ chức.
4. HCNS cung cấp quản lý trực tiếp, trưởng đơn vị, phân công chính/kiêm nhiệm và thời gian hiệu lực trong bản chốt.
5. IT/HCNS xác nhận kênh báo sự cố và phạm vi dữ liệu được phép dùng với công cụ AI.

