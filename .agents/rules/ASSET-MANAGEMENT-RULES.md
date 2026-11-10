# QUY TẮC QUẢN LÝ TÀI SẢN

Phạm vi thiết kế hiện hành: **mức 1, quản lý từng thiết bị**. Chưa triển khai schema/UI mới. Tiến độ và thiết kế DB ở [Plan tài sản](../../docs/plans/ASSET-MANAGEMENT-CHECKLIST.md); áp dụng cùng ba rule kỹ thuật chung.

## Hồ sơ thiết bị

- Mỗi thiết bị là một hồ sơ có mã tự cấp ổn định; số lượng tính từ hồ sơ. Không khôi phục schema/seed nhiều bảng cũ hoặc tự sinh thiết bị theo tổng số trên biên bản tham khảo.
- Loại tài sản là danh mục; đơn vị quản lý liên kết phòng ban, người sử dụng liên kết nhân sự, vị trí liên kết danh mục không gian vật lý. Không nhập lại tên làm khóa hoặc gắn người dùng thiết bị vào tài khoản đăng nhập.
- Tình trạng vật lý và hình thức sử dụng là hai trường riêng. Thiếu thông tin là Chưa xác nhận/Chưa xác định, không tự suy còn tốt, dùng chung, đã thu hồi hoặc ngừng dùng.
- Cá nhân phải có người sử dụng; các hình thức còn lại không gắn người. Chọn mới người đang làm việc cùng công ty. Người nghỉ việc giữ liên kết để xử lý bàn giao, không tự chuyển thiết bị.
- Danh mục `vi_tri` thuộc [phân hệ vị trí](LOCATION-MANAGEMENT-RULES.md), tài sản chỉ tham chiếu; không tạo bảng danh mục vị trí riêng cho từng phân hệ. Nhân sự có vị trí làm việc chính tùy chọn, thiết bị có vị trí riêng. Vị trí không phải phòng ban. Người chuyển phòng không tự đổi đơn vị quản lý/vị trí thiết bị; AP ở sảnh không cần phòng hoặc nhân sự giả.
- Mức 1 cập nhật hiện trạng và ghi chú, chưa có phiếu bàn giao, hồ sơ sửa chữa hoặc duyệt. Không xóa cứng hồ sơ; ngừng dùng vẫn giữ mã và lịch sử. Danh mục ngừng dùng không làm mất tham chiếu cũ.

## Quyền và lịch sử

- ASSETS MANAGE quản lý thiết bị và loại, chỉ chọn vị trí có sẵn; sửa cây vị trí cần LOCATIONS MANAGE. Quyền dự kiến ASSETS VIEW/MANAGE dùng RBAC hiện có; phải triển khai kiểm tra server cùng catalog và UI. Mọi dữ liệu theo công ty của phiên; trường phòng quản lý không tự tạo phạm vi phòng ban.
- Người có ASSETS MANAGE được chọn người/phòng qua danh mục tối thiểu theo công ty, không phải được xem toàn bộ thông tin HR. Không tự cấp quyền mới cho vai trò hoặc tài khoản hiện có.
- Mọi thay đổi và nhật ký trước–sau phải lưu cùng transaction. Dùng lại bảng nhật ký, không dùng helper nuốt lỗi cho lịch sử bắt buộc. Chi tiết đọc đúng nhật ký của thiết bị được phép xem; không mở toàn bộ nhật ký hệ thống.
- Thiết kế bảng/cột, khóa, phân loại đối tượng audit và xử lý đồng thời được quản lý tại plan, không nhân bản tại đây.

## Giai đoạn sau

- Vật tư tiêu hao dùng nhập–xuất–tồn, tách khỏi hồ sơ thiết bị; không thêm bảng vật tư trong mức 1.
- QR/mã vạch, import/export, bảo trì, license, scope theo phòng và hiển thị tài sản trên 3D triển khai khi có yêu cầu tiếp theo. Khi tích hợp 3D, ánh xạ từ ID vị trí ổn định; không dùng mesh hoặc tên phòng làm khóa nghiệp vụ.
- Không đưa chống thất thoát, khấu hao hoặc kiểm kê khắt khe vào mức 1.
