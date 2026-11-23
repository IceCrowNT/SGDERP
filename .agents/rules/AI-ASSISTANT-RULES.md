# Quy tắc trợ lý AI

**Chat là khả năng nền của mọi tài khoản đăng nhập hợp lệ, gồm DEFAULT không có grant nghiệp vụ.** Không bind account hoặc yêu cầu AI USE/quyền quản trị để trò chuyện thông thường và làm việc với tệp riêng bằng công cụ hiện có. Công cụ đọc/sửa ERP vẫn theo quyền tài khoản; quản trị kết nối, hạn mức và usage có quyền độc lập. Kết nối công ty, hạn mức và kiểm tra phiên vẫn áp dụng. Phạm vi/kiểm chứng tại [Plan trợ lý AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#mở-chatbot-cho-mọi-tài-khoản--20112026); chưa nghiệm thu API thật. Không đưa nghiệp vụ AI vào ba rule kỹ thuật chung.

## Không gian làm việc

- Ô chat dùng Enter để gửi, Shift+Enter để xuống dòng; không gửi khi IME đang ghép chữ hoặc phím Enter đang lặp do giữ phím. Dùng chung luồng kiểm tra và trạng thái chặn gửi với nút Gửi.
- Lịch sử xếp theo thời điểm hoạt động gần nhất, ID giảm dần khi trùng thời gian; gửi tiếp trong chat cũ đưa chat đó lên đầu, mở xem không cập nhật thời điểm. Phân trang dùng cặp thời điểm/ID và ghép danh sách không trùng.
- Đầu trang desktop gom tiêu đề/tab; composer gồm ô nhập tự tăng chiều cao và một thanh đính kèm/tác vụ/gửi, giới hạn tệp mở khi cần. Tệp của chat mở từ tiêu đề; văn bản giới hạn chiều rộng đọc, bảng vẫn dùng vùng rộng. Lịch sử nhóm theo ngày; đổi tên/lưu trữ ở menu đúng cuộc chat, không đặt nhiều nút trước danh sách.
- Dashboard ưu tiên hội thoại; lịch sử hiện thành cột thu gọn bên cạnh trên desktop, dùng Sheet trên mobile, danh sách công việc đã lưu nằm trong Việc của tôi. Chỉ mở bảng/bản nháp đang chọn bên cạnh chat; màn hình nhỏ chuyển Trao đổi/Bảng công việc. Đóng bảng không hủy công việc, Chat mới không xóa công việc đã lưu.
- Công việc gắn với tài khoản; mở từ liên kết tin nhắn hoặc danh sách, không coi mọi công việc đã lưu thuộc cuộc chat hiện tại. Bảng trước–sau, phạm vi, trạng thái và kết quả lấy từ server; không hiện ID/phiên bản kỹ thuật hoặc tiến độ giả. Duyệt/hủy/điều chỉnh giữ hợp đồng hiện hành.
- Chuyển tab giữ hội thoại, nội dung nhập, bản nháp và yêu cầu đang chạy. Không hiển thị câu gợi ý mẫu hoặc hướng dẫn dài trong khung chat. Cột lịch sử chỉ chứa danh sách và thao tác hội thoại, không có thẻ thông tin cuộc chat hoặc mức sử dụng cá nhân. Không tự gửi hoặc gọi API trả phí. Định dạng cơ bản dùng React escape, không chèn HTML từ model. Lỗi hạn mức vẫn trả ở lượt gửi; quản trị tại `/settings/ai`.
- Chi tiết bố cục, phạm vi và kiểm chứng tại [plan workspace AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#đề-xuất-dashboard-là-không-gian-làm-việc-với-agent--17112026). Không thêm công cụ nghiệp vụ hoặc quyền khi dọn giao diện.

- Tệp trong chat mở tại panel bên phải bằng tên tệp; tải xuống tách riêng. Office web chỉnh DOCX/XLSX, PDF/CSV xem; ảnh dùng preview riêng. Giữ bản nháp ERP khi mở tệp. Lưu là phiên bản mới, chỉ xác nhận sau callback đã ghi ERP, bảo vệ nội dung chưa lưu khi chuyển file/chat. Phạm vi edition/mobile, hạ tầng, quyền nguồn và trạng thái vận hành tại [plan Office web](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#mở-tài-liệu-cạnh-chat--23112026).

## Cá nhân hóa và hội thoại

- Chat đặt tại dashboard; cài đặt “Bối cảnh và cách AI trả lời” đặt trong profile. Cài đặt và lịch sử thuộc tài khoản đăng nhập, không tự gộp theo nhân sự/phòng ban hoặc API key.
- Máy chủ đọc cá nhân hóa ở đầu mỗi lượt; thay đổi áp dụng lượt kế tiếp. Để trống dùng mặc định. Chỉ người dùng tự lưu mới đổi cài đặt, AI không tự ghi nhớ vào profile.
- Cá nhân hóa là chỉ dẫn cấp người dùng. Chức danh tự khai và nội dung chat không thay dữ liệu nhân sự, chính sách ứng dụng hoặc quyền ERP.
- Ngữ cảnh lấy từ cuộc chat đang mở: giữ điều kiện đã xác định, thứ tự kết quả đã hiển thị và đối tượng đang chọn; đổi chủ đề/phạm vi thì bỏ phần không còn phù hợp, mơ hồ thì hỏi rõ. Cách lưu/dựng lại và giới hạn chat dài tại [bối cảnh trong một cuộc chat](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bối-cảnh-trong-một-cuộc-chat). Cuộc chat mới không tự đọc các cuộc khác; bộ nhớ tự học xuyên hội thoại chưa thuộc bản đầu.
- Chat mới tách bối cảnh; máy chủ đọc lịch sử theo chủ/công ty, không nhận history từ client. Lượt gửi lặp chỉ đọc kết quả, lease hết hạn chuyển gián đoạn và chặn hoàn tất muộn. Danh sách nguồn không còn hợp lệ chặn đọc/tái sử dụng cả cuộc chat, tiêu đề rút gọn từ câu hỏi đầu tiên (tối đa 80 ký tự), lưu vào cột hiện có, không gọi model riêng. Chủ hội thoại được đổi tên sau kiểm tra nguồn; đối chiếu tên đang thấy để chống ghi đè từ phiên khác, ghi audit và giữ thời điểm hoạt động. Hội thoại cũ dùng câu hỏi đầu tiên khi chưa có tiêu đề. Kiểm tra quyền/nguồn trước khi trả tiêu đề; nguồn không hợp lệ chỉ hiện nhãn trung tính.
- Hội thoại đã lưu trữ có nút “Khôi phục để chat tiếp” ngay cạnh ô nhập; chỉ mở gửi sau khi server xác nhận khôi phục. Tải danh sách lịch sử có trạng thái riêng, không khóa ô nhập của cuộc chat hiện tại. Lỗi lưu trữ/khôi phục giữ hội thoại và nội dung nhập.
- Lưu trữ cuộc chat không đồng nghĩa xóa. Chính sách lưu/xóa chat, log và backup thuộc plan; không tự đặt cron xóa.

## Tra cứu và kết quả

- Công cụ đã tích hợp gồm tài sản/vị trí và vật tư; danh sách công cụ được lọc theo quyền tài khoản, kiểm tra lại trước thực thi. Quyền dùng chatbot không tự cấp quyền nghiệp vụ. LOOKUP chỉ đọc; GENERAL/DRAFT lập bản nháp trong phạm vi quyền. Quyền và truy vấn do ERP kiểm soát; không cho model chạy SQL tùy ý hoặc tự quyết định quyền.
- Tài sản/vị trí trong DB hiện hành là nguồn nghiệp vụ; chat là lịch sử trao đổi. Hỏi dữ liệu hiện tại phải tra lại, kể cả đã biết ID từ lượt trước.
- “Ở phòng HCNS” ưu tiên vị trí vật lý khi xác định được; không suy vị trí từ phòng quản lý/người sử dụng. Thiếu hoặc trùng danh mục thì làm rõ theo [rule tài sản](ASSET-MANAGEMENT-RULES.md) và [rule vị trí](LOCATION-MANAGEMENT-RULES.md).
- Phản hồi có nguồn/thẻ/liên kết hợp lệ. Một kết quả mở chi tiết, nhiều kết quả cho chọn; không có hồ sơ, thiếu quyền, thiếu trường và lỗi truy vấn phải phân biệt.
- Tình trạng đã ghi nhận không chứng minh trạng thái tức thời/mức mực. Lịch sử cập nhật không đồng nghĩa hồ sơ sửa chữa. Không tạo dữ liệu hoặc thống kê mẫu để trả lời như dữ liệu thật.
- Nút 3D cần ánh xạ và quyền hợp lệ. Pilot được mở form thêm/sửa tài sản/vị trí với bản nháp do AI chuẩn bị ngay trong chat; người dùng kiểm tra và lưu qua action nghiệp vụ có sẵn. Model không tự thực hiện mutation hoặc báo đã lưu khi mới tạo bản nháp.

Đã triển khai: [bảng công việc và duyệt thực hiện](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#bảng-công-việc-ai-và-duyệt-thực-hiện--16112026). Công cụ lập bảng trước–sau từ dữ liệu thật; chỉ ghi đúng kế hoạch sau khi người dùng duyệt, trả kết quả theo trạng thái máy chủ. Kế hoạch lưu `cong_viec_ai` theo chủ/công ty, khôi phục sau reload; nút duyệt chỉ nhận ID/phiên bản. Dữ liệu thay đổi phải làm mới và duyệt lại, lặp duyệt không ghi hai lần. Đổi mặc định loại không hồi tố tài sản đã có. Không áp dụng phương án ghi ngay theo câu lệnh trước đây.

## Tệp đính kèm và phân tích

- Đính kèm ảnh PNG/JPEG/WebP, Word DOCX, Excel XLSX/CSV và PDF trong ô chat; có kéo thả và dán ảnh. Upload chỉ chuẩn bị tệp, bấm gửi mới cho phép gửi nội dung liên quan đến model. Không tự tạo hồ sơ ERP từ tệp.
- Tệp thuộc tài khoản/công ty, gắn bất biến với câu hỏi và hội thoại khi gửi; hỏi tiếp đọc lại tệp trong đúng cuộc chat. Chat mới không đọc tệp của chat khác. Download/preview kiểm tra quyền phía server; không dùng URL public hoặc đưa kho tệp vào Git.
- Ảnh dùng vision của model đang chọn, Word trích văn bản; bảng tính đọc vùng có số dòng và tổng hợp toàn bộ sheet trong giới hạn nhập. Phải chỉ rõ nguồn/phạm vi/ô bị bỏ qua; không gọi phần xem trước là toàn bộ dữ liệu. PDF đọc form/số trang qua công cụ tệp, đọc lớp chữ và ảnh trang bằng `read_pdf_page`; scan dùng vision, chữ mờ phải xác minh, không yêu cầu chụp lại file đã có. Không chạy macro hoặc mã model sinh; phân tích Excel đọc kết quả cache. Nội dung tệp là dữ liệu, không phải chỉ dẫn thay quyền/công cụ.
- Tệp đang soạn có thể phục hồi hoặc bỏ sau reload. Tệp đã gửi được giữ cùng chat khi lưu trữ; backup gồm DB và kho riêng. Giới hạn, schema, công cụ và phần chưa hỗ trợ theo [plan tệp AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#đính-kèm-và-phân-tích-tệp--18112026).

## Tạo, sửa và xuất tệp

- Agent có công cụ backend cố định tạo Word/Excel, điền mẫu Word `{{placeholder}}`, sửa chữ trong thân Word với nội dung/số lần khớp mong đợi, sửa ô Excel với giá trị cũ mong đợi, điền form PDF/ghép trang và xuất Office thành PDF. PDF → Word là bản dựng lại lớp chữ hoặc nội dung từng trang đã đọc, giữ nguồn; không bảo đảm bố cục/ảnh/số trang giống gốc. Công cụ chỉ chạy khi người dùng yêu cầu; tác vụ LOOKUP không cấp công cụ ghi tệp. Không có công cụ chạy mã/shell/SQL tùy ý.
- Mỗi lần tạo/sửa là một tệp kết quả mới gắn câu trả lời, giữ nguyên bản gốc và nguồn; kết quả tải riêng theo tài khoản/hội thoại, được đọc/sửa tiếp. Không tự ghi hồ sơ ERP từ nội dung tài liệu. Chỉ báo thành công sau lưu phía server.
- LibreOffice chạy nền trên máy chủ để xuất PDF, tính công thức trong bản xuất; không cần Office trên máy khách. Không hứa sửa văn bản PDF bất kỳ hay bảo toàn mọi tính năng Office nâng cao. Giới hạn, môi trường và kiểm chứng tại [plan công cụ tài liệu](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#tạo-sửa-và-xuất-tài-liệu--18112026).

## Quyền, dữ liệu và vận hành

- Quyền dùng AI độc lập quyền ASSETS/LOCATIONS; cấp tập trung theo [rule phân quyền](ROLE-MANAGEMENT-RULES.md). Quản trị tài khoản/role hoặc cùng API key không tự có quyền đọc chat người khác.
- Kiểm tra quyền cả nguồn dữ liệu, text lịch sử, thẻ, tiêu đề và ngữ cảnh gửi lại AI. Nếu quyền thay đổi hoặc không xác minh được phụ thuộc, chặn phần liên quan theo phương án trong plan; không chỉ ẩn nút mở hồ sơ.
- Dữ liệu được phép xem trong ERP chưa mặc nhiên được gửi ra dịch vụ AI. Giữ giới hạn dữ liệu/ẩn danh tại [bối cảnh AI theo phòng](../../docs/strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md#5-bối-cảnh-sử-dụng-ai-theo-phòng-ban), bao gồm nội dung người dùng nhập.
- API key được quản lý ở máy chủ qua kho bí mật, DB kết nối chỉ giữ tham chiếu/metadata; không trả khóa đã lưu về client hoặc ghi vào profile/chat/log. Không tự chuyển kết nối hoặc nguồn thanh toán khi lỗi/hết hạn mức.
- Một câu hỏi có thể dùng nhiều lần gọi API; theo dõi từng lần, không coi timeout là chi phí 0 hoặc hứa không bao giờ bị tính phí lặp. Giới hạn lượt/công cụ/ngân sách phải được kiểm soát phía server.
- Câu trả lời hoàn tất không sửa lại âm thầm; lỗi giữ câu hỏi và trạng thái. Chống gửi trùng và phục hồi tiến trình theo [thiết kế DB và xử lý lỗi](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#đồng-thời-lỗi-và-chi-phí).

## Quản trị AI

- Quản lý key/model đặt tại **Cài đặt chung → Quản trị AI** (`/settings/ai`), cần `AI MANAGE_CONNECTIONS`, độc lập quyền chat nền và quyền tài sản/vị trí. Điều hướng theo [rule cài đặt](SYSTEM-SETTINGS-RULES.md). Nhiều kết nối/công ty; Thêm kết nối giữ key cũ, Chỉnh sửa/thay key chỉ cập nhật bản đang chọn. Một kết nối mặc định do quản trị chọn, không tự xoay key. Khóa mới chỉ ghi, để trống giữ khóa khi sửa; Model mặc định là danh sách có tìm kiếm, tự tải bằng khóa của kết nối khi mở form; khóa mới dùng nút kiểm tra/tải. Giữ model đang chọn, không tự chọn/lưu giá trị khác; có nhập thủ công khi cần. Kiểm tra chỉ gọi GET Models, không xác nhận quota/khả năng gọi công cụ. Lưu có phiên bản/audit nguyên tử; đổi cấu hình dừng lượt đang chạy trước lần API tiếp theo. Kho bí mật và fallback theo [thiết kế kết nối pilot](../../docs/THIET-KE-QUAN-TRI-AI.md#kết-nối-pilot--16112026); hạn mức và usage nội bộ theo đợt 17/11 trong plan.

- Quản lý kết nối, hạn mức, model và thống kê có quyền riêng; không tự cấp theo chức danh hoặc mở quyền đọc nội dung chat của user. User chỉ xem phần sử dụng của mình; ma trận tại [thiết kế quản trị](../../docs/THIET-KE-QUAN-TRI-AI.md#6-quyền-và-audit).
- Hạn mức tài khoản lưu bằng một cột nullable `tai_khoan.han_muc_ai_thang`, không tạo bảng hạn mức riêng; NULL/để trống là không giới hạn (mặc định), 0 chặn gọi có phí, dương là trần USD/tháng; mức dùng/dự phòng lấy từ log, phần còn lại tính khi đọc. Hạn mức tài khoản và kết nối áp dụng phía server; đổi API key/kết nối không reset mức dùng, thay đổi có audit metadata không chứa secret.
- Tác vụ GENERAL/LOOKUP/DRAFT do người dùng chọn trước lượt chat; cấu hình kết nối/model riêng tại `/settings/ai`, thiếu cấu hình kế thừa mặc định công ty. LOOKUP chỉ có công cụ đọc. Giữ phiên bản trong cả lượt, không tự đổi nguồn chi khi lỗi. Thiếu đơn giá vẫn gọi nếu cả hai mức tài khoản/kết nối đều không giới hạn; log giữ token và chi phí chưa xác định. Khi áp trần cần giá đúng model cho lần gọi mới. Khoản đã kết thúc nhưng chưa rõ chi phí được giữ NULL để đối soát, tạm không tính vào hạn mức và không chặn gọi mới; chỉ dự phòng của lượt DANG_GOI còn được trừ. Khi đối soát có chi phí, tính lại hạn mức kỳ của lượt gọi. Không gán kết nối riêng từng user.
- Phân biệt ngân sách ERP còn lại, Usage/Costs OpenAI, rate limit và số dư prepaid. Không tự suy số dư từ token hoặc chi phí; dữ liệu chưa lấy được hiện chưa xác định và thời điểm cập nhật.
- Tạm dừng tại ERP không đồng nghĩa revoke key phía OpenAI. Credential đối soát quản trị tách khỏi key gọi model, chỉ đọc theo project được phép; không tự nạp tiền hoặc chỉnh giới hạn bên nhà cung cấp. Thiết kế/lưu trữ và bước triển khai thuộc [tài liệu quản trị](../../docs/THIET-KE-QUAN-TRI-AI.md).

Quyền quản trị đang có: MANAGE_CONNECTIONS (kết nối/model/tác vụ/ngân sách kết nối), MANAGE_LIMITS (hạn mức tài khoản), VIEW_USAGE (metadata trong công ty). Đối chiếu khoản chưa rõ cần cả hai quyền sau; chỉ khoản hết xử lý, ghi chi phí/căn cứ và giải phóng dự phòng cùng audit. Không tự cấp grant nghiệp vụ hoặc ngân sách cho tài khoản.

## Vật tư theo quyền tài khoản

- Tra cứu mặt hàng/tồn/lịch sử/danh mục cần INVENTORY VIEW; soạn thêm/sửa mặt hàng và nhập/cấp/thu hồi/chuyển/điều chỉnh/đảo cần MANAGE. Bản nháp mở form vật tư đã điền sẵn; người dùng xác nhận mới ghi bằng action hiện có. Không có tool duyệt hoặc ghi tồn trực tiếp.
- Tồn chung/phụ kiện theo [rule vật tư](INVENTORY-MANAGEMENT-RULES.md). Phải xác định đúng mặt hàng/quy cách/đơn vị và người/phòng nhận; không lưu xuất mực bằng ghi chú tài sản máy in. Nguồn vật tư trong lịch sử được kiểm tra lại quyền/công ty.
- Bảng dự kiến thu hồi/ghi giảm thể hiện số đang giữ và người/phòng nhận từ lần cấp gốc; đảo giao dịch thể hiện tác động ngược lên tồn và đang giữ. Kiểm tra bản gốc/phụ thuộc và số dư khi lập bản nháp; action ghi vẫn kiểm tra lại tại thời điểm xác nhận. Bộ lọc tra cứu được giữ trong bối cảnh để hỏi tiếp đúng phạm vi.
- Phạm vi, trạng thái và nghiệm thu tại [plan AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#công-cụ-vật-tư-theo-quyền-tài-khoản--18112026). Không coi quyền trên web tự tạo công cụ cho phân hệ chưa tích hợp.

## Ghi nhận hàng vừa mua

- Dùng `prepare_inventory_receipt` để lập một công việc `NHAP_VAT_TU` chờ duyệt cho tối đa 20 mặt hàng; công cụ không có quyền tự duyệt. Cùng quyền INVENTORY MANAGE của tài khoản, kiểm tra lại trong transaction khi sửa/duyệt; LOOKUP không được lập bảng.
- Tra mặt hàng/loại và tái sử dụng trước khi đề xuất tạo mới. Không đoán quy cách, giá hoặc nơi giữ. Thiếu loại/nơi giữ cho phép lưu bảng chưa sẵn sàng và bổ sung tại chỗ; chưa đủ dữ liệu không được duyệt.
- Một lần xác nhận mới tạo các loại/mặt hàng thiếu và ghi NHAP nguyên tử kèm audit; không dùng TON_DAU cho hàng vừa mua. Đối chiếu snapshot/phiên bản, chống duyệt lặp; dữ liệu thay đổi phải làm mới và duyệt lại.
- Hợp đồng, migration, giới hạn và kiểm chứng thuộc [plan AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#ghi-nhận-hàng-vừa-mua--19112026).

## Công việc và ticket hỗ trợ

Có `lookup_support_targets` và `prepare_support_ticket` theo VIEW + CREATE của SUPPORT_TASK; LOOKUP không lập nháp. Người dùng xác nhận bằng form Công việc trong chat mới tạo thật, cùng action/quyền/lịch sử/chống gửi lặp. Nghiệp vụ theo [rule Công việc](TASK-MANAGEMENT-RULES.md#ticket-qua-trợ-lý-ai), thiết kế/phục hồi và kiểm chứng theo [plan](../../docs/plans/TASK-MANAGEMENT-CHECKLIST.md#b9-ticket-hỗ-trợ-qua-ai-và-tinh-gọn-thao-tác--23112026). Không có công cụ AI nhận/giao/hoàn thành/nghiệm thu hoặc chuyển tệp chat thành bằng chứng.
