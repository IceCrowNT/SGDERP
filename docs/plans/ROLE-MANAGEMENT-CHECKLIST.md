# Kế hoạch vai trò và phân quyền

Cập nhật: **09/11/2026**. Bản đầu `/roles` đã triển khai và kiểm thử đạt. HR/quản trị có phạm vi công ty; workflow có quyền hành động và giới hạn theo hồ sơ.

Rule nghiệp vụ: [ROLE-MANAGEMENT-RULES](../../.agents/rules/ROLE-MANAGEMENT-RULES.md).

## Đồng bộ giao diện — 09/11/2026

- [x] Tài khoản và nhật ký bổ sung thẻ số liệu theo dữ liệu được phép xem, nhãn trạng thái/quyền; danh sách trên mobile dùng thẻ. Nhật ký ghi rõ số liệu theo bộ lọc/trang, giữ bộ lọc phân hệ khi tìm kiếm; IP thiếu hiển thị không ghi nhận. Không cấp/gỡ quyền hoặc sửa DB trong lần đổi UI.
- [x] TypeScript/lint đạt; nhóm phân quyền 9/9 E2E đạt, nhóm nhân sự/tài khoản chạy lại 14/14 đạt. Chrome desktop/mobile: tài khoản/nhật ký không tràn ngang, tìm kiếm nhật ký giữ bộ lọc phân hệ.

## Bộ vai trò tối thiểu

- Giữ `ADMIN` (quản trị), `DEFAULT` (cá nhân) và `HR_MANAGER` với nhãn **Quản lý hành chính nhân sự**. Giữ mã/ID HCNS hiện có; đây là role tùy chỉnh, không phải chức vụ hay người duyệt mặc định.
- Bỏ role mẫu `IT_ADMIN`, `HR_STAFF`, `DEPT_HEAD`, `ACCOUNTANT`, `STAFF` sau kiểm tra gán/quyền. Tài khoản đã có cả hai role HCNS chỉ cần giữ `HR_MANAGER`, bộ quyền hiệu lực không đổi.
- Seed mới chỉ tạo ba role trên khi khởi tạo; không phục hồi role nghiệp vụ đã xóa hoặc grant đã thu hồi. DEFAULT không grant; ADMIN chỉ quản trị chức năng hiện có; HCNS chỉ HR MANAGE. Quyền workflow có trong danh mục nhưng không tự cấp.
- Dữ liệu đang dùng giữ nguyên catalog/grant lịch sử TASK/SYSTEM/APPROVAL ngoài ma trận; không chuyển chúng thành quyền workflow. Chúng không chứng minh tính năng tương ứng đã triển khai.
- [x] Kiểm tra DB: 8 role; ADMIN/IT_ADMIN trùng toàn bộ quyền, HR_STAFF được HR_MANAGER bao phủ; bốn role ngoài HCNS chưa được gán. Thử transaction dọn role rồi rollback: quyền hiệu lực và dữ liệu tài khoản/nhân sự/phòng ban/catalog không đổi.
- [x] Đã dọn DB còn 3 role và 2 gán tài khoản–role; 72 nhân sự, 2 tài khoản, phòng ban/catalog và quyền hiệu lực giữ nguyên. Backup RBAC cục bộ tại `outputs/role-cleanup/`, audit `ROLE/CONSOLIDATE` ghi trong cùng transaction. Seed trên DB tạm: tạo đúng 3 role/11 quyền hiện hành, chạy lại không đổi, không khôi phục role đã xóa/grant đã thu hồi. 8 E2E phân quyền + 6 unit đạt; TypeScript, lint seed, diff check đạt; Chrome xác nhận trang vận hành hiển thị 3 role. Không sửa schema/migration hoặc chạy lại seed trên DB vận hành.

## Khi thêm tính năng hoặc quyền mới

Quản trị viên tạo role và chọn **quyền đã triển khai** ngay tại `/roles`, không cần sửa code. Một tên quyền mới tự nhập không thể tự bảo vệ chức năng.

1. Lập trình viên định nghĩa quyền/phạm vi và guard ở trang, action, truy vấn, menu của tính năng; mặc định từ chối khi chưa được cấp.
2. Thêm quyền vào bảng `quyen` bằng migration cho DB hiện có và đồng bộ seed cho cài mới. Không chạy lại seed để sửa quyền vận hành.
3. Cập nhật `src/lib/role-catalog.ts`, `src/lib/validations/role.ts` và phần giao diện liên quan nếu có kiểu hành động khác VIEW/MANAGE. Ma trận hiện dựa trên catalog trong code, chưa tự khám phá mọi phân hệ.
4. Kiểm thử cấp/thu hồi, truy cập URL/action trực tiếp, scope và các vai trò hiện có. Không tự cấp quyền mới cho ADMIN/HCNS hoặc tạo thêm role mẫu.
5. Sau triển khai, người quản lý chọn quyền mới cho role phù hợp tại `/roles`; không cần tự sửa code cho mỗi lần gán quyền.

