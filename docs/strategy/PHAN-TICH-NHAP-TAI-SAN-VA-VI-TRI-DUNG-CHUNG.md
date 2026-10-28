# Phân tích nhập danh sách tài sản và vị trí dùng chung

**Ngày phân tích:** 27/10/2026. **Trạng thái:** đọc nguồn, kiểm tra schema/DB và đề xuất; chưa nhập, sửa hoặc xóa dữ liệu nghiệp vụ.

## 1. File đã đọc và số lượng thực tế

Nguồn cập nhật: [DANH-SACH-TAI-SAN-CHI-TIET-TU-GHI-CHU.xlsx](../../outputs/asset-inventory-20261027/DANH-SACH-TAI-SAN-CHI-TIET-TU-GHI-CHU.xlsx), sheet `Chi tiết kiểm kê`, vùng A1:I96, tiêu đề cột dòng 4, dữ liệu dòng 5–96.

SHA256 tại lúc đọc: `7f2708c3262e7729a1ff8acce75f00093902344ec0f59f93151c3f99c3e49068`.

File Word `docs/bao-cao/DANH-SACH-TAI-SAN-IT-VA-GHI-CHU.docx` vẫn là mẫu cũ 90 dòng có ghi chú trống; không phải nguồn ghi chú mới. Workbook mới đã thay đổi so với bản tạo ban đầu được mô tả trong checklist.

| Nhóm | File mới | Chứng từ tham khảo hiện có trong DB |
| --- | ---: | ---: |
| Máy tính lắp ráp | 33 | 33 |
| Laptop | 19 | 19 |
| Bộ phát WiFi | 10 | 10 |
| Điện thoại bàn | **10** | **8** |
| Tổng đài | 1 | 1 |
| Máy chủ | 1 | 1 |
| UPS | 1 | 1 |
| Cân bằng tải | 1 | 1 |
| Switch | 1 | 1 |
| Máy in | 12 | 12 |
| Máy Scan | 3 | 3 |
| **Tổng dòng** | **92** | **90** |

- 92 mã trong cột ID, không trùng sau chuẩn hóa hoa/thường. Đây là mã ghi trong file (PC01, Lap01, AP01…), không phải ID số nguyên của DB.
- 46 dòng có tên người; 44 dòng khớp tên duy nhất trong file HR final, 2 dòng cần ánh xạ khác cách viết. Đây là độ khớp tên, không phải chứng nhận đã bàn giao thực tế.
- 46 dòng chưa ghi người. Có thiết bị dùng chung, dự phòng và dòng chưa rõ; không gán toàn bộ 46 dòng thành SHARED hoặc tự gán cho IT.
- Sheet Tổng quan đã có 92 và điện thoại 10, nhưng phần lưu ý vẫn nói “giữ 08 dòng”; sheet Hướng dẫn còn mô tả các cột mã dòng/serial/cần xác minh không còn trong bảng chi tiết 9 cột. Phải đọc cấu trúc thực tế, không dùng cấu hình importer cũ hoặc con số 49 cần xác minh từ bản trước.
- Ghi chú tại SRV01 và LB01 chứa thông tin truy cập. Không sao chép nội dung này vào báo cáo, audit hay ghi chú tài sản; khi nhập cần tách sang nơi lưu thông tin truy cập phù hợp. Phân tích này không sửa file gốc.

## 2. DB hiện có và loại xung đột

Kiểm tra trực tiếp công ty Sao Đỏ: 0 tài sản cá thể, 0 vị trí vật lý, 0 bàn giao, 0 bảo trì, 0 lịch sử vị trí; đã có 11 loại tài sản, 1 chứng từ DRAFT/11 dòng tham khảo, 18 đơn vị, 80 hồ sơ nhân sự (72 theo HR), 68 tài khoản.

Vì chưa có tài sản cá thể, hiện không có mã thiết bị đã tồn tại để va chạm. Các vấn đề chính là ánh xạ, ý nghĩa cột và thiếu trường quản lý; không phải các bảng tự mâu thuẫn với nhau.

