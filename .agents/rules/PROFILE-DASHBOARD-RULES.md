# QUY TẮC TÀI KHOẢN MẶC ĐỊNH VÀ KHÔNG GIAN CÁ NHÂN

Nghiệp vụ hiện hành; tiến độ và thiết kế DB tại [Plan cá nhân](../../docs/plans/PROFILE-DASHBOARD-CHECKLIST.md), bố cục/luồng chi tiết tại [Thiết kế cá nhân](../../docs/THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md).

## Tài khoản và mật khẩu

- Dashboard/profile là khả năng nền của mọi tài khoản hợp lệ, không cần HR hoặc tên role đặc biệt. DEFAULT không có grant nghiệp vụ, không cho sửa/xóa hoặc cấp grant vào nhóm; muốn thêm quyền phải dùng role khác.
- Tạo tài khoản không chọn role dùng DEFAULT. Username/mật khẩu có thể tự sinh, không bắt nhập ở form cơ bản; mục nâng cao tùy chọn. Tên theo tên cuối + chữ đầu họ/đệm, bỏ dấu/viết thường, trùng thêm số; chi tiết và ví dụ tại thiết kế. Không tự tạo hàng loạt hoặc đổi tài khoản hiện có.
- Cấp kèm hồ sơ theo quyền ở [rule HR](HR-RULES.md); lưu người/tài khoản/role/audit nguyên tử. Sau lưu giữ màn hình bàn giao mật khẩu một lần tới khi người cấp đóng, không lưu credential vào localStorage/log/audit. Ô mật khẩu cấp tài khoản tại Nhân sự và Tài khoản có nút con mắt hiện/ẩn; mặc định ẩn, không đổi giá trị hoặc gửi form khi bấm.
- Tài khoản cấp mới tại Nhân sự/Tài khoản phải đổi mật khẩu khởi tạo ở lần đăng nhập đầu, dù mật khẩu do admin nhập hay tự sinh; admin reset cũng cấp mật khẩu tạm và bật lại yêu cầu đổi. Seed chỉ bật cờ khi tạo mới tài khoản quản trị, không đổi tài khoản đã có. Không ép đổi lại sau mỗi lần đăng nhập hoặc khi chỉ sửa tên/quyền; giữ cờ hiện tại của tài khoản cũ. `getSession()` mặc định chặn nghiệp vụ khi cờ còn bật; chỉ profile/đổi mật khẩu/logout và layout dùng `allowPasswordChange`. Actor trong transaction cũng kiểm tra, không chỉ dựa vào JWT/middleware. Đổi thành công mới vào hệ thống.
- Admin reset phải thu hồi phiên cũ. Tự đổi mật khẩu phải xác minh mật khẩu hiện tại, nhập lại khớp và đủ độ dài; cho phép mật khẩu mới trùng mật khẩu hiện tại, kể cả mật khẩu tạm; chỉ sau khi lưu thành công mới tăng phiên bản phiên, tắt cờ bắt buộc và cấp cookie mới cho phiên hiện tại. Phiên cũ hết hiệu lực; mật khẩu và phiên của tài khoản khác cùng người giữ nguyên.

## Profile và ảnh đại diện

- Action lấy người/tài khoản/công ty từ phiên, không nhận ID chủ hồ sơ từ client. Đối với hồ sơ nhân sự, chỉ tự sửa liên hệ (điện thoại/email/địa chỉ) và ảnh; không sửa dữ liệu HR khác, cơ cấu, trạng thái hay quyền. Cài đặt AI của tài khoản được quản lý riêng bên dưới. Không trả ghi chú HR hoặc metadata nhập liệu.
- Tài khoản hệ thống không gắn nhân sự vẫn đổi mật khẩu được; không tạo người giả hoặc cho tự gắn tài khoản sang người khác. Tài khoản khóa/người LEFT bị chặn theo rule HR.
- Avatar upload qua Server Action: sharp giải mã JPEG/PNG/WebP (tối đa 2 MB, 16 triệu pixel), chuẩn hóa WebP, bỏ metadata, tên file server sinh, lưu ngoài public/Git. Không nhận URL tùy ý. Chỉ bỏ ảnh cũ sau commit, dọn ảnh mới khi rollback.
- GET `/media/avatar/[file]` chỉ đọc ảnh: phiên hợp lệ và chủ ảnh hoặc HR VIEW cùng công ty; khi buộc đổi mật khẩu chỉ đọc ảnh của mình, không cache công khai. Mutation vẫn dùng Server Action.

- Profile có hộp “Cài đặt trợ lý AI”: tài khoản tự sửa bối cảnh/cách trả lời (tối đa 2.000 ký tự), xóa về mặc định, lưu có phiên bản và audit không chứa nội dung. Áp dụng từ lượt chat kế tiếp; không cấp quyền AI, không tự lưu thông tin rút ra từ chat. Thiết kế và kiểm thử do [plan AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#lịch-sử-bối-cảnh-chat-và-cá-nhân-hóa--triển-khai-16112026) sở hữu.

## Dashboard và điều hướng cá nhân

- Dashboard là bàn làm việc của người đăng nhập, không mặc định dùng thống kê HR toàn công ty. Số đếm và danh sách cùng phạm vi quyền, đếm trên toàn bộ tập phù hợp, độc lập giới hạn 200 dòng của workspace; danh sách cá nhân phân trang 10 hồ sơ.
- Hiển thị việc chờ duyệt/thực hiện theo quyền và người được giao, yêu cầu của mình (nháp/đang xử lý/kết quả 30 ngày). Hồ sơ tạm dừng toàn công ty chỉ dành cho MANAGE và ghi rõ là điều phối, không gộp vào việc cá nhân.
- Điểm vào `/` mang tên Bàn làm việc. Mọi tài khoản hợp lệ, gồm DEFAULT, dùng tab Trợ lý AI mặc định; tab Việc của tôi chứa Công việc AI, Quy trình và khu yêu cầu hỗ trợ. Số việc, thông báo và thao tác hỗ trợ tại tab này hiển thị theo SUPPORT_TASK, chi tiết theo [plan Công việc](../../docs/plans/TASK-MANAGEMENT-CHECKLIST.md). Chat/tệp riêng là khả năng nền; công cụ ERP và workflow theo quyền tài khoản, không tự cấp grant nghiệp vụ.
- Giữ tiêu đề gọn; không lặp banner chào/avatar/ngày, card số liệu, biểu đồ nhóm workflow hoặc lối tắt đã có ở menu. Workflow dùng bộ lọc kèm số đếm và danh sách trạng thái; không cộng nhóm chồng lấn. Điều phối công ty có nhãn riêng. Bố cục AI và tiêu chí tại [plan AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#đề-xuất-dashboard-là-không-gian-làm-việc-với-agent--17112026).
- Đổi tab/bộ lọc/phân trang không unmount hội thoại, mất bản nhập hoặc bản nháp. Giữ tham số hội thoại, bộ lọc và trang trên URL; đọc dữ liệu workflow ở server theo quyền hiện hành. Không hiện tìm kiếm/chuông thông báo chưa có chức năng.
- Thông báo và ưu tiên việc đến lượt của workflow mở rộng là định hướng, chỉ hiển thị khi có dữ liệu thật; việc đến lượt phải dựa trên trạng thái bước và quyền server, không lấy số thông báo làm quyền thao tác.
