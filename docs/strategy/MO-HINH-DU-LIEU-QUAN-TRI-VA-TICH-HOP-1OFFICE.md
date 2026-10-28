# Mô hình dữ liệu quản trị và định hướng tích hợp 1Office

> Cập nhật triển khai 27/10/2026: ERP đã tách Employee (hồ sơ người) và User (tài khoản); dữ liệu khảo sát 1Office bên dưới vẫn là snapshot lịch sử. Xem [thiết kế dữ liệu nền cập nhật](DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md) và [checklist HR](../plans/HR-CHECKLIST.md). Không truy cập lại 1Office trong lần triển khai này.

**Trạng thái:** Khảo sát kỹ thuật ban đầu, cần chủ sở hữu nghiệp vụ xác nhận  
**Ngày quan sát:** 21/10/2026  
**Mục tiêu:** dùng 1Office làm nền tảng vận hành hiện hữu và phát triển SDG ERP cho dữ liệu chuẩn, phân tích hợp nhất và nghiệp vụ đặc thù của Sao Đỏ Group

**Giới hạn truy cập hiện hành:** báo cáo chỉ được tiếp tục từ tài liệu/export đã lưu. Không truy cập lại 1Office bằng credential cũ. Chỉ khi người phụ trách cấp lại tài khoản cho một yêu cầu cụ thể mới được xem hoặc export; không được thay đổi dữ liệu, quyền, mật khẩu hay cấu hình 1Office.

## 1. Phạm vi và cách khảo sát

Khảo sát được thực hiện bằng tài khoản quản trị do người phụ trách cung cấp, qua trình duyệt tự động. Các thao tác gồm mở trang, đọc DOM, đọc các bảng và sơ đồ, cùng chức năng Export có sẵn cho tài khoản, phòng ban và nhóm quyền. Không tạo, sửa, duyệt hoặc xóa dữ liệu nghiệp vụ.

Bốn file Excel gốc đã được tải vào project và được Git nhận diện theo yêu cầu của người phụ trách. Manifest, số bản ghi, checksum và kết quả đọc toàn bộ workbook nằm tại [Nguồn khảo sát quản trị 1Office](../1office-sources/README.md).

Các kết luận dưới đây là ảnh chụp kỹ thuật tại một thời điểm của nguồn 1Office. 1Office đã được chọn làm chuẩn nền cho hồ sơ nhân sự và cơ cấu tổ chức, nhưng snapshot cũ không thay thế dữ liệu sống tại thời điểm đồng bộ; quyết định về thẩm quyền và quy chế phân quyền vẫn cần chủ nghiệp vụ xác nhận.

## 2. Bản đồ dữ liệu quản trị

### 2.1 Cơ cấu tổ chức

1Office hiển thị 19 bản ghi tổ chức:

- 1 công ty gốc: Công ty Cổ phần Tập đoàn Đầu tư Sao Đỏ.
- 9 đơn vị cấp một: Ban Lãnh đạo, Phòng Kinh doanh, Phòng Tài chính - Kế toán, Phòng Hành chính Nhân sự, Ban Pháp chế, Phòng Kế hoạch Đầu tư, Phòng Phát triển Dự án, Ban QLDA KCN Nam Đình Vũ 1 và Ban Kiểm soát.
- 9 đơn vị cấp hai: 2 bộ phận của Phòng Kinh doanh và 7 bộ phận của Ban QLDA.

Các trường `Mã`, `Khối nghiệp vụ` và `Loại phòng ban` gần như để trống. Số thứ tự như `2.1`, `8.6` đang nằm trong tên hiển thị. Vì vậy không được dùng tên phòng ban làm khóa tích hợp. Chênh lệch “19 bản ghi 1Office” và “18 phòng ban trong seed SDG ERP” nhiều khả năng do 1Office tính cả nút công ty gốc; cần đối chiếu bằng ID và loại nút.

### 2.2 Tài khoản và hồ sơ nhân sự

| Trạng thái quan sát | Số lượng |
| :--- | ---: |
| Tài khoản đang hoạt động | 56 |
| Tài khoản đã khóa | 11 |
| Hồ sơ chưa kích hoạt | 1 |
| Tài khoản chờ kích hoạt | 0 |
| Bản ghi xác thực thiết bị | 84 |

Bảng tài khoản liên kết các trường: tài khoản đăng nhập, nhóm quyền, mã nhân sự, họ tên, phòng ban, trạng thái chữ ký số, ngày tạo, ngày kích hoạt và gói ứng dụng. Phần lớn tài khoản có cùng ngày tạo/kích hoạt 23/12/2025, cho thấy đã có một đợt khởi tạo hoặc chuyển dữ liệu hàng loạt.

File export cung cấp thêm ID hồ sơ nhân sự nội bộ, quyền tùy chỉnh, cờ quản trị, phòng ban kiêm nhiệm, công ty/chi nhánh, chức vụ, vị trí, email, ngày cập nhật, lần đăng nhập cuối và vai trò người dùng. Kết quả kiểm tra độ đầy đủ cho thấy:

- 56/56 tài khoản hoạt động có ID hồ sơ nhân sự; 55 có mã nhân sự.
- 52/56 có chức vụ, 53/56 có vị trí, nhưng chỉ 3/56 có email.
- 3/56 chưa gắn phòng ban và 1/56 chưa gắn nhóm.
- 46/56 có chữ ký số và 55/56 có dữ liệu đăng nhập lần cuối.
- Cả 11 tài khoản khóa thuộc nhóm Nhân viên; chỉ một tài khoản có dữ liệu đăng nhập lần cuối.

