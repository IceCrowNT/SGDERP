# QUY CHUẨN THIẾT KẾ CƠ SỞ DỮ LIỆU

Quy định dùng chung cho toàn dự án. Chỉ sửa khi có quyết định thay đổi chuẩn thiết kế; không cập nhật theo từng lần triển khai tính năng.

Không lưu ở đây: lịch sử migration/reset, kết quả kiểm thử, số lượng bảng/bản ghi, dữ liệu demo hoặc nghiệp vụ riêng của phân hệ. Các nội dung đó thuộc plan tương ứng; danh mục bảng/cột thuộc [Từ điển DB](../../docs/DATABASE-DICTIONARY.md).

## 1. Tên bảng, cột và Prisma

- Prisma và PostgreSQL dùng cùng tên model/bảng và scalar field/cột; không dùng `@map`/`@@map` để duy trì hai bộ tên. Không tạo lớp alias Prisma song song. Form/session có hợp đồng riêng, ánh xạ tường minh sang DB tại action.
- Bảng và trường nghiệp vụ: tiếng Việt không dấu, `snake_case`. Khóa chính `id`; khóa ngoại phổ biến `company_id`, `department_id`, `employee_id`, `account_id`, `role_id`, `permission_id`; cây dùng `parent_id`. Thời gian kỹ thuật dùng `created_at`, `updated_at`.
- FK nghiệp vụ đặc thù dùng tiếng Việt + `_id`. Mã truy nguyên từ hệ thống ngoài không phải FK nội bộ; không đổi tên hoặc dùng thay ID nội bộ chỉ vì đều là mã định danh.
- Relation field Prisma cũng dùng tiếng Việt, danh sách dùng `danh_sach_*`; relation field không phải cột vật lý. Tên cần phản ánh đúng ý nghĩa trên giao diện, tra từ điển trước khi thêm.
- Giữ tên constraint/index/sequence lịch sử; dùng `map:` của ràng buộc để tránh đổi tên ngoài ý muốn. Không đổi enum, mã quyền hoặc JSON lịch sử chỉ để đồng nhất ngôn ngữ tên bảng/cột.

## 2. Khóa và quan hệ

- Bảng nghiệp vụ dùng `id Int @id @default(autoincrement())`. Bảng nối có thể giữ khóa chính kép phù hợp; không thêm ID chỉ để đổi hình thức.
- Tham chiếu đối tượng bằng FK, không dùng tên hiển thị làm khóa. Mã nghiệp vụ có ràng buộc unique theo đúng phạm vi (toàn hệ thống hoặc trong công ty); không mặc định mọi mã đều unique toàn cục.
- Khai báo rõ tính bắt buộc/nullable, quan hệ và hành vi xóa. Chỉ dùng Cascade cho dữ liệu phụ được phép xóa cùng chủ thể; dùng Restrict khi phải giữ liên kết/lịch sử. Không tự đổi hành vi xóa để vượt lỗi FK.
- Liên kết giữa dữ liệu thuộc công ty phải bảo đảm cùng công ty, dùng FK kép/unique kép hoặc trigger phù hợp khi cần. Kiểm tra server không thay thế ràng buộc DB.
- Bảng nghiệp vụ chỉnh sửa được có `created_at DateTime @default(now())` và `updated_at DateTime @updatedAt`. Lịch sử chỉ ghi thêm giữ thời điểm sự kiện, không cập nhật timestamp như bản ghi chỉnh sửa; ngoại lệ cụ thể ghi tại thiết kế phân hệ.
- Dùng sequence/default/unique và khóa thích hợp để cấp mã an toàn khi đồng thời; không dùng `MAX + 1`. Không sửa ID hoặc mã đã cấp chỉ để lấp khoảng trống.

## 3. Toàn vẹn dữ liệu và đồng thời

