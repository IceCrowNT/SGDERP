# Bối cảnh hiện tại và định hướng số hóa Sao Đỏ Group

**Trạng thái:** Bản đánh giá ban đầu  
**Ngày chốt quan sát:** 21/10/2026  
**Người thực hiện:** Nhân viên IT mới, ngày làm việc thứ 3  
**Phạm vi:** Tài liệu nội bộ, dữ liệu xuất nhân sự, hệ thống 1Office và mã nguồn SDG ERP hiện tại

### Ràng buộc làm việc được xác nhận

- Không truy cập 1Office bằng thông tin đăng nhập từ lịch sử hội thoại hoặc lần khảo sát trước. Khi cần khảo sát lại, người phụ trách sẽ cấp lại tài khoản cho đúng lần sử dụng.
- Tài khoản được cấp chỉ dùng để xem và export trong phạm vi được yêu cầu. Không tạo, sửa, duyệt, xóa, đổi quyền, đổi mật khẩu hoặc thay cấu hình 1Office.
- Không lưu credential 1Office trong repository, tài liệu, script, log hoặc file môi trường. Sau mỗi lần sử dụng, Agent phải coi credential đã bị thu hồi khỏi phạm vi sử dụng.
- Mọi tính năng SDG ERP hiện tại là bản nháp/prototype. Có thể đề xuất sửa lớn hoặc xây lại toàn bộ nếu có căn cứ; chỉ triển khai sau khi báo cáo được người phụ trách cân nhắc và giao việc rõ ràng.

## 1. Kết luận điều hành

Sao Đỏ Group đã có một nền tảng số đang vận hành thực tế. 1Office hiện không chỉ là phần mềm danh bạ nhân sự mà đã trở thành nơi giao việc, quản lý dự án, chạy quy trình, ký số, lập lịch và lưu lại lịch sử xử lý. Vì vậy, bài toán trước mắt không phải là thay thế 1Office bằng một ERP mới.

Phương án phù hợp là mô hình **đồng tồn tại có phân vai**:

- **1Office tiếp tục là hệ thống làm việc và luân chuyển quy trình** trong giai đoạn hiện tại.
- **1Office là nguồn chuẩn cho hồ sơ nhân sự và cơ cấu tổ chức**. SDG ERP nhận dữ liệu nền này qua export/API, lưu external ID và mapping để phục vụ các nghiệp vụ riêng; không tự tạo một bản cơ cấu cạnh tranh với 1Office.
- **SDG ERP quản lý các nghiệp vụ đặc thù mà 1Office chưa đáp ứng sâu**, trước hết là phân quyền nội bộ của chính ERP, bản đồ không gian 3D, tài sản gắn vị trí và các bài toán vận hành chuyên sâu của Ban QLDA/KCN.
- **Lớp tích hợp và báo cáo hợp nhất** được xây dựng sau khi xác định rõ API, chủ sở hữu dữ liệu và quy tắc đồng bộ.

**Định hướng làm việc được ghi nhận ngày 21/10/2026:** người phụ trách IT sẽ tiếp tục nghiên cứu sâu 1Office để tối ưu các tính năng công ty đã có, giảm cấu hình trùng và tăng mức khai thác trước khi đề xuất xây mới. SDG ERP tập trung phát triển các năng lực 1Office không chuyên sâu, đặc biệt là dữ liệu chuẩn, tích hợp, phân tích liên hệ thống, không gian 3D, GIS và vận hành hạ tầng KCN.

SDG ERP hiện là một prototype có giá trị để khám phá nhu cầu, nhưng chưa đủ điều kiện tiếp nhận vai trò hệ thống chính thức. Các chức năng, schema, giao diện và luồng hiện có không phải ràng buộc phải bảo tồn; có thể thiết kế lại nếu phân tích chứng minh phương án mới phù hợp hơn. Một số vấn đề bảo mật, phân quyền, dữ liệu nguồn và kiểm thử phải được xử lý trước khi đưa dữ liệu thật hoặc người dùng diện rộng vào hệ thống.

## 2. Vị thế hiện tại của người phụ trách IT

Người thực hiện mới làm việc ngày thứ 3 và được giao nhiệm vụ số hóa. Ở thời điểm này, lợi thế lớn nhất là có khả năng quan sát hệ thống với góc nhìn mới; hạn chế lớn nhất là chưa có đủ tri thức ngầm về cơ cấu tổ chức, quyền phê duyệt và các ngoại lệ nghiệp vụ.

