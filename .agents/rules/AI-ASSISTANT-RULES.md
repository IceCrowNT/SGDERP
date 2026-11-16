# Quy tắc trợ lý AI

**Bản đầy đủ còn là thiết kế; đã có pilot quản trị và cài đặt key/model theo yêu cầu ngày 16/11, chưa nghiệm thu API thật.** Phạm vi, quyết định còn mở, DB và nghiệm thu tại [Plan trợ lý AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md). Pilot chỉ mở cho account được cấu hình, dùng quyền hiện hành và form nghiệp vụ để lưu bản nháp AI; giới hạn và dữ liệu tại [phạm vi pilot](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bản-thử-cho-tài-khoản-quản-trị--16112026). Các quy tắc lưu chat/cá nhân hóa/quota bên dưới áp dụng cho bản đầy đủ khi được triển khai. Không đưa nghiệp vụ AI vào ba rule kỹ thuật chung.

## Cá nhân hóa và hội thoại

- Chat đặt tại dashboard; cài đặt “Bối cảnh và cách AI trả lời” đặt trong profile. Cài đặt và lịch sử thuộc tài khoản đăng nhập, không tự gộp theo nhân sự/phòng ban hoặc API key.
- Máy chủ đọc cá nhân hóa ở đầu mỗi lượt; thay đổi áp dụng lượt kế tiếp. Để trống dùng mặc định. Chỉ người dùng tự lưu mới đổi cài đặt, AI không tự ghi nhớ vào profile.
- Cá nhân hóa là chỉ dẫn cấp người dùng. Chức danh tự khai và nội dung chat không thay dữ liệu nhân sự, chính sách ứng dụng hoặc quyền ERP.
- Ngữ cảnh lấy từ cuộc chat đang mở: giữ điều kiện đã xác định, thứ tự kết quả đã hiển thị và đối tượng đang chọn; đổi chủ đề/phạm vi thì bỏ phần không còn phù hợp, mơ hồ thì hỏi rõ. Cách lưu/dựng lại và giới hạn chat dài tại [bối cảnh trong một cuộc chat](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bối-cảnh-trong-một-cuộc-chat). Cuộc chat mới không tự đọc các cuộc khác; bộ nhớ tự học xuyên hội thoại chưa thuộc bản đầu.
- Lưu trữ cuộc chat không đồng nghĩa xóa. Chính sách lưu/xóa chat, log và backup thuộc plan; không tự đặt cron xóa.

## Tra cứu và kết quả

- Bản đầu chỉ đọc tài sản/vị trí bằng công cụ đã lập trình. Quyền và truy vấn do ERP kiểm soát; không cho model chạy SQL tùy ý hoặc tự quyết định quyền.
- Tài sản/vị trí trong DB hiện hành là nguồn nghiệp vụ; chat là lịch sử trao đổi. Hỏi dữ liệu hiện tại phải tra lại, kể cả đã biết ID từ lượt trước.
- “Ở phòng HCNS” ưu tiên vị trí vật lý khi xác định được; không suy vị trí từ phòng quản lý/người sử dụng. Thiếu hoặc trùng danh mục thì làm rõ theo [rule tài sản](ASSET-MANAGEMENT-RULES.md) và [rule vị trí](LOCATION-MANAGEMENT-RULES.md).
- Phản hồi có nguồn/thẻ/liên kết hợp lệ. Một kết quả mở chi tiết, nhiều kết quả cho chọn; không có hồ sơ, thiếu quyền, thiếu trường và lỗi truy vấn phải phân biệt.
- Tình trạng đã ghi nhận không chứng minh trạng thái tức thời/mức mực. Lịch sử cập nhật không đồng nghĩa hồ sơ sửa chữa. Không tạo dữ liệu hoặc thống kê mẫu để trả lời như dữ liệu thật.
- Nút 3D cần ánh xạ và quyền hợp lệ. Pilot được mở form thêm/sửa tài sản/vị trí với bản nháp do AI chuẩn bị ngay trong chat; người dùng kiểm tra và lưu qua action nghiệp vụ có sẵn. Model không tự thực hiện mutation hoặc báo đã lưu khi mới tạo bản nháp.

## Quyền, dữ liệu và vận hành

