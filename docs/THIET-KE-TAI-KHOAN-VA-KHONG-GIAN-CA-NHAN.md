# Tài khoản mặc định, hồ sơ cá nhân và dashboard

Cập nhật **06/11/2026 — đã triển khai bản thử nghiệm, kiểm thử hồi quy đạt; bổ sung định hướng dashboard cho mẫu quy trình kéo thả và thông báo trong ứng dụng, chưa triển khai phần mở rộng**. Tài khoản cơ bản dùng được dashboard và tự sửa thông tin cá nhân; quyền nghiệp vụ cấp riêng. Migration cộng thêm cờ đổi mật khẩu và DEFAULT; giữ tài khoản/quyền nghiệp vụ hiện có.

## 1. Hiện trạng trước triển khai (mốc kiểm tra 05/11)

| Phần | Hiện trạng và vấn đề |
| --- | --- |
| Workflow | Đã có mẫu, hồ sơ, hộp việc và xử lý tuần tự. DB vận hành chưa có mẫu và chưa role nào được cấp quyền WORKFLOW; vì vậy admin cũng chỉ thấy hướng dẫn sang `/roles` |
| Quyền admin | Không có đặc quyền ngầm theo tên ADMIN. Quyền TASK/APPROVAL cũ không thay thế WORKFLOW |
| Tạo nhân sự/tài khoản | Đã tách người và tài khoản. Tạo kèm tài khoản hiện buộc nhập tên đăng nhập, mật khẩu, chọn role |
| Role cơ bản | Chưa có DEFAULT; STAFF đang có HR VIEW và TASK VIEW nên không dùng STAFF thay cho nhóm tối thiểu mới |
| Profile | Có sẵn trường liên hệ, địa chỉ, ảnh trong `nhan_su`; chưa có trang cá nhân, tải ảnh hoặc tự đổi mật khẩu |
| Dashboard | Đang lấy số liệu HR toàn công ty, phụ thuộc HR VIEW. Các số đếm là dữ liệu thật nhưng chưa phản ánh việc của người đăng nhập; thanh tiến độ và thông tin kỹ thuật không phục vụ mục tiêu mới |

## 2. Luồng cấp tài khoản

Giữ **một nhân sự có 0..N tài khoản**. Không tự tạo tài khoản hàng loạt cho hồ sơ đã có.

1. Khi thêm người: nhập họ tên, chọn phòng và tình trạng làm việc; mã nhân sự vẫn tự cấp, bất biến.
2. Có lựa chọn **Tạo tài khoản đăng nhập**. Chọn sẵn khi tạo người đang làm việc và người thao tác có cả HR MANAGE + ACCOUNTS MANAGE; có thể bỏ chọn. Người chỉ có HR MANAGE vẫn tạo được hồ sơ riêng.
3. Khi chọn: xem trước tên đăng nhập tự sinh, hiển thị **Quyền cơ bản (DEFAULT)**, không bắt chọn role. Quyền bổ sung để trong mục mở rộng hoặc cấp sau tại `/accounts`/`/roles` theo quyền người thao tác.
4. Lưu nhân sự, tài khoản, liên kết role và audit trong một transaction. Nếu cấp tài khoản thất bại, không để lại hồ sơ dở dang; báo lỗi cụ thể và cho phép bỏ lựa chọn tạo tài khoản.
5. Mật khẩu tạm ngẫu nhiên riêng cho từng tài khoản, chỉ hiển thị một lần sau tạo thành công để bàn giao. Không dùng chung mật khẩu mặc định; lần đăng nhập đầu yêu cầu đổi mật khẩu.

Trang `/accounts` áp dụng cùng mặc định khi tạo thêm tài khoản cho người đã có. Người đã nghỉ không được cấp tài khoản mở. Tài khoản hiện có giữ nguyên tên, mật khẩu và quyền.

### Quy tắc tên đăng nhập

**Tên cuối + chữ cái đầu của họ và tên đệm**, bỏ dấu (gồm `đ → d`), viết thường, bỏ khoảng trắng/ký tự không hợp lệ.