Khối lượng thông tin được bàn giao ban đầu không nhiều. Phần lớn hiện trạng, dữ liệu, cách dùng phần mềm và quan hệ giữa các quy trình sẽ phải được người phụ trách tự tìm kiếm, khảo sát và kiểm chứng dần. Vì vậy, mọi tài liệu phân tích phải phân biệt rõ dữ liệu quan sát được, giả thuyết đang kiểm tra và quyết định đã được người có thẩm quyền xác nhận; không coi suy luận kỹ thuật là quy định nội bộ của công ty.

Vai trò phù hợp trong 30 ngày đầu là:

1. **Người lập bản đồ hiện trạng:** xác định hệ thống, dữ liệu, quy trình, đầu mối và vấn đề đang tồn tại.
2. **Người điều phối chuẩn hóa:** giúp các phòng ban chốt dữ liệu và trách nhiệm, không tự quyết định thay nghiệp vụ.
3. **Người bảo vệ tính toàn vẹn:** chưa di chuyển, ghi đè hoặc loại bỏ dữ liệu trước khi có bản chốt và phương án khôi phục.
4. **Người xây dựng thử nghiệm có kiểm soát:** chỉ triển khai pilot nhỏ, đo được hiệu quả và có thể quay lại trạng thái cũ.
5. **Người tối ưu nền tảng hiện hữu:** hiểu sâu cấu hình, quyền, dữ liệu và giới hạn của 1Office trước khi xác định phần việc của SDG ERP.

Không nên để một nhân viên IT mới trở thành người tự xác định cơ cấu, thẩm quyền hoặc nội dung quy trình. Những nội dung này phải có người sở hữu nghiệp vụ xác nhận.

## 3. Bối cảnh doanh nghiệp được ghi nhận

Theo tài liệu kiến trúc và dữ liệu hiện có, SDG ERP phục vụ Tập đoàn Sao Đỏ và khối Ban QLDA KCN Nam Đình Vũ 1. Dữ liệu xuất hiện có 67 hồ sơ nhân sự, được tổ chức theo các phòng/ban cấp Tập đoàn và các bộ phận trực thuộc Ban QLDA, Phòng Kinh doanh.

### 3.1 Bối cảnh quản lý tài sản

Sao Đỏ hiện chưa có quy chế, biểu mẫu danh mục hoặc bộ khung thống nhất để quản lý tài sản. Hoạt động của công ty tương đối linh hoạt, không đặt áp lực kiểm soát tài sản quá cao và chưa cần một quy trình kiểm kê, bảo mật hay phê duyệt nhiều tầng.

**Bổ sung từ người phụ trách:** các phòng ban tự quản lý license và tài sản nếu phòng ban tự đề xuất mua. Người phụ trách IT trực thuộc phòng HCNS; không mặc định IT/HCNS chịu trách nhiệm quản lý mọi tài sản của toàn công ty. Đơn vị chịu trách nhiệm quản lý có thể khác đơn vị/người đang sử dụng tài sản.

Hai phương án người phụ trách đang cân nhắc là cho các phòng tự tạo và quản lý tài sản trong phạm vi phòng mình, hoặc giới hạn tính năng cho HCNS/một số người được chỉ định. Yêu cầu giao diện là menu chỉ xuất hiện với người có quyền phù hợp. Đây là đầu vào thiết kế; chưa chốt phương án phân quyền hoặc giao triển khai. Chi tiết đánh giá tại mục 4.5 của [thiết kế Master Data và RBAC](./MASTER-DATA-AND-RBAC-SYNCHRONIZATION.md).

Các câu hỏi vận hành cần đáp ứng:

1. Công ty đang có bao nhiêu tài sản theo từng nhóm và số lượng có đủ dùng hay không?
2. Tài sản quan trọng đang ở phòng/khu vực nào và ai hoặc bộ phận nào đang sử dụng, khi thông tin này thực sự cần thiết?
3. Thiết bị đang hoạt động, đang hỏng, đang sửa hay đã ngừng sử dụng?
4. Khi hỏng, sự cố đã được báo chưa, ai xử lý và kết quả sửa chữa là gì?

Không đưa các bài toán chống mất trộm, điều tra thất thoát, kiểm kê bắt buộc nghiêm ngặt, khấu hao kế toán, phê duyệt nhiều cấp hoặc bảo mật chuyên biệt cho tài sản vào phạm vi MVP. Hệ thống vẫn áp dụng đăng nhập, phân quyền và cô lập dữ liệu công ty ở mức nền tảng chung. Các biện pháp quản lý sâu hơn chỉ được bổ sung khi hoạt động thực tế chứng minh có nhu cầu.

Ảnh BMHC 0501 được cung cấp chỉ là dữ liệu tạm để tham khảo cấu trúc nhóm và số lượng ban đầu, không phải chứng từ nguồn cần hoàn thiện hoặc căn cứ chốt kho. Dữ liệu seed từ ảnh phải luôn giữ trạng thái `DRAFT` và có thể được thay thế khi kiểm kê thực tế.

