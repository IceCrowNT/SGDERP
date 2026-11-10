# QUY TẮC VAI TRÒ VÀ PHÂN QUYỀN

Nghiệp vụ hiện hành; thiết kế DB, phạm vi còn kế hoạch và kết quả triển khai tại [Plan phân quyền](../../docs/plans/ROLE-MANAGEMENT-CHECKLIST.md).

- Quyền hiệu lực lấy từ tài khoản → vai trò → quyền trong DB. Không có JSON permissions trên role; không suy đặc quyền từ mã ADMIN/IT_ADMIN, chức vụ hay head. Không cộng quyền giữa các tài khoản cùng nhân sự.
- `permissionLevels` hợp nhất VIEW/MANAGE có `pham_vi=ALL`; không nâng grant theo phạm vi hẹp thành toàn công ty. Catalog tại `role-catalog.ts`. MANAGE gồm VIEW cho các nhóm dùng hai mức này; quyền workflow theo [rule workflow](WORKFLOW-RULES.md).
- `/accounts` cần ACCOUNTS MANAGE; `/roles` cần ROLES VIEW/MANAGE; nhật ký cần AUDIT VIEW. HR MANAGE chỉ quản lý hồ sơ/cơ cấu, không tự cấp quyền tài khoản.
- Người chỉ quản lý tài khoản không được sửa tài khoản hoặc gán role có quyền vượt quyền của mình; kiểm tra cả quyền cũ và mới, kể cả đặt lại mật khẩu. ROLES MANAGE được quản lý ma trận và cấp quyền trong công ty.
- Luôn giữ ít nhất một tài khoản sử dụng được có cả ACCOUNTS MANAGE và ROLES MANAGE; hai quyền có thể đến từ hai role. Chặn mọi thay đổi/nghỉ việc làm mất quản trị cuối cùng.
- Mã role bất biến; không xóa role hệ thống hoặc đang dùng. Khi sửa chỉ đổi grant trong catalog hiện hành, giữ grant ngoài ma trận; không tự chuyển quyền cũ thành quyền mới. Không dùng seed để phục hồi quyền bị thu hồi.
- Gán role không mở tài khoản khóa. Sửa tài khoản/mật khẩu thu hồi phiên theo phiên bản đăng nhập; đổi grant được kiểm tra lại từ DB ở request tiếp theo. Mutation có kiểm tra version `updated_at` và audit; khóa theo plan.
- Cấp quyền tập trung tại Vai trò và phân quyền (hoặc gán role có sẵn trong quản lý tài khoản theo quyền người thao tác). Trang nghiệp vụ không tự cấp hay yêu cầu người dùng xác nhận kích hoạt. Menu, trang và action dùng cùng chính sách quyền; revalidate layout sau thay đổi.
- DEFAULT và khả năng cá nhân sẵn có theo [rule cá nhân](PROFILE-DASHBOARD-RULES.md). Tài khoản đăng nhập bằng username duy nhất, không dùng mã nhân sự làm tên đăng nhập chung cho nhiều tài khoản.

## Vai trò mẫu và mở rộng quyền

- Chỉ khởi tạo ADMIN, DEFAULT và một role HCNS (`HR_MANAGER`, nhãn Quản lý hành chính nhân sự). HCNS là role tùy chỉnh; ADMIN/DEFAULT là role hệ thống. Không sinh sẵn role theo mọi chức danh/phòng ban hoặc tái tạo role nghiệp vụ đã bị xóa.
- Quản trị viên tùy chỉnh role bằng quyền đã có tại `/roles`. Quyền cho tính năng mới phải có kiểm tra server/phạm vi, catalog, validation và migration tương ứng trước khi đưa vào ma trận; quy trình mở rộng tại plan. Không tự gán quyền mới cho các role đang dùng.

## Giao diện quản lý

- Danh sách vai trò ưu tiên thẻ, nhãn quyền, số tài khoản và biểu tượng; hướng dẫn/mô tả dài chỉ mở khi cần. Không dùng thống kê mẫu.
- Nút xóa role tùy chỉnh mở xác nhận hoặc danh sách tài khoản cần gỡ; có lối vào đổi vai trò từng tài khoản. Chặn xác nhận khi còn gán, không tự gỡ quyền. Role hệ thống ghi rõ lý do không xóa; DEFAULT xem quyền ở chế độ chỉ đọc.
