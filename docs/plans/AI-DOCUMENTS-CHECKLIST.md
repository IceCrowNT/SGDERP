# Thử nghiệm hồ sơ thanh toán AI

## Trạng thái hiện tại — TẠM HOÃN (27/10/2026)

Người phụ trách đã duyệt gỡ mô-đun thử nghiệm khỏi ứng dụng. Các checklist bên dưới là lịch sử, không mô tả tính năng đang hoạt động.

- [x] Lưu bản thử nghiệm vào nhánh Git cục bộ `archive/ai-documents-20261027`, commit `168109ff0d995b250001b67f1fcf0cc79bdf3b68`. Không đổi nhánh làm việc hoặc index hiện tại, không push lên remote.
- [x] Gỡ nhóm menu Công cụ AI trên desktop/mobile, form thử nghiệm, khối cấu hình API và bộ xuất Word riêng của pilot.
- [x] Giữ `/ai-documents` là Server Component nhỏ thông báo “Tính năng tạm hoãn”, yêu cầu đăng nhập, không import mô-đun thử nghiệm hoặc đọc cấu hình OpenAI.
- [x] Gỡ dependency `docx` và phụ thuộc riêng: npm loại 19 package; package/lockfile chỉ xóa mục liên quan, không nâng phiên bản thư viện.
- [x] Gỡ bộ kiểm thử pilot; thay bằng kiểm tra URL cũ, menu và đường quay về tổng quan.
- [x] Giữ tài liệu ý tưởng, biểu mẫu/báo cáo Word đã xuất và dữ liệu nghiệp vụ. Không thay schema, tài khoản, role hoặc quyền SYSTEM dùng chung.
- [x] TypeScript, ESLint phần thay đổi và production build webpack đạt; 2/2 Playwright đạt (đăng nhập, URL cũ, không còn menu/form với quyền SYSTEM, mobile và quay về tổng quan). Không còn import mô-đun AI, đọc OPENAI_* hoặc dependency docx trong mã vận hành/lockfile.
- [x] Giữ Next.js 16.4.0 theo yêu cầu; build tiếp tục sau nhắc nâng cấp bảo mật, không tự nâng phiên bản.

### Khôi phục khi được duyệt lại

Dùng `git show archive/ai-documents-20261027:<đường-dẫn>` để đọc lại tệp. Nhánh lưu page, hai component AI, `src/lib/payment-document.ts`, test và checklist trước gỡ. Khôi phục từng tệp cần thiết và cài lại dependency có chủ đích; không checkout cả nhánh hoặc ghi đè package/lockfile hiện tại vì nhánh lưu có nền lịch sử cũ. Đây là điểm lưu mã cục bộ, chưa phải bản phát hành hay bản chạy độc lập đầy đủ.


## Lịch sử bản thử nghiệm (đã gỡ khỏi ứng dụng)

- [x] Menu Công cụ AI → Hồ sơ thanh toán AI tại `/ai-documents`, dùng chung navigation desktop/mobile.
- [x] Guard đăng nhập và quyền `SYSTEM: VIEW/MANAGE` cho pilot; menu ẩn khi thiếu quyền. Chưa cấp thêm quyền hay sửa vai trò trong DB.
- [x] Nhập thông tin có validation, dùng dữ liệu giả lập, xem/bỏ ảnh JPEG/PNG/WebP tối đa 5 MB tại trình duyệt.
- [x] Tạo bộ yêu cầu gồm kỹ năng, quy tắc và khung đề nghị thanh toán/tờ trình; sao chép để dùng thủ công trong ChatGPT. Chỉnh dữ liệu làm mất hiệu lực bản yêu cầu cũ.
- [x] Ghi rõ chưa kết nối AI; không lưu DB, không upload ảnh, không nhận credential và không tự đọc hóa đơn; đã bổ sung xuất Word theo mẫu từ dữ liệu nhập.

## Ý tưởng tồn đọng — chỉ tiếp tục khi được duyệt lại

- [ ] Xác minh điều kiện Sign in with ChatGPT và gói tài khoản thực tế hoặc chọn API riêng theo phòng.
- [ ] Chốt quyền riêng cho phân hệ và phạm vi người/phòng được sử dụng.
- [ ] Nhận biểu mẫu chính thức; khung thử nghiệm không phải biểu mẫu được duyệt.
- [ ] Tích hợp đọc hóa đơn, người dùng xác nhận và sinh nội dung AI; xuất DOCX theo mẫu đã được bổ sung.
- [ ] Thiết kế lưu hồ sơ, quyền dữ liệu và hạn mức sử dụng nếu được giao triển khai.

## Kiểm thử

- Kiểm thử trình duyệt dùng session fixture ký cục bộ, không đăng nhập 1Office và không ghi dữ liệu nghiệp vụ. Không thay thế kiểm thử đăng nhập tài khoản thật.
- [x] TypeScript và ESLint cho các file mới đạt; kiểm thử Chrome 2/2 đạt: chưa đăng nhập/thiếu quyền bị chặn, menu có quyền, validation, dữ liệu mẫu, tạo yêu cầu và vô hiệu hóa đầu ra khi sửa, viewport mobile không tràn ngang.
- [x] `git diff --check` đạt. Chưa kiểm thử kết nối AI vì chưa triển khai kết nối.

## Bổ sung xuất Word