| Họ tên | Tên đăng nhập khi chưa có / khi bị trùng |
| --- | --- |
| Dương Hoàng Nam | `namdh` |
| Đinh Hoài Nam, khi đã có `namdh` | `namdh1` |
| Người tiếp theo cùng kết quả chuẩn hóa | `namdh2` |
| Tên không chuẩn hóa được hoặc quá ngắn | Dùng `nv` + ID nhân sự, vẫn kiểm tra trùng |

- Tên chỉ có một từ dùng từ đó nếu hợp lệ; giới hạn độ dài theo validation hiện hành, chừa chỗ cho hậu tố số.
- Kiểm tra trùng **toàn hệ thống**, đúng unique hiện tại của `tai_khoan.ten_dang_nhap`; tên của tài khoản khóa vẫn được tính là đã dùng.
- Bản xem trước chưa giữ chỗ. Server cấp tên cuối khi lưu, khóa advisory toàn hệ thống `(260127, 0)` cho mọi action tạo tài khoản, rồi chọn hậu tố còn trống. Unique DB là ràng buộc cuối; xung đột do ghi SQL ngoài ứng dụng sẽ rollback và báo thử lại. Không chỉ kiểm tra trước ở trình duyệt.
- Đổi họ tên hoặc chuyển phòng không đổi tên đăng nhập. Tên đăng nhập không thay ID nhân sự hoặc mã nhân sự.

## 3. Quyền cơ bản và quyền nghiệp vụ

`DEFAULT` là **nhóm hệ thống “Nhân viên cơ bản”** của mỗi công ty, gán khi tạo tài khoản mà không chọn quyền bổ sung. Không đổi tên hoặc giảm quyền role STAFF đang sử dụng.

| Lớp quyền | Nội dung |
| --- | --- |
| Cá nhân, có sẵn cho tài khoản đăng nhập hợp lệ | Dashboard của mình; xem hồ sơ mình; sửa liên hệ/ảnh; đổi mật khẩu của tài khoản đang đăng nhập |
| Quyền nghiệp vụ, theo role trong DB | Xem/quản lý HR, tài khoản, phân quyền, nhật ký, tạo/duyệt/thực hiện/điều phối quy trình |
| Phân công thực tế | Ai phụ trách phòng nào, ai được giao bước nào; không suy từ chức danh hoặc role |

Quyền cá nhân là nền chung cho **mọi tài khoản hợp lệ**, kể cả admin hoặc tài khoản không gắn nhân sự; không kiểm tra tên role DEFAULT để mở quyền. DEFAULT không có grant HR/TASK/WORKFLOW và không chỉnh thành role quản trị; quyền bổ sung gắn bằng role khác. `/roles` hiển thị rõ các khả năng cá nhân có sẵn, tách khỏi ma trận nghiệp vụ.

Mọi action cá nhân lấy ID tài khoản, nhân sự và công ty từ phiên đang đăng nhập; không tin ID do form gửi. Không cần HR VIEW/MANAGE để sửa chính mình. Không cộng quyền giữa hai tài khoản của cùng người. Tài khoản khóa hoặc nhân sự đã nghỉ không có quyền truy cập cá nhân.

## 4. Trang `/profile` — Hồ sơ của tôi

Truy cập từ menu người dùng ở góc phải và nút **Hồ sơ của tôi** trên dashboard. Bố cục gồm ảnh/tên/chức vụ, thẻ **Thông tin cá nhân**, thẻ **Tài khoản và mật khẩu**; trên điện thoại xếp thành một cột.

