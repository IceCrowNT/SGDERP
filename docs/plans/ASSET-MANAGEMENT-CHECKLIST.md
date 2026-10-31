# Kế hoạch quản lý tài sản IT và tích hợp không gian 3D

## Gỡ phân hệ tài sản khỏi DB — 31/10/2026

**Đã được người phụ trách yêu cầu xóa các bảng tài sản để tập trung tài khoản và phân quyền.** Phần kế hoạch bên dưới giữ làm lịch sử, không tự triển khai hoặc khôi phục.

- [x] Kiểm tra 8 bảng: 11 loại, 1 chứng từ DRAFT và 11 dòng tham khảo; Asset, PhysicalLocation, bàn giao, bảo trì, lịch sử vị trí đều 0 bản ghi. Code 3D hiện chỉ đọc người/phòng ban, không dùng các bảng này.
- [x] Backup toàn DB trước thay đổi tại `~/Library/Application Support/SDGERP/backups/remove-assets-20261031-KhazfN/` (quyền thư mục 700/file 600); lưu schema và script cũ ngoài Git. Đã restore archive vào DB tạm và thử migration thành công; DB tạm đã xóa. Fingerprint 9 bảng lõi trước/sau trên DB thật khớp toàn bộ.
- [x] Migration `20261031090000_remove_asset_module` đã áp dụng, gỡ 8 bảng cùng 8 enum, bỏ relation trong Company/Department/Employee/User; không sửa/xóa các migration lịch sử.
- [x] Gỡ seed tài sản và lệnh npm tương ứng; ngừng script cleanup HR lịch sử vốn phụ thuộc các bảng tài sản đã gỡ.
- [x] Cập nhật rule, router, từ điển DB, kiến trúc và bối cảnh: tài sản tạm hoãn, tập trung user/role/permission.
- [x] Kiểm tra migration trên bản restore đạt; fingerprint cả 9 bảng lõi khớp trước/sau và sau E2E. Prisma validate/diff và TypeScript đạt; 9/9 kiểm thử Playwright về HR, tài khoản, đăng nhập, thu hồi quyền và 3D đạt. Kiểm tra DOM Studio 5555 chỉ còn 9 model, Employee 72 / User 60, không còn model tài sản. `git diff --check` đạt.

## Nền HR sau làm sạch — 28/10/2026

- [x] HR hiện có 72 người final và vận hành độc lập; ID/mã người giữ nguyên sau làm sạch. 8 hồ sơ cũ và tài khoản gắn chúng đã bỏ sau backup; bảng tài khoản không còn hồ sơ legacy.
- [x] Mã người mới do DB cấp và bất biến; tài sản tiếp tục liên kết Employee.id, không theo tên hoặc tài khoản. Chưa nhập 92 tài sản trong lần thay đổi HR này.
- [ ] Khi nhập tài sản, chỉ đối chiếu danh sách 72 hiện hành và các hồ sơ được tạo thêm hợp lệ; không tái tạo người cũ từ export 1Office hoặc tên trong ghi chú tài sản.


## Phân tích file tài sản người phụ trách cập nhật — 27/10/2026

- [x] Đọc bản Excel mới A1:I96: 92 dòng/11 nhóm/92 mã không trùng; điện thoại bàn tăng từ 8 lên 10. Mẫu Word vẫn có 90 dòng ghi chú trống. Các mô tả 90 dòng/49 dòng cần xác minh của lần tạo workbook trước ở cuối plan là lịch sử.
- [x] Đối chiếu 46 dòng có người với HR final: 44 khớp tên duy nhất; PC26 khác cách viết Joonsun Yoon/YOON JOON SUN, Lap12 khác Lệ/Lê Dung. 46 dòng trống người không tự đồng nghĩa dùng chung. Lap09 có phòng tài sản BKS nhưng người Nguyễn Tiến Trung thuộc PTDA theo final.
- [x] Kiểm tra DB chỉ đọc: 0 tài sản cá thể/vị trí/bàn giao/bảo trì/lịch sử vị trí; 11 category, 1 chứng từ DRAFT/11 dòng tổng 90. Chưa có va chạm mã tài sản hiện hữu; cần mapping và làm rõ ý nghĩa cột.
- [x] Lưu [phân tích nhập tài sản, xung đột và vị trí dùng chung](../strategy/PHAN-TICH-NHAP-TAI-SAN-VA-VI-TRI-DUNG-CHUNG.md). DB đã có ZONE và quan hệ người/phòng nullable nên AP ngoài sảnh không cần phòng ban hoặc người dùng giả.
- [x] Phát hiện hai ô ghi chú có thông tin truy cập; báo cáo chỉ nêu mã dòng, không sao chép giá trị. Chưa sửa workbook hoặc nhập các ghi chú vào DB.
- [ ] Chốt bổ sung đơn vị quản lý riêng với đơn vị sử dụng/vị trí; không dùng currentDepartmentId đồng thời cho ba ý nghĩa hoặc phân quyền theo nơi đặt máy.
- [ ] Hoàn tất phương án HR trước khi gán tài sản theo Employee.id; xóa/tạo lại nhân sự sau nhập tài sản sẽ làm mất liên kết theo FK SetNull.
- [ ] Chuẩn hóa nguồn/92 mã, 11 category, vị trí, các liên kết tên và trạng thái chưa xác định; làm preview trước nhập. Chưa chạy import hoặc migration tài sản trong lượt phân tích này.