Tổng trạng thái trên màn hình không thể coi là tổng nhân sự. Đối chiếu từng dòng cho thấy 56 tài khoản hoạt động gồm 55 người và tài khoản hệ thống `admin`; cộng 11 tài khoản khóa và 1 hồ sơ chưa có tài khoản tương ứng đúng 67 người trong file hiện có. Danh sách thành viên nhóm còn xuất hiện tài khoản có trạng thái “Đã xóa”. Vì vậy vẫn phải tách bốn khái niệm:

1. hồ sơ con người;
2. quan hệ làm việc còn hiệu lực;
3. tài khoản đăng nhập và trạng thái khóa;
4. tư cách thành viên nhóm quyền.

Không xóa hoặc vô hiệu hóa một đối tượng chỉ vì trạng thái của đối tượng khác thay đổi.

### 2.3 Nhóm quyền

Hệ thống có 11 nhóm:

| Nhóm | Tài khoản hoạt động | Nhận xét |
| :--- | ---: | :--- |
| Nhân viên | 29 | Có thêm 11 tài khoản khóa và một số thành viên đã xóa trong trang chi tiết |
| Quản lý | 11 | Quyền quản lý công việc, timesheet và hồ sơ ký số theo phòng ban |
| Quản lý Nhân sự | 0 | Nhóm chuyên trách đang không được gán người |
| Nhân viên Nhân sự | 0 | Nhóm chuyên trách đang không được gán người |
| Quản trị hệ thống | 1 | Nhóm duy nhất có cờ quản trị hệ thống |
| Quản lý Chi nhánh | 0 | Chưa được gán người |
| Nhân viên Hành chính | 1 | Nhóm nghiệp vụ riêng |
| TP HCNS | 1 | Có quyền HR và xem quy trình tự động |
| Ban lãnh đạo - CRM | 3 | Gói Enterprise, phạm vi CRM rộng |
| Nhân viên - CRM | 6 | Gói Enterprise, quyền CRM rộng |
| Quản lý không thuộc KD - CRM | 3 | Xem CRM, quản lý công việc theo phòng ban |

Phát hiện cần xử lý ngay về quản trị quyền:

- Nhóm “Nhân viên” và “Quản lý” đều đang có quyền `Xem tất cả` đối với hồ sơ nhân sự.
- Hai nhóm HR chuyên trách có quyền cao nhưng không có thành viên; quyền HR thực tế đang nằm ở nhóm khác.
- Nhóm “Nhân viên” chứa cả người hoạt động, người khóa và người đã xóa.
- Quyền là tổ hợp giữa nhóm, gói dịch vụ và quyền ở từng quy trình; không thể ánh xạ một nhóm 1Office thành một vai trò SDG ERP duy nhất.
- Các nhóm CRM có ma trận quyền khác hẳn nhóm Pro Work và phải được quản lý như một lớp quyền ứng dụng riêng.

Đề nghị HCNS, IT và lãnh đạo thực hiện rà soát quyền hàng quý, bắt đầu bằng quyền xem hồ sơ nhân sự và danh sách tài khoản không còn làm việc.

### 2.4 Cấu hình tích hợp và quản trị

- Màn hình SSO và OIDC App không có bản ghi cấu hình.
- Open API chưa có cấu hình được quan sát trong đợt khảo sát trước.
- Trang quản trị có lịch sử hành động: tháng 10/2026 hiển thị 931 sự kiện đối tượng và 42 sự kiện cài đặt.
- Danh sách ứng dụng cho thấy 33 phân hệ được cấp trên tenant, nhưng quyền sử dụng thực tế phụ thuộc nhóm và gói Pro Work/Enterprise.

Điều này có nghĩa giai đoạn đầu chỉ dùng các export đã được người phụ trách cho phép để đối soát. Đồng bộ vận hành lâu dài phải dùng API/webhook chính thức hoặc cơ chế do 1Office hỗ trợ và được phê duyệt riêng; không dùng tài khoản admin để cào giao diện định kỳ.

### 2.5 Đánh giá mức ảnh hưởng

1Office đang vận hành ổn định và có dữ liệu sử dụng thực tế. Các phát hiện trong báo cáo không chứng minh hệ thống đang có sự cố hoặc cần thay thế. Chúng chủ yếu ảnh hưởng tới bảo mật thông tin, quản trị dữ liệu, độ tin cậy của báo cáo và khả năng tích hợp SDG ERP.

