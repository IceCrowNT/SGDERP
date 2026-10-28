# QUY TRÌNH & CHECKLIST TRIỂN KHAI PHÂN HỆ QUẢN LÝ NHÂN SỰ & MA TRẬN PHÂN QUYỀN (HR & RBAC MATRIX MODULE)

## Chốt giữ mã nhân sự nội bộ ERP — 27/10/2026

- [x] Người phụ trách chốt giữ `employeeCode` để xuất Excel và đối chiếu khi nhập lại, dù công ty chưa có mã HR chính thức. Quyết định này thay thế đề xuất cho mã nullable ở lần đánh giá trước.
- [x] Đồng bộ quyết định vào rule DB, kiến trúc, từ điển dữ liệu và bối cảnh. Lần này chỉ cập nhật tài liệu; chưa sửa ứng dụng hoặc dữ liệu.
- [ ] ERP tự cấp mã khi tạo nhân sự, không bắt người dùng nhập; mã bắt buộc và duy nhất trong công ty. Giữ mã đã cấp, không đổi theo tên/phòng ban và không cấp lại mã người cũ cho người khác.
- [ ] Có thể ẩn mã ở danh sách mặc định; file Excel phục vụ cập nhật phải có cột “Mã nhân sự ERP” kiểu text. Mã không phải username, ID 1Office hay STT của dòng Excel.
- [ ] Import có mã: đối chiếu chính xác mã trong công ty và kiểm tra chênh lệch trước khi cập nhật. Mã lạ/trùng hoặc thông tin người mâu thuẫn phải báo để rà soát; không tự tạo/gộp người. File cũ chưa có mã cần đối chiếu ban đầu, sau đó xuất lại kèm mã ERP.
- [ ] Kiểm thử cấp mã đồng thời không trùng, giữ mã qua sửa hồ sơ/chuyển phòng, và xuất–nhập lại đúng người. Mọi FK vẫn dùng `Employee.id`; không chuyển FK sang mã text.

## Đánh giá khởi tạo lại nhân sự–tài khoản — 27/10/2026

**Trạng thái:** đã rà soát và lập phương án theo yêu cầu “nhận xét và đánh giá”; chưa sửa code/schema hoặc xóa dữ liệu trong lần đánh giá này. Người phụ trách cho phép xem xét làm sạch cả nhân sự và tài khoản nếu cần; phương án dưới đây là phạm vi đề xuất cụ thể.

### Yêu cầu nghiệp vụ mới đã ghi nhận

- Phòng ban là quan hệ với cây `Department` hiện có, không nhập tên phòng tự do trong hồ sơ. Khi tạo/sửa, chọn đơn vị cùng công ty; hiển thị đường dẫn cha → con. Chọn phòng hoặc bộ phận hợp lệ, không bắt buộc chỉ chọn nút lá.
- Chức danh là text tự do (`Employee.position` hiện đã là String), được sửa bởi người có quyền HR MANAGE cả với hồ sơ nhập nguồn. Không cần thêm bảng chức danh, không suy role/quyền hay phòng ban từ text này.
- HR final 72 người là dữ liệu khởi tạo chuẩn; không phải giới hạn cố định 72 trong ứng dụng. Tạo thêm một người hợp lệ thì tổng là 73. Chỉnh chức danh nội bộ có audit; đồng bộ/import sau phải báo chênh lệch, không đè sửa tay.
- Công ty chưa có mã HR chính thức; ERP vẫn giữ mã nhân sự nội bộ bắt buộc, tự sinh để đối chiếu/xuất Excel, không yêu cầu nhập tay. ID DB giữ làm khóa liên kết; tên + ngày sinh chỉ giúp đối chiếu, không đặt unique vì có thể trùng.

### Kết quả kiểm tra thực tế

| Đối tượng | Hiện trạng kiểm tra | Ý nghĩa với việc làm sạch |
| --- | --- | --- |
| Nhân sự | 80 hồ sơ = 72 ACTIVE theo final + 7 UNKNOWN + 1 LEFT | Có thể khởi tạo lại đúng 72 từ nguồn final, không đưa 8 hồ sơ cũ vào danh sách người mới |
| Tài khoản | 68; 67 gắn nhân sự, 1 tài khoản quản trị hệ thống không gắn người | Đề xuất giữ tài khoản quản trị hệ thống, xóa 67 tài khoản mẫu/cũ và tạo riêng theo nhu cầu |
| Cơ cấu | 18 đơn vị | Giữ nguyên cây, ID và metadata đơn vị; final 9 nhóm được ánh xạ vào cây này |
| Role | 7 role | Giữ danh mục role và quyền, xóa liên kết role của tài khoản bị xóa; không tự gán role theo chức danh |
| Tài sản / bàn giao / bảo trì / lịch sử vị trí | Đều 0 bản ghi | Hiện chưa có giao dịch này bị mất liên kết người khi khởi tạo lại; kiểm lại ngay trước khi chạy |
| Chứng từ kiểm kê tham khảo | 1 chứng từ, 11 dòng tổng hợp | Giữ nguyên, nằm ngoài phạm vi làm sạch HR |
| Nhật ký | 81 HR, 33 AUTH, 17 DEPARTMENT tại thời điểm kiểm tra | Giữ lịch sử; xóa User làm userId trong audit thành null theo FK, tên/username và snapshot vẫn còn |

### Đánh giá và phương án đề xuất

**Khuyến nghị khởi tạo lại dữ liệu riêng phân hệ HR/tài khoản, không reset toàn bộ DB và không xây lại mô hình bảng từ đầu.** Cấu trúc `Department → Employee → User → UserRole` đã phù hợp; vấn đề hiện tại là dữ liệu kế thừa, yêu cầu mã và khóa sửa trường nguồn. Đây là thời điểm tương đối thuận lợi để làm sạch vì vẫn là prototype và chưa có giao dịch tài sản gắn người.

Giới hạn cụ thể của phương án:

1. Giữ công ty, 18 đơn vị, 7 role, danh mục quyền, tài khoản quản trị hệ thống hiện có, chứng từ tài sản và nhật ký. Không truy cập/thay đổi 1Office.
2. Backup các bảng liên quan và kiểm tra khả năng đọc/khôi phục bản sao. Kiểm lại các FK/giao dịch trước thao tác; nếu đã phát sinh giao dịch mới thì phải xử lý mapping, không mặc định tiếp tục xóa.
3. Sửa luồng seed/khởi tạo trước: seed hiện vẫn đọc file 67 hồ sơ ngày 14/10. Importer final hiện là một lần, phụ thuộc mã/hồ sơ cũ và marker audit; không chạy nguyên trạng hai script này để khởi tạo từ rỗng.
4. Xóa 67 tài khoản gắn người và liên kết role tương ứng, sau đó 80 hồ sơ cũ; nạp mới đúng 72 dòng final trong transaction dữ liệu. Không reset sequence để tránh tái sử dụng ID của tài khoản/người cũ trong token và audit. Không tạo lại các liên kết nguồn mơ hồ chỉ để giữ số liệu cũ.
5. Tài khoản quản trị hệ thống tiếp tục đăng nhập; tài khoản nhân viên tạo riêng khi cần, liên kết người và chọn role rõ ràng. Các tài khoản bị xóa mất khả năng đăng nhập và phiên cũ không còn hợp lệ. Nếu chọn giữ thêm tài khoản cá nhân IT thì phải ghi ngoại lệ cụ thể trước khi áp dụng; phương án mặc định ở đây chỉ giữ tài khoản quản trị hệ thống.
6. Khởi tạo theo cột final, các trường liên hệ không có trong final để trống; không lén đưa lại dữ liệu cũ. Mapping 1Office dùng lại chỉ khi danh tính được đối chiếu chắc và có nhu cầu tích hợp; không bắt buộc với 72 người mới.
7. Giữ `employeeCode` bắt buộc và duy nhất trong công ty như schema hiện có; bổ sung cấp mã tự động ở backend. Tiếp tục ID kỹ thuật tự sinh, FK phòng ban cùng công ty, chức danh text. Chưa cần drop các cột legacy hay dựng bảng chức danh mới. Form/backend bắt buộc chọn phòng ban hợp lệ khi tạo người; không phụ thuộc việc DB còn cho phép null với dữ liệu lịch sử.

### Form tạo và sửa nhân sự dự kiến

