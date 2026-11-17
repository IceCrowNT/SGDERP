# Quy tắc trợ lý AI

**Bản đầy đủ còn là thiết kế; đã có pilot quản trị và cài đặt key/model theo yêu cầu ngày 16/11, chưa nghiệm thu API thật.** Phạm vi, quyết định còn mở, DB và nghiệm thu tại [Plan trợ lý AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md). Pilot chỉ mở cho account được cấu hình, dùng quyền hiện hành và form nghiệp vụ để lưu bản nháp AI; công việc khấu hao mặc định loại tài sản được duyệt riêng trên bảng trước–sau; giới hạn và dữ liệu tại [phạm vi pilot](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bản-thử-cho-tài-khoản-quản-trị--16112026). Lịch sử/bối cảnh chat và cá nhân hóa đã triển khai trong phạm vi pilot; hạn mức tùy chọn và usage nội bộ được bổ sung theo đợt 17/11; AI USE mở rộng nhiều tài khoản còn kế hoạch. Không đưa nghiệp vụ AI vào ba rule kỹ thuật chung.

## Cá nhân hóa và hội thoại

- Chat đặt tại dashboard; cài đặt “Bối cảnh và cách AI trả lời” đặt trong profile. Cài đặt và lịch sử thuộc tài khoản đăng nhập, không tự gộp theo nhân sự/phòng ban hoặc API key.
- Máy chủ đọc cá nhân hóa ở đầu mỗi lượt; thay đổi áp dụng lượt kế tiếp. Để trống dùng mặc định. Chỉ người dùng tự lưu mới đổi cài đặt, AI không tự ghi nhớ vào profile.
- Cá nhân hóa là chỉ dẫn cấp người dùng. Chức danh tự khai và nội dung chat không thay dữ liệu nhân sự, chính sách ứng dụng hoặc quyền ERP.
- Ngữ cảnh lấy từ cuộc chat đang mở: giữ điều kiện đã xác định, thứ tự kết quả đã hiển thị và đối tượng đang chọn; đổi chủ đề/phạm vi thì bỏ phần không còn phù hợp, mơ hồ thì hỏi rõ. Cách lưu/dựng lại và giới hạn chat dài tại [bối cảnh trong một cuộc chat](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bối-cảnh-trong-một-cuộc-chat). Cuộc chat mới không tự đọc các cuộc khác; bộ nhớ tự học xuyên hội thoại chưa thuộc bản đầu.
- Chat mới tách bối cảnh; máy chủ đọc lịch sử theo chủ/công ty, không nhận history từ client. Lượt gửi lặp chỉ đọc kết quả, lease hết hạn chuyển gián đoạn và chặn hoàn tất muộn. Danh sách nguồn không còn hợp lệ chặn đọc/tái sử dụng cả cuộc chat, tiêu đề luôn trung tính.
- Lưu trữ cuộc chat không đồng nghĩa xóa. Chính sách lưu/xóa chat, log và backup thuộc plan; không tự đặt cron xóa.

## Tra cứu và kết quả

- Bản đầu chỉ đọc tài sản/vị trí bằng công cụ đã lập trình. Quyền và truy vấn do ERP kiểm soát; không cho model chạy SQL tùy ý hoặc tự quyết định quyền.
- Tài sản/vị trí trong DB hiện hành là nguồn nghiệp vụ; chat là lịch sử trao đổi. Hỏi dữ liệu hiện tại phải tra lại, kể cả đã biết ID từ lượt trước.
- “Ở phòng HCNS” ưu tiên vị trí vật lý khi xác định được; không suy vị trí từ phòng quản lý/người sử dụng. Thiếu hoặc trùng danh mục thì làm rõ theo [rule tài sản](ASSET-MANAGEMENT-RULES.md) và [rule vị trí](LOCATION-MANAGEMENT-RULES.md).
- Phản hồi có nguồn/thẻ/liên kết hợp lệ. Một kết quả mở chi tiết, nhiều kết quả cho chọn; không có hồ sơ, thiếu quyền, thiếu trường và lỗi truy vấn phải phân biệt.
- Tình trạng đã ghi nhận không chứng minh trạng thái tức thời/mức mực. Lịch sử cập nhật không đồng nghĩa hồ sơ sửa chữa. Không tạo dữ liệu hoặc thống kê mẫu để trả lời như dữ liệu thật.
- Nút 3D cần ánh xạ và quyền hợp lệ. Pilot được mở form thêm/sửa tài sản/vị trí với bản nháp do AI chuẩn bị ngay trong chat; người dùng kiểm tra và lưu qua action nghiệp vụ có sẵn. Model không tự thực hiện mutation hoặc báo đã lưu khi mới tạo bản nháp.

Đã triển khai: [bảng công việc và duyệt thực hiện](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bảng-công-việc-ai-và-duyệt-thực-hiện--16112026). Công cụ lập bảng trước–sau từ dữ liệu thật; chỉ ghi đúng kế hoạch sau khi người dùng duyệt, trả kết quả theo trạng thái máy chủ. Kế hoạch lưu `cong_viec_ai` theo chủ/công ty, khôi phục sau reload; nút duyệt chỉ nhận ID/phiên bản. Dữ liệu thay đổi phải làm mới và duyệt lại, lặp duyệt không ghi hai lần. Đổi mặc định loại không hồi tố tài sản đã có. Không áp dụng phương án ghi ngay theo câu lệnh trước đây.

## Quyền, dữ liệu và vận hành

