# Bối cảnh hiện tại và định hướng số hóa Sao Đỏ Group

> **Ưu tiên 31/10/2026:** Tập trung quản lý tài khoản và phân quyền. Đã yêu cầu gỡ các bảng tài sản cùng seed; tài liệu/nguồn giữ tham khảo để xem xét sau. Giữ nhân sự, cơ cấu và 3D nhân sự. Cấu trúc Role/Permission/RolePermission/UserRole được giữ, các điểm cần làm gọn đã ghi trong kế hoạch role.


> **Quyết định hiện hành 28/10/2026:** HR hoạt động độc lập sau khởi tạo. 1Office là nguồn đối chiếu ban đầu, file HR final 72 người là baseline; hồ sơ hiện hành được sửa trong ERP theo quyền HR MANAGE, có audit. Không tự đồng bộ HR từ 1Office hoặc ghi đè bằng file nguồn. Mã ERP tự sinh và không điều chỉnh. Đã làm sạch 8 hồ sơ ngoài final và 8 tài khoản tương ứng; giữ 72 người, 60 tài khoản, cơ cấu 18 đơn vị và quyền. Các quyết định nguồn/reset chưa triển khai bên dưới là lịch sử, được thay thế bởi mục này.


> **Yêu cầu bổ sung 27/10/2026:** Phòng ban phải chọn theo cây cơ cấu hiện có; chức danh là text tự do có thể chỉnh khi tạo/sửa người, không phải role. File HR 72 người là chuẩn khởi tạo. Người phụ trách cho phép cân nhắc làm sạch nhân sự/tài khoản và cơ cấu lại DB nếu cần, đồng thời yêu cầu nhận xét/đánh giá trước. Đã lập [phương án cụ thể trong kế hoạch HR](../plans/HR-CHECKLIST.md); chưa xóa dữ liệu hoặc triển khai phương án trong lượt đánh giá này.


> **Cập nhật nguồn nhân sự 27/10/2026:** Đã nhập file HR final ngày 26/10/2026: 72 người theo danh sách, giữ 7 hồ sơ chờ xác nhận và 1 đã nghỉ riêng. File HR ưu tiên cho các trường nhân sự có trong file; mapping 1Office và cây 18 đơn vị được giữ. Các số liệu 66/67 trong khảo sát cũ bên dưới là lịch sử, không phải hiện trạng mới. Xem [đối chiếu HR và các điểm cần xác nhận](DOI-CHIEU-NHAN-SU-HR-2026-10-26.md).


> **Quyết định 27/10/2026:** Tạm hoãn tích hợp AI và gỡ bản thử nghiệm hồ sơ thanh toán khỏi ứng dụng. Giữ ý tưởng/tài liệu để xem xét sau; không tự khôi phục khi chưa được duyệt. Xem [plan AI](../plans/AI-DOCUMENTS-CHECKLIST.md).

## Quyết định nhân sự và tài khoản — 26/10/2026

Người phụ trách duyệt quản lý đơn giản: phòng ban → hồ sơ nhân sự → 0 hoặc nhiều tài khoản. Số người tính từ hồ sơ, không từ tài khoản. Tài khoản cá nhân/admin của cùng người dùng chung ID nhân sự, quyền độc lập. Nguồn nhân sự hiện ưu tiên file HR final 72 người theo quyết định 27/10/2026; cây cơ cấu giữ tham chiếu 1Office, ERP quản lý tài khoản và quyền riêng. Không bổ sung hệ quản trị danh tính phức tạp.

Đã triển khai nền DB, cập nhật thống kê và giao diện quản lý tách biệt. Nguồn hiện dùng là snapshot đã lưu, không xác nhận số người hiện tại tuyệt đối nếu chưa đối chiếu mới. Bảng User cũ giữ cột lưu trữ để bảo toàn dữ liệu nhưng ứng dụng chỉ đọc hồ sơ từ Employee.


**Cập nhật:** 22/10/2026

**Mốc khảo sát 1Office:** 21/10/2026; số liệu trong file là snapshot, không phải dữ liệu trực tuyến

**Mục đích:** ghi nhận bối cảnh, quyết định đã chốt, hướng phát triển và những việc còn cần xác nhận

## 1. Bối cảnh người phụ trách và công ty

