# QUY TẮC TÀI KHOẢN MẶC ĐỊNH VÀ KHÔNG GIAN CÁ NHÂN

Nghiệp vụ hiện hành; tiến độ và thiết kế DB tại [Plan cá nhân](../../docs/plans/PROFILE-DASHBOARD-CHECKLIST.md), bố cục/luồng chi tiết tại [Thiết kế cá nhân](../../docs/THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md).

## Tài khoản và mật khẩu

- Dashboard/profile là khả năng nền của mọi tài khoản hợp lệ, không cần HR hoặc tên role đặc biệt. DEFAULT không có grant nghiệp vụ, không cho sửa/xóa hoặc cấp grant vào nhóm; muốn thêm quyền phải dùng role khác.
- Tạo tài khoản không chọn role dùng DEFAULT. Username/mật khẩu có thể tự sinh, không bắt nhập ở form cơ bản; mục nâng cao tùy chọn. Tên theo tên cuối + chữ đầu họ/đệm, bỏ dấu/viết thường, trùng thêm số; chi tiết và ví dụ tại thiết kế. Không tự tạo hàng loạt hoặc đổi tài khoản hiện có.
- Cấp kèm hồ sơ theo quyền ở [rule HR](HR-RULES.md); lưu người/tài khoản/role/audit nguyên tử. Sau lưu giữ màn hình bàn giao mật khẩu một lần tới khi người cấp đóng, không lưu credential vào localStorage/log/audit. Ô mật khẩu cấp tài khoản tại Nhân sự và Tài khoản có nút con mắt hiện/ẩn; mặc định ẩn, không đổi giá trị hoặc gửi form khi bấm.
- Tài khoản mới tại cả Nhân sự và Tài khoản không bắt đổi mật khẩu lần đầu, áp dụng cho mật khẩu tự nhập hoặc tự sinh. Người dùng tự đổi tại Hồ sơ của tôi khi cần. Quản trị viên reset mật khẩu tài khoản đã có vẫn bật cờ bắt buộc; không tự xóa cờ của tài khoản cũ. `getSession()` mặc định chặn nghiệp vụ khi cờ còn bật; chỉ profile/đổi mật khẩu/logout và layout dùng `allowPasswordChange`. Actor trong transaction cũng kiểm tra, không chỉ dựa vào JWT/middleware. Đổi xong mới vào dashboard.
- Đổi mật khẩu phải xác minh mật khẩu hiện tại, tăng phiên bản phiên, tắt cờ bắt buộc và cấp cookie mới cho phiên hiện tại. Phiên cũ hết hiệu lực; mật khẩu và phiên của tài khoản khác cùng người giữ nguyên.

## Profile và ảnh đại diện

- Action lấy người/tài khoản/công ty từ phiên, không nhận ID chủ hồ sơ từ client. Đối với hồ sơ nhân sự, chỉ tự sửa liên hệ (điện thoại/email/địa chỉ) và ảnh; không sửa dữ liệu HR khác, cơ cấu, trạng thái hay quyền. Cài đặt AI của tài khoản được quản lý riêng bên dưới. Không trả ghi chú HR hoặc metadata nhập liệu.
- Tài khoản hệ thống không gắn nhân sự vẫn đổi mật khẩu được; không tạo người giả hoặc cho tự gắn tài khoản sang người khác. Tài khoản khóa/người LEFT bị chặn theo rule HR.
- Avatar upload qua Server Action: sharp giải mã JPEG/PNG/WebP (tối đa 2 MB, 16 triệu pixel), chuẩn hóa WebP, bỏ metadata, tên file server sinh, lưu ngoài public/Git. Không nhận URL tùy ý. Chỉ bỏ ảnh cũ sau commit, dọn ảnh mới khi rollback.
- GET `/media/avatar/[file]` chỉ đọc ảnh: phiên hợp lệ và chủ ảnh hoặc HR VIEW cùng công ty; khi buộc đổi mật khẩu chỉ đọc ảnh của mình, không cache công khai. Mutation vẫn dùng Server Action.

- Profile có hộp “Cài đặt trợ lý AI”: tài khoản tự sửa bối cảnh/cách trả lời (tối đa 2.000 ký tự), xóa về mặc định, lưu có phiên bản và audit không chứa nội dung. Áp dụng từ lượt chat kế tiếp; không cấp quyền AI, không tự lưu thông tin rút ra từ chat. Thiết kế và kiểm thử do [plan AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#lịch-sử-bối-cảnh-chat-và-cá-nhân-hóa--triển-khai-16112026) sở hữu.

## Dashboard và điều hướng cá nhân

- Dashboard là bàn làm việc của người đăng nhập, không mặc định dùng thống kê HR toàn công ty. Số đếm và danh sách cùng phạm vi quyền, đếm trên toàn bộ tập phù hợp, độc lập giới hạn 200 dòng của workspace; danh sách cá nhân phân trang 10 hồ sơ.
- Hiển thị việc chờ duyệt/thực hiện theo quyền và người được giao, yêu cầu của mình (nháp/đang xử lý/kết quả 30 ngày). Hồ sơ tạm dừng toàn công ty chỉ dành cho MANAGE và ghi rõ là điều phối, không gộp vào việc cá nhân.
- Chưa có workflow thì hiển thị phần cá nhân và lối tắt được phép; không dựng số công việc giả. Header có ảnh và liên kết Hồ sơ của tôi. Không hiện tìm kiếm/chuông thông báo chưa có chức năng.
- Áp dụng [rule trực quan chung](FRONTEND-RULES.md#2-trình-bày-trực-quan): thẻ số liệu có biểu tượng, danh sách có trạng thái, biểu đồ nhóm yêu cầu bấm lọc được, ô lối tắt và minh họa khi trống. Không cộng các nhóm chồng lấn hoặc gọi tỷ lệ nhóm là tiến độ hoàn thành.
- Thông báo và ưu tiên việc đến lượt của workflow mở rộng là định hướng, chỉ hiển thị khi có dữ liệu thật; việc đến lượt phải dựa trên trạng thái bước và quyền server, không lấy số thông báo làm quyền thao tác.
