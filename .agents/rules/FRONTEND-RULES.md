# QUY CHUẨN FRONTEND VÀ TRÌNH BÀY GIAO DIỆN

Chuẩn kỹ thuật và trình bày dùng chung cho toàn dự án. Không lưu bố cục, dữ liệu, quyền hoặc cấu hình riêng của một tính năng tại đây. Nghiệp vụ riêng đọc theo [AGENTS.md](../../AGENTS.md); tiến độ/kết quả thuộc plan tương ứng.

## 1. Nhận diện và thành phần dùng chung

- Dùng Tailwind CSS và theme tokens trong `src/app/globals.css` làm nguồn giá trị màu: `primary` cho hành động/nhấn thương hiệu, `accent` cho điểm nhấn phụ, `background/card/muted/foreground/border` cho nền/chữ/viền. Kiểm tra cả chế độ sáng và tối.
- Không hardcode màu HEX trong JSX, không inline màu hoặc tạo class CSS riêng thay cho utility. Dùng `cn()` khi ghép/mở rộng class để tránh xung đột.
- Thành phần cơ bản (Button, Input, Select, Dialog, Checkbox, Tabs…) dùng từ `@/components/ui/`; không tạo bản thô `<input>/<select>/<button>` trong màn hình nghiệp vụ. Nội dung, bảng và sơ đồ dùng cấu trúc HTML/SVG có ngữ nghĩa phù hợp.
- Card/panel/dialog dùng viền mềm và bo góc nhất quán; header/navbar có thể dùng nền mờ theo theme. Tương tác có focus rõ và chuyển trạng thái mượt (`transition-all duration-200`); không để hiệu ứng cản thao tác.

## 2. Trình bày trực quan

- Áp dụng toàn dự án: ưu tiên thông tin dễ quét mắt, giảm đoạn chữ dài bằng hình thức phù hợp với nội dung; không bắt mọi màn hình phải có biểu đồ.
- Bảng dùng so sánh/tra cứu nhiều bản ghi; sơ đồ/cây dùng cho cấu trúc, quan hệ và luồng; biểu đồ dùng cho số liệu; biểu tượng, hình minh họa dùng hỗ trợ nhận biết chức năng hoặc trạng thái trống. Nội dung ngắn, rõ thì giữ dạng chữ.
- Chỉ dùng dữ liệu thật trong phạm vi người dùng được phép xem. Biểu đồ phải có nhãn, đơn vị, khoảng thời gian và thang đo phù hợp; không tạo số mẫu, tiến độ giả hoặc cộng nhóm chồng lấn. Phân biệt số 0, chưa có dữ liệu và không có quyền.
- Màu phải đi kèm chữ/biểu tượng, không là cách duy nhất biểu đạt trạng thái. Nút chỉ có icon cần tên truy cập; hình trang trí dùng `aria-hidden`, hình mang thông tin có mô tả. Bảng/sơ đồ phải đọc được bằng bàn phím và ở kích thước nhỏ.
- Hình ảnh phải giúp hiểu nội dung, không thêm trang trí làm loãng thông tin. Không hiện lối tắt, bộ lọc hoặc chỉ báo giả chưa có chức năng. Khi có tương tác biểu đồ/lọc, số đếm và danh sách chi tiết phải thống nhất.
- Màn hình chính ưu tiên nội dung cần để quyết định và thao tác; hướng dẫn dài, mô tả phụ đưa vào phần mở rộng hoặc chi tiết. Không xếp nhiều khối giải thích trước danh sách làm việc.
- Chỉ hiển thị thông tin có ý nghĩa với người dùng. Mặc định ẩn ID nội bộ/khóa ngoại, phiên bản dữ liệu, tên bảng/trường, metadata đồng bộ và mô tả cơ chế dành cho hệ thống hoặc lập trình viên. Không đưa thông tin kỹ thuật lên bảng, thẻ, form, hướng dẫn hoặc thông báo chỉ vì DB có trường đó.
- Hiển thị tên dễ hiểu và đường dẫn/ngữ cảnh khi cần phân biệt đối tượng; form cho chọn tên, hệ thống lưu ID phía sau. Mã nghiệp vụ chỉ hiện khi phục vụ tra cứu, phân biệt, đối chiếu hoặc công việc thực tế; nếu chưa có giá trị sử dụng thì ẩn khỏi màn hình chính. Chi tiết kỹ thuật chỉ đặt ở màn hình hỗ trợ chuyên biệt khi có nhu cầu rõ ràng. Việc ẩn thông tin trên giao diện không thay đổi ID, liên kết hoặc dữ liệu lưu trong DB.
- Bố cục, số liệu và hành vi riêng của màn hình nằm trong rule/thiết kế tính năng, không bổ sung tại mục này.

## 3. Điều hướng, tải và phản hồi