Người phụ trách là nhân viên IT mới thuộc phòng Hành chính–Nhân sự (HCNS), được giao nhiệm vụ số hóa. Khi bắt đầu khảo sát ngày 21/10/2026, người phụ trách đang ở ngày làm việc thứ 3 và hiện chuẩn bị báo cáo tuần thử việc đầu tiên.

Thông tin bàn giao ban đầu không nhiều. Phần lớn tài liệu, dữ liệu, cách dùng phần mềm và cách phối hợp giữa các phòng phải tự tìm hiểu, rồi xác nhận với người phụ trách nghiệp vụ. Các nhận định từ khảo sát cần được phân biệt với quy định chính thức của công ty.

Phạm vi đã khảo sát gồm văn phòng Tập đoàn Sao Đỏ và Ban QLDA KCN Nam Đình Vũ 1. Công ty vận hành linh hoạt, ưu tiên giải quyết nhu cầu thực tế, không đặt áp lực kiểm soát tài sản quá lớn. Điều này định hướng xây tính năng gọn, dễ dùng; không thay thế các quy định bảo mật dữ liệu đã nêu trong tài liệu nội bộ.

## 2. Những quyết định và giới hạn đã xác nhận

- **Giữ mã nhân sự nội bộ ERP (chốt 27/10/2026).** Công ty chưa có mã HR chính thức, nhưng ERP sẽ tự cấp mã ổn định để xuất Excel và đối chiếu khi nhập lại. Có thể ẩn trên giao diện, không bắt nhập tay; FK vẫn dùng ID DB. Quyết định này thay thế phương án mã nullable; luồng tự cấp mã và xuất–nhập còn chờ triển khai theo kế hoạch HR.

- **1Office đang hoạt động ổn và tiếp tục là nền tảng làm việc chính.** Người phụ trách sẽ nghiên cứu sâu để tối ưu tính năng sẵn có trước khi đề xuất xây thêm.
- **File HR final 72 người là nguồn chuẩn ưu tiên về độ chính xác của nhân sự.** Họ tên, ngày sinh, phòng ban gán cho người, chức danh và ghi chú theo file HR chốt 26/10/2026 khi khác 1Office. Dữ liệu 1Office giữ vai trò đối chiếu, liên kết và cung cấp cây đơn vị hiện có. Export/API mới không tự ghi đè trường HR đã chốt; cần duyệt chênh lệch. Trường không có trong final được giữ từ nguồn cũ nhưng chưa được coi là HR xác nhận.
- **SDG ERP tập trung vào nhu cầu đặc thù:** tài sản gắn vị trí, không gian 3D, tích hợp dữ liệu và các bài toán vận hành được khảo sát xác nhận. GIS, IoT và AI là hướng mở rộng đang nghiên cứu.
- **Các tính năng ERP hiện tại là prototype.** Có thể đề xuất sửa lớn hoặc xây lại; đề xuất trong tài liệu không đồng nghĩa đã được giao triển khai.
- **Không tự truy cập lại 1Office.** Mỗi lần khảo sát cần người phụ trách cấp lại thông tin và phạm vi; chỉ xem/export, giữ nguyên dữ liệu, quyền và cấu hình. Không lưu hoặc tái sử dụng credential, cookie hay session cũ.

## 3. Hiện trạng 1Office và dữ liệu nền

### 3.1 Mức sử dụng quan sát được

Khảo sát ngày 21/10/2026 cho thấy công ty đã sử dụng Công việc, Dự án, Quy trình, Ký số và Lịch biểu. Các số sau phản ánh màn hình/bộ lọc khảo sát, không phải tổng kiểm toán toàn hệ thống:

| Nội dung | Quan sát tại thời điểm khảo sát |
| :--- | :--- |
| Công việc | 867 công việc hiển thị; 469 đang thực hiện, 355 hoàn thành; các trạng thái khác không phân rã ở đây |
| Dự án | 11 dự án: 9 đang thực hiện, 1 hoàn thành, 1 đã hủy |
| Quy trình | Khoảng 6.060 bản ghi ở màn hình tổng, 744 công việc cấp 0; hai số thuộc các mức thống kê khác nhau |
| Mẫu quy trình | 34 mẫu: 28 hoạt động, 6 tạm dừng |
| Ký số | 242 hồ sơ hiển thị |
| Báo cáo và hỗ trợ | 3 báo cáo đã lưu; 18 ticket hỗ trợ đã đóng |

