# QUY TẮC VỊ TRÍ & KHÔNG GIAN

Bản đầu đã triển khai và kiểm thử kỹ thuật đạt. DB, quyền, thứ tự triển khai và nghiệm thu tại [Plan vị trí](../../docs/plans/LOCATION-MANAGEMENT-CHECKLIST.md); áp dụng cùng ba rule kỹ thuật chung.

- Vị trí là danh mục vật lý dùng chung, độc lập cơ cấu phòng ban. Nhân sự và tài sản tham chiếu ID; không tạo danh mục riêng cho mỗi phân hệ hoặc nhập tên làm khóa.
- Chỉ phân hệ vị trí sở hữu việc tạo/sửa cây. Quyền quản lý HR/tài sản cho phép chọn vị trí có sẵn trong phạm vi công ty, không tự cấp quyền quản lý danh mục.
- Quyền xem vị trí không cấp quyền xem nhân sự/tài sản nằm tại đó. Kiểm tra riêng quyền của phân hệ cho dữ liệu liên quan.
- Mã vị trí ổn định; đổi tên/cha không đổi ID hoặc tự gán lại người/thiết bị. Thay cha phải thông báo ảnh hưởng cả nhánh.
- Không xóa/ngừng dùng vị trí còn con hoặc hồ sơ tham chiếu; xử lý liên kết rõ ràng, giữ audit. Không tự di chuyển dữ liệu khi ngừng dùng.
- Chưa xác minh vị trí thì để trống. Người chuyển chỗ không tự chuyển thiết bị; chuyển phòng ban không đồng nghĩa đổi chỗ ngồi.
- 3D là nơi hiển thị, ánh xạ vị trí bằng ID ổn định khi triển khai; không suy chỗ ngồi từ chức vụ/phòng ban hoặc tự nhập cấu hình hình học thành dữ liệu vận hành.