| Bảng | Dữ liệu liên quan | Xung đột/điểm thiếu | Phương án |
| --- | --- | --- | --- |
| `loai_tai_san` / AssetCategory | 11 nhóm | DB có tên loại kèm model như “Máy chủ Dell T360”, “Switch Cisco 24 Port 100/1000”; file chỉ ghi “Máy chủ”, “Switch” | Dùng mapping về 11 category code hiện có, không tạo loại mới theo chuỗi tên. Có thể đổi nhãn loại chung sau; hãng/model nằm ở từng tài sản |
| `chung_tu_kiem_ke`, `dong_kiem_ke` | 92 dòng so với 90 tham khảo | Điện thoại tăng 2; chứng từ cũ không phải tồn kho hiện tại | Tạo đợt nguồn mới giữ 92 dòng hoặc 11 nhóm kèm mapping mã dòng; giữ bản tham khảo cũ, không cộng hai nguồn thành 182 thiết bị. Không tự CONFIRMED chứng từ từ việc đọc file |
| `tai_san` / Asset | Mã, loại, hãng/model, ghi chú | assetCode bắt buộc/unique; file không có serial/trạng thái hoạt động. Mặc định IN_STOCK sẽ gán sai nghĩa cho dữ liệu chưa xác định | Có thể dùng PC01/Lap01… làm mã nội bộ ổn định sau khi chốt quy ước; serial trống = null, không dùng chuỗi rỗng. Không tự coi tất cả đang trong kho hoặc GOOD. Bổ sung trạng thái chưa xác định hoặc giữ dòng chưa đủ ở bước preview |
| `nhan_su` / Employee | Người dùng PC/laptop | Hai cách viết tên khác, một lệch phòng; DB còn hồ sơ trùng tên ngoài final | Ghép với 72 người chuẩn, không với tất cả 80. Xem bảng ngoại lệ bên dưới; không tạo người mới từ tên tài sản |
| `phong_ban` / Department | Cột Phòng ban/Bộ phận | Tên viết tắt và cả tên địa điểm như Lễ Tân, Phòng họp | Map tên đơn vị về cây hiện có; địa điểm sang PhysicalLocation. Không tạo “phòng ban Sảnh/Lễ tân/Phòng họp” để nhập được file |
| `vi_tri_vat_ly` / PhysicalLocation | Sảnh, phòng, tầng, tủ rack | DB chưa có bản ghi; nhiều ô ghi công dụng/người cũ thay vì vị trí | Khởi tạo cây địa điểm độc lập; ROOM/ZONE/FLOOR/RACK đã có. departmentId nullable nên sảnh/hành lang không cần phòng ban |
| `ban_giao_tai_san` / AssetAssignment | Cá nhân/phòng/dùng chung | Có USER/DEPARTMENT/SHARED nhưng không có ngày bàn giao thực tế trong file | Không dựng lịch sử bàn giao giả. Nếu tạo bản ghi hiện trạng ban đầu, ghi rõ ngày ghi nhận lúc nhập, không khẳng định đó là ngày bàn giao thực tế |
| `lich_su_vi_tri_tai_san` / AssetLocationHistory | Vị trí hiện tại | Thiếu ngày đặt; chưa rõ nhiều vị trí | Ghi nhận từ thời điểm khởi tạo khi đã xác định vị trí, không suy lịch sử trước đó |
| `bao_tri_tai_san` / AssetMaintenance | Chưa có nội dung sửa chữa cụ thể | “Máy cũ”, “không sử dụng”, “dự phòng” không phải chứng cứ hỏng/bảo trì | Giữ ghi chú, không tự tạo phiếu sửa hoặc trạng thái BROKEN |
| `nguoi_dung`, `nguoi_dung_vai_tro` | Người thao tác nhập/quản lý | Không phải người giữ tài sản | Nhập tài sản không tạo tài khoản hoặc cấp role. Người sử dụng tham chiếu Employee dù không có tài khoản |

Asset hiện có `currentDepartmentId` là đơn vị sử dụng, **chưa có trường đơn vị chịu trách nhiệm quản lý độc lập**. Đây là khoảng thiếu cần bổ sung nếu triển khai quyền theo phòng ban; không dùng một cột vừa làm đơn vị quản lý, vừa làm vị trí, vừa làm đơn vị người dùng.