Nghỉ phép, hợp đồng, trình ký, công văn và nhiều yêu cầu hành chính đã chạy qua quy trình 1Office. Cẩm nang hội nhập cũng hướng dẫn thực hiện nghỉ phép trên 1Office. Đây là các luồng nên tiếp tục khai thác trên hệ thống hiện hữu.

Một số màn hình Tài liệu công ty, Văn bản đến, Tài sản, Tuyển dụng, Đào tạo, Bảng lương, KPI và Open API chưa thấy dữ liệu/cấu hình đáng kể. **Màn hình trống chưa đủ để kết luận nghiệp vụ không tồn tại hoặc cần xây lại.** Cần kiểm tra cách phòng ban thực hiện và phạm vi/bộ lọc của tài khoản khảo sát.

Lịch sử hỗ trợ phản ánh các nhu cầu về chuyển đổi Word/Excel/PDF, hiển thị quy trình trên điện thoại, thống kê công việc con, QR nhân sự và phục hồi hồ sơ. Đây là đầu vào khảo sát; chưa phải danh sách lỗi hiện còn tồn tại hoặc cam kết ERP sẽ thay thế.

### 3.2 Cơ cấu, nhân sự và tài khoản

| Dữ liệu | Kết quả đã đối chiếu |
| :--- | :--- |
| Cơ cấu 1Office | 19 nút gồm 1 công ty và 18 đơn vị nghiệp vụ |
| Cơ cấu ERP | 18/18 đơn vị khớp ID nguồn, tên và quan hệ cha/con với export ngày 21/10/2026 |
| Hồ sơ nhân sự nguồn | 67 người |
| Tài khoản gắn với 67 người | 55 hoạt động, 11 khóa, 1 hồ sơ chưa tìm thấy tài khoản |
| Tài khoản hệ thống | `admin` làm tổng tài khoản hoạt động thành 56; không tính là nhân sự |
| Nhóm quyền 1Office | 11 nhóm; không ánh xạ trực tiếp thành role ERP |

Hồ sơ mã nhân sự 71 chưa tìm thấy tài khoản. Nguyên nhân của trường hợp này và 11 tài khoản khóa chưa được xác nhận. Không suy ra nghỉ việc từ trạng thái khóa, không tự tạo tài khoản cho người chỉ có hồ sơ.

Bốn file export quản trị đã được lưu, đọc và lập checksum tại [manifest nguồn 1Office](../1office-sources/README.md). Việc HCNS xác nhận ngoại lệ, quản lý trực tiếp và thẩm quyền vẫn cần thiết, nhưng không phải điều kiện để hỏi lại quyết định nguồn chuẩn đã chốt.

### 3.3 Cẩm nang và quy trình nội bộ

Cẩm nang hội nhập 21 trang bổ sung chức năng sáu khối văn phòng, sáu bộ phận BQLDA, tầng quản trị và đầu mối phối hợp. Có hai điểm cần HCNS/BQLDA giải thích trước khi mở rộng mô hình: vị trí của Ban Kiểm soát và quan hệ chỉ đạo giữa Ban Giám đốc QLDA với sáu bộ phận.

Cây hành chính trên 1Office và sơ đồ chỉ đạo trong cẩm nang có thể phục vụ hai mục đích khác nhau. Hiện giữ cây nguồn 1Office; chưa tự thay đổi theo hình minh họa. Phiên bản/ngày hiệu lực của cẩm nang cần xác nhận vì metadata file không đủ làm căn cứ ban hành.

Các quy trình cho thấy chức danh, quản lý trực tiếp, người thực hiện và người phê duyệt là những khái niệm riêng. Không suy thẩm quyền nghiệp vụ hoặc quyền ERP chỉ từ tên chức vụ.

## 4. Bối cảnh quản lý tài sản và license

Theo người phụ trách, công ty chưa có bộ khung thống nhất để quản lý tài sản. Phòng ban tự quản lý license và tài sản do mình đề xuất mua. IT thuộc HCNS không mặc định chịu trách nhiệm mọi tài sản của toàn công ty.

Nhu cầu ban đầu là biết số lượng, tình trạng, vị trí/người sử dụng khi cần, và theo dõi báo hỏng–sửa chữa. Mỗi tài sản thực tế sẽ có hồ sơ riêng; các trường chi tiết được bổ sung dần. Phòng chịu trách nhiệm quản lý có thể khác phòng/người đang sử dụng.

