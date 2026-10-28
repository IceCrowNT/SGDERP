# Ý tưởng tính năng SDG ERP

> **Quyết định 27/10/2026:** Tạm hoãn tích hợp AI và gỡ bản thử nghiệm hồ sơ thanh toán khỏi ứng dụng. Giữ ý tưởng/tài liệu để xem xét sau; không tự khôi phục khi chưa được duyệt. Xem [plan AI](../plans/AI-DOCUMENTS-CHECKLIST.md).

Tài liệu ghi nhận ý tưởng để xem xét và thử nghiệm. Việc ghi nhận không đồng nghĩa được duyệt triển khai; tiến độ thực hiện theo checklist từng phân hệ. Danh sách sẽ bổ sung dần, không thay thế các tài liệu thiết kế hiện có.

## Quét mã tài sản bằng camera điện thoại

**Ngày ghi nhận:** 24/10/2026  
**Nguồn:** Người phụ trách đề xuất thêm mã vạch vào quản lý tài sản, dùng camera điện thoại để quét trong phần mềm.  
**Trạng thái:** Ý tưởng, chưa phát triển hoặc cài thư viện quét mã.

### Mục tiêu

Đứng cạnh thiết bị có thể quét tem để mở đúng hồ sơ, xem người/phòng sử dụng, vị trí, tình trạng và lịch sử sửa chữa; giảm tìm kiếm hoặc nhập mã thủ công. Phù hợp quản lý nhẹ, không đặt mục tiêu chống mất trộm hoặc kiểm kê bắt buộc.

### Phương án đề xuất

- Bắt đầu bằng trang quản lý tài sản trong web ERP có giao diện điện thoại và nút “Quét mã”; chưa cần xây ứng dụng Android/iOS riêng. PWA chỉ cân nhắc sau, không mặc định đã hỗ trợ offline.
- Ưu tiên thử QR cho tem tự phát hành; mã vạch một chiều như Code 128 là lựa chọn bổ sung nếu cần tương thích nhãn hiện hữu. Chốt loại tem sau thử thực tế, không bắt buộc dùng cả hai.
- Mỗi tài sản thực tế có mã nội bộ ổn định và riêng biệt. Nội dung tem là mã tra cứu hoặc URL hồ sơ, không chứa mật khẩu, quyền truy cập hay thông tin nhân sự chi tiết.
- Tem in kèm tên ngắn và mã đọc được bằng mắt để vẫn nhập tay khi tem mờ hoặc camera không dùng được. Không dùng mã model/mã hàng chung để định danh từng chiếc.
- Không tự tạo 90 tài sản thật từ số lượng trong ảnh bàn giao; chỉ phát hành tem sau khi có hồ sơ từng thiết bị được xác nhận.

### Luồng sử dụng dự kiến

1. Người có quyền tạo hồ sơ tài sản và chọn in tem.
2. Dán tem lên thiết bị; mở ERP trên điện thoại và đăng nhập.
3. Chọn “Quét mã”, cấp quyền camera, đưa tem vào khung quét.
4. ERP đọc mã và tra hồ sơ trong phạm vi người dùng được phép xem.
5. Hiển thị tên/model, người/phòng sử dụng, vị trí, tình trạng và lịch sử sửa chữa đã có.
6. Người có quyền chọn báo hỏng hoặc cập nhật thông tin; xem lại và xác nhận trước khi lưu. Quét đơn thuần không tự đổi vị trí, bàn giao hoặc trạng thái.

Mã không tìm thấy, mã sai hoặc không được phép xem phải có thông báo phù hợp; không tự tạo hồ sơ hoặc mở URL bất kỳ đọc được từ tem. Nhiều khung hình đọc cùng mã chỉ mở hồ sơ một lần. In lại tem giữ nguyên định danh.

### Liên kết với mô hình 3D

Nếu thiết bị đã được gắn vị trí vật lý trong DB, hồ sơ có thể có nút “Xem vị trí trên 3D”. Nếu chưa có vị trí thì hiển thị chưa xác định. Việc quét không chứng minh vị trí thực tế, không tự định vị điện thoại và không suy vị trí từ phòng ban nhân sự. 3D tiếp tục chỉ hiển thị dữ liệu đã lưu.

### Điều kiện kỹ thuật cần kiểm chứng

- Camera trên web cần quyền người dùng và ngữ cảnh an toàn, thường là HTTPS. Ngoại lệ localhost áp dụng trên chính thiết bị đang mở; truy cập `http://IP-may-tinh:4000` từ điện thoại không tương đương localhost. Cần chuẩn bị địa chỉ HTTPS điện thoại truy cập được; chưa cần công khai dữ liệu ra Internet. [Tài liệu camera web của MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- Kiểm tra camera sau, lấy nét, tem nhỏ/mờ và tương thích Chrome Android/Safari iPhone trước khi chọn thư viện. Có đường nhập mã thủ công khi camera bị từ chối hoặc không hỗ trợ.
- Bản thử đầu giả định điện thoại kết nối được server. Khi mất mạng, báo chưa thể tra cứu/lưu; đồng bộ offline là ý tưởng mở rộng riêng.
- Tem URL chỉ phát hành khi có địa chỉ ổn định dùng được trên điện thoại; không in localhost lên tem dùng thực tế.
- Đọc và cập nhật theo role, công ty và phạm vi tài sản tại server; có tem không đồng nghĩa được cấp quyền. Không suy phòng quản lý từ người quét.

### Phạm vi thử nghiệm đề xuất

| Bước | Đầu ra cần có |
| --- | --- |
| Chuẩn bị | Hồ sơ riêng cho 5–10 thiết bị thực tế, mã duy nhất và tem mẫu |
| Tra cứu | In tem, quét mở đúng hồ sơ và nhập mã thủ công dự phòng |
| Vận hành | Báo hỏng hoặc ghi chú sửa chữa sau xác nhận, có lịch sử |
| Đánh giá | Quét đúng thiết bị; xử lý mã trùng/không có quyền; không tạo cập nhật lặp; ghi nhận phản hồi trên điện thoại thực tế |

Đầu tiên hoàn thiện quản lý từng tài sản và phân quyền, sau đó thử quét mã. In hàng loạt, kiểm kê theo phòng, PWA/offline và đánh dấu vị trí trên 3D chỉ mở rộng khi có nhu cầu và dữ liệu phù hợp.

**Kế hoạch liên quan:** [Quản lý tài sản](../plans/ASSET-MANAGEMENT-CHECKLIST.md), [Vai trò và phân quyền](../plans/ROLE-MANAGEMENT-CHECKLIST.md).