| Phát hiện | Ảnh hưởng tới vận hành hiện tại | Ảnh hưởng nếu không xử lý | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| Nhóm Nhân viên và Quản lý có quyền `Xem tất cả` hồ sơ nhân sự | Chưa thấy làm gián đoạn công việc | Có khả năng lộ hồ sơ vượt nhu cầu công việc. Mức ảnh hưởng thực tế phụ thuộc trường nào được hiển thị và cơ chế che dữ liệu của 1Office | **Cao, cần xác minh** |
| Hai nhóm HR chuyên trách không có thành viên | Thấp; HCNS vẫn đang làm việc qua các nhóm khác | Khó giải thích ai có quyền HR chính thức; dễ cấp quyền sai khi tiếp nhận nhân sự mới | Trung bình |
| Tài khoản khóa/đã xóa vẫn xuất hiện trong nhóm | Thấp nếu trạng thái khóa chặn hoàn toàn đăng nhập và phiên cũ | Sai báo cáo thành viên/quyền; có rủi ro nếu phiên hoặc token cũ chưa bị thu hồi | **Cao, cần kiểm thử** |
| 3 tài khoản hoạt động thiếu phòng ban, 1 thiếu nhóm | Có thể không ảnh hưởng nếu các tài khoản là tài khoản kỹ thuật | Có thể sai phạm vi xem, người duyệt, báo cáo theo đơn vị hoặc bỏ sót thông báo | Cao đối với các tài khoản người thật |
| 19/19 đơn vị chưa có mã | Hầu như không ảnh hưởng giao diện hiện tại vì 1Office dùng ID nội bộ | Dễ ánh xạ sai khi import/export, đổi tên hoặc đồng bộ sang SDG ERP | Cao trước khi tích hợp; thấp trong vận hành hiện tại |
| Tổng trạng thái quan sát là 68, file HR hiện có là 67 | Không đủ bằng chứng về lỗi vận hành | Sai headcount, cấp tài khoản, giấy phép và báo cáo nếu coi tài khoản là nhân sự | Trung bình–cao |
| Chỉ 3/56 tài khoản hoạt động có email | Thấp nếu công ty không dùng email làm kênh định danh/thông báo | Hạn chế SSO, khôi phục tài khoản, thông báo và tích hợp danh tính | Trung bình |
| 52/56 có chức vụ, 53/56 có vị trí | Thấp với các quy trình chọn người cụ thể | Quy trình dựa trên vị trí/chức vụ có thể định tuyến sai hoặc cần cấu hình ngoại lệ | Trung bình |
| HCNS01 có 68 phiên bản, PC01 có 44 phiên bản | Đây là dấu hiệu hệ thống đang được điều chỉnh theo thực tế, không phải lỗi | Tích hợp hoặc báo cáo sẽ sai nếu chỉ lưu mã quy trình mà không lưu phiên bản của hồ sơ | Cao trước khi tích hợp |
| Sáu mẫu quy trình tạm dừng, trong đó có mẫu test | Không ảnh hưởng mẫu đang hoạt động | Gây nhiễu danh mục, nhầm mẫu khi báo cáo hoặc cấu hình nếu trạng thái không được lọc | Thấp |
| Chưa có cấu hình Open API, SSO hoặc OIDC quan sát được | Không ảnh hưởng cách đăng nhập/vận hành hiện tại | Tăng thao tác thủ công, phụ thuộc tài khoản riêng và cản trở đồng bộ an toàn | Trung bình về dài hạn |

Đánh giá theo nhóm tác động:

| Nhóm tác động | Mức hiện tại | Nhận định |
| :--- | :--- | :--- |
| Tính sẵn sàng và liên tục vận hành | Thấp | Không phát hiện vấn đề làm 1Office ngừng hoặc cản trở quy trình đang chạy |
| Hiệu quả xử lý công việc | Thấp–trung bình | Các hạn chế chủ yếu nằm ở báo cáo quá hạn, mobile và một số luồng nhiều người |
| Bảo mật và riêng tư | Trung bình–cao, chưa kết luận | Quyền xem toàn bộ hồ sơ nhân sự cần kiểm tra bằng tài khoản thường và theo từng trường dữ liệu |
| Toàn vẹn dữ liệu và báo cáo | Trung bình | Chênh lệch trạng thái người/tài khoản và trường tổ chức bị thiếu có thể làm sai báo cáo |
| Khả năng tích hợp SDG ERP | Cao | Thiếu mã nghiệp vụ, API và mapping phiên bản là trở ngại trực tiếp trước khi đồng bộ |
| Chi phí bảo trì tương lai | Trung bình–cao | Nhiều ngoại lệ và phiên bản quy trình đòi hỏi quản trị thay đổi rõ ràng |

Không nên sửa hàng loạt cấu hình trên hệ thống đang chạy ổn chỉ dựa trên khảo sát này. Cách xử lý phù hợp là kiểm tra có mục tiêu, chụp lại cấu hình trước thay đổi, có chủ sở hữu nghiệp vụ xác nhận và thử trên tài khoản/phạm vi nhỏ.

Thứ tự kiểm tra đề xuất:

1. Dùng tài khoản Nhân viên thông thường kiểm tra chính xác những trường hồ sơ nhân sự có thể xem; không thay đổi quyền trong bước kiểm tra.
2. Kiểm thử tài khoản khóa có bị vô hiệu hóa phiên đăng nhập, token thiết bị và quyền truy cập hay không.
3. Xác minh 3 tài khoản thiếu phòng ban và 1 tài khoản thiếu nhóm là tài khoản kỹ thuật hay dữ liệu thiếu.
4. HCNS xác nhận trạng thái làm việc của 11 người có tài khoản khóa và hồ sơ chưa có tài khoản; không suy trạng thái nhân sự từ trạng thái account.
5. Chỉ chuẩn hóa mã đơn vị và mapping quy trình khi bắt đầu tích hợp; không đổi ID hoặc tên đang được quy trình sử dụng nếu chưa phân tích phụ thuộc.

## 3. Danh mục quy trình tự động

Hệ thống có 34 mẫu, gồm 28 mẫu hoạt động và 6 mẫu tạm dừng. Tổng lượt chạy hiển thị ở các mẫu có số liệu là 1.111; 5 mẫu hiển thị `--`, nên con số này là mức tối thiểu, không phải tổng chính thức.

