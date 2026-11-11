# Kế hoạch SDG ERP — đọc nhanh

Cập nhật: **11/11/2026**. Ưu tiên: **phân quyền → phân công thực tế → workflow thử nghiệm**. Các chức năng hiện tại vẫn là bản thử nghiệm, chưa đồng nghĩa nghiệm thu vận hành.

Khi tạo/cập nhật plan, đọc [Quy chuẩn lập và cập nhật plan](#quy-chuẩn-lập-và-cập-nhật-plan) bên dưới.

Giao diện đã đồng bộ cho nhân sự, tài khoản, phòng ban, profile, workflow, nhật ký và 3D: số liệu có phạm vi rõ, bảng/thẻ responsive, hướng dẫn mở khi cần. Kiểm tra 09/11: lượt toàn bộ 52 E2E đạt 50, hai lỗi hiển thị/selector đã sửa và nhóm liên quan chạy lại **14/14 đạt**; TypeScript/lint đạt. Chrome kiểm tra 7 màn hình trên desktop/mobile không tràn ngang. Riêng danh bạ nhân sự mới: 20 E2E liên quan đạt, chi tiết tại plan HR. Chi tiết các mảng tại từng plan. Hiện có 3 vai trò (ADMIN, DEFAULT, HCNS); lần cập nhật UI không đổi schema hoặc quyền.

| Mảng | Hiện tại | Việc tiếp theo |
| --- | --- | --- |
| [Nhân sự/phòng ban](HR-CHECKLIST.md) | Đã có CRUD, tài khoản riêng, head kiêm nhiệm, tự khóa khi nghỉ việc; danh bạ theo phòng, hồ sơ bên phải, bảng phân trang và gán vị trí làm việc | Chọn head thực tế, chốt phạm vi xem dữ liệu |
| [Báo cáo công việc tuần](WEEKLY-REPORT-CHECKLIST.md) | Đã lập plan 11/11, chưa triển khai: bảng giống Excel, sao chép kỳ cũ giữ hạn năm, nội dung JSONB, lịch sử và bản chốt | Xác nhận kỳ/quyền/mẫu in; sau yêu cầu triển khai mới thử grid/export và migration |
| [Vai trò/phân quyền](ROLE-MANAGEMENT-CHECKLIST.md) | Đã có `/roles`, ma trận, gán/gỡ; đã thu gọn vai trò mẫu còn 3 | Dùng thử với tài khoản thực tế; quyền workflow đã có, chờ cấp thực tế |
| [Workflow](WORKFLOW-CHECKLIST.md) | Đã có `/workflows`, 5 bảng, mẫu có phiên bản và xử lý tuần tự; đã thiết kế kéo thả, biểu mẫu, giao việc và thông báo | Cấu hình pilot thực tế; sau đó làm bản mẫu kỹ thuật vùng kéo thả và migration an toàn |
| [Tài khoản mặc định/Profile/Dashboard](PROFILE-DASHBOARD-CHECKLIST.md) | Đã có DEFAULT/tên tự sinh, profile và dashboard cá nhân; đã thiết kế ưu tiên việc đến lượt | Dùng thử thực tế; bổ sung thông báo trong ứng dụng cùng workflow mở rộng |
| [Vị trí & không gian](LOCATION-MANAGEMENT-CHECKLIST.md) | Đã có cây `vi_tri`, `/locations`, quyền LOCATIONS; đã nhập thêm 10 điểm HCNS theo yêu cầu | Gán/chuyển/bỏ gán người ngay tại vị trí; xóa có xác nhận tự bỏ gán. Tài sản tích hợp sau |
| [Tài sản/3D](ASSET-MANAGEMENT-CHECKLIST.md) | Mức 1: 2 bảng loại/tài sản, tham chiếu vị trí chung; chưa triển khai. Vật tư làm sau | Sau nền vị trí: migration an toàn và UI tài sản; không gộp quyền sửa cây vị trí |
| [3D tòa nhà & HCNS](OFFICE-3D-CHECKLIST.md) | Một Canvas; nhấp đúp HCNS phóng gần, chọn bàn/hình người, tên theo vị trí đã gán; giữ camera và thao tác HR theo quyền. 20 E2E liên quan đạt theo nhóm | Bổ sung sơ đồ nội thất và ánh xạ các phòng còn lại; tìm kiếm đưa tới người/kéo thả còn đề xuất |
| [Hồ sơ AI](AI-DOCUMENTS-CHECKLIST.md) | Tạm hoãn, đã gỡ pilot | Chờ duyệt mẫu, người dùng và ngân sách API |
| [Số hóa/báo cáo](DIGITAL-TRANSFORMATION-CHECKLIST.md) | Đã khảo sát và chuẩn bị báo cáo | Chốt KPI, đầu mối, lịch và tiêu chí nghiệm thu |

## Quy chuẩn lập và cập nhật plan

Đây là nguồn chính về cấu trúc và cách viết plan của dự án; `AGENTS.md` chỉ dẫn tới mục này. Áp dụng cho plan mới; khi cập nhật plan cũ, chuẩn hóa phần thuộc phạm vi yêu cầu, không tự viết lại toàn bộ các phân hệ khác. Quy chuẩn không thay đổi phạm vi đã duyệt hoặc các điều kiện duyệt tại [AGENTS.md](../../AGENTS.md).

### 1. Hai mức đọc trong cùng một plan

Đầu file ghi ngày cập nhật, trạng thái thực tế, liên kết rule phân hệ và mục lục ngắn. Người phụ trách đọc phần A để quyết định; agent phải đọc cả A, B và rule liên quan trước triển khai.

| Phần | Nội dung cần có | Cách trình bày |
| --- | --- | --- |
| **A. Tổng quan để duyệt** | Vấn đề/mục tiêu, phạm vi bản đầu, người dùng thao tác gì | Đoạn ngắn + bảng chức năng |
| | Luồng sử dụng, mô hình dữ liệu rút gọn nếu có thay đổi dữ liệu | Sơ đồ luồng/ERD và chú giải |
| | Phương án đã thống nhất, điểm chờ xác nhận, mốc tiến độ và điều kiện nghiệm thu | Bảng quyết định, trạng thái và liên kết xuống B |
| **B. Chi tiết triển khai** | Trường dữ liệu, quan hệ, ràng buộc; quyền, trạng thái và hành vi cụ thể | Bảng thiết kế DB, ma trận quyền, bảng chuyển trạng thái |
| | Đồng thời, lịch sử, lỗi, migration và bảo toàn dữ liệu khi có liên quan | Quy tắc ngắn, nêu điều kiện và cách xử lý |
| | Các bước thực hiện, kiểm thử, kết quả và việc còn lại | Checklist có tiêu chí xác minh |

Phần A hướng tới đọc trong 3–5 phút, không chép lại bảng cột và thuật toán ở B. Phần B phải đủ để triển khai mà không đoán các quyết định quan trọng. Tính năng nhỏ được rút gọn hoặc ghi rõ mục không áp dụng, không thêm mục/sơ đồ cho đủ hình thức. Khi B quá dài, chuyển chi tiết sang tài liệu thiết kế được plan liên kết; không duy trì hai bản đặc tả giống nhau.

### 2. Bảng, sơ đồ và mô hình DB

- Dùng bảng cho thông tin cần so sánh: phạm vi, trường, quyền, trạng thái, phương án và tiêu chí kiểm tra. Dùng sơ đồ cho luồng hoặc quan hệ; giữ đoạn văn khi nội dung ngắn đã đủ rõ.
- Khi thiết kế mới/thay đổi quan hệ dữ liệu, có sơ đồ DB rút gọn phù hợp quy mô: đánh dấu bảng mới/dùng lại, quan hệ bắt buộc/tùy chọn và trạng thái dự kiến/đã triển khai. Liên kết tra cứu qua ID/JSON phải phân biệt với FK; dữ liệu lồng trong JSON không vẽ thành bảng SQL riêng.
- Giữ mục `Thiết kế DB cần giữ` ở phần B (hoặc liên kết từ mục đó tới thiết kế chi tiết). Giải thích lý do của quyết định có đánh đổi; không chỉ liệt kê tên cột.
- Dùng tiêu đề, đoạn và ô bảng ngắn; tránh biến một đoạn dài thành một ô bảng dài. Thuật ngữ kỹ thuật cần chú giải khi xuất hiện ở A; ưu tiên nhãn nghiệp vụ.
- Sơ đồ là phần nhìn nhanh của cùng thiết kế: thay quan hệ phải đối chiếu cả sơ đồ lẫn chi tiết. Không bắt buộc giao diện tương tác; Markdown/Mermaid có mục lục và liên kết đủ cho plan thông thường.

### 3. Quyết định, tiến độ và nghiệm thu

- Phân biệt **đề xuất/chờ xác nhận**, **đã thống nhất thiết kế**, **đang triển khai**, **đã triển khai** và **đã kiểm chứng**. Ghi rõ giả định, quyết định còn thiếu và bước phụ thuộc; không tự biến đề xuất thành yêu cầu đã duyệt.
- `[x]` chỉ đánh dấu công việc có bằng chứng đã hoàn thành; `[ ]` là còn lại. Hoàn thành thiết kế hoặc kiểm thử kỹ thuật không đồng nghĩa được duyệt triển khai hoặc nghiệm thu vận hành.
- A tóm tắt các mốc, B sở hữu checklist thực hiện chi tiết; liên kết giữa hai phần, không sao chép từng checkbox ở cả hai.
- Tiêu chí hoàn thành phải kiểm tra được, bao gồm hành vi chính và tình huống lỗi/quyền/đồng thời phù hợp tính năng. Ghi kết quả thực tế và giới hạn kiểm chứng; không ghi đạt khi chưa chạy.

### 4. Một nơi quản lý và cập nhật hiện trạng

- Rule kỹ thuật chung giữ chuẩn ổn định; rule phân hệ giữ nghiệp vụ; plan giữ phạm vi, quyết định, tiến độ và kiểm chứng. Quyết định DB riêng ở plan/thiết kế được liên kết, không dồn vào rule DB chung.
- Mỗi quyết định có một nơi quản lý chi tiết; nơi khác chỉ tóm tắt và liên kết. Agent phải đối chiếu nguồn chính trước sửa; không coi bản tóm tắt là một đặc tả độc lập.
- Cập nhật mục hiện có, sửa cả tham chiếu/sơ đồ chịu ảnh hưởng; bỏ hoặc đánh dấu rõ nội dung lỗi thời. Không nối nhật ký từng lệnh, lặp lịch sử kiểm thử hoặc sao chép hiện trạng của phân hệ khác.
- Trước kết thúc: kiểm tra liên kết/anchor, tính nhất quán A–B–rule, trạng thái quyết định, checklist và diff; chỉ chạy kiểm thử mã khi có thay đổi mã cần kiểm chứng.
- Tên bảng/cột tra [Từ điển DB](../DATABASE-DICTIONARY.md), chuẩn đặt tên tra [rule DB](../../.agents/rules/DATABASE-RULES.md), hạ tầng/dependencies tra [Kiến trúc](../ARCHITECTURE.md). Không chép lại chuẩn chung vào plan.
- Lịch sử mã nguồn ở Git; bản nguyên trạng sáu plan trước lần rút gọn lưu cục bộ trong `outputs/ke-hoach-truoc-rut-gon/20261104-161557/`, có checksum. Bản sao là lịch sử, không thay thế quyết định hiện hành.

## Rà soát tài liệu

- [x] Thiết lập quy chuẩn lập/cập nhật plan tại README, dẫn chiếu bắt buộc từ `AGENTS.md`; áp dụng bố cục A/B, sơ đồ luồng và mô hình DB cho [báo cáo tuần](WEEKLY-REPORT-CHECKLIST.md). Chỉ sắp xếp tài liệu, không chốt thêm nghiệp vụ hoặc sửa ba rule kỹ thuật chung.
- [x] Thiết lập [quy trình duyệt ba rule kỹ thuật chung](../../AGENTS.md#quy-trình-duyệt-ba-rule-kỹ-thuật-chung): trình bày nội dung và tác động trước, chỉ sửa sau yêu cầu triển khai ở lượt tiếp theo. Lần này chỉ cập nhật quy trình trong `AGENTS.md` và liên kết theo dõi tại đây; không sửa ba rule hoặc mã ứng dụng/DB.
- [x] Bổ sung chuẩn Frontend toàn dự án: ẩn ID/metadata và giải thích kỹ thuật không giúp người dùng thao tác; ưu tiên tên/ngữ cảnh, chỉ hiện mã nghiệp vụ khi có giá trị sử dụng. Đây là cập nhật rule; chưa đồng nghĩa đã rà soát, sửa toàn bộ giao diện hiện có.
- [x] Rà soát cả ba rule chung: Frontend giữ chuẩn giao diện và nguyên tắc trực quan toàn dự án; Backend giữ chuẩn server và kiểm tra đúng quyền từng hành động; Database giữ chuẩn thiết kế ổn định. Nghiệp vụ tách sang rule HR, phân quyền, workflow và tài khoản/profile/dashboard, đã đăng ký tại `AGENTS.md` và liên kết từ plan. Cả ba file giữ dưới giới hạn 12.000 ký tự. Đã kiểm tra 113 liên kết/anchor và `git diff --check`; bản trước chỉnh sửa lưu cục bộ trong `outputs/rule-cleanup/`. Lần rà soát này chỉ sửa tài liệu, không đổi mã ứng dụng hoặc DB.
