# Kế hoạch quy trình và duyệt công việc

Cập nhật: **06/11/2026**. **Bản thử nghiệm tuần tự đã triển khai và kiểm thử đạt; chờ cấu hình người dùng thực tế. Đã chốt hướng thiết kế trình tạo quy trình kéo thả, luồng sử dụng mẫu, thông báo và dashboard; chưa triển khai phần mở rộng.** Thiết kế chi tiết tại [Thiết kế quy trình](../THIET-KE-QUY-TRINH.md).

## Bản đầu

`/workflows`: tạo mẫu có phiên bản → phát hành → nhân sự gửi hồ sơ → duyệt/thực hiện tuần tự → kết quả và lịch sử. Luồng hỗ trợ IT được kiểm thử bằng công ty và tài khoản giả; chưa gán người hoặc quyền cho dữ liệu vận hành.

- [x] 5 bảng tiếng Việt, thêm vào 9 bảng lõi; migration chạy trên DB tạm trước khi áp dụng local sau backup. Không seed lại HR/tài khoản/quyền đang có.
- [x] `/roles` chọn riêng VIEW, CREATE, APPROVE, EXECUTE, MANAGE; server kiểm tra quyền **và** quan hệ hồ sơ/người được giao.
- [x] Mẫu nháp, phát hành, ngừng dùng, sao chép phiên bản; mẫu đã phát hành bất biến, một bản phát hành cho mỗi mã/công ty.
- [x] Hồ sơ nháp, gửi, từ chối, lập lại thành hồ sơ mới; hộp việc, chi tiết, lịch sử. Chỉ lấy tối đa 200 hồ sơ được cập nhật gần nhất theo phạm vi quyền.
- [x] Chọn nhân sự cụ thể hoặc phụ trách phòng người gửi; thiếu người/quyền chặn gửi hoặc tạm dừng bước. Điều phối chuyển giao có lý do, không duyệt thay.
- [x] Chốt phòng lúc gửi, chốt người lúc kích hoạt bước; không tự duyệt kể cả qua tài khoản thứ hai. Mất quyền/nghỉ việc chặn xử lý ở server.
- [x] Khóa công ty → khóa phân quyền → hàng hồ sơ; trạng thái, phân công và lịch sử cùng transaction. Trigger giữ mẫu/nội dung đã gửi/lịch sử, FK cùng công ty/cùng mẫu và một bước mở.
- [x] Chuẩn hóa khóa workflow sang `id`, `company_id` và các FK nghiệp vụ có hậu tố `_id`; cập nhật trigger bảo vệ mẫu/hồ sơ, thử đủ 15 migration trên DB tạm và giữ nguyên dữ liệu hiện có.
- [x] 10 E2E workflow + 20 E2E hồi quy phân quyền/HR/phòng ban + 6 unit đạt. TypeScript, lint phần thay đổi, schema diff rỗng và `git diff --check` đạt. Đã xem desktop/mobile.
- [x] Build Webpack đạt; build Turbopack gặp lỗi môi trường mở cổng tiến trình khi xử lý CSS. Không đổi framework/config/dependency để vượt lỗi.
- [x] Đối chiếu backup: 72 nhân sự, 60 tài khoản, 19 phòng ban, 7 role và các grant cũ không đổi. Chỉ thêm 5 quyền và 5 bảng rỗng; dữ liệu kiểm thử đã dọn.
- [ ] Người phụ trách chọn pilot thực tế, cấp quyền qua `/roles`, chọn head/người xử lý và nghiệm thu.
- [x] Sửa trải nghiệm khởi tạo theo [thiết kế không gian cá nhân](../THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md): quyền cấp tập trung tại `/roles`, mở giao diện và nút tạo mẫu khi đủ quyền. Đã bỏ bước xác nhận/tự cấp quyền tại workflow theo yêu cầu 06/11. Kiểm tra 05/11: chưa role vận hành nào có WORKFLOW, chưa có mẫu; đây là nguyên nhân admin chỉ thấy hướng dẫn sang `/roles`.

Kiểm tra bổ sung 05/11: bộ 38 E2E tích hợp và 7 unit đạt sau bổ sung onboarding và dashboard cá nhân. Không cấp thêm grant cho công ty thật khi kiểm thử.

Kiểm tra 06/11: E2E Chrome luồng cấp/gỡ quyền tại `/roles` đạt; tài khoản nhận quyền dùng workflow ngay, thu hồi quyền chặn truy cập, người thiếu quyền không có nút tự cấp. TypeScript, lint phần thay đổi và `git diff --check` đạt. Không sửa dữ liệu/quyền vận hành.

Kiểm tra sau đổi tên DB 06/11: toàn bộ 51 E2E và 9 unit đạt trên bản build mới; mẫu quy trình 1, bước mẫu 4, chưa có hồ sơ chạy, đúng bằng backup trước migration. Trigger bảo vệ không còn tham chiếu cột cũ.

