# Tài khoản mặc định và không gian cá nhân

Cập nhật **06/11/2026 — bản hiện tại đã triển khai và kiểm thử; đã bổ sung định hướng thông báo và ưu tiên việc đến lượt cho workflow kéo thả, chưa triển khai phần mở rộng**. Chi tiết tại [Thiết kế tài khoản và không gian cá nhân](../THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md).

Rule nghiệp vụ: [PROFILE-DASHBOARD-RULES](../../.agents/rules/PROFILE-DASHBOARD-RULES.md).

## Đồng bộ giao diện — 09/11/2026

- [x] Profile có thẻ định danh, biểu tượng phòng/chức vụ, nhãn tài khoản và nhóm thông tin; các tab, trường sửa, đổi mật khẩu và upload giữ nguyên hành vi.
- [x] Nhóm không gian cá nhân 5/5 E2E đạt; kiểm tra Chrome desktop/mobile, không tràn ngang. TypeScript/lint đạt; giữ hành vi cập nhật liên hệ, avatar và mật khẩu.

## Phạm vi

- DEFAULT: dashboard của mình, profile và đổi mật khẩu; không mặc định được xem HR hoặc dùng workflow.
- Tạo tài khoản tùy chọn khi thêm người, tự sinh `namdh`, `namdh1`…; không bắt chọn role ngay. Chọn sẵn cho người tạo đủ quyền, vẫn bỏ chọn được.
- Profile sửa liên hệ/ảnh; dữ liệu cơ cấu, mã nhân sự và quyền chỉ xem. Dashboard lấy việc và yêu cầu thực tế của người đăng nhập.
- Giữ 0..N tài khoản/người, dữ liệu và quyền cũ. Không tạo tài khoản hàng loạt hoặc tự cấp workflow.

Đã sao lưu nhất quán DB cục bộ trước thay đổi: 73 nhân sự, 61 tài khoản; giữ dữ liệu người dùng vừa bổ sung. Migration `20261105120000_khong_gian_ca_nhan` đã thử toàn chuỗi trên DB tạm và áp dụng local; thêm cờ đổi mật khẩu/DEFAULT, không đổi tài khoản cũ. Đối chiếu sau kiểm thử: toàn bộ bản ghi cũ và grant cũ không đổi; dữ liệu kiểm thử đã dọn.

## Thực hiện theo thứ tự

- [x] Tách nghiệp vụ khỏi rule Frontend/Backend chung sang `PROFILE-DASHBOARD-RULES.md`; đăng ký router, giữ quyết định DB trong plan. Chỉ sắp xếp tài liệu, không thay tính năng.

