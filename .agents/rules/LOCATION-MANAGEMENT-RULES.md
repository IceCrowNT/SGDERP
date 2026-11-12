# QUY TẮC VỊ TRÍ & KHÔNG GIAN

Bản đầu đã triển khai và kiểm thử kỹ thuật đạt. DB, quyền, thứ tự triển khai và nghiệm thu tại [Plan vị trí](../../docs/plans/LOCATION-MANAGEMENT-CHECKLIST.md); áp dụng cùng ba rule kỹ thuật chung.

- Vị trí là danh mục vật lý dùng chung, độc lập cơ cấu phòng ban. Nhân sự và tài sản tham chiếu ID; không tạo danh mục riêng cho mỗi phân hệ hoặc nhập tên làm khóa.
- Chỉ phân hệ vị trí sở hữu việc tạo/sửa cây. Quyền quản lý HR/tài sản cho phép chọn vị trí có sẵn trong phạm vi công ty, không tự cấp quyền quản lý danh mục.
- Quyền xem vị trí không cấp quyền xem nhân sự/tài sản nằm tại đó. Kiểm tra riêng quyền của phân hệ cho dữ liệu liên quan.
- Mã vị trí ổn định; đổi tên/cha không đổi ID hoặc tự gán lại người/thiết bị. Thay cha phải thông báo ảnh hưởng cả nhánh.
- Xóa vị trí không có con: xem trước ảnh hưởng, tự gỡ vị trí khỏi tất cả nhân sự đang liên kết (kể cả đã nghỉ), ghi audit HR từng người và audit xóa cùng transaction. Cần LOCATIONS MANAGE và thêm HR MANAGE nếu có người; danh sách/phiên bản thay đổi phải xem lại và xác nhận. DB vẫn Restrict; xóa SQL trực tiếp không thay luồng nghiệp vụ. Ngừng dùng/đổi loại không phù hợp vẫn chặn nếu còn người. Vị trí còn tài sản thì chặn xóa/ngừng dùng, không tự gỡ thiết bị; xử lý theo [plan tài sản](../../docs/plans/ASSET-MANAGEMENT-CHECKLIST.md).
- Chi tiết vị trí có danh sách người theo HR VIEW; HR MANAGE tìm/gán/chuyển/bỏ gán ngay tại đây, không chuyển trang. Chọn người ở vị trí khác phải xác nhận; cùng vị trí không tạo trùng. Dùng cùng FK và quy tắc chuyển với form HR.
- Chưa xác minh vị trí thì để trống. Người chuyển chỗ không tự chuyển thiết bị; chuyển phòng ban không đồng nghĩa đổi chỗ ngồi.
- 3D hiển thị và chọn vị trí bằng ID ổn định; bảng chi tiết HCNS dùng lại luồng gán người của trang Vị trí khi có HR MANAGE theo [rule 3D](OFFICE-3D-RULES.md). Không suy chỗ ngồi từ chức vụ/phòng ban hoặc tự nhập cấu hình hình học thành dữ liệu vận hành.
