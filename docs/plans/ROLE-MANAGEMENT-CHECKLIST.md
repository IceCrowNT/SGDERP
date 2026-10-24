# Kế hoạch quản lý vai trò và phân quyền

**Ngày lập:** 24/10/2026  
**Trạng thái:** Đã lập kế hoạch theo yêu cầu; chưa triển khai chức năng hoặc thay quyền hiện hành.  
**Trang dự kiến:** `/roles` — Vai trò và phân quyền.  
**Mục tiêu:** quản trị viên tạo vai trò, chọn chức năng được sử dụng, gán cho người dùng và kiểm tra quyền thực tế bằng giao diện đơn giản.

## 1. Căn cứ và hiện trạng

- [x] Rà soát tĩnh schema, `src/lib/auth.ts`, `src/lib/permissions.ts`, actions đăng nhập/nhân sự và tài liệu đồng bộ. Chưa kiểm kê quyền đang có trực tiếp trong DB ở bước lập plan.
- [x] Xác định DB đã có `Role`, `Permission`, `RolePermission`, `UserRole` tương ứng `vai_tro`, `quyen`, `vai_tro_quyen`, `nguoi_dung_vai_tro`; tái sử dụng thay vì tạo hệ role song song.
- [x] Chưa thấy trang `/roles` hoặc Server Action quản lý role; menu hiện đánh dấu sắp có.
- [x] Session JWT chứa role và quyền theo module, hạn 7 ngày; đọc session chưa tải lại quyền từ DB. Thu hồi role có thể chưa tác động tới phiên đang mở.
- [x] Đăng nhập đang cho `ADMIN` và `IT_ADMIN` quyền rộng qua mã role; helper phạm vi còn suy toàn quyền từ MANAGE và phòng con từ cơ cấu. Không coi đó là thiết kế mục tiêu.
- [x] Actions nhân sự có luồng gán role dưới quyền HR MANAGE; cần kiểm tra và đóng đường gán quyền này khi đưa quản lý role vào sử dụng.

Tham chiếu: [thiết kế dữ liệu nền và RBAC](../strategy/DONG-BO-DU-LIEU-NEN-VA-PHAN-QUYEN.md), [HR](HR-CHECKLIST.md), [DB rules](../../.agents/rules/DATABASE-RULES.md), [backend rules](../../.agents/rules/BACKEND-RULES.md), [frontend rules](../../.agents/rules/FRONTEND-RULES.md).

Lưu ý: phần backend rules mô tả permissions JSON trên Role chưa khớp schema quan hệ thực tế. Khi triển khai cần cập nhật rule theo thiết kế được chốt, không thêm cột JSON chỉ để khớp mô tả cũ.

## 2. Nguyên tắc nghiệp vụ

1. 1Office cung cấp nhân sự và cơ cấu; quyền sử dụng ERP do ERP quản lý. Không tự sao chép nhóm 1Office thành role ERP.
2. Phòng ban là nơi trực thuộc; role là quyền thao tác. Không tự cấp quyền vì chức danh, username hoặc thuộc HCNS/IT/Ban lãnh đạo.
3. Một người có thể có nhiều role. Quyền được cộng theo từng chức năng và phạm vi được cấp; “Không truy cập” là không cấp, không phải phủ định quyền từ role khác.
4. MANAGE bao gồm VIEW trong cùng chức năng và cùng phạm vi; không đồng nghĩa toàn công ty. Mọi phạm vi đều giới hạn bởi công ty đang quản lý.
5. Thiếu quyền thì từ chối. Sidebar, URL trực tiếp, Server Action, export, thống kê và 3D phải dùng cùng quy tắc. Ẩn menu không thay thế kiểm tra server.
6. Gán quyền trực tiếp cho người dùng thông qua role; chưa thêm hệ ngoại lệ riêng cho từng người, quy trình duyệt nhiều tầng hoặc ủy quyền có thời hạn trong bản đầu.
7. Không sửa dữ liệu tổ chức để phục vụ phân quyền. Không xóa role hệ thống hoặc role đang được sử dụng; không làm mất người quản trị quyền cuối cùng.

## 3. Phạm vi bản đầu

### Màn hình chính

| Khu vực | Nội dung |
| --- | --- |
| Danh sách vai trò | Tên, mã, số người sử dụng, nhãn vai trò hệ thống; tìm kiếm theo tên/mã |
| Chi tiết vai trò | Thông tin cơ bản, ma trận quyền, danh sách người được gán |
| Ma trận quyền | Tên chức năng dễ hiểu; chọn Không truy cập / Xem / Quản lý |
| Gán người dùng | Tìm theo tên/mã nhân viên, lọc phòng ban; thêm/gỡ role trong cùng công ty |
| Quyền hiệu lực | Xem quyền cuối cùng của một người và role nào cấp quyền đó |
| Lưu thay đổi | Hiển thị phần thay đổi và số người bị ảnh hưởng; ghi nhật ký |