Sau khi tính năng sẵn sàng, mục tiêu là bổ sung và quản lý **từng tài sản riêng biệt**. Mỗi tài sản cần có mã nội bộ, loại, tình trạng và vị trí/người sử dụng khi phù hợp; serial, QR, thông số mạng và dữ liệu mở rộng được bổ sung dần. Số lượng tổng hợp chỉ phục vụ giai đoạn tham khảo và đối soát, không phải mô hình quản lý cuối cùng.

Hoạt động nghiệp vụ thể hiện trong bộ tài liệu gồm:

- Hành chính và nhân sự: tuyển dụng, đào tạo, nghỉ phép/nghỉ việc, công văn, tài liệu, con dấu, xe ô tô, văn phòng phẩm, tòa nhà, lễ tân và phối hợp liên phòng.
- Tài chính và kế toán: tạm ứng, hoàn ứng, thanh toán, lưu trữ hồ sơ và các quy chế tài chính.
- Pháp chế: phổ biến pháp luật; soạn thảo, thẩm định và quản lý hợp đồng.
- Kinh doanh và chăm sóc khách hàng: chăm sóc nhà đầu tư/khách hàng, phát ngôn và cung cấp thông tin.
- Ban QLDA/KCN: điện, cấp thoát nước, đường hè, cây xanh, quan trắc, tuần tra hạ tầng, PCCC, giao nhận, an ninh, bàn giao đất, giám sát thi công và quản lý khách hàng.

Các quy trình cho thấy trách nhiệm không thể suy ra chỉ từ chức vụ. Một hồ sơ có thể đi qua phòng chuyên môn, pháp chế, tài chính–kế toán, Tổng giám đốc và Chủ tịch HĐQT; một bước có thể là thực hiện, tham vấn, thẩm định, ký nháy hoặc phê duyệt. Vì vậy, dữ liệu thẩm quyền phải được quản lý riêng với dữ liệu chức danh.

Nguồn tham chiếu chính:

- [Kiến trúc SDG ERP](../ARCHITECTURE.md)
- [Kế hoạch HR và các phát hiện rà soát](../plans/HR-CHECKLIST.md)
- [Bộ quy trình nội bộ](../SDGSources/)
- [Dữ liệu nhân sự xuất từ phần mềm](../HR_danhsachnhanvien/67-ban-ghi-Ho-so-nhan-su-ngay-14102026.xlsx)
- [Mô hình dữ liệu quản trị và định hướng tích hợp 1Office](./1OFFICE-ADMIN-DATA-MODEL-AND-INTEGRATION.md)
- [Thiết kế đồng bộ Master Data và phân quyền SDG ERP–1Office](./MASTER-DATA-AND-RBAC-SYNCHRONIZATION.md)
- [Đối chiếu cẩm nang hội nhập với cơ cấu và định hướng SDG ERP](./ONBOARDING-HANDBOOK-ORGANIZATION-RECONCILIATION.md)
- [Manifest nguồn xuất quản trị 1Office](../1office-sources/README.md)

### 3.2 Bổ sung từ cẩm nang hội nhập

Cẩm nang hội nhập 21 trang được bổ sung vào bộ tài liệu ngày 21/10/2026. Tài liệu mô tả trục ĐHĐCĐ–HĐQT/BKS–Tổng Giám đốc–Phó Tổng Giám đốc–khối phòng ban/BQLDA, chức năng sáu khối văn phòng, sáu bộ phận hiện trường và các đầu mối phối hợp. Đây là nguồn tốt để bổ sung **ngữ nghĩa tổ chức**, nhưng chưa thay snapshot 1Office ngày 21/10/2026 làm nguồn ID và cây đơn vị đang vận hành.

Hai nội dung cần xác nhận trước khi sửa master data là vị trí của Ban Kiểm soát trong mô hình quản trị và quan hệ giữa Ban Giám đốc QLDA với sáu bộ phận. Cẩm nang biểu diễn quan hệ chỉ đạo, còn 1Office biểu diễn cây đơn vị hành chính; hai quan hệ có thể cùng đúng nhưng phục vụ mục đích khác nhau.

Cẩm nang cũng xác nhận nghỉ phép đã được số hóa trên 1Office và quy định không đưa dữ liệu tài chính, hợp đồng, khách hàng, bản vẽ KCN hoặc bí mật kinh doanh chưa công bố lên AI công cộng. Do đó, nhận định công ty có yêu cầu bảo mật không cao chỉ được dùng để giữ quy trình tài sản ở mức gọn; không được suy rộng thành bỏ qua kiểm soát dữ liệu của toàn hệ thống.

