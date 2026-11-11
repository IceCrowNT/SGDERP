# Mô hình không gian 3D — tòa nhà và phòng HCNS

Cập nhật: **10/11/2026**. Đã thay toàn bộ khung tòa nhà cũ tại `/office-3d` bằng cùng phong cách HCNS; nội thất HCNS gắn trong tầng 2 và dùng chung với trang chi tiết `/office-3d/hcns`.

## Thay khung tòa nhà — đã triển khai

- [x] Thay viewer Three.js thủ công, khối đặc và sheet ghép nhân sự theo phòng ban bằng Fiber/Drei: mô hình mở mái, tường sáng, sàn trung tính, ánh sáng dịu, camera trực giao. Giữ vị trí tương đối của 22 khu vực/3 tầng từ bản cũ; thu gọn ô thang tầng 2 để không chồng ô HCNS; tỷ lệ vẫn ước lượng, các phòng ngoài HCNS chưa có sơ đồ nội thất xác nhận. Không dựng ghế.
- [x] Tái sử dụng nguyên model nội thất HCNS (10 điểm) trong tầng 2; xoay/thu đồng tỷ lệ để khớp ô phòng cũ, không biến dạng từng bàn. Chọn tầng/phòng, phối cảnh/mặt bằng, thu phóng, đặt lại góc; vào phòng HCNS xem chi tiết và quay về tầng 2.
- [x] `/office-3d` dùng LOCATIONS VIEW/MANAGE; danh sách người cần thêm HR. Bỏ truy vấn nhân sự theo mã phòng ban và số người toàn công ty khỏi bản đồ. Phòng đã xác nhận liên kết đọc tên/ghi chú/người từ cây vị trí; chưa liên kết hiển thị bố cục tham khảo, không giả danh DB.
- [x] Ánh xạ riêng `var/office-3d/building.json` cùng công ty, tầng, phòng; chỉ nối những ID đã kiểm chứng, không tạo dữ liệu DB. Không tự gán “Phòng họp chính” vào Họp 1/2 khi chưa có căn cứ. Mất/chuyển/ngừng dùng liên kết phải báo trạng thái, không tự ghép tên.
- [x] 10 unit đạt; 6 E2E HR/HCNS và 4 E2E tòa nhà đạt. Lượt đầu một ca tòa nhà hết thời gian chờ route HCNS biên dịch dev; đã điều chỉnh thời gian chờ, chạy lại đủ 4 ca đạt. TypeScript/lint đạt. Kiểm tra quyền, khác công ty/thu hồi quyền, không suy người từ phòng ban, đổi tên/chuyển nhánh, chọn tầng/phòng/HCNS, bàn phím, mobile/sáng/tối và WebGL fallback. Đã xem ảnh thật cả 3 tầng, HCNS nhúng, mặt bằng và điện thoại; không tràn ngang/lỗi JS. Đo Chrome khi nghỉ 1,5 giây: 0 lệnh vẽ WebGL mới, chưa phải benchmark máy người dùng.
- [x] Fixture chạy trên DB khôi phục riêng đã dọn; fingerprint cả 15 bảng vận hành giữ nguyên. Backup, ảnh và kết quả tại `outputs/building-3d/`; ánh xạ riêng đã lưu ngoài Git. Đã đồng bộ kiến trúc, router, plan HR và mục lục; không sửa ba rule kỹ thuật chung, schema hoặc quyền vận hành.

## Phạm vi đã được yêu cầu

- [x] Gán/chuyển/bỏ gán hồ sơ nhân sự ngay trong bảng chi tiết HCNS, tái sử dụng `LocationPeople` và `assignEmployeeLocation`. Chỉ HR MANAGE được nạp danh sách người ACTIVE để chọn; HR VIEW giữ chế độ đọc. Điểm mất liên kết/ngừng dùng hoặc điểm thiết bị không có nút gán mới. Đổi điểm chọn đặt lại hộp thoại; lưu làm mới dữ liệu nhưng giữ vị trí/góc nhìn, xác nhận chuyển và chống ghi đè theo luồng vị trí chung.
- [x] 4 E2E gán tại 3D và 8 E2E hồi quy HCNS/vị trí đạt; 5 unit ánh xạ, TypeScript/lint đạt. Đã kiểm tra gán/chuyển/hủy/bỏ gán, giữ điểm và góc nhìn, không gán trùng, đồng bộ trang Vị trí, phiên bản cũ, quyền xem/khác công ty/thu hồi quyền khi hộp thoại mở, điểm thiết bị/ngừng dùng/mất liên kết và audit. Đã xem ảnh Chrome desktop/mobile; không lỗi JS hoặc tràn ngang trong ca thao tác. Các ca mới chạy lại sau chỉnh selector cảnh báo và fixture điểm trống. DB thử đã dọn; fingerprint 15 bảng vận hành giữ nguyên. Ảnh/backup/bằng chứng: `outputs/hcns-assignment/`. Không đổi schema hoặc ba rule kỹ thuật chung.

