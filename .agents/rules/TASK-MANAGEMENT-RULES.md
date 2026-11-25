# Công việc và ticket hỗ trợ

Phạm vi: yêu cầu hỗ trợ tạo từ dashboard, nhận việc cá nhân/phòng, báo xong và nghiệm thu. **Đã có bản thử nghiệm, chưa nghiệm thu vận hành.** Đặc tả, quyết định áp dụng, DB, quyền và tiến độ do [plan công việc](../../docs/plans/TASK-MANAGEMENT-CHECKLIST.md) sở hữu. Đọc cả phần A và B trước sửa mã.

## Nguyên tắc nghiệp vụ

- Ưu tiên công việc; báo cáo tuần, Excel và công việc định kỳ tự sinh nằm ngoài bản đầu. Không dùng dữ liệu báo cáo tuần hoặc `cong_viec_ai` thay công việc nhân sự.
- Gửi tới người thì xác định phòng từ HR phía server; gửi tới phòng phải thể hiện rõ ai được thông báo và ai đã nhận. Hạng mục IT không mặc nhiên là phòng IT.
- Người yêu cầu và người thao tác phải được xác thực; chưa hỗ trợ gửi thay. Quản lý hiệu lực theo [HR](HR-RULES.md): chỉ định riêng trước, sau đó người phụ trách phòng; trưởng phòng tìm người phụ trách khác mình ở cấp trên. Nguồn thiếu/không hợp lệ phải báo rõ; không tự ghi ngược quan hệ vào HR.
- Hạn hoàn thành tùy chọn, mặc định null. Thời điểm báo xong, nghiệm thu và đóng là các mốc riêng; không lấy ngày nghiệm thu thay ngày hoàn thành.
- Bằng chứng và lịch sử có cùng phạm vi bảo vệ với đầu việc. Mọi thay đổi đã lưu phải có người làm, thời gian và hành động/nội dung thay đổi; thông báo và đường dẫn tệp không cấp quyền mới.
- Gửi cả phòng: thông báo mọi thành viên hoạt động có tài khoản và VIEW, cảnh báo phần chưa có tài khoản/quyền. Việc treo tại hàng đợi; người phụ trách phòng có VIEW + MANAGE giao nhân viên rồi nhân viên xác nhận. Không cho cá nhân tự tranh nhận. Chưa bao gồm phân hệ việc phòng ban đầy đủ.
- Công việc lưu người quản lý tại lúc tạo/giao/nhận; thay HR không tự cập nhật việc cũ. Khi nhận việc, xác định lại quản lý bên hỗ trợ theo cơ cấu hiện hành và ghi lịch sử. Chỉ head phòng gốc thực sự mới có thể không có cấp trên; chế độ Quản lý nghiệm thu luôn cần người cụ thể có ACCEPT. Không tự nghiệm thu hoặc bỏ nghiệm thu bắt buộc; đổi người nghiệm thu chỉ tới người yêu cầu hoặc quản lý hiệu lực bên yêu cầu. Chi tiết tại A.5/DB.9 của plan; chưa tự cấp grant pilot.
- Điều phối có MANAGE trong phòng được bàn giao việc đang làm/cần bổ sung cho người đủ điều kiện cùng phòng, có lý do; người mới phải nhận lại. Giữ lịch sử/tệp/vòng báo xong. Chờ nhận lại vẫn cho người yêu cầu sửa nội dung có audit; không bàn giao khi đang chờ nghiệm thu hoặc đã đóng.
- Thông báo hiện người thao tác, hành động và thời điểm trong phạm vi được xem. Không thông báo cho chính người thao tác; tải từng tệp chỉ ghi audit, báo xong mới thông báo. Bàn giao thông báo cả người thực hiện/quản lý cũ còn tài khoản hợp lệ, nhưng không duy trì quyền xem đã hết.

## Ticket qua trợ lý AI

- AI tra đích nhận cùng công ty theo tên/mã/chức danh/tên viết tắt; IT không mặc nhiên là tên phòng, nơi cần hỗ trợ không mặc nhiên là bên tiếp nhận. Nhiều đích thì hiển thị để chọn; đích chưa đủ điều kiện phải có lý do; không yêu cầu người dùng tự tìm tên ở màn hình khác. Sau đó soạn nháp; người dùng xem/sửa form và bấm Gửi yêu cầu. Không tạo đầu việc hoặc thông báo chỉ bằng tool call; dùng action tạo chung, không cho AI gửi thay.
- Hai công cụ cần VIEW + CREATE hiện hành; LOOKUP chỉ cho tra cứu. Bản nháp và nguồn được kiểm tra khi đọc lại chat, xác nhận kiểm tra lại quản lý/đích/quyền. Không tự cấp grant.
- Mở lại nháp đã gửi phải dẫn tới ticket hiện có theo request ID. Hạn trống và bắt đầu lúc gửi là mặc định; AI không tự bỏ nghiệm thu, không tự mang tệp chat sang bằng chứng. Thiết kế và giới hạn theo [B.9 của plan](../../docs/plans/TASK-MANAGEMENT-CHECKLIST.md#b9-ticket-hỗ-trợ-qua-ai-và-tinh-gọn-thao-tác--23112026).

## Ranh giới và tài liệu liên quan

Tuân thủ chuẩn [Backend](BACKEND-RULES.md), [Database](DATABASE-RULES.md), [Frontend](FRONTEND-RULES.md) và [phân quyền](ROLE-MANAGEMENT-RULES.md). Dữ liệu quản lý trực tiếp thuộc [HR](HR-RULES.md); hồ sơ nhiều bước và xuất vật tư theo [workflow](WORKFLOW-RULES.md); điểm vào cá nhân theo [dashboard](PROFILE-DASHBOARD-RULES.md). Không tạo đồng thời ticket và hồ sơ workflow độc lập cho cùng một yêu cầu nếu chưa có thiết kế tích hợp được duyệt.