Sau khi tạo lại database demo cùng ngày: 5 bảng workflow đã được tạo đúng schema và đang rỗng; mẫu/bước thử cũ không phục hồi. Tạo mẫu demo mới qua `/workflows` sau khi cấp quyền tại `/roles`.

## Phạm vi quyền

| Quyền | Có thể làm |
| --- | --- |
| VIEW | Xem mẫu phát hành; hồ sơ mình gửi, được giao hoặc đã xử lý |
| CREATE | Kèm VIEW: tạo/sửa/gửi/hủy nháp của mình |
| APPROVE | Kèm VIEW: duyệt hoặc từ chối bước đang giao cho mình |
| EXECUTE | Kèm VIEW: hoàn tất bước thực hiện đang giao cho mình |
| MANAGE | Gồm VIEW toàn công ty, quản lý mẫu, chuyển giao, hủy hồ sơ đang chạy; không bao gồm CREATE/APPROVE/EXECUTE |

`pham_vi=ALL` chỉ xác nhận grant workflow hợp lệ trong tenant; quyền VIEW vẫn có bộ lọc theo hồ sơ, không có nghĩa thấy tất cả. Chưa xây scope phòng ban tổng quát. Chức vụ và head không tự cấp quyền.

Chưa gồm tệp đính kèm, biểu mẫu động, duyệt song song, điều kiện, hạn mức tiền, ủy quyền, nhắc việc/email hoặc kéo–thả trong mã nguồn hiện tại. Không tạo hai nơi phê duyệt chính thức cho cùng hồ sơ với 1Office.

## Hướng mở rộng trình thiết kế kéo thả

- [x] Chốt thiết kế giao diện dạng flowchart tương tự Visio với bảng công cụ, vùng vẽ, bảng cấu hình, kiểm tra và phát hành phiên bản.
- [x] Chốt 8 hình ban đầu: bắt đầu, kết thúc, xử lý, phê duyệt, điều kiện, nhập dữ liệu, dữ liệu và điểm nối.
- [x] Phân biệt người thiết kế mẫu với người tạo hồ sơ; dữ liệu tự lấy theo người tạo hồ sơ, người đang xử lý, hệ thống, bước trước hoặc danh mục được phép.
- [x] Chốt hai luồng giao diện: quản trị viên thiết kế/phát hành mẫu; người dùng chọn mẫu, điền biểu mẫu và tạo yêu cầu/hồ sơ quy trình.
- [x] Chốt dashboard ưu tiên “đang đến lượt tôi”; thông báo chỉ là tín hiệu, bước PENDING và quyền tại server mới quyết định khả năng xử lý.
- [x] Chốt nguyên tắc phát hành: một điểm bắt đầu, có điểm kết thúc, không có hình rời, nhánh điều kiện có mặc định, phiên bản đã phát hành bất biến.
- [ ] Lập bản mẫu kỹ thuật vùng kéo thả và đánh giá thư viện phù hợp; chưa cài thêm dependency.
- [ ] Thiết kế migration từ danh sách bước tuần tự sang nút, liên kết và trường dữ liệu; phải giữ mẫu/hồ sơ hiện có và thử trên DB tạm trước.
- [ ] Triển khai cấu hình biểu mẫu, tự điền dữ liệu và chạy một nhánh tại một thời điểm; chưa hỗ trợ vòng lặp hoặc song song ở giai đoạn đầu.
- [ ] Thiết kế và triển khai thông báo trong ứng dụng khi bước được kích hoạt, chống tạo trùng và liên kết đúng hồ sơ; email/thông báo đẩy để sau.
- [ ] Kiểm thử phân quyền, cùng công ty, phiên bản mẫu, điều kiện nhánh, dữ liệu tự điền và khả năng khôi phục khi migration lỗi.

## Cách bắt đầu dùng thử

1. Tại `/roles`, cấp MANAGE quy trình cho tài khoản cấu hình; người gửi cần VIEW + CREATE, người duyệt VIEW + APPROVE, người thực hiện VIEW + EXECUTE. Quyền gắn từng tài khoản, không mặc định theo chức vụ.
2. Tại `/departments`, chọn người phụ trách phòng nếu mẫu dùng cách tìm head. Người gửi/duyệt/thực hiện phải gắn nhân sự đang làm việc.
3. Tại `/workflows`, tạo mẫu “Hỗ trợ IT”: bước duyệt bởi phụ trách phòng → bước thực hiện bởi nhân sự IT được chọn. Phát hành rồi gửi một hồ sơ thử; người gửi không tự duyệt.

Chưa cấp quyền hoặc tạo mẫu nghiệp vụ cho công ty thật. Người phụ trách chọn đối tượng dùng thử trước khi nghiệm thu; không cần đổi schema để cấu hình luồng trên.