- Quyền dùng AI độc lập quyền ASSETS/LOCATIONS; cấp tập trung theo [rule phân quyền](ROLE-MANAGEMENT-RULES.md). Quản trị tài khoản/role hoặc cùng API key không tự có quyền đọc chat người khác.
- Kiểm tra quyền cả nguồn dữ liệu, text lịch sử, thẻ, tiêu đề và ngữ cảnh gửi lại AI. Nếu quyền thay đổi hoặc không xác minh được phụ thuộc, chặn phần liên quan theo phương án trong plan; không chỉ ẩn nút mở hồ sơ.
- Dữ liệu được phép xem trong ERP chưa mặc nhiên được gửi ra dịch vụ AI. Giữ giới hạn dữ liệu/ẩn danh tại [bối cảnh AI theo phòng](../../docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md#5-bối-cảnh-sử-dụng-ai-theo-phòng-ban), bao gồm nội dung người dùng nhập.
- API key được quản lý ở máy chủ qua kho bí mật, DB kết nối chỉ giữ tham chiếu/metadata; không trả khóa đã lưu về client hoặc ghi vào profile/chat/log. Không tự chuyển kết nối hoặc nguồn thanh toán khi lỗi/hết hạn mức.
- Một câu hỏi có thể dùng nhiều lần gọi API; theo dõi từng lần, không coi timeout là chi phí 0 hoặc hứa không bao giờ bị tính phí lặp. Giới hạn lượt/công cụ/ngân sách phải được kiểm soát phía server.
- Câu trả lời hoàn tất không sửa lại âm thầm; lỗi giữ câu hỏi và trạng thái. Chống gửi trùng và phục hồi tiến trình theo [thiết kế DB và xử lý lỗi](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#đồng-thời-lỗi-và-chi-phí).

## Quản trị AI

- Pilot hiện có **Cài đặt AI** trên dashboard, cùng điều kiện tài khoản/quyền như chat. Một kết nối/công ty, khóa nhập mới chỉ ghi, để trống giữ khóa; model nhập tay hoặc chọn từ danh sách. Kiểm tra chỉ gọi GET Models, không xác nhận quota/khả năng gọi công cụ. Lưu có kiểm tra phiên bản và audit nguyên tử; thay đổi áp dụng lượt kế tiếp, dừng lượt đang chạy trước lần API tiếp theo nếu cấu hình đổi. Kho bí mật và fallback theo [thiết kế kết nối pilot](../../docs/THIET-KE-QUAN-TRI-AI.md#kết-nối-pilot--16112026); chưa có quyền AI riêng/quota tài khoản.

- Quản lý kết nối, hạn mức, model và thống kê có quyền riêng; không tự cấp theo chức danh hoặc mở quyền đọc nội dung chat của user. User chỉ xem phần sử dụng của mình; ma trận tại [thiết kế quản trị](../../docs/THIET-KE-QUAN-TRI-AI.md#6-quyền-và-audit).
- Hạn mức tài khoản lưu bằng một cột `tai_khoan.han_muc_ai_thang`, không tạo bảng hạn mức riêng; mức dùng/dự phòng lấy từ log, phần còn lại tính khi đọc. Hạn mức tài khoản và kết nối áp dụng phía server; đổi API key/kết nối không reset mức dùng, thay đổi có audit metadata không chứa secret.
- Bản đầu dùng kết nối mặc định của công ty và cấu hình model/tốc độ chung; không có mặc định hoạt động thì chặn gọi, không tự chuyển nguồn chi. Chi tiết tại thiết kế quản trị, không gán kết nối hoặc giới hạn kỹ thuật riêng từng user trong bản đầu.
- Phân biệt ngân sách ERP còn lại, Usage/Costs OpenAI, rate limit và số dư prepaid. Không tự suy số dư từ token hoặc chi phí; dữ liệu chưa lấy được hiện chưa xác định và thời điểm cập nhật.
- Tạm dừng tại ERP không đồng nghĩa revoke key phía OpenAI. Credential đối soát quản trị tách khỏi key gọi model, chỉ đọc theo project được phép; không tự nạp tiền hoặc chỉnh giới hạn bên nhà cung cấp. Thiết kế/lưu trữ và bước triển khai thuộc [tài liệu quản trị](../../docs/THIET-KE-QUAN-TRI-AI.md).