- Dùng Three.js + React Three Fiber + Drei, dựng nội thất bằng hình học tái sử dụng. Không tải mẫu/font/texture từ dịch vụ ngoài.
- Phòng đã có trong DB: Phòng Hành Chính Tổng Hợp, tầng 2, gồm HCNS và Pháp chế. Bổ sung đúng 10 vị trí con, giữ nguyên dữ liệu phòng đã nhập.
- Ghi chú nguồn: 1 có PC + laptop (Toàn, Pháp chế); 2 có PC + AP + scanner (Minh, nhân sự); 6 có máy in; 7 có PC (Nam, IT); 10 có laptop (Trang, trưởng phòng HCNS). Các vị trí khác chưa có thông tin. Đây là ghi chú theo sơ đồ, không phải phân công nhân sự hoặc hồ sơ tài sản.
- Dựng bố cục, kho và cửa theo bản vẽ; người phụ trách xác nhận đường ngăn giữa hai khu vực có cửa ra vào. Tỷ lệ, kiểu nội thất và vị trí chính xác của cửa ngăn chỉ là ước lượng. Không tự suy cửa sổ, số người thực tế, tài sản đang sử dụng hay tình trạng còn trống.
- `/office-3d/hcns`: chọn vị trí trên mô hình hoặc danh sách, đọc mô tả từ DB, góc tổng thể/mặt bằng/tập trung, hỗ trợ mobile và fallback khi WebGL lỗi. Lối vào từ danh mục vị trí và bản đồ tòa nhà, theo quyền.

## Phong cách hình ảnh

- **3D cách điệu dạng mô hình thu nhỏ (dollhouse/diorama)**, camera trực giao với góc xiên gần isometric; có góc mặt bằng từ trên xuống để đối chiếu bố trí.
- Mở mái, hạ thấp các vách che tầm nhìn; hình khối đơn giản, bo nhẹ, chi tiết vừa đủ nhận biết bàn và thiết bị.
- Vật liệu ít bóng, ánh sáng dịu; nền và tường màu trung tính sáng, bàn gỗ sáng. Màu nhấn đánh dấu vị trí đang chọn; nhãn số gắn với điểm trên bản phác.
- **Không dựng ghế trong bản HCNS theo yêu cầu hiện tại.** Bàn, thiết bị, kho và cửa là các thành phần hiển thị. Loại vị trí “Chỗ ngồi” trong DB vẫn biểu thị vị trí làm việc, không yêu cầu có hình ghế.
- Ưu tiên đọc bố cục và chọn vị trí; tỷ lệ và kiểu nội thất là minh họa theo bản phác, chưa phải bản đo hiện trạng.
- Góc bàn cấu hình bằng **độ** ở `facingDegrees`, đổi sang radian khi dựng hình: bàn 1 = 180° (lưng hướng tường trên), bàn 9/10 = 90° (lưng hướng tường phải). Không nhập số độ trực tiếp vào `rotation` của Three.js.

## Thiết kế DB cần giữ

- Không thêm tọa độ vào `vi_tri` hoặc khôi phục bảng tài sản. Dùng FK vị trí theo [plan HR](HR-CHECKLIST.md); bảng chi tiết 3D gọi action gán vị trí chung, không thay tài khoản/quyền hoặc tự phân công người.
- 10 vị trí dùng FK `parent_id` về phòng có sẵn; tên Vị trí 01–10, đánh số theo sơ đồ. Vị trí 06 là điểm đặt thiết bị; các vị trí bàn còn lại là chỗ ngồi theo hình minh họa.
- Hình học lưu trong mã; ánh xạ khóa đối tượng ổn định → ID vị trí lưu cục bộ tại `var/office-3d/hcns.json` (ngoài Git, sao lưu cùng DB). Không dùng tên hoặc số thứ tự làm khóa DB; không công khai ánh xạ qua thư mục public.
- Import một lần có backup, transaction cùng audit `LOCATIONS`, khóa công ty và kiểm tra phòng/tổ tiên hoạt động. Chạy lại chỉ kiểm chứng ánh xạ, không ghi đè ghi chú hoặc tạo trùng.
- Quyền xem bản thử: LOCATIONS VIEW/MANAGE. Server kiểm tra công ty, phòng và từng liên kết. Ghi chú là mô tả vị trí đã được cung cấp. Chỉ khi có thêm HR VIEW/MANAGE mới truy vấn và trả tên/chức vụ/phòng của người ACTIVE đang gắn vị trí; không có quyền HR thì không trả danh sách/số người. HR MANAGE dùng bảng chi tiết để gán/chuyển/bỏ gán cùng action của trang Vị trí; server vẫn kiểm tra quyền hiện hành, công ty, tình trạng, phiên bản và ghi audit. Chưa truy vấn tài sản. Vị trí bị xóa/chuyển/ngừng dùng hiển thị chưa liên kết hoặc ngừng dùng, không gán thay bằng tên.