- Thay đổi nhiều bảng liên quan và nhật ký bắt buộc phải cùng transaction; lỗi một phần thì rollback toàn bộ. Không tạo lịch sử thành công cho thao tác thất bại.
- Các luồng cùng sửa một đối tượng phải thống nhất thứ tự khóa. Khóa tài nguyên trước khi kiểm tra điều kiện và ghi; không chỉ dựa vào kiểm tra phía giao diện. Tài nguyên/thứ tự khóa cụ thể thuộc plan hoặc thiết kế phân hệ.
- Quy tắc cây phải chặn tự tham chiếu, chu trình và liên kết khác công ty; thiết kế phải tính cả cập nhật đồng thời.
- Partial unique index, trigger và hàm SQL không được Prisma biểu diễn đầy đủ phải được duy trì bằng migration SQL và kiểm thử riêng. Không vô hiệu hóa ràng buộc trên kết nối ứng dụng để vượt lỗi.
- Seed/import phải có điều kiện khởi tạo rõ ràng, tránh tái tạo dữ liệu đã xóa hoặc ghi đè dữ liệu vận hành. Chạy lại seed không phải cách sửa migration hay phục hồi quyền.

## 4. Migration và bảo toàn dữ liệu

- Duy trì Prisma v6; không tự nâng major. Phiên bản dependency và hướng dẫn môi trường thuộc [Kiến trúc](../../docs/ARCHITECTURE.md).
- Thay đổi schema vật lý phải có migration. Dùng `prisma migrate dev --name <ten_thay_doi>`; khi cần rà SQL trước, dùng `--create-only`. Không dùng `prisma db push` trong luồng phát triển thông thường, không sửa migration đã áp dụng.
- Nếu môi trường không tương tác không tạo được migration: được viết migration SQL tường minh, kiểm tra rồi áp dụng bằng `prisma migrate deploy`. Không reset/`db push` để bỏ qua lỗi.
- Đổi tên dùng `ALTER TABLE ... RENAME TO`/`RENAME COLUMN`, không drop/create để giả lập rename. Cập nhật cả hàm/trigger có tham chiếu tên cũ trong cùng migration; PostgreSQL không tự viết lại nội dung PL/pgSQL.
- Nếu chỉ đổi API Prisma mà tên vật lý không đổi: generate client và kiểm tra diff; không tạo migration rỗng hoặc sửa dữ liệu.
- Không xóa cột/bảng, reset DB hoặc thực hiện thay đổi gây mất dữ liệu nếu chưa được người phụ trách cho phép. Đối với DB có dữ liệu: backup trước thay đổi, thử migration trên DB tạm và kiểm tra phương án phục hồi.
- Sau áp dụng: đối chiếu dữ liệu, khóa/trigger và `prisma migrate diff`; generate client, khởi động lại web/Studio để tránh giữ client cũ. Ghi kết quả ngắn gọn trong plan, không nối vào file rule này.

## 5. Kết nối và dữ liệu nhạy cảm

- `DATABASE_URL` lấy từ cấu hình môi trường, không hardcode tài khoản/mật khẩu/chuỗi kết nối trong source hoặc script.
- Không ghi secret, mật khẩu hoặc token vào log, tài liệu hoặc Git. Backup/export nội bộ lưu ngoài Git theo `AGENTS.md`.

## 6. Tra cứu quyết định DB của phân hệ

| Nội dung | Nơi quản lý |
| --- | --- |
| Nhân sự, cơ cấu phòng ban, nguồn nhập và mã nhân sự | [Plan HR](../../docs/plans/HR-CHECKLIST.md#thiết-kế-db-cần-giữ) |
| Vai trò, quyền và bảng nối | [Plan phân quyền](../../docs/plans/ROLE-MANAGEMENT-CHECKLIST.md#thiết-kế-db-cần-giữ) |
| DEFAULT, tên đăng nhập, mật khẩu tạm và profile | [Plan tài khoản/cá nhân](../../docs/plans/PROFILE-DASHBOARD-CHECKLIST.md#thiết-kế-db-cần-giữ) |
| Mẫu, hồ sơ, bước và lịch sử quy trình | [Plan workflow](../../docs/plans/WORKFLOW-CHECKLIST.md#thiết-kế-db-cần-giữ) |
| Tài sản tạm hoãn, điều kiện khôi phục | [Plan tài sản](../../docs/plans/ASSET-MANAGEMENT-CHECKLIST.md) |

Plan giữ quyết định DB, tiến độ và kết quả liên quan tính năng; thiết kế dài tách ra tài liệu được plan liên kết. Không sao chép lại quy chuẩn chung vào từng plan.
