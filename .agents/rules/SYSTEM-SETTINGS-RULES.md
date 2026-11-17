# Quy tắc cài đặt hệ thống

Phạm vi, DB và nghiệm thu tại [plan cài đặt](../../docs/plans/SYSTEM-SETTINGS-CHECKLIST.md). Nghiệp vụ AI tại [rule AI](AI-ASSISTANT-RULES.md); phân quyền tại [rule vai trò](ROLE-MANAGEMENT-RULES.md).

- `/settings` là đầu mối cấu hình; chỉ hiện mục đã triển khai và được cấp quyền. Trang con có URL riêng; không dùng một quyền SYSTEM tổng quát để mở mọi cấu hình.
- Menu/trang đầu hiện theo hợp quyền của mục con. Mỗi page/action kiểm tra phiên và quyền hiện tại, cùng công ty; layout hoặc ẩn menu không thay guard của entry point.
- `/settings/ai` mở theo hợp quyền `AI MANAGE_CONNECTIONS`, `AI MANAGE_LIMITS`, `AI VIEW_USAGE`; mỗi vùng/action kiểm tra quyền riêng; không suy từ tên ADMIN, quản lý tài khoản, tài sản/vị trí hoặc quyền dùng chat.
- Cấp/thu hồi quyền tại `/roles`, không tạo ma trận hoặc nút tự cấp quyền trong khu cài đặt. Chỉ đưa quyền có guard/chức năng thực tế vào catalog.
- Cấu hình dùng chung thuộc công ty; cá nhân hóa thuộc profile. Không trả khóa đã lưu/tham chiếu kho bí mật về giao diện hoặc sao chép cấu hình AI vào bảng khác.
- Thay đổi giữ quy tắc phiên bản/audit của phân hệ sở hữu; lỗi giữ bản nhập, lưu thành công cập nhật trạng thái và xóa khóa vừa nhập khỏi form.