- [x] Kiểm tra code và DB: workflow có chức năng nhưng chưa có grant/mẫu vận hành; DEFAULT là nhóm tối thiểu; STAFF mẫu đã được loại theo [plan phân quyền](ROLE-MANAGEMENT-CHECKLIST.md#bộ-vai-trò-tối-thiểu).
- [x] Lưu thiết kế luồng, trường profile, quyền, dashboard và thay đổi DB dự kiến.
- [x] Workflow: quyền cấp tập trung tại `/roles`, đã bỏ bước tự cấp/xác nhận tại trang quy trình; người đủ quyền thấy giao diện mẫu/hồ sơ và nút tạo mẫu đầu tiên.
- [x] Tài khoản: nhóm DEFAULT, sinh tên chống trùng đồng thời, mật khẩu tạm và đổi lần đầu; không bắt role ở form cơ bản.
- [x] Profile: liên hệ, ảnh, đổi mật khẩu; API/action chỉ dùng danh tính trong phiên.
- [x] Dashboard: bỏ khối không phục vụ cá nhân, thêm việc chờ duyệt/thực hiện và hồ sơ theo quyền thực tế.
- [x] Trực quan hóa dashboard (09/11): thẻ số liệu có biểu tượng, danh sách dạng bảng trên desktop/thẻ trên mobile, nhãn trạng thái, biểu đồ thanh yêu cầu cá nhân bấm lọc được, lối tắt dạng ô và minh họa trạng thái trống. Dùng dữ liệu/phạm vi quyền hiện có, không thêm dependency hoặc đổi DB.
- [x] Kiểm thử và cập nhật kết quả vào checklist liên quan; chỉ đánh dấu hoàn thành sau triển khai.
- [x] Tách ràng buộc DB tài khoản/cá nhân khỏi rule DB tổng quát, giữ tại mục thiết kế DB bên dưới.

## Thiết kế DB cần giữ

- `tai_khoan.bat_buoc_doi_mat_khau` Boolean default false; tài khoản mới/reset mật khẩu đặt true. Migration `20261105120000_khong_gian_ca_nhan` không đổi mật khẩu, phiên hoặc grant của tài khoản cũ.
- DEFAULT không có grant nghiệp vụ; trigger `chan_cap_quyen_default` chặn INSERT/UPDATE grant vào nhóm này, action chặn sửa/xóa role. Quyền bổ sung cấp qua role khác; không tự gán DEFAULT hoặc quyền mới hàng loạt cho tài khoản cũ.
- `ten_dang_nhap` unique toàn hệ thống. Cấp tên trong transaction theo thứ tự: hàng công ty → advisory phân quyền `(260126, companyId)` → advisory cấp tên toàn hệ thống `(260127, 0)`. Unique là ràng buộc cuối; không thay ID hoặc mã nhân sự để xử lý trùng tên.
- Profile dùng trường liên hệ/ảnh/địa chỉ sẵn có của `nhan_su`; dashboard đọc dữ liệu được phép xem, không tạo bảng profile/dashboard hoặc bản sao hồ sơ người. Quan hệ người–tài khoản và nghỉ việc theo [plan HR](HR-CHECKLIST.md#thiết-kế-db-cần-giữ).

## Hướng mở rộng cùng trình tạo quy trình

- [x] Chốt thứ tự dashboard: đang đến lượt tôi → việc gần nhất → yêu cầu của tôi → thông báo → lối tắt.
- [x] Chốt số “đang đến lượt tôi” lấy từ bước PENDING và quyền hiện tại, không lấy từ thông báo.
- [ ] Bổ sung trung tâm thông báo trong ứng dụng và số chưa đọc sau khi workflow kéo thả có cơ chế kích hoạt bước ổn định.
- [ ] Kiểm thử thông báo trùng, chuyển giao, thu hồi quyền, nhiều tài khoản cùng nhân sự và liên kết mở đúng hồ sơ.

## Điều kiện nghiệm thu

- [x] Tạo hai người cùng kết quả chuẩn hóa tên, kể cả đồng thời, sinh tài khoản khác nhau; hồ sơ/tài khoản/role/audit lưu nguyên tử.
- [x] DEFAULT vào được dashboard/profile, không đọc HR/người khác hoặc tự cấp quyền qua request sửa tay; HR-only vẫn tạo người không kèm tài khoản.
- [x] Đổi mật khẩu/ảnh thành công; phiên cũ bị thu hồi, mật khẩu tài khoản khác không đổi; tài khoản hệ thống không cần hồ sơ giả.
- [x] Số việc cá nhân đúng với DB và danh sách chi tiết, kể cả trên 200 hồ sơ; thu hồi quyền/nghỉ việc chặn cả UI lẫn server.
- [x] Admin được cấp quyền điều phối dùng được màn hình workflow; người không có quyền không tự mở quyền, không tự duyệt hồ sơ của mình.
- [x] Giao diện desktop/mobile, lỗi form có dấu `*` và cảnh báo; hồi quy HR, tài khoản, phân quyền, workflow đạt.

## Kết quả kiểm tra

Dashboard trực quan 09/11: TypeScript và lint đạt; E2E 205 hồ sơ xác nhận số đếm, phân trang và cách ly quyền giữa các tài khoản đạt (selector ô số liệu được giới hạn vào vùng Tổng quan để phân biệt với biểu đồ). Đã xem ảnh desktop có dữ liệu và desktop/mobile trạng thái cá nhân, sáng/tối; mobile 390px không tràn ngang, không có lỗi JavaScript. Ảnh kiểm tra lưu cục bộ tại `outputs/dashboard-visual/` và `outputs/personal-workspace/`.

Ngày 09/11: đã xử lý lỗi đăng nhập do tiến trình `next dev` từ 06/11 giữ Prisma Client cũ, truy vấn `tai_khoan.dinh_danh` sau khi DB đổi sang `id`. Client trên đĩa và migration đã đúng; khởi động lại web giải quyết lỗi, không đổi mật khẩu/quyền hoặc dữ liệu vận hành. Ba E2E Chrome đạt: đăng nhập và chặn tài khoản khóa/phiên bị thu hồi; form tương tác trên `localhost` và `127.0.2.2`. Sau đổi schema và generate Prisma Client phải khởi động lại tiến trình web/Studio, không chỉ chờ HMR.

38 E2E (nhân sự/tài khoản, phân quyền, workflow, trường bắt buộc và không gian cá nhân) + 7 unit đạt. TypeScript, lint phần thay đổi, Prisma schema diff rỗng và `git diff --check` đạt. Đã xem desktop/mobile; avatar được kiểm tra file thật, quyền đọc và xóa. Dashboard thử 205 hồ sơ và phân trang. Build `npm run build -- --webpack` đạt sau chạy lại thông báo nâng cấp bảo mật Next.js. Còn cảnh báo có sẵn về phiên bản Next.js/middleware; chưa nâng framework.

Kiểm tra 06/11: E2E Chrome luồng cấp/gỡ quyền tại `/roles` đạt; tài khoản nhận quyền dùng workflow ngay, thu hồi quyền chặn truy cập, người thiếu quyền không có nút tự cấp. TypeScript, lint phần thay đổi và `git diff --check` đạt. Không sửa dữ liệu/quyền vận hành.

Kiểm tra sau migration quy ước tên 06/11: 51 E2E + 9 unit đạt trên tiến trình ứng dụng mới; dữ liệu tài khoản/profile và các grant trở về đúng baseline sau khi dọn fixture.

Sau khi tạo lại database demo cùng ngày: chỉ giữ tài khoản quản trị do seed tạo; tài khoản/profile demo khác cần tạo lại từ giao diện theo luồng hiện hành.

Bước vận hành còn lại: người quản lý cấp quyền và gán vai trò tại `/roles`, sau đó mở `/workflows`; tạo mẫu nháp và chọn người thử nghiệm thực tế. Chưa cấp quyền hoặc tạo mẫu tự động cho công ty thật.