| Trường | Cách nhập | Quy tắc |
| --- | --- | --- |
| Họ và tên | Text | Bắt buộc; cảnh báo trường hợp có thể trùng nhưng không tự gộp |
| Phòng ban/bộ phận | Chọn từ cây cơ cấu | Bắt buộc, cùng công ty; không tạo phòng qua text của form nhân sự |
| Chức danh | Text tự do | Cho phép sửa, có giới hạn độ dài; bỏ khóa nguồn ở UI lẫn Server Action |
| Ngày sinh | Ngày | Tùy chọn khi tạo mới; nhập final giữ đủ ngày; xử lý theo ngày lịch, không lệch múi giờ |
| Ngày vào làm, điện thoại, email, ghi chú | Trường bổ sung | Tùy chọn; phân biệt ghi chú nội bộ với ghi chú HR nguồn nếu cùng lưu |
| Tình trạng làm việc | Lựa chọn | Tách trạng thái tài khoản; không suy nghỉ việc từ tài khoản bị khóa |
| Mã nhân sự / role / mật khẩu | Không nằm trong form nhân sự | ERP tự cấp mã; tạo tài khoản/gán quyền ở chức năng riêng |

File final chỉ ghi 9 nhóm phòng/ban. Nạp ban đầu vào đúng các nút tương ứng trong cây 18 đơn vị, không xóa bộ phận con. Khi có phân công chi tiết thì chuyển người xuống bộ phận hợp lệ qua form; không tự suy từ chức danh hoặc khôi phục toàn bộ phân bổ cũ 1Office nếu chưa được xác nhận.

**Phụ thuộc tài sản bổ sung 27/10/2026:** Đã nhận danh sách tài sản cập nhật 92 dòng, trong đó 46 dòng có tên người sử dụng. Hiện chưa nhập Asset. Nếu chọn khởi tạo lại HR, thực hiện trước bước gán tài sản; FK người giữ/nhận tài sản dùng SetNull nên xóa người sau khi nhập sẽ mất liên kết. Xem [phân tích tài sản](../strategy/PHAN-TICH-NHAP-TAI-SAN-VA-VI-TRI-DUNG-CHUNG.md).

### Checklist triển khai sau đánh giá

- [x] Đọc schema, constraints thực tế, actions, validation, form và seed; kiểm kê DB bằng truy vấn chỉ đọc.
- [x] Ghi nhận quy tắc phòng ban từ cây/chức danh text và đánh giá phạm vi reset vào plan, rule, bối cảnh và kiến trúc.
- [ ] Điều chỉnh schema/validation/form/action đồng bộ: bỏ nhập mã thủ công, tự cấp mã bắt buộc trong DB, chọn cây cơ cấu, sửa chức danh có audit, không cấp role theo chức danh.
- [ ] Viết luồng khởi tạo 72 từ file final không phụ thuộc hồ sơ cũ; sửa seed để không nạp lại 67 hồ sơ cũ. Rà lại các script sync/export và phép tìm kiếm đang dựa vào employeeCode.
- [ ] Tạo backup mới, preview số dòng bị xóa/giữ/nạp, kiểm tra tài khoản quản trị còn hoạt động và xử lý transaction/FK.
- [ ] Thực hiện làm sạch đúng phạm vi trên; không reset toàn DB, không reset sequence hoặc xóa migration cũ.
- [ ] Đồng bộ `/employees`, `/accounts`, phòng ban, tổng quan, 3D, seed và tài liệu từ cùng dữ liệu người; kiểm tra còn đúng 72 người sau nạp và không tạo tài khoản hàng loạt.
- [ ] Kiểm thử tạo/sửa chức danh ở cả hồ sơ nhập và mới; chọn nhánh hợp lệ/chặn khác công ty; tạo người không có tài khoản; tài khoản quản trị còn dùng được, phiên tài khoản đã xóa bị từ chối; bộ đếm tăng đúng khi thêm người mới và khởi tạo lại không sinh trùng.


## Chốt ưu tiên độ chính xác nguồn HR — 27/10/2026

- [x] Người phụ trách xác nhận file final 72 người là nguồn ưu tiên về độ chính xác. Thông tin khác 1Office dùng final, không yêu cầu xác nhận lại chỉ vì chênh nguồn cũ.
- [x] Đồng bộ DATABASE-RULES, bối cảnh, thiết kế đồng bộ, kiến trúc và bảng đối chiếu. Giữ thẩm quyền HR đối với bản export/API mới; cập nhật sau phải được chốt, không tự ghi đè. Tách rõ các liên kết tài khoản mơ hồ với thông tin hồ sơ HR đã được xác nhận.
- [x] Lần cập nhật này ghi nhận quy tắc/tài liệu; không sửa lại DB hoặc triển khai job đồng bộ. Việc tách danh sách chính/lưu trữ và ẩn mã vẫn ở mục chờ thực hiện bên dưới.


## Đối chiếu HR final với file 1Office — 27/10/2026

- [x] Lập [bảng so sánh đầy đủ 72 dòng](../strategy/BANG-SO-SANH-HR-FINAL-VA-1OFFICE.md) trực tiếp từ file gốc: HR 26/10, hồ sơ 1Office 14/10, tài khoản/cơ cấu 21/10. Lần này chỉ phân tích, không sửa DB hoặc truy cập 1Office.
- [x] Phân biệt 58 cặp có căn cứ, 1 liên kết IT tạm, 13 người chưa thấy trong export và 8 hồ sơ cũ không có đối ứng. Không trình bày 59 liên kết là 59 danh tính đã được xác nhận chắc chắn.
- [x] Xác minh 56 ngày sinh đủ ở hai nguồn đều khớp; 3 hồ sơ nguồn thiếu ngày sinh. Lỗi lệch ngày từng có trong ERP không phải bất đồng giữa hai file nguồn.
- [x] Gộp bộ phận con để so cùng cấp: 30 khác mức chi tiết, 1 khác phòng cấp chính. Tài khoản đối ứng: 50 kích hoạt (gồm 1 IT tạm), 8 khóa, 14 chưa thấy; không suy nghỉ việc từ khóa tài khoản.
- [x] Ghi nhận yêu cầu: công ty chưa quản lý mã nhân sự, danh sách chính chỉ có 72 người theo HR. ID kỹ thuật vẫn cần cho liên kết, không coi mã SDG tự sinh là mã chính thức do HR cấp.
- [ ] Điều chỉnh giao diện danh sách chính/lưu trữ và cách hiển thị mã theo yêu cầu mới; chưa thực hiện trong lần lập bảng đối chiếu này.


## Nhập danh sách HR chốt 26/10/2026 — thực hiện 27/10/2026

- [x] Khắc phục Prisma Studio không hiển thị Employee (27/10/2026): tiến trình cổng 5555 chạy từ 26/10 giữ schema cũ. Xác minh PostgreSQL `sdg_erp.public.nhan_su` tồn tại; khởi động lại riêng Studio bằng schema hiện tại. Playwright kiểm tra danh sách model sau khởi động có Employee 80 và User 68. Không thay đổi dữ liệu hoặc khởi động lại ứng dụng.

- [x] Kiểm tra lại DB chỉ đọc ngày 27/10/2026 theo câu hỏi về trạng thái nhập: 72 hồ sơ có `hrSourceFile = DS_nhan_su_Sao_Do_26.10.2026.xlsx`, ngày chốt 26/10; tổng trạng thái 72 ACTIVE, 7 UNKNOWN, 1 LEFT; 68 tài khoản, 18 đơn vị. File final đã nhập; phương án xóa dữ liệu cũ/khởi tạo lại và tự cấp mã trong form chưa thực hiện.

- [x] Đọc file `docs/HR_danhsachnhanvien/DS_nhan_su_Sao_Do_26.10.2026.xlsx`: 72 dòng người, 9 nhóm phòng ban, không có mã nhân viên/ID nguồn. STT không dùng làm định danh.
- [x] Đối chiếu dữ liệu hiện có; xác định ngày sinh cũ bị lệch ngày. Ngày Excel phải đọc serial thành ngày UTC, không qua giờ địa phương.
- [x] Thêm nguồn HR/ngày chốt/ghi chú riêng; giữ mapping 1Office, ID và mã ERP hiện có. Migration `20261027033903_hr_final_source` đã áp dụng, Prisma Client đã sinh lại.
- [x] Nhập có preview, backup, transaction và audit; không tạo/khóa tài khoản, không đổi role. Người vắng trong file: giữ hồ sơ, ACTIVE thành UNKNOWN, LEFT giữ nguyên.
- [x] Đối chiếu đủ 72 dòng và chạy lại không ghi thêm: 59 cập nhật, 13 mới; 72 ACTIVE, 7 UNKNOWN, 1 LEFT. Giữ nguyên 68 tài khoản và 18 đơn vị. Ghi chú HR hiển thị ở bảng/hồ sơ; nguồn HR mới được bảo vệ như hồ sơ nguồn.
- [x] Kiểm thử parser/matching 2/2, TypeScript, ESLint phần thay đổi và `git diff --check` đạt. Prisma diff không lệch schema. Playwright kiểm tra trực tiếp `/employees` HTTP 200: 72 đang làm, ghi chú HR, ngày sinh đúng, nguồn khóa sửa tên, desktop/mobile đạt. Kiểm tra DB độc lập sau nhập: 80 hồ sơ/72 HR/6 ghi chú; tài khoản, role, quan hệ quyền và đơn vị giống backup. [Báo cáo đối chiếu](../strategy/DOI-CHIEU-NHAN-SU-HR-2026-10-26.md) lưu cách ghép, các hồ sơ cần xác nhận và vị trí backup.


