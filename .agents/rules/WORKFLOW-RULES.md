# QUY TẮC QUY TRÌNH VÀ DUYỆT CÔNG VIỆC

Áp dụng cho động cơ tuần tự hiện có. Phần kéo thả/biểu mẫu/thông báo còn kế hoạch được phân biệt tại [Plan workflow](../../docs/plans/WORKFLOW-CHECKLIST.md); schema và luồng chi tiết tại [Thiết kế quy trình](../../docs/THIET-KE-QUY-TRINH.md).

- Quyền dùng `workflowActions`/`canWorkflow`: VIEW/CREATE/APPROVE/EXECUTE/MANAGE. MANAGE gồm xem toàn công ty, quản lý mẫu và điều phối; không gồm gửi, duyệt hoặc thực hiện. Các hành động còn lại cần VIEW và quyền tương ứng trên cùng tài khoản.
- Đọc lọc công ty và hồ sơ của người gửi/người được giao, kể cả bước đã xử lý; chỉ MANAGE đọc toàn công ty. Người không gắn nhân sự chỉ cấu hình/điều phối khi được cấp MANAGE.
- CREATE/APPROVE/EXECUTE cần nhân sự ACTIVE. Phê duyệt không tự duyệt theo ID nhân sự, kể cả qua tài khoản thứ hai. Chuyển giao/hủy/từ chối có lý do; điều phối không duyệt thay hoặc bỏ bước.
- Chỉ phân công nếu một tài khoản đang mở của người đó có đủ VIEW và hành động; không hợp nhất quyền từ nhiều tài khoản. Mất quyền/nghỉ việc phải bị chặn tại server.
- Chốt phòng người gửi lúc gửi; phân giải head khi kích hoạt bước, bước đã giao giữ nguyên. Thiếu người/quyền thì chặn gửi hoặc BLOCKED; điều phối chuyển giao để xử lý. UI kiểm tra điều kiện người được giao để hiển thị vướng mắc, không giả định đã có job nền.
- Mutation qua `src/actions/workflow.ts`, đọc lại actor/trạng thái/quyền trong transaction; state, assignment và history cùng commit. Khóa và ràng buộc SQL theo mục DB của plan, không gọi dịch vụ ngoài trong transaction.
- Mẫu đã phát hành bất biến. Không có action xóa mẫu phát hành/hồ sơ/lịch sử; lập lại hồ sơ bị từ chối tạo nháp mới liên kết bản cũ. Danh sách workspace bản đầu giới hạn 200 bản ghi cập nhật gần nhất và ghi rõ trên UI; dashboard đếm độc lập theo [rule cá nhân](PROFILE-DASHBOARD-RULES.md).
- Quyền được cấp tại `/roles`; vào workflow chỉ dùng quyền đã có. Người có MANAGE thấy mẫu/hồ sơ và nút tạo mẫu đầu tiên kể cả khi chưa có mẫu. Người thiếu quyền nhận thông báo; liên kết quản lý phân quyền chỉ dành cho ROLES MANAGE. Không tự gán người, cấp grant hay phát hành mẫu cho dữ liệu vận hành.
