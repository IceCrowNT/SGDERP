# Kế hoạch tài sản IT và vị trí 3D

Cập nhật: **04/11/2026**. **TẠM HOÃN** để tập trung nhân sự/tài khoản/phân quyền. Đã gỡ 8 bảng và seed tài sản ngày 31/10; không tự khôi phục hoặc nhập thiết bị. 3D nhân sự vẫn hoạt động.

## Đồng bộ giao diện — 09/11/2026

- [x] Chỉ cập nhật giao diện 3D nhân sự: tiêu đề gọn, thanh số liệu co giãn, chọn phòng nhanh dùng Button trên mobile, nhãn tầng/camera ngắn rõ. Không sửa mô hình, mapping vị trí hoặc khôi phục tài sản.
- [x] Chrome desktop/mobile: canvas hiển thị, đổi tầng và chọn phòng mở đúng hộp thông tin; không tràn ngang. Ca E2E đếm người trong HR/3D chạy lại đạt; TypeScript/lint đạt.

## Đã có để tham khảo

- [x] Phân tích ảnh bàn giao: 11 nhóm, 90 thiết bị ở mức tổng hợp; không phải kiểm kê tài sản cá thể đã xác nhận.
- [x] File Excel cập nhật có 92 dòng/mã, 11 nhóm; điện thoại bàn tăng từ 8 lên 10. Chưa nhập thành tài sản trong DB.
- [x] Đối chiếu 46 dòng có người: 44 khớp tên, 2 cần xác minh; 46 dòng chưa có người không mặc định là dùng chung. Có trường hợp phòng tài sản khác phòng công tác của người dùng.
- [x] Có thiết kế vị trí dùng chung, đánh giá 3D và ý tưởng quét QR/mã vạch bằng camera điện thoại.

## Hướng triển khai khi được duyệt lại

- [ ] Chốt phạm vi pilot: IT/HCNS, từng phòng tự quản hoặc kết hợp; xác định người có quyền và quyền xem tổng hợp.
- [ ] Tạo lại schema bằng migration mới: mỗi tài sản một hồ sơ, mã ổn định; liên kết người bằng ID nhân sự, không cần người đó có tài khoản.
- [ ] Tách **đơn vị quản lý**, **người/đơn vị sử dụng**, **vị trí vật lý**. Người/phòng sử dụng có thể trống; AP ngoài sảnh gắn khu vực, không tạo nhân sự/phòng ban giả.
- [ ] Chuẩn hóa 92 dòng nguồn, xác minh tên/người/vị trí và loại ghi chú chứa thông tin đăng nhập; xem trước chênh lệch trước nhập.
- [ ] Làm danh sách/hồ sơ, số lượng theo loại, tình trạng, giao nhận và báo hỏng–sửa chữa; cập nhật hiện trạng cùng lịch sử trong transaction.
- [ ] Thử 5–10 tem QR: quét bằng web điện thoại qua HTTPS, mở hồ sơ theo quyền, có nhập mã dự phòng. Quét không tự bàn giao/đổi vị trí.
- [ ] Tích hợp vị trí DB vào 3D: tòa nhà → tầng → phòng/khu vực/rack; hiển thị số lượng/tình trạng trước, marker thiết bị sau.
- [ ] Cải thiện render theo nhu cầu, giải phóng tài nguyên, tải theo tầng/phòng, mobile và phương án khi không có WebGL.

## Giới hạn và nghiệm thu

Quản lý nhẹ theo số lượng, tình trạng, người dùng và vị trí; chưa làm chống thất thoát, khấu hao hay duyệt nhiều tầng. Phòng ban tự quản tài sản/license do mình đề xuất mua; IT không mặc định quản lý toàn công ty. 3D chỉ hiển thị dữ liệu đã xác nhận, không suy vị trí từ cơ cấu tổ chức.

Chỉ nghiệm thu khi mỗi dòng nhập là thiết bị được xác nhận, số lượng khớp, liên kết đúng người/vị trí, quyền đọc/ghi/export/3D nhất quán và lịch sử được giữ. Không phục hồi schema cũ nguyên trạng chỉ vì đã từng có thiết kế.

Chi tiết: [Nguồn nhập và vị trí dùng chung](../strategy/PHAN-TICH-NHAP-TAI-SAN-VA-VI-TRI-DUNG-CHUNG.md) · [Đánh giá 3D](../strategy/DANH-GIA-TICH-HOP-TAI-SAN-VA-MO-HINH-3D.md) · [Rule tài sản](../../.agents/rules/ASSET-MANAGEMENT-RULES.md).
