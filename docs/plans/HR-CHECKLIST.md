# Kế hoạch nhân sự, phòng ban và tài khoản

Cập nhật: **12/11/2026**. Nền chức năng đã triển khai, đang ở mức thử nghiệm. Đã đối chiếu `/employees`, `/departments`, actions HR và DB: hồ sơ/cơ cấu, người phụ trách và FK vị trí đều có; số liệu hiện tại tại [bảng đối chiếu](README.md#đối-chiếu-plan-với-code-và-db). Các con số backup/reset trong biên bản bên dưới là lịch sử, không phải trạng thái vận hành cố định.

Rule nghiệp vụ: [HR-RULES](../../.agents/rules/HR-RULES.md).

## Ô chọn có tìm kiếm — 12/11/2026

- [x] Ô chọn phòng ban, người phụ trách và vị trí làm việc: đã chuyển sang tìm/chọn có hỗ trợ không dấu; kiểm thử giao diện và hồi quy đạt. Cách dùng chung và kiểm chứng tại [tổng quan](README.md#ô-chọn-dữ-liệu-có-tìm-kiếm--12112026). Không đổi dữ liệu hoặc quyền.
- [x] Đối chiếu phản ánh về Phạm Thị Kim Loan (SDG-016): nguyên nhân là cây hiển thị mã + chức vụ, ô chọn hiển thị mã + phòng công tác và truy vấn ứng viên thiếu `chuc_vu`; hai dòng phụ khác nghĩa nhưng thiếu nhãn. Người dùng đã duyệt triển khai phương án thống nhất hiển thị.
- [x] Bổ sung chức vụ vào dữ liệu ứng viên và nhãn “Chức vụ” ở cây/sơ đồ/ô chọn; ô chọn tách dòng “Phòng công tác” + mã, giữ thông tin sau chọn và tìm thêm theo chức vụ. Thiếu chức vụ hiển thị “Chưa có chức vụ”. `SearchableSelect` giữ xuống dòng trong mô tả; không đổi hợp đồng lựa chọn, schema, mutation hoặc quyền. Đã ghi nghiệp vụ vào [rule HR](../../.agents/rules/HR-RULES.md#hồ-sơ-và-cơ-cấu).
- [x] Kiểm chứng cuối: TypeScript/lint bốn file ứng dụng, 5 E2E liên quan (CRUD phòng ban, phụ trách kiêm nhiệm/giới hạn công ty/người nghỉ việc và 3 ca ô chọn chung) đạt trên DB riêng; 3 ca ô chọn chạy lại đạt sau chỉnh độ tương phản. Lần đầu máy chủ thử nghiệm dừng ở nhắc cập nhật Next.js nên chưa truy cập được; đã khởi động lại, xác nhận sẵn sàng và chạy lại đạt, không đổi dependency.
- [x] Chrome desktop/mobile/sáng/tối: chức vụ chị Loan khớp cây/sơ đồ/ô chọn và sau chọn; tìm chức vụ không dấu đúng; người trùng tên phân biệt bằng mã, trường trống hiện “Chưa có chức vụ”. Chữ phụ dùng màu phù hợp khi hover/điều hướng trên nền xanh. Lượt xem không gửi form, không lỗi JavaScript hoặc tràn ngang ở mobile 390px; đã xem lại ảnh sau chỉnh màu.
- [x] Đã dừng app riêng và dọn DB thử; mã/ảnh/log tại `outputs/department-head-labels/` ngoài Git. Đối chiếu 17 bảng vận hành: 14 giữ nguyên, 3 bảng tài sản/audit thay đổi đồng thời ngoài luồng kiểm tra được giữ nguyên, không ghi đè. 68 liên kết/anchor tài liệu và `git diff --check` đạt; đã cập nhật nghiệp vụ HR, đề xuất chuẩn Frontend dùng chung tại [tổng quan](README.md#ô-chọn-dữ-liệu-có-tìm-kiếm--12112026), chưa sửa ba rule kỹ thuật chung.

## Danh bạ theo phòng ban — 09/11/2026

- [x] Mặc định xem thẻ phòng cấp trên; mở phòng thấy bộ phận con và nhân sự trong nhánh. Số người tính theo hồ sơ, ghi rõ phạm vi cả đơn vị con; người phụ trách lấy từ quan hệ DB.
- [x] Tìm toàn công ty có hỗ trợ không dấu, lọc tình trạng; danh bạ 12 người/trang, bảng 15 người/trang. Hồ sơ xem bên phải; chỉ HR MANAGE thấy sửa. Giữ bộ lọc, trang, vị trí và focus khi đóng hồ sơ. Avatar dùng ảnh đã có hoặc chữ viết tắt; thông tin tài khoản chi tiết vẫn cần quyền riêng.
- [x] 20 E2E liên quan đạt (18 hồi quy HR/tài khoản/form + 2 danh bạ); hai ca danh bạ chạy lại đạt sau chỉnh focus. Kiểm tra nhánh cha/con, head kiêm nhiệm, không suy head từ chức vụ, tìm không dấu toàn công ty, tình trạng, người chưa gắn phòng, liên kết có bộ lọc, phân trang và HR VIEW. Chrome desktop/mobile/sáng/tối không tràn ngang hoặc lỗi console; TypeScript/lint đạt. Không đổi schema, mutation hoặc quyền.

## Đồng bộ giao diện — 09/11/2026

- [x] Phòng ban có số liệu cơ cấu/người phụ trách, giữ cây và sơ đồ hiện có. Giao diện nhân sự tiếp tục được thu gọn theo mục Danh bạ ở trên; không đổi quyền, nguồn hoặc dữ liệu.
- [x] TypeScript/lint đạt; nhóm nhân sự/tài khoản chạy lại 14/14 E2E đạt sau sửa bảng responsive dùng chung DOM. Kiểm tra Chrome desktop/mobile: nhân sự, phòng ban không tràn ngang; tìm kiếm và cây giữ nguyên hành vi.

## Gán vị trí hai chiều — 10/11/2026

- [x] Tái sử dụng luồng gán vị trí tại bảng chi tiết 3D HCNS, giữ quyền HR riêng và chỉ cập nhật FK. Phạm vi/kiểm chứng tại [plan 3D](OFFICE-3D-CHECKLIST.md).
- [x] Form HR và chi tiết vị trí dùng cùng FK và quy tắc chuyển; action tại vị trí chỉ cập nhật chỗ làm việc, không ghi đè các trường hồ sơ khác. Người đã gán nơi khác cần xác nhận; version cũ bị từ chối, danh sách tại vị trí được làm mới để chọn lại.
- [x] Xóa vị trí qua ERP tự bỏ gán nhân sự trong cùng transaction và audit; đủ LOCATIONS MANAGE + HR MANAGE khi có người, không đổi ID hoặc trạng thái người. Quy tắc chi tiết tại [plan vị trí](LOCATION-MANAGEMENT-CHECKLIST.md).
- [x] 11 E2E liên quan và 8 unit đạt; TypeScript/lint đạt. Kiểm chứng UI desktop/mobile/sáng/tối, quyền, đồng thời và audit rollback trên DB tạm đã dọn; fingerprint 15 bảng vận hành giữ nguyên. Kết quả chi tiết và bằng chứng tại [plan vị trí](LOCATION-MANAGEMENT-CHECKLIST.md).

## Đã hoàn thành

- [x] Tách nghiệp vụ khỏi rule Frontend/Backend chung sang `HR-RULES.md`; đăng ký router, giữ quyết định DB trong plan. Chỉ sắp xếp tài liệu, không thay tính năng.

- [x] Nhập danh sách HR final 72 người; nhân sự và phòng ban vận hành độc lập trong ERP, không chờ API hoặc đối soát 1Office.
- [x] Tách `nhan_su` và `tai_khoan`: một người có 0..N tài khoản, số người không tính từ số tài khoản.
- [x] Mã nhân sự tự sinh, không sửa hoặc tái sử dụng; chức vụ là text. Prisma Studio và PostgreSQL dùng cùng tên theo quy ước lai hiện hành.
- [x] Thêm/sửa hồ sơ, tìm kiếm, lọc trạng thái/phòng; các trường bắt buộc có dấu `*` và báo lỗi. Liên hệ/ngày/ghi chú bổ sung sau.
- [x] CRUD phòng ban, cây cha–con, sơ đồ từ trên xuống, mở nhánh xem nhân sự; chặn vòng lặp và xóa phòng còn người/đơn vị con.
- [x] Chọn người phụ trách từng phòng; một người có thể phụ trách nhiều phòng. Hiển thị các phòng phụ trách trong danh sách nhân sự.
- [x] Tạo hồ sơ kèm tài khoản tùy chọn trong một lần lưu cho người đủ quyền; `/accounts` quản lý tài khoản và gán vai trò hiện có.
- [x] Lưu nghỉ việc tự khóa các tài khoản liên kết đang mở và thu hồi phiên. Làm việc trở lại không tự mở tài khoản; bảo vệ quản trị cuối cùng.
- [x] Kiểm tra quyền tại giao diện/server, cùng công ty và ghi nhật ký; sửa hồ sơ không tự cấp thêm quyền.
- [x] Chuẩn hóa khóa DB sang `id`, `company_id`, `department_id`, `employee_id`, `parent_id`; dữ liệu 73 người/61 tài khoản/19 phòng ban giữ nguyên sau migration 06/11.

## Quy tắc cần giữ

| Nội dung | Quyết định |
| --- | --- |
| Nguồn dữ liệu | File HR final là nguồn khởi tạo; chỉnh sửa hiện hành tại ERP. Metadata 1Office/HR chỉ để truy nguyên |
| Chức vụ / phụ trách / quyền | Ba khái niệm riêng; không suy quyền hoặc trưởng phòng từ text chức vụ |
| Tạo người | Nhập họ tên, chọn phòng, tình trạng mặc định Đang làm việc; mã tự cấp, công ty lấy từ phiên |
| Cấp tài khoản | Tùy chọn tạo kèm tài khoản, chọn sẵn khi thêm người và đủ quyền; tự sinh tên/mật khẩu tạm, không chọn role thì dùng DEFAULT. Có thể chỉ tạo hồ sơ hoặc chọn nâng cao |
| Người được thao tác | HR MANAGE sửa hồ sơ/cơ cấu và ghi nhận nghỉ việc; ACCOUNTS MANAGE cấp/mở tài khoản và gán role trong quyền được phép; ROLES MANAGE quản trị ma trận và cấp mọi quyền |
| Người phụ trách nghỉ việc | Giữ liên kết, cảnh báo cần phân công lại; không tự chọn người thay |
| Sửa dữ liệu trực tiếp | Studio/SQL không chạy quy trình khóa/audit của action; phiên vẫn chặn người LEFT. Vận hành qua giao diện ERP |

## Việc tiếp theo

- [x] Tách quyết định DB của HR/phòng ban khỏi rule DB tổng quát; tập trung ở mục dưới, giữ nguyên schema và dữ liệu.

- [x] Khảo sát mẫu Excel HCNS và lập [plan báo cáo công việc tuần dùng chung](WEEKLY-REPORT-CHECKLIST.md) theo yêu cầu ngày 11/11/2026. Kết quả khảo sát, thiết kế JSONB/audit, giao diện giống Excel, các điểm cần chốt và bước triển khai được quản lý tại plan riêng; chưa triển khai chức năng hoặc migration.
- [x] Áp dụng [thiết kế tài khoản mặc định/profile](PROFILE-DASHBOARD-CHECKLIST.md): tự sinh tên, DEFAULT không bắt chọn role; giữ tùy chọn chỉ tạo người và kiểm tra riêng quyền cấp tài khoản.
- [ ] Người phụ trách xác nhận và chọn head thực tế cho các phòng; không tự gán hàng loạt.
- [x] Triển khai bản đầu [vai trò và phân quyền](ROLE-MANAGEMENT-CHECKLIST.md).
- [ ] Dùng thử quyền với tài khoản thực tế và cấu hình [workflow đã triển khai thử nghiệm](WORKFLOW-CHECKLIST.md).
- [ ] Chốt ai được xem trường HR nhạy cảm, phạm vi danh bạ và thông tin hiển thị trên 3D.
- [ ] Khi cần: xuất–nhập Excel theo mã ERP, xem trước chênh lệch; không ghi đè từ nguồn cũ hoặc dùng STT/tên làm khóa.
- [x] Chốt hướng dùng chung bảng `vi_tri` với tài sản; thiết kế tại [plan vị trí](LOCATION-MANAGEMENT-CHECKLIST.md).
- [x] Gán/chuyển/gỡ vị trí trong hồ sơ theo HR MANAGE; hiển thị đường dẫn vị trí cho HR VIEW. 3D HCNS đọc người đang làm việc đã được gán, không suy từ ghi chú hoặc phòng ban.
- [x] 8/8 E2E (3 gán vị trí, 2 danh bạ, 3 HCNS) và 5 unit đạt. Kiểm tra gán/chuyển/gỡ, audit, HR MANAGE không cần LOCATIONS, HR VIEW không sửa, quyền vị trí không lộ người, action khác công ty/version cũ. TypeScript/lint đạt; đã xem ảnh form desktop/mobile và mô hình sáng/tối, không lỗi JS hoặc tràn ngang. Kiểm thử ghi chỉ chạy trên DB khôi phục tạm; `employee-location.spec.ts` tự bỏ qua khi không dùng DB `sdg_hr_location_test_*` có ánh xạ HCNS.
- [x] Bản đồ tòa nhà đã chuyển sang đọc người ACTIVE theo nhánh vị trí đã xác nhận, cần LOCATIONS + HR; bỏ ghép người theo mã phòng ban. Tòa nhà và HCNS dùng cùng nội thất, kiểm chứng tại [plan 3D](OFFICE-3D-CHECKLIST.md).

## Thiết kế DB cần giữ

- `nhan_su.vi_tri_lam_viec_id` nullable → `vi_tri(id, company_id)`, Restrict, không unique: mỗi người một vị trí chính, một vị trí có thể nhiều người. Chỉ gán mới người ACTIVE vào PHONG/KHU_VUC/CHO_NGOI với cả nhánh đang dùng; nghỉ việc giữ liên kết nhưng không hiện là người đang ngồi trên 3D. Chuyển phòng ban không tự chuyển vị trí.
- Gán vị trí khóa công ty, kiểm tra quyền hiện hành và phiên bản hồ sơ khi đổi liên kết, lưu cùng audit HR. Client cũ không gửi trường này thì giữ nguyên liên kết. Ngừng dùng/đổi sang loại không hợp lệ vẫn chặn người tham chiếu. Xóa vị trí có xác nhận sẽ tự gỡ liên kết mọi người (kể cả đã nghỉ), theo plan vị trí; giữ FK Restrict và audit nguyên tử. Nghỉ việc riêng không tự giải phóng chỗ.
- Migration `20261110160000_vi_tri_lam_viec_nhan_su` đã thử trên DB khôi phục từ backup rồi áp dụng local: fingerprint 15 bảng cũ giữ nguyên (bỏ cột mới khỏi phép so sánh), không seed phân công hoặc thay tài khoản/quyền. Có FK kép và trigger kiểm tra loại/trạng thái/đồng thời; Prisma Client đã generate. Bằng chứng tại `outputs/hr-locations/` ngoài Git.

- `nhan_su` là người thật; `tai_khoan.employee_id` nullable, không unique (0..N tài khoản/người). Không khôi phục các cột `legacy*` đã bỏ hoặc chép hồ sơ người vào tài khoản; `ten_hien_thi` là nhãn tài khoản. Nhật ký hoạt động tham chiếu tài khoản, không dùng số tài khoản làm số nhân sự.
- Nhân sự gắn phòng bằng `(department_id, company_id)`; tài khoản gắn người bằng `(employee_id, company_id)`. Phòng là nút của cây cùng công ty; chức vụ chỉ là text. `nguoi_phu_trach_id` nullable, FK kép cùng công ty, Restrict, không unique: một người có thể phụ trách nhiều phòng, kể cả phòng khác nơi công tác. Chỉ chọn mới người ACTIVE; nghỉ việc giữ liên kết để bàn giao, không tự chọn người thay.
- `tinh_trang_lam_viec` ACTIVE/LEFT/UNKNOWN độc lập `cho_phep_dang_nhap`. Action ghi nhận LEFT khóa mọi tài khoản đang mở, tăng phiên bản phiên và ghi audit cùng transaction; ACTIVE/UNKNOWN không tự mở lại. Không có trigger DB tự khóa tài khoản; session vẫn kiểm tra LEFT. Khóa riêng tài khoản không đổi trạng thái người.
- `ma_nhan_su` bắt buộc, unique trong công ty, cấp bằng `so_thu_tu_ma_nhan_su`/`tao_ma_nhan_su()`, bất biến qua trigger `ma_nhan_su_bat_bien`. Không dùng STT, tên hoặc mã phòng làm định danh; export giữ mã dạng text. Import theo mã phải báo mã lạ/trùng/mâu thuẫn; import không mã cần đối chiếu trước. Định danh nguồn unique theo phạm vi công ty/hệ thống nguồn như schema.
- Phòng ban có mã unique trong công ty; mutation khóa hàng `cong_ty`, rồi khóa phân quyền `(260126, companyId)` khi cần, kiểm tra cây và ghi audit cùng transaction. Xóa phải khóa phòng và kiểm tra không còn con/nhân sự ở bất kỳ trạng thái nào; không dùng SetNull để đẩy con ra cấp công ty.
- HR final là nguồn khởi tạo, ERP quản lý độc lập. Các trường `tep_nguon_nhan_su_hr`, `ngay_chot_nhan_su_hr`, `ghi_chu_nhan_su_hr`, `he_thong_nguon`, `dinh_danh_nguon`, `thoi_diem_chup_du_lieu_nguon` chỉ truy nguyên; `ghi_chu` là nội dung vận hành chỉnh được. Không khóa trường theo nguồn, suy danh tính từ mapping chưa xác minh hoặc suy nghỉ việc do thiếu trong export. Ngày Excel đọc theo UTC calendar date.
- Seed HR chỉ bootstrap khi chưa có hồ sơ và marker; seed cơ cấu chỉ khởi tạo khi chưa có phòng, người hoặc nhật ký DEPARTMENT. Không chạy lại importer cũ, tạo tài khoản hàng loạt hay tái tạo dữ liệu đã dọn. Bảng tài sản cũ đã gỡ; nền mức 1 mới đã triển khai theo [plan tài sản](ASSET-MANAGEMENT-CHECKLIST.md). Xóa phòng quản lý còn tài sản bị chặn; không đổi người/vị trí thiết bị khi nhân sự thay đổi.

Chi tiết cột ở [Từ điển DB](../DATABASE-DICTIONARY.md); quy chuẩn kỹ thuật ở [Rule DB](../../.agents/rules/DATABASE-RULES.md). Lịch sử làm sạch/chuyển đổi đã hoàn thành không phải hướng dẫn chạy lại.

## Kiểm chứng gần nhất

Ngày 05/11: 38 E2E tích hợp + 7 unit đạt theo [checklist không gian cá nhân](PROFILE-DASHBOARD-CHECKLIST.md); dữ liệu 73 người/61 tài khoản và grant cũ giữ nguyên. Các số dưới đây là lần kiểm tra trước.

Ngày 06/11 sau migration quy ước tên: 51 E2E + 9 unit đạt; dữ liệu trở về đúng 73 người, 61 tài khoản, 19 phòng ban và 143 nhật ký như backup trước migration.

Sau đó, theo yêu cầu tạo lại dữ liệu demo ngày 06/11: chạy đủ 15 migration và seed thành công; trạng thái hiện hành là 72 người, 1 tài khoản quản trị, 18 phòng ban. Bản trước reset đã được backup ngoài Git.

Ngày 04/11: bộ 28 ca đã đạt sau sửa selector của kiểm thử cũ; TypeScript, lint phần thay đổi và Prisma diff đạt. Đã xem desktop/mobile; dữ liệu 9 bảng giữ nguyên sau dọn fixture. Chưa coi đây là nghiệm thu sử dụng thực tế.

Tra cứu: [Từ điển DB](../DATABASE-DICTIONARY.md) · [Rule DB](../../.agents/rules/DATABASE-RULES.md) · [Rule backend](../../.agents/rules/BACKEND-RULES.md).
