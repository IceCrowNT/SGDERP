# QUY CHUẨN BACKEND

Quy định kỹ thuật dùng chung, ổn định cho toàn dự án. Không ghi nghiệp vụ phân hệ, lịch sử triển khai, số liệu demo hoặc kết quả kiểm thử vào đây. [AGENTS.md](../../AGENTS.md) định tuyến tới rule/plan tương ứng.

## 1. Kiến trúc và giao tiếp

- Mutation nội bộ dùng Next.js Server Actions với `"use server"`, tương tác trực tiếp Prisma Client. Không thêm Repository/Service Interface trung gian.
- Route Handler dành cho tích hợp bên ngoài hoặc phục vụ tài nguyên cần HTTP (ví dụ tải file có kiểm tra quyền). Không mở REST API song song để thay thế action nội bộ. Hợp đồng và quyền của endpoint cụ thể thuộc rule phân hệ.
- Đọc hướng dẫn Next.js cục bộ theo `AGENTS.md` trước khi đổi mã. Giữ page/layout là Server Component, tách tương tác sang Client Component theo [rule Frontend](FRONTEND-RULES.md).
- Dùng tên Prisma theo [rule DB](DATABASE-RULES.md). Chuyển tường minh giữa hợp đồng form/session và trường DB; không tạo alias model hoặc đổi JWT/JSON lịch sử chỉ vì đổi tên schema.

## 2. Phiên, quyền và phạm vi dữ liệu

- Danh tính người thao tác và công ty lấy từ phiên server, không lấy từ payload. ID đối tượng cần sửa có thể đến từ client nhưng phải được xác minh quyền sở hữu, phạm vi công ty và quyền thao tác.
- Mọi entry point đọc/ghi được bảo vệ đều kiểm tra phiên hợp lệ và quyền hành động tương ứng. Không coi việc ẩn menu/nút hoặc middleware là đủ bảo vệ server.
- Session phải kiểm tra trạng thái tài khoản, phiên bản phiên và quyền hiện tại từ DB; không dùng quyền cũ trong JWT làm nguồn duy nhất. JWT không có secret dự phòng công khai; `SESSION_SECRET` tối thiểu 32 ký tự.
- Không áp đặt một quyền MANAGE cho mọi mutation. Quyền đọc, tạo, duyệt, thực hiện, quản lý và điều kiện người được giao theo rule phân hệ; các chức năng cá nhân có chính sách riêng. Không suy quyền từ tên vai trò, chức vụ hoặc dữ liệu mô tả.
- Truy vấn dữ liệu thuộc công ty phải giới hạn theo công ty trong phiên và phạm vi đối tượng được phép. Bảng nối lọc qua quan hệ phù hợp; danh mục dùng chung theo chính sách quyền riêng. Không nhận ID rồi truy vấn không giới hạn để trả dữ liệu.
- Lấy tối thiểu trường cần dùng, không trả nguyên bản ghi chứa mật khẩu băm, token hoặc dữ liệu nội bộ không thuộc quyền xem. Số đếm, danh sách và xuất dữ liệu phải dùng cùng phạm vi truy cập.

## 3. Xác thực dữ liệu và phản hồi

- Payload phải qua Zod `safeParse`; schema mutation strict, không nhận các trường ngoài hợp đồng. Dùng schema chung với form khi phù hợp; client validation không thay kiểm tra server.
- Trường bắt buộc không chấp nhận thiếu, null/ID không hợp lệ hoặc chuỗi toàn khoảng trắng. Không tự trim mật khẩu. Kiểm tra từng chế độ tạo/sửa; không biến trường tùy chọn thành bắt buộc ngoài nghiệp vụ.
- Dấu `*` biểu thị dữ liệu người dùng phải cung cấp, không phải mọi cột NOT NULL. Giá trị do hệ thống cấp/phiên xác định không bắt người dùng nhập. Trường có mặc định vẫn phải được kiểm tra hợp lệ.
- Validation lỗi trả `success: false`, thông báo tiếng Việt và `fieldErrors` theo tên field (từ `flatten().fieldErrors`) để form hiển thị đúng vị trí. Không ghi dữ liệu hay audit thành công khi payload không hợp lệ.
- Lỗi nghiệp vụ được trình bày rõ, không trả stack trace, SQL, thông tin kết nối hay payload nhạy cảm. Log phục vụ chẩn đoán không chứa mật khẩu/token/secret.

## 4. Transaction, đồng thời và audit

- Thay đổi nhiều bảng liên quan và nhật ký bắt buộc phải trong cùng `prisma.$transaction`. Lỗi audit bắt buộc làm rollback nghiệp vụ; không dùng helper nuốt lỗi cho trường hợp này.
- Trong transaction, kiểm tra lại quyền, trạng thái và phiên của người thao tác trước ghi. Áp dụng khóa và kiểm tra version khi có nguy cơ ghi đè; thứ tự khóa và điều kiện chuyển trạng thái cụ thể nằm tại plan/thiết kế phân hệ.
- Không giữ transaction mở để gọi dịch vụ ngoài. Không dựa riêng vào lần kiểm tra trước transaction hoặc nút disabled để ngăn xử lý đồng thời.
- Ràng buộc FK/unique/trigger và migration theo [rule DB](DATABASE-RULES.md); không bỏ ràng buộc để xử lý lỗi ứng dụng.
- Mutation thành công cập nhật cache/path liên quan để danh sách, chi tiết và menu phản ánh trạng thái/quyền mới. Revalidation không thay kiểm tra quyền ở request tiếp theo.

## 5. Rule nghiệp vụ cần đọc thêm

| Phạm vi | Rule | Plan / thiết kế DB |
| --- | --- | --- |
| Nhân sự và phòng ban | [HR](HR-RULES.md) | [Plan HR](../../docs/plans/HR-CHECKLIST.md) |
| Vai trò, tài khoản quản trị và quyền | [Phân quyền](ROLE-MANAGEMENT-RULES.md) | [Plan phân quyền](../../docs/plans/ROLE-MANAGEMENT-CHECKLIST.md) |
| Cấp tài khoản mặc định, profile, dashboard | [Không gian cá nhân](PROFILE-DASHBOARD-RULES.md) | [Plan cá nhân](../../docs/plans/PROFILE-DASHBOARD-CHECKLIST.md) |
| Quy trình và duyệt công việc | [Workflow](WORKFLOW-RULES.md) | [Plan workflow](../../docs/plans/WORKFLOW-CHECKLIST.md) |

Rule phân hệ chỉ bổ sung chính sách nghiệp vụ, không tự hạ yêu cầu xác thực, validation, transaction hay bảo toàn dữ liệu của rule chung.