Không đưa ID DB, ID nguồn 1Office hoặc danh sách mã quyền kỹ thuật lên bảng mặc định. Trên mobile dùng danh sách/card và biểu mẫu một cột.

### Chức năng cần phân quyền

- Danh bạ và cơ cấu tổ chức: xác định quyền đọc và quyền sửa metadata nội bộ; giữ khóa trường nguồn 1Office.
- Hồ sơ nhân sự/tài khoản: phân biệt sửa hồ sơ, quản trị tài khoản và gán role; không để HR MANAGE tự cấp quyền hệ thống.
- Quản lý vai trò: quyền riêng `RBAC:MANAGE`, không dùng chung với toàn bộ quyền SYSTEM.
- Nhật ký hoạt động và công cụ văn bản AI: tách quyền theo chức năng khi triển khai, có kế hoạch chuyển đổi quyền SYSTEM hiện tại.
- 3D: chỉ hiển thị trường nhân sự/tài sản người dùng được phép xem.
- Tài sản: dự trù quyền xem/quản lý và phạm vi phòng ban; chưa mở nút cấp quyền cho nghiệp vụ chưa có kiểm tra server.
- Công việc/phê duyệt hoặc module chưa hoàn thiện: ghi rõ chưa triển khai; không hiển thị như quyền đã hoạt động.

Tên mã quyền cuối cùng được chốt sau kiểm kê endpoint và dữ liệu hiện hữu ở bước 1; bảng này không tự thay permission đang dùng.

## 4. Thiết kế dữ liệu và phạm vi dự kiến

### Bản đầu: quản lý role hiện hữu, quyền hiệu lực và phạm vi công ty

- Giữ ID và liên kết hiện có. Không chạy lại seed nhân sự để cập nhật quyền vì seed có thể ghi đè dữ liệu khác.
- UI ba mức là cách trình bày; cần mapping tường minh các permission đã tồn tại. Không tự biến APPROVE/ASSIGN/CREATE thành MANAGE rộng hơn khi sửa role.
- Danh mục quyền do ứng dụng định nghĩa; người quản trị không nhập tùy ý mã module/action.
- Xem trước chuyển đổi role cũ; giữ quyền chưa hỗ trợ trong UI hoặc chặn sửa kèm giải thích, không âm thầm xóa khi lưu ma trận.
- `isSystem` bảo vệ vai trò nền tảng; việc thay role quản trị cần kiểm tra riêng. Không dùng nhãn “hệ thống” làm lý do miễn mọi kiểm tra.

### Mở rộng phạm vi phòng ban

- Đề xuất scope gắn vào lần gán role cho người dùng: toàn công ty hoặc tập phòng ban cụ thể; không đặt scope chung trên Permission như hiện tại.
- Cùng role có thể gán cho đầu mối HCNS hoặc phòng khác với phạm vi khác nhau; không tạo một role cho mỗi phòng.
- Không tự bao gồm đơn vị con; nếu cần phải chọn rõ phạm vi đó. Người chuyển phòng không tự được thêm quyền.
- Quyền hiệu lực tính theo cặp quyền–phạm vi, không lấy mức quyền cao nhất nhân với toàn bộ danh sách phòng được xem.
- Chỉ bật lựa chọn phạm vi khi cả truy vấn và thao tác ghi của module đã hỗ trợ. Bản đầu không giả lập “chỉ phòng mình” bằng việc ẩn menu.
- Khi cần thêm scope/phiên: lập migration bảo toàn dữ liệu, dùng tên vật lý tiếng Việt, cập nhật từ điển DB. Chưa chốt schema mới hoặc chạy migration trong bước lập plan.

## 5. Các bước thực hiện và đầu ra

### Bước 1 — Kiểm kê và chốt bản quyền hiện hành
- [ ] Đọc role, permission và số người được gán theo công ty; lập bản đối chiếu không xuất thông tin đăng nhập.
- [ ] Kiểm kê trang/action hiện có, xác định quyền cần giữ, quyền chưa được thực thi và các đường gán role ngoài `/roles`.
- [ ] Xác định người quản trị quyền đầu tiên và cách duy trì quyền của họ khi bỏ cơ chế suy từ mã role.
- [ ] Chốt ma trận chức năng, mapping quyền cũ và phạm vi bản đầu. Đầu ra: bảng chuyển đổi có thể xem xét, không tự thay quyền của mọi người.

### Bước 2 — Quyền server và hiệu lực phiên
- [ ] Tạo kiểm tra RBAC chuyên biệt, xác minh tài khoản còn hoạt động và công ty tại server.
- [ ] Chọn cách làm gọn cho quy mô hiện tại: tải quyền hiệu lực từ DB ở các ranh giới cần bảo vệ; JWT dùng nhận diện. Có thể cache trong một request, không cache quyền kéo dài qua việc thu hồi.
- [ ] Phiên đang mở mất quyền ở request được bảo vệ tiếp theo sau thay đổi; giao diện làm mới theo phản hồi. Không yêu cầu người dùng chờ JWT hết hạn 7 ngày.
- [ ] Kiểm tra cấu hình SESSION_SECRET và bỏ secret mặc định khi triển khai; không in giá trị bí mật.
- [ ] Gán/gỡ role, thay permission và nhật ký thực hiện nhất quán trong transaction; kiểm tra bảo vệ admin cuối cùng cả khi có thao tác đồng thời.
- [ ] Khóa đường tự nâng quyền qua sửa hồ sơ nhân sự; rà soát lựa chọn role khác công ty và payload giả mạo.

