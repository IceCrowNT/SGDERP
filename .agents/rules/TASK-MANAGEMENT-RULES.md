# Công việc và ticket hỗ trợ

Phạm vi: yêu cầu hỗ trợ tạo từ dashboard, nhận việc cá nhân/phòng, báo xong và nghiệm thu. **Đã có bản thử nghiệm, chưa nghiệm thu vận hành.** Đặc tả, quyết định áp dụng, DB, quyền và tiến độ do [plan công việc](../../docs/plans/TASK-MANAGEMENT-CHECKLIST.md) sở hữu. Đọc cả phần A và B trước sửa mã.

## Nguyên tắc nghiệp vụ

- Ưu tiên công việc; báo cáo tuần, Excel và công việc định kỳ tự sinh nằm ngoài bản đầu. Không dùng dữ liệu báo cáo tuần hoặc `cong_viec_ai` thay công việc nhân sự.
- Gửi tới người thì xác định phòng từ HR phía server; gửi tới phòng phải thể hiện rõ ai được thông báo và ai đã nhận. Hạng mục IT không mặc nhiên là phòng IT.
- Người yêu cầu và người thao tác phải được xác thực; chưa hỗ trợ gửi thay. Quản lý hai bên nhận thông báo theo nguồn đã xác nhận; không suy quản lý trực tiếp chỉ từ cây phòng ban.
- Hạn hoàn thành tùy chọn, mặc định null. Thời điểm báo xong, nghiệm thu và đóng là các mốc riêng; không lấy ngày nghiệm thu thay ngày hoàn thành.
- Bằng chứng và lịch sử có cùng phạm vi bảo vệ với đầu việc. Mọi thay đổi đã lưu phải có người làm, thời gian và hành động/nội dung thay đổi; thông báo và đường dẫn tệp không cấp quyền mới.
- Gửi cả phòng: thông báo mọi thành viên hoạt động có tài khoản và VIEW, cảnh báo phần chưa có tài khoản/quyền. Việc treo tại hàng đợi; người phụ trách phòng có VIEW + MANAGE giao nhân viên rồi nhân viên xác nhận. Không cho cá nhân tự tranh nhận. Chưa bao gồm phân hệ việc phòng ban đầy đủ.
- Quản lý trực tiếp từ `nhan_su.quan_ly_truc_tiep_id`, không tự backfill từ trưởng phòng. Chính sách nghiệm thu tại A.5; không tự nghiệm thu, không bỏ nghiệm thu bắt buộc. Chưa tự cấp grant pilot.

## Ticket qua trợ lý AI

- AI tra đích nhận cùng công ty theo tên/mã/chức danh/tên viết tắt; IT không mặc nhiên là tên phòng, nơi cần hỗ trợ không mặc nhiên là bên tiếp nhận. Nhiều đích thì hiển thị để chọn; đích chưa đủ điều kiện phải có lý do; không yêu cầu người dùng tự tìm tên ở màn hình khác. Sau đó soạn nháp; người dùng xem/sửa form và bấm Gửi yêu cầu. Không tạo đầu việc hoặc thông báo chỉ bằng tool call; dùng action tạo chung, không cho AI gửi thay.
- Hai công cụ cần VIEW + CREATE hiện hành; LOOKUP chỉ cho tra cứu. Bản nháp và nguồn được kiểm tra khi đọc lại chat, xác nhận kiểm tra lại quản lý/đích/quyền. Không tự cấp grant.
- Mở lại nháp đã gửi phải dẫn tới ticket hiện có theo request ID. Hạn trống và bắt đầu lúc gửi là mặc định; AI không tự bỏ nghiệm thu, không tự mang tệp chat sang bằng chứng. Thiết kế và giới hạn theo [B.9 của plan](../../docs/plans/TASK-MANAGEMENT-CHECKLIST.md#b9-ticket-hỗ-trợ-qua-ai-và-tinh-gọn-thao-tác--23112026).

## Ranh giới và tài liệu liên quan

Tuân thủ chuẩn [Backend](BACKEND-RULES.md), [Database](DATABASE-RULES.md), [Frontend](FRONTEND-RULES.md) và [phân quyền](ROLE-MANAGEMENT-RULES.md). Dữ liệu quản lý trực tiếp thuộc [HR](HR-RULES.md); hồ sơ nhiều bước và xuất vật tư theo [workflow](WORKFLOW-RULES.md); điểm vào cá nhân theo [dashboard](PROFILE-DASHBOARD-RULES.md). Không tạo đồng thời ticket và hồ sơ workflow độc lập cho cùng một yêu cầu nếu chưa có thiết kế tích hợp được duyệt.
