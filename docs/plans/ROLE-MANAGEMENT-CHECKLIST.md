# Kế hoạch vai trò và phân quyền

Cập nhật: **06/11/2026**. Bản đầu `/roles` đã triển khai và kiểm thử đạt. HR/quản trị có phạm vi công ty; workflow có quyền hành động và giới hạn theo hồ sơ.

## Đã triển khai

- [x] Giữ 4 bảng RBAC và ID hiện có; một tài khoản nhiều role, không cộng quyền giữa các tài khoản của cùng người.
- [x] `/roles`: tạo/sửa vai trò, ma trận quyền, xem số tài khoản chịu ảnh hưởng, xóa role chưa dùng; chặn xóa role hệ thống.
- [x] Gán/gỡ vai trò theo tài khoản, xem quyền hiệu lực trước khi lưu; quyền đổi từ request tiếp theo trong phiên đang mở.
- [x] Thêm WORKFLOW VIEW/CREATE/APPROVE/EXECUTE/MANAGE tại `/roles`, hợp nhất quyền theo tài khoản; không tự cấp cho role hiện có.
- [x] Tách HR, ACCOUNTS, ROLES, AUDIT; menu, trang và action kiểm tra cùng quyền. Nhật ký chỉ đọc trong công ty được cấp quyền.
- [x] Bỏ đặc quyền ngầm theo mã ADMIN/IT_ADMIN; migration chuyển quyền quản trị cũ thành quyền DB, không chạy seed lại.
- [x] Chống sửa vượt quyền ở quản lý tài khoản, gán khác công ty, ghi đè bản cũ và mất quản trị cuối cùng; mutation và audit cùng transaction.
- [x] Bỏ secret JWT mặc định; seed không phục hồi ma trận quyền đã chỉnh. DB kiểm tra liên kết role cùng công ty và tối đa một vai trò chính.
- [x] 20 ca E2E (8 phân quyền, 5 vòng đời HR, 6 nhân sự/tài khoản, 1 CRUD phòng ban) và 3 unit đạt sau sửa các lỗi phát hiện. TypeScript, lint phần thay đổi, `git diff --check` đạt; đã xem desktop/mobile, không tràn ngang/lỗi JS.
- [x] Workflow có 10 E2E và 3 unit riêng (tổng 30 E2E, 6 unit cùng phân quyền); UI lưu được nhóm quyền riêng, không cấp tự động cho tài khoản thật.
- [x] Đồng bộ quy ước khóa DB: `id`, `account_id`, `role_id`, `permission_id`, `company_id`; trigger cùng công ty/DEFAULT đã cập nhật và dữ liệu phân quyền giữ nguyên sau migration 06/11.
- [ ] Người phụ trách dùng thử ma trận trên nhóm tài khoản thực tế và nghiệm thu.

Kiểm tra 06/11: E2E Chrome luồng cấp/gỡ quyền tại `/roles` đạt; tài khoản nhận quyền dùng workflow ngay, thu hồi quyền chặn truy cập, người thiếu quyền không có nút tự cấp. TypeScript, lint phần thay đổi và `git diff --check` đạt. Không sửa dữ liệu/quyền vận hành.

Kiểm tra sau đổi tên DB 06/11: toàn bộ 51 E2E và 9 unit đạt trên tiến trình ứng dụng mới; 9 role, 18 quyền, 45 grant role–quyền và 70 gán tài khoản–role khớp backup.

Sau khi tạo lại database demo cùng ngày: seed hiện có 8 role, 18 quyền, 46 grant và 1 gán role cho tài khoản quản trị; không còn tài khoản thử nghiệm cũ.

## Quy tắc vận hành

| Quyền | Ý nghĩa |
| --- | --- |
| Nhân sự/phòng ban | Không truy cập / Xem / Quản lý; gồm danh bạ và 3D |
| Tài khoản | Không truy cập / Quản lý; chỉ sửa/gán quyền nằm trong quyền của người thao tác, trừ người có quyền quản lý phân quyền |
| Vai trò/phân quyền | Không truy cập / Xem / Quản lý; Quản lý là quyền quản trị nhạy cảm, có thể cấp mọi quyền trong công ty |
| Nhật ký | Không truy cập / Xem; không cấp quyền sửa/xóa lịch sử |

- Vai trò không phải chức vụ hoặc người phụ trách phòng; chọn head không tự cấp quyền.
- MANAGE bao gồm VIEW; riêng workflow không bao gồm CREATE/APPROVE/EXECUTE; quyền nhiều role hợp nhất. Không truy cập là không cấp, không phải phủ định role khác.
- Phải còn ít nhất một tài khoản mở, người chưa nghỉ việc, có cả ACCOUNTS MANAGE và ROLES MANAGE. Chặn mọi thay đổi làm mất điều kiện này.
- Nghỉ việc khóa các tài khoản và thu hồi phiên; đi làm lại không tự mở. Gán role không thay trạng thái tài khoản.
- Mã role bất biến. Quyền TASK/APPROVAL/SYSTEM cũ ngoài ma trận được hiển thị riêng và giữ nguyên khi lưu, không tự đổi APPROVE/ASSIGN thành MANAGE.
- Migration `20261104110000_quan_ly_vai_tro` thêm quyền/ràng buộc, chuẩn hóa cờ vai trò chính và nhãn ADMIN; không xóa bảng, người hay tài khoản. Có bản sao DB JSON nhất quán, riêng tư trước áp dụng.

Kiểm chứng dữ liệu: 72 nhân sự, 60 tài khoản, 19 phòng ban và dữ liệu công ty không đổi so với backup; các grant cũ giữ nguyên. Đã kiểm tra rollback khi ghi audit lỗi, gán/sửa đồng thời, quyền hiệu lực trong phiên mở và bảo vệ quản trị cuối cùng.

Kiểm tra bổ sung 05/11: 38 E2E tích hợp + 7 unit đạt; DEFAULT không có quyền nghiệp vụ, trigger chặn cấp grant; quyền workflow hiện cấp tập trung tại `/roles` (điều chỉnh 06/11). Xem [checklist cá nhân](PROFILE-DASHBOARD-CHECKLIST.md).

## Bước sau

- [x] Áp dụng [thiết kế DEFAULT và quyền cá nhân](../THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md): nền dashboard/profile cho tài khoản hợp lệ; DEFAULT không cấp HR/workflow, giữ role STAFF cũ. Giữ grant nghiệp vụ hiện tại; không cấp hàng loạt cho tài khoản cũ.
- [x] Quyền điều phối cấp và gán tại `/roles` bởi ROLES MANAGE; bỏ action tự cấp và xác nhận tại workflow (06/11). Không suy quyền từ tên ADMIN.
- [x] Workflow giới hạn theo người gửi/người được giao, MANAGE điều phối toàn công ty. Quyền và người phụ trách phòng là hai điều kiện riêng.
- [ ] Scope phòng ban tổng quát chờ phân hệ cần dùng; chưa mở scope tùy ý trên UI. Không nâng scoped grant cũ thành toàn công ty.
- [ ] Khi thêm phân hệ, bổ sung quyền vào danh mục do code định nghĩa và kiểm tra server trước khi đưa vào ma trận.

Liên quan: [HR](HR-CHECKLIST.md) · [Workflow](WORKFLOW-CHECKLIST.md) · [Backend](../../.agents/rules/BACKEND-RULES.md) · [Kiến trúc](../ARCHITECTURE.md).