| Mã | Tên | Trạng thái | Lượt chạy |
| :--- | :--- | :--- | ---: |
| -- | QT HD - Bàn giao đất | Hoạt động | -- |
| BQL XLKN | Xử lý khiếu nại khách hàng | Hoạt động | 0 |
| KT02 | Quy trình xử lý công nợ khách hàng | Hoạt động | -- |
| BQL14 | Luân chuyển hồ sơ nhà thầu | Hoạt động | 16 |
| -- | [TEST] Soạn thảo, thẩm định, quản lý hợp đồng | Tạm dừng | -- |
| -- | {TEST VỚI BQLDA} Trình ký đề xuất và phối hợp triển khai | Tạm dừng | 2 |
| -- | {TEST VỚI BQLDA} Soạn thảo, thẩm định, quản lý hợp đồng | Tạm dừng | 0 |
| -- | {Test ký số} Soạn thảo, thẩm định, quản lý hợp đồng | Tạm dừng | 1 |
| -- | {Test ký số} Trình ký đề xuất và phối hợp triển khai | Tạm dừng | 5 |
| HCNS08 | Báo hỏng xe ô tô | Hoạt động | 15 |
| HCNS07 | Xử lý công văn đến | Hoạt động | 42 |
| NP02 | Nghỉ phép trưởng phòng | Hoạt động | 20 |
| HCNS06 | Ký số token | Hoạt động | 13 |
| HCNS05 | Gọi xe taxi | Hoạt động | 56 |
| HCNS04 | Đặt hoa - quà tiếp khách | Hoạt động | 49 |
| HCNS03 | Công tác | Hoạt động | 1 |
| VPP03 | Cấp phát văn phòng phẩm bổ sung cho HCNS | Hoạt động | 1 |
| VPP02 | Cấp phát văn phòng phẩm bổ sung cho phòng ban khác | Hoạt động | 3 |
| HCNS02 | Gửi chuyển phát nhanh | Hoạt động | 328 |
| BQL11.2 | Quản lý khách hàng KCN - quản lý xây dựng | Hoạt động | 5 |
| BQL16 | Xử lý, khắc phục sự cố hạ tầng KCN | Hoạt động | 4 |
| BQL11.1 | Quản lý khách hàng KCN - bàn giao đất | Hoạt động | 5 |
| BQL13 | Cấp phát bảo hộ lao động | Hoạt động | 3 |
| KHĐT01 | Phối hợp Phòng KHĐT và Ban QLDA | Hoạt động | 1 |
| KHĐT03 | Lựa chọn nhà thầu | Hoạt động | 1 |
| KHĐT02 | Quản lý dự án | Hoạt động | -- |
| KHĐT06 | Đàm phán, thương thảo và ký kết hợp đồng | Hoạt động | 19 |
| KHĐT05 | Giải quyết sự không phù hợp trong thi công | Hoạt động | -- |
| VPP01 | Cấp phát văn phòng phẩm | Hoạt động | 11 |
| NP01 | Nghỉ phép phó phòng và nhân viên | Hoạt động | 174 |
| CSKH01 | Chăm sóc khách hàng | Hoạt động | 3 |
| PC01 | Soạn thảo, thẩm định, quản lý hợp đồng | Hoạt động | 184 |
| QTTT | Thanh toán | Tạm dừng | 1 |
| HCNS01 | Trình ký đề xuất và phối hợp triển khai | Hoạt động | 148 |

## 4. Cấu trúc sâu và tri thức ngầm trong quy trình

Mỗi mẫu không chỉ là một danh sách bước. Nó có mã, nhóm quy trình, trạng thái, phiên bản dùng thật, lịch sử chạy, biểu mẫu tùy chỉnh, tệp đính kèm, báo cáo và sơ đồ node. Các sơ đồ quan sát được có các loại node: bắt đầu thủ công, tạo công việc, hành động, xác nhận, điều kiện, chờ đồng thời, đổi trạng thái, ký nháy, ký số, hoàn thành và nhánh thành công/thất bại.

Hai quy trình lõi đã thay đổi rất nhiều:

- HCNS01 đang ở phiên bản 68.0.
- PC01 đang ở phiên bản 44.0, có 19 trường biểu mẫu tùy chỉnh.

PC01 thể hiện rõ tri thức ngầm mà sơ đồ tổ chức không cho biết: soạn thảo; thẩm định pháp lý và kế toán; thương thảo; chọn thẩm định lại pháp lý, kế toán hoặc cả hai; trưởng phòng duyệt; các bên duyệt lại đồng thời; xác nhận kế toán; ký nháy; ký số; bàn giao và lưu trữ. Thời hạn cấu hình khác nhau theo bước, thường 1–2 ngày cho thẩm định/duyệt.

Các quy ước có thể suy ra, nhưng phải được nghiệp vụ xác nhận:

- Tiền tố mã biểu thị chủ sở hữu hoặc nhóm nghiệp vụ: `HCNS`, `NP`, `VPP`, `BQL`, `KHĐT`, `PC`, `CSKH`.
- Chức danh không quyết định toàn bộ quyền. Người thực hiện có thể được lấy từ người tạo hồ sơ, quản lý trực tiếp, phòng ban, nhóm, người được chọn trên form hoặc kết quả bước trước.
- Nhánh trả lại, sửa lại và thẩm định lại là nghiệp vụ thật; mô hình dữ liệu không được giả định quy trình luôn đi tuyến tính.
- Phiên bản quy trình là dữ liệu bắt buộc. Một hồ sơ đang chạy phải giữ phiên bản lúc khởi tạo, không tự chuyển sang thiết kế mới.
- Trường form, tệp, chữ ký và lịch sử hành động là một phần của hồ sơ chứng minh, không chỉ là giao diện.
- Các mẫu `[TEST]` đang tạm dừng vẫn có lịch sử và phải được lưu trong danh mục, nhưng loại khỏi danh sách mẫu khởi tạo mới.

Trình duyệt chỉ kết xuất đầy đủ node cho một phần sơ đồ động. Đợt khảo sát đã đọc sâu các sơ đồ HCNS01, PC01, HCNS03, KHĐT01 và KHĐT05; những mẫu còn lại cần xuất cấu hình chính thức hoặc API từ 1Office để thu đủ cạnh nối, biểu thức điều kiện và quy tắc chọn người.