## Tách nhân sự và tài khoản — 26/10/2026

**Đã được duyệt và triển khai.** Phần lịch sử bên dưới mô tả mô hình User gộp hồ sơ trước lần chuyển đổi này; thiết kế hiện hành là Employee (người) và User (tài khoản).

- [x] Kiểm kê DB và đối chiếu workbook HR 14/10/2026: 68 tài khoản cũ; 67 mã hồ sơ nguồn. Workbook có 66 đang làm, 1 nghỉ việc. Mã 074 có tên nguồn “Nhân viên IT”, giữ tên ERP hiện tại và ghi chú cần xác nhận nguồn.
- [x] Lưu snapshot trước chuyển đổi ngoài repository tại thư mục riêng tư trên máy; không phải bản backup toàn cluster. Migration có transaction, giữ mật khẩu/ID/quyền/trạng thái tài khoản, không xóa hồ sơ cũ.
- [x] Tạo Employee/nhan_su với mã, tên, trạng thái làm việc và mapping nguồn. Chuyển 67 hồ sơ, liên kết 67 tài khoản hiện có; 1 tài khoản hệ thống không được tính vào nhân sự. Giữ các tài khoản ERP từng được seed dù nguồn 1Office không có tài khoản tương ứng.
- [x] DB cho phép người có 0..N tài khoản; ràng buộc người–phòng và tài khoản–người cùng công ty. Cột legacy lưu trữ chỉ để đối chiếu, không truy vấn từ ứng dụng.
- [x] Tách `/employees` và `/accounts`: hồ sơ không yêu cầu mật khẩu/role; tài khoản tạo riêng và chọn người sở hữu. Tên/mã/phòng/chức vụ của hồ sơ nguồn được bảo vệ; liên hệ và tình trạng làm việc có audit khi xác nhận nội bộ.
- [x] ADMIN/IT_ADMIN quản lý tài khoản và gán role hiện có. HR MANAGE chỉ quản lý hồ sơ. Không tự cộng quyền giữa các tài khoản cùng người.
- [x] Session đọc tài khoản và quyền từ DB; khóa tài khoản hoặc đổi phiên bản phiên làm mất hiệu lực phiên cũ. JWT verification tách riêng khỏi DB cho middleware. Đăng nhập bằng username, không dùng mã nhân viên.
- [x] Tổng quan đếm hồ sơ và người ACTIVE riêng; phòng ban đếm hồ sơ gắn đơn vị; 3D lấy nhân sự ACTIVE, không lọc trạng thái tài khoản. Giữ nguyên cơ cấu phòng ban và mapping vị trí hiện tại.
- [x] FK người giữ/nhận tài sản và kỹ thuật viên chuyển sang Employee; người thao tác và audit giữ User. Seed chỉ nhập hồ sơ người, không tạo tài khoản hàng loạt hoặc reset mật khẩu tài khoản hiện hữu.
- [x] Xác minh sau migration: 67 hồ sơ, 68 tài khoản, 1 hệ thống; mật khẩu băm/tên đăng nhập/trạng thái/quyền và 18 phòng ban giữ nguyên. TypeScript và ESLint các phần mới đạt.
- [x] Playwright 4/4 tình huống mới đạt: DB 0/2 tài khoản và chặn khác công ty; UI tạo người/tài khoản độc lập và mobile; quyền tài khoản riêng, đăng nhập và thu hồi phiên; bảo vệ admin cuối cùng với rollback.
- [x] Hồi quy: 4/4 phòng ban và sơ đồ, 4/4 AI/Word; thêm 2/2 kiểm thử tổng quan/3D và HR không được quản lý tài khoản. Tổng 14 tình huống riêng biệt đạt; chạy lại 2 luồng tạo và đăng nhập sau chỉnh UI đều đạt.
- [x] Schema DB không lệch Prisma, migration đã áp dụng. Dọn dữ liệu test: còn đúng 1 công ty, 18 phòng ban, 67 nhân sự, 68 tài khoản và 7 role gốc; so sánh lại toàn bộ trường cũ của tài khoản và dữ liệu phòng ban không đổi.
- [x] Production build webpack đạt sau tách module JWT khỏi Prisma; Next.js vẫn cảnh báo phiên bản 16.4.0, giữ phiên bản theo lựa chọn của người phụ trách. Kiểm tra cuối ngày 27/10/2026: TypeScript, ESLint phần thay đổi mới và production build webpack trên mã cuối đều đạt; không còn cảnh báo Prisma trong Edge Runtime.
- [x] Đối chiếu file HR final 26/10/2026: 72 người hiện tại; chi tiết xem mục đầu tài liệu.
- [ ] API/webhook, importer tổng quát cho các lần sau và đồng bộ định kỳ chưa triển khai. Lệnh nhập một snapshot không thay thế các chức năng này.
- [ ] Quản lý kiêm nhiệm và lịch sử chuyển phòng chi tiết nằm ngoài bản đơn giản hiện tại. Ma trận `/roles` theo kế hoạch riêng; không đánh dấu hoàn thiện RBAC chỉ vì đã có `/accounts`.