### Bước 3 — Giao diện `/roles`
- [ ] Danh sách, tìm kiếm, tạo/sửa vai trò và bảo vệ mã role hệ thống.
- [ ] Ma trận Không truy cập / Xem / Quản lý, chỉ liệt kê quyền thực sự hỗ trợ.
- [ ] Gán/gỡ người dùng; giữ vai trò chính nhất quán nếu còn dùng `isPrimary`.
- [ ] Xem quyền hiệu lực; cảnh báo phạm vi ảnh hưởng trước khi lưu.
- [ ] Cập nhật sidebar bỏ “Sắp có”, giới hạn menu theo quyền RBAC; skeleton, trạng thái lưu và thông báo lỗi.

### Bước 4 — Áp dụng đồng bộ cho chức năng hiện có
- [ ] Rà lại HR, cơ cấu, 3D, nhật ký và AI; thống nhất kiểm tra page/action, tránh chỉ kiểm soát tại giao diện.
- [ ] Kiểm tra không tự mở quyền AI cho mọi người khi chuyển từ SYSTEM sang quyền riêng.
- [ ] Bổ sung phạm vi phòng ban cho module cần dùng sau khi có dữ liệu chủ sở hữu và server filter phù hợp; chưa coi là hoàn thành cùng bản đầu.

### Bước 5 — Kiểm thử và chốt pilot
- [ ] Chạy kiểm thử bên dưới; sửa lỗi và cập nhật tài liệu hướng dẫn ngắn.
- [ ] Đối chiếu quyền trước/sau của nhóm thử nghiệm, ghi nhận các thay đổi đã được người phụ trách chốt.
- [ ] Demo tạo vai trò → chọn quyền → gán người dùng → xem menu/dữ liệu → thu hồi trong phiên đang mở.
- [ ] Chỉ đánh dấu hoàn thiện khi quyền UI và server khớp; chức năng còn giới hạn phải ghi rõ.

Thứ tự ưu tiên: bước 1 → 2 → 3 → kiểm thử bản đầu; phạm vi phòng ban triển khai tiếp theo theo module. Chưa chốt ngày hoàn thành khi chưa có kết quả kiểm kê và ma trận quyền được duyệt.

## 6. Tiêu chí kiểm thử bắt buộc

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Không đăng nhập / không quyền RBAC | Không thấy menu; URL và action đều bị chặn |
| HR MANAGE không có RBAC MANAGE | Không tạo/sửa/gán role qua bất kỳ form/action nào |
| Người dùng thuộc công ty khác | Không đọc hoặc gán role/người dùng/phòng ban ngoài công ty |
| Một người có nhiều role | Cộng đúng quyền; không mở rộng scope ngoài các grant |
| Đổi/gỡ role trong khi đang đăng nhập | Request tiếp theo áp dụng quyền mới; UI không được coi là căn cứ cho phép |
| Khóa tài khoản | Phiên cũ không tiếp tục thao tác được |
| Xóa role đang dùng / role hệ thống | Bị chặn, thông báo rõ; không mất gán quyền ngoài ý muốn |
| Gỡ quyền quản trị cuối cùng, kể cả đồng thời | Bị chặn tại server |
| Sửa role có permission ngoài UI ba mức | Không tự mất hoặc được mở rộng quyền |
| Sửa nội dung và ghi audit thất bại | Không để trạng thái cập nhật một phần |
| Mobile, tìm kiếm và trạng thái rỗng | Dễ dùng, không tràn ngang, không nhầm không có quyền với không có dữ liệu |

Kiểm thử quyền phải có người dùng/role thử thực tế trong DB cô lập, có dọn dữ liệu sau chạy. Session fixture tự ký đơn thuần không đủ xác minh cơ chế tải lại quyền từ DB. Không sử dụng 1Office cho kiểm thử này.

## 7. Quyết định cần chốt khi triển khai

- Ai được quản lý role ngoài tài khoản quản trị hiện tại?
- Pilot tài sản cấp cho vài người HCNS hay mở nhiều phòng; phòng nào cần chỉ xem hoặc được sửa?
- Danh bạ/cơ cấu cho toàn công ty hay theo phòng; trường nhân sự nào được hiển thị trên 3D?

Có thể tiếp tục kiểm kê và xây phần nền độc lập với các câu trả lời này. Không tự cấp quyền thật dựa trên suy đoán. Chưa đưa quy trình duyệt nhiều tầng, ủy quyền theo thời hạn hoặc tự đồng bộ role 1Office vào bản đầu.
