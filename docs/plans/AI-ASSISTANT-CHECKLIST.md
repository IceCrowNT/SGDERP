# Trợ lý AI trên dashboard và cá nhân hóa

Cập nhật: **16/11/2026**. Trạng thái: **đã có bản thử và cài đặt key/model riêng cho tài khoản quản trị; chưa nghiệm thu API thật; thiết kế đầy đủ bên dưới chưa triển khai**. Phạm vi bản thử và kết quả tại [Bản thử cho tài khoản quản trị](#bản-thử-cho-tài-khoản-quản-trị--16112026).

Rule phân hệ: [AI-ASSISTANT-RULES](../../.agents/rules/AI-ASSISTANT-RULES.md). Plan này sở hữu thiết kế AI; [plan cá nhân](PROFILE-DASHBOARD-CHECKLIST.md), [plan tài sản](ASSET-MANAGEMENT-CHECKLIST.md) và [plan phân quyền](ROLE-MANAGEMENT-CHECKLIST.md) tiếp tục sở hữu nghiệp vụ nền.

Mục lục:

- [A. Tổng quan để duyệt](#a-tổng-quan-để-duyệt)
- [B. Chi tiết triển khai](#b-chi-tiết-triển-khai)
- [Thiết kế DB cần giữ](#thiết-kế-db-cần-giữ)
- [Quản trị AI và hạn mức](#quản-trị-ai-và-hạn-mức)
- [Bối cảnh trong một cuộc chat](#bối-cảnh-trong-một-cuộc-chat)
- [Checklist triển khai](#checklist-triển-khai)
- [Kiểm chứng hiện tại](#kiểm-chứng-hiện-tại)

## A. Tổng quan để duyệt

### Mục tiêu và yêu cầu đã ghi nhận

Ngày 16/11, người phụ trách yêu cầu gắn API vào tài khoản đầy đủ quyền hiện tại để hỗ trợ thêm/sửa hồ sơ và đã chọn phạm vi **tài sản và vị trí**. Đợt này triển khai khung chat cho một tài khoản được cấu hình rõ, AI tra cứu và điền bản nháp; người dùng kiểm tra và lưu bằng form nghiệp vụ ngay trên dashboard. Lịch sử chat lâu dài, cá nhân hóa và quản trị hạn mức đầy đủ tiếp tục là các bước riêng trong thiết kế phía dưới.

Người dùng có API OpenAI và muốn khung chat ngay trên dashboard. Kịch bản đầu: người phụ trách IT hỏi **“Tìm thông tin máy in ở phòng HCNS”**, nhận kết quả theo dữ liệu ERP và có thể mở hồ sơ, xem vị trí hoặc hỏi tiếp. Profile có ô bối cảnh/cách trả lời để áp dụng mỗi lượt; lịch sử gắn với người sử dụng.

Đề xuất diễn giải “người sử dụng” thành **tài khoản đăng nhập**: ERP cho phép nhiều tài khoản trên một nhân sự, quyền độc lập. Cài đặt và lịch sử không tự gộp giữa tài khoản cá nhân/quản trị hoặc người cùng phòng.

Nhu cầu bổ sung: người quản lý cần quản lý API key/kết nối, hạn mức từng tài khoản, token/chi phí và phần còn lại. Phạm vi quản trị nội bộ được đưa vào đề xuất pilot; đối soát số liệu OpenAI phụ thuộc credential/quyền phù hợp, không mặc định có số dư trả trước qua API.

Điều chỉnh theo người phụ trách: **hạn mức từng tài khoản chỉ lưu bằng một cột trên `tai_khoan`, không tạo bảng hạn mức riêng**. Mức dùng và phần còn lại lấy/tính từ log API; các giá trị hạn mức cụ thể vẫn chưa cấp cho dữ liệu thật.

### Phạm vi bản đầu

| Chức năng | Người dùng thao tác | Kết quả dự kiến |
| --- | --- | --- |
| Cá nhân hóa | Sửa ô “Bối cảnh và cách AI trả lời” tại `/profile` | Áp dụng từ lượt hỏi kế tiếp; để trống dùng mặc định |
| Chat trên dashboard `/` | Tạo cuộc chat, gửi câu hỏi, mở lại lịch sử | Nội dung lưu theo tài khoản; lỗi giữ câu hỏi |
| Tra cứu tài sản | Hỏi bằng tiếng Việt, chọn kết quả, hỏi tiếp | Câu trả lời ngắn, thẻ/danh sách và liên kết hồ sơ thật |
| Liên kết không gian | Chọn “Xem trên 3D” khi được hỗ trợ | Mở vị trí đã ánh xạ và được phép xem |
| Lưu trữ cuộc chat | Đưa cuộc chat khỏi danh sách đang mở, mở lại | Giữ nội dung; không đồng nghĩa xóa dữ liệu |
| Theo dõi API | Hệ thống ghi nhận mỗi lần gọi | Kiểm soát mức sử dụng, lỗi và chi phí ước tính |
| Quản trị kết nối | Người được cấp quyền thêm/thay khóa, chọn model, tạm dừng | Khóa ở kho bí mật, UI chỉ hiện thông tin che bớt; không tự chuyển nguồn chi |
| Hạn mức tài khoản | Người quản lý sửa một mức ngân sách tháng trên tài khoản; user xem phần của mình | Mức đã dùng/dự phòng lấy từ log, còn khả dụng được tính; model/tốc độ dùng cấu hình kết nối chung |
| Đối soát nhà cung cấp | Xem Usage/Costs khi có credential được cấp | Tách số liệu OpenAI khỏi ERP, có thời điểm cập nhật; không giả số dư |

Bản đầu chỉ tra cứu nghiệp vụ. Hỏi đáp tài liệu, tải tệp, giọng nói, ghi nhớ tự động xuyên cuộc chat, sửa/duyệt tài sản từ chat, AI truy cập 1Office và kết nối API riêng từng phòng chưa thuộc phạm vi. Có thể mở màn hình nghiệp vụ sẵn có; thao tác tại màn hình đó theo quyền hiện hành.

### Luồng sử dụng

```mermaid
flowchart LR
    P["Cá nhân hóa trong profile"] --> C["ERP kiểm tra phiên và dựng ngữ cảnh"]
    H["Lịch sử cuộc chat đang mở"] --> C
    Q["Câu hỏi trên dashboard"] --> C
    C --> AI["OpenAI"]
    AI -->|"Yêu cầu công cụ tra cứu"| T["ERP kiểm tra quyền và đọc Prisma"]
    T -->|"Dữ liệu tối thiểu được phép"| AI
    AI --> R["Lưu câu trả lời, kết quả và mức sử dụng"]
    R --> UI["Hiển thị và cho hỏi tiếp"]
```

ERP chủ động đọc cài đặt mỗi lượt. Lịch sử giúp xác định “chiếc thứ hai”; khi hỏi tình trạng/vị trí hiện tại phải tra lại hồ sơ. Mở cuộc chat mới áp dụng cá nhân hóa nhưng không tự lấy nội dung các cuộc chat khác. Lưu chat không phải huấn luyện mô hình. [Bối cảnh trong một cuộc chat](#bối-cảnh-trong-một-cuộc-chat) giữ bộ lọc, danh sách đã hiển thị, đối tượng đang nói tới và cách xử lý đổi chủ đề; dùng JSON của tin nhắn, không thêm bảng.

### Mô hình DB nhìn nhanh

Bản đầy đủ dưới đây còn kế hoạch; DB đang chạy mới có một bảng kết nối pilot, theo [thiết kế kết nối](../THIET-KE-QUAN-TRI-AI.md#kết-nối-pilot--16112026).

**Thiết kế gồm hai cột mới trong `tai_khoan` và bốn bảng mới**: cột cá nhân hóa, cột hạn mức; ba bảng hội thoại/tin nhắn/log và `ket_noi_ai` cho quản trị. Dùng lại tài sản, vị trí, công ty, tài khoản và RBAC; cột hạn mức và bảng kết nối tại [thiết kế quản trị AI](../THIET-KE-QUAN-TRI-AI.md#3-thiết-kế-db-cần-giữ).

```mermaid
erDiagram
    cong_ty ||--o{ hoi_thoai_ai : "cùng công ty"
    tai_khoan ||--o{ hoi_thoai_ai : "sở hữu"
    hoi_thoai_ai ||--o{ tin_nhan_ai : "chứa"
    tai_khoan ||--o{ nhat_ky_goi_ai : "sử dụng"
    tin_nhan_ai o|--o{ nhat_ky_goi_ai : "tham chiếu tùy chọn"
    ket_noi_ai ||--o{ nhat_ky_goi_ai : "nguồn thực tế"

    cong_ty {
        int id PK "Đã có"
    }
    tai_khoan {
        int id PK "Đã có"
        text huong_dan_ai_ca_nhan "Cột mới, tùy chọn"
        decimal han_muc_ai_thang "Cột mới, mặc định 0"
    }
    hoi_thoai_ai {
        int id PK "Bảng mới"
        int company_id FK
        int account_id FK
        string tieu_de
        string trang_thai
    }
    tin_nhan_ai {
        int id PK "Bảng mới"
        int company_id FK
        int hoi_thoai_id FK
        string vai_tro
        text noi_dung
        jsonb du_lieu_kem_theo "Cấu trúc trong cột, không là bảng riêng"
    }
    nhat_ky_goi_ai {
        int id PK "Bảng mới"
        int company_id FK
        int account_id FK
        int tin_nhan_id FK "Có thể trống"
        string model
        string trang_thai
    }
    ket_noi_ai {
        int id PK "Bảng mới"
        int company_id FK
        string ten_ket_noi
        string tham_chieu_bi_mat "Không lưu key rõ"
        boolean la_mac_dinh "Tối đa một kết nối mặc định mỗi công ty"
    }
```

`||` = một, `o|` = không hoặc một, `o{` = không hoặc nhiều. Sơ đồ lược bớt trường; tất cả liên kết thuộc công ty phải nhất quán. ID hồ sơ nguồn bên trong JSON là tham chiếu tra cứu, **không phải FK**; không vẽ thành quan hệ SQL. Thiết kế đầy đủ tại [B](#thiết-kế-db-cần-giữ).

### Quyết định và điểm còn mở

| Nội dung | Hướng hiện tại | Trạng thái |
| --- | --- | --- |
| Chat tại dashboard, cá nhân hóa trong profile, lịch sử riêng | Nhu cầu người dùng đã nêu | Có chat pilot; cá nhân hóa và lịch sử DB chưa triển khai |
| Chủ sở hữu là tài khoản | Dùng `account_id`, không gộp theo `employee_id` | Đề xuất theo mô hình ERP |
| Lưu trữ | Hai cột tài khoản + bốn bảng; hạn mức nằm trên tài khoản, không có bảng hạn mức | Cách lưu hạn mức đã được người phụ trách yêu cầu; chưa triển khai |
| Cá nhân hóa | Ô text tùy chọn, tối đa 2.000 ký tự | Đề xuất |
| Kết nối và chi phí | Quản trị kết nối/project, hạn mức theo user và kết nối; có thể khởi đầu bằng một nguồn chi | Cần chốt nguồn thanh toán, kho bí mật, model, mức cấp và người quản trị; không tự triển khai kết nối theo phòng |
| Cấu hình dùng chung | Các tài khoản dùng kết nối mặc định của công ty, model/tốc độ theo kết nối; riêng tài khoản có một mức ngân sách | Phương án tinh gọn cho bản đầu; chưa gán kết nối/model/giới hạn kỹ thuật riêng từng user |
| Vị trí quản trị cấu hình | Đề xuất khu Cài đặt chung `/settings`, có mục Quản trị AI `/settings/ai`, phân quyền từng nhóm; cấp quyền tập trung tại `/roles` | Đang xem xét theo yêu cầu 16/11; [phương án chi tiết](../THIET-KE-QUAN-TRI-AI.md#đề-xuất-đưa-ai-vào-khu-cài-đặt-hệ-thống--16112026), chưa chuyển UI/quyền |
| Đối soát OpenAI | Usage/Costs cần credential quản trị phù hợp; số dư prepaid chưa xác minh endpoint | Chỉ đọc khi được cấp phạm vi; không hứa có số dư/quota thời gian thực |
| Nhóm dùng thử | Một nhóm IT/HCNS được cấp quyền rõ | Chưa có danh sách tài khoản/người nghiệm thu |
| Dữ liệu gửi ra ngoài | Chỉ dữ liệu đã được phép và ẩn danh theo quy định nội bộ | Cần chốt trường dữ liệu, cách ẩn danh và mẫu thử |
| Thời hạn lưu/xóa | Phân biệt lưu trữ, xóa nội dung và giữ metadata chi phí | Cần chốt thời hạn cho chat, log, backup và xử lý yêu cầu xóa |
| Giao diện | Chat trong dashboard, lịch sử thu gọn; giữ vùng việc cá nhân | Chưa có bản giao diện được nghiệm thu |

Các lựa chọn còn mở được giải quyết trong bước thiết kế/pilot tương ứng; không tự dùng dữ liệu thật hoặc gọi API trả phí để mặc định chốt chúng. [Bối cảnh AI theo phòng](../strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md#5-bối-cảnh-sử-dụng-ai-theo-phòng-ban) là nguồn về giới hạn dữ liệu và định hướng kết nối trước đây.

### Mốc thực hiện và nghiệm thu

| Mốc | Trạng thái | Điều kiện hoàn thành |
| --- | --- | --- |
| Ghi yêu cầu, thiết kế và định tuyến tài liệu | Đã lập | A/B, DB, rule và liên kết thống nhất |
| Chốt lựa chọn phục vụ pilot | Chưa xong | Nhóm thử, dữ liệu, kết nối/hạn mức và lưu/xóa rõ ràng |
| CSDL, profile và lịch sử | Chưa triển khai | Lưu đúng tài khoản; reload không mất nội dung đã lưu |
| Công cụ tài sản và giao diện kết quả | Có công cụ và form bản nháp trong pilot; phần đầy đủ còn kế hoạch | Tìm đúng hồ sơ/vị trí, không suy dữ liệu thiếu hoặc vượt quyền |
| Quản trị nội bộ | Có key/model trong pilot; hạn mức/thống kê và quyền riêng chưa triển khai | Quản lý khóa an toàn, cấp/chặn hạn mức, thống kê và quyền riêng |
| Đối soát nhà cung cấp | Đề xuất bước sau | Có credential/phạm vi đọc, số liệu có nguồn/thời điểm và không lẫn số dư |
| Kiểm thử và dùng thử | Chat 10 tích hợp/3 E2E; quản lý kết nối 8 tích hợp/3 E2E với API mô phỏng đạt; chưa thử API thật | Đạt [ma trận kiểm chứng](#kiểm-chứng-và-pilot) cho phạm vi đầy đủ, người phụ trách xác nhận hữu ích |

## B. Chi tiết triển khai

### Bản thử cho tài khoản quản trị — 16/11/2026

Người phụ trách đã yêu cầu triển khai quản lý API key kèm model ngay trong phần mềm. Đã bổ sung nút **Cài đặt AI** trên dashboard: thêm/thay khóa, nhập/chọn model từ danh sách nhà cung cấp, kiểm tra khóa và bật/tạm dừng. Thiết kế DB/kho bí mật hiện hành tại [kết nối pilot](../THIET-KE-QUAN-TRI-AI.md#kết-nối-pilot--16112026); đợt này thêm một bảng kết nối, chưa triển khai ba bảng chat/usage hoặc hai cột tài khoản của bản đầy đủ.

| Nội dung | Phạm vi đợt này |
| --- | --- |
| Tài khoản | Bind bằng `AI_PILOT_ACCOUNT_ID`; kiểm tra phiên và ACCOUNTS/ROLES MANAGE cùng ASSETS/LOCATIONS MANAGE tại server; không suy quyền từ tên role hoặc mở cho mọi admin |
| Kết nối | Cài đặt AI trên dashboard: lưu/thay khóa, chọn/nhập model, kiểm tra danh sách model và tạm dừng. Khóa lưu mã hóa phía server; chỉ trả hậu tố. Responses API/function calling đọc cấu hình mỗi lượt; thay đổi có hiệu lực không cần khởi động lại. Env chỉ là dự phòng khi chưa có bản ghi kết nối |
| Thêm/sửa | Công cụ AI chỉ tra cứu hoặc chuẩn bị bản nháp; form dùng lại `saveAsset`/`saveLocation`, phiên bản gốc, quyền và audit hiện có. Người dùng xem/sửa rồi bấm Lưu; chưa có công cụ xóa, sửa tài khoản/quyền hoặc SQL tự do |
| Ngữ cảnh | Nội dung cuộc chat đang mở nằm trong bộ nhớ giao diện, không localStorage; giới hạn lịch sử gửi và đọc lại hồ sơ khi chuẩn bị sửa. Reload mất cuộc trao đổi; không coi đây là lịch sử DB của bản đầy đủ |
| Dữ liệu DB | Một bảng `ket_noi_ai` giữ metadata, một kết nối/công ty. Dùng nhật ký hoạt động cho thay đổi cấu hình, kiểm tra khóa, metadata yêu cầu và usage từng lần API; không lưu prompt/nội dung hồ sơ/key trong log AI. Nhật ký nghiệp vụ do action phân hệ ghi |
| Giới hạn | Một lượt/account, tối đa 10 lượt/5 phút và 100 lượt/24 giờ, tối đa 6 lần API/lượt; giới hạn đầu vào/đầu ra và timeout. Đây là giới hạn thử nghiệm, chưa phải hạn mức tiền theo tháng đã thiết kế |
| Cấp quyền AI dài hạn | Allowlist pilot chỉ dùng trong đợt này; không sửa grant dữ liệu cũ. Khi mở nhiều người dùng, triển khai catalog AI và hạn mức theo thiết kế đầy đủ |

- [x] Đối chiếu mã, quyền, form và hướng dẫn Next.js hiện có; tài khoản `admin` có đủ quyền tài sản/vị trí/tài khoản/role. Đã kiểm tra cấu hình server mà không xuất giá trị khóa; chưa thực hiện cuộc gọi model thật trong kiểm thử.
- [x] Hoàn thiện action/công cụ, chat dashboard và bản nháp dùng form hiện có; `AI_PILOT_ACCOUNT_ID=1` chỉ mở cho tài khoản admin có đủ quyền hiện hành. Không tự thêm hoặc thay giá trị khóa/model môi trường.
- [x] 10 kiểm thử tích hợp trên DB khôi phục riêng đạt: bind/phiên/quyền/cấu hình, bản nháp không ghi tự động, lưu bằng action nghiệp vụ, giữ trường khi sửa, phiên bản cũ, vị trí con/phạm vi công ty, gửi trùng/đồng thời, thu hồi quyền giữa lượt, lỗi API và log không chứa nội dung/key; giới hạn ngữ cảnh/vòng công cụ/lượt 5 phút/24 giờ và timeout ghi chi phí chưa rõ.
- [x] 3 E2E Chrome trên app/DB riêng với API mô phỏng đạt: chỉ account được bind thấy chat, tạo/sửa tài sản/vị trí qua form, sửa tên giữ serial/giá mua, xung đột giữ bản nháp, mobile sáng/tối không tràn, reload xóa chat đúng mô tả. Đã xem ảnh; chat đặt trong cột chính dashboard để đủ chỗ đọc và soạn hồ sơ.
- [x] TypeScript, lint các file thay đổi, khoảng trắng và 171 liên kết/anchor cục bộ trong 6 tài liệu đạt. Trong kiểm chứng chat ban đầu, dấu vân tay 18 bảng vận hành không đổi; không thêm dependency hoặc sửa ba rule kỹ thuật chung. Bằng chứng chat tại `outputs/ai-pilot/`; migration kết nối được kiểm chứng riêng phía dưới.
- [x] Hoàn thiện cài đặt key/model, kho AES-256-GCM, quyền/phiên bản/audit và chat đọc cấu hình mới. Migration `20261116110000_ket_noi_ai` đã áp dụng sau backup và khôi phục thử; trên DB khôi phục, 18 bảng cũ không đổi và schema diff rỗng. DB local có 19 bảng; chưa lưu khóa/kết nối thật. Các cập nhật vị trí/nhân sự/audit diễn ra đồng thời tại local được giữ nguyên.
- [x] 8 kiểm thử tích hợp quản lý key/model đạt trên DB riêng và API mô phỏng: quyền, lưu mã hóa, đổi model giữ khóa, thay khóa, xung đột/đồng thời, tạm dừng không fallback, đổi cấu hình giữa lượt, tải model/lỗi API, kho bí mật lỗi, audit rollback và giới hạn kiểm tra. TypeScript/lint đạt.
- [x] 3 E2E Chrome quản lý kết nối đạt: tài khoản đủ quyền, thiếu key, tải/chọn model, lưu và dùng ngay, đổi model giữ khóa, thay khóa, tạm dừng/bật lại, kiểm tra lỗi giữ cấu hình, mobile sáng/tối. Đã xem ảnh. 10 kiểm thử tích hợp chat hồi quy đạt; TypeScript/lint, schema diff, 182 liên kết/anchor trong 7 tài liệu và `git diff --check` đạt. Rule/kiến trúc/từ điển DB đã đồng bộ; bằng chứng tại `outputs/ai-settings/`.
- [x] Đã khởi động lại dev để nạp Prisma Client; mở Cài đặt AI bằng tài khoản admin tại local đạt, không lỗi JavaScript, ô khóa để trống. Môi trường hiện có key/model và được giữ nguyên; chưa lưu kết nối vào DB hoặc gọi nhà cung cấp thật. Đã dừng app thử và dọn đúng DB tạm; backup/log/ảnh giữ cục bộ.
- [ ] Người phụ trách kiểm tra/chọn model và lưu qua Cài đặt AI; kiểm chứng kết nối thật với cấu hình được chọn. Không đánh dấu tích hợp thật thành công khi chỉ có kiểm thử mô phỏng.
- [x] Đối chiếu `/settings` hiện là trang chờ, menu dùng SYSTEM nhưng catalog ma trận chưa có nhóm này; cấu hình AI còn dùng guard pilot. Ghi [đề xuất khu cài đặt hệ thống](../THIET-KE-QUAN-TRI-AI.md#đề-xuất-đưa-ai-vào-khu-cài-đặt-hệ-thống--16112026): mục AI riêng, các nhóm cấu hình và quyền theo chức năng. 186 liên kết/anchor và `git diff --check` đạt. Lượt phân tích này chỉ cập nhật tài liệu; chưa đổi mã, DB hoặc grant, không chạy lại kiểm thử ứng dụng.
- [ ] Khi có yêu cầu triển khai: thiết kế plan/rule cài đặt chung, chuyển key/model sang mục AI, tích hợp quyền quản trị riêng vào `/roles`, giữ cấu hình/khóa và chat hiện có; kiểm tra URL/action trực tiếp, cấp/thu hồi quyền, phạm vi công ty và mobile.

### Căn cứ và ranh giới sở hữu

- Nhu cầu trong hội thoại ngày 13/11/2026: dashboard chat; ví dụ máy in HCNS; lưu lịch sử; cá nhân hóa trong profile; yêu cầu đưa thành plan.
- Đã đọc Prisma schema và luồng profile: `tai_khoan` chưa có cột cá nhân hóa AI, đã có `ket_noi_ai` của pilot; ba bảng chat/usage và hai cột tài khoản còn kế hoạch.
- Profile hiện sửa liên hệ/ảnh và mật khẩu. Phần AI sẽ là nhóm chức năng bổ sung theo plan này; thay đổi rule profile khi triển khai phải giữ rõ phạm vi, không dùng ghi chú HR làm bối cảnh AI mặc định.
- Danh mục thiết bị, quan hệ phòng quản lý/vị trí, tình trạng và lịch sử cập nhật theo [rule tài sản](../../.agents/rules/ASSET-MANAGEMENT-RULES.md); định danh không gian theo [rule vị trí](../../.agents/rules/LOCATION-MANAGEMENT-RULES.md); liên kết viewer theo [rule 3D](../../.agents/rules/OFFICE-3D-RULES.md).
- Không sửa ba rule kỹ thuật chung để chứa thiết kế tính năng. Mutation nội bộ tiếp tục theo [rule Backend](../../.agents/rules/BACKEND-RULES.md). Bản đầu có thể trả kết quả hoàn chỉnh qua Server Action; streaming chỉ chọn sau kiểm chứng cách tích hợp HTTP phù hợp, không mặc định cần đổi chuẩn backend.

### Luồng giao diện và cá nhân hóa

| Vùng | Hành vi dự kiến |
| --- | --- |
| Profile | Ô text tùy chọn có mô tả/ví dụ, đếm ký tự, Lưu và bỏ thay đổi; xóa nội dung rồi lưu trở về mặc định |
| Dashboard | Khung chat trong vùng làm việc; danh sách cuộc chat riêng có thể thu gọn, nút cuộc chat mới, vùng nhập luôn dễ tiếp cận |
| Kết quả | Câu trả lời ngắn, thẻ khi một thiết bị, bảng/danh sách khi nhiều; nguồn và thời điểm tra cứu khi có giá trị sử dụng |
| Điều hướng | “Mở hồ sơ”, “Xem lịch sử cập nhật”; “Xem trên 3D” chỉ khi ánh xạ hợp lệ và có quyền |
| Trạng thái | Đang xử lý, hoàn tất, lỗi, gián đoạn; phân biệt câu hỏi đã lưu với câu trả lời chưa hoàn thành |
| Mobile/bàn phím | Không tràn ngang trang; lịch sử mở bằng Sheet/menu; xuống dòng và gửi không làm hỏng IME tiếng Việt; focus/lỗi đọc được |

- Nội dung mẫu: “Tôi phụ trách IT văn phòng. Trả lời ngắn bằng tiếng Việt; khi tìm thiết bị, ưu tiên mã, hãng/model, tình trạng và vị trí.” Không tự điền mô tả công việc chưa được người dùng xác nhận.
- Lấy chủ thể từ phiên, kể cả tài khoản hệ thống không gắn nhân sự. Cá nhân hóa không sửa chức vụ, phòng ban hoặc quyền. Người dùng tự khai “quản lý IT” không được nâng quyền.
- Đọc cấu hình mới nhất khi bắt đầu lượt; giữ một bản cấu hình nhất quán trong lượt đang xử lý. Sửa profile không sửa lại các câu trả lời cũ. Không tự ghi thông tin rút ra từ chat vào profile.
- Câu hỏi hiện tại có thể đổi phong cách trả lời; quy tắc ứng dụng và kiểm tra quyền vẫn giữ. Text cá nhân hóa là chỉ dẫn người dùng, không ghép thành chỉ dẫn đặc quyền của ứng dụng.
- Bản đầu không sửa/nhân nhánh các tin nhắn đã hoàn tất hoặc tự tìm trên mọi cuộc chat. Cho phép đổi chủ đề trong cùng cuộc chat bằng yêu cầu rõ; cuộc chat mới là lựa chọn tách chủ đề. Xem [ngữ cảnh và dữ liệu](#ngữ-cảnh-và-dữ-liệu-gửi-ai).

### Kịch bản máy in HCNS

| Điều kiện | Kết quả phải thể hiện |
| --- | --- |
| Một kết quả hợp lệ | Thẻ hồ sơ với trường đã biết; trường thiếu ghi chưa cập nhật |
| Nhiều kết quả | Danh sách phân biệt được; số đếm cùng phạm vi truy vấn, có giới hạn/phân trang rõ |
| “HCNS” chưa xác định được | Làm rõ vị trí vật lý hay đơn vị quản lý; nếu nhiều vị trí trùng tên thì cho chọn |
| Cụm “ở phòng HCNS” xác định được vị trí | Tìm tại vị trí và các điểm con hợp lệ, nói rõ phạm vi; không suy từ phòng quản lý/người sử dụng |
| Không có hồ sơ khớp | “Chưa tìm thấy hồ sơ được gán vị trí…”; có thể đề nghị tìm theo đơn vị quản lý hoặc chưa có vị trí |
| Hỏi tiếp “chiếc thứ hai” | Dựa trên kết quả trước để xác định ID; tra lại quyền/dữ liệu, hỏi rõ nếu không còn đủ ngữ cảnh |
| Hỏi mức mực hoặc tình trạng tức thời | Nêu chưa có dữ liệu đo nếu ERP chưa lưu; không biến tình trạng ghi nhận thành quan sát trực tiếp |
| Hỏi lịch sử sửa chữa | Phân biệt lịch sử cập nhật hồ sơ hiện có với hồ sơ sửa chữa chưa có |
| Thiếu quyền | Không lộ tên, số lượng hoặc sự tồn tại của hồ sơ ngoài quyền; nêu chức năng chưa được cấp |
| Lỗi DB/API | Báo chưa tra cứu được, giữ câu hỏi; không trả danh sách rỗng như kết quả thành công |

### Thiết kế DB cần giữ

Tên dưới đây là **đề xuất**, chưa thêm vào Prisma hay migration. Chuẩn tên/FK theo [rule DB](../../.agents/rules/DATABASE-RULES.md). Dữ liệu mới không thay thế hoặc sao chép danh mục tài sản làm nguồn vận hành.

Phần dưới sở hữu cột cá nhân hóa và ba bảng hội thoại/tin nhắn/log. Cột `tai_khoan.han_muc_ai_thang`, bảng `ket_noi_ai` và các trường nguồn/kỳ/cấu hình bổ sung vào log được quản lý duy nhất tại [Thiết kế DB quản trị AI](../THIET-KE-QUAN-TRI-AI.md#3-thiết-kế-db-cần-giữ); tổng cộng hai cột tài khoản và bốn bảng mới.

#### Cột bổ sung trên `tai_khoan`

| Trường | Kiểu | Quy tắc |
| --- | --- | --- |
| `huong_dan_ai_ca_nhan` | Text nullable | Mặc định null; đề xuất giới hạn 2.000 ký tự cả validation và CHECK DB; chỉ tự sửa |

Dùng `updated_at` hiện có để kiểm tra xung đột lưu profile; không tăng phiên bản đăng nhập chỉ vì đổi cách trả lời. Audit chỉ ghi actor/thời điểm/trường thay đổi, không sao chép nguyên nội dung cá nhân hóa vào nhật ký hệ thống. Không thêm bảng cài đặt chỉ cho một ô text.

#### Bảng `hoi_thoai_ai`

| Trường | Kiểu / quy tắc |
| --- | --- |
| `id` | Int, PK tự tăng |
| `company_id`, `account_id` | Int bắt buộc; FK công ty và tài khoản cùng công ty |
| `tieu_de` | Varchar(200), mặc định tên trung tính; không tự lấy dữ liệu nhạy cảm làm tiêu đề |
| `trang_thai` | Enum `DANG_MO`, `LUU_TRU`; lưu trữ không xóa nội dung |
| `created_at`, `updated_at` | Thời điểm tạo/hoạt động gần nhất |

Unique `(id, company_id)`; index `(company_id, account_id, updated_at, id)` phục vụ danh sách và phân trang ổn định. Chủ sở hữu và công ty không chuyển sau tạo. Không tạo hội thoại rỗng chỉ vì tải dashboard; tạo khi người dùng bắt đầu cuộc chat và gửi câu hỏi đầu tiên.

#### Bảng `tin_nhan_ai`

| Trường | Kiểu / quy tắc |
| --- | --- |
| `id` | Int, PK tự tăng; thứ tự hiển thị tăng theo ID trong hội thoại |
| `company_id`, `hoi_thoai_id` | Int; FK kép tới hội thoại cùng công ty |
| `ma_yeu_cau` | UUID; cùng giá trị cho câu hỏi và câu trả lời của một lượt |
| `vai_tro` | Enum `NGUOI_DUNG`, `TRO_LY`; server quyết định vai trò |
| `noi_dung` | Text; câu trả lời có thể rỗng khi chưa hoàn tất |
| `du_lieu_kem_theo` | JSONB nullable; kết quả/nguồn/phụ thuộc quyền theo cấu trúc có phiên bản |
| `trang_thai` | Enum `DANG_XU_LY`, `HOAN_TAT`, `LOI`, `GIAN_DOAN` |
| `ma_xu_ly`, `het_han_xu_ly` | UUID và DateTime nullable; nhận diện tiến trình đang giữ quyền xử lý tạm thời |
| `created_at`, `updated_at` | Tạo và cập nhật trạng thái/kết quả |

- Unique `(id, company_id)` và `(hoi_thoai_id, ma_yeu_cau, vai_tro)`; index `(company_id, hoi_thoai_id, id)`. Tinh gọn so với bảng cột trao đổi ban đầu: dùng ID tự tăng để xếp thứ tự, không cần cấp thêm `thu_tu` bằng `MAX + 1`.
- Partial unique index chỉ cho một tin nhắn `TRO_LY/DANG_XU_LY` trong mỗi hội thoại. Tin người dùng lưu `HOAN_TAT` khi đã nhận thành công; không nhận vai trò/trạng thái từ client.
- JSON gồm phiên bản cấu trúc, loại thẻ, danh sách nguồn được kiểm chứng, ID/phiên bản hồ sơ lúc đọc, thời điểm tra cứu và phụ thuộc dữ liệu/quyền. Các nút được dựng từ loại hành động cho phép, không lưu HTML/script/URL tùy ý do model tạo.
- Phần `ngu_canh` trong JSON lưu trạng thái hội thoại có cấu trúc theo [đặc tả bối cảnh](#bối-cảnh-trong-một-cuộc-chat). Đây là dữ liệu dẫn xuất có thể dựng lại từ các lượt/nguồn hợp lệ; không thêm cột/bảng hoặc tạo nguồn dữ liệu tài sản thứ hai.
- ID nguồn trong JSON không có FK; phải kiểm tra lại khi dùng, không cấp quyền từ JSON. Metadata phụ thuộc do server ghi nhận từ công cụ đã chạy và ngữ cảnh đã dùng, không tin khai báo của model/client.
- Kết quả lưu tối thiểu để trình bày lại và truy vết câu trả lời; không lưu bản sao toàn bộ hồ sơ HR, kết quả công cụ thô hoặc toàn DB. Giới hạn số kết quả/kích thước JSON được chốt khi thử tải; không âm thầm cắt mà vẫn báo là toàn bộ.
- Nội dung câu hỏi và câu trả lời thành công bất biến trong bản đầu. Bản ghi đang xử lý được hoàn tất một lần; tin lỗi/gián đoạn chỉ cập nhật theo luồng thử lại dưới đây. Đây là bản ghi hội thoại có vòng đời xử lý, không phải audit nghiệp vụ chỉ ghi thêm.

#### Bảng `nhat_ky_goi_ai`

| Trường | Kiểu / quy tắc |
| --- | --- |
| `id`, `company_id`, `account_id` | Int; PK, công ty và tài khoản sử dụng |
| `tin_nhan_id` | Int nullable; FK tới tin trả lời cùng công ty |
| `ma_lan_goi` | UUID unique; mỗi lần thử gọi API có mã riêng |
| `ma_yeu_cau_nha_cung_cap` | Varchar nullable; mã đối chiếu bên ngoài, không là FK nội bộ |
| `model`, `phien_ban_huong_dan` | Model thực tế và phiên bản quy tắc ứng dụng |
| `trang_thai`, `ma_loi` | Đang gọi / hoàn tất / lỗi / chưa xác định; mã lỗi làm sạch |
| `token_dau_vao`, `token_dau_ra`, `token_cache` | Số nguyên nullable; cache là phần nằm trong đầu vào, không cộng trùng |
| `chi_phi_uoc_tinh`, `chi_phi_du_phong`, `can_cu_tinh_phi` | Decimal nullable cho kết quả và phần ngân sách giữ trước; JSONB đơn giá/đơn vị/thời điểm áp dụng; không coi là hóa đơn cuối cùng |
| `created_at`, `ket_thuc_at` | Thời điểm bắt đầu và kết thúc nullable |

- Một câu hỏi có thể phát sinh nhiều lần gọi API; mỗi lần thử có dòng riêng. Không ghi API key, header, prompt đầy đủ, nội dung cá nhân hóa hoặc tool payload thô.
- FK account cùng công ty; FK tin nhắn cùng công ty. Nếu có tin nhắn, kiểm tra chủ hội thoại đúng `account_id` bằng ràng buộc/trigger khi triển khai. Index `(company_id, account_id, created_at)` và `(tin_nhan_id)`.
- Bản ghi được cập nhật trong vòng đời một lần gọi, chốt khi biết kết quả; đây là nhật ký vận hành, tách audit nghiệp vụ. Timeout chưa biết mức sử dụng để null/chưa xác định, không ghi 0 hoặc tự gọi lại như chưa phát sinh chi phí.
- Nếu cần phân bổ chi phí theo phòng trong pilot, phải chốt nguồn phòng chịu phí và lưu dấu tại thời điểm sử dụng; không tính ngược theo phòng hiện tại của nhân sự. Chưa thêm thiết kế kết nối riêng từng phòng.

#### Liên kết, lưu trữ và xóa

- FK từ dữ liệu AI tới tài khoản/công ty dùng Restrict. Tin nhắn là dữ liệu con có thể Cascade khi cuộc chat được xóa theo chính sách đã chốt; bản đầu UI chỉ lưu trữ/mở lại.
- FK từ nhật ký gọi tới tin nhắn dùng Restrict trong thiết kế ban đầu. Luồng xóa sau khi được chốt phải gỡ `tin_nhan_id` trong transaction trước khi xóa nội dung, giữ metadata chi phí; không Cascade xóa log rồi làm mất số liệu hạn mức.
- Không xây cron xóa hoặc nút “Xóa vĩnh viễn” trước khi chốt thời hạn, phạm vi backup và quyền xóa. Không quảng bá thao tác lưu trữ là xóa. Lưu/xóa phía ERP không tự xóa mọi dữ liệu phía nhà cung cấp.
- Không lưu API key rõ trong DB/profile/chat/log. Bảng kết nối giữ tham chiếu kho bí mật và metadata theo [thiết kế quản trị](../THIET-KE-QUAN-TRI-AI.md#5-quản-lý-khóa-và-đối-soát); nguồn thanh toán/phạm vi phải được chốt.

### Quản trị AI và hạn mức

Màn hình đề xuất `/ai-management`: tổng quan mức dùng, hạn mức tài khoản, kết nối/API key và đối soát OpenAI. **Ngân sách ERP còn khả dụng, số liệu chi phí nhà cung cấp, rate limit và số dư prepaid là các chỉ số khác nhau.** Người quản lý quota/khóa không mặc nhiên được xem nội dung chat của user.

Thiết kế chi tiết về bảng/cột, công thức mức còn lại, khóa/chính sách đồng thời, vòng đời secret, quyền và nguồn OpenAI nằm tại [Thiết kế quản trị AI](../THIET-KE-QUAN-TRI-AI.md). Đề xuất triển khai quản trị nội bộ cùng pilot chat; đồng bộ Usage/Costs làm sau khi có credential/phạm vi phù hợp. Không tự nạp tiền, tạo/revoke key hoặc sửa spend limit phía OpenAI trong bản đầu.

### Quyền và bảo vệ lịch sử

Phương án bản đầu: quyền `AI USE` cùng các quyền quản trị độc lập trong catalog/validation/ma trận hiện có; không tạo hệ RBAC riêng. [Ma trận quản trị](../THIET-KE-QUAN-TRI-AI.md#6-quyền-và-audit) quản lý `AI VIEW_USAGE`, `AI MANAGE_LIMITS`, `AI MANAGE_CONNECTIONS`. Chưa cấp quyền cho bất kỳ role/tài khoản nào trong lượt lập plan.

| Tác vụ | Kiểm tra dự kiến |
| --- | --- |
| Sửa cá nhân hóa | Phiên hợp lệ, đúng tài khoản; là khả năng tự quản lý profile |
| Gửi câu hỏi, đọc/lưu trữ/mở lại chat | `AI USE` và chủ sở hữu cùng công ty |
| Tra cứu hồ sơ, loại, lịch sử tài sản | Thêm ASSETS VIEW/MANAGE theo chính sách tài sản hiện có |
| Mở viewer hoặc tra cứu cây vị trí riêng | Thêm LOCATIONS VIEW/MANAGE theo chính sách vị trí/3D |
| Dữ liệu nhân sự | Chưa có công cụ HR ở bản đầu; không mở quyền HR từ thông tin người dùng thiết bị |
| Quản lý role/account | Không tự cấp quyền đọc chat của người khác |
| Mức dùng của mình | `AI USE`, chỉ metadata của đúng tài khoản; không lộ secret |
| Thống kê/quản lý hạn mức và kết nối | Quyền quản trị riêng theo thiết kế liên kết; không bao gồm đọc chat của user |

- Danh tính, công ty, sở hữu chat và grant được đọc từ server; không để model nhận SQL tùy ý, tài khoản DB hoặc quyết định quyền. Hạn mức cũng áp dụng phía server, không chỉ ẩn nút.
- Kiểm tra phiên/quyền trước mỗi công cụ và trước khi trả kết quả; thay đổi quyền giữa lúc gọi API phải được phát hiện. Quyền AI không bao gồm quyền nghiệp vụ, scope theo phòng chưa được mặc định là đã có.
- Khi mở lịch sử hoặc dựng ngữ cảnh, kiểm tra lại phụ thuộc quyền và đối tượng nguồn, kể cả tiêu đề, text trả lời, thẻ, số đếm và tóm tắt nếu sau này có. Không chỉ chặn nút mở hồ sơ.
- Với quyền/phạm vi đã mất hoặc phụ thuộc không kiểm chứng được, bản đầu ẩn toàn bộ lượt liên quan và không gửi lại cho model. Phụ thuộc của ngữ cảnh phải truyền sang câu trả lời mới; nếu chưa theo dõi đầy đủ, chặn tái sử dụng cả cuộc chat chứa dữ liệu đó. Không tái dùng chuỗi response từ nhà cung cấp mang ngữ cảnh cũ đã mất quyền.
- Cùng API key/công ty/phòng ban hoặc cùng nhân sự không cho phép đọc chéo chat. Khóa tài khoản, nghỉ việc, bắt buộc đổi mật khẩu và thu hồi phiên theo cơ chế hiện hành.

### Ngữ cảnh và dữ liệu gửi AI

| Thành phần | Nguồn và cách xử lý |
| --- | --- |
| Quy tắc ứng dụng | Mã nguồn có phiên bản; gửi lại mỗi lần gọi cần thiết, không coi quy tắc cũ tự được giữ |
| Cá nhân hóa | Text mới nhất của tài khoản, chỉ dẫn cấp người dùng, có giới hạn; không cấp quyền |
| Câu hỏi hiện tại | Nội dung đã kiểm tra kích thước và chính sách dữ liệu |
| Lịch sử | Chỉ cuộc chat đang mở, các lượt hợp lệ trong ngân sách ngữ cảnh |
| Bối cảnh tác vụ | Bộ lọc, kết quả theo thứ tự đã hiển thị, đối tượng đã xác định và câu hỏi cần làm rõ; mỗi giá trị có nguồn trong cuộc chat |
| Kết quả nghiệp vụ | Công cụ server kiểm tra quyền, chọn tối thiểu trường và áp dụng ẩn danh |

- Đề xuất Responses API và ERP tự giữ lịch sử, `store: false`, không dùng Conversations hoặc chuỗi response lưu bên ngoài làm nguồn lịch sử duy nhất. `store: false` không đồng nghĩa Zero Data Retention; đối chiếu chính sách nhà cung cấp trước pilot.
- Trong một lượt dùng công cụ, bảo toàn các output item/call ID cần thiết theo API. Bản đầu có thể giữ trạng thái kỹ thuật này trong tiến trình; khi mất tiến trình đánh dấu gián đoạn, không hứa khôi phục chính xác giữa một vòng gọi từ text chat đơn thuần.
- Giữa các lượt, dựng lại ngữ cảnh đã kiểm tra quyền với quy tắc/cá nhân hóa hiện tại. Không nối lại output kỹ thuật cũ sau khi sửa/ngắt lịch sử hoặc đổi quyền. Không gửi mọi cuộc chat hay toàn bộ hồ sơ nhân sự để “AI hiểu người dùng”.
- Bộ nhớ dài hạn, tự tóm tắt xuyên cuộc chat và tự sửa profile chưa thuộc bản đầu. Khi vượt ngân sách ngữ cảnh, giới hạn theo lượt hoàn chỉnh và yêu cầu làm rõ tham chiếu đã mất; không đoán “máy đó” nếu không còn đủ dữ liệu.
- Cấu hình chung phải giới hạn input/output, số lượt gọi công cụ, thời gian, kết quả/trang và mức sử dụng theo tài khoản. Giá trị cụ thể phụ thuộc model/ngân sách ở A; chưa chốt giá hoặc model chỉ từ ví dụ trong tài liệu.
- Quy định dữ liệu tại [bối cảnh AI](../strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md#5-bối-cảnh-sử-dụng-ai-theo-phòng-ban) áp dụng cả câu hỏi/cá nhân hóa và kết quả tra cứu. Pilot kỹ thuật dùng dữ liệu tổng hợp/đã ẩn danh; dữ liệu hiển thị có tên thật có thể được dựng lại tại ERP từ tham chiếu đã kiểm tra. Không coi quyền xem trong ERP là quyền tự động gửi ra OpenAI.

### Bối cảnh trong một cuộc chat

**Lịch sử được lưu và bối cảnh đưa vào model là hai tập khác nhau.** DB giữ các tin nhắn theo chính sách lưu; mỗi lượt chỉ gửi phần cần thiết và còn quyền xem. Một cuộc chat có bối cảnh riêng, gồm mục tiêu đang hỏi, phạm vi tra cứu, các lựa chọn đã xác định và câu hỏi chưa làm rõ. Cá nhân hóa trong profile tiếp tục áp dụng nhưng không mang dữ liệu của cuộc chat khác sang.

#### Ví dụ tiếp nối và đổi phạm vi

Ví dụ minh họa, không xác nhận số lượng hoặc hồ sơ máy in thực tế:

| Lượt người dùng | Cách dùng bối cảnh |
| --- | --- |
| “Tìm máy in ở phòng HCNS” | Xác định loại máy in và vị trí HCNS; lưu phạm vi đã xác minh cùng danh sách kết quả theo đúng thứ tự hiển thị |
| “Cho tôi xem chiếc thứ hai” | Lấy ID thứ hai trong danh sách đã trả ở lượt liên quan, không chạy lại truy vấn rồi lấy dòng thứ hai theo thứ tự mới |
| “Máy đó đang ở đâu?” | Giữ đúng ID đã chọn, đọc lại quyền và vị trí hiện tại; không suy từ vị trí ghi trong câu trả lời cũ |
| “Chỉ lấy máy đang dùng chung” | Thêm điều kiện dùng chung vào bộ lọc đang áp dụng nếu ý nghĩa rõ; kết quả mới thay danh sách tham chiếu và bỏ lựa chọn không còn phù hợp |
| “Còn phòng Kế toán?” | Giữ loại máy in, đổi vị trí nếu xác định được; nêu các điều kiện còn giữ để người dùng kiểm tra, hỏi rõ nếu có nhiều cách hiểu |
| “Không phải ở HCNS, tôi muốn máy do HCNS quản lý” | Thay điều kiện vị trí bằng phòng quản lý; không giữ ngầm cả hai bộ lọc |
| “Bỏ các điều kiện trước, tìm tất cả máy in tôi được xem” | Xóa bộ lọc và lựa chọn cũ trong cuộc chat; phạm vi quyền server vẫn giữ |
| Mở cuộc chat mới rồi nói “máy đó” | Chưa có đối tượng tham chiếu; yêu cầu chọn hoặc cung cấp mã/tên, không lấy từ cuộc chat trước |

Khi câu mới chuyển hẳn loại đối tượng/chủ đề, không mang theo lựa chọn hoặc bộ lọc không liên quan. Nếu chưa rõ là hỏi tiếp hay đổi chủ đề, hỏi ngắn hoặc cho chọn; không gán mặc định đối tượng chỉ vì gần nhất. Người dùng có thể quay về một kết quả cũ bằng cách chỉ rõ nguồn/mã hoặc chọn thẻ đó; server kiểm tra lại nguồn trong đúng hội thoại.

#### Dữ liệu bối cảnh được lưu ở đâu?

Dùng `tin_nhan_ai.du_lieu_kem_theo.ngu_canh`, với cấu trúc có phiên bản. Dữ liệu này nằm trong cột JSONB đã đề xuất, **không có bảng bộ nhớ hoặc cột ngữ cảnh riêng trên hội thoại**.

| Nội dung trong JSON | Mục đích và nguồn kiểm chứng |
| --- | --- |
| `phien_ban` | Phiên bản cấu trúc để kiểm tra/đọc lại an toàn |
| `tac_vu`, `bo_loc` | Loại tra cứu và các điều kiện đã xác định: loại tài sản, vị trí hoặc phòng quản lý, tình trạng/hình thức dùng; có tham chiếu tới lượt yêu cầu làm căn cứ |
| `ket_qua_tham_chieu` | Tin nhắn nguồn, danh sách ID theo đúng thứ tự đã hiển thị, trang/phạm vi kết quả và thời điểm tra cứu |
| `doi_tuong_dang_chon` | Loại/ID đối tượng đã xác định, tin nhắn hoặc lựa chọn của người dùng làm căn cứ; nullable khi chưa rõ |
| `can_lam_ro` | Phần còn thiếu, các lựa chọn hợp lệ và trạng thái chưa xác định; không biến giả định của AI thành dữ kiện |

- Các ID trong JSON, kể cả tin nhắn nguồn, là tham chiếu logic không có FK. Chúng phải thuộc đúng hội thoại/công ty/phạm vi đang được phép; không tin ID hoặc thứ tự do client/model gửi nếu chưa đối chiếu.
- Model có thể đề xuất cách hiểu câu nói; server kiểm tra cấu trúc, giải quyết tên thành ID qua công cụ và ghi nhận nguồn. Chỉ lựa chọn/điều kiện có căn cứ mới trở thành bối cảnh áp dụng; câu trả lời suy đoán không là nguồn xác nhận nghiệp vụ.
- Snapshot đi cùng lượt vừa xử lý và được lưu nhất quán với câu trả lời. Khi reload hoặc mở lại cuộc chat, dựng bối cảnh từ các lượt hợp lệ sau khi kiểm tra quyền. Bản ghi lỗi/gián đoạn không được giả làm kết quả mới thành công.
- Nếu người dùng đã đổi phạm vi nhưng truy vấn lỗi, giữ yêu cầu đổi phạm vi ở trạng thái chưa xác định và vô hiệu lựa chọn cũ không phù hợp; không âm thầm quay về máy của phòng trước. Nhiều tab dùng cùng cơ chế một lượt/hội thoại và kiểm tra tiến trình đã có trong plan.
- Quyền bị thu hồi, nguồn bị xóa hoặc không kiểm chứng được phải loại bỏ cả bối cảnh dẫn xuất, danh sách có thứ tự và đối tượng đang chọn. Khi không còn đủ nguồn, hỏi lại thay vì dùng snapshot cũ để trả thông tin.

#### Hội thoại dài và giới hạn nhớ

- Dựng đầu vào theo ngân sách token của model/cấu hình: quy tắc ứng dụng, cá nhân hóa hiện tại, câu hỏi, trạng thái tác vụ đã xác minh và các lượt gần đây liên quan. Dành chỗ cho kết quả công cụ và câu trả lời; không chỉ giới hạn theo một số tin nhắn cố định.
- Chọn các lượt hoàn chỉnh; giữ nguyên chuỗi tool call/output cần thiết của lượt đang chạy. Không cắt giữa một cặp yêu cầu công cụ–kết quả hoặc tái dùng reasoning/output kỹ thuật sau khi thay đổi phần lịch sử mà nó phụ thuộc.
- Đưa một đoạn cũ ra khỏi đầu vào không xóa đoạn đó khỏi DB. Bản đầu vẫn giữ trạng thái tác vụ ngắn theo JSON để tiếp tục tra cứu; nếu câu hỏi cần nội dung cũ không còn trong bối cảnh và chưa truy lại được, nêu giới hạn và yêu cầu chỉ rõ thay vì hứa nhớ toàn bộ.
- Tóm tắt tự động cho cuộc chat dài là hướng mở rộng riêng, chưa đưa thành bước bắt buộc của bản đầu. Nếu bổ sung, phải có phạm vi tin nhắn nguồn, thời điểm/phiên bản và phụ thuộc quyền; chỉ dùng như dữ liệu dẫn xuất, không là quy tắc ứng dụng hoặc hồ sơ nghiệp vụ. Không thêm tóm tắt tự động xuyên cuộc chat vào phạm vi hiện tại.

### Đồng thời, lỗi và chi phí

1. Trong transaction ngắn, kiểm tra actor/quyền/sở hữu, khóa theo thứ tự tương thích hệ thống, nhận `ma_yeu_cau` và tạo cặp câu hỏi–trả lời đang xử lý. Trùng mã với nội dung khác bị từ chối; trùng mã/nội dung trả trạng thái đã có, không phát sinh cuộc gọi mới.
2. Chỉ một lượt đang xử lý mỗi hội thoại; nhiều tab cùng gửi được kiểm soát ở DB. Tiến trình nhận `ma_xu_ly` và hạn xử lý; không giữ transaction hoặc khóa DB trong khi gọi OpenAI.
3. Trước mỗi lần gọi, kiểm tra hạn mức và ghi log/phần ngân sách dự phòng nguyên tử theo tài khoản trong transaction ngắn; tính từ giới hạn đầu vào/đầu ra và đơn giá đã chọn. Hoàn tất thì thay phần dự phòng bằng chi phí đã xác định; timeout chưa rõ giữ phần dự phòng để nhiều tab không cùng vượt hạn mức. Thực thi công cụ theo danh sách cho phép và giới hạn vòng gọi; đọc quyền lại mỗi lần truy vấn dữ liệu.
4. Hoàn tất bằng transaction có kiểm tra phiên/quyền và token tiến trình còn hiệu lực. Lưu câu trả lời/kết quả/log và cập nhật hội thoại; tiến trình cũ không ghi đè sau khi đã hết hạn/thử lại.
5. Mất mạng phía trình duyệt không tự gọi lại API: khi mở lại đọc trạng thái DB. Tiến trình mất hoặc quá hạn chuyển gián đoạn qua luồng phục hồi có khóa. Retry sau lỗi đã xác định dùng cùng lượt, tạo lần gọi mới và token tiến trình mới; không tạo cặp tin nhắn trùng hoặc sửa câu trả lời đã hoàn tất.
6. Timeout không rõ kết quả cần đối chiếu nếu nhà cung cấp hỗ trợ; nếu vẫn không rõ, người dùng được biết thử lại có thể phát sinh thêm chi phí. Không cam kết gọi API “đúng một lần” xuyên sự cố mạng. Ngân sách giữ phần dự phòng cho lượt đang gọi/chưa rõ, không chỉ cộng log thành công.

Không ghi audit nghiệp vụ thành công cho việc AI chỉ trả lời. Khi sau này có mutation tài sản, transaction/audit vẫn thuộc action tài sản; lịch sử chat không thay nhật ký nghiệp vụ.

### Checklist triển khai

- [x] Tổng hợp yêu cầu và đọc quy chuẩn plan, profile/RBAC, tài sản/vị trí, ba rule kỹ thuật chung; đối chiếu schema/profile ở mức mã nguồn.
- [x] Lập A/B, luồng, ERD, bối cảnh từng cuộc chat và thiết kế quản trị; tinh gọn theo yêu cầu: hạn mức là một cột trên tài khoản, tổng hai cột + bốn bảng, không có bảng hạn mức riêng. Đây là thiết kế đầy đủ chưa triển khai; pilot có một bảng kết nối và dùng lại nghiệp vụ theo mục riêng phía trên.
- [x] Tạo rule AI, đăng ký router và tổng quan plan, liên kết từ plan cá nhân về nguồn thiết kế này.
- [ ] Chốt lựa chọn ở A và nhận yêu cầu triển khai cụ thể; chuẩn bị bộ dữ liệu mẫu, danh sách tài khoản thử.
- [ ] Kiểm chứng SDK/model và cách gọi API hiện hành; đọc hướng dẫn Next.js cục bộ trước khi viết mã; chọn giới hạn và cơ chế phản hồi theo rule Backend.
- [ ] Chuẩn bị migration: backup/khôi phục thử, thêm cột cá nhân hóa nullable và cột hạn mức mặc định 0, ba bảng chat/usage và mở rộng bảng kết nối/FK/index/CHECK, trigger chủ/nguồn log, unique kết nối mặc định, catalog AI và các quyền quản trị; không tự cấp ngân sách/grant.
- [ ] Thêm form cá nhân hóa và action lưu riêng, kiểm tra phiên/version/audit; cập nhật rule profile khi chức năng được triển khai.
- [ ] Làm lưu trữ chat, quyền sở hữu, idempotency, xử lý một lượt/hội thoại, phục hồi gián đoạn và log chi phí.
- [ ] Làm quản trị nội bộ: kho bí mật/kết nối mặc định, sửa cột hạn mức tài khoản, model/giới hạn kỹ thuật chung, dự phòng/đối soát hạn mức, tổng quan metadata và audit; không mở quyền đọc chat user.
- [ ] Khi có credential/phạm vi được cấp, tích hợp đọc Usage/Costs, phân trang/cache theo project/kỳ và nhãn cập nhật/lỗi; không suy số dư prepaid.
- [ ] Tích hợp công cụ đọc tài sản/vị trí; kiểm tra nguồn, JSON kết quả/bối cảnh, tiếp nối và đổi bộ lọc, quyền lịch sử và dựng liên kết hồ sơ/3D hợp lệ.
- [ ] Làm chat dashboard, lịch sử, trạng thái lỗi/trống và mobile/bàn phím; không thay số liệu công việc cá nhân bằng dữ liệu giả.
- [ ] Kiểm thử theo ma trận dưới, chạy kiểm tra mã phù hợp và render/kiểm tra giao diện; ghi bằng chứng tại `outputs/ai-assistant/` ngoài Git.
- [ ] Sau xác nhận phạm vi, thử API thật có giới hạn với dữ liệu được phép; ghi chất lượng, độ trễ và chi phí thực tế.
- [ ] Đồng bộ từ điển DB, kiến trúc/dependency/env và plan liên quan theo thay đổi thực tế; chỉ đánh dấu triển khai/kiểm chứng khi có bằng chứng.

### Kiểm chứng và pilot

| Nhóm | Ca kiểm tra cần đạt |
| --- | --- |
| Cá nhân hóa | Trống/mặc định, giới hạn ký tự, lưu xung đột, đổi ở tab khác áp dụng lượt kế; không sửa lời đáp cũ, không tự nâng quyền |
| Chủ sở hữu | Hai tài khoản cùng người, hai người cùng phòng, khác công ty; sửa ID request không đọc/sửa chat hoặc profile chéo |
| Quyền hiện hành | Có AI nhưng thiếu ASSETS; có ASSETS thiếu AI; thu hồi quyền khi API đang gọi và khi mở lịch sử; không lộ tiêu đề/text/thẻ/số đếm hoặc gửi lại nguồn cũ |
| Kịch bản nghiệp vụ | Một/nhiều/không có máy in; HCNS là phòng quản lý/vị trí; điểm con, tên trùng; thiếu model/tình trạng/vị trí; hỏi mực/lịch sử sửa chữa chưa có |
| Hỏi tiếp và nguồn | “Chiếc thứ hai” giữ đúng ID kể cả thứ tự truy vấn đã đổi; reload/mở lại giữ lựa chọn hợp lệ; dữ liệu thay đổi phải đọc lại; nguồn mất/không còn quyền thì loại cả bối cảnh dẫn xuất |
| Ngữ cảnh | Quy tắc/cá nhân hóa không cấp quyền; nội dung hồ sơ chứa chỉ dẫn lạ không trở thành lệnh; cuộc chat mới không lấy lịch sử khác |
| Đổi chủ đề/phạm vi | Đổi HCNS sang Kế toán, vị trí sang phòng quản lý, bỏ bộ lọc, chọn lại kết quả cũ; đổi phạm vi rồi lỗi không tái dùng đối tượng cũ; mơ hồ thì hỏi rõ |
| Hội thoại dài | Ngân sách tính cả công cụ/đầu ra, giữ lượt hoàn chỉnh, không xóa lịch sử DB khi thu gọn đầu vào; thiếu tham chiếu cũ không tự đoán; không hứa tóm tắt/nhớ vô hạn |
| Đồng thời và lỗi | Hai tab, gửi trùng, trùng mã khác câu, DB lỗi, API lỗi/timeout, mất tiến trình, tiến trình cũ hoàn tất muộn; không trùng tin hoặc bỏ mất câu đã lưu |
| Chi phí | Nhiều lần gọi trong một câu, retry có log riêng, cache không cộng hai lần, timeout không ghi 0, giới hạn kể cả nhiều tab/lượt chưa hoàn tất |
| Quản trị hạn mức | 0/hết mức hoặc thiếu kết nối mặc định thì chặn; chỉ MANAGE_LIMITS sửa được đúng cột; nhiều tab/user dùng chung kết nối không vượt phần nhận xử lý; đổi khóa/kết nối/đầu tháng/hạ trần không reset log/cấp lại quota; đổi mặc định đồng thời giữ đúng nguồn log |
| API key và quyền quản trị | Không trả secret về client/log/audit, thử khóa có giới hạn, thay khóa lỗi giữ bản hoạt động; tạm dừng ERP không giả revoke OpenAI; quản trị metadata không đọc chéo chat |
| Đối soát OpenAI | Thiếu credential/quyền, sai project/công ty, nhiều trang, dữ liệu cũ/lỗi và múi giờ; không cộng trùng ERP+OpenAI, không gọi rate-limit token là số dư tiền |
| Toàn vẹn và migration | FK khác công ty/chủ log bị chặn; index unique hoạt động; migration giữ toàn bộ dữ liệu cũ; khôi phục được backup |
| UX | Dashboard/profile desktop và mobile sáng/tối; IME/bàn phím/focus, lưu trữ/mở lại, lỗi giữ câu hỏi, cuộn ổn định, nguồn và thời điểm đọc dễ hiểu |

Pilot ghi thời gian tìm máy in bằng cách hiện tại và bằng chat, độ đúng của hồ sơ/nguồn, số lần cần sửa câu hỏi, lỗi quyền và chi phí thực tế. Bộ ca chuẩn có đáp án từ dữ liệu mẫu; chất lượng mô hình phải đánh giá riêng với kiểm thử phần mềm dùng mô phỏng API.

### Kiểm chứng hiện tại

- Lượt lập plan ngày 13/11 chỉ chỉnh tài liệu; chưa tạo migration/cột/bảng/quyền hoặc gọi API thật. Mã/UI của bản thử ngày 16/11 và kết quả kiểm chứng được quản lý tại mục pilot phía trên, không đánh dấu thiết kế đầy đủ đã hoàn tất.
- Đã đối chiếu cấu trúc và hướng dẫn nguồn trong lượt lập thiết kế. Kiểm thử ứng dụng/đối chiếu DB ngày 16/11 chỉ nghiệm thu phạm vi pilot, không thay ma trận kiểm chứng đầy đủ bên trên.
- [x] Đã kiểm tra 128 liên kết/anchor cục bộ trong 6 tài liệu, A–B–ERD–rule–router, tổng hai cột/bốn bảng, không còn bảng/FK hạn mức riêng và khoảng trắng sau tinh gọn hạn mức. Bằng chứng cục bộ: `outputs/ai-assistant/plan-validation.txt`; không phải nghiệm thu ứng dụng hoặc render sơ đồ.

### Nguồn kỹ thuật

Đã tra tài liệu chính thức trong quá trình phân tích ngày 13/11/2026; kiểm tra lại API/SDK khi triển khai, không coi tài liệu này là danh sách model/giá cố định.

- [OpenAI: vai trò tin nhắn và chỉ dẫn](https://developers.openai.com/api/docs/guides/text#message-roles-and-instruction-following).
- [OpenAI: function calling](https://developers.openai.com/api/docs/guides/function-calling).
- [OpenAI: quản lý ngữ cảnh hội thoại](https://developers.openai.com/api/docs/guides/conversation-state).
- [OpenAI: dữ liệu và thời hạn lưu](https://developers.openai.com/api/docs/guides/your-data).