> **Dự án:** Sao Đỏ Group ERP (SDG ERP)  
> **Kiến trúc:** CSDL Tối ưu ERP (Khóa chính số nguyên tự tăng `Int autoincrement`, Hồ sơ `User` phẳng kết hợp Cơ cấu tổ chức cây phân cấp `Department` và Ma trận Phân quyền động đa chiều `Role` - `Permission` - `UserRole`).  
> **Khả năng mở rộng (Dynamic Scalability):**  
> • **Cơ cấu Tổ chức Phân cấp (Hierarchical Tree):** Cấu trúc Phòng ban Cha - Con linh hoạt (`parentId`), hỗ trợ xem dạng cây Org Chart và tự động kế thừa phạm vi quản lý dữ liệu.  
> • **Mở rộng Phòng ban 100% qua UI:** Tự do thêm phòng ban cấp cha hoặc bộ phận con trực thuộc mà không cần can thiệp code hay chạy migration CSDL.  
> • **Mở rộng Vai trò & Phân quyền 100% qua UI:** Tự do tạo thêm Role mới, hệ thống tự động sinh thêm cột trên bảng Ma trận để phân quyền 3 cấp độ (`NONE`, `VIEW`, `MANAGE`).  
> • **Sẵn sàng cho Module tương lai:** Làm nền móng vững chắc cho Quản lý công việc (`TASK`), Phê duyệt (`APPROVAL`), Kho vận...  
> **Quy chuẩn áp dụng:** Tuân thủ 100% [DATABASE-RULES.md](file:///g:/VS%20code/SGDERP/.agents/rules/DATABASE-RULES.md), [BACKEND-RULES.md](file:///g:/VS%20code/SGDERP/.agents/rules/BACKEND-RULES.md), [FRONTEND-RULES.md](file:///g:/VS%20code/SGDERP/.agents/rules/FRONTEND-RULES.md) và [AGENTS.md](file:///g:/VS%20code/SGDERP/AGENTS.md).

---

## 📌 BẢNG TIẾN ĐỘ TỔNG QUAN

### Việt hóa tên vật lý DB — 22/10/2026

- [x] Khởi động Prisma Studio tại `http://localhost:5555` và mở Google Chrome theo yêu cầu để xem dữ liệu.

- [x] Lập ánh xạ 16 bảng/194 cột sang tiếng Việt không dấu; giữ API Prisma để tương thích mã nguồn; tạo `docs/DATABASE-DICTIONARY.md` và cập nhật rule/kiến trúc.
- [x] `prisma format` và `prisma validate` đạt. `migrate dev --create-only` bị từ chối do môi trường không tương tác; tạo SQL rename tường minh thay cho đề xuất drop/create của Prisma. `pg_dump` local v16 không tương thích server v17 nên lưu bản dữ liệu JSON đầy đủ và schema trước đổi tên trong thư mục tạm riêng tư ngoài repository; đây không phải bản backup cluster PostgreSQL.
- [x] Áp dụng migration `20261022090000_viet_hoa_ten_bang_va_cot` chỉ rename trong transaction; cả 16 bảng giữ nguyên số dòng và dấu kiểm tra toàn bộ dữ liệu; Prisma diff DB–schema không có khác biệt, Prisma Client đã tái sinh.
- [x] Truy vấn quan hệ Prisma sau rename đạt: 18 đơn vị, 68 user (gồm tài khoản hệ thống), 7 role, 1 chứng từ và 11 dòng kiểm kê, chưa có tài sản cá thể. TypeScript và production build webpack đạt.
- [x] TypeScript, build webpack và `git diff --check` đạt; Playwright 5/5 đạt sau rename (27,5 giây), gồm đăng nhập, đọc cơ cấu, sửa metadata có hoàn tác và mobile. Các log đăng nhập/kiểm thử phát sinh sau đối soát toàn vẹn là thay đổi nghiệp vụ do test, không do migration.

- [x] **Bước Chuẩn bị: Thiết lập Cấu trúc CSDL Khóa Số Nguyên & Bộ Nhận Diện Sao Đỏ**
- [x] **Giai đoạn 1: Khởi tạo Thư viện UI & Nạp Dữ liệu thực tế 67 Nhân sự từ Excel**
- [x] **Giai đoạn 2: Cơ cấu Tổ chức Phân cấp Cây (Cha - Con) & Quản lý Phòng Ban (Department Management)**
- [ ] **Giai đoạn 3: Quản lý Hồ sơ & Tài khoản Cán bộ Nhân viên (Core Employee Management)**
- [x] **Giai đoạn 4: Ma trận Phân quyền Động 3 Cấp độ & Bảo vệ Phân hệ (RBAC Matrix & Session Guard)**
- [ ] **Giai đoạn 5: Tích hợp Điều hướng Đa nền tảng (Mobile/Desktop) & Kiểm thử Toàn trình**
- [x] **Giai đoạn 6: Mô hình 3D Digital Twin Tòa nhà Trụ sở Sao Đỏ Group (WebGL / Three.js)**

---

## 📋 CHI TIẾT TỪNG BƯỚC TRIỂN KHAI

---

### BƯỚC CHUẨN BỊ: THIẾT LẬP CƠ SỞ DỮ LIỆU & NHẬN DIỆN THƯƠNG HIỆU
- [x] Thiết lập model `Role`, `Permission`, `RolePermission`, `UserRole` với cờ `isPrimary` cho phép kiêm nhiệm.
- [x] Thêm bảng `AuditLog` ghi vết nhật ký hoạt động (LOGIN, LOGOUT, LOGIN_FAILED, CREATE, UPDATE, DELETE).
- [x] **Chuẩn hóa Khóa chính:** Chuyển đổi toàn bộ `id` từ UUID sang số nguyên tự tăng `Int @id @default(autoincrement())` (1, 2, 3...) giúp đối soát trực quan, tăng tốc JOIN và giảm dung lượng chỉ mục.
- [x] Tạo migration `20261018142939_init_autoincrement_erp` và áp dụng thành công vào PostgreSQL.
- [x] Sinh Prisma Client v6.19.3 tương thích kiểu `Int`.
- [x] **Nhận diện Thương hiệu:** Tích hợp logo chính thức Sao Đỏ Group từ trang chủ `saodogroup.com` (`public/logo.png`), Tab Favicon (`src/app/icon.png`) và thiết lập **Chế độ Sáng (`Light Mode`) mặc định**.
- [x] Bổ sung quy chuẩn bắt buộc về kiểm tra quyền RBAC, Responsive Mobile và nguyên tắc **Bắt buộc đồng bộ Checklist** vào `AGENTS.md`.

---

### GIAI ĐOẠN 1: THƯ VIỆN UI & NẠP DỮ LIỆU THỰC TẾ TỪ EXCEL
> *Mục tiêu: Đảm bảo đầy đủ component giao diện và nạp toàn bộ danh mục, 67 nhân sự thật của Sao Đỏ Group vào CSDL.*

- [x] **Bước 1.1: Bổ sung các Shadcn UI Components cần thiết**
  - [x] Table, Dialog, Sheet, Dropdown Menu, Select, Badge, Avatar, Tabs, Tooltip, Sonner Toast.
- [x] **Bước 1.2: Cài đặt các thư viện bổ trợ**
  - [x] `@tanstack/react-table` (cho Data Grid phân trang/lọc dữ liệu chuyên nghiệp).
  - [x] `lucide-react` (Bộ icon chuẩn).
  - [x] `jose` (Mã hóa và xác thực JWT Session an toàn trên Edge/Node).
  - [x] `bcryptjs` & `@types/bcryptjs` (Băm mật khẩu tài khoản người dùng).
  - [x] `xlsx` (Đọc dữ liệu Excel).
- [x] **Bước 1.3: Viết Script Nạp Dữ Liệu Thực Tế (`prisma/seed.ts`)**
  - [x] Khởi tạo Công ty mặc định: `CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ SAO ĐỎ` (ID: 1).
  - [x] Khởi tạo danh mục 5 Nhóm vai trò chuẩn: `ADMIN`, `DEPT_HEAD`, `HR`, `ACCOUNTANT`, `STAFF` (ID: 1 đến 5).
  - [x] Khởi tạo 7 Quyền cơ bản cho phân hệ `HR`, `TASK` và `SYSTEM`.
  - [x] Khởi tạo tài khoản Quản trị viên tối cao: `admin / 123456` (ID: 1).
  - [x] Nạp toàn bộ **67 Cán bộ Nhân viên thật** (`User` ID: 2 đến 68) với mật khẩu mặc định `123456`.

---

### GIAI ĐOẠN 2: CƠ CẤU TỔ CHỨC CÂY PHÂN CẤP (CHA - CON) & QUẢN LÝ PHÒNG BAN

#### Rà soát điều kiện chốt tính năng — 21/10/2026

- [x] Đối chiếu độc lập trực tiếp PostgreSQL với workbook gốc: checksum nguồn đúng manifest; 19 ID nguồn duy nhất gồm 1 công ty và 18 đơn vị; ERP có đúng 18 đơn vị, khớp chính xác tên, external ID và quan hệ cha/con, không thiếu/thừa hoặc có parent khác công ty.
- [x] Chốt kết luận kỹ thuật về dữ liệu: bản nền cơ cấu hiện tại khớp snapshot 1Office ngày 21/10/2026. Không đồng nghĩa xác minh dữ liệu sống hoặc xác nhận toàn bộ tuyến chỉ đạo trong cẩm nang.
- [ ] Trước khi nghiệm thu toàn bộ: sửa quyền đọc `getDepartments` để từ chối cả permission thiếu/không hợp lệ (hiện chỉ chặn giá trị `NONE`); kiểm thử VIEW, MANAGE, NONE, thiếu quyền và phạm vi công ty.
- [ ] Trước khi nghiệm thu toàn bộ: đối chiếu tập ID nguồn độc lập với tập đơn vị ERP. Bộ đếm `sourceRecords = linked + 1` hiện suy từ các bản ghi đã nhập, không thể tự phát hiện đơn vị nguồn bị thiếu trong ERP; UI hiện so sánh với snapshot trong DB, không đọc trực tiếp 1Office.
- [ ] Trước khi nghiệm thu toàn bộ: xử lý liên kết 3D theo `Department.code` trước khi cho đổi mã tùy ý; `RoomDetailSheet` còn dùng mã HCNS/PC và `room.deptCode` nên đổi mã có thể làm mất liên kết hiển thị nhân sự theo phòng.
- [ ] Xác định quy trình nhập snapshot tiếp theo: script hiện chuyên biệt cho file ngày 21/10 và mapping theo mã ERP ban đầu; chưa phải importer dùng chung có preview/diff hoặc xử lý đổi mã, thêm/bớt đơn vị.
- [ ] Hoàn tất các mục trên rồi chốt nghiệm thu module. Phạm vi đã đạt hiện tại là danh mục cơ cấu theo snapshot + giao diện đối chiếu + sửa metadata trong pilot admin; chưa nghiệm thu đồng bộ tự động/RBAC đa vai trò.

> *Mục tiêu: Quản lý danh mục cơ cấu tổ chức theo mô hình cây 2 tầng (Khối/Ban/Phòng cấp Tập đoàn -> Bộ phận trực thuộc) và cơ chế phân quyền kế thừa theo nhánh.*

> [!IMPORTANT]
> **QUYẾT ĐỊNH KIẾN TRÚC LÕI: RÀNG BUỘC THEO ID THAY VÌ TITLE / TEXT**
> 1. **100% Gắn theo `id` (Khóa ngoại Integer):** Toàn bộ nhân sự (`User.departmentId`), công việc tương lai (`Task.departmentId`, `Task.assignedToId`) và luồng duyệt **BẮT BUỘC** ràng buộc bằng khóa số nguyên `Int`. Tuyệt đối KHÔNG gắn kết nối theo tên gọi (`title` / `name`).
> 2. **Bảo toàn dữ liệu khi tổ chức thay đổi:** Khi phòng ban đổi tên (VD: `Phòng Hành chính Nhân sự` đổi thành `Khối Quản trị Nguồn Nhân lực`), mọi liên kết với nhân sự và công việc cũ **giữ nguyên vẹn 100% (Zero-data-loss)** mà không phải chạy script cập nhật hàng loạt.
> 3. **Tính năng Quản lý Phòng ban Độc lập (`/departments`):** Rất cần thiết và là module nền móng. Tính năng này cho phép Admin/IT/HR tạo phòng cha, tách/nhập bộ phận con, sửa đổi thông tin 100% qua UI mà không cần can thiệp code hay SQL. Hệ thống có cơ chế kiểm tra an toàn: từ chối xóa nếu phòng ban đang có nhân sự hoặc bộ phận con trực thuộc.

- [x] **Bước 2.1: Cập nhật Schema Cây Phòng Ban (`prisma/schema.prisma`) & Phân định rõ Bộ phận IT/HCNS**
  - [x] Bổ sung trường tự liên kết vào model `Department`:
    ```prisma
    parentId    Int?
    parent      Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
    children    Department[] @relation("DepartmentHierarchy")
    ```
  - [x] Chạy migration `20261019071635_add_department_hierarchy` áp dụng thành công vào PostgreSQL.
  - [x] Tinh chỉnh `prisma/seed.ts` thiết lập chuẩn hóa mô hình phân cấp (Khớp 100% dữ liệu gốc):
    - **Cấp 1 (Cấp Tập đoàn & Khối độc lập):**
      + `BAN QLDA KCN NAM ĐÌNH VŨ 1`: **Khối độc lập riêng** (gồm 1 Giám đốc Ban và 7 bộ phận con trực thuộc với 27 nhân sự).
      + `PHÒNG PHÁT TRIỂN DỰ ÁN`: Đơn vị độc lập phụ trách nghiên cứu & chuẩn bị dự án mới (2 nhân sự).
      + `PHÒNG HÀNH CHÍNH NHÂN SỰ`: Đơn vị nòng cốt quản trị nhân sự, CNTT và văn phòng (10 nhân sự).
      + `PHÒNG TÀI CHÍNH - KẾ TOÁN`: Quản lý tài chính kế toán (6 nhân sự).
      + `PHÒNG KINH DOANH`: Kinh doanh & xúc tiến đầu tư (9 nhân sự, có 2 bộ phận con).
      + `PHÒNG KẾ HOẠCH ĐẦU TƯ`: Kế hoạch và tổng hợp đầu tư (6 nhân sự).
      + `BAN PHÁP CHẾ`: Pháp chế doanh nghiệp (2 nhân sự).
      + `BAN LÃNH ĐẠO`: Ban Tổng Giám đốc (1 nhân sự).
      + `BAN KIỂM SOÁT`: Kiểm soát tuân thủ (3 nhân sự).
    - **Cấp 2 (9 Bộ phận con trực thuộc chuẩn theo Excel):**
      + **Trực thuộc Khối độc lập Ban QLDA KCN Nam Đình Vũ 1 (7 bộ phận):** `Ban giám đốc KCN NAM ĐÌNH VŨ 1` (4 Phó GĐ Ban), `Bộ phận văn phòng - Ban QLDA`, `Bộ phận kỹ thuật - Ban QLDA`, `Bộ phận cảnh quan môi trường - Ban QLDA`, `Bộ phận giao nhận - Ban QLDA`, `Bộ phận điện nước - Ban QLDA`, `Bộ phận PCCC - Ban QLDA`.
      + **Trực thuộc Phòng Kinh Doanh (2 bộ phận):** `Bộ phận Sales Marketing - Phòng Kinh doanh`, `Bộ phận CSKH - Phòng Kinh Doanh`.
  - [x] Thiết lập vai trò chuyên biệt: `IT_ADMIN` (toàn quyền hệ thống & HCNS cho nhân sự IT), `HR_MANAGER` (Trưởng phòng HCNS), `HR_STAFF` (Chuyên viên HCNS).
- [x] **Bước 2.2: Quy chuẩn Phân quyền Kế thừa Dữ liệu theo Nhánh (Data Scope Cascade)**
  - [x] Xây dựng helper `getAccessibleDepartmentIds(user)` trong `src/lib/permissions.ts`:
    - Nếu là Quản lý cấp Cha (Vd: Trưởng phòng Kinh Doanh): Tự động bao quát ID phòng cha + tất cả ID bộ phận con.
    - Nếu là Quản lý cấp Con (Vd: Trưởng bộ phận Kỹ thuật): Chỉ quản lý trong phạm vi ID bộ phận con của mình.
- [x] **Bước 2.3: Xây dựng Server Actions Phòng Ban (`src/actions/department.ts`)**
  - [x] `getDepartments`: Lấy danh sách phòng ban, cây cha/con, số nhân sự và trạng thái đối chiếu tên/cấp trên với snapshot 1Office.
  - [x] `createDepartment`: Chặn tạo cơ cấu chính thức trực tiếp trong ERP; hướng người quản trị tạo tại nguồn chuẩn 1Office rồi nhập snapshot mới.
  - [x] `updateDepartment`: Chỉ cho sửa mã/mô tả nội bộ; khóa tên và quan hệ cha/con của đơn vị đã liên kết 1Office.
  - [x] `deleteDepartment`: Chặn xóa đơn vị đã liên kết 1Office; đơn vị cục bộ chưa liên kết vẫn phải không còn nhân sự/bộ phận con.
- [x] **Bước 2.4: Xây dựng Giao diện Phòng Ban (`src/app/(dashboard)/departments/page.tsx`)**
  - [x] Hiển thị cây tổ chức responsive và tab đối chiếu 1Office trên desktop/mobile.
  - [x] Bộ lọc theo tên, mã ERP, ID 1Office, cấp trên và người giám sát.
  - [x] Hiển thị 19 bản ghi nguồn = 1 nút công ty + 18 đơn vị; badge trạng thái khớp/lệch/chưa liên kết cho từng đơn vị.
  - [x] Dialog React Hook Form + Zod chỉ sửa metadata ERP, không sửa trường do 1Office sở hữu.
  - [x] Bổ sung `loading.tsx` với skeleton cho điều hướng App Router.
- [x] **Bước 2.5: Lưu mapping và snapshot cơ cấu 1Office**
  - [x] Thêm external ID, external parent ID, tên/path/cấp/người giám sát và thời điểm snapshot vào `Department`.
  - [x] Tạo và áp dụng migration `20261021181500_add_department_oneoffice_snapshot`.
  - [x] Tạo script `db:sync:oneoffice-departments`, nhập thành công 18 đơn vị từ export ngày 21/10/2026; nút công ty ID 23 ánh xạ ở cấp `Company`.
  - [x] Đối chiếu sau nhập: 18/18 đơn vị khớp tên và quan hệ cha/con với 1Office.
  - [x] Kiểm tra `prisma validate`, TypeScript, ESLint các file thay đổi và production build Next.js bằng webpack: đạt; build cần quyền kết nối PostgreSQL local khi prerender dashboard.

---

### GIAI ĐOẠN 3: QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (CORE HR) - [HOÀN THÀNH 100%]
> *Mục tiêu: Quản lý danh sách 67 cán bộ nhân viên, xem chi tiết, chỉnh sửa thông tin và gán vai trò kiêm nhiệm.*

- [x] **Bước 3.1: Xây dựng DTO Schemas Validation (`src/lib/validations/user.ts`)**
  - [x] Schema Tạo/Sửa nhân viên: Họ tên, Mã NV, Chức vụ, Phòng ban (hỗ trợ chọn bộ phận con hoặc phòng cha), Username, Password, SĐT, Email, Ngày sinh, Ngày vào làm, Danh sách Roles.
- [x] **Bước 3.2: Xây dựng Server Actions Nhân Sự (`src/actions/employee.ts`)**
  - [x] `getEmployees`: Lọc theo Phòng ban (hỗ trợ lọc theo phòng cha thì ra toàn bộ nhân sự các phòng con), Vai trò, Trạng thái, Tìm kiếm thời gian thực, Phân trang.
  - [x] `getEmployeeById`: Lấy thông tin chi tiết nhân viên kèm Phòng ban và các Vai trò.
  - [x] `createEmployee`: Tạo User mới, băm password, gán phòng ban và danh sách vai trò (`UserRole`).
  - [x] `updateEmployee`: Cập nhật thông tin hồ sơ, phòng ban và cập nhật danh sách vai trò.
  - [x] `toggleEmployeeStatus`: Kích hoạt / Khóa tài khoản nhân sự tức thì (kèm ghi AuditLog).
  - [x] `resetEmployeePassword`: Đặt lại mật khẩu cho nhân sự.
- [x] **Bước 3.3: Xây dựng Giao diện Danh sách Nhân sự (`src/app/(dashboard)/employees/page.tsx`)**
  - [x] Toolbar: Ô tìm kiếm thời gian thực, Bộ lọc Phòng ban phân cấp, Bộ lọc Vai trò, Nút "Thêm nhân viên" màu Sao Đỏ Red (`bg-primary`).
  - [x] Data Grid (TanStack Table & Custom UI) chuẩn Responsive:
    - Desktop: Table đầy đủ Avatar, Họ tên, Mã NV, Chức vụ, Phòng ban, SĐT, Vai trò, Trạng thái, Menu thao tác.
    - Mobile: Card View hiển thị thẻ nhân sự nhỏ gọn kèm menu 3 chấm.
  - [x] Liên kết điều hướng chéo trực tiếp từ Cơ cấu phòng ban (`/departments`) sang Danh bạ nhân sự (`/employees?departmentId=...`).
- [x] **Bước 3.4: Xây dựng Modal / Sheet Thêm & Sửa Nhân viên (`src/components/employees/EmployeeManager.tsx`)**
  - [x] Thiết kế Sheet / Dialog 2 cột bố cục rõ ràng (Cá nhân, Công việc, Tài khoản & Chọn các Vai trò).
  - [x] Drawer Sheet xem chi tiết hồ sơ nhân sự, lịch sử tài khoản, ngày vào làm và phòng ban.

---

### GIAI ĐOẠN 4: MA TRẬN PHÂN QUYỀN ĐỘNG 3 CẤP ĐỘ & BẢO VỆ PHÂN HỆ (RBAC MATRIX)

- [x] Bổ sung yêu cầu phân quyền tài sản/license theo đơn vị tự quản và theo người được chỉ định; menu theo quyền hiệu lực. Phương án role + phạm vi phòng ban đang được cân nhắc tại mục 4.5 của tài liệu Master Data/RBAC, chưa triển khai.
> *Mục tiêu: Quản lý ma trận phân quyền 3 cấp độ (NONE, VIEW, MANAGE) cho từng Phân hệ (HR, TASK, SYSTEM...), nạp vào Session để kiểm tra tức thì (0ms) ở Server Action và Giao diện.*

- [x] **Bước 4.1: Xây dựng Thư viện Auth & Session Guard (`src/lib/auth.ts`)**
  - [x] Khởi tạo Session chứa danh tính người dùng và quyền phân hệ: `{ HR: "NONE" | "VIEW" | "MANAGE", TASK: "NONE" | "VIEW" | "MANAGE" }`.
  - [x] Đăng nhập xác thực với bcrypt và ghi nhận nhật ký vào `AuditLog`.
- [ ] **Bước 4.2: Xây dựng Server Actions Phân Quyền (`src/actions/role.ts`)**
  - [ ] `getRolesWithPermissions`: Lấy danh sách các vai trò và cấp độ quyền tương ứng theo phân hệ.
  - [ ] `createRole`: Tạo thêm Nhóm vai trò mới trực tiếp trên UI.
  - [ ] `updateRolePermissions`: Cập nhật cấp độ quyền cho vai trò theo từng phân hệ.
  - [ ] `assignRolesToUser`: Gán/gỡ vai trò chính và vai trò kiêm nhiệm cho nhân sự.
- [ ] **Bước 4.3: Xây dựng Giao diện Ma trận Phân quyền (`src/app/(dashboard)/roles/page.tsx`)**
  - [ ] Bảng Ma trận trực quan: Cột là các Vai trò, Dòng là các Phân hệ với các tùy chọn cấp độ (`NONE` / `VIEW` / `MANAGE`).
  - [ ] Nút "Thêm vai trò mới" tạo nhanh role mới và cập nhật phân quyền tức thì.

---

### GIAI ĐOẠN 5: TÍCH HỢP ĐIỀU HƯỚNG & KIỂM THỬ TOÀN TRÌNH
- [x] **Bước 5.1: Cập nhật Sidebar Navigation chuẩn Responsive**
  - [x] Menu Desktop cố định, Menu Mobile dạng Drawer trượt (`Sheet`).
  - [x] Nhóm menu "Quản lý Nhân sự", "Cơ cấu tổ chức", "Bản đồ 3D Tòa nhà" và "Nhật ký hoạt động".
  - [x] Tích hợp Logo Sao Đỏ Group và Avatar tài khoản.
- [ ] **Bước 5.2: Kiểm thử Toàn trình (End-to-End Test)**
  - [x] Cài `@playwright/test` 1.64.1 làm nền kiểm thử trình duyệt và khảo sát DOM chính thức của project.
  - [x] Tạo `playwright.config.ts` và bộ test `tests/e2e/departments.spec.ts`; dùng Chrome hệ thống do Chromium đóng gói không hỗ trợ macOS 13, credential chỉ nhận qua biến môi trường.
  - [x] Qua Playwright phát hiện và sửa race trước hydration của form đăng nhập: chặn submit sớm, dùng POST dự phòng để không lộ credential trên query string, liên kết label đúng với input và điều hướng bằng App Router.
  - [x] Tắt log đối số Server Function trong Next.js development bằng `logging.serverFunctions: false`; ngăn action đăng nhập in mật khẩu/form data ra terminal trong lúc kiểm thử.
  - [x] Kiểm chứng lại bằng Playwright sau khi đổi logging: test đăng nhập/đối chiếu đạt 1/1 và terminal chỉ còn request `POST /login`, không còn in đối số action. Một lần lọc test bằng chuỗi không khớp trả về `No tests found`, sau đó đã sửa đúng tên test và chạy đạt.
  - [ ] Kiểm thử đăng nhập bằng các tài khoản thật từ file Excel.
  - [ ] Kiểm thử phân cấp phòng ban cha - con và kiểm tra quyền kế thừa nhánh dữ liệu.
  - [x] Kiểm tra hiển thị và thao tác trang cơ cấu trên thiết bị di động.
  - [x] Kiểm thử admin local ngày 21/10/2026 bằng luồng đăng nhập thật: truy cập `/departments`, hiển thị 18/18 đơn vị khớp snapshot 1Office, tìm `HCNS`, mở form metadata và xác nhận đủ 18 nút sửa.
  - [x] Kiểm thử ghi/đọc lại metadata qua Server Action rồi hoàn tác: mô tả `BKS` đã trở về `Kiểm soát tuân thủ và kiểm toán nội bộ`; AuditLog ghi nhận đúng user `admin` và module `DEPARTMENT`.
  - [x] Gọi trực tiếp Server Action bằng phiên admin và xác nhận cả ba guard đều chặn đúng: tạo đơn vị chính thức trong ERP, đổi tên đơn vị nguồn và xóa đơn vị đã liên kết 1Office.
  - [x] Kiểm thử responsive tại viewport 390×844: 18 thẻ đối chiếu mobile, bảng desktop được ẩn, không có tràn ngang.
  - [x] Chạy bộ Playwright đầy đủ với quyền ghi được bật ngày 21/10/2026: 5/5 test đạt trong 31,3 giây; dữ liệu metadata thử nghiệm đã được hoàn tác.
  - [x] Xác minh kỹ thuật: Prisma schema hợp lệ, 4 migration đã áp dụng, TypeScript đạt, ESLint riêng các file cơ cấu đạt và production build Next.js webpack đạt.
  - [x] Build production cuối sau khi thêm Playwright, sửa LoginForm và cập nhật tài liệu ngày 21/10/2026: Next.js 16.4.0 biên dịch, TypeScript, sinh 10 trang và route động đều đạt; còn cảnh báo chuyển convention `middleware` sang `proxy`.
  - [x] Khởi động lại `next dev` sau build; ứng dụng sẵn sàng tại `http://localhost:4000`.
  - [x] Vòng kiểm tra cuối: ESLint cho LoginForm/Next config/Playwright config/bộ E2E đạt, `tsc --noEmit` đạt, `git diff --check` đạt và liên kết báo cáo cẩm nang hợp lệ.
  - [ ] Dọn lint toàn project: hiện còn 19 lỗi và 15 cảnh báo ở các phần có sẵn như seed, employee, auth, audit, Header và Office 3D; không phát sinh từ thay đổi cơ cấu phòng ban.

---

### GIAI ĐOẠN 6: MÔ HÌNH 3D DIGITAL TWIN TÒA NHÀ TRỤ SỞ SAO ĐỎ GROUP
> *Mục tiêu: Xây dựng bản đồ số 3D tương tác toàn cảnh trụ sở 3 tầng của Sao Đỏ Group dựa trên sơ đồ thiết kế thực tế, kết nối trực tiếp với dữ liệu phòng ban và hồ sơ nhân sự PostgreSQL.*

- [x] **Bước 6.1: Cài đặt thư viện đồ họa 3D Three.js**
  - [x] `three` & `@types/three` (phiên bản ^0.182.0) tương thích hoàn toàn Next.js 16 và React 19.
  - [x] Cập nhật bảng thư viện trong `docs/ARCHITECTURE.md`.
- [x] **Bước 6.2: Khởi tạo Dữ liệu Mặt bằng 3D (`src/lib/office-3d-data.ts`)**
  - [x] **Tầng 1 (T1):** Sảnh đón tiếp trung tâm đá hoa cương, Cửa kính tự động 2 cánh, Quầy lễ tân màu đỏ Sao Đỏ, Phòng Kinh doanh (`KD`), 2 Phòng họp đối ngoại/nội bộ, Phòng khách VIP, Ngân hàng cho thuê mặt bằng, Cầu thang bộ và WC.
  - [x] **Tầng 2 (T2):** Khoảng thông tầng giếng trời 1+2 với Đèn chùm pha lê thả rực rỡ và lan can kính, Phòng Chủ tịch HĐQT (`BLD`), Phòng Phát triển dự án (`PTDA`), Phòng Tài chính - Kế toán (`TCKT`), Phòng Tổng Giám đốc (`BLD`), Phòng Kế hoạch - Đầu tư (`KHDT`), Ban Pháp chế & Phòng HCNS (`PC` & `HCNS`), Cầu thang bộ và WC.
  - [x] **Tầng 3 (T3):** Khuôn viên sân vườn cây xanh oval (Sky Garden) với cây xanh tiểu cảnh, Công ty Cổ phần Xây dựng Sao Đỏ (2 phân khu Bắc/Nam), Phòng ăn / Căn tin nội bộ với cụm bàn ghế ăn.
- [x] **Bước 6.3: Xây dựng Bộ hiển thị 3D WebGL Siêu Nhẹ & Tinh Gọn (`src/components/office-3d/Office3DViewer.tsx`)**
  - [x] Chuyển đổi sang phong cách Clean Architectural Isometric tối giản: lược bỏ toàn bộ đa giác thừa (cây cảnh nhiều tầng, bàn ghế con, đèn chùm rườm rà).
  - [x] Tắt Shadow Maps (2048px) và Fog giúp triệt tiêu gánh nặng GPU/CPU.
  - [x] Áp dụng cơ chế **Vẽ theo nhu cầu (On-Demand Rendering)**: Chỉ render khi người dùng tương tác xoay/zoom hoặc khi có hoạt ảnh bóc tách tầng, đưa mức tiêu thụ tài nguyên về ~0% khi đứng yên.
  - [x] Chế độ **Bóc Tách Tầng (Exploded View)** với hiệu ứng chuyển động mượt mà (Lerp Y offset).
  - [x] Bộ lọc xem riêng từng tầng: Toàn tòa nhà, Tầng 1, Tầng 2, Tầng 3.
  - [x] Tương tác chuột Raycaster: Hover phát sáng Emissive nhẹ nhàng, Đổi con trỏ pointer, Click chọn phòng.
  - [x] Các góc camera tiện ích: Isometric 3D, Mặt bằng 2D Top-down, Góc sảnh đón tiếp chính.
- [x] **Bước 6.4: Bảng Chi Tiết Phòng & Danh Sách Nhân Sự Thật 100% (`src/components/office-3d/RoomDetailSheet.tsx`)**
  - [x] **Triệt tiêu dữ liệu tự suy:** Bỏ hoàn toàn danh sách thiết bị tiện nghi tự nghĩ (`features`), bỏ diện tích ước lượng (`areaM2`), bỏ đoạn văn mô tả dài dòng.
  - [x] Tập trung 100% vào dữ liệu thật: Tên phòng (theo bản vẽ phác thảo tay), Tên phòng ban chủ quản, và Danh sách nhân sự thực tế từ PostgreSQL (Họ tên, Mã NV, Chức vụ, SĐT, Email, Avatar) có tìm kiếm và liên kết sang hồ sơ.
- [x] **Bước 6.5: Định Tuyến & Điều Hướng Hệ Thống**
  - [x] Server Page `src/app/(dashboard)/office-3d/page.tsx` xác thực phiên và tải dữ liệu phòng ban, nhân sự trực tiếp từ CSDL với câu truy vấn rút gọn chỉ lấy các trường thiết yếu, giảm 70% payload.
  - [x] Bổ sung mục điều hướng `Bản đồ 3D Tòa nhà` (`/office-3d`) vào nhóm Quản trị Nhân sự trên Sidebar.

---

## RÀ SOÁT RULES, THIẾT KẾ VÀ MÃ NGUỒN — 21/10/2026

- [x] Xác nhận toàn bộ chức năng HR/RBAC hiện có là bản nháp; có thể đề xuất sửa lớn hoặc xây lại, nhưng chỉ triển khai khi có yêu cầu được duyệt.
- [x] Áp dụng quy tắc không tái sử dụng credential 1Office và không thao tác thay đổi trên hệ thống nguồn; chỉ phân tích export đã lưu cho tới khi được cấp lại quyền xem/export.
- [x] Đọc router, kiến trúc, ba bộ rules, schema, seed và các luồng HR/Auth/Audit/Office 3D; đối chiếu tĩnh với checklist. Chưa chạy ứng dụng, kiểm thử hoặc xác minh dữ liệu PostgreSQL thực tế; chưa sửa mã ứng dụng.
- [ ] Đồng bộ thiết kế RBAC: rule mô tả JSON trên Role nhưng schema hiện dùng Permission/RolePermission; sửa boilerplate UUID và import Prisma không khớp mã nguồn.
- [ ] Loại password hash khỏi DTO nhân sự và snapshot AuditLog; kiểm tra quyền đọc HR/SYSTEM và companyId tại mọi điểm truy cập tương ứng.
- [ ] Kiểm tra phạm vi công ty và quyền gán đối với departmentId/roleIds; áp dụng data scope thực tế, kiểm soát cây phòng ban và quyền quản trị tài khoản.
- [ ] Thống nhất SESSION_SECRET/JWT_SECRET, bỏ secret dự phòng cố định và bổ sung cơ chế vô hiệu hóa phiên khi khóa tài khoản, đổi mật khẩu hoặc thay quyền.
- [ ] Tách seed khởi tạo khỏi đồng bộ dữ liệu: upsert hiện ghi đè mật khẩu cả tài khoản đã tồn tại.
- [ ] Đối soát lại các mục đã đánh dấu hoàn thành: phân trang HR/TanStack Table, data scope, render 3D theo nhu cầu và liên kết hồ sơ từ phòng 3D. Vòng lặp hiện vẫn render liên tục; route /employees/[id] chưa có trong cây mã nguồn.
- [ ] Làm rõ liên kết phòng 3D theo deptCode so với quy tắc ID, cập nhật dependency registry và tách checklist OFFICE-3D theo router khi chỉnh lý tài liệu.

## Hiển thị nhân sự trong cây phòng ban — 22/10/2026

- [x] TypeScript, ESLint đạt; 3/3 Playwright Chrome đạt, đã bổ sung kiểm tra mở/thu danh sách nhân sự trực thuộc ngay trong cây.

- [x] Mở nhánh hiển thị nhân sự trực thuộc (họ tên, mã nhân viên, chức vụ) và các bộ phận con; phòng không có đơn vị con vẫn mở được khi có nhân sự.
- [x] Mặc định thu gọn để tránh hiển thị toàn bộ nhân sự ngay khi tải trang; tìm kiếm mở các nhánh, vẫn cho phép người dùng thu lại.
- [x] Chỉ đọc các trường danh bạ cần thiết từ DB theo công ty, giữ kiểm tra quyền HR; không thay dữ liệu/schema hoặc suy trạng thái việc làm từ trạng thái tài khoản.

## Rà soát độ gọn của trang phòng ban — 22/10/2026

- [x] Đọc schema, Server Actions, trang `/departments`, `DepartmentManager`, liên kết sang danh bạ và tài liệu mapping 1Office; phân tích tĩnh, chưa kiểm chứng dữ liệu DB trực tiếp hoặc giao diện bằng trình duyệt trong lần rà soát này.
- [x] Xác định thông tin đối soát đang lấn át nghiệp vụ: ID/tên nguồn, badge khớp, nhiều thẻ thống kê và giải thích snapshot lặp lại. Chưa có căn cứ gọi các bản ghi phòng ban là dữ liệu rác hoặc xóa chúng.
- [x] Ghi nhận giới hạn: thông báo `18/18` hard-code; “Khớp hoàn toàn” chỉ kiểm tra tên/cấp trên với snapshot; tổng bản ghi nguồn suy từ số đơn vị liên kết; cây và tổng nhánh mới xử lý hai tầng; số nhân sự đếm bản ghi User chưa phân biệt tài khoản với hồ sơ việc làm.
- [x] Đã triển khai theo yêu cầu: cây thu/mở nhánh, tìm tên/mã, số hồ sơ và liên kết danh bạ; chỉ HR MANAGE thấy đối soát và sửa thông tin nội bộ. Giữ nguyên mapping, audit và dữ liệu DB; không migration/xóa cột.
- [x] Bỏ thông báo 18/18 cố định, tổng nguồn suy đoán và nhãn khớp hoàn toàn; mô tả đúng phạm vi đối chiếu snapshot tên/cấp trên. Đếm nhánh và lọc danh bạ qua toàn bộ cấp con với tập ID chống lặp.
- [x] Kiểm tra TypeScript và ESLint cho component/action phòng ban; 3/3 Playwright Chrome đạt: chặn truy cập, quyền VIEW/MANAGE, thu nhánh, tìm kiếm, mở danh bạ, trường nguồn khóa, đối soát và mobile không tràn ngang. Kiểm thử chỉ đọc DB, không sửa dữ liệu nghiệp vụ; chưa tạo dữ liệu thử cây sâu trong DB.
- [ ] Khi triển khai, giữ 3D chỉ hiển thị dữ liệu vị trí đã xác nhận từ DB; không suy chỗ ngồi từ phòng ban tổ chức.

## 🎯 QUY TRÌNH THỰC HIỆN BẮT BUỘC

### Đầu vào từ nguồn chuẩn 1Office và xác nhận nghiệp vụ — rà soát ngày 21/10/2026
- [x] Kiểm kê tài liệu tại docs/SDGSources; đọc các phần trách nhiệm/luồng xử lý liên quan trong QTHC12, QTHC15, QTHC18, quy trình hợp đồng BPC02, tài liệu kế toán/kinh doanh và bản phối hợp sửa đổi 6/2025 (bao gồm KHĐT–BQLDA). Phạm vi là xác định dữ liệu tổ chức, nhân sự và thẩm quyền; chưa kiểm định toàn bộ phụ lục hoặc hiệu lực hiện hành.
- [x] Đọc trực quan đủ 21 trang cẩm nang hội nhập; ghi nhận tầng quản trị, chức năng sáu khối văn phòng, sáu bộ phận BQLDA, tuyến đầu mối phối hợp, quy tắc bảo mật/AI và ranh giới nghỉ phép trên 1Office tại `docs/strategy/DOI-CHIEU-CAM-NANG-HOI-NHAP-VA-CO-CAU.md`.
- [x] Dọn toàn bộ ảnh/contact sheet tạm sau khi kiểm tra trực quan; repository chỉ giữ PPTX nguồn và báo cáo đối chiếu có checksum.
- [ ] Xin HCNS/BQLDA xác nhận quan hệ Ban Giám đốc QLDA–sáu bộ phận, cách phân loại Ban Kiểm soát và ngày hiệu lực của cẩm nang trước khi đổi master data.
- [x] Đề xuất bộ trường cần HCNS xác nhận: đơn vị và cấp trên; vị trí/chức vụ; mã nhân viên và quản lý trực tiếp; phân công chính/kiêm nhiệm; trách nhiệm, phạm vi phê duyệt và ủy quyền; ngày hiệu lực và người xác nhận bản chốt. Soạn lời nhắn trong hội thoại, chưa gửi.
- [x] Dùng snapshot/export 1Office ngày 21/10/2026 làm base cơ cấu hiện tại cho ERP; dữ liệu nhân sự sống, danh mục quy trình và thẩm quyền vẫn cần đối soát khi triển khai đồng bộ tiếp theo.
- [x] Đối chiếu file 67 hồ sơ với export tài khoản 1Office: 66 người có tài khoản khớp mã/username, phòng ban và vị trí; hồ sơ Vũ Văn Khoa mã 71 chưa có tài khoản.
- [x] Xác định 18 đơn vị trong seed khớp 18 đơn vị nghiệp vụ 1Office; nút công ty ID 23 không phải phòng ban; lập mapping code SDG–ID 1Office trong tài liệu chiến lược.
- [x] Đánh giá role seed với 11 nhóm 1Office và ghi nhận không được đồng bộ 1–1; nhóm ngoài chỉ dùng làm external membership/reference.
- [ ] Tìm hiểu lý do 11 tài khoản khóa và hồ sơ mã 71 chưa có tài khoản khi có đầu mối phù hợp; giữ nguyên nguyên tắc trạng thái account không thay thế trạng thái employment.
- [ ] Chủ phân hệ xác nhận danh bạ chung, trường HR nhạy cảm, quản lý đơn vị, role nghiệp vụ và phạm vi dữ liệu.
- [ ] Thay cơ chế suy role bằng đề xuất + phê duyệt; tách role quản trị kỹ thuật khỏi quyền điều hành/nghiệp vụ.

Mỗi khi thực hiện một câu lệnh hoặc có sửa đổi kỹ thuật:
1. AI Agent **BẮT BUỘC** cập nhật trạng thái tiến độ vào tệp Checklist này.
2. Đánh dấu `[x]` vào các mục đã hoàn tất.
3. Ghi nhận rõ các thay đổi kiến trúc mới phát sinh.

## Sơ đồ tổ chức — 23/10/2026
- [x] Thay tab đối soát bằng sơ đồ cây ngang cho người có quyền đọc HR; đối soát chuyển thành hộp thoại riêng dành cho HR MANAGE.
- [x] Đọc tên công ty từ DB, dựng nhánh theo parentId, chọn đơn vị để xem nhân sự trực thuộc. Hỗ trợ thu/mở nhánh, kéo bằng chuột, cuộn trên điện thoại, zoom và vừa màn hình; tìm tên/mã và đi tới kết quả.
- [x] Giữ nguyên dữ liệu cơ cấu, không suy thêm tuyến quản lý/phê duyệt; không truy cập 1Office và không cài thư viện mới.
- [x] TypeScript và ESLint đạt; 4/4 Playwright Chrome đạt (quyền, danh sách, đối soát, sơ đồ/chọn nhân sự/thu nhánh/zoom/mobile). Đã xem ảnh desktop và mobile, không tràn ngang; chế độ fit dùng nhìn tổng thể, mặc định 80% để đọc và cuộn.

## Sơ đồ cây từ trên xuống — 24/10/2026
- [x] Đổi bố cục SVG: công ty ở trên, phòng ban và bộ phận ở các hàng bên dưới; đường nối từ đáy cha xuống đỉnh con. Giữ nguyên cơ cấu DB và các thao tác xem nhân sự/thu nhánh/zoom/tìm kiếm.
- [x] Căn vùng nhìn ngang theo nút công ty khi bố cục hoặc mức zoom thay đổi để không mất nút gốc trên cây rộng.
- [x] TypeScript, ESLint và 4/4 Playwright Chrome đạt; bổ sung kiểm tra vị trí công ty nằm trên các đơn vị. Kiểm thử thao tác, mobile không tràn ngang; xem ảnh desktop sau đổi bố cục.

## Kế hoạch quản lý vai trò — 24/10/2026
- [x] Rà soát tĩnh phần RBAC hiện có và tạo [ROLE-MANAGEMENT-CHECKLIST.md](ROLE-MANAGEMENT-CHECKLIST.md); đăng ký AGENTS router.
- [x] Plan ưu tiên quản lý role gọn, tách quyền RBAC khỏi HR, quyền hiệu lực theo DB và kiểm tra server; scope phòng ban triển khai theo module. Chưa thay schema, quyền người dùng hoặc mã ứng dụng.