Ảnh biên bản BMHC 0501 chỉ là nguồn tham khảo tạm: 11 nhóm, tổng 90 thiết bị. Dữ liệu này được giữ ở trạng thái nháp, chưa phải kết quả kiểm kê và không dùng để tự tạo 90 tài sản thật.

Hai phương án quyền đang được cân nhắc:

- Mỗi phòng tự quản lý dữ liệu tài sản trong phạm vi được giao.
- Chỉ HCNS hoặc một số user được chỉ định sử dụng tính năng ở giai đoạn đầu.

Đề xuất kết hợp là pilot với IT/HCNS trước, sau đó cấp cùng role quản lý tài sản cho đầu mối các phòng với phạm vi tương ứng. Phương án cuối chưa được chốt. Menu hiển thị theo quyền, đồng thời server phải kiểm tra quyền khi đọc/sửa/xuất dữ liệu và hiển thị trên 3D.

MVP không bao gồm chống mất trộm, điều tra thất thoát, khấu hao kế toán, kiểm kê khắt khe hoặc phê duyệt nhiều tầng. Việc so sánh với module Tài sản của 1Office giúp tránh nhập liệu kép, nhưng không chặn pilot tài sản IT đã chọn.

## 5. Bối cảnh sử dụng AI theo phòng ban

**Thông tin người phụ trách bổ sung ngày 22/10/2026:** mỗi phòng ban đã được cấp một tài khoản “GPTpro5x” riêng; phòng nào sử dụng tài khoản của phòng đó. Tên này được giữ theo cách người phụ trách cung cấp, chưa xác minh tên gói chính thức, nhà cung cấp hoặc quyền tích hợp đi kèm.

**Yêu cầu định hướng:** khi có tính năng AI trong ERP, người dùng muốn tự nhập thông tin kết nối hoặc đăng nhập tài khoản được cấp để sử dụng riêng. Mục tiêu là tận dụng tài khoản sẵn có và phân bổ chi phí/hạn mức theo từng phòng, tránh dồn toàn bộ chi phí AI vào một tài khoản hoặc ngân sách ERP chung.

Cần phân biệt người dùng ERP với tài khoản AI: nhiều người trong một phòng có thể sử dụng cùng nguồn tài khoản theo thực tế được cung cấp, nên “dùng riêng” ở đây trước hết là riêng theo phòng; chưa có thông tin mỗi nhân viên sở hữu một thuê bao riêng.

**Lựa chọn cập nhật ngày 23/10/2026:** sử dụng OpenAI API key cấu hình phía server qua `.env.local` hoặc biến môi trường triển khai (`OPENAI_API_KEY`, `OPENAI_MODEL`). Người dùng không nhập key trên tab. Giao diện chỉ hiển thị trạng thái có/thiếu cấu hình; chưa xác thực hoặc gọi AI. Chi phí API tách khỏi thuê bao ChatGPT, thuộc tài khoản API phía server; việc phân nguồn chi phí theo phòng chưa triển khai. Sign in with ChatGPT chỉ còn là hướng nghiên cứu.

Các yêu cầu đề xuất cho tính năng:

- Gắn kết nối AI với đúng user/phạm vi phòng được phép sử dụng; không tự chia sẻ kết nối, lịch sử hội thoại hoặc tài liệu sang phòng khác.
- Hiển thị rõ kết nối nào đang được dùng và bên nào chịu chi phí; không tự chuyển sang tài khoản trả phí chung khi hết hạn mức hoặc kết nối lỗi.
- Ưu tiên cơ chế đăng nhập/ủy quyền chính thức; nếu dùng API key thì phải xác minh nguồn thanh toán và quyền sử dụng. Không coi việc nhập mật khẩu/cookie tài khoản vào ERP là phương án tích hợp đã được chốt.
- Không mặc định thuê bao hiện có bao gồm API hoặc cho phép ERP sử dụng hạn mức đó. Phương thức kết nối, chi phí phát sinh và điều kiện sử dụng phải được kiểm chứng trước khi triển khai.

Pilot AI dự kiến tập trung vào soạn thông báo, báo cáo theo mẫu và tra cứu tài liệu được phép sử dụng. “Kỹ năng có sẵn” được hiểu là hướng dẫn tác vụ, mẫu biểu và nguồn tham chiếu; chưa quyết định huấn luyện mô hình riêng.