## 4. Hiện trạng sử dụng 1Office

### 4.1 Phạm vi khảo sát

Khảo sát được thực hiện trên giao diện 1Office bằng tài khoản quản trị do người phụ trách cung cấp. Đợt khảo sát ban đầu chỉ mở trang, đọc DOM và gọi các API truy vấn. Đợt khảo sát trang quản trị tiếp theo dùng thêm chức năng Export có sẵn theo ủy quyền của người phụ trách; thao tác này tạo lịch sử export và thông báo tải xuống trên 1Office, nhưng không tạo, sửa, duyệt hoặc xóa dữ liệu nghiệp vụ.

Các số liệu dưới đây là ảnh chụp trạng thái trên màn hình mặc định tại ngày 21/10/2026. Chúng phản ánh bộ lọc và quyền của tài khoản khảo sát, chưa thay thế báo cáo xuất chính thức hoặc xác nhận của chủ sở hữu nghiệp vụ.

### 4.2 Những phân hệ đang được sử dụng rõ ràng

| Phân hệ | Dấu hiệu sử dụng quan sát được | Đánh giá ban đầu |
| :--- | :--- | :--- |
| Công việc | 867 công việc hiển thị; 469 đang thực hiện, 355 hoàn thành | Đã có lịch sử vận hành đáng kể |
| Dự án | 11 dự án; 9 đang thực hiện, 1 hoàn thành, 1 đã hủy | Được dùng cho kế hoạch năm và một số dự án/khách hàng |
| Quy trình | Khoảng 6.060 bản ghi ở màn hình tổng; 744 công việc cấp 0 | Là lõi vận hành hiện tại |
| Tự động hóa quy trình | 34 quy trình; có nhóm HCNS, QLDA, pháp chế, KHĐT, CSKH | Đã cấu hình nhiều quy trình theo nghiệp vụ thật |
| Ký số | 242 hồ sơ ký số | Được tích hợp trực tiếp với luồng quy trình |
| Lịch biểu | Có lịch họp, xe, sự kiện, sinh nhật và công việc đối ngoại | Có sử dụng thực tế |
| Báo cáo | 3 báo cáo đã lưu về tình trạng hoàn thành công việc | Có nhu cầu báo cáo nhưng mức khai thác còn hẹp |
| Hỗ trợ 1Office | 18 ticket đã đóng | Có lịch sử vấn đề và yêu cầu cải tiến hữu ích cho việc thiết kế hệ thống |

Các quy trình có số lượt chạy cao gồm:

- Gửi chuyển phát nhanh: 328 lượt.
- Soạn thảo, thẩm định và quản lý hợp đồng: 184 lượt.
- Nghỉ phép phó phòng và nhân viên: 174 lượt.
- Trình ký đề xuất và phối hợp triển khai: 148 lượt.
- Gọi xe taxi: 56 lượt.
- Đặt hoa/quà tiếp khách: 49 lượt.
- Xử lý công văn đến: 42 lượt.
- Luân chuyển hồ sơ nhà thầu: 16 lượt.

Điều này chứng minh công ty đã số hóa một phần đáng kể các quy trình nội bộ. Việc viết lại ngay các luồng trên trong SDG ERP sẽ tạo hai nguồn công việc, tăng chi phí chuyển đổi và gây khó cho người dùng.

### 4.2.1 Kết quả khảo sát trang quản trị

Trang quản trị bổ sung các bằng chứng quan trọng:

- 19 nút cơ cấu gồm cả công ty gốc; các trường mã, khối nghiệp vụ và loại phòng ban gần như chưa được khai thác.
- 56 tài khoản hoạt động, 11 tài khoản khóa, 1 hồ sơ chưa kích hoạt và 84 bản ghi xác thực thiết bị.
- 11 nhóm quyền; nhóm Nhân viên và Quản lý đều có quyền xem tất cả hồ sơ nhân sự, trong khi hai nhóm HR chuyên trách không có thành viên.
- 34 mẫu quy trình gồm 28 hoạt động và 6 tạm dừng; ít nhất 1.111 lượt chạy được ghi nhận ở các mẫu có số liệu.
- Quy trình HCNS01 đã tới phiên bản 68.0 và PC01 tới phiên bản 44.0, chứng minh thiết kế đang tiến hóa liên tục và phiên bản phải là dữ liệu tích hợp bắt buộc.
- Cấu trúc quy trình có nhánh điều kiện, vòng sửa lại, bước song song, xác nhận, ký nháy và ký số. Quyền thực hiện không thể suy ra từ chức danh đơn giản.