## Đồng bộ nền nhân sự — 26/10/2026

- [x] Chuyển người giữ tài sản, người nhận bàn giao và kỹ thuật viên sang Employee; giữ tài khoản cho người thao tác và nhật ký.
- [x] Kiểm tra trước chuyển đổi: chưa có tài sản cá thể, bàn giao hoặc bảo trì; không tạo thiết bị từ biên bản tham khảo.
- [ ] Khi triển khai UI tài sản: chọn người từ bảng nhân sự, kiểm tra cùng công ty; không bắt buộc có tài khoản đăng nhập.


## Giai đoạn 0 — Tiếp nhận nguồn và thiết kế dữ liệu

- [x] Bổ sung quy ước tên PostgreSQL tiếng Việt không dấu: các model tài sản ánh xạ bằng `@@map`/`@map`; xem `docs/DATABASE-DICTIONARY.md`. Không đổi trạng thái hoặc tạo thêm tài sản từ dữ liệu tham khảo.
- [x] Migration rename ngày 22/10/2026 đã áp dụng; kiểm tra nội dung toàn bộ bảng không đổi, các quan hệ Prisma và dữ liệu kiểm kê vẫn đọc được. Build/TypeScript và 5 test E2E cơ cấu đạt sau thay đổi.

- [x] Đọc ảnh biên bản BMHC 0501 và ghi nhận 11 nhóm, tổng 90 thiết bị phần cứng.
- [x] Xác định ảnh chưa có ngày bàn giao, bên nhận, mã tài sản cá thể, serial và tình trạng thiết bị.
- [x] Thiết kế tách chứng từ/số lượng tổng hợp khỏi tài sản cá thể; không tạo 90 tài sản giả.
- [x] Bổ sung các model danh mục, tài sản, vị trí, chứng từ, bàn giao, lịch sử vị trí và bảo trì vào Prisma schema.
- [x] Tạo migration `20261021153000_add_it_asset_management`.
- [x] Tạo seed idempotent `prisma/seed-it-assets.ts` cho chứng từ nháp BMHC 0501.
- [x] Ghi nhận bối cảnh: công ty chưa có khung quản lý tài sản, vận hành linh hoạt và ưu tiên quản lý nhẹ theo số lượng, tình trạng, vị trí cần thiết và báo hỏng–sửa chữa.
- [x] Chốt phạm vi MVP không bao gồm chống mất trộm/thất thoát, kiểm kê khắt khe, khấu hao kế toán hoặc phê duyệt nhiều tầng.
- [x] Chạy `prisma format`, `prisma validate` và `prisma generate` thành công.
- [x] Đối chiếu migration với Prisma diff: 8 enum, 8 bảng, 31 index và 27 khóa ngoại khớp.
- [x] Chạy `tsc --noEmit` và production build Next.js bằng webpack thành công.
- [x] Áp dụng migration `20261021153000_add_it_asset_management` vào PostgreSQL local thành công ngày 21/10/2026.
- [x] Chạy `npm run db:seed:it-assets`: đã nạp bản nháp BMHC 0501 gồm 11 nhóm, tổng 90 thiết bị và chưa tạo tài sản cá thể.
- [x] Xác nhận ảnh BMHC 0501 chỉ là dữ liệu tạm để tham khảo; không cần hoàn thiện chứng từ này và không dùng 90 đơn vị trong ảnh làm tài sản thật.
- [x] Chốt mục tiêu sau khi có tính năng: quản lý từng tài sản bằng hồ sơ riêng, cho phép bổ sung trường chi tiết dần.