## 5. Mô hình dữ liệu tích hợp đề xuất

| Thực thể SDG ERP | Trường khóa tối thiểu | Nguồn/chủ sở hữu |
| :--- | :--- | :--- |
| `OrganizationUnit` | `id`, `code`, `name`, `parentId`, `type`, `status`, `effectiveFrom/To` | HCNS chốt; mapping sang ID 1Office |
| `Person` | mã nhân sự ổn định, họ tên, trạng thái | HCNS |
| `Employment` | người, công ty, đơn vị, vị trí, quản lý, hiệu lực | HCNS + trưởng đơn vị |
| `ExternalAccount` | hệ thống, external ID, username, trạng thái, person ID | 1Office/IT |
| `PermissionGroup` | external ID, tên, gói ứng dụng, trạng thái | 1Office/IT |
| `GroupMembership` | account ID, group ID, hiệu lực | 1Office/IT |
| `AuthorityAssignment` | phạm vi, hành động, hạn mức, người/nhóm, hiệu lực | Lãnh đạo + chủ quy trình |
| `WorkflowDefinition` | external ID, code, name, owner, status | 1Office |
| `WorkflowVersion` | definition ID, version, publishedAt, status | 1Office |
| `WorkflowNode` | version ID, external node ID, type, name, SLA | 1Office |
| `WorkflowTransition` | from/to node, action, condition | 1Office |
| `WorkflowFormField` | version/node, key, label, type, required, sensitivity | 1Office + chủ quy trình |
| `WorkflowInstanceRef` | external ID, definition/version, status, deep link | 1Office; SDG ERP chỉ tham chiếu |
| `ExternalMapping` | system, entity type, external ID, internal ID | SDG ERP |
| `SyncRun`/`SyncError` | nguồn, mốc thời gian, checksum, kết quả, lỗi | SDG ERP/IT |

SDG ERP chỉ nên lưu bản sao cần thiết cho tìm kiếm, đối soát và báo cáo. Nội dung hồ sơ, phê duyệt, chữ ký và lịch sử quy trình tiếp tục thuộc 1Office, trừ khi công ty có quyết định thay đổi hệ thống nguồn.

## 6. Phân vai tính năng

### Giữ và cấu hình tiếp trên 1Office

- Công việc, dự án, quy trình tự động, phê duyệt, ký số, lịch và lịch sử xử lý.
- Phiên bản thiết kế quy trình, biểu mẫu và quy tắc chọn người.
- Nhóm quyền gắn với các gói ứng dụng đang mua.

### SDG ERP nên bổ sung

1. **Danh mục chuẩn và đối soát:** mã tổ chức, vị trí, nhân sự, tuyến quản lý; dashboard phát hiện thiếu mã, sai đơn vị, tài khoản mồ côi và chênh lệch trạng thái.
2. **Bản đồ quyền:** so sánh quyền thực tế giữa nhóm, phát hiện quyền nhạy cảm và hỗ trợ đợt xác nhận quyền định kỳ.
3. **Danh mục quy trình:** tra cứu mẫu, chủ sở hữu, phiên bản, SLA, trường form và liên kết sâu sang 1Office; không chạy một workflow engine thứ hai.
4. **Phân tích quy trình:** thời gian chờ theo bước, nút thắt, hồ sơ quá hạn, vòng trả lại và công việc con quá hạn nếu API cung cấp dữ liệu.
5. **GIS/3D và vận hành KCN:** tài sản hạ tầng, vị trí, sự cố, kiểm tra hiện trường; mỗi hồ sơ có thể liên kết tới một quy trình 1Office để giao việc và phê duyệt.
6. **Quản trị tích hợp:** mapping ID, nhật ký sync, checksum, hàng đợi lỗi, đối soát và cảnh báo dữ liệu.

### Chưa xây

- Workflow engine, ký số, danh sách công việc hoặc lịch mới cạnh tranh trực tiếp với 1Office.
- Đồng bộ hai chiều trước khi có API, sandbox, chủ sở hữu trường dữ liệu và quy tắc xử lý xung đột.
- Suy ra quyền phê duyệt từ chức danh hoặc tên nhóm.

### 6.1 Tính năng 1Office nên khai thác thêm

Không nên bật một phân hệ chỉ vì đã có trong gói dịch vụ. Mỗi phân hệ chỉ nên được đưa vào sử dụng khi có chủ sở hữu, dữ liệu nguồn, quy trình vận hành và tiêu chí nghiệm thu.