### 4.2.2 Diễn giải 11 tài khoản khóa và hồ sơ mã 71

Đối chiếu hiện tại đang mô tả **67 con người**, không phải 67 tài khoản đang hoạt động:

- 55 người có tài khoản 1Office đang hoạt động.
- 11 người có hồ sơ nhân sự và có tài khoản 1Office nhưng tài khoản đang ở trạng thái khóa.
- 1 người là Vũ Văn Khoa, mã nhân sự 71, có trong hồ sơ nhân sự nhưng chưa tìm thấy tài khoản 1Office.
- Tài khoản hệ thống `admin` làm tổng số tài khoản hoạt động trên màn hình thành 56, nhưng không được tính là nhân sự.

Cả 11 tài khoản khóa vẫn xuất hiện trong nhóm “Nhân viên”; theo export, 5 thuộc Bộ phận giao nhận, 4 thuộc Bộ phận điện nước, 1 thuộc PCCC và 1 thuộc HCNS. Chỉ 1/11 có dữ liệu đăng nhập lần cuối; không tài khoản nào trong nhóm này còn email hoặc chữ ký số trong export. Đây là dấu hiệu cần tìm hiểu thêm, chưa đủ để kết luận nguyên nhân khóa.

Trạng thái **khóa tài khoản** chỉ cho biết người đó hiện không đăng nhập bằng tài khoản ấy; nó chưa cho biết người đó đang làm việc, nghỉ việc, tạm nghỉ, chuyển vị trí hay chỉ bị khóa vì lý do kỹ thuật. Tương tự, hồ sơ mã 71 chưa có tài khoản có thể là người chưa cần dùng hệ thống, đang chờ cấp tài khoản hoặc một ngoại lệ dữ liệu. Do thông tin bàn giao chưa đủ, SDG ERP phải giữ riêng ba khái niệm `Person`, `Employment` và `Account`; không tự xóa hồ sơ, suy trạng thái nghỉ việc, mở khóa hoặc tạo tài khoản mới từ các dấu hiệu này.

Bốn export chính thức của màn hình quản trị đã được tải vào project, đọc toàn bộ workbook và lập checksum. Chi tiết nguồn, độ đầy đủ dữ liệu, rủi ro quyền và thiết kế tích hợp nằm trong [manifest nguồn](../1office-sources/README.md) và [báo cáo quản trị 1Office](./1OFFICE-ADMIN-DATA-MODEL-AND-INTEGRATION.md).

### 4.3 Những phân hệ đã có nhưng chưa thấy dữ liệu đáng kể

Trên màn hình mặc định của tài khoản khảo sát:

| Phân hệ | Trạng thái hiển thị |
| :--- | :--- |
| Tài liệu công ty | 0 tệp, 0 byte |
| Văn bản đến | 0 bản ghi |
| Tài sản | 0 bản ghi |
| Đơn từ | 0 bản ghi; đơn nghỉ phép đang được xử lý qua Quy trình |
| Tuyển dụng | 0 ứng viên |
| Đánh giá | 0 phiếu |
| Đào tạo | 0 khóa |
| Bảng lương | 0 bảng |
| KPI | 0 kỳ đánh giá |
| OKR | Không tìm thấy mục tiêu |
| Tài chính | 0 phiếu thu trên màn hình mặc định |
| Mua hàng | 0 đề xuất vật tư |
| Tài sản/kho hàng | Không thấy dữ liệu danh sách |
| Open API | 0 cấu hình API |
| CRM | 1 liên hệ trên màn hình mặc định |

“Không thấy dữ liệu” chưa đồng nghĩa công ty không sử dụng nghiệp vụ đó. Có thể nghiệp vụ được thực hiện ở phân hệ khác, phần mềm khác, file Excel, sổ giấy hoặc tài khoản khảo sát chưa ở đúng bộ lọc. Mỗi mục cần được xác nhận với phòng ban trước khi quyết định cấu hình 1Office hay xây mới.

### 4.4 Những vấn đề được phản ánh qua lịch sử hỗ trợ

Các ticket cho thấy một số khó khăn lặp lại:

- File Word có thể thay đổi khổ giấy khi chuyển đổi để ký số.
- Preview Excel có thể không tính đúng công thức.
- Xuất PDF từ biểu mẫu quy trình từng phát sinh lỗi.
- Gantt trên ứng dụng di động chưa đáp ứng nhu cầu.
- Việc thống kê công việc con quá hạn trong quy trình chưa thuận tiện.
- Cách hiển thị bước quy trình trên điện thoại còn hạn chế.
- Người dùng cần mã QR nhân sự và chức năng quét QR thuận tiện hơn.
- Có nhu cầu phục hồi hồ sơ nhân sự bị xóa nhầm.
- Luồng nhiều người thực hiện và quyền xem dữ liệu ở bước duyệt cần cấu hình cẩn thận.