| Dữ liệu | Tự sửa? | Nơi lưu / cách xử lý |
| --- | --- | --- |
| Ảnh đại diện | Có: tải lên, thay, xóa | `nhan_su.duong_dan_anh_dai_dien`; các tài khoản cùng người dùng chung ảnh |
| Điện thoại, email, địa chỉ | Có | Các cột sẵn có trong `nhan_su`; cập nhật cả khi HR xem hồ sơ |
| Họ tên, mã nhân sự, ngày sinh, ngày vào làm, phòng, chức vụ, tình trạng | Chỉ xem | HR điều chỉnh; không cho tự đổi cơ cấu hoặc trạng thái làm việc |
| Tên đăng nhập, vai trò, phòng đang phụ trách | Chỉ xem | Không đổi quyền qua profile |
| Mật khẩu | Có | Mật khẩu hiện tại, mật khẩu mới, nhập lại; các trường có `*`, lỗi tại trường tương ứng |
| Ghi chú HR, metadata nhập liệu | Không hiển thị trên profile | Không đưa nguyên bản hồ sơ HR vào dữ liệu trả về cho người dùng |

- Tài khoản hệ thống không gắn nhân sự: vẫn có dashboard và đổi mật khẩu; hiển thị tên tài khoản, không tạo người giả hoặc cho tự gắn vào hồ sơ khác.
- Ảnh JPEG/PNG/WebP, tối đa 2 MB; kiểm tra nội dung file, tên file do server sinh. Lưu ngoài Git, phục vụ qua route có kiểm tra quyền; không nhận URL ảnh tùy ý. Chỉ bỏ file cũ sau khi lưu DB thành công.
- Đổi mật khẩu tăng phiên bản đăng nhập, thu hồi phiên cũ, cấp lại phiên hiện tại sau xác thực; không đổi mật khẩu tài khoản khác của cùng người. Mật khẩu tạm có thể dùng ở bước đổi bắt buộc đầu tiên.
- Chỉ ghi audit các trường thay đổi cần thiết; không ghi mật khẩu, token hoặc nội dung ảnh. Thông báo thành công, trạng thái đang lưu và lỗi phải rõ ràng.

## 5. Dashboard là bàn làm việc của chính người dùng

**Bố cục:** lời chào + phòng/chức vụ → đang đến lượt tôi → việc cần xử lý gần nhất → yêu cầu của tôi → thông báo → lối tắt theo quyền. Mọi số đếm lấy từ DB, không tạo số mẫu hoặc tiến độ giả.

| Khối | Dữ liệu và điều kiện hiển thị |
| --- | --- |
| Xin chào / Hồ sơ của tôi | Mọi tài khoản hợp lệ; không cần HR VIEW |
| Đang đến lượt tôi | Tổng bước PENDING đang giao cho nhân sự của tôi và tài khoản hiện tại có quyền tương ứng; tách số cần duyệt và cần thực hiện |
| Chờ tôi duyệt | Bước đang chờ được giao cho nhân sự của tôi, tài khoản hiện tại có quyền APPROVE + VIEW |
| Việc tôi cần thực hiện | Bước đang chờ được giao cho tôi, có EXECUTE + VIEW; chưa bao gồm phân hệ công việc độc lập chưa triển khai |
| Yêu cầu của tôi | Hồ sơ do nhân sự của tôi gửi: nháp, đang xử lý, kết quả gần đây; đọc theo quyền workflow, tạo mới cần CREATE + VIEW |
| Thông báo | Định hướng sau: thông báo trong ứng dụng khi bước đến lượt hoặc hồ sơ đổi trạng thái; chỉ hiển thị khi có dữ liệu thông báo thật |
| Điều phối quy trình | Chỉ WORKFLOW MANAGE: các hồ sơ cần phân công lại/tạm dừng trong công ty. Ghi rõ đây là điều phối, không gộp vào việc cá nhân |
| Lối tắt | Profile luôn có; nhân sự/phòng ban/tài khoản/quy trình chỉ hiện theo quyền thực tế |

DEFAULT chưa được cấp workflow thì chỉ thấy phần cá nhân và hướng dẫn bắt đầu; không hiện những số 0 giả như đã được sử dụng quy trình. Danh sách chưa có dữ liệu có lời giải thích và thao tác phù hợp.

