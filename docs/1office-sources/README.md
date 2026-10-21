# Nguồn khảo sát quản trị 1Office

**Ngày thu thập:** 21/10/2026  
**Phạm vi:** trang quản trị, cơ cấu tổ chức, tài khoản, nhóm quyền và danh mục quy trình  
**Chế độ:** đọc dữ liệu và dùng chức năng Export có sẵn; không tạo, sửa, duyệt hoặc xóa dữ liệu nghiệp vụ

## Quy tắc truy cập từ ngày 21/10/2026

- Không dùng lại credential, cookie hoặc session của đợt khảo sát trước.
- Chỉ truy cập khi người phụ trách cấp lại tài khoản và phạm vi trong yêu cầu hiện tại; quyền tài khoản phải được giữ nguyên.
- Tài khoản chỉ dùng để xem và export khi được yêu cầu. Không thay đổi dữ liệu, quyền, mật khẩu hoặc cấu hình 1Office.
- Không ghi credential vào repository, tài liệu, script, log hoặc file môi trường. Các file export được giữ làm nguồn phân tích không chứa mật khẩu đăng nhập đã cung cấp qua hội thoại.

## Tệp nguồn trong project

Các tệp gốc nằm trong `docs/1office-sources/exports/2026-10-21/` và được Git nhận diện như tài liệu nguồn của project theo yêu cầu của người phụ trách. Đây là dữ liệu nội bộ có thông tin nhân sự; repository chứa chúng phải được giữ ở chế độ riêng tư và giới hạn người được truy cập.

| Tệp | Số bản ghi | SHA-256 |
| :--- | ---: | :--- |
| [Tài khoản hoạt động](./exports/2026-10-21/users-active-56-56-ban-ghi-Tai-khoan-nguoi-dung-ngay-21102026.xlsx) | 56 | `6453110c0c29bb63c88a0ca9f87bcd36a9c5cf6365563b96ce066905fb540126` |
| [Tài khoản bị khóa](./exports/2026-10-21/users-blocked-11-11-ban-ghi-Tai-khoan-nguoi-dung-ngay-21102026.xlsx) | 11 | `8bc9271ad2e802cdbd7295d162b90d54fbb5e31cad1b7456dae31ade305fee6b` |
| [Phòng ban, chi nhánh](./exports/2026-10-21/departments-19-19-ban-ghi-Phong-ban-chi-nhanh-ngay-21102026.xlsx) | 19 | `c8cbe97898ae82e993f31099f8bd41fdaefbfa6258cf0b01e15bc0f4a7539b43` |
| [Nhóm người dùng](./exports/2026-10-21/groups-11-11-ban-ghi-Nhom-nguoi-dung-ngay-21102026.xlsx) | 11 | `a446ed703ce5508440665dfb29d8dc4099df6861b53689c211a3fcad3d5f928b` |

1Office tạo export bất đồng bộ. Mỗi yêu cầu sinh một bản ghi lịch sử và một thông báo tải xuống. Đây là tác động duy nhất được tạo trên hệ thống trong đợt khảo sát quản trị.

## Kết quả đọc toàn bộ workbook

Ngày 21/10/2026, toàn bộ vùng dữ liệu của bốn workbook đã được đọc và đối chiếu:

| Workbook | Vùng dữ liệu | Dòng dữ liệu | Cột |
| :--- | :--- | ---: | ---: |
| Phòng ban, chi nhánh | `Sheet1!A1:AB20` | 19 | 28 |
| Nhóm người dùng | `Sheet1!A1:K12` | 11 | 11 |
| Tài khoản hoạt động | `Sheet1!A1:W57` | 56 | 23 |
| Tài khoản bị khóa | `Sheet1!A1:W12` | 11 | 23 |

Các phát hiện trực tiếp từ file:

- Cả 19 đơn vị đều có ID 1Office và quan hệ cha/con, nhưng không đơn vị nào có mã, khối nghiệp vụ, loại phòng ban, mô tả hoặc tên viết tắt.
- 5/19 đơn vị có người giám sát công việc.
- 56/56 tài khoản hoạt động có ID hồ sơ nhân sự nội bộ; 55 có mã nhân sự, 52 có chức vụ và 53 có vị trí.
- 3/56 tài khoản hoạt động chưa gắn phòng ban; một tài khoản chưa gắn nhóm quyền.
- Chỉ 3/56 tài khoản hoạt động có email; 1/56 có phòng ban kiêm nhiệm; 55/56 có dữ liệu đăng nhập lần cuối; 46/56 có chữ ký số.
- 11/11 tài khoản khóa thuộc nhóm Nhân viên; 5 thuộc Bộ phận giao nhận, 4 thuộc Bộ phận điện nước, 1 thuộc PCCC và 1 thuộc HCNS.
- Chỉ 1/11 tài khoản khóa có dữ liệu đăng nhập lần cuối; không tài khoản khóa nào còn chữ ký số hoặc email trong export.
- File nhóm xác nhận 29 tài khoản hoạt động và 11 tài khoản khóa thuộc nhóm Nhân viên; tổng số thành viên hiển thị có thể khác số hồ sơ nhân sự còn hiệu lực.

## Cách sử dụng an toàn

- Chỉ commit các tệp này vào repository riêng tư đã giới hạn quyền truy cập; không đưa lên kho công khai hoặc gửi qua kênh chat ngoài công ty.
- 1Office là nguồn chuẩn cho hồ sơ nhân sự và cơ cấu, nhưng mỗi export chỉ là snapshot tại thời điểm thu thập. Khi đồng bộ phải ghi ngày nguồn, đối chiếu thay đổi và không coi snapshot cũ là dữ liệu sống hiện tại.
- Khi nhập thử, sao chép sang môi trường test và ẩn thông tin cá nhân không cần thiết.
- Đối chiếu checksum trước khi dùng lại để phát hiện tệp bị thay đổi.
- Mỗi lần xuất mới phải tạo thư mục theo ngày, cập nhật manifest và ghi bộ lọc đã dùng.

## Tài liệu phân tích

- [Mô hình dữ liệu quản trị và định hướng tích hợp 1Office](../strategy/1OFFICE-ADMIN-DATA-MODEL-AND-INTEGRATION.md)
- [Thiết kế đồng bộ Master Data và phân quyền SDG ERP–1Office](../strategy/MASTER-DATA-AND-RBAC-SYNCHRONIZATION.md)
- [Bối cảnh hiện tại và định hướng số hóa](../strategy/CURRENT-STATE-AND-DIGITAL-TRANSFORMATION-DIRECTION.md)
