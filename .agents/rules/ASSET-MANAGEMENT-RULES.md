# QUY TẮC QUẢN LÝ TÀI SẢN

Phạm vi hiện hành: **mức 1, quản lý từng thiết bị**. Đã có nền DB, quyền, Server Actions và giao diện `/assets` với danh sách, hồ sơ, lựa chọn người/vị trí và lịch sử. Tiến độ và thiết kế DB ở [Plan tài sản](../../docs/plans/ASSET-MANAGEMENT-CHECKLIST.md); áp dụng cùng ba rule kỹ thuật chung.

## Hồ sơ thiết bị

- Mỗi thiết bị là một hồ sơ có mã tự cấp ổn định; số lượng tính từ hồ sơ. Không khôi phục schema/seed nhiều bảng cũ hoặc tự sinh thiết bị theo tổng số trên biên bản tham khảo.
- Loại tài sản là danh mục; đơn vị quản lý liên kết phòng ban, người sử dụng liên kết nhân sự, vị trí liên kết danh mục không gian vật lý. Không nhập lại tên làm khóa hoặc gắn người dùng thiết bị vào tài khoản đăng nhập.
- Tình trạng vật lý và hình thức sử dụng là hai trường riêng. Thiếu thông tin là Chưa xác nhận/Chưa xác định, không tự suy còn tốt, dùng chung, đã thu hồi hoặc ngừng dùng.
- Cá nhân phải có người sử dụng; các hình thức còn lại không gắn người. Chọn mới người đang làm việc cùng công ty. Người nghỉ việc giữ liên kết để xử lý bàn giao, không tự chuyển thiết bị.
- Danh mục `vi_tri` thuộc [phân hệ vị trí](LOCATION-MANAGEMENT-RULES.md), tài sản chỉ tham chiếu; không tạo bảng danh mục vị trí riêng cho từng phân hệ. Nhân sự có vị trí làm việc chính tùy chọn, thiết bị có vị trí riêng. Vị trí không phải phòng ban. Người chuyển phòng không tự đổi đơn vị quản lý/vị trí thiết bị; AP ở sảnh không cần phòng hoặc nhân sự giả.
- Mức 1 cập nhật hiện trạng và ghi chú, chưa có phiếu bàn giao, hồ sơ sửa chữa hoặc duyệt. Không xóa cứng hồ sơ; ngừng dùng vẫn giữ mã và lịch sử. Danh mục ngừng dùng không làm mất tham chiếu cũ.
- Thông tin mua sắm/khấu hao/bảo hành tùy chọn, mặc định thu gọn; không suy ngày mua, giá hoặc thời hạn cho hồ sơ cũ. Mặc định thời gian theo loại chỉ áp dụng khi người dùng chọn, không hồi tố tài sản. Thanh khấu hao là phần còn lại tính đều theo thời gian để tham khảo quản lý, không thay tình trạng vật lý hoặc kế toán; công thức, đơn vị và CHECK tại plan.

## Quyền và lịch sử

- Trang tài sản mặc định hiển thị nhóm theo loại; có thể xem theo người hoặc vị trí và tìm toàn cục. Số lượng nhóm dùng cùng phạm vi công ty/quyền với hồ sơ; không tính từ một trang kết quả. Nhóm chưa xác định không đồng nghĩa dùng chung/chưa phân bổ; không suy gán người/vị trí từ cách nhóm. Bố cục và kiểm chứng ở plan tài sản.
- Card chỉ dùng cho nhóm loại; các nhóm người/vị trí là danh sách gọn, hồ sơ bên trong là bảng. Sửa trực tiếp một dòng phải Lưu/Hủy rõ ràng, giữ bản nháp khi lỗi và không bỏ qua phiên bản, quyền, validation hay lịch sử của luồng sửa hồ sơ đầy đủ.
- Panel cho MANAGE nhấp giá trị để sửa ngay tại chỗ; một mục mỗi lần, Lưu/Hủy rõ ràng, không mở dialog sửa toàn hồ sơ. Hình thức/người là nhóm liên quan; đổi người không tự đổi phòng/vị trí. Mã tự cấp và kết quả tính toán chỉ đọc. Giữ panel/URL/cuộn khi lưu; khóa đóng, chuyển tab và quay lại khi đang sửa để không bỏ bản nháp. VIEW không có thao tác sửa; server vẫn kiểm tra quyền và phiên bản.
- Hồ sơ có liên kết `/assets?asset=<id>` mở panel hiện có. Card Tem QR thu gọn tạo URL theo ID bất biến, không lưu ảnh vào DB; xem/in/tải tem không thay dữ liệu hoặc cấp quyền. Link vẫn yêu cầu phiên và ASSETS cùng công ty; giữ đích tài sản hợp lệ qua đăng nhập/đổi mật khẩu. Địa chỉ in tem phải ổn định và điện thoại truy cập được; chi tiết tại plan tài sản.

- ASSETS MANAGE quản lý thiết bị và loại, chỉ chọn vị trí có sẵn; sửa cây vị trí cần LOCATIONS MANAGE. ASSETS VIEW/MANAGE dùng RBAC hiện có; server và ma trận `/roles` cùng chính sách. Mọi dữ liệu theo công ty của phiên; trường phòng quản lý không tự tạo phạm vi phòng ban.
- Người có ASSETS MANAGE được chọn người/phòng qua danh mục tối thiểu theo công ty, không phải được xem toàn bộ thông tin HR. Không tự cấp quyền mới cho vai trò hoặc tài khoản hiện có.
- Mọi thay đổi và nhật ký trước–sau phải lưu cùng transaction. Dùng lại bảng nhật ký, không dùng helper nuốt lỗi cho lịch sử bắt buộc. Chi tiết đọc đúng nhật ký của thiết bị được phép xem; không mở toàn bộ nhật ký hệ thống.
- Thiết kế bảng/cột, khóa, phân loại đối tượng audit và xử lý đồng thời được quản lý tại plan, không nhân bản tại đây.

## Giai đoạn sau

- Vật tư tiêu hao dùng nhập–xuất–tồn, tách khỏi hồ sơ thiết bị; không thêm bảng vật tư trong mức 1.
- Màn hình quét riêng, mã vạch một chiều, in hàng loạt, import/export, bảo trì, license, scope theo phòng triển khai khi có yêu cầu tiếp theo. Tem QR liên kết hồ sơ đã thuộc phạm vi hiện hành. 3D HCNS đã có gán/chuyển/bỏ gán theo [rule 3D](OFFICE-3D-RULES.md), ánh xạ từ ID vị trí ổn định; không dùng mesh hoặc tên phòng làm khóa nghiệp vụ.
- Không đưa chống thất thoát, hạch toán khấu hao kế toán hoặc kiểm kê khắt khe vào mức 1.
