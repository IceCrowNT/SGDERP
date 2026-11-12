# QUY TẮC NHÂN SỰ VÀ PHÒNG BAN

Nghiệp vụ hiện hành của HR; tiến độ và thiết kế DB tại [Plan HR](../../docs/plans/HR-CHECKLIST.md). Áp dụng cùng ba rule kỹ thuật chung.

## Hồ sơ và cơ cấu

- Người thật và tài khoản đăng nhập quản lý riêng; số nhân sự không tính theo số tài khoản. Chức vụ là text, không tự xác định head hoặc cấp quyền.
- HR VIEW chỉ xem; HR MANAGE tạo/sửa hồ sơ và CRUD phòng ban. Dữ liệu hoạt động độc lập tại ERP sau khởi tạo; nguồn HR/1Office chỉ truy nguyên, không khóa trường hoặc bắt đối soát khi sửa.
- Input hồ sơ strict, không nhận `employeeCode`, `companyId` hoặc metadata nguồn. Mã nhân sự tự cấp và bất biến; phòng bắt buộc thuộc cây cùng công ty. `notes` sửa ghi chú vận hành, không sửa `hrNotes` gốc qua form.
- Phòng ban cho sửa tên/mã/mô tả/cha; chặn cha khác công ty, chính mình hoặc hậu duệ. Chỉ xóa phòng không còn con/nhân sự ở bất kỳ trạng thái nào và không còn tài sản do phòng quản lý; xử lý liên kết tài sản theo [rule tài sản](ASSET-MANAGEMENT-RULES.md). Khóa và audit theo mục DB của plan.
- Chọn head cùng công ty, chỉ chọn mới người ACTIVE; giữ head cũ không ACTIVE khi sửa trường khác và cảnh báo cần bàn giao. Không tự chọn người thay, không suy từ tên/chức vụ, không đổi vị trí 3D khi đổi cơ cấu.

## Vị trí làm việc

- HR MANAGE chọn/chuyển/gỡ vị trí trong hồ sơ, chi tiết vị trí hoặc bảng chi tiết 3D HCNS; cùng FK, không lưu danh sách độc lập. Chuyển giữa hai vị trí phải xác nhận. HR VIEW xem đường dẫn/danh sách người. Chọn vị trí trong form HR không cần LOCATIONS VIEW và không có quyền sửa cây; truy cập trang Vị trí/3D cần quyền LOCATIONS riêng.
- Một người có tối đa một vị trí chính; nhiều người được dùng chung một vị trí. Chỉ gán mới người đang làm việc vào phòng/khu vực/chỗ ngồi còn sử dụng cùng công ty, kể cả tổ tiên. Không tự gán theo phòng ban, tên ghi chú hoặc chức vụ.
- Chưa xác minh thì để trống. Nghỉ việc giữ liên kết để tra cứu; 3D chỉ hiện người ACTIVE. Chuyển người không tự chuyển thiết bị hoặc đổi phòng công tác.
- Đổi liên kết kiểm tra phiên bản hồ sơ, khóa cùng luồng quản lý vị trí và ghi audit nguyên tử. Ngừng dùng/đổi loại không phù hợp vẫn cần xử lý người liên kết. Xóa vị trí qua ERP tự đưa mọi người liên kết về chưa xác định vị trí trong cùng transaction, sau xem trước và xác nhận theo [rule vị trí](LOCATION-MANAGEMENT-RULES.md); không xóa người hoặc thay trạng thái làm việc.

## Cấp tài khoản và nghỉ việc

- `createAccount` là tùy chọn, các trường nâng cao là `accountUsername/accountPassword/accountRoleIds`. Không chọn thì chỉ tạo hồ sơ; tạo kèm cần cả HR MANAGE và ACCOUNTS MANAGE. Mặc định và bàn giao tài khoản theo [rule cá nhân](PROFILE-DASHBOARD-RULES.md).
- Tạo/sửa người, tài khoản được yêu cầu, liên kết role và audit cùng transaction. Kiểm tra lại trạng thái người trong khóa trước khi mở/tạo tài khoản để tránh race với nghỉ việc.
- HR MANAGE ghi nhận LEFT sẽ khóa tất cả tài khoản liên kết đang mở và thu hồi phiên, giữ lịch sử. ACTIVE/UNKNOWN trở lại không tự mở; HR MANAGE không tự có quyền mở tài khoản hoặc gán role.
- Session chặn tài khoản khóa hoặc người LEFT. Tài khoản hệ thống không gắn người vẫn kiểm tra trạng thái tài khoản; không tạo hồ sơ giả. Không khóa quản trị cuối cùng: yêu cầu bàn giao và rollback theo [rule phân quyền](ROLE-MANAGEMENT-RULES.md).
- Revalidate danh sách nhân sự/phòng, danh bạ, tài khoản, 3D và tổng quan bị ảnh hưởng. Không chạy lại importer/seed để ghi đè dữ liệu vận hành; điều kiện bootstrap tại plan.

## Danh bạ nhân sự

- Mặc định đi từ thẻ phòng cấp trên → phòng/bộ phận → hồ sơ xem bên phải; có chế độ bảng phân trang khi cần rà soát. Nhãn người phụ trách lấy từ quan hệ phân công, không suy từ chức vụ.
- Số người của nhánh gồm các đơn vị con, ghi rõ phạm vi; không cộng các số nhánh chồng nhau thành tổng công ty. Bộ lọc tình trạng áp dụng đồng nhất cho số đếm và danh sách. Hồ sơ chưa gắn phòng vẫn có lối xem riêng.
- Tìm kiếm toàn công ty bỏ giới hạn phòng đang chọn, hỗ trợ tên/mã/chức vụ/phòng và không dấu. Đóng chi tiết giữ bộ lọc, trang và vị trí xem. Thông tin phụ và sửa nằm trong chi tiết; HR VIEW không thấy nút sửa, chi tiết tài khoản chỉ hiện khi có quyền quản lý tài khoản.