## Giai đoạn 1 — Xây tính năng và chuẩn bị kiểm kê thực tế

- [x] Ghi nhận phòng ban tự quản lý license/tài sản do mình đề xuất mua; IT thuộc HCNS và không mặc định quản lý toàn bộ tài sản công ty.
- [x] Phân tích hai phương án người phụ trách đưa ra và phương án kết hợp tại mục 4.5 của `docs/strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md`; cập nhật tài liệu bối cảnh. Đây là đề xuất, chưa triển khai quyền/schema/menu.
- [ ] Chốt phạm vi pilot, người được quản lý, quyền xem tổng hợp và cách quản lý tài sản/license dùng chung.
- [ ] Phân biệt đơn vị chịu trách nhiệm quản lý với đơn vị đề xuất mua, người/đơn vị sử dụng và vị trí; đánh giá bổ sung schema sau khi phương án được duyệt.

- [ ] Xây giao diện và luồng nhập để mỗi thiết bị thực tế có một hồ sơ `Asset` riêng.
- [ ] Thực hiện kiểm kê mới; đối chiếu số lượng theo nhóm và ghi nhận số đang hoạt động, trong kho, hỏng, đang sửa hoặc ngừng dùng.
- [ ] Tạo mã nội bộ, loại và tình trạng tối thiểu cho từng tài sản; bổ sung serial/model, người dùng/bộ phận và vị trí dần khi có dữ liệu.
- [ ] Dán QR/mã tài sản khi thao tác thực tế cho thấy có ích; không coi đây là điều kiện để vận hành MVP.

## Giai đoạn 2 — Chức năng quản lý tài sản tối giản

- [ ] Thiết kế hai mức quyền chính: xem tài sản và quản lý tài sản; chỉ tách thêm quyền khi nhu cầu thực tế xuất hiện.
- [ ] Gán role tài sản kèm phạm vi đơn vị cho người được chỉ định; menu theo quyền hiệu lực, server kiểm tra đồng nhất cho URL, action, export, thống kê và dữ liệu 3D.
- [ ] Xây dựng Server Actions theo Zod, tenant scope và transaction cho cập nhật tài sản, vị trí/người dùng và báo hỏng–sửa chữa.
- [ ] Xây dựng danh sách số lượng theo nhóm, hồ sơ thiết bị cá thể, bộ lọc tình trạng và dashboard ngắn gọn.
- [ ] Xây dựng import kiểm kê có preview/diff; không ghi trực tiếp trước khi người dùng xác nhận.
- [ ] Đánh giá QR sau pilot; nếu dùng, QR chỉ dẫn tới hồ sơ tài sản và không chứa dữ liệu chi tiết.

## Giai đoạn 3 — Dữ liệu vị trí và mô hình 3D

- [ ] Đưa tòa nhà, tầng, phòng, khu vực và tủ rack vào `PhysicalLocation`.
- [ ] Map `PhysicalLocation.threeDKey` với ID phòng đang dùng trong mô hình 3D.
- [ ] Loại bỏ special-case HCNS/Pháp chế và mapping trực tiếp bằng `Department.code`.
- [ ] Hiển thị số lượng/tình trạng tài sản theo phòng trước khi hiển thị từng marker thiết bị.
- [ ] Thêm layer marker tài sản, bộ lọc loại/trạng thái và panel chi tiết.
- [ ] Cho phép tạo yêu cầu bảo trì hoặc phân công công việc từ tài sản/vị trí sau khi module công việc được thiết kế.
- [ ] Tải dữ liệu theo tầng/phòng và dùng instancing khi số marker tăng.

## Giai đoạn 4 — Cải thiện engine và trải nghiệm