## 3. Ngoại lệ đọc được trong file

| Mã dòng | Nội dung | Cách xử lý trước khi gán |
| --- | --- | --- |
| PC26 | Joonsun Yoon | Đối chiếu với YOON JOON SUN trong final; đã có căn cứ tên khác/ngày sinh khớp ở báo cáo HR. Giữ tên người chuẩn HR |
| Lap12 | Mạc Thị Lệ Dung | Final là Mạc Thị Lê Dung. Đây là ứng viên ánh xạ hợp lý (cùng kế toán, PC20 ghi đúng tên), cần chốt lỗi gõ, không tự sinh người thứ hai |
| Lap09 | Nguyễn Tiến Trung; Ban kiểm soát | Nhân sự final thuộc PTDA. Giữ phòng của người theo HR; cột Ban kiểm soát trong tài sản có thể là đơn vị dùng/đặt máy hoặc ghi cũ. Không tự sửa người sang BKS hay tự kết luận máy đã chuyển PTDA |
| PC19 + Lap11 | Phạm Thị Kim Loan có PC và laptop | Hợp lệ: một người có nhiều tài sản, không đặt unique người giữ tài sản |
| PC20 + Lap12 | Có thể cùng Mạc Thị Lê Dung | Hợp lệ sau khi chốt ánh xạ tên; không gộp hai thiết bị |
| PC02 | “Máy Thịnh cũ” ở cột vị trí | Là thông tin người dùng trước/ghi chú, chưa rõ ai hoặc máy đặt đâu; không tạo vị trí tên này hoặc gán người hiện tại |
| PC13 | “Dùng chung Scan” | Công dụng dùng chung; chưa phải tọa độ/phòng đặt máy |
| PC14 | “chỗ Hoàng Thị Thảo” | Gợi ý vị trí gần chỗ ngồi; không đồng nghĩa Hoàng Thị Thảo là người được giao PC này |
| PC15 | “Dự phòng”, “không sử dụng” | Mục đích/trạng thái cần làm rõ; không phải tên vị trí và không đồng nghĩa thiết bị hỏng |
| PC18 | Ghi chú nghỉ thai sản | Không cập nhật tình trạng nhân sự từ ghi chú tài sản; không suy đã trả/thu hồi máy |
| Lap15, Lap16 | “Trình chiếu” | Hai laptop dùng chung cho mục đích trình chiếu; có thể không có người giữ cố định, chưa rõ nơi cất |
| AP02, AP03 | “Lễ Tân”, “Phòng họp” trong cột phòng ban | Đưa vào địa điểm; không tạo phòng ban nghiệp vụ mới. AP03 có ghi chú “còn tồn”, cần làm rõ đang lắp hay dự phòng |
| AP05, AP06 | Dưới bàn Trang/Hương | Là vị trí thiết bị; không gán AP cho Trang/Hương chỉ vì đặt dưới bàn |
| AP10 | HCNS nhưng vị trí “Cty xây dựng T3” | Phân biệt bộ phận quản lý với vị trí. Làm rõ khu vực/đơn vị sở hữu nếu liên quan công ty khác; không tự tạo company hoặc chuyển quyền sở hữu |
| PC33 | Vũ Văn Khoa; ghi “người ở Xây dựng” | Người vẫn theo HR final thuộc BKS; ghi chú không đủ để đổi phòng hoặc suy vị trí máy |
| TEL09, TEL10 | Hai điện thoại bổ sung PTDA/KHĐT | Đưa vào nguồn mới 92 dòng; không ép về tổng 90 của tài liệu tham khảo cũ |
| PBX01, SRV01, UPS01, LB01, SW01 | Phòng server tầng 3 | Cùng tham chiếu phòng vật lý này; chỉ thêm tủ rack/điểm đặt khi xác định được, không cần gán cá nhân |