Cẩm nang quy định không đưa dữ liệu tài chính, hợp đồng, khách hàng, bản vẽ KCN hoặc bí mật kinh doanh chưa công bố lên AI công cộng; dữ liệu đưa vào AI phải được ẩn danh đầy đủ. Web nội bộ không tự bảo đảm dữ liệu ở nội bộ nếu phía sau vẫn gọi dịch vụ AI bên ngoài.

## 6. Hiện trạng SDG ERP và hướng đồng bộ

### 6.1 Đã thực hiện và còn dở

ERP hiện có đăng nhập, danh bạ, cơ cấu dạng cây, nhật ký và mô hình tòa nhà 3D. Database tài sản đã được tạo, có dữ liệu kiểm kê nháp; giao diện quản lý từng tài sản chưa hoàn thiện. Tên vật lý của 16 bảng/194 cột đã chuyển sang tiếng Việt không dấu, còn API Prisma giữ tên cũ qua ánh xạ.

Dữ liệu cơ cấu đã đối chiếu đạt. Tính năng phòng ban chưa nghiệm thu toàn bộ: còn kiểm tra quyền đọc khi thiếu permission, đối chiếu thiếu/thừa với tập ID nguồn độc lập, liên kết 3D khi đổi mã phòng và quy trình nhập snapshot tiếp theo. Bộ kiểm thử admin 5/5 đã đạt không thay thế kiểm thử đầy đủ các vai trò. Chi tiết nằm trong [HR checklist](../plans/HR-CHECKLIST.md).

Các vấn đề phân quyền, session, dữ liệu nhạy cảm trong DTO/audit và seed đã được ghi nhận trong checklist; phải kiểm chứng trạng thái xử lý trước khi triển khai cho người dùng thật. File này không thay thế báo cáo kiểm thử hoặc danh sách lỗi kỹ thuật.

### 6.2 Hướng đồng bộ đã thảo luận, chưa triển khai

1Office quản lý hồ sơ chính thức; ERP lưu bản sao bền vững để truy vấn nhanh và liên kết với tài sản/không gian. Bản sao này không được xóa rồi nạp lại tùy ý như bộ nhớ đệm, vì lịch sử nghiệp vụ cần ID ERP ổn định.

Luồng đề xuất: **API lấy dữ liệu → kiểm tra thay đổi → cập nhật bản sao ERP**. Webhook bổ sung cập nhật gần thời gian thực; đối soát API định kỳ và sau mất kết nối dùng để đồng bộ bù.

- Tách hồ sơ nhân sự khỏi tài khoản ERP; bảng `nguoi_dung` hiện vẫn gộp hai khái niệm này.
- Trường thuộc 1Office chỉ đọc trong ERP. Chỗ ngồi, tài sản được giao và role ERP được quản lý riêng.
- Khi nguồn lỗi/trả thiếu, giữ bản dữ liệu tốt gần nhất; không tự suy người vắng trong kết quả là nghỉ việc.
- Sự kiện webhook đã nhận phải được lưu bền vững trước khi xác nhận; xử lý có thử lại, chống trùng và tránh dữ liệu cũ ghi đè dữ liệu mới.
- Nếu ERP chưa nhận được sự kiện vì offline, khả năng gửi lại phụ thuộc 1Office. Danh sách sự kiện, API, cơ chế gửi lại và giới hạn sử dụng chưa được xác minh cho hệ thống SDG.

Hiện chưa có đồng bộ API/webhook chạy thật. Mọi cấu hình tích hợp trên 1Office cần phạm vi cho phép riêng; không ghi ngược dữ liệu sang 1Office theo hướng hiện tại.

## 7. Ưu tiên phát triển và tiêu chí đánh giá