Các ticket này nên được xem là backlog nghiệp vụ và bằng chứng về khoảng trống trải nghiệm, thay vì mặc định phải xây lại toàn bộ nền tảng.

## 5. Hiện trạng SDG ERP

### 5.1 Phần đã có

SDG ERP hiện là Next.js monolith dùng PostgreSQL/Prisma, bao gồm:

- Đăng nhập bằng JWT cookie.
- Hồ sơ nhân sự, phòng ban dạng cây và vai trò.
- Nhật ký hoạt động.
- Giao diện danh bạ, cơ cấu tổ chức.
- Mô hình tòa nhà 3D liên kết phòng ban và nhân sự.

Đây là nền tảng tốt để thử nghiệm các nghiệp vụ đặc thù và làm rõ yêu cầu. Tuy nhiên, dữ liệu nhân sự đang dùng là bản xuất từ phần mềm, chưa phải bản final được HCNS xác nhận.

### 5.2 Điều kiện phải hoàn thành trước khi dùng thật

Các vấn đề đã được phát hiện trong rà soát mã nguồn:

- DTO nhân sự có nguy cơ trả về trường password hash và đưa vào snapshot audit.
- Trang nhật ký và một số truy vấn chưa kiểm tra đầy đủ quyền và phạm vi công ty.
- Phiên đăng nhập cũ chưa được vô hiệu hóa ngay khi tài khoản bị khóa, đổi mật khẩu hoặc thay quyền.
- Seed có thể đặt lại mật khẩu của tài khoản đã tồn tại.
- SESSION_SECRET/JWT_SECRET chưa thống nhất và đang có secret dự phòng trong mã.
- Helper phạm vi phòng ban đã có nhưng chưa được áp dụng nhất quán.
- Checklist mô tả một số tính năng hoàn thiện hơn hành vi mã nguồn thực tế.

Do đó, SDG ERP chưa nên mở ra Internet, nhập dữ liệu nhạy cảm hoặc cấp tài khoản thật trước khi hoàn thành đợt hardening và kiểm thử phân quyền.

## 6. Kiến trúc mục tiêu đề xuất

### 6.1 Phân vai hệ thống

| Nhóm năng lực | Hệ thống đề xuất | Lý do |
| :--- | :--- | :--- |
| Công việc, dự án, quy trình, ký số, lịch | Giữ ở 1Office | Đã có dữ liệu, người dùng và lịch sử vận hành |
| Hồ sơ nhân sự chính thức | Tạm giữ 1Office làm nguồn; chỉ đồng bộ sau khi HCNS chốt | Tránh hai bản nhân sự khác nhau |
| Cơ cấu, vị trí, tuyến quản lý, thẩm quyền | Danh mục chuẩn do HCNS và lãnh đạo xác nhận; có thể quản trị tại SDG ERP sau giai đoạn pilot | Đây là dữ liệu nền cho mọi hệ thống |
| Tài sản, văn bản, tuyển dụng, đào tạo, KPI | Đánh giá khả năng cấu hình 1Office trước | Module đã có nhưng chưa khai thác rõ ràng |
| Bản đồ 3D, phòng làm việc, định vị nhân sự | SDG ERP | Nghiệp vụ đặc thù, không quan sát thấy tương đương trong 1Office |
| Vận hành hạ tầng KCN, GIS, thiết bị/IoT, sự cố kỹ thuật | SDG ERP nếu khảo sát xác nhận khoảng trống | Có tính chuyên ngành và cần liên kết không gian/tài sản |
| Kế toán chuyên sâu | Hệ thống kế toán hiện hữu; tích hợp khi có yêu cầu được duyệt | Không nên xây lại sổ sách kế toán trong giai đoạn đầu |
| Báo cáo điều hành hợp nhất | Lớp báo cáo SDG ERP/Data Mart | Tổng hợp dữ liệu đa hệ thống mà không thay luồng nghiệp vụ |

### 6.2 Nguyên tắc tích hợp

1. Mỗi nhóm dữ liệu chỉ có một hệ thống chịu trách nhiệm chính.
2. Đồng bộ bằng ID ổn định; không liên kết bằng tên phòng ban hoặc họ tên.
3. Ưu tiên dữ liệu/API/Webhook chính thức sau khi người phụ trách làm việc với 1Office và cấp quyền triển khai cụ thể.
4. Không tự động đăng nhập, không dùng credential cũ và không cào giao diện 1Office trong vận hành chính thức.
5. Mọi đồng bộ phải có log, idempotency, cơ chế thử lại và đối soát.
6. SDG ERP không ghi ngược sang 1Office. Nếu tương lai cần thay đổi nguyên tắc này, phải có quyết định mới, phạm vi cụ thể, môi trường thử nghiệm và phê duyệt nghiệp vụ.