Các tên phòng trong file có thể map về đơn vị hiện có: BQL dự án → QLDA_NDV1; Kế hoạch đầu tư → KHDT; Phát triển dự án → PTDA; Kế toán → TCKT; Kinh doanh → KD; Hành chính nhân sự → HCNS; Ban kiểm soát → BKS; Pháp chế → PC; Ban lãnh đạo → BLD. Mapping tên không có nghĩa mọi ô đó đều thể hiện quyền quản lý tài sản.

## 4. Mô hình quản lý đề xuất: ba thông tin độc lập

1. **Đơn vị quản lý:** chịu trách nhiệm theo dõi/sửa chữa và làm căn cứ phạm vi quyền. Đề xuất thêm `Asset.managingDepartmentId` nullable, cùng công ty, cột tiếng Việt `dinh_danh_phong_ban_quan_ly`. Chỉ gán HCNS/IT khi đã được xác nhận chịu trách nhiệm; không mặc định mọi thiết bị trong file do HCNS sở hữu/quản lý.
2. **Người hoặc đơn vị sử dụng:** tận dụng `currentCustodianId` và `currentDepartmentId`; không bắt buộc người nhận với tài sản chung. Một người có thể dùng nhiều thiết bị. Phòng của người và phòng dùng tài sản không cần lúc nào cũng bằng nhau; chuyển phòng nhân sự không tự chuyển tài sản.
3. **Vị trí vật lý:** tận dụng `currentLocationId` → PhysicalLocation, độc lập với Department. Vị trí có thể là tòa nhà, tầng, phòng, khu vực, tủ rack, kho; chưa rõ thì để trống để bổ sung, không tạo phòng giả.

| Trường hợp | Người sử dụng | Đơn vị dùng | Vị trí | Loại ghi nhận |
| --- | --- | --- | --- | --- |
| PC cấp cho nhân viên | Employee cụ thể | Phòng sử dụng nếu biết | Phòng/điểm đặt nếu biết | USER |
| Máy in chung phòng | Có thể trống | Phòng sử dụng | Phòng đặt máy | DEPARTMENT |
| Laptop trình chiếu | Có thể trống | Phòng quản lý sử dụng nếu rõ | Nơi cất/đặt khi xác định | SHARED |
| AP ở sảnh/hành lang | Trống | Có thể trống | Khu vực sảnh/hành lang | SHARED |
| Server/UPS/tổng đài | Có thể trống | Đơn vị dùng nếu phù hợp | Phòng server → rack nếu biết | SHARED |
| Thiết bị chưa xác định người hoặc vị trí | Trống | Trống nếu chưa rõ | Trống nếu chưa rõ | Chưa tạo bàn giao; không tự xếp SHARED |

USER/DEPARTMENT/SHARED đã tồn tại ở AssetAssignment. Có thể lấy chế độ dùng từ bản ghi hiện hành, chưa cần thêm bảng riêng hoặc nhân đôi enum chỉ để phân loại. SHARED chỉ mô tả cách dùng, không có nghĩa mọi tài khoản đều được quyền xem/sửa.

Ví dụ **AP ngoài sảnh** (minh họa, không khẳng định AP cụ thể trong file nằm ở tầng nào):

- `PhysicalLocation`: Tòa nhà → Tầng đã xác định → Sảnh, loại ZONE, `departmentId = null`.
- `Asset`: loại WIFI_AP; `currentLocationId` trỏ tới Sảnh; `currentCustodianId = null`, `currentDepartmentId` có thể null.
- `managingDepartmentId`: HCNS nếu được phân công quản lý, hoặc đơn vị phụ trách được xác nhận.
- Ghi nhận sử dụng chung, không tạo nhân sự giả “Dùng chung”, không tạo phòng ban giả “Sảnh”.

Không cần tái cấu trúc toàn bộ các bảng để hỗ trợ ví dụ này. Các quan hệ người/phòng/vị trí hiện đều nullable và đã có loại vị trí ZONE.

## 5. Ràng buộc cần hoàn thiện khi viết importer

