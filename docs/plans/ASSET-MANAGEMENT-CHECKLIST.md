# Kế hoạch quản lý tài sản IT và tích hợp không gian 3D

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