## Nghiệm thu

- [x] Góc bàn nhận độ và được chuyển sang radian trong viewer. Đã xem trực tiếp ảnh Chrome mặt bằng/phối cảnh: bàn 1 thẳng theo tường trên, 9/10 theo tường phải; giữ thiết kế không ghế. 3D đọc người ACTIVE đã gán qua HR theo quyền riêng. 8 E2E HR/danh bạ/HCNS trên DB tạm, 5 unit, TypeScript/lint đạt; form chọn vị trí desktop/mobile không lỗi JS/tràn ngang. Ảnh góc bàn tại `outputs/hcns-3d/`, ảnh form và bằng chứng migration tại `outputs/hr-locations/`.

- [x] Nhập 10 vị trí và ghi chú vào phòng có sẵn, cùng 10 nhật ký LOCATIONS; backup/biên bản kiểm chứng tại `outputs/hcns-3d/`. 7 vị trí cũ giữ nguyên, chạy lại chỉ xác nhận đủ 10 điểm và không tạo trùng.
- [x] Cài Fiber 9.8.2/Drei 10.7.9 tương thích React hiện tại; cập nhật kiến trúc/dependencies. Không nâng framework hoặc tự chạy audit fix.
- [x] Bản 3D một phòng với bàn, thiết bị theo ghi chú, kho, cửa ngoài và cửa thông hai khu vực. Đã bỏ toàn bộ hình ghế và mã dựng ghế theo yêu cầu; giữ đủ 10 điểm và dữ liệu vị trí. Kiểm tra lại TypeScript/lint và Chrome sau khi bỏ ghế đạt, đã xem ảnh mô hình. Chọn điểm, mô tả DB, phối cảnh/mặt bằng/tập trung, danh sách dùng bàn phím và fallback WebGL. Liên kết từ `/locations` và bản đồ tòa nhà; lưu/xóa vị trí làm mới dữ liệu trang 3D.
- [x] 5 kiểm thử logic đạt: ánh xạ đủ/duy nhất, tên/ghi chú cập nhật, mất/chuyển/khác công ty không lộ dữ liệu, vị trí ngừng dùng và ghi chú trống. Không hiển thị ID/mã kỹ thuật.
- [x] 3 kiểm thử Chrome đạt: đối chiếu 10 ghi chú DB, chọn/góc nhìn/làm mới/bàn phím/responsive; chặn phiên không đủ điều kiện và sai công ty; giữ danh sách khi WebGL lỗi. Tài khoản không có LOCATIONS hiện đồng thời cần đổi mật khẩu, nên ca này xác nhận chặn truy cập nhưng chưa cô lập riêng điều kiện thiếu quyền; không thay tài khoản vận hành để thử.
- [x] TypeScript và lint các file thay đổi đạt. Đã xem ảnh Chrome desktop, viewport điện thoại, sáng/tối, mặt bằng và tập trung: không tràn ngang trang, không lỗi JavaScript/console trong thao tác bình thường. Vẽ theo yêu cầu, DPR tối đa 1,5; đo Chrome khi đứng yên 1,5 giây không phát sinh lệnh vẽ WebGL, chưa phải benchmark thiết bị thật. Nhãn chọn nằm cùng cây DOM ứng dụng để tránh lỗi unmount khi dùng nhiều React root.

Ảnh kiểm thử, backup, kết quả nhập và script cục bộ ở `outputs/hcns-3d/` và `outputs/building-3d/`; ánh xạ ở `var/office-3d/hcns.json` và `var/office-3d/building.json`. Các tệp này ngoài Git, cần sao lưu cùng dữ liệu. Ảnh nguồn là ảnh trong hội thoại, không ghi nhận đã có bản ảnh gốc lưu trên đĩa.

Tiếp theo: xác nhận bố cục, bổ sung sơ đồ nội thất và ánh xạ vị trí cho các phòng còn lại. Chưa xác định “Phòng họp chính” tương ứng Họp 1 hay Họp 2; không tự ghép. Tầng 3 và các phòng chưa có trong danh mục chỉ là hình học tham khảo. Tài sản triển khai theo plan riêng.
