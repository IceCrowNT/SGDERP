# Tài khoản mặc định và không gian cá nhân

- [x] Chat dashboard là khả năng nền của mọi tài khoản hợp lệ gồm DEFAULT; không cấp grant nghiệp vụ. Chi tiết và kiểm chứng tại [plan AI — 20/11](AI-ASSISTANT-CHECKLIST.md#mở-chatbot-cho-mọi-tài-khoản--20112026).

Cập nhật **20/11/2026 — đã kiểm chứng chính sách mật khẩu tạm đã chốt lại; bố cục Bàn làm việc và workflow cá nhân đã kiểm chứng; thông báo cho workflow kéo thả chưa triển khai**. Đối chiếu code/DB xác nhận profile, dashboard, đổi mật khẩu và avatar dùng các bảng sẵn có; cột cá nhân hóa và hai bảng chat mới do plan AI quản lý; DEFAULT không grant, cờ đổi mật khẩu/trigger đã có. Số tài khoản và grant tại các mốc backup/reset bên dưới là lịch sử; hiện trạng tại [bảng đối chiếu](README.md#đối-chiếu-plan-với-code-và-db). Chi tiết tại [Thiết kế tài khoản và không gian cá nhân](../THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md).

Rule nghiệp vụ: [PROFILE-DASHBOARD-RULES](../../.agents/rules/PROFILE-DASHBOARD-RULES.md).

Mở rộng đã triển khai ngày 16/11/2026: chat trên dashboard và cá nhân hóa AI trong profile được quản lý tại [Plan trợ lý AI](AI-ASSISTANT-CHECKLIST.md). Profile có hộp cài đặt cá nhân hóa AI, dashboard lưu/mở lại hội thoại; plan AI sở hữu cột/bảng, quyền, lịch sử và nghiệm thu của phần mở rộng này.

Bố cục dashboard đã duyệt áp dụng ngày 17/11: [không gian làm việc với AI](AI-ASSISTANT-CHECKLIST.md#đề-xuất-dashboard-là-không-gian-làm-việc-với-agent--17112026). Chuyển card/biểu đồ workflow thành Việc của tôi, giữ đầy đủ quyền và việc được giao; tài khoản chưa có AI vẫn có dashboard cá nhân. Đã thay giao diện và đồng bộ rule/thiết kế cá nhân; kiểm chứng ứng dụng theo mục tương ứng trong plan AI.

## Đồng bộ giao diện — 09/11/2026

- [x] Điều chỉnh ngày 20/11/2026: gỡ bản mẫu KPI khỏi Bàn làm việc cá nhân và chuyển sang tổng quan Nhân sự (`/hr#kpi`); giữ dashboard cá nhân cho AI/công việc. Giữ sửa đồng bộ URL tab qua `useSyncExternalStore` đã kiểm chứng. Phạm vi và kiểm chứng do [plan HR](HR-CHECKLIST.md#bản-mẫu-kpi-trên-dashboard--19112026) sở hữu; chưa triển khai nghiệp vụ hoặc quyền KPI.

- [x] Bổ sung đích trở về hồ sơ tài sản sau đăng nhập/đổi mật khẩu bắt buộc theo yêu cầu QR ngày 16/11; chỉ nhận `/assets?asset=<id>` hợp lệ. Không thay quyền hoặc bỏ bước đổi mật khẩu. Kiểm chứng theo [plan tài sản](ASSET-MANAGEMENT-CHECKLIST.md#liên-kết-hồ-sơ-và-tem-qr--16112026).

- [x] Profile có thẻ định danh, biểu tượng phòng/chức vụ, nhãn tài khoản và nhóm thông tin; các tab, trường sửa, đổi mật khẩu và upload giữ nguyên hành vi.
- [x] Nhóm không gian cá nhân 5/5 E2E đạt; kiểm tra Chrome desktop/mobile, không tràn ngang. TypeScript/lint đạt; giữ hành vi cập nhật liên hệ, avatar và mật khẩu.

## Phạm vi

- DEFAULT: dashboard của mình, profile và đổi mật khẩu; không mặc định được xem HR hoặc dùng workflow.
- Tạo tài khoản tùy chọn khi thêm người, tự sinh `namdh`, `namdh1`…; không bắt chọn role ngay. Chọn sẵn cho người tạo đủ quyền, vẫn bỏ chọn được.
- Profile sửa liên hệ/ảnh; dữ liệu cơ cấu, mã nhân sự và quyền chỉ xem. Dashboard lấy việc và yêu cầu thực tế của người đăng nhập.
- Giữ 0..N tài khoản/người, dữ liệu và quyền cũ. Không tạo tài khoản hàng loạt hoặc tự cấp workflow.

Đã sao lưu nhất quán DB cục bộ trước thay đổi: 73 nhân sự, 61 tài khoản; giữ dữ liệu người dùng vừa bổ sung. Migration `20261105120000_khong_gian_ca_nhan` đã thử toàn chuỗi trên DB tạm và áp dụng local; thêm cờ đổi mật khẩu/DEFAULT, không đổi tài khoản cũ. Đối chiếu sau kiểm thử: toàn bộ bản ghi cũ và grant cũ không đổi; dữ liệu kiểm thử đã dọn.

## Cấp tài khoản và xem mật khẩu — 16/11/2026

### A. Đặc tả yêu cầu

**Chốt lại ngày 20/11/2026, thay chính sách cấp mới ngày 16/11:** mật khẩu được cấp lần đầu hoặc do admin đặt lại là mật khẩu tạm. Người dùng phải đổi thành mật khẩu riêng trước khi dùng hệ thống. Áp dụng cả tạo kèm hồ sơ và tạo tại `/accounts`, dù admin nhập tay hay hệ thống tự sinh; tài khoản quản trị do seed tạo mới cũng áp dụng.

| Tình huống | Hành vi cần đạt |
| --- | --- |
| Đăng nhập bằng mật khẩu mới được cấp/reset | Chuyển đến đổi mật khẩu; chưa truy cập nghiệp vụ hoặc sửa thông tin khác |
| Mật khẩu hiện tại sai, nhập lại không khớp hoặc chưa đủ độ dài | Báo lỗi, giữ yêu cầu đổi; không đổi mật khẩu hoặc phiên |
| Dùng lại chính mật khẩu tạm làm mật khẩu mới | Cho phép; vẫn cần nhập đúng mật khẩu hiện tại và xác nhận khớp, lưu thành công mới bỏ yêu cầu đổi |
| Đổi thành công | Cho vào hệ thống, phiên cũ hết hiệu lực; các lần đăng nhập tiếp theo không bị ép đổi lại |
| Admin chỉ sửa tên, trạng thái hoặc quyền, không nhập mật khẩu | Giữ nguyên cờ bắt buộc đổi, không tự cấp mật khẩu mới |

Nút con mắt ở hai form cấp tài khoản vẫn dùng được. Theo điều chỉnh tiếp theo ngày 20/11, cho phép giữ nguyên mật khẩu tạm khi hoàn tất form; bỏ đề xuất thao tác nghi lộ. Quên mật khẩu qua OTP email/Zalo đang được xem xét, chưa triển khai kết nối hoặc luồng khôi phục. Giữ trạng thái tài khoản hiện có; không reset hàng loạt hoặc chạy seed trên dữ liệu vận hành.

**Phương án quên mật khẩu đang xem xét, chưa duyệt triển khai:** ưu tiên OTP email, Zalo là kênh bổ sung. Nhập tên đăng nhập → gửi mã tới kênh khôi phục đã xác minh của tài khoản → xác minh OTP → tự đặt mật khẩu → đăng nhập lại; không buộc đổi lần nữa vì người dùng đã tự đặt. Không cho nhập một địa chỉ/số mới tại màn hình quên mật khẩu để nhận mã. Cần chốt nguồn email/số điện thoại, bước xác minh quyền sở hữu và nhà cung cấp gửi trước khi thiết kế DB/kết nối. Hiện chưa có tích hợp gửi OTP trong mã ứng dụng.

### B. Thiết kế kỹ thuật

Dùng cột và cơ chế phiên hiện có theo [Thiết kế DB cần giữ](#thiết-kế-db-cần-giữ); không cần migration hay thay ba rule kỹ thuật chung. `saveAccount`/`saveEmployee` đặt cờ `true` khi cấp mật khẩu; seed chỉ đổi nhánh `create`. `changeMyPassword` kiểm tra mật khẩu trong transaction, tắt cờ khi lưu thành công, tăng phiên bản phiên và cấp lại cookie. Guard ở session, middleware, actor và profile giữ nguyên.

- [x] Bật yêu cầu đổi cho cả hai luồng cấp mới và seed tạo mới; reset vẫn bật yêu cầu và thu hồi phiên cũ. Màn hình bàn giao dùng cùng thông báo mật khẩu tạm.
- [x] Đồng bộ rule, thiết kế cá nhân và tham chiếu HR; giữ nút con mắt và trạng thái dữ liệu hiện có.
- [x] Đối chiếu trước sửa bằng transaction `READ ONLY`: 3/5 tài khoản local còn bật cờ, đều đang mở và tạo trước 16/11. Giữ nguyên các cờ này; không suy trạng thái lần đăng nhập đầu của tài khoản cũ từ ngày tạo.
- [x] E2E: mật khẩu tự sinh/nhập tay từ HR và Tài khoản đều yêu cầu đổi; reset buộc đổi lại và vô hiệu phiên cũ; đổi thành công mới mở nghiệp vụ và không ép lại ở lần đăng nhập kế tiếp.
- [x] Kiểm chứng lỗi mật khẩu hiện tại/nhập lại không làm mất cờ; giữ phiên/tài khoản khác cùng người và audit không chứa mật khẩu.
- [x] Hồi quy con mắt, bàn phím/mobile 390px (đã xem ảnh), profile/avatar, quyền và dashboard 205 hồ sơ. Cả 6 E2E trong `personal-workspace.spec.ts` đạt trên DB khôi phục riêng. Lượt đầu khi dev biên dịch có một lần chuyển về login thay vì profile; chạy riêng và chạy lại toàn bộ đều đạt, chưa tái hiện nguyên nhân, không sửa xác thực để né lỗi. Đã dọn DB thử; không ghi dữ liệu vận hành. Bằng chứng cục bộ tại `outputs/password-policy-20261120/`.
- [x] TypeScript, lint các file thay đổi và kiểm tra diff đạt; 45 liên kết/anchor trong tài liệu liên quan hợp lệ. Seed chỉ kiểm tra tĩnh, không chạy lại trên dữ liệu vận hành.

- [x] Điều chỉnh tiếp theo 20/11: bỏ kiểm tra mật khẩu mới phải khác mật khẩu hiện tại; giữ kiểm tra mật khẩu hiện tại/độ dài/xác nhận và thu hồi phiên sau lưu. Đồng bộ rule và thiết kế.
- [x] Kiểm thử lại trường hợp dùng chính mật khẩu tạm: bỏ cờ sau lưu, thu hồi phiên cũ và đăng nhập lại bình thường; hồi quy lỗi nhập sai/không khớp. Hai E2E mục tiêu đạt sau chạy lại, TypeScript/lint và 18 liên kết/anchor đạt. DB thử áp dụng migration có sẵn của công việc để khớp Prisma Client được thay đổi đồng thời; không áp dụng trên DB vận hành. Lỗi điều hướng về login ở lượt dev biên dịch đầu vẫn gặp, chạy lại đạt; chưa kết luận nguyên nhân hoặc sửa xác thực. Bằng chứng tại `outputs/password-reuse-20261120/`.

Định hướng kỹ thuật OTP (chưa triển khai): mã ngẫu nhiên, lưu an toàn, dùng một lần, hết hạn; giới hạn gửi lại và số lần nhập sai; phản hồi không tiết lộ tài khoản tồn tại; chỉ đổi mật khẩu sau xác minh thành công và thu hồi phiên cũ. Tham khảo [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). Kênh Zalo cần AppID/OA liên kết, ủy quyền và mẫu chứa mã xác thực đã duyệt; có phí gửi theo mẫu, theo [hướng dẫn chính thức Zalo](https://zalo.solutions/blog/cach-su-dung-va-ung-dung-cua-mau-tin-zns-xac-thuc-/g8yv8lcpvmj0c0wonqbpibgj). Chưa thay schema, cấu hình hoặc tích hợp nhà cung cấp.

## Thực hiện theo thứ tự

- [x] Tách nghiệp vụ khỏi rule Frontend/Backend chung sang `PROFILE-DASHBOARD-RULES.md`; đăng ký router, giữ quyết định DB trong plan. Chỉ sắp xếp tài liệu, không thay tính năng.

- [x] Đối chiếu code và DB 11/11: workflow có chức năng và đã có grant ở một số role, chưa có mẫu/hồ sơ vận hành; DEFAULT là nhóm tối thiểu; STAFF mẫu đã được loại theo [plan phân quyền](ROLE-MANAGEMENT-CHECKLIST.md#bộ-vai-trò-tối-thiểu).
- [x] Lưu thiết kế luồng, trường profile, quyền, dashboard và thay đổi DB dự kiến.
- [x] Workflow: quyền cấp tập trung tại `/roles`, đã bỏ bước tự cấp/xác nhận tại trang quy trình; người đủ quyền thấy giao diện mẫu/hồ sơ và nút tạo mẫu đầu tiên.
- [x] Tài khoản: nhóm DEFAULT, sinh tên chống trùng đồng thời, mật khẩu cấp một lần; không bắt role ở form cơ bản. Chính sách đăng nhập đầu theo quyết định 20/11 trong mục cấp tài khoản ở trên.
- [x] Profile: liên hệ, ảnh, đổi mật khẩu; API/action chỉ dùng danh tính trong phiên.
- [x] Dashboard: bỏ khối không phục vụ cá nhân, thêm việc chờ duyệt/thực hiện và hồ sơ theo quyền thực tế.
- [x] Trực quan hóa dashboard (09/11): thẻ số liệu có biểu tượng, danh sách dạng bảng trên desktop/thẻ trên mobile, nhãn trạng thái, biểu đồ thanh yêu cầu cá nhân bấm lọc được, lối tắt dạng ô và minh họa trạng thái trống. Dùng dữ liệu/phạm vi quyền hiện có, không thêm dependency hoặc đổi DB.
- [x] Kiểm thử và cập nhật kết quả vào checklist liên quan; chỉ đánh dấu hoàn thành sau triển khai.
- [x] Tách ràng buộc DB tài khoản/cá nhân khỏi rule DB tổng quát, giữ tại mục thiết kế DB bên dưới.

## Thiết kế DB cần giữ

- `tai_khoan.bat_buoc_doi_mat_khau` Boolean default false; action cấp tài khoản mới (kể cả mật khẩu tự nhập) và reset đặt true; seed đặt true chỉ khi tạo mới admin. Tự đổi thành công đặt false. Không đổi cờ của tài khoản cũ hàng loạt. Migration `20261105120000_khong_gian_ca_nhan` không đổi mật khẩu, phiên hoặc grant của tài khoản cũ; chính sách 20/11 dùng cột hiện có, không cần migration.
- DEFAULT không có grant nghiệp vụ; trigger `chan_cap_quyen_default` chặn INSERT/UPDATE grant vào nhóm này, action chặn sửa/xóa role. Quyền bổ sung cấp qua role khác; không tự gán DEFAULT hoặc quyền mới hàng loạt cho tài khoản cũ.
- `ten_dang_nhap` unique toàn hệ thống. Cấp tên trong transaction theo thứ tự: hàng công ty → advisory phân quyền `(260126, companyId)` → advisory cấp tên toàn hệ thống `(260127, 0)`. Unique là ràng buộc cuối; không thay ID hoặc mã nhân sự để xử lý trùng tên.
- Profile dùng trường liên hệ/ảnh/địa chỉ sẵn có của `nhan_su`; dashboard đọc dữ liệu được phép xem, không tạo bảng profile/dashboard hoặc bản sao hồ sơ người. Quan hệ người–tài khoản và nghỉ việc theo [plan HR](HR-CHECKLIST.md#thiết-kế-db-cần-giữ).

## Hướng mở rộng cùng trình tạo quy trình

- [x] Bố cục dashboard được thay bằng Bàn làm việc ngày 17/11: Trợ lý AI và Việc của tôi; ưu tiên việc đến lượt trong khu workflow. Thanh yêu cầu hỗ trợ, số việc và thông báo theo quyền nằm trong Việc của tôi. Thông báo còn kế hoạch, lối tắt dùng menu chung.
- [x] Chốt số “đang đến lượt tôi” lấy từ bước PENDING và quyền hiện tại, không lấy từ thông báo.
- [ ] Bổ sung trung tâm thông báo trong ứng dụng và số chưa đọc sau khi workflow kéo thả có cơ chế kích hoạt bước ổn định.
- [ ] Kiểm thử thông báo trùng, chuyển giao, thu hồi quyền, nhiều tài khoản cùng nhân sự và liên kết mở đúng hồ sơ.

## Điều kiện nghiệm thu

- [x] Tạo hai người cùng kết quả chuẩn hóa tên, kể cả đồng thời, sinh tài khoản khác nhau; hồ sơ/tài khoản/role/audit lưu nguyên tử.
- [x] DEFAULT vào được dashboard/profile, không đọc HR/người khác hoặc tự cấp quyền qua request sửa tay; HR-only vẫn tạo người không kèm tài khoản.
- [x] Đổi mật khẩu/ảnh thành công; phiên cũ bị thu hồi, mật khẩu tài khoản khác không đổi; tài khoản hệ thống không cần hồ sơ giả.
- [x] Số việc cá nhân đúng với DB và danh sách chi tiết, kể cả trên 200 hồ sơ; thu hồi quyền/nghỉ việc chặn cả UI lẫn server.
- [x] Admin được cấp quyền điều phối dùng được màn hình workflow; người không có quyền không tự mở quyền, không tự duyệt hồ sơ của mình.
- [x] Giao diện desktop/mobile, lỗi form có dấu `*` và cảnh báo; hồi quy HR, tài khoản, phân quyền, workflow đạt.

## Kết quả kiểm tra

Dashboard 17/11: đã chuyển sang Bàn làm việc với AI và Việc của tôi. Hồi quy 205 hồ sơ đạt: số đếm, phân trang và cách ly quyền giữa các tài khoản. TypeScript/lint/build đạt; 8 E2E workspace và kiểm tra UI chỉ đọc trên local, desktop/mobile 390px, được quản lý tại [plan AI](AI-ASSISTANT-CHECKLIST.md#đề-xuất-dashboard-là-không-gian-làm-việc-với-agent--17112026). Ảnh và kết quả tại `outputs/ai-dashboard/`; chưa nghiệm thu trên điện thoại thật hoặc API thật.

Ngày 09/11: đã xử lý lỗi đăng nhập do tiến trình `next dev` từ 06/11 giữ Prisma Client cũ, truy vấn `tai_khoan.dinh_danh` sau khi DB đổi sang `id`. Client trên đĩa và migration đã đúng; khởi động lại web giải quyết lỗi, không đổi mật khẩu/quyền hoặc dữ liệu vận hành. Ba E2E Chrome đạt: đăng nhập và chặn tài khoản khóa/phiên bị thu hồi; form tương tác trên `localhost` và `127.0.2.2`. Sau đổi schema và generate Prisma Client phải khởi động lại tiến trình web/Studio, không chỉ chờ HMR.

38 E2E (nhân sự/tài khoản, phân quyền, workflow, trường bắt buộc và không gian cá nhân) + 7 unit đạt. TypeScript, lint phần thay đổi, Prisma schema diff rỗng và `git diff --check` đạt. Đã xem desktop/mobile; avatar được kiểm tra file thật, quyền đọc và xóa. Dashboard thử 205 hồ sơ và phân trang. Build `npm run build -- --webpack` đạt sau chạy lại thông báo nâng cấp bảo mật Next.js. Còn cảnh báo có sẵn về phiên bản Next.js/middleware; chưa nâng framework.

Kiểm tra 06/11: E2E Chrome luồng cấp/gỡ quyền tại `/roles` đạt; tài khoản nhận quyền dùng workflow ngay, thu hồi quyền chặn truy cập, người thiếu quyền không có nút tự cấp. TypeScript, lint phần thay đổi và `git diff --check` đạt. Không sửa dữ liệu/quyền vận hành.

Kiểm tra sau migration quy ước tên 06/11: 51 E2E + 9 unit đạt trên tiến trình ứng dụng mới; dữ liệu tài khoản/profile và các grant trở về đúng baseline sau khi dọn fixture.

Sau khi tạo lại database demo cùng ngày: chỉ giữ tài khoản quản trị do seed tạo; tài khoản/profile demo khác cần tạo lại từ giao diện theo luồng hiện hành.

Bước vận hành còn lại: người quản lý rà quyền/role đang có tại `/roles`, sau đó mở `/workflows`; tạo mẫu nháp và chọn người thử nghiệm thực tế. Lần đối chiếu 11/11 chỉ đọc, không cấp quyền hoặc tạo mẫu.


### Điểm vào Công việc — 20/11/2026

- [x] Dashboard có nút **Yêu cầu hỗ trợ**, thông báo chưa đọc, số việc cần nhận/đang làm/chờ nghiệm thu và liên kết tab tương ứng theo quyền SUPPORT_TASK. Giữ khu AI/workflow hiện có.
- [x] Tạo yêu cầu theo nhân sự đăng nhập; hạn mặc định trống, lỗi giữ nội dung. Backend/DB và kết quả kiểm chứng tại [plan Công việc](TASK-MANAGEMENT-CHECKLIST.md); không thêm bảng dashboard.
- [ ] Cấp quyền pilot và dùng thử theo kế hoạch Công việc.