| Ưu tiên | Đầu việc | Kết quả cần đạt |
| :--- | :--- | :--- |
| 1. Dữ liệu nền | Chốt phần còn dở của cơ cấu; khảo sát API nhân sự/cơ cấu; tách hồ sơ và tài khoản khi thiết kế được duyệt | Liên kết đúng người/đơn vị, giữ ID ổn định, có đối soát và thời điểm cập nhật |
| 2. Tài sản và không gian | Pilot một nhóm thiết bị IT hoặc một khu vực; quản lý danh sách trước, bổ sung 3D để tra cứu vị trí | Tìm được thiết bị, người sử dụng, tình trạng và lịch sử xử lý; người dùng xác nhận hữu ích |
| 3. AI theo phòng | Xác minh tài khoản GPTpro5x và phương thức kết nối; thử một vài tác vụ với tài liệu được phép | Đầu ra dùng được, giảm thời gian sửa, chi phí/hạn mức đúng phòng và không tự dồn về tài khoản chung |
| Sau pilot | Mở rộng phòng ban, GIS/IoT hoặc báo cáo liên hệ thống khi có nhu cầu được xác nhận | Có người phụ trách, dữ liệu đầu vào và tiêu chí nghiệm thu cụ thể |

Thứ tự trên là định hướng, chưa phải lịch triển khai hoặc ngân sách được phê duyệt. Đánh giá bằng thời gian tra cứu/xử lý, số lần nhập lại dữ liệu, sai lệch đồng bộ, mức sử dụng và phản hồi thực tế; không lấy số màn hình đã viết làm thước đo chính.

Báo cáo tuần đầu nên tách kết quả đã làm (khảo sát, đối chiếu, prototype) khỏi đề xuất tiếp theo. Không mô tả API/webhook, AI hay IoT là tính năng đã triển khai.

## 8. Những việc còn cần xác nhận

1. Đầu mối nghiệp vụ và người nghiệm thu pilot; ai được quản lý tài sản, ai cần xem tổng hợp nhiều phòng.
2. Ngoại lệ nhân sự/tài khoản, quản lý trực tiếp, phân công kiêm nhiệm và các điểm khác nhau giữa cẩm nang với cây 1Office.
3. Phạm vi API/webhook được cung cấp, cách xác thực, sự kiện nhân sự/cơ cấu, cơ chế gửi lại, giới hạn và môi trường thử nghiệm.
4. Tên gói/nhà cung cấp thực tế của GPTpro5x, cách sử dụng được hỗ trợ trong ERP và cách ghi nhận chi phí/hạn mức theo phòng.
5. Tài liệu được phép dùng cho AI, tác vụ thử nghiệm, người đánh giá và giới hạn dữ liệu chia sẻ.

HCNS xác nhận dữ liệu nhân sự/cơ cấu; các phòng xác nhận nghiệp vụ và trách nhiệm tài sản; IT chịu trách nhiệm giải pháp kỹ thuật, tích hợp và vận hành. Thay đổi quyền hoặc thẩm quyền cần được ghi nhận rõ người quyết định và phạm vi, phù hợp quy mô thử nghiệm.

## 9. Tài liệu tham chiếu

- [Nguồn export và checksum 1Office](../1office-sources/README.md)
- [Phân tích dữ liệu quản trị và tích hợp 1Office](./MO-HINH-DU-LIEU-QUAN-TRI-VA-TICH-HOP-1OFFICE.md)
- [Thiết kế Master Data và RBAC](./DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md)
- [Đối chiếu cẩm nang hội nhập](./DOI-CHIEU-CAM-NANG-HOI-NHAP-VA-CO-CAU.md)
- [Đánh giá tích hợp tài sản vào mô hình 3D](./DANH-GIA-TICH-HOP-TAI-SAN-VA-MO-HINH-3D.md)
- [Checklist chuyển đổi số](../plans/DIGITAL-TRANSFORMATION-CHECKLIST.md)
- [Checklist HR](../plans/HR-CHECKLIST.md) và [checklist tài sản](../plans/ASSET-MANAGEMENT-CHECKLIST.md)
- [Kiến trúc](../ARCHITECTURE.md) và [từ điển database](../DATABASE-DICTIONARY.md)
- [Bộ tài liệu nội bộ](../SDGSources/)

### Phạm vi báo cáo tuần đầu — cập nhật theo người phụ trách

Báo cáo tập trung vào công việc đã làm, kết quả khảo sát, vấn đề cần hoàn thiện và kế hoạch tiếp theo. Các thủ tục cá nhân như thẻ, CCCD, BIDV và tài khoản hội nhập được mặc định đã hoàn tất trong phạm vi báo cáo, không liệt kê thành việc còn chờ xác nhận. Việc thống nhất KPI, đầu mối nghiệp vụ và phạm vi phát triển vẫn phải phản ánh đúng trạng thái thực tế.