## Giao diện vai trò

- [x] Danh sách dùng thẻ vai trò, biểu tượng, nhãn quyền và số liệu thật; hướng dẫn/mô tả dài thu vào phần mở rộng theo rule Frontend. DEFAULT xem được quyền ở chế độ chỉ đọc.
- [x] Xóa role tùy chỉnh: nút luôn tiếp cận được; nếu còn tài khoản thì hộp thoại liệt kê người đang dùng, có nút **Đổi vai trò** để gỡ/chuyển. Chỉ xác nhận xóa khi đã hết gán. Role hệ thống ghi rõ **Không thể xóa**. Không tự gỡ quyền hàng loạt; server vẫn bảo vệ role hệ thống, đang dùng và quản trị cuối cùng.
- [x] 9 E2E phân quyền đạt, gồm luồng xem tài khoản đang dùng → gỡ vai trò → xóa thành công, tài khoản vẫn được giữ. TypeScript/lint đạt; Chrome kiểm tra trang thật trên desktop/mobile, DEFAULT chỉ đọc và hướng dẫn xóa HCNS. Không đổi schema, quyền hoặc gán role vận hành trong lần sửa giao diện.

## Đã triển khai

- [x] Tách nghiệp vụ khỏi rule Frontend/Backend chung sang `ROLE-MANAGEMENT-RULES.md`; đăng ký router, giữ quyết định DB trong plan. Chỉ sắp xếp tài liệu, không thay tính năng.

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

Bộ 8 role từng được tạo bởi seed demo đã được thay bằng chính sách tối thiểu ở trên; không dùng số lượng demo cũ làm cấu hình vận hành.

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

- [x] Tách ràng buộc DB phân quyền khỏi rule tổng quát; giữ trong mục thiết kế DB của phân hệ, không sửa grant hoặc dữ liệu.
- [x] Áp dụng [thiết kế DEFAULT và quyền cá nhân](../THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md): nền dashboard/profile cho tài khoản hợp lệ; DEFAULT không cấp HR/workflow, role STAFF mẫu được bỏ theo mục thu gọn ở trên. Giữ grant nghiệp vụ hiện tại; không cấp hàng loạt cho tài khoản cũ.
- [x] Quyền điều phối cấp và gán tại `/roles` bởi ROLES MANAGE; bỏ action tự cấp và xác nhận tại workflow (06/11). Không suy quyền từ tên ADMIN.
- [x] Workflow giới hạn theo người gửi/người được giao, MANAGE điều phối toàn công ty. Quyền và người phụ trách phòng là hai điều kiện riêng.
- [ ] Scope phòng ban tổng quát chờ phân hệ cần dùng; chưa mở scope tùy ý trên UI. Không nâng scoped grant cũ thành toàn công ty.
- [ ] Khi thêm phân hệ, bổ sung quyền vào danh mục do code định nghĩa và kiểm tra server trước khi đưa vào ma trận.

## Thiết kế DB cần giữ

- Giữ 4 bảng `vai_tro`, `quyen`, `vai_tro_quyen`, `tai_khoan_vai_tro`; hai bảng nối dùng khóa kép, không gộp bảng hoặc thêm ID chỉ để đổi hình thức. Role gắn tài khoản, không gắn chức vụ; nhật ký tham chiếu tài khoản thao tác.
- Trigger `tai_khoan_vai_tro_cung_cong_ty` bảo đảm gán cùng công ty; trigger bảo vệ công ty của role/tài khoản. Partial unique `tai_khoan_mot_vai_tro_chinh` cho tối đa một vai trò chính, không ngăn hợp nhất quyền từ các role khác của cùng tài khoản.
- Mutation khóa hàng công ty → advisory `(260126, companyId)`, kiểm tra lại quyền/phiên và version `updated_at`, ghi audit cùng transaction. Không reset/seed để phục hồi grant; migration `20261104110000_quan_ly_vai_tro` chuyển đặc quyền cũ thành grant tường minh, không dùng tên ADMIN để suy quyền runtime.
- Không sửa `pham_vi` của quyền toàn cục để giả lập quyền theo phòng; phạm vi mới cần thiết kế tại lần cấp quyền cùng bộ lọc server. DEFAULT và trigger bảo vệ được quản lý tại [plan tài khoản/cá nhân](PROFILE-DASHBOARD-CHECKLIST.md#thiết-kế-db-cần-giữ); không chép lại chính sách ở đây.

Liên quan: [HR](HR-CHECKLIST.md) · [Workflow](WORKFLOW-CHECKLIST.md) · [Backend](../../.agents/rules/BACKEND-RULES.md) · [Kiến trúc](../ARCHITECTURE.md).