## 7. Danh mục tính năng SDG ERP nên phát triển

### Ưu tiên 0 — Bảo mật và dữ liệu nền

- Khắc phục toàn bộ vấn đề phân quyền, dữ liệu password, session và audit.
- Tách seed demo khỏi quy trình nhập dữ liệu thật.
- Nhận snapshot/export 1Office tại thời điểm chốt làm base cho cơ cấu, nhân sự, vị trí và quản lý trực tiếp; thẩm quyền nghiệp vụ vẫn cần chủ quy trình xác nhận.
- Thiết lập môi trường dev/test/production và sao lưu có kiểm chứng.
- Tuân thủ phạm vi tài khoản do người phụ trách cấp; giữ nguyên quyền và cấu hình của tài khoản, không lưu hoặc tái sử dụng credential.

### Ưu tiên 1 — Danh mục dùng chung và tích hợp an toàn

- Danh mục công ty, phòng ban, vị trí, nhân viên, địa điểm và phòng làm việc.
- Bảng mapping ID giữa SDG ERP và 1Office.
- Job đồng bộ một chiều từ nguồn chính, kèm báo cáo sai lệch.
- Dashboard sức khỏe dữ liệu: thiếu mã, trùng hồ sơ, người không có quản lý, đơn vị không có người phụ trách.
- Thống kê quản trị từ dữ liệu 1Office nếu API chính thức cho phép.

### Ưu tiên 2 — Pilot tạo khác biệt

- Hoàn thiện bản đồ 3D ở phạm vi danh bạ phòng làm việc đã được xác nhận.
- Quản lý tài sản/thiết bị IT gắn với phòng và người sử dụng, nhưng chỉ xây riêng sau khi so sánh với module Tài sản của 1Office.
- QR tài sản hoặc QR vị trí; không đưa dữ liệu nhạy cảm vào QR.
- Nhật ký bàn giao, bảo hành và yêu cầu hỗ trợ IT nội bộ.

### Ưu tiên 3 — Nghiệp vụ đặc thù Ban QLDA/KCN

- Bản đồ hạ tầng/GIS và hồ sơ đối tượng: tuyến điện, nước, thoát nước, PCCC, đường, cây xanh, mốc giới.
- Lịch bảo trì, kiểm tra và sự cố theo tài sản hạ tầng.
- Biên bản hiện trường có vị trí, ảnh, người chịu trách nhiệm và thời hạn khắc phục.
- Liên kết một sự cố/hồ sơ chuyên ngành với công việc hoặc quy trình 1Office thay vì tạo một hệ thống giao việc thứ hai.

### Chưa nên xây ở giai đoạn hiện tại

- Một hệ thống Công việc/Dự án/Quy trình mới cạnh tranh trực tiếp với 1Office.
- Bảng lương, chấm công, tuyển dụng, KPI hoặc CRM mới khi chưa đánh giá khả năng cấu hình module có sẵn.
- Luồng phê duyệt hợp đồng mới khi quy trình và ký số đã chạy trên 1Office.
- Đồng bộ hai chiều hoặc migration toàn bộ khi chưa có chủ sở hữu dữ liệu và kế hoạch quay lui.

## 8. Lộ trình 30–60–90 ngày

### 0–30 ngày: hiểu đúng và làm sạch nền móng

- Chốt người bảo trợ dự án và đầu mối từng phòng ban.
- Nhận bản cơ cấu/nhân sự/thẩm quyền final từ HCNS.
- Lập danh mục hệ thống, tài khoản quản trị, tích hợp, file Excel và nơi lưu dữ liệu.
- Xác nhận phân hệ 1Office nào đang dùng, ai dùng, tần suất, vấn đề và chi phí.
- Làm việc với 1Office về API, webhook, export, backup và môi trường thử nghiệm.
- Hardening SDG ERP; chưa mở sử dụng đại trà.
- Chọn một pilot nhỏ, có chủ sở hữu và tiêu chí thành công.

**Đầu ra:** bản hiện trạng được các đầu mối xác nhận, danh mục dữ liệu nguồn, backlog ưu tiên và quyết định pilot.

### 31–60 ngày: chuẩn hóa và thử nghiệm

