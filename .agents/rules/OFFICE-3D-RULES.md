# Quy tắc mô hình không gian 3D

Plan và phạm vi hiện hành: [OFFICE-3D-CHECKLIST](../../docs/plans/OFFICE-3D-CHECKLIST.md).

- Mô hình chỉ hiển thị dữ liệu được phép xem. Hình học/điểm chọn liên kết ID vị trí ổn định; không suy người ngồi từ phòng ban hay chức vụ.
- Người hiện tại vị trí lấy từ FK trong hồ sơ HR và chỉ gồm người ACTIVE. Muốn xem phải có quyền HR riêng bên cạnh quyền xem vị trí. Bảng chi tiết điểm trong HCNS cho HR MANAGE gán/chuyển/bỏ gán trực tiếp bằng cùng component/action của trang Vị trí; chuyển người đã có chỗ phải xác nhận. Chỉ thao tác trên liên kết vị trí hợp lệ, không sửa hồ sơ khác hoặc hình học. Tổng người trong phòng tính cả các vị trí con đang sử dụng, không lấy số nhân sự toàn phòng ban/công ty để thay thế.
- Tách hình nội thất khỏi hồ sơ tài sản; hình máy tính minh họa không tạo ra thiết bị trong DB. Ghi chú nguồn chưa phải phân công nhân sự.
- Không nhập lại danh mục từ mô hình mỗi lần mở trang. Liên kết mất hiệu lực phải hiển thị rõ, không tự ghép bằng tên/ID gần nhất.
- Dữ liệu nghiệp vụ thuộc DB; hình học thuộc cấu hình/mô hình. Màu vật liệu 3D thuộc palette mô hình, UI HTML dùng theme chung.
- Tòa nhà và HCNS dùng chung phong cách mô hình thu nhỏ mở mái, vật liệu sáng, camera trực giao; tái sử dụng model HCNS, không duy trì hai bản nội thất khác nhau. Phòng chưa có sơ đồ nội thất giữ vỏ không gian; không tự tạo bàn/nhân sự/tài sản để lấp phòng.
- Cả `/office-3d` và `/office-3d/hcns` dùng quyền LOCATIONS. Ánh xạ tòa nhà phải đúng công ty, tòa nhà, tầng và quan hệ cha của phòng; liên kết mất hoặc đổi nhánh không tự khôi phục bằng tên. Mô hình tòa nhà thiếu ánh xạ hợp lệ không hiển thị dữ liệu công ty khác.
- Mô hình theo bản phác chưa đo đạc phải ghi rõ ước lượng. Không suy chi tiết không có trong nguồn.
- Vẽ khi có thay đổi, tải viewer khi cần, không hiệu ứng chạy liên tục khi nghỉ. Có danh sách điểm dùng được bằng bàn phím và khi WebGL không hoạt động.
- Kiểm tra quyền/công ty trên server trước trả dữ liệu; không tự cấp role/grant để mở mô hình. Quyền đọc ghi chú vị trí không cấp quyền xem hồ sơ HR/tài sản.