- [ ] Chuyển dữ liệu phòng hard-code sang cấu hình không gian có version.
- [ ] Sửa vòng render liên tục thành render theo nhu cầu thực sự; dừng pulse hoặc dùng cơ chế invalidate có kiểm soát.
- [ ] Tái sử dụng Raycaster/Vector2, throttle pointer move và dispose toàn bộ geometry/material/control/listener khi unmount.
- [ ] Cải thiện mobile/touch, keyboard accessibility, reduced motion và fallback khi WebGL không hỗ trợ.
- [ ] Chuẩn hóa màu theo theme token; thiết kế legend rõ giữa phòng ban, loại tài sản và trạng thái.
- [ ] Chỉ nâng cấp sang mô hình glTF/CAD sau khi có bản vẽ được xác nhận và mục tiêu sử dụng cụ thể.

### Phụ lục tài sản IT — 23/10/2026
- [x] Rà soát file project: chưa tìm thấy ảnh gốc bàn giao; tài liệu hiện có lưu số liệu tham khảo từ ảnh trong hội thoại.
- [x] Tạo `docs/bao-cao/DANH-SACH-TAI-SAN-IT-VA-GHI-CHU.docx`: 11 nhóm, tổng 90 thiết bị, ghi chú cần bổ sung và mẫu ghi nhận từng tài sản. Không tự tạo 90 hồ sơ hoặc suy tình trạng/vị trí/người sử dụng.
- [x] Kiểm tra tổng và cấu trúc DOCX; chưa kiểm tra phân trang trực quan vì thiếu LibreOffice (`soffice`).
- [x] Theo yêu cầu rút gọn: giữ bảng tổng, thay mẫu phiếu bằng list 90 dòng (STT, thiết bị, ghi chú trống); đây là danh sách tạm theo số lượng, chưa phải 90 tài sản đã kiểm kê. Kiểm tra đủ 90 dòng.
- [x] Gộp phụ lục Word thành một bảng duy nhất: 11 dòng nhóm có tên loại/số lượng và 90 dòng thiết bị với ghi chú trống. Đã kiểm tra cấu trúc và số dòng; render vẫn bị chặn do thiếu `soffice`.
- [x] Đổi STT phụ lục Word: bắt đầu lại từ 1 cho từng chủng loại; kiểm tra đủ 11 nhóm và 90 dòng thiết bị.

### Ý tưởng quét tem tài sản — 24/10/2026
- [x] Ghi nhận đề xuất mã vạch/QR và camera điện thoại tại [Ý tưởng tính năng](../strategy/Y-TUONG-TINH-NANG.md); đây là ý tưởng, chưa triển khai.
- [ ] Sau khi hoàn thiện hồ sơ tài sản cá thể và phân quyền: thử 5–10 tem, quét từ web điện thoại, mở hồ sơ và nhập mã thủ công dự phòng.
- [ ] Kiểm chứng HTTPS, quyền camera và thiết bị Android/iPhone; quét không tự ghi nhận bàn giao/vị trí hoặc tạo tài sản.

### Sổ Excel từ ghi chú kiểm kê — 27/10/2026
- [x] Tạo `outputs/asset-inventory-20261027/DANH-SACH-TAI-SAN-CHI-TIET-TU-GHI-CHU.xlsx` từ 04 ảnh người phụ trách cung cấp: đủ 90 dòng thuộc 11 nhóm, số lượng từng nhóm khớp danh sách in và chênh lệch bằng 0.
- [x] Tách các cột nhóm thiết bị, hãng/model, phòng ban, người sử dụng, vị trí, địa chỉ mạng, ghi chú chuẩn hóa, ghi chú đọc từ ảnh, mức độ đọc và trạng thái cần xác minh; để trống mã tài sản, serial, ngày/người kiểm kê chờ đối chiếu thực tế.
- [x] Đánh dấu 49 dòng có chữ viết tay hoặc thông tin cần xác minh; ghi riêng chênh lệch tiềm năng ở nhóm điện thoại bàn (`8 + 2: PTDA + ĐT`) để kiểm tra, không tự tăng số tài sản.
- [x] Không đưa tài khoản/mật khẩu thiết bị mạng nhìn thấy trên ảnh vào workbook; chỉ giữ địa chỉ IP phục vụ nhận diện và nhắc chuyển thông tin truy cập sang kho mật khẩu.
- [x] Kiểm tra công thức tổng quan, khóa dòng nguồn duy nhất, lỗi công thức và ảnh render của đủ 03 sheet; không tạo `Asset` trong cơ sở dữ liệu từ dữ liệu ảnh.
