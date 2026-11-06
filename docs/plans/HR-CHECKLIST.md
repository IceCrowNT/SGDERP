# Kế hoạch nhân sự, phòng ban và tài khoản

Cập nhật: **06/11/2026**. Nền chức năng đã triển khai, đang ở mức thử nghiệm. Database local vừa được tạo lại cho demo: **72 nhân sự, 1 tài khoản quản trị, 18 phòng ban**; đây không phải số lượng cố định của hệ thống.

## Đã hoàn thành

- [x] Nhập danh sách HR final 72 người; nhân sự và phòng ban vận hành độc lập trong ERP, không chờ API hoặc đối soát 1Office.
- [x] Tách `nhan_su` và `tai_khoan`: một người có 0..N tài khoản, số người không tính từ số tài khoản.
- [x] Mã nhân sự tự sinh, không sửa hoặc tái sử dụng; chức vụ là text. Prisma Studio và PostgreSQL dùng cùng tên theo quy ước lai hiện hành.
- [x] Thêm/sửa hồ sơ, tìm kiếm, lọc trạng thái/phòng; các trường bắt buộc có dấu `*` và báo lỗi. Liên hệ/ngày/ghi chú bổ sung sau.
- [x] CRUD phòng ban, cây cha–con, sơ đồ từ trên xuống, mở nhánh xem nhân sự; chặn vòng lặp và xóa phòng còn người/đơn vị con.
- [x] Chọn người phụ trách từng phòng; một người có thể phụ trách nhiều phòng. Hiển thị các phòng phụ trách trong danh sách nhân sự.
- [x] Tạo hồ sơ kèm tài khoản tùy chọn trong một lần lưu cho người đủ quyền; `/accounts` quản lý tài khoản và gán vai trò hiện có.
- [x] Lưu nghỉ việc tự khóa các tài khoản liên kết đang mở và thu hồi phiên. Làm việc trở lại không tự mở tài khoản; bảo vệ quản trị cuối cùng.
- [x] Kiểm tra quyền tại giao diện/server, cùng công ty và ghi nhật ký; sửa hồ sơ không tự cấp thêm quyền.
- [x] Chuẩn hóa khóa DB sang `id`, `company_id`, `department_id`, `employee_id`, `parent_id`; dữ liệu 73 người/61 tài khoản/19 phòng ban giữ nguyên sau migration 06/11.

## Quy tắc cần giữ

| Nội dung | Quyết định |
| --- | --- |
| Nguồn dữ liệu | File HR final là nguồn khởi tạo; chỉnh sửa hiện hành tại ERP. Metadata 1Office/HR chỉ để truy nguyên |
| Chức vụ / phụ trách / quyền | Ba khái niệm riêng; không suy quyền hoặc trưởng phòng từ text chức vụ |
| Tạo người | Nhập họ tên, chọn phòng, tình trạng mặc định Đang làm việc; mã tự cấp, công ty lấy từ phiên |
| Cấp tài khoản | Tùy chọn tạo kèm tài khoản, chọn sẵn khi thêm người và đủ quyền; tự sinh tên/mật khẩu tạm, không chọn role thì dùng DEFAULT. Có thể chỉ tạo hồ sơ hoặc chọn nâng cao |
| Người được thao tác | HR MANAGE sửa hồ sơ/cơ cấu và ghi nhận nghỉ việc; ACCOUNTS MANAGE cấp/mở tài khoản và gán role trong quyền được phép; ROLES MANAGE quản trị ma trận và cấp mọi quyền |
| Người phụ trách nghỉ việc | Giữ liên kết, cảnh báo cần phân công lại; không tự chọn người thay |
| Sửa dữ liệu trực tiếp | Studio/SQL không chạy quy trình khóa/audit của action; phiên vẫn chặn người LEFT. Vận hành qua giao diện ERP |

## Việc tiếp theo

- [x] Áp dụng [thiết kế tài khoản mặc định/profile](PROFILE-DASHBOARD-CHECKLIST.md): tự sinh tên, DEFAULT không bắt chọn role; giữ tùy chọn chỉ tạo người và kiểm tra riêng quyền cấp tài khoản.
- [ ] Người phụ trách xác nhận và chọn head thực tế cho các phòng; không tự gán hàng loạt.
- [x] Triển khai bản đầu [vai trò và phân quyền](ROLE-MANAGEMENT-CHECKLIST.md).
- [ ] Dùng thử quyền với tài khoản thực tế và cấu hình [workflow đã triển khai thử nghiệm](WORKFLOW-CHECKLIST.md).
- [ ] Chốt ai được xem trường HR nhạy cảm, phạm vi danh bạ và thông tin hiển thị trên 3D.
- [ ] Khi cần: xuất–nhập Excel theo mã ERP, xem trước chênh lệch; không ghi đè từ nguồn cũ hoặc dùng STT/tên làm khóa.
- [ ] Khi mở rộng 3D: tách vị trí vật lý khỏi cơ cấu tổ chức; hiện mapping còn theo mã phòng, chưa tự xử lý đổi mã/phòng mới.

## Kiểm chứng gần nhất

Ngày 05/11: 38 E2E tích hợp + 7 unit đạt theo [checklist không gian cá nhân](PROFILE-DASHBOARD-CHECKLIST.md); dữ liệu 73 người/61 tài khoản và grant cũ giữ nguyên. Các số dưới đây là lần kiểm tra trước.

Ngày 06/11 sau migration quy ước tên: 51 E2E + 9 unit đạt; dữ liệu trở về đúng 73 người, 61 tài khoản, 19 phòng ban và 143 nhật ký như backup trước migration.

Sau đó, theo yêu cầu tạo lại dữ liệu demo ngày 06/11: chạy đủ 15 migration và seed thành công; trạng thái hiện hành là 72 người, 1 tài khoản quản trị, 18 phòng ban. Bản trước reset đã được backup ngoài Git.

Ngày 04/11: bộ 28 ca đã đạt sau sửa selector của kiểm thử cũ; TypeScript, lint phần thay đổi và Prisma diff đạt. Đã xem desktop/mobile; dữ liệu 9 bảng giữ nguyên sau dọn fixture. Chưa coi đây là nghiệm thu sử dụng thực tế.

Tra cứu: [Từ điển DB](../DATABASE-DICTIONARY.md) · [Rule DB](../../.agents/rules/DATABASE-RULES.md) · [Rule backend](../../.agents/rules/BACKEND-RULES.md).
