# Quy tắc mô hình không gian 3D

Plan và phạm vi hiện hành: [OFFICE-3D-CHECKLIST](../../docs/plans/OFFICE-3D-CHECKLIST.md).

- Mô hình chỉ hiển thị dữ liệu được phép xem. Hình học/điểm chọn liên kết ID vị trí ổn định; không suy người ngồi từ phòng ban hay chức vụ.
- Người hiện tại vị trí lấy từ FK trong hồ sơ HR và chỉ gồm người ACTIVE. Muốn xem phải có quyền HR riêng bên cạnh quyền xem vị trí. Bảng chi tiết điểm trong HCNS cho HR MANAGE gán/chuyển/bỏ gán trực tiếp bằng cùng component/action của trang Vị trí; chuyển người đã có chỗ phải xác nhận. Chỉ thao tác trên liên kết vị trí hợp lệ, không sửa hồ sơ khác hoặc hình học. Tổng người trong phòng tính cả các vị trí con đang sử dụng, không lấy số nhân sự toàn phòng ban/công ty để thay thế.
- Tách hình nội thất khỏi hồ sơ tài sản; hình máy tính minh họa không tạo ra thiết bị trong DB. Ghi chú nguồn chưa phải phân công nhân sự.
- Chọn trực tiếp bàn/vùng làm việc; không phủ số vị trí mặc định lên mô hình. Vùng chọn có dấu hiệu nhẹ, rê chuột/focus/chọn làm nổi rõ. Giữ danh sách tên dùng được trên điện thoại, bàn phím và khi WebGL lỗi. Một bàn nhiều vị trí phải có vùng chọn riêng, không gộp liên kết DB theo hình bàn.
- Hình người cách điệu lấy từ nhân sự đã gán vị trí theo quyền HR, chỉ biểu thị phân công chỗ làm việc, không suy có mặt/online. Hiện tên theo khoảng nhìn và lựa chọn, tránh chồng nhãn. Nhiều người tại một vị trí phải có cách xem đủ danh sách; không tạo ghế, nhân vật hoặc hồ sơ người giả để lấp bố cục.
- Không nhập lại danh mục từ mô hình mỗi lần mở trang. Liên kết mất hiệu lực phải hiển thị rõ, không tự ghép bằng tên/ID gần nhất.
- Dữ liệu nghiệp vụ thuộc DB; hình học thuộc cấu hình/mô hình. Màu vật liệu 3D thuộc palette mô hình, UI HTML dùng theme chung.
- Tòa nhà và HCNS dùng chung phong cách mô hình thu nhỏ mở mái, vật liệu sáng, camera trực giao; tái sử dụng model HCNS, không duy trì hai bản nội thất khác nhau. Phòng chưa có sơ đồ nội thất giữ vỏ không gian; không tự tạo bàn/nhân sự/tài sản để lấp phòng.
- Tòa nhà/tầng/phòng/vị trí dùng một Canvas tại `/office-3d`; đổi cấp xem qua trạng thái URL, không tạo viewer mới. Giữ camera khi lưu dữ liệu hoặc quay lại cấp trước; link HCNS cũ dẫn về viewer chung. Chọn cấp bằng thao tác rõ ràng; zoom không tự đổi cấp. Nhãn và điểm chọn dùng cùng phép biến đổi với model nhúng. Dữ liệu lựa chọn gán người tải khi mở phòng và có HR MANAGE, không nạp vào tổng quan cho người chỉ xem.
- Trong tầng, nhấp đơn chọn phòng; nhấp đúp phòng có nội thất mở chi tiết bằng chuyển camera từ hướng đang nhìn, làm mờ dần không gian xung quanh. Kéo xoay không được kích hoạt vào phòng. Giữ nút vào/quay lại cho bàn phím và điện thoại; Escape chỉ quay ra khi không đang thao tác form/hộp thoại. Tôn trọng giảm chuyển động và không tích lũy thời gian nghỉ thành bước camera đột ngột.
- Cả `/office-3d` và `/office-3d/hcns` dùng quyền LOCATIONS. Ánh xạ tòa nhà phải đúng công ty, tòa nhà, tầng và quan hệ cha của phòng; liên kết mất hoặc đổi nhánh không tự khôi phục bằng tên. Mô hình tòa nhà thiếu ánh xạ hợp lệ không hiển thị dữ liệu công ty khác.
- Mô hình theo bản phác chưa đo đạc phải ghi rõ ước lượng. Không suy chi tiết không có trong nguồn.
- Vẽ khi có thay đổi, tải viewer khi cần, không hiệu ứng chạy liên tục khi nghỉ. Có danh sách điểm dùng được bằng bàn phím và khi WebGL không hoạt động.
- Kiểm tra quyền/công ty trên server trước trả dữ liệu; không tự cấp role/grant để mở mô hình. Quyền đọc ghi chú vị trí không cấp quyền xem hồ sơ HR/tài sản.
