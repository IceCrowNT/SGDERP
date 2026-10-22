# QUY TẮC QUẢN LÝ TÀI SẢN & TÍCH HỢP KHÔNG GIAN 3D

## 1. Phân biệt chứng từ, số lượng và tài sản cá thể

- Tên model/field dưới đây là API Prisma. Tên bảng/cột PostgreSQL phải dùng tiếng Việt không dấu qua `@@map`/`@map`, theo `DATABASE-RULES.md` và `docs/DATABASE-DICTIONARY.md` (ví dụ `Asset` → `tai_san`, `assetCode` → `ma_tai_san`).

- `AssetInventoryDocument` và `AssetInventoryLine` lưu bằng chứng bàn giao/kiểm kê cùng số lượng tổng hợp.
- `AssetInventoryLine` chỉ lưu số liệu tham khảo/kiểm kê; không thay thế hồ sơ từng tài sản trong vận hành chính thức.
- Mỗi thiết bị thực tế được quản lý phải có một `Asset` với mã nội bộ duy nhất. Không tự sinh tài sản từ số lượng trên ảnh/biên bản tham khảo; chỉ tạo từ dữ liệu kiểm kê thực tế sau khi tính năng sẵn sàng.
- Mỗi tài sản tạo từ biên bản phải giữ `sourceLineId` để đối soát số đã cá thể hóa với số trên chứng từ.
- Biên bản thiếu ngày, bên nhận hoặc chữ ký xác nhận phải giữ trạng thái `DRAFT`.

## 2. Dữ liệu hiện tại và lịch sử

- `Asset.currentLocationId`, `currentCustodianId` và `currentDepartmentId` là snapshot phục vụ truy vấn nhanh.
- Mọi thay đổi snapshot phải đồng thời đóng bản ghi lịch sử đang mở và tạo `AssetLocationHistory` hoặc `AssetAssignment` mới trong cùng một Prisma transaction.
- Không xóa lịch sử bàn giao, vị trí hoặc bảo trì. Sửa sai bằng trạng thái/ghi chú và bản ghi điều chỉnh có audit.
- Một tài sản chỉ có tối đa một vị trí hiện hành và một bàn giao hiện hành tại một thời điểm.

## 3. Tích hợp mô hình 3D

- Dữ liệu nghiệp vụ liên kết với `PhysicalLocation.id`; không liên kết trực tiếp với mesh Three.js hoặc tên phòng.
- `PhysicalLocation.threeDKey` ánh xạ tới khóa ổn định của đối tượng trong mô hình, ví dụ `t2_hcns_pc`. Thay mô hình 3D không được làm thay đổi lịch sử tài sản.
- Tọa độ điểm đặt thiết bị là dữ liệu tùy chọn. Khi chưa đo thực tế, chỉ gán tài sản tới phòng/khu vực, không tự suy tọa độ chính xác.
- Khi hiển thị nhiều thiết bị, dùng marker/instancing và tải theo tầng/phòng; không tạo một mesh chi tiết cho toàn bộ tài sản cùng lúc.

## 4. Toàn vẹn, phân quyền và tenant

- Mọi truy vấn phải lọc `companyId` từ session.
- MVP dùng hai mức quyền chính: xem tài sản và quản lý tài sản. Chỉ tách quyền chi tiết khi quy trình thực tế yêu cầu.
- Thông tin cấu hình kỹ thuật chỉ lưu khi có ích cho vận hành và chỉ hiển thị cho người có quyền quản lý tài sản/IT.
- Mã tài sản, mã bảo trì và code vị trí phải duy nhất trong công ty.
- Giao tài sản cho người/phòng ban phải xác minh cùng công ty với tài sản.
- `AssetAssignmentType.USER` yêu cầu người nhận; `DEPARTMENT` yêu cầu phòng nhận; `SHARED` phải có vị trí hoặc phòng quản lý. Kiểm tra bằng Zod trước transaction.

## 5. Bảo trì

- Luồng tối thiểu là báo hỏng, người xử lý, trạng thái và kết quả sửa chữa. Lịch định kỳ, chi phí và nhà cung cấp là trường mở rộng.
- Hoàn tất bảo trì phải cập nhật tình trạng tài sản và lịch bảo trì tiếp theo trong cùng transaction khi có thay đổi.
- Chi phí dùng `Decimal`; không dùng số thực JavaScript để cộng tổng tài chính.

## 6. Ngoài phạm vi MVP

- Không xây chức năng chống mất trộm, cảnh báo thất thoát hoặc điều tra trách nhiệm.
- Không bắt buộc kiểm kê theo chu kỳ khắt khe, dán QR hoặc nhập đủ toàn bộ trường ngay lần đầu; vẫn quản lý mỗi tài sản bằng một hồ sơ riêng.
- Không xây khấu hao/hạch toán kế toán và quy trình phê duyệt nhiều tầng trong phân hệ tài sản.
- Chỉ bổ sung các lớp kiểm soát trên khi người sở hữu nghiệp vụ xác nhận có nhu cầu thực tế.
