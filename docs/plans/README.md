# Kế hoạch SDG ERP — đọc nhanh

Cập nhật: **12/11/2026**. Ưu tiên: **phân quyền → phân công thực tế → workflow thử nghiệm**. Các chức năng hiện tại vẫn là bản thử nghiệm, chưa đồng nghĩa nghiệm thu vận hành.

Khi tạo/cập nhật plan, đọc [Quy chuẩn lập và cập nhật plan](#quy-chuẩn-lập-và-cập-nhật-plan) bên dưới.

Giao diện nhân sự, tài khoản, phòng ban, profile, workflow, nhật ký và 3D đã có bản thử nghiệm. Kết quả kiểm thử trước đây nằm tại từng plan; không coi việc đọc code/DB trong lần rà soát này là chạy lại kiểm thử chức năng.

| Mảng | Hiện tại | Việc tiếp theo |
| --- | --- | --- |
| [Nhân sự/phòng ban](HR-CHECKLIST.md) | Đã có CRUD, tài khoản riêng, head kiêm nhiệm, tự khóa khi nghỉ việc; danh bạ theo phòng, hồ sơ bên phải, bảng phân trang và gán vị trí làm việc | Chọn head thực tế, chốt phạm vi xem dữ liệu |
| [Báo cáo công việc tuần](WEEKLY-REPORT-CHECKLIST.md) | Đã lập plan 11/11, chưa triển khai: bảng giống Excel, sao chép kỳ cũ giữ hạn năm, nội dung JSONB, lịch sử và bản chốt | Xác nhận kỳ/quyền/mẫu in; sau yêu cầu triển khai mới thử grid/export và migration |
| [Vai trò/phân quyền](ROLE-MANAGEMENT-CHECKLIST.md) | Đã có `/roles`, ma trận, gán/gỡ; seed có 3 vai trò mẫu, vận hành được thêm role tùy chỉnh | Rà người dùng/quyền thực tế; sửa mô tả HR còn gộp quyền vào 3D |
| [Workflow](WORKFLOW-CHECKLIST.md) | Đã có `/workflows`, 5 bảng, mẫu có phiên bản và xử lý tuần tự; đã thiết kế kéo thả, biểu mẫu, giao việc và thông báo | Cấu hình pilot thực tế; sau đó làm bản mẫu kỹ thuật vùng kéo thả và migration an toàn |
| [Tài khoản mặc định/Profile/Dashboard](PROFILE-DASHBOARD-CHECKLIST.md) | Đã có DEFAULT/tên tự sinh, profile và dashboard cá nhân; đã thiết kế ưu tiên việc đến lượt | Dùng thử thực tế; bổ sung thông báo trong ứng dụng cùng workflow mở rộng |
| [Vị trí & không gian](LOCATION-MANAGEMENT-CHECKLIST.md) | Đã có cây `vi_tri`, quyền LOCATIONS, gán/chuyển/bỏ gán người hai chiều và xóa có xác nhận tự bỏ gán | Dùng thử nghiệp vụ; đã bổ sung chặn xóa/ngừng dùng vị trí còn tài sản |
| [Tài sản](ASSET-MANAGEMENT-CHECKLIST.md) | Đã có `/assets`: loại, tìm/lọc, hồ sơ, chọn người/vị trí, lịch sử; admin có ASSETS MANAGE, người dùng đã tạo PC01. Gán/chuyển/bỏ gán từ 3D HCNS đã kiểm chứng | Chọn người phụ trách và tiếp tục bổ sung thiết bị đã xác minh để dùng thử |
| [3D tòa nhà & HCNS](OFFICE-3D-CHECKLIST.md) | Mặt bằng 3 tầng theo PDF, tên 6 phòng tầng 2 và nội thất HCNS theo ảnh hiện trạng; cùng Canvas/10 vị trí. Gán người theo HR, gán tài sản thật theo ASSETS; 7 tích hợp/4 E2E và 20 unit đạt cho đợt tài sản | Xác nhận phòng còn lại ở tầng 1/3 và chỗ đặt Lễ tân; nhận bản phác dựng nội thất cố định từng phòng. Không làm kéo thả/thêm bàn |
| [Số hóa/báo cáo](DIGITAL-TRANSFORMATION-CHECKLIST.md) | Đã khảo sát và chuẩn bị báo cáo | Chốt KPI, đầu mối, lịch và tiêu chí nghiệm thu |

## Đối chiếu plan với code và DB

**Mốc đọc: 11/11/2026, 15:30 giờ Việt Nam.** Đọc route, component, Server Actions, quyền, Prisma schema và catalog PostgreSQL local `sdg_erp` bằng transaction **READ ONLY**. Có **15 bảng nghiệp vụ**, 17/17 migration đã áp dụng và khớp checksum; Prisma schema diff không có khác biệt. Đã đọc thêm FK/index và danh mục 12 trigger; diff Prisma không bao quát toàn bộ SQL tùy chỉnh. Đây là kiểm tra mức triển khai, không phải nghiệm thu hay kiểm toán toàn bộ hành vi.

| Plan | Mã nguồn đại diện | Dữ liệu thực tế | Độ tương ứng |
| --- | --- | --- | --- |
| [HR](HR-CHECKLIST.md) | `/employees`, `/departments`; actions [employee](../../src/actions/employee.ts), [department](../../src/actions/department.ts) | `nhan_su`, `phong_ban`; FK head và vị trí đã có | Khớp chức năng hồ sơ/cơ cấu/gán vị trí; phạm vi tài khoản trong plan còn giao với plan cá nhân và phân quyền |
| [Vai trò](ROLE-MANAGEMENT-CHECKLIST.md) | `/roles`; [role.ts](../../src/actions/role.ts), [catalog](../../src/lib/role-catalog.ts) | `vai_tro`, `quyen`, `vai_tro_quyen`, `tai_khoan_vai_tro` | Khớp RBAC; số role mẫu không phải số role vận hành. Mô tả HR trong catalog còn nhắc bản đồ 3D dù guard dùng LOCATIONS |
| [Workflow](WORKFLOW-CHECKLIST.md) | `/workflows`, `/workflows/[id]`; [workflow.ts](../../src/actions/workflow.ts), [phạm vi đọc](../../src/lib/workflow-access.ts) | 5 bảng mẫu/bước/hồ sơ/lịch sử đã có, đều rỗng | Khớp động cơ tuần tự; đã có grant WORKFLOW nhưng chưa có mẫu/hồ sơ pilot. Kéo thả, biểu mẫu động, thông báo chưa có code/schema |
| [Không gian cá nhân](PROFILE-DASHBOARD-CHECKLIST.md) | `/`, `/profile`, `/media/avatar/[file]`; [profile.ts](../../src/actions/profile.ts), [cấp tên](../../src/lib/account-defaults.ts) | Dùng lại `tai_khoan`, `nhan_su`, RBAC, workflow; cờ buộc đổi mật khẩu và trigger DEFAULT đã có | Khớp profile/dashboard/đổi mật khẩu/ảnh; không cần bảng profile/dashboard riêng. Thông báo còn kế hoạch |
| [Vị trí](LOCATION-MANAGEMENT-CHECKLIST.md) | `/locations`; [location.ts](../../src/actions/location.ts), [LocationPeople](../../src/components/locations/LocationPeople.tsx) | `vi_tri`, FK từ `nhan_su`, audit dùng chung | Khớp cây, mã tự cấp, gán hai chiều, preview xóa và gỡ liên kết nguyên tử; tài sản chưa tích hợp |
| [3D](OFFICE-3D-CHECKLIST.md) | `/office-3d`; [office-building.ts](../../src/actions/office-building.ts), [BuildingCanvas](../../src/components/office-3d/building/BuildingCanvas.tsx) | Đọc `vi_tri` và `nhan_su`; ánh xạ riêng trong `var/office-3d/`, không có bảng 3D | Khớp nền viewer/HCNS và quyền. Bố cục PDF/bản phác đang được chỉnh ở công việc khác trong workspace sau mốc đọc; theo dõi tại plan 3D, không nghiệm thu trong lượt này |
| [Tài sản](ASSET-MANAGEMENT-CHECKLIST.md) | Chưa có route/action/component nghiệp vụ tài sản | Không có `loai_tai_san`, `tai_san` hoặc quyền ASSETS | Đúng trạng thái thiết kế. Đã sửa mô tả cũ về nền vị trí/3D trong plan; migration tài sản cũ trong Git không chứng minh tính năng hiện có |
| [Báo cáo tuần](WEEKLY-REPORT-CHECKLIST.md) | Chưa có route/action/component báo cáo tuần | Không có `bao_cao_tuan` hoặc quyền WEEKLY_REPORT | Khớp trạng thái chưa triển khai; JSONB/snapshot/xuất file mới là thiết kế. Không đồng nhất với menu `/tasks` |
| [Chuyển đổi số](DIGITAL-TRANSFORMATION-CHECKLIST.md) | Không có route/action tương ứng riêng | Không sở hữu bảng | Là lộ trình chung nhiều phân hệ, không tương ứng một tính năng phần mềm |

**Sau mốc đọc:** nền tài sản đã triển khai theo [plan tài sản](ASSET-MANAGEMENT-CHECKLIST.md); DB hiện có 17 bảng và thêm 2 quyền ASSETS. Ngày 12/11 đã hoàn thành giao diện `/assets`, cấp ASSETS MANAGE cho admin theo yêu cầu; người dùng đã tạo PC01, gán tài sản từ 3D HCNS đã kiểm chứng. Bảng đối chiếu và số liệu dưới đây giữ nguyên ý nghĩa tại mốc đọc trước triển khai.

Số liệu tại mốc đọc: 72 nhân sự, 18 phòng ban, 3 tài khoản, 4 role (`ADMIN`, `DEFAULT`, `HR_MANAGER`, `ASSETS`), 20 quyền và 17 vị trí; 3 người đã gán vị trí, 2 phòng đã có head. Role mang mã `ASSETS` là dữ liệu vai trò tùy chỉnh, **không chứng minh đã có quyền hoặc tính năng tài sản**; không sửa/xóa role này. Những số liệu khác trong các biên bản cũ chỉ là kết quả tại thời điểm đó. Bằng chứng tổng hợp không chứa hồ sơ người/credential lưu cục bộ tại `outputs/plan-code-db-review/`.

**Ranh giới cần chuẩn hóa để mỗi plan ứng với một tính năng:**

| Phạm vi | Hiện tại | Hướng sắp xếp tiếp theo |
| --- | --- | --- |
| Tài khoản đăng nhập | `/accounts`, [account.ts](../../src/actions/account.ts) đã có; nghiệp vụ nằm rải ở HR, RBAC và cá nhân | Plan tài khoản riêng sở hữu cấp/khóa/mở/reset mật khẩu; HR chỉ dẫn liên kết cho luồng cấp kèm hồ sơ |
| Nhật ký hoạt động | `/audit-logs`, [audit.ts](../../src/lib/audit.ts), `nhat_ky_hoat_dong` đã có; chưa có plan riêng | Plan nhật ký riêng sở hữu tra cứu/quyền đọc; từng phân hệ vẫn sở hữu nội dung audit của mutation mình |
| Chuyển đổi số | Một checklist điều phối nhiều phân hệ trong `docs/plans/` | Chuyển về nhóm chiến lược/lộ trình khi chuẩn hóa; liên kết tới các plan tính năng |
| Công việc/cài đặt | `/tasks`, `/tasks/department`, `/settings` chỉ là trang chờ qua route dự phòng; có mã quyền lịch sử nhưng không có động cơ/bảng nghiệp vụ tương ứng | Không đánh dấu đã triển khai và không xem là báo cáo tuần; lập plan riêng khi có phạm vi cụ thể |

Các đề xuất tách/chuyển tài liệu trên chưa được thực hiện trong lượt đối chiếu. Phần UI mô tả HR trong catalog cũng chưa sửa; đã ghi việc còn lại tại plan phân quyền. Bảng này quản lý đối chiếu liên phân hệ, không thay đặc tả chi tiết ở từng plan.

## Quy chuẩn lập và cập nhật plan

Đây là nguồn chính về cấu trúc và cách viết plan của dự án; `AGENTS.md` chỉ dẫn tới mục này. Áp dụng cho plan mới; khi cập nhật plan cũ, chuẩn hóa phần thuộc phạm vi yêu cầu, không tự viết lại toàn bộ các phân hệ khác. Quy chuẩn không thay đổi phạm vi đã duyệt hoặc các điều kiện duyệt tại [AGENTS.md](../../AGENTS.md).

### 1. Hai mức đọc trong cùng một plan

Mỗi plan tính năng có một phạm vi sở hữu rõ. Chức năng dùng chung được dẫn tới plan sở hữu, không duy trì đặc tả song song. Lộ trình điều phối nhiều tính năng phải được nhận diện riêng, không tính là một tính năng đã có code/DB.

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

## Ô chọn dữ liệu có tìm kiếm — 12/11/2026

Theo yêu cầu cải thiện các danh mục dài: ô chọn trong form mở bảng tìm kiếm gọn, gõ có/không dấu, xem tên và ngữ cảnh sẵn có, chọn bằng chuột hoặc bàn phím. Nội dung gõ chỉ để lọc; lưu ID của lựa chọn hợp lệ, không tự tạo bản ghi mới. Các enum ngắn giữ select; hộp tìm/gán người tại vị trí/3D đã có tìm kiếm được giữ.

- [x] Rà soát danh mục tham chiếu tại tài sản, nhân sự/phòng ban, tài khoản, vị trí và workflow; không cần đổi backend, quyền, DB hoặc ba rule kỹ thuật chung.
- [x] Xây `SearchableSelect` dùng Radix/UI hiện có, tích hợp form và bộ lọc danh mục; giữ giá trị đang chọn, trường tùy chọn và lựa chọn ngừng dùng theo nghiệp vụ.
- [x] 3 E2E mới đạt trên DB khôi phục riêng: tìm không dấu/nhiều từ, Enter/Esc và focus, không có kết quả, không tự gửi form hoặc lưu chữ nhập tự do, giá trị null/disabled, người trùng tên, lưu đúng ID và mobile/sáng/tối. Ảnh đã kiểm tra tại `outputs/searchable-select/`.
- [x] 35 E2E hồi quy đạt (tài sản, phòng ban, HR/tài khoản, vị trí, trường bắt buộc và workflow), cộng 3 ca mới là 38 ca. Ba ca chuyển trang hết thời gian chờ 5 giây khi Next dev biên dịch; chạy lại trên DB riêng với ngưỡng chờ phù hợp môi trường dev đạt. Không đổi logic đăng nhập hoặc mutation để xử lý timeout.
- [x] TypeScript/lint và build production Webpack trên app riêng đạt; build chạy lại sau nhắc bảo mật Next.js hiện có, không thay dependency. Admin trên cổng 4000 tìm không dấu và đóng danh sách bằng Esc đúng, không có lỗi JavaScript, không gửi form. Đã dọn DB thử; đối chiếu 17 bảng local: 14 bảng không đổi, giữ nguyên các cập nhật loại/tài sản/audit diễn ra đồng thời ngoài lượt đổi ô chọn. 136 liên kết/anchor trong 7 tài liệu và `git diff --check` đạt; backup, log, ảnh ở `outputs/searchable-select/`.

## Rà soát tài liệu

- [x] Đối chiếu toàn bộ plan với code và DB local ngày 11/11: ghi phạm vi sở hữu, phần chưa triển khai và các chỗ chưa tương ứng một tính năng tại bảng trên; sửa những mô tả hiện trạng lỗi thời đã xác minh. Không chạy lại bộ E2E toàn hệ thống hoặc thay DB/quyền trong lần đọc.
- [x] Gỡ công cụ hồ sơ thanh toán AI theo yêu cầu: xóa trang tạm hoãn, test và plan riêng; bỏ định tuyến tài liệu, tham chiếu và hướng khôi phục. Route dự phòng chỉ giữ các trang chờ đã khai báo, URL không biết hiển thị không tìm thấy. Không có bảng/dependency riêng cần xóa; giữ nguồn nghiệp vụ và lịch sử Git.
- [x] Kiểm chứng phần gỡ tính năng: `next typegen`, TypeScript và lint route sửa đạt; đã dọn đúng file kiểu tự sinh còn trỏ tới trang bị xóa. Chrome đạt 8 kiểm tra: 3 URL không tồn tại, 4 trang chờ vẫn hoạt động và dashboard không có liên kết AI. Trang không tìm thấy được render; response dev streaming vẫn 200, không ghi nhận HTTP 404. 183 liên kết/anchor trong 12 file Markdown thay đổi hợp lệ; `git diff --check` đạt. Bằng chứng ở `outputs/plan-code-db-review/`; kiểm tra trình duyệt chỉ đọc, không tạo fixture hoặc sửa DB.
- [x] Thiết lập quy chuẩn lập/cập nhật plan tại README, dẫn chiếu bắt buộc từ `AGENTS.md`; áp dụng bố cục A/B, sơ đồ luồng và mô hình DB cho [báo cáo tuần](WEEKLY-REPORT-CHECKLIST.md). Chỉ sắp xếp tài liệu, không chốt thêm nghiệp vụ hoặc sửa ba rule kỹ thuật chung.
- [x] Thiết lập [quy trình duyệt ba rule kỹ thuật chung](../../AGENTS.md#quy-trình-duyệt-ba-rule-kỹ-thuật-chung): trình bày nội dung và tác động trước, chỉ sửa sau yêu cầu triển khai ở lượt tiếp theo. Lần này chỉ cập nhật quy trình trong `AGENTS.md` và liên kết theo dõi tại đây; không sửa ba rule hoặc mã ứng dụng/DB.
- [x] Bổ sung chuẩn Frontend toàn dự án: ẩn ID/metadata và giải thích kỹ thuật không giúp người dùng thao tác; ưu tiên tên/ngữ cảnh, chỉ hiện mã nghiệp vụ khi có giá trị sử dụng. Đây là cập nhật rule; chưa đồng nghĩa đã rà soát, sửa toàn bộ giao diện hiện có.
- [x] Rà soát cả ba rule chung: Frontend giữ chuẩn giao diện và nguyên tắc trực quan toàn dự án; Backend giữ chuẩn server và kiểm tra đúng quyền từng hành động; Database giữ chuẩn thiết kế ổn định. Nghiệp vụ tách sang rule HR, phân quyền, workflow và tài khoản/profile/dashboard, đã đăng ký tại `AGENTS.md` và liên kết từ plan. Cả ba file giữ dưới giới hạn 12.000 ký tự. Đã kiểm tra 113 liên kết/anchor và `git diff --check`; bản trước chỉnh sửa lưu cục bộ trong `outputs/rule-cleanup/`. Lần rà soát này chỉ sửa tài liệu, không đổi mã ứng dụng hoặc DB.