| Tính năng | Khuyến nghị | Phạm vi phù hợp | Điều kiện trước khi triển khai |
| :--- | :--- | :--- | :--- |
| Tài liệu công ty | **Nên triển khai sớm** | Quy chế, quy trình, biểu mẫu chuẩn, quyết định đang hiệu lực | Phân loại tài liệu, chủ sở hữu, phiên bản, ngày hiệu lực và quyền xem |
| Văn bản đến | **Nên kết hợp với HCNS07** | Sổ văn bản, số đến, nơi gửi, hạn xử lý và lưu bản gốc | Chọn một điểm nhập duy nhất; không nhập lại cả module và form quy trình |
| Báo cáo/Dashboard | **Nên mở rộng** | Quá hạn theo bước, khối lượng theo đơn vị, vòng trả lại, SLA | Chuẩn hóa chỉ số; xác nhận API/export và người được xem |
| Tài sản | **Nên pilot cho tài sản văn phòng phổ thông** | Máy tính, màn hình, máy in, thiết bị văn phòng, bàn giao người sử dụng | So sánh trường dữ liệu, QR, lịch sử bàn giao và khả năng export/API |
| Tuyển dụng | **Có thể dùng thay vì xây mới** | Yêu cầu tuyển, ứng viên, phỏng vấn, offer | HCNS xác nhận nhu cầu và quy trình hiện tại; chạy pilot một vị trí |
| Đào tạo | **Có thể dùng** | Kế hoạch, khóa học, học viên và kết quả hoàn thành | Chốt danh mục năng lực/chứng chỉ và nhu cầu báo cáo |
| Đánh giá/KPI/OKR | **Đánh giá trước khi bật** | Chu kỳ mục tiêu và đánh giá nếu lãnh đạo có phương pháp thống nhất | Không triển khai khi chưa có khung chỉ tiêu và chủ sở hữu; tránh số hóa một quy trình chưa chốt |
| CRM | **Nên đánh giá khai thác sâu hơn** | Khách hàng, nhà đầu tư, liên hệ, cơ hội và lịch sử chăm sóc | Xác định nguồn khách hàng chính, chống trùng và phân quyền thương mại |
| SSO/OIDC | **Nên làm việc với 1Office để kích hoạt** | Đăng nhập tập trung và vòng đời tài khoản | Có nhà cung cấp danh tính, MFA, quy trình khóa tài khoản và môi trường test |
| Open API/Webhook | **Ưu tiên cao cho tích hợp** | Đồng bộ danh mục, deep link và báo cáo | Tài liệu chính thức, phạm vi quyền tối thiểu, rate limit, sandbox và log |
| Tri thức/1Assistant | **Chỉ pilot sau khi có kho tài liệu sạch** | Tra cứu quy chế và hướng dẫn nội bộ | Phân quyền theo tài liệu, kiểm soát dữ liệu nhạy cảm và đánh giá câu trả lời |

Các module bảng lương, tài chính, mua hàng và kho hàng không nên triển khai chỉ để lấp chỗ trống. Trước tiên phải xác nhận công ty đang dùng phần mềm kế toán/kho nào, nghĩa vụ pháp lý, khả năng đối soát và chi phí chuyển đổi.

### 6.2 Tính năng và cấu hình nên rút gọn

| Phạm vi | Hiện trạng | Phương án rút gọn |
| :--- | :--- | :--- |
| Mẫu test hợp đồng/đề xuất | Nhiều bản `[TEST]`, `{Test ký số}`, `{TEST VỚI BQLDA}` đang tạm dừng | Chuyển vào nhóm lưu trữ/test, ẩn khỏi danh sách khởi tạo mới; giữ lịch sử |
| Nghỉ phép NP01 và NP02 | Tách nhân viên/phó phòng và trưởng phòng | Xem xét một mẫu có nhánh theo cấp quản lý; chỉ hợp nhất nếu SLA, người duyệt và chính sách giống nhau |
| Văn phòng phẩm VPP01/VPP02/VPP03 | Ba mẫu cho cấp phát thường, bổ sung HCNS và bổ sung đơn vị khác | Dùng một form có loại yêu cầu và nhánh phòng ban nếu biểu mẫu/chứng từ không khác đáng kể |
| Văn bản đến | Có quy trình HCNS07 trong khi module Văn bản đến đang trống | Module giữ sổ và metadata; workflow chỉ luân chuyển xử lý. Một văn bản chỉ nhập một lần |
| Nghỉ phép/đề xuất | Quy trình tự động đang có dữ liệu, module Đơn từ/Phê duyệt trống | Tiếp tục dùng quy trình hiện hữu; không bật thêm module cho cùng loại hồ sơ nếu chưa có kế hoạch migration |
| Nhóm HR | Hai nhóm chuyên trách không có thành viên, quyền HR lại nằm ở nhóm khác | Thiết kế lại ma trận quyền, chọn nhóm chính thức rồi ngừng cấp mới vào nhóm dư; chưa xóa vì còn lịch sử |
| Nhóm/tài khoản cũ | Thành viên khóa hoặc đã xóa còn xuất hiện trong nhóm | Tách quyền hiện hành khỏi lịch sử; báo cáo mặc định chỉ tính tài khoản hiệu lực |
| Báo cáo tùy biến | Nhiều nhu cầu đang giải quyết bằng export thủ công | Chuẩn hóa một bộ KPI và bộ lọc dùng chung thay vì tạo nhiều báo cáo gần giống nhau |

Việc hợp nhất quy trình phải dựa trên so sánh node, điều kiện, form, SLA và người duyệt. Tên gần giống nhau chưa đủ để kết luận hai mẫu là thừa.

### 6.3 Phần đang trùng hoặc có nguy cơ làm thừa

Những phần dưới đây không nhất thiết sai, nhưng đang tạo hoặc có nguy cơ tạo hai nơi thực hiện cùng một việc:

1. **Các mẫu quy trình test đã tạm dừng:** không còn phục vụ khởi tạo hồ sơ mới nhưng vẫn làm danh mục khó đọc.
2. **Ba quy trình văn phòng phẩm:** có khả năng là ba biến thể của cùng một yêu cầu.
3. **Hai quy trình nghỉ phép theo cấp bậc:** có thể thay bằng điều kiện chức vụ/tuyến quản lý nếu chính sách cho phép.
4. **HCNS07 và module Văn bản đến:** sẽ bị trùng nếu cùng lưu một bộ metadata độc lập.
5. **Quy trình nghỉ phép/đề xuất và module Đơn từ/Phê duyệt:** không nên vận hành đồng thời cho cùng loại yêu cầu.
6. **Danh mục nhân sự/phòng ban trong SDG ERP:** hiện đang lặp dữ liệu 1Office và file Excel; phải chuyển thành bản sao có mapping từ nguồn chuẩn 1Office và không cho sửa độc lập làm phát sinh sai lệch.
7. **Xây thêm công việc, dự án, workflow hoặc ký số trong SDG ERP:** sẽ lặp lại phần 1Office đang có dữ liệu và người dùng thật.