- Kiểm tra asset/category/location/employee/department/sourceLine cùng công ty ở server; các FK tài sản hiện chỉ tham chiếu ID đơn, chưa tự cưỡng chế toàn bộ quan hệ cùng company như Employee–Department.
- Xác định khóa import ổn định (mã tài sản đã chốt và nguồn); đọc lại file không sinh tài sản/lịch sử trùng. Không dùng số dòng Excel làm ID vĩnh viễn khi file có thể thêm/sắp xếp dòng.
- Dùng transaction cho tài sản + ghi nhận sử dụng/vị trí + audit. Các index `(assetId, returnedAt)`/`(assetId, removedAt)` hiện không phải unique; cần kiểm soát đồng thời để không có hai bản ghi hiện hành. Có thể dùng khóa theo tài sản hoặc unique index có điều kiện qua migration.
- Không dùng ngày file/giờ import để giả ngày mua, bảo hành, bàn giao hoặc sửa chữa lịch sử. Ghi rõ đây là hiện trạng ban đầu và thời điểm được nhập.
- Không yêu cầu serial, giá mua hoặc vị trí chính xác cho mọi thiết bị ngay khi bắt đầu. Cho phép bổ sung dần, nhưng phải thể hiện đúng “chưa xác định” thay vì tự điền tình trạng tốt/trong kho.
- Không tạo phiếu bảo trì từ ghi chú chung; không chép thông tin đăng nhập thiết bị vào trường notes/specifications/audit.

## 6. Tác động tới 3D và việc khởi tạo lại HR

Trang 3D hiện chỉ lấy Department + Employee, panel lọc theo mã phòng ban; chưa truy vấn Asset/PhysicalLocation. Nhập dữ liệu DB chưa làm AP tự xuất hiện trong mô hình.

Bước bổ sung cần thiết: tải vị trí/tài sản theo tầng, đặt marker ở ROOM hoặc ZONE, bấm marker xem thiết bị/người dùng/tình trạng. Không suy vị trí tài sản từ phòng của nhân viên. Một phòng vật lý có thể phục vụ nhiều phòng ban; tài sản chung vẫn hiển thị tại địa điểm của nó. Quyền xem tài sản kiểm tra theo phân hệ/phạm vi quản lý tài sản, không chỉ dùng HR VIEW như trang hiện tại.

PhysicalLocation hiện có tọa độ X/Y/Z. Nếu muốn nhiều điểm thiết bị trong một phòng, có thể tạo vị trí con cho từng điểm đặt đã xác nhận; không sửa tọa độ chung của phòng cho mỗi thiết bị hoặc tự bịa tọa độ từ ghi chú. `threeDKey` là khóa ổn định trong mapping mô hình, không dùng tên người làm khóa.

Phương án khởi tạo lại 72 nhân sự/tài khoản đang ở bước đánh giá. **Nên làm sạch HR trước rồi mới gán tài sản cá thể theo Employee.id.** Nếu nhập tài sản trước rồi xóa người, FK `ON DELETE SET NULL` sẽ làm mất người giữ hiện tại; không thể tự phục hồi chỉ bằng việc nhập lại tên giống nhau. Trong lúc chờ có thể chuẩn bị danh mục, bản đối chiếu nguồn và cây vị trí.

## 7. Thứ tự triển khai đề xuất

1. Chốt luồng HR 72 người và tài khoản; hoàn tất khởi tạo lại nếu chọn phương án đó.
2. Chuẩn hóa danh mục loại và cây vị trí, tách các ô công dụng/người cũ khỏi cột vị trí.
3. Bổ sung đơn vị quản lý; thống nhất cách lưu trạng thái chưa xác định và nguồn ghi nhận ban đầu.
4. Preview 92 dòng: mã, loại, người ghép được, nơi dùng, vị trí, các ngoại lệ và số lượng tăng 2 điện thoại. Dùng dữ liệu cập nhật của người phụ trách, không mặc định ảnh cũ là trần số lượng.
5. Nhập các dòng đã xác định, để trống thông tin chưa biết đúng nghĩa; chốt riêng các liên kết mơ hồ. Kiểm tra chạy lại không trùng.
6. Xây danh sách quản lý tài sản trước, sau đó nối 3D vào cùng DB. Chưa cần phần mềm riêng cho “tài sản chung”.