- [x] Tạo và tải DOCX gồm đề nghị thanh toán và tờ trình từ dữ liệu đã validation; vẫn chưa kết nối AI.
- [x] Chrome 3/3 đạt, gồm tải file `.docx`, kiểm tra hai tiêu đề, số tiền mới sửa, ngày lập, ký tự XML và ngắt trang. TypeScript/ESLint đạt.
- Chưa kiểm tra trực quan phân trang trong Word/LibreOffice; máy chưa có LibreOffice. Nội dung dài có thể tăng số trang; mỗi văn bản luôn bắt đầu trên trang mới.

## Phương án Sign in with ChatGPT — được người phụ trách chọn

- [x] Chốt hướng nghiên cứu/triển khai Sign in with ChatGPT theo yêu cầu; không tự chuyển sang API key.
- [x] Đọc tài liệu chính thức: [đăng ký client](https://developers.openai.com/siwc/request-client-id), [web OAuth](https://developers.openai.com/siwc/website), [quyền sử dụng gói](https://developers.openai.com/siwc/quickstart).
- [x] Kiểm tra chỉ tên khóa cấu hình: chưa có cấu hình ChatGPT OAuth trong môi trường project; không đọc/in giá trị bí mật.
- [x] Thêm khối thiết lập và liên kết đăng ký; nút Continue with ChatGPT bị vô hiệu hóa, ghi rõ chưa triển khai OAuth.
- [ ] Nhận client ID được cấp cho SDG, callback đã đăng ký, phương thức xác thực và xác nhận quyền dùng hạn mức AI. Đây là điều kiện bên ngoài đang thiếu.
- [ ] Khi có đăng ký, triển khai Authorization Code + PKCE, state một lần, nonce, xác minh chữ ký/issuer/audience/expiry; ràng buộc tài khoản ChatGPT với người dùng ERP hiện tại.
- [ ] Tích hợp gọi AI theo contract được cấp, quản lý hạn mức/hết phiên/ngắt kết nối và kiểm thử tài khoản thật.

Không dùng client ID của Codex hay luồng dynamic registration nguồn mở để thay thế quyền được cấp cho ứng dụng web nội bộ. Không yêu cầu mật khẩu/cookie ChatGPT. Chưa gửi đăng ký thay công ty. Thêm nút thiết lập không đồng nghĩa đã tích hợp đăng nhập hoặc gọi AI.

Thông tin để chuẩn bị đăng ký: ứng dụng “SDG ERP”, web nội bộ của Sao Đỏ Group; mục đích đọc hóa đơn và soạn đề nghị thanh toán/tờ trình, xuất DOCX tại ERP; mong muốn sử dụng hạn mức ChatGPT của người dùng. Cần người phụ trách bổ sung tên miền triển khai, người liên hệ và thông tin pháp nhân chính thức. Callback sẽ được chốt theo môi trường và đăng ký được cấp, chưa có callback vận hành ở bản này.
- [x] Sau khi thêm khối thiết lập: TypeScript, ESLint file thay đổi và `git diff --check` đạt; kiểm thử Chrome 3/3 đạt cho guard, form và xuất Word. Chưa kiểm thử đăng nhập ChatGPT thật vì chưa có client được cấp.

## Chuyển sang API key — 23/10/2026 (thay lựa chọn Sign in ở trên)
- [x] Theo yêu cầu mới, thay giao diện chờ OAuth bằng cấu hình OpenAI API key/model, hiện–ẩn key, xóa cấu hình, hướng dẫn chi phí và link tạo key/bảng giá.
- [x] Cấu hình chỉ nằm trong bộ nhớ tab; không lưu browser storage/DB, không gửi credential. Nhãn thể hiện chưa xác thực; chưa gọi OpenAI hoặc phát sinh phí. Giữ chức năng xuất Word hiện có.
- [ ] Triển khai server-side gọi API, kiểm tra model, đọc ảnh/sinh nội dung và quản lý key theo phạm vi được chốt; chưa có key thật để kiểm thử.
- [x] TypeScript/ESLint phần UI đạt; 4/4 Chrome E2E đạt: quyền, form, xuất Word, validation key/model, hiện–ẩn, xóa/tải lại mất key và mobile không tràn ngang. Đã xem ảnh mobile; chỉ dùng key giả, không gọi API thật.

## Đính chính cấu hình API phía server — 23/10/2026
- [x] Theo yêu cầu, bỏ hoàn toàn form nhập key/model trên tab. Component server đọc sự tồn tại OPENAI_API_KEY/OPENAI_MODEL, chỉ render trạng thái; dùng slot ReactNode để đưa vào client UI, không truyền giá trị bí mật.
- [x] Chuẩn bị placeholder trống trong .env.local nếu chưa có biến ở file env khác; giữ giá trị đã tồn tại, không log key, không thay bằng key giả. .env* được gitignore.
- [ ] Cấu hình key/model thật tại máy chủ, triển khai và kiểm thử gọi AI. Có biến môi trường không đồng nghĩa đã kết nối thành công.
- [x] Kiểm thử phát hiện submit trước khi form client sẵn sàng; chặn nút Chuẩn bị yêu cầu đến khi React Hook Form isReady. Chạy lại 4/4 Chrome đạt; xác nhận không còn input key/model và .env.local bị gitignore. TypeScript/ESLint đạt trước chỉnh isReady; kiểm tra lại sau chỉnh.

## Hồi quy sau tách nhân sự/tài khoản — 27/10/2026

- [x] 4/4 Playwright đạt: quyền SYSTEM, chuẩn bị yêu cầu, xuất DOCX và cấu hình API phía server.
- [x] Fixture chuyển từ JWT giả có quyền tự khai sang tài khoản/role tạm có trong DB, dọn sau test; session nay đọc quyền hiện hành của từng tài khoản. Không đổi nghiệp vụ AI, không gọi API trả phí.