- Quyền dùng AI độc lập quyền ASSETS/LOCATIONS; cấp tập trung theo [rule phân quyền](ROLE-MANAGEMENT-RULES.md). Quản trị tài khoản/role hoặc cùng API key không tự có quyền đọc chat người khác.
- Kiểm tra quyền cả nguồn dữ liệu, text lịch sử, thẻ, tiêu đề và ngữ cảnh gửi lại AI. Nếu quyền thay đổi hoặc không xác minh được phụ thuộc, chặn phần liên quan theo phương án trong plan; không chỉ ẩn nút mở hồ sơ.
- Dữ liệu được phép xem trong ERP chưa mặc nhiên được gửi ra dịch vụ AI. Giữ giới hạn dữ liệu/ẩn danh tại [bối cảnh AI theo phòng](../../docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md#5-bối-cảnh-sử-dụng-ai-theo-phòng-ban), bao gồm nội dung người dùng nhập.
- API key được quản lý ở máy chủ qua kho bí mật, DB kết nối chỉ giữ tham chiếu/metadata; không trả khóa đã lưu về client hoặc ghi vào profile/chat/log. Không tự chuyển kết nối hoặc nguồn thanh toán khi lỗi/hết hạn mức.
- Một câu hỏi có thể dùng nhiều lần gọi API; theo dõi từng lần, không coi timeout là chi phí 0 hoặc hứa không bao giờ bị tính phí lặp. Giới hạn lượt/công cụ/ngân sách phải được kiểm soát phía server.
- Câu trả lời hoàn tất không sửa lại âm thầm; lỗi giữ câu hỏi và trạng thái. Chống gửi trùng và phục hồi tiến trình theo [thiết kế DB và xử lý lỗi](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#đồng-thời-lỗi-và-chi-phí).

## Quản trị AI

- Quản lý key/model đặt tại **Cài đặt chung → Quản trị AI** (`/settings/ai`), cần `AI MANAGE_CONNECTIONS`, độc lập bind pilot và quyền tài sản/vị trí. Chat giữ điều kiện pilot riêng. Điều hướng theo [rule cài đặt](SYSTEM-SETTINGS-RULES.md). Nhiều kết nối/công ty; Thêm kết nối giữ key cũ, Chỉnh sửa/thay key chỉ cập nhật bản đang chọn. Một kết nối mặc định do quản trị chọn, không tự xoay key. Khóa mới chỉ ghi, để trống giữ khóa khi sửa; Model mặc định là danh sách có tìm kiếm, tự tải bằng khóa của kết nối khi mở form; khóa mới dùng nút kiểm tra/tải. Giữ model đang chọn, không tự chọn/lưu giá trị khác; có nhập thủ công khi cần. Kiểm tra chỉ gọi GET Models, không xác nhận quota/khả năng gọi công cụ. Lưu có phiên bản/audit nguyên tử; đổi cấu hình dừng lượt đang chạy trước lần API tiếp theo. Kho bí mật và fallback theo [thiết kế kết nối pilot](../../docs/THIET-KE-QUAN-TRI-AI.md#kết-nối-pilot--16112026); hạn mức và usage nội bộ theo đợt 17/11 trong plan.

- Quản lý kết nối, hạn mức, model và thống kê có quyền riêng; không tự cấp theo chức danh hoặc mở quyền đọc nội dung chat của user. User chỉ xem phần sử dụng của mình; ma trận tại [thiết kế quản trị](../../docs/THIET-KE-QUAN-TRI-AI.md#6-quyền-và-audit).
- Hạn mức tài khoản lưu bằng một cột nullable `tai_khoan.han_muc_ai_thang`, không tạo bảng hạn mức riêng; NULL/để trống là không giới hạn (mặc định), 0 chặn gọi có phí, dương là trần USD/tháng; mức dùng/dự phòng lấy từ log, phần còn lại tính khi đọc. Hạn mức tài khoản và kết nối áp dụng phía server; đổi API key/kết nối không reset mức dùng, thay đổi có audit metadata không chứa secret.
- Tác vụ GENERAL/LOOKUP/DRAFT do người dùng chọn trước lượt chat; cấu hình kết nối/model riêng tại `/settings/ai`, thiếu cấu hình kế thừa mặc định công ty. LOOKUP chỉ có công cụ đọc. Giữ phiên bản trong cả lượt, không tự đổi nguồn chi khi lỗi. Thiếu đơn giá vẫn gọi nếu cả hai mức tài khoản/kết nối đều không giới hạn; log giữ token và chi phí chưa xác định. Khi áp trần cần giá đúng model và đối chiếu khoản chưa rõ trong kỳ. Không gán kết nối riêng từng user.
- Phân biệt ngân sách ERP còn lại, Usage/Costs OpenAI, rate limit và số dư prepaid. Không tự suy số dư từ token hoặc chi phí; dữ liệu chưa lấy được hiện chưa xác định và thời điểm cập nhật.
- Tạm dừng tại ERP không đồng nghĩa revoke key phía OpenAI. Credential đối soát quản trị tách khỏi key gọi model, chỉ đọc theo project được phép; không tự nạp tiền hoặc chỉnh giới hạn bên nhà cung cấp. Thiết kế/lưu trữ và bước triển khai thuộc [tài liệu quản trị](../../docs/THIET-KE-QUAN-TRI-AI.md).

Quyền quản trị đang có: MANAGE_CONNECTIONS (kết nối/model/tác vụ/ngân sách kết nối), MANAGE_LIMITS (hạn mức tài khoản), VIEW_USAGE (metadata trong công ty). Đối chiếu khoản chưa rõ cần cả hai quyền sau; chỉ khoản hết xử lý, ghi chi phí/căn cứ và giải phóng dự phòng cùng audit. Không tự cấp grant hoặc thay quyền pilot.
