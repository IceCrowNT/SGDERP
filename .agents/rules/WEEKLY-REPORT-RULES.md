# Quy tắc báo cáo công việc tuần dùng chung

**Thiết kế cho tính năng chưa triển khai.** Tiến độ, các điểm cần xác nhận, thiết kế DB và kiểm thử nằm tại [Plan báo cáo tuần](../../docs/plans/WEEKLY-REPORT-CHECKLIST.md). Quy tắc dưới đây áp dụng khi triển khai được yêu cầu; không tự mở rộng thành hệ thống giao việc hoặc bộ bảng tính đầy đủ.

## Đơn vị nghiệp vụ và sao chép

- Một báo cáo dùng chung theo phòng/kỳ, có ba phần: đã thực hiện, đề xuất/kiến nghị, kế hoạch tuần tới. Nhóm có công việc và dòng chi tiết; STT chỉ dùng trình bày.
- Tạo từ kỳ cũ giữ nội dung, hạn năm và thời gian công việc; chỉ thay kỳ báo cáo theo lựa chọn. Người dùng tự rà soát/cập nhật nội dung cũ, không tự sinh nhiệm vụ hay chuyển kế hoạch thành kết quả.
- Tên người thực hiện là nội dung báo cáo, không cấp quyền sửa dòng. Không tự ánh xạ tên viết ngắn thành tài khoản/nhân sự.
- Lịch sử và bản chốt của kỳ cũ không sao chép vào kỳ mới. Giữ tham chiếu báo cáo nguồn và phiên bản được lấy.

## Bảng làm việc

- Người có quyền cập nhật trong phạm vi báo cáo được thêm/sửa/xóa toàn bảng khi đang cập nhật. Quyền/phạm vi chi tiết cần chốt theo plan trước triển khai.
- Có nút thêm nhóm/công việc/dòng chi tiết; thao tác trên ô, copy/paste giá trị, văn bản nhiều dòng, chèn/nhân bản/di chuyển/xóa. Cột nghiệp vụ cố định, gộp ô theo cấu trúc; không thực thi công thức/macro/HTML từ dữ liệu nhập.
- Mỗi dòng có ID ổn định; xóa/đổi thứ tự không làm lệch lịch sử. Nhân bản dòng tạo ID mới. Xóa nhóm/dòng phải thể hiện rõ phạm vi ảnh hưởng.
- Chỉ báo đã lưu sau server xác nhận. Lỗi hoặc xung đột giữ nội dung đang nhập và cho đối chiếu/thử lại, không tự ghi đè bản mới hơn. Không hứa hỗ trợ offline hoặc realtime từng ký tự.

## Rà soát, chốt và xuất

- Theo luồng dự kiến của plan: đang cập nhật → đang rà soát → đã chốt. Khi rà soát chỉ người có quyền chốt trong phạm vi được sửa; trả về cập nhật khi cần cộng tác tiếp.
- Chốt đúng phiên bản đã rà soát sau khi lưu thành công; snapshot gồm dữ liệu và thông tin trình bày cần để xuất lại. Báo cáo đã chốt chỉ đọc.
- Mở lại bắt buộc lý do; mọi bản chốt cũ giữ bất biến. Chốt lại thêm phiên bản mới, không thay thế bản đã gửi trước đó.
- Xuất/in bản chốt dùng snapshot được chọn, không dùng dữ liệu hiện hành thay thế. Xuất nháp phải có nhãn; người chỉ được xem bản chốt không được nhận nội dung nháp/lịch sử nội bộ.
- Không tự gửi tài liệu tới lãnh đạo/email/1Office. Người dùng tải/in và gửi theo quy trình hiện tại.

## Truy vết và phạm vi

- Mọi thay đổi đã lưu phải có người, thời gian, đối tượng và dữ liệu trước–sau; gồm cấu trúc/bố cục, xóa, dán vùng, chuyển trạng thái và hoàn tác. Một batch giữ chi tiết từng ô thay đổi.
- Nhật ký tự động không yêu cầu gõ giải thích cho mọi sửa nhỏ; mở lại bắt buộc lý do. Hoàn tác phần đã lưu tạo mutation và sự kiện mới, không xóa lịch sử.
- Quyền báo cáo được cấp tập trung, độc lập quyền HR/workflow. Chức danh, tên role và trường người thực hiện không tự cấp quyền. Phạm vi phòng, nghỉ việc/chuyển phòng và quyền hiện hành kiểm tra ở server.
- Thiết kế JSONB, khóa, chống gửi lặp, bảo vệ lịch sử/snapshot và các FK thuộc [mục DB của plan](../../docs/plans/WEEKLY-REPORT-CHECKLIST.md#thiết-kế-db-cần-giữ); không tạo file JSON rời làm nguồn dữ liệu vận hành.