- Điều hướng nội bộ dùng `next/link`, không dùng `<a>` gây tải lại trang. Liên kết ngoài/tải file có hành vi phù hợp riêng; không ép dùng router nội bộ cho mọi URL.
- Mutation nội bộ qua Server Actions theo [rule Backend](BACKEND-RULES.md), cập nhật giao diện không tải lại toàn trang.
- Tải dữ liệu dùng Skeleton; submit có pending/spinner và chặn gửi lặp. Phản hồi kết quả bằng sonner/toast, kết hợp lỗi tại field khi cần. Trạng thái trống và lỗi phải có lời giải thích, thao tác phù hợp.
- Thao tác bị chặn phải có lý do đọc được và bước xử lý nếu có. Không chỉ làm mờ nút hoặc dựa vào tooltip rê chuột; hướng dẫn phải dùng được trên điện thoại và bàn phím.

## 4. Responsive và khả năng sử dụng

- Mobile-first, độ rộng co giãn; không có phần tử cố định gây tràn ngang toàn trang. Sidebar cố định trên desktop `lg:`, thu vào menu/Sheet ở màn hình nhỏ.
- Bảng trên mobile ưu tiên thẻ nếu vẫn giữ được ngữ nghĩa; khi cần bảng dùng vùng cuộn ngang có kiểm soát. Sơ đồ/biểu đồ rộng cần cách xem phù hợp, không buộc toàn trang cuộn ngang.
- Form một cột trên điện thoại, tăng cột khi đủ chỗ. Dialog khoảng `w-[95vw]`, `max-h-[85vh] overflow-y-auto`; nút lưu phải tiếp cận được khi mở bàn phím.
- Nút/icon thao tác trên mobile tối thiểu 40×40px; input dùng cỡ chữ dễ đọc, ưu tiên `text-base` trên mobile. Không coi `text-sm` 14px là bảo đảm tránh trình duyệt tự zoom.
- Kiểm tra chữ dài, dữ liệu trống, trạng thái tải/lỗi, sáng/tối, focus và thao tác bàn phím; không chỉ xem một ảnh desktop có dữ liệu mẫu.

## 5. Quyền và Server/Client Components

- Chỉ hiện menu/nút khi có quyền hành động tương ứng. Quyền do server xác định; ẩn nút không thay kiểm tra server. Người truy cập trực tiếp khi thiếu quyền nhận thông báo/chuyển hướng phù hợp.
- Không suy quyền từ tên role/chức vụ hoặc gom mọi thao tác thành MANAGE. Ma trận nghiệp vụ và luồng cấp quyền theo [rule phân quyền](ROLE-MANAGEMENT-RULES.md) và rule phân hệ.
- Page/layout là Server Components. Chỉ dùng `"use client"` ở component con cần state/effect/sự kiện trình duyệt; không đặt ở page. Đọc tài liệu Next.js cục bộ trước khi đổi mã theo `AGENTS.md`.

## 6. Form, trường bắt buộc và validation

- Form nghiệp vụ dùng React Hook Form + Zod Resolver. Dùng chung schema với server; lỗi field hiển thị qua `FormMessage`.
- Trường người dùng bắt buộc nhập/chọn có dấu `*` bằng `FormLabel required` và ghi chú `FormRequiredHint`. Không gắn dấu sao cho trường readonly/hệ thống tự cấp hoặc trường tùy chọn; trường mặc định bắt buộc vẫn cần giá trị hợp lệ.
- Có `aria-required`, `aria-invalid`, liên kết lỗi `aria-describedby`; dấu sao trang trí dùng `aria-hidden`. SelectTrigger nhận ref/onBlur của field để focus đúng ô lỗi.
- Thiếu/sai dữ liệu: giữ form và nội dung đã nhập, hiển thị lỗi tiếng Việt ngay dưới field, focus lỗi đầu tiên và thông báo chung. Không chỉ đổi màu hoặc hiện toast rồi đóng form.
- Có thể dùng `noValidate` để thống nhất thông báo RHF/Zod. HTML `required` hoặc nút disabled không thay validation server. Lỗi `fieldErrors` từ action gắn bằng `form.setError`; lỗi nghiệp vụ chung vẫn hiển thị rõ.

## 7. Tra cứu nghiệp vụ riêng

- [HR/phòng ban](HR-RULES.md): trường hồ sơ, nguồn dữ liệu, người phụ trách và nghiệp vụ nghỉ việc.
- [Phân quyền](ROLE-MANAGEMENT-RULES.md): ma trận quyền, gán role và phạm vi quản trị.
- [Tài khoản/Profile/Dashboard](PROFILE-DASHBOARD-RULES.md): mặc định cấp tài khoản, bàn giao, profile và bàn làm việc cá nhân.
- [Workflow](WORKFLOW-RULES.md): mẫu quy trình, người được giao và quyền duyệt/thực hiện.