- Chuẩn hóa master data và mapping ID.
- Thiết lập môi trường test, backup/restore và kiểm thử quyền.
- Thực hiện đồng bộ một chiều hoặc import có đối soát.
- Chạy pilot cho một nhóm nhỏ; đề xuất phù hợp là danh bạ không gian/3D hoặc quản lý thiết bị IT.
- Đo thời gian xử lý, số lỗi dữ liệu, mức sử dụng và phản hồi người dùng.

**Đầu ra:** pilot dùng được, dữ liệu có người chịu trách nhiệm và báo cáo đo lường trước/sau.

### 61–90 ngày: quyết định mở rộng

- Đánh giá pilot với lãnh đạo và phòng nghiệp vụ.
- Quyết định tính năng nào cấu hình tiếp trên 1Office, tính năng nào tích hợp và tính năng nào xây trong SDG ERP.
- Chốt kiến trúc tích hợp và kế hoạch ngân sách.
- Mở rộng từng phòng ban, kèm đào tạo, tài liệu và hỗ trợ sau triển khai.

**Đầu ra:** roadmap 6–12 tháng được phê duyệt và kế hoạch triển khai theo từng đợt.

## 9. Cơ chế quản trị cần thiết

| Vai trò | Trách nhiệm |
| :--- | :--- |
| Người bảo trợ cấp lãnh đạo | Chốt mục tiêu, phạm vi, ngân sách và xử lý xung đột liên phòng |
| HCNS | Chủ sở hữu dữ liệu cơ cấu, nhân sự, vị trí và tuyến quản lý |
| Trưởng các đơn vị | Xác nhận người thực hiện, phối hợp, kiểm tra và thẩm quyền nghiệp vụ |
| Pháp chế/TCKT | Xác nhận bước thẩm định, ký nháy, điều kiện và hạn mức |
| IT | Kiến trúc, bảo mật, tích hợp, vận hành và chất lượng dữ liệu |
| Người dùng pilot | Kiểm thử tình huống thật và xác nhận tính hữu dụng |

Mọi thay đổi quy trình cần có mã yêu cầu, người đề nghị, người duyệt, ngày hiệu lực, phương án quay lui và biên bản nghiệm thu. Không cấu hình quyền dựa trên trao đổi miệng hoặc suy đoán từ chức vụ.

## 10. Chỉ số đánh giá

Không nên đánh giá số hóa bằng số màn hình hoặc số tính năng đã lập trình. Bộ chỉ số giai đoạn đầu gồm:

- Tỷ lệ hồ sơ nhân sự và phòng ban được chủ sở hữu xác nhận.
- Tỷ lệ bản ghi có ID chuẩn, quản lý trực tiếp và trạng thái hiệu lực.
- Số hệ thống/file đang giữ cùng một loại dữ liệu.
- Thời gian xử lý trước và sau pilot.
- Tỷ lệ thao tác phải nhập lại dữ liệu.
- Số lỗi phân quyền hoặc dữ liệu sai phạm vi.
- Tỷ lệ người dùng hoạt động và tỷ lệ hoàn thành đúng hạn.
- Thời gian khôi phục từ backup được kiểm chứng.

## 11. Các quyết định cần xin trong cuộc họp đầu tiên

1. Ai là người bảo trợ chính thức cho chương trình số hóa?
2. 1Office được xác định là nền tảng dài hạn hay giải pháp chuyển tiếp?
3. Hệ thống nào là nguồn chính cho nhân sự và cơ cấu tổ chức?
4. Phân hệ 1Office nào công ty đã mua nhưng chưa triển khai, và vì sao?
5. Có API, webhook, export định kỳ và môi trường test hay không?
6. Pilot đầu tiên giải quyết vấn đề cụ thể nào và ai nghiệm thu?
7. Dữ liệu nào được phép đưa vào SDG ERP, môi trường nào được phép truy cập?
8. Ai chịu trách nhiệm duyệt quyền người dùng và rà soát quyền định kỳ?

## 12. Việc cần làm ngay

1. Không dùng lại thông tin đăng nhập 1Office đã xuất hiện trong lịch sử; khi có nhu cầu khảo sát mới, nhận lại tài khoản và phạm vi cho đúng lần sử dụng.
2. Gửi mẫu dữ liệu cho HCNS để nhận bản final có xác nhận.
3. Tổ chức các buổi phỏng vấn 45–60 phút với HCNS, TCKT, Pháp chế, Kinh doanh, KHĐT và Ban QLDA.
4. Xin báo cáo/export chính thức từ 1Office để xác nhận số lượng và mức sử dụng từng module.
5. Khắc phục các lỗi bảo mật ưu tiên 0 của SDG ERP.
6. Chọn một pilot không trùng chức năng lõi của 1Office và thống nhất tiêu chí nghiệm thu trước khi phát triển tiếp.