### 6.4 Tính năng nên giao cho SDG ERP

| Tính năng | Vì sao phù hợp với SDG ERP | Quan hệ với 1Office |
| :--- | :--- | :--- |
| Danh mục chuẩn và mapping ID | 1Office thiếu mã nghiệp vụ; SDG cần đối chiếu nhiều nguồn | Chỉ đọc ID 1Office, không đổi ID nguồn |
| Dashboard chất lượng dữ liệu | Cần phát hiện thiếu mã, trùng người, tài khoản mồ côi và sai trạng thái | Nhận export/API định kỳ, trả báo cáo cho IT/HCNS |
| Bản đồ 3D văn phòng | Đặc thù không gian của dự án hiện tại | Deep link tới hồ sơ 1Office, không sao chép dữ liệu nhạy cảm |
| GIS hạ tầng KCN | Quản lý tuyến điện, nước, thoát nước, PCCC, đường, cây xanh và mốc giới | Sự cố/đề xuất tạo hoặc liên kết quy trình 1Office |
| Tài sản hạ tầng và IoT | Cần tọa độ, topology, thông số kỹ thuật, cảm biến và lịch bảo trì chuyên ngành | 1Office xử lý giao việc/phê duyệt; SDG giữ hồ sơ kỹ thuật |
| Biên bản hiện trường | Cần ảnh, vị trí bản đồ, đối tượng hạ tầng và lịch sử khắc phục | Liên kết BQL16 hoặc quy trình liên quan |
| Quản trị tích hợp | Mapping, checksum, sync run, lỗi, thử lại và đối soát | Kết nối API/webhook chính thức của 1Office |
| Phân tích quy trình liên hệ thống | Tổng hợp SLA, nút thắt, vòng trả lại và công việc con quá hạn | Chỉ đọc dữ liệu quy trình; người dùng xử lý tại 1Office |
| Danh mục quyền và chiến dịch xác nhận quyền | So sánh quyền giữa hệ thống và lưu bằng chứng xác nhận định kỳ | Không tự ghi quyền ngược khi chưa được phê duyệt |

Tài sản văn phòng là vùng cần chọn một hệ thống duy nhất sau pilot. Nếu module Tài sản 1Office đáp ứng mã tài sản, bàn giao, QR, bảo hành và API thì dùng 1Office. SDG ERP chỉ quản lý tài sản chuyên ngành có bản đồ, quan hệ mạng hoặc dữ liệu cảm biến.

### 6.5 Danh mục quyết định đề xuất

| Quyết định | Phân hệ |
| :--- | :--- |
| **Giữ nguyên và khai thác sâu** | Công việc, dự án, quy trình, ký số, lịch, hồ sơ nhân sự, CRM hiện hữu |
| **Kích hoạt có pilot** | Tài liệu công ty, Văn bản đến, Báo cáo, Tài sản văn phòng, Tuyển dụng, Đào tạo |
| **Chờ phương pháp/chủ sở hữu** | KPI, OKR, Đánh giá, Tri thức/AI |
| **Chờ đánh giá hệ thống chuyên ngành** | Bảng lương, Tài chính, Mua hàng, Kho |
| **Rút gọn/ẩn khỏi vận hành mới** | Mẫu test tạm dừng, quy trình VPP/nghỉ phép trùng sau khi đối chiếu |
| **Phát triển tại SDG ERP** | Master data/mapping, data quality, 3D, GIS, hạ tầng/IoT, hiện trường, tích hợp và phân tích hợp nhất |

### 6.6 Đánh giá độ chắc chắn của danh sách

Danh sách trên là bản phân loại chiến lược ban đầu, không phải quyết định triển khai cuối cùng. Mức độ chắc chắn được đánh giá như sau:

| Nhóm đề xuất | Độ chắc chắn | Cơ sở | Việc còn phải xác minh |
| :--- | :--- | :--- | :--- |
| Giữ Công việc, Dự án, Quy trình, Ký số và Lịch trên 1Office | **Cao** | Có người dùng, dữ liệu và lịch sử vận hành thực tế | SLA, pain point và chi phí theo từng phòng ban |
| Không xây workflow/ký số thứ hai trong SDG ERP | **Cao** | Sẽ tạo hai nơi xử lý và hai lịch sử pháp lý/nghiệp vụ | Cơ chế deep link, API và báo cáo liên hệ thống |
| SDG ERP phát triển 3D, GIS và vận hành hạ tầng KCN | **Cao** | Là nghiệp vụ không gian và kỹ thuật chuyên ngành, chưa thấy năng lực tương đương trên 1Office | Phạm vi tài sản, bản đồ nền, chủ sở hữu và dữ liệu đầu vào |
| SDG ERP quản lý mapping và chất lượng dữ liệu | **Cao** | Dữ liệu hiện có thiếu mã và có chênh lệch giữa hồ sơ/tài khoản | Hệ thống nguồn cuối cùng và chu kỳ đồng bộ |
| Dùng Tài liệu công ty và Báo cáo của 1Office | **Trung bình–cao** | Module sẵn có, phù hợp với dữ liệu và quy trình đã chạy | Quyền, versioning, tìm kiếm và khả năng export |
| Kết hợp Văn bản đến với HCNS07 | **Trung bình** | Có workflow hoạt động nhưng module sổ văn bản đang trống | Khả năng liên kết một bản ghi với workflow mà không nhập hai lần |
| Dùng 1Office cho tài sản văn phòng | **Trung bình** | Module có sẵn nhưng chưa có dữ liệu để chứng minh mức đáp ứng | QR, bàn giao, bảo hành, lịch sử, API và báo cáo |
| Dùng 1Office cho tuyển dụng và đào tạo | **Trung bình** | Phù hợp chức năng chuẩn, chưa có dữ liệu sử dụng | Quy trình thật, giấy tờ, báo cáo và nhu cầu tích hợp |
| Khai thác CRM sâu hơn | **Trung bình** | Có nhóm Enterprise và quyền CRM nhưng dữ liệu quan sát còn ít | Đội ngũ sử dụng, nguồn khách hàng và quy trình bán hàng thực tế |
| Hợp nhất NP01/NP02 và VPP01/VPP02/VPP03 | **Thấp–trung bình** | Tên và mục đích gần nhau | Phải so sánh node, form, SLA, chứng từ và người duyệt trước khi quyết định |
| Bật KPI, OKR, Đánh giá hoặc AI/Tri thức | **Thấp ở thời điểm hiện tại** | Chưa thấy dữ liệu và chưa có bằng chứng về phương pháp quản trị đã chốt | Chủ sở hữu, quy chế, dữ liệu sạch, quyền và tiêu chí thành công |
| Dùng 1Office cho lương, tài chính, mua hàng và kho | **Chưa đủ cơ sở** | Màn hình đang trống; có thể công ty dùng hệ thống khác | Hệ thống hiện hữu, yêu cầu pháp lý/kế toán, tích hợp và chi phí chuyển đổi |

Các đề xuất có độ chắc chắn cao có thể dùng làm nguyên tắc kiến trúc ngay. Đề xuất mức trung bình chỉ được chuyển thành kế hoạch sau một pilot. Đề xuất mức thấp phải bắt đầu bằng phỏng vấn chủ sở hữu nghiệp vụ và quan sát quy trình thật.

### 6.7 Khung nghiên cứu sâu từng tính năng 1Office

Mỗi phân hệ cần một phiếu khảo sát thống nhất gồm:

1. Chủ sở hữu nghiệp vụ và người quản trị cấu hình.
2. Nhóm người dùng, tần suất và khối lượng dữ liệu.
3. Quy trình trước/sau, đầu vào, đầu ra và ngoại lệ.
4. Trường dữ liệu bắt buộc, dữ liệu nhạy cảm và thời hạn lưu trữ.
5. Quyền xem, tạo, sửa, duyệt, xuất và quản lý.
6. Vấn đề thực tế, ticket đã phát sinh và thao tác đang làm ngoài hệ thống.
7. Khả năng cấu hình, import/export, API, webhook và deep link.
8. Chất lượng báo cáo, khả năng truy vết và yêu cầu kiểm toán.
9. Mức trùng với phần mềm khác hoặc với module/quy trình khác trong 1Office.
10. Quyết định đề xuất: giữ nguyên, tối ưu, pilot, hợp nhất, lưu trữ, không dùng hoặc giao SDG ERP.

Kết quả nghiên cứu mỗi phân hệ phải có bằng chứng màn hình/export, ý kiến người dùng, xác nhận chủ sở hữu và tiêu chí đo trước/sau. Không đánh giá chỉ dựa trên việc màn hình đang trống hoặc tên tính năng.

## 7. Thứ tự thực hiện

1. Lấy snapshot/export 1Office tại thời điểm chốt cho cơ cấu, người, vị trí, quản lý trực tiếp, kiêm nhiệm và trạng thái làm việc; ghi nhận ngoại lệ để tìm hiểu dần.
2. IT cùng HCNS rà soát quyền xem toàn bộ hồ sơ nhân sự và các thành viên khóa/đã xóa trong nhóm.
3. Gửi 1Office yêu cầu tài liệu API/webhook, export cấu hình quy trình, backup và môi trường test.
4. Tạo bảng mapping chỉ đọc từ SDG ERP tới ID 1Office; nhập thử bốn export trong môi trường test.
5. Xây dashboard chất lượng dữ liệu và danh mục quy trình có deep link.
6. Chọn pilot khác biệt: bản đồ tài sản/sự cố KCN liên kết tới quy trình 1Office BQL16 hoặc danh bạ không gian 3D.

## 8. Điểm cần xác nhận

- ID nội bộ ổn định của công ty, phòng ban, người dùng, hồ sơ nhân sự, nhóm và mẫu quy trình.
- Ý nghĩa chính thức của ký hiệu ngôi sao ở tài khoản và quy tắc cấp/thu hồi chữ ký số.
- Trạng thái làm việc chính thức của 11 người có tài khoản khóa và hồ sơ Vũ Văn Khoa mã 71 chưa có tài khoản.
- Lý do nhóm HR chuyên trách không có thành viên và nhóm nào đang thực sự chịu trách nhiệm HR.
- Phạm vi người dùng được phép xem hồ sơ nhân sự; quyền hiện tại có chủ ý hay cấu hình dư thừa.
- Chủ sở hữu, phiên bản hiệu lực và SLA của từng quy trình.
- Cách xuất toàn bộ node, cạnh nối, điều kiện, trường form và mapping người thực hiện qua API hoặc gói cấu hình.
- Chính sách lưu trữ đối với tài khoản khóa, đã xóa và dữ liệu của nhân sự nghỉ việc.

Thiết kế đối chiếu chi tiết, mapping 18 đơn vị và phương án RBAC nằm tại [Đồng bộ Master Data và phân quyền SDG ERP–1Office](./DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md).