Số đếm truy vấn riêng trên toàn bộ dữ liệu được phép xem, không đếm từ danh sách workflow đang giới hạn 200 dòng. Mỗi ô và danh sách khi bấm vào dùng cùng điều kiện lọc; danh sách phân trang 10 hồ sơ, truy vấn số đếm độc lập. Hai tài khoản của cùng nhân sự có thể xem cùng hồ sơ cá nhân nếu đủ quyền, nhưng không kế thừa quyền của nhau.

Bỏ các thống kê HR toàn công ty khỏi trang chủ cá nhân, khối công nghệ, thanh tiến độ không có tiêu chí và nhãn “nhân sự tiêu biểu” không có căn cứ. Dấu thông báo chỉ đưa lại cùng dữ liệu thông báo thật; số chưa đọc không được suy từ dữ liệu mẫu hoặc dùng thay điều kiện quyền. Ô tìm kiếm chỉ đưa lại khi có chức năng thật.

## 6. Mở được workflow để dùng thử

Luồng khởi tạo giữ kiểm tra quyền ở server:

1. Quyền workflow được cấp tập trung tại **Vai trò và phân quyền** (`/roles`): người có ROLES MANAGE cấu hình quyền cho vai trò rồi gán cho tài khoản. Người sử dụng nhận quyền ngay, không phải xác nhận kích hoạt. Truy cập `/workflows` khi thiếu quyền chỉ hiện thông báo; liên kết tới `/roles` dành cho người quản lý phân quyền.
2. Người có WORKFLOW MANAGE: mở đầy đủ giao diện mẫu/hồ sơ/điều phối, kể cả chưa có mẫu. Hiển thị **Chưa có mẫu quy trình** cùng nút **Tạo mẫu đầu tiên**; không tiếp tục dẫn vòng sang trang role.
3. Người không có quyền quy trình hoặc quản lý phân quyền: thông báo thiếu quyền và nút về dashboard; không có nút tự cấp quyền.
4. Người quản lý dùng nút tạo mẫu đầu tiên để tạo mẫu thử, ví dụ “Hỗ trợ IT”, ở trạng thái nháp. Chưa tự tạo mẫu hoặc chọn người dùng thật. Người quản lý chọn người gửi, head/người duyệt và IT thực hiện; kiểm tra tài khoản đủ quyền rồi mới phát hành. Admin không gắn nhân sự vẫn cấu hình được, không được giả làm người gửi/duyệt.

Việc cấp quyền chỉ diễn ra khi người quản trị lưu phân quyền tại `/roles`; không tự tạo role hoặc gán quyền từ trang workflow. Mẫu thử không tự phát hành, không tự gửi yêu cầu và không dùng chức vụ để chọn người duyệt.

## 7. Phạm vi DB và thứ tự thực hiện

- Tái sử dụng 14 bảng hiện có; không thêm bảng profile/dashboard, không gộp nhân sự với tài khoản.
- Dữ liệu mới: role DEFAULT cho từng công ty. Đã thêm `tai_khoan.bat_buoc_doi_mat_khau Boolean @default(false)`; tạo tài khoản với mật khẩu tạm đặt `true`, tài khoản cũ giữ `false`.
- Cơ chế DEFAULT được khóa trong quản lý role và bảo đảm khi khởi tạo công ty/cấp tài khoản; không chạy lại seed để ghi đè quyền hiện có.
- Cấu hình nơi lưu ảnh bền vững trên server và sao lưu cùng DB; ảnh, file tạm không đưa lên Git. Mặc định `var/avatars/`, có thể đặt `AVATAR_STORAGE_DIR` đến volume bền vững; dùng sharp chuẩn hóa ảnh, xem kiến trúc.

**Thứ tự:** sửa khởi tạo workflow → tài khoản mặc định/tên đăng nhập → profile → dashboard cá nhân → kiểm thử tích hợp. Tiêu chí và trạng thái tại [checklist](plans/PROFILE-DASHBOARD-CHECKLIST.md).
