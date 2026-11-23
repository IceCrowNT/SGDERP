# TÀI LIỆU KIẾN TRÚC TỔNG THỂ & SỔ BỘ THƯ VIỆN

## Cài đặt hệ thống — 16/11/2026

Mở rộng quản trị API ngày 17/11: `src/actions/ai-governance.ts` quản lý tác vụ, ngân sách và usage; `src/lib/ai-cost.ts` tính chi phí Decimal; schema tại `src/lib/validations/ai-governance.ts`. UI `AiGovernance`, `AiGovernanceForms`, `AiUsagePanel`, `AiBudgetSummary` dùng các thành phần chung. Migration `20261117120000_quan_tri_su_dung_ai` thêm cấu hình tác vụ và sổ gọi; đã áp dụng local và kiểm chứng kỹ thuật theo [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#quản-trị-api-openai-mở-rộng--17112026). Không thêm dependency/env; chưa thay key/model hoặc ngân sách thật. Hạn mức để trống không giới hạn theo yêu cầu 17/11; quyền chat nền đã mở rộng cho DEFAULT từ 20/11 theo plan AI. Có trần cần giá đúng model, không trần vẫn ghi token khi thiếu giá; cấu hình môi trường cần được lưu thành kết nối quản lý trước khi dùng sổ chi phí.

Đã có routes `/settings`, `/settings/ai`, UI tại `src/components/settings/` và quyền `AI MANAGE_CONNECTIONS` trong RBAC hiện có; chuyển form key/model khỏi chat. Không thêm dependency hoặc biến môi trường. Thiết kế/nghiệm thu tại [plan cài đặt](plans/SYSTEM-SETTINGS-CHECKLIST.md).

## Bản thử AI quản trị — 16/11/2026

Danh sách/thêm/chọn mặc định tại `src/components/ai/AiConnections.tsx`, form từng kết nối dùng `AiSettings.tsx`; một công ty có nhiều key OpenAI, chat dùng mặc định. Khi thêm key đầu tiên, bảo toàn key/model môi trường vào DB/kho mã hóa nếu đang dùng; không tự sửa `.env`. Có thể gỡ `OPENAI_API_KEY` và `OPENAI_MODEL` sau khi lưu/kiểm tra kết nối quản lý, sao lưu kho + DB và restart; giữ `AI_PILOT_ACCOUNT_ID`. Không thêm dependency/env.

Đã có quản lý key/model tại `src/actions/ai-settings.ts`, `src/components/ai/AiSettings.tsx`, `src/lib/ai-connection.ts` và `src/lib/ai-secret-store.ts`. Một bảng `ket_noi_ai` giữ metadata; secret mã hóa bằng Node crypto, không thêm thư viện. Kho file mặc định `var/ai-secrets/` ngoài Git/public; `master.key` và ciphertext quyền 0600, thư mục 0700; có thể cấu hình `AI_SECRET_STORAGE_DIR` tới volume bền vững. Cần backup DB và kho ciphertext, giữ bản sao `master.key` được bảo vệ riêng; mất master key không thể giải mã khóa cũ. Nhiều instance phải dùng chung DB và volume/kho bí mật phù hợp; không đặt kho trong filesystem tạm của serverless. Không cần sửa `.env.local` để nhập API key/model qua giao diện.

Đã có bản thử theo [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#bản-thử-cho-tài-khoản-quản-trị--16112026): chat dashboard ở `src/components/ai/`, Server Action tại `src/actions/ai.ts`, hợp đồng/công cụ và cấu hình tại `src/lib/ai-pilot*.ts`. Dùng fetch tới Responses API, Zod và form tài sản/vị trí hiện có; không thêm dependency. `canUseAiChat` mở chatbot/tệp riêng cho mọi phiên hợp lệ (gồm DEFAULT); `currentAccountActor` kiểm tra tài khoản/phiên trong transaction, `currentActor` tiếp tục yêu cầu grant nghiệp vụ. `AI_PILOT_ACCOUNT_ID` chỉ còn dùng để xác định công ty của cấu hình môi trường cũ, không kiểm soát quyền chat. `OPENAI_API_KEY`/`OPENAI_MODEL` chỉ dự phòng khi chưa lưu kết nối trong DB và đúng công ty của tài khoản pilot được bind; đã có bản ghi thì trạng thái tạm dừng/lỗi kho khóa chặn gọi, không tự quay về env. Không trả khóa đã lưu về client/Git. Công việc duyệt khấu hao loại dùng `src/actions/ai-work.ts`, hợp đồng `src/lib/ai-work.ts` và thẻ `src/components/ai/AiWorkCard.tsx`; bảng `cong_viec_ai` lưu snapshot/phiên bản/trạng thái/kết quả theo tài khoản, tách khỏi lời chat. Duyệt cập nhật loại và audit trong transaction có khóa công ty; không thêm dependency hoặc biến môi trường. Lịch sử/bối cảnh chat dùng `src/actions/ai-chat.ts`, `src/lib/ai-chat.ts`, helper kiểm tra nguồn `src/lib/ai-chat-server.ts` và hai bảng `hoi_thoai_ai`/`tin_nhan_ai`. Profile có `src/components/profile/AiPreferences.tsx`, đọc/lưu tại action profile, cột `tai_khoan.huong_dan_ai_ca_nhan`; không thêm dependency/env. Chat gửi ID hội thoại và câu hỏi, máy chủ dựng lịch sử; metadata usage/giới hạn dùng nhật ký hiện có. Bảng log usage và cột hạn mức tùy chọn được bổ sung theo đợt 17/11; migration chat đã áp dụng local, kiểm thử kỹ thuật theo plan AI; nghiệm thu API thật còn lại.

## Tài sản — 12/11/2026

Tài liệu được tách ngày 18/11: [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md) giữ tiến độ/việc còn lại; [thiết kế tài sản](THIET-KE-QUAN-LY-TAI-SAN.md) giữ đặc tả DB, tự lưu, khấu hao, QR và gán vị trí.

- Tự lưu chỉnh sửa tài sản dùng hook UI `src/components/assets/use-asset-autosave.tsx` cho bảng, panel và form sửa hồ sơ/loại; giữ Server Actions trực tiếp Prisma, không thêm dependency hoặc schema. Hành vi và kiểm chứng tại [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md#tự-lưu-chỉnh-sửa-tài-sản--16112026).

- Panel sửa tại chỗ dùng `AssetDetailEditor.tsx`, chia nhóm trường với RHF/Zod và `saveAsset` sẵn có; trả hồ sơ/phiên bản mới để giữ panel/URL/cuộn, cập nhật bảng/nhóm và lịch sử. `AssetFinanceFields.tsx` dùng chung form tạo và panel, `asset-form-values.ts` ánh xạ bản nháp; `asset-depreciation.ts` tính ngày lịch/giá trị nguyên VND và `AssetDepreciationBar.tsx` hiển thị phần còn lại. Hai migration ngày 16/11 thêm 4 cột nullable tại `tai_san` và 1 cột tại `loai_tai_san`, CHECK tại DB; không thêm bảng, thư viện hoặc env. Decimal chỉ truyền qua RSC bằng chuỗi; action cũ thiếu trường mới giữ nguyên dữ liệu. Thiết kế/nghiệm thu tại [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md#sửa-trực-tiếp-trong-panel-và-thông-tin-khấu-hao--16112026).

- `AssetGroups.tsx` trình bày danh sách nhóm người/vị trí; bộ lọc loại gọn thuộc `AssetCategoryFilters.tsx`; `getAssetOverview` dùng Prisma groupBy trong transaction đọc nhất quán và quyền ASSETS. Trang `/assets` tải thống kê và mở bảng hồ sơ phân trang mặc định; lọc loại/tìm kiếm/trang được lưu trong URL. `AssetInlineEditor.tsx` sửa các ô vận hành trên một dòng qua RHF/Zod và `saveAsset` hiện có; tự lưu khi chọn/rời ô và giữ bản nháp nếu lỗi. Query vị trí chấp nhận null. Trạng thái nhóm, bộ lọc và cuộn được giữ trong `AssetManager`; form đầy đủ nhận loại mặc định và trường cần focus theo ngữ cảnh.
- Hồ sơ tài sản dùng URL `/assets?asset=<id>` và History API tích hợp Next để giữ panel/bảng khi Back/Forward. `src/lib/asset-link.ts` kiểm tra ID/đích quay lại nội bộ; middleware, trang assets/login/profile giữ link qua đăng nhập và đổi mật khẩu bắt buộc. `AssetQrCard.tsx` tải động `qrcode`, tạo PNG cục bộ, sao chép link và in một tem qua tài liệu iframe riêng. Không thêm schema, dịch vụ ngoài hoặc biến môi trường; origin lấy từ địa chỉ đang mở, có nhắc localhost. Trước in tem thực tế phải dùng địa chỉ ERP ổn định mà điện thoại truy cập được. Chi tiết và nghiệm thu tại [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md#liên-kết-hồ-sơ-và-tem-qr--16112026).

- Panel vị trí 3D dùng chung `src/components/locations/LocationAssets.tsx`, kiểu dữ liệu/kiểm tra cây tại `src/lib/asset-location.ts`. `getAssetLocationCandidates` tải tối thiểu khi mở picker (20 hồ sơ/trang); `assignAssetLocation` chỉ sửa FK vị trí trong transaction/audit ASSETS. `getHcnsRoom` đọc hồ sơ thật theo quyền riêng; hình đại diện theo loại thay minh họa từ ghi chú. Không thêm schema/dependency/env; các thay đổi từ `/assets` cũng revalidate viewer. Nghiệm thu tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md).

- Đợt giao diện thêm route `/assets`, loading và `src/components/assets/` (danh sách, form, chi tiết/lịch sử), nhãn trạng thái tại `src/lib/asset-labels.ts`. Truy vấn danh sách/phân trang và số đếm cùng bộ lọc trong transaction đọc nhất quán; lựa chọn lọc chỉ trả tên đã gắn thiết bị cho ASSETS VIEW. Menu dùng guard ASSETS; form vẫn gọi Server Actions sẵn có. Không thêm thư viện hoặc schema. Tiến độ tại plan tài sản.
- Bố cục tài sản gọn dùng Table/Tabs hiện có; `AssetCategoryIcon.tsx` ánh xạ mã loại sang icon Lucide, loại chưa biết dùng hình hộp. `SearchableSelect` nhận icon tùy chọn để dùng cùng biểu tượng trong form/bộ lọc; giá trị lựa chọn vẫn là ID. Không thêm dependency/schema/env; phạm vi và nghiệm thu tại [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md).

- Đợt 1 thêm hai model `loai_tai_san`, `tai_san`, migration `20261111095809_tai_san_muc_1`, Server Actions `src/actions/asset.ts` và validation `src/lib/validations/asset.ts`. Actions gọi Prisma trực tiếp, cùng khóa công ty/phân quyền với vị trí/HR; audit cùng transaction. Không thêm dependency hoặc biến môi trường.
- Quyền ASSETS VIEW/MANAGE tích hợp catalog, validation và ma trận `/roles`; seed chỉ thêm catalog cho cài mới, không cấp quyền mặc định. Vị trí/phòng ban bổ sung chặn xóa khi còn tài sản. Đã có route/menu `/assets` và liên kết gán vị trí ở HCNS; tiến độ và kiểm chứng tại [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md).
- `tests/integration/assets-foundation.test.cjs` kiểm tra DB và Server Actions trên DB khôi phục riêng; chỉ giả lập cookie request/cache của Next, giữ JWT/phiên/quyền và Prisma thật. `tests/e2e/assets.spec.ts` kiểm tra giao diện/quyền và xử lý lỗi trên Chrome với DB riêng. Backup/script/đầu ra nằm ngoài Git trong `outputs/assets-foundation/` và `outputs/assets-ui/`.

## Viewer 3D thống nhất — 11/11/2026

- `src/lib/office-3d/room-detail.ts` xác định khả năng vào phòng và đọc điểm và bố trí DB; viewer/camera dùng khóa phòng chung. `RoomBackdrop.tsx` giữ nội thất nền KHĐT; `khdt-layout.ts` và `prisma/bootstrap-khdt-layout.ts` khởi tạo 12 bàn một lần, sau đó `vat_the_3d` là nguồn bố trí. Không thêm schema/dependency/env; cách nhập, giữ ID và nghiệm thu tại [plan mở rộng phòng](plans/OFFICE-3D-CHECKLIST.md#phòng-chi-tiết-dùng-chung-và-bố-trí-khđt).

- `RoomFurniture.tsx` cung cấp `EquipmentModel`/`EquipmentDisplay` dùng chung cho bàn cố định, bàn bổ sung và điểm thiết bị; nhận diện loại tại `equipmentForAssets` trong `hcns-layout.ts`. `src/lib/office-3d/equipment-layout.ts` tính vị trí từng thiết bị theo vùng bàn, dùng chung cho render và camera; memo hóa ở component, không thêm DB hoặc chạy mỗi frame. Dựng hình khối theo loại thực sự hiển thị, không tạo mesh cho thư viện chưa dùng; không thêm model/texture/dependency. Danh mục và nghiệm thu tại [plan hình tài sản](plans/OFFICE-3D-CHECKLIST.md#hình-đại-diện-các-loại-tài-sản-hiện-có).

- Sửa tên/mô tả vị trí tại 3D dùng `locations/LocationEditDialog.tsx` và `LocationForm.tsx` (form được tách từ `LocationManager`, vẫn dùng chung tại `/locations`). Action `getLocationForEdit` tải một bản ghi theo quyền LOCATIONS MANAGE và công ty khi mở hộp thoại; ghi qua `saveLocation` hiện có, không thêm schema/dependency. Chi tiết tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md#sửa-thông-tin-vị-trí-ngay-trên-3d).

- `BuildingExplorer` chứa điều khiển và panel trong một vùng làm việc; hook `useExpandedWorkspace.ts` quản lý chế độ mở rộng bằng CSS trên cùng cây DOM, cô lập nền/focus/cuộn và nhường ưu tiên cho portal của hộp thoại/menu. `BuildingCanvas` giữ renderer, căn tỷ lệ camera theo kích thước vùng nhìn để resize đảo ngược được. Không thêm dependency, schema hoặc cấu hình môi trường; phạm vi và nghiệm thu ở [plan 3D](plans/OFFICE-3D-CHECKLIST.md#đề-xuất-khung-điều-khiển-và-mở-rộng).
- `architectural-layout.ts` giữ mặt bằng giản lược của ba PDF trong cấu hình tĩnh; `building-layout.ts` nối vùng đã xác nhận với khóa ánh xạ cũ. Hình đa giác dùng chung cho vùng chọn, nhãn và nền/tường thấp; camera căn theo phạm vi mới. HCNS dùng cùng tỷ lệ/trục với tầng, toàn bộ bàn/điểm quản lý đọc từ DB. Bản thử thêm bàn/điểm thiết bị dùng `vat_the_3d`, không thay tọa độ của danh mục `vi_tri`. Tên phòng chưa xác nhận để trung tính; Lễ tân dùng vị trí hiện có dưới Tầng 1 và mẫu quầy trong `vat_the_3d.mau_hien_thi`; vùng mở không dựng vách. Bộ bố trí cho chọn vị trí có sẵn, không thêm thư viện hoặc bảng mới. Phạm vi/kiểm chứng tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md#khảo-sát-mặt-bằng-kiến-trúc).
- `OfficePerson.tsx` sở hữu hình người cách điệu dùng chung hình học/vật liệu; dữ liệu từ liên kết HR–vị trí sẵn có. Chọn bàn/người trực tiếp, nhãn tên chiếu từ cùng phép biến đổi với model; `person-label-layout.ts` dàn nhãn nhân sự trong tọa độ màn hình bằng dịch đôi có giới hạn/lệch hàng, `BuildingCanvas` vẽ đường nối SVG không bắt chuột; danh sách vị trí làm đường truy cập thay thế. Không thêm bảng hoặc thư viện.
- CameraControls dùng `impl` của Drei để giới hạn bước thời gian khi vẽ trở lại sau khoảng nghỉ. Nhấp đúp phòng HCNS trong tầng giữ hướng camera và phóng tới nội thất đang nhúng; vật liệu không gian xung quanh mờ dần. Camera trở lại góc tầng đã lưu, hỗ trợ giảm chuyển động; hình người không có vòng hoạt ảnh riêng. Kiểm chứng và giới hạn tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md).

- `/office-3d` sở hữu một `BuildingCanvas`; chế độ toàn nhà/tầng/phòng và điểm chọn lưu trong URL qua History API tích hợp Next Router. `building-navigation.ts` kiểm tra tham số và chuyển tọa độ HCNS sang tọa độ tòa nhà. Viewer theo dõi URL bằng `useSyncExternalStore` để điểm chọn đổi ngay cả khi Next Router đang chờ Server Action; History API vẫn giữ Back/Forward và không tạo nguồn trạng thái thứ hai. Camera giữ góc/zoom theo cấp xem và lựa chọn; `selectionCameraKey`/`parentBuildingNavigation` dùng chung cho Esc/Back. URL có lựa chọn tài sản hoặc nhóm hình; `EquipmentDisplay` gửi sự kiện chọn/tập trung về viewer, không truy vấn DB theo mesh. Cập nhật dữ liệu không khởi tạo lại renderer.
- Bảng chi tiết dùng chung tại `building/RoomPointPanel.tsx` (thay `hcns/HcnsRoomPanel.tsx`), chỉ tải lựa chọn gán người khi mở phòng với HR MANAGE. Giữ `LocationPeople`/action gán dùng chung. `/office-3d/hcns` là đường dẫn tương thích chuyển về viewer chung; bỏ `HcnsRoomCanvas` và `HcnsRoomExplorer`, giữ model/nội thất. Không đổi DB, dependency hoặc biến môi trường. Kiểm chứng tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md).

## Tòa nhà 3D cùng phong cách HCNS — 10/11/2026

- `/office-3d` dùng `getOfficeBuilding`, `building-layout.ts`/`building-mapping.ts` và các component trong `src/components/office-3d/building/`. Viewer tải client, Fiber/Drei, camera trực giao, `frameloop="demand"`, DPR tối đa 1,5; bỏ viewer Three.js thủ công và `RoomDetailSheet` ghép người theo phòng ban.
- `HcnsRoomModel.tsx` giữ một instance nội thất trong tòa nhà; góc xoay/thu đồng tỷ lệ nằm trong cấu hình hình học. Chi tiết phòng chuyển camera trong cùng viewer, theo thiết kế ở đầu tài liệu.
- Ánh xạ nền `var/office-3d/building.json` (ngoài Git, sao lưu cùng DB) giữ tòa nhà/tầng và liên kết phòng cũ. Liên kết mới qua `RoomLinkDialog` → Server Action `office-room-link.ts` → Prisma lưu `lien_ket_phong_3d` cùng audit. `building-mapping-server.ts` hợp nhất hai nguồn và kiểm tra trùng/công ty; action đọc mô hình và lưu bố trí dùng cùng loader. Không tự tạo vị trí hoặc đoán phòng từ tên; thiếu ánh xạ tầng phải thiết lập trước. Không thêm thư viện/biến môi trường; schema và kiểm chứng tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md#quy-ước-dùng-chung-cho-các-phòng--2011).
- Cả menu/page/action tòa nhà dùng LOCATIONS; HR riêng cho người ACTIVE có FK nằm trong nhánh vị trí đã xác nhận. Không đếm nhân sự công ty như người trong tòa nhà, không truy vấn tài sản. Không đổi schema, migration, dependency, biến môi trường hoặc cấp quyền.

## Liên kết nhân sự và vị trí hai chiều — 10/11/2026

- `/locations` và bảng chi tiết HCNS trong `/office-3d` dùng chung `LocationPeople.tsx` cho tìm/gán/chuyển/bỏ gán nhân sự. Trang HCNS chỉ nạp lựa chọn nhân sự ACTIVE khi có HR MANAGE, liên kết điểm qua ID đã xác minh; người chỉ xem vẫn nhận danh sách tại điểm. `assignEmployeeLocation` cập nhật duy nhất FK vị trí, dùng cùng kiểm tra chuyển/phiên bản với form HR; mutation vẫn Prisma trực tiếp trong action. Danh sách tối thiểu cần HR VIEW, thay đổi cần HR MANAGE; không thêm schema/dependency.
- Xóa vị trí xem trước danh sách bị ảnh hưởng, kiểm tra lại phiên bản vị trí và tập người trong khóa công ty/phân quyền; tự đặt FK về null và ghi audit từng người + vị trí trong một transaction. Giữ schema/FK Restrict/trigger, không migration hoặc đổi quyền. Đợt 1 tài sản bổ sung chặn xóa/ngừng dùng vị trí còn thiết bị; xem mục nền tài sản ở đầu tài liệu.
- `tsconfig.json` loại các thư mục đầu ra/tạm khỏi kiểm tra TypeScript; bản sao app dùng kiểm thử nằm trong `outputs/`, không bị biên dịch như nguồn ứng dụng. Không thêm thư viện hoặc biến môi trường vận hành.

## Bản thử không gian HCNS — 10/11/2026

- [Plan 3D](plans/OFFICE-3D-CHECKLIST.md): `/office-3d/hcns`, đọc 10 vị trí từ DB qua `src/actions/office-room.ts`; client/viewer tại `src/components/office-3d/hcns/`, hình học và kiểm tra ánh xạ tại `src/lib/office-3d/`.
- Thêm `@react-three/fiber@9.8.2` và `@react-three/drei@10.7.9`, tương thích React 19 hiện tại; giữ Three.js hiện có. Viewer tải phía client bằng dynamic import, vẽ khi cần; không tải font/texture/model từ CDN. Không thay Next.js hoặc Prisma.
- `prisma/bootstrap-hcns-layout.ts` chuyển khảo sát cũ `prisma/data/hcns-survey.ts` và ánh xạ cục bộ `hcns.json` sang `vat_the_3d` một lần. Viewer không đọc `hcns.json` hoặc danh sách bàn cố định nữa; dùng chung `PlacedObjects`, camera và editor với KHĐT. Migration `20261117150000_bo_tri_hcns_db` lưu kích thước và khóa URL cũ, giữ ID/liên kết. Không thêm thư viện hoặc biến môi trường.
- Ghi chú nguồn ở DB/backup cục bộ, không tự phân công từ tên viết trên bản phác. Form HR đã có chọn/chuyển/gỡ vị trí chính; bản HCNS đọc người ACTIVE qua FK khi có HR VIEW/MANAGE bên cạnh LOCATIONS. Chưa tạo tài sản; khung tòa nhà đã được thay bằng cùng phong cách và dùng liên kết vị trí như mục đầu tài liệu.
- Migration `20261110160000_vi_tri_lam_viec_nhan_su` thêm FK nullable cùng công ty/Restrict, kiểm tra loại/trạng thái và bảo vệ vị trí có người tham chiếu. Đã thử backup khôi phục trước khi áp dụng local, giữ 15 bảng cũ, không seed phân công. `src/lib/work-location.ts` kiểm tra danh mục chọn; action HR có version và audit nguyên tử. Không thêm dependency/biến môi trường cho liên kết HR.
- Bố trí DB dùng `goc_xoay` (độ), chuyển sang radian tại viewer; hướng/bố trí hiện hành theo [plan 3D](plans/OFFICE-3D-CHECKLIST.md#phong-cách-hình-ảnh). Không dựng ghế theo yêu cầu.
- Bố trí bàn/điểm quản lý: `office-placement.ts` là Server Action trực tiếp Prisma, cùng khóa công ty/quyền LOCATIONS và audit với danh mục; `placement.ts` kiểm tra footprint/va chạm. `PlacementEditor` và `PlacedObjects` đặt/xoay/dịch hình trong cùng Canvas, dùng bảng `vat_the_3d`. Sao lưu DB cùng ánh xạ gốc. Migration bổ sung `20261112160000_vi_tri_bo_sung_3d`; không thêm thư viện.
- Nội thất là geometry dùng lại, không asset tải ngoài. Nhãn chọn là DOM chiếu theo camera, cùng React root với trang. `frameloop="demand"`, giới hạn DPR 1,5, shadow map 1024; kiểm thử/giới hạn đo tại plan 3D.

Thành phần tổng quan phòng 3D `RoomOverviewPanel` nhận người/tài sản đã được `office-building.ts` lọc quyền và cây vị trí hợp lệ; dùng hai tab và điều hướng tới điểm HCNS trong cùng Canvas. Không thêm thư viện, schema hoặc route; thiết kế và kiểm chứng tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md). `building/SpaceDirectory.tsx` nhóm danh sách không gian theo tầng bằng dữ liệu/ánh xạ hiện có, dùng chung cho tổng quan, đổi không gian và WebGL fallback. Trạng thái tìm của `SceneSearch` được làm trống khi chọn kết quả, chỉ remount riêng ô tìm khi đích điều hướng đổi; Canvas và bộ điều khiển camera giữ nguyên.

Tìm kiếm 3D dùng `building/SceneSearch.tsx` với `Input`/`Button` chung, gợi ý tối đa 6 đối tượng sau khi nhập và hàm thuần `lib/office-3d/scene-filter.ts`. `building/SceneLayerControls.tsx` chứa nút biểu tượng bật/tắt Nhân sự/Tài sản độc lập và menu lọc loại bằng `DropdownMenu` chung; không trộn lệnh này vào kết quả tìm kiếm. Chọn người/tài sản dùng lại lệnh camera và điều hướng, tự bật lớp cần xem. `getOfficeBuilding` đọc danh bạ tối thiểu người ACTIVE cùng công ty theo HR VIEW và danh mục loại theo ASSETS VIEW; không truy vấn khi thiếu quyền. `BuildingExplorer` giữ dữ liệu nghiệp vụ/camera riêng với bản hiển thị đã lọc; `BuildingCanvas` dùng bản lọc cho hình/nhãn, vẫn giữ hình học nền và một renderer. Không thêm API, dependency hoặc schema. Phạm vi và kiểm chứng tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md#tìm-kiếm-và-lọc-đối-tượng-trong-khung-3d).

Menu đối tượng 3D dùng wrapper `src/components/ui/context-menu.tsx` trên Radix đã cài. `BuildingCanvas` xác định phòng/điểm/người từ raycast hoặc nhãn, gửi `BuildingTarget` về `BuildingExplorer`; menu chuột phải và nút … gọi chung `spaceActions()` và các handler camera/điều hướng/editor hiện có. Không thêm tầng nghiệp vụ, API hoặc thư viện; quy ước tương tác và thứ tự thông tin được quản lý tại [plan 3D](plans/OFFICE-3D-CHECKLIST.md#quy-ước-tương-tác-và-bố-trí-thông-tin-dùng-chung).

Sửa hồ sơ từ menu 3D tải động `building/ObjectEditDialog.tsx`: tái sử dụng `LocationEditor`, `AssetDetail` và `EmployeeForm`. `getEmployeeForEdit` đọc một hồ sơ và danh mục cần thiết, yêu cầu HR MANAGE và cùng công ty; không tải tài khoản hoặc tạo mutation riêng. Lệnh sửa dùng chung với nút …, theo đúng quyền LOCATIONS/ASSETS/HR. Không đổi DB/dependency; phạm vi tại [plan sửa đối tượng](plans/OFFICE-3D-CHECKLIST.md#sửa-hồ-sơ-từ-menu-đối-tượng--16112026).

## Không gian cá nhân — triển khai 05/11/2026

[Thiết kế tài khoản và không gian cá nhân](THIET-KE-TAI-KHOAN-VA-KHONG-GIAN-CA-NHAN.md) triển khai DEFAULT, tự sinh tên đăng nhập, `/profile`, dashboard theo người đăng nhập và quản lý quyền workflow tập trung tại `/roles`. Tái sử dụng bảng hiện có; dự kiến thêm cờ đổi mật khẩu lần đầu và lưu ảnh ngoài Git. Đã thêm cờ `bat_buoc_doi_mat_khau`, `/profile`, GET `/media/avatar/[file]` (phục vụ ảnh có kiểm tra quyền) và các Server Actions cá nhân. Dependency trực tiếp `sharp@0.35.5` giải mã/chuẩn hóa ảnh sang WebP, bỏ metadata, giới hạn 16 triệu pixel; đầu vào 2 MB, body Server Actions 3 MB. Ảnh lưu tại `var/avatars/` ngoài Git; tùy chọn env `AVATAR_STORAGE_DIR` trỏ tới volume bền vững khi triển khai (không thay `.env` hiện tại). Sao lưu thư mục ảnh cùng DB; không đặt vào `public/`. Session đọc cờ đổi mật khẩu từ DB mỗi request; các chức năng nghiệp vụ bị chặn cho tới khi đổi xong. Đổi mật khẩu thu hồi phiên cũ và cấp lại cookie phiên hiện tại. Các mutation profile/role/account cùng khóa hàng công ty trước advisory phân quyền, thống nhất với HR/workflow. Khóa cấp username toàn hệ thống `(260127, 0)` sau khóa công ty/phân quyền; không cộng quyền giữa các tài khoản. Quyền workflow cấp tại `/roles`; màn hình workflow chỉ đọc quyền, không có action tự cấp hoặc xác nhận kích hoạt. Menu workflow chỉ hiện khi có quyền workflow. Dashboard đếm theo người/quyền và phân trang 10 dòng. Kiểm chứng: 38 E2E + 7 unit, TypeScript/lint và schema diff đạt; build Webpack đạt (còn cảnh báo bảo mật Next.js/middleware có sẵn). DB giữ nguyên 73 người, 61 tài khoản, 19 phòng và toàn bộ grant cũ; chỉ thêm DEFAULT không grant. Theo dõi tại [checklist](plans/PROFILE-DASHBOARD-CHECKLIST.md).

## Workflow thử nghiệm — 05/11/2026

- Thêm `src/actions/workflow.ts`, `src/lib/workflow-access.ts`, `src/lib/workflow-labels.ts`, validation dùng chung và `src/components/workflows/`. Route `/workflows` và `/workflows/[id]`, không REST/worker/queue/dependency/env mới.
- Prisma thêm 5 bảng workflow, tổng 14 bảng; migration `20261105090000_quy_trinh_thu_nghiem` đã chạy toàn chuỗi trên DB tạm rồi áp dụng local sau backup. Không reset, không chạy seed. Backup nhất quán 9 bảng lõi trước migration lưu ngoài repo; vị trí tại `outputs/workflow/backup-path.txt`.
- Session bổ sung danh sách hành động workflow, `/roles` có nhóm checkbox riêng. Quyền quản lý không duyệt thay; người gửi/người được giao quyết định phạm vi đọc/xử lý. Không tự gán quyền hoặc trưởng phòng thực tế.
- Phát hành khóa nội dung mẫu; đổi mẫu tạo phiên bản. Hồ sơ chốt phòng người gửi, bước chốt người lúc bắt đầu, thao tác và lịch sử cùng transaction. Hộp việc bản đầu giới hạn 200 hồ sơ gần nhất; chưa có tệp/form động/nhắc việc.
- Kiểm thử: 10 E2E workflow, 20 E2E hồi quy, 6 unit đạt; TypeScript/lint và schema diff đạt. Build `npm run build -- --webpack` đạt; Turbopack gặp lỗi mở cổng tiến trình xử lý CSS (os error 1). Build còn cảnh báo có sẵn về middleware/Edge và nhắc cập nhật bảo mật Next.js; chưa nâng phiên bản. Kiểm thử tại `tests/e2e/workflow.spec.ts`; ảnh và đầu ra trong `outputs/workflow/`. Sau generate cần khởi động lại dev/Studio nếu đang mở để nạp 14 model mới.


## Quản lý vai trò — 04/11/2026

- `/roles` dùng `src/actions/role.ts` và `src/components/roles/RoleManager.tsx`: ma trận, gán/gỡ role, xem quyền hợp nhất. `src/components/ui/skeleton.tsx` dùng cho trạng thái tải trang. `role-catalog.ts` giữ danh mục chức năng hiện hành; `rbac-server.ts` chỉ chứa helper kiểm tra quyền/tính toàn vẹn dùng chung, actions vẫn gọi Prisma trực tiếp.
- Quyền HR/ACCOUNTS/ROLES/AUDIT lấy từ DB mỗi request; không suy quyền từ mã ADMIN/IT_ADMIN, chức danh hoặc head. Scope hiện hành toàn công ty; quyền scoped cũ không mở truy cập toàn công ty. Các quyền workflow cũ giữ nguyên, chưa đưa vào ma trận.
- Migration `20261104110000_quan_ly_vai_tro`: thêm bốn quyền, chuyển đặc quyền quản trị ngầm thành gán quyền DB; chuẩn hóa nhãn ADMIN/cờ vai trò chính. Partial unique index và trigger SQL kiểm tra tối đa một role chính, gán role cùng công ty, chặn chuyển công ty tài khoản/role. Không thêm bảng/cột, không đổi ID/mật khẩu; vẫn 9 bảng.
- Action role/account/HR dùng chung advisory lock theo công ty, kiểm tra lại quyền trong transaction; chống mất quản trị cuối cùng và audit cùng transaction. Sửa role/gán role dùng phiên bản cập nhật để chặn ghi đè; đổi quyền hiệu lực từ request sau. Nhật ký lọc công ty và yêu cầu AUDIT VIEW.
- `SESSION_SECRET` có sẵn bắt buộc ít nhất 32 ký tự; bỏ fallback công khai. Không đổi giá trị `.env`, không thêm dependency. Seed chỉ cấp ma trận mặc định khi khởi tạo, không phục hồi quyền bị thu hồi. Bộ khởi tạo hiện còn ADMIN/DEFAULT/HR_MANAGER; HCNS là role tùy chỉnh, seed không tạo lại role nghiệp vụ đã xóa. Cách bổ sung quyền tính năng mới theo [plan phân quyền](plans/ROLE-MANAGEMENT-CHECKLIST.md#khi-thêm-tính-năng-hoặc-quyền-mới).
- Bản sao trước migration: JSON nhất quán của 9 bảng tại thư mục backup riêng tư ngoài repo; vị trí lưu cục bộ trong `outputs/role-management/backup-path.txt`. Không đưa backup hoặc ảnh kiểm thử lên Git.


## Tổ chức kế hoạch — 04/11/2026

[docs/plans/README.md](plans/README.md) là bảng đọc nhanh; sáu checklist chỉ giữ trạng thái hiện hành, việc còn lại và tiêu chí nghiệm thu. Thiết kế bảng/cột và luồng workflow chuyển sang [THIET-KE-QUY-TRINH.md](THIET-KE-QUY-TRINH.md), vẫn là đề xuất chưa triển khai. Không thay mã ứng dụng, DB hoặc thứ tự ưu tiên trong lần rút gọn tài liệu.


## Phân công quản lý và vòng đời truy cập — 04/11/2026

- Migration `20261104082452_nguoi_phu_trach_phong` thêm cột nullable/index/FK kép `phong_ban.nguoi_phu_trach_id` → `nhan_su`; Prisma/Studio/PostgreSQL cùng tên. Vẫn 9 bảng, không seed lại hoặc tự gán trưởng phòng từ chức danh.
- `/departments` chọn người phụ trách cùng công ty; một người phụ trách nhiều phòng. `/employees` hiển thị các phòng phụ trách và hỗ trợ tạo hồ sơ kèm tài khoản tùy chọn cho người đủ quyền; khi sửa thấy các tài khoản liên kết, có thể thêm tài khoản, quản trị tài khoản cũ tại `/accounts`.
- Lưu nghỉ việc tự khóa các tài khoản đang mở, thu hồi phiên, giữ lịch sử, không tự mở lại khi tái tuyển. Server session kiểm tra cả trạng thái tài khoản và nhân sự LEFT. Mutation HR/account phối hợp advisory lock theo công ty, bảo vệ admin cuối cùng, audit và mutation nguyên tử.
- Không thêm dependency hoặc biến môi trường. Sau migrate deploy cần prisma generate và khởi động lại dev/Studio để nạp schema mới.
- Ma trận quyền theo phòng và động cơ workflow chưa triển khai; chọn head không tự cấp quyền phần mềm. Các mô tả lịch sử “sửa hồ sơ không đổi tài khoản” bên dưới được thay thế riêng với tình huống nghỉ việc/cấp tài khoản tùy chọn.


## Thống nhất tên DB với nghiệp vụ — 03/11/2026

Migration `20261103090000_thong_nhat_ten_nghiep_vu` đổi tên `nguoi_dung` → `tai_khoan`, `nguoi_dung_vai_tro` → `tai_khoan_vai_tro`; mã hồ sơ thành `nhan_su.ma_nhan_su`, trạng thái tài khoản thành `cho_phep_dang_nhap`. Tên/mã công ty, phòng ban, vai trò, quyền và FK được làm rõ theo [từ điển DB](DATABASE-DICTIONARY.md). Không thêm bảng, thư viện, biến môi trường hoặc thay quyền.

Yêu cầu tiếp theo cùng ngày đã đồng nhất **model/field Prisma với bảng/cột PostgreSQL**, ví dụ `db.nhan_su` và `nhan_su.ho_ten`. Từ 06/11/2026 áp dụng quy ước lai: bảng và trường nghiệp vụ dùng tiếng Việt không dấu; khóa/trường kỹ thuật phổ biến dùng `id`, `company_id`, `department_id`, `employee_id`, `account_id`, `role_id`, `permission_id`, `created_at`, `updated_at`; FK nghiệp vụ phức tạp dùng tiếng Việt + `_id`. Giữ map của constraint/index lịch sử. Các tên cũ trong phần lịch sử phía dưới chỉ mô tả thời điểm trước thay đổi này.

Migration `20261106113000_quy_uoc_ten_lai` thực hiện toàn bộ bằng đổi tên cột và cập nhật thân trigger, đã thử đủ chuỗi 15 migration trên DB tạm trước khi áp dụng. Sau áp dụng, Prisma diff rỗng, build Webpack và 51 E2E + 9 unit đạt; không thêm dependency hay biến môi trường.

Database local được tạo lại từ đầu ngày 06/11/2026 vì dữ liệu hiện tại chỉ dùng demo. Sau 15 migration và seed: 1 công ty, 18 phòng ban, 72 nhân sự, 1 tài khoản quản trị, 8 vai trò, 18 quyền; các bảng workflow rỗng để cấu hình mẫu demo mới. Bản JSON trước reset được lưu ngoài Git trong thư mục backup cục bộ.

Migration dùng RENAME và sửa hàm trigger bảo vệ mã trong cùng transaction; đã thử trên bản restore với fingerprint 9 bảng không đổi, sau đó áp dụng local. Cần khởi động lại dev server và Studio sau khi generate client để tránh dùng mapping cũ. Giữ nguyên 72 hồ sơ, 60 tài khoản, 19 phòng ban tại thời điểm đổi tên; không chạy lại seed/import.

## Phòng ban độc lập — 03/11/2026

ERP quản lý tên, mã, mô tả và cây cha/con qua `/departments` với HR MANAGE. Bỏ đối soát snapshot và khóa nguồn; metadata 1Office chỉ giữ lịch sử. Các action CRUD kiểm tra cùng công ty, vòng lặp cơ cấu, mã trùng và dữ liệu liên kết trước khi xóa; khóa theo công ty và ghi audit cùng transaction. Không thêm bảng, thư viện hay biến môi trường.

Đã bỏ npm script `db:sync:oneoffice-departments`; file script cũ chỉ báo ngừng sử dụng, không đọc file hay ghi DB. Seed không khôi phục cơ cấu nếu đã có phòng ban, nhân sự hoặc nhật ký phòng ban. Mọi yêu cầu nhập/đối soát 1Office cũ bên dưới là lịch sử, không là điều kiện sử dụng CRUD. Mapping vị trí 3D vẫn dựa trên mã, nên đổi mã/thêm đơn vị chưa tự tạo vị trí trên mô hình; quản lý vị trí thuộc bước riêng.

## Địa chỉ development được phép — 03/11/2026

`next.config.ts` bổ sung `allowedDevOrigins: ["127.0.2.2"]` để trang được mở tại `http://127.0.2.2:4000` có thể kết nối HMR và khởi tạo giao diện. `http://localhost:4000` vẫn được Next cho phép mặc định. Cấu hình chỉ áp dụng dev, không phải CORS/API hay quyền đăng nhập; không mở wildcard, không đổi thư viện/env. Sau khi đổi config cần dev server khởi động lại (Next dev thường tự khởi động lại). Test hồi quy: `tests/e2e/login-origin.spec.ts`.

## Đề xuất workflow sơ khai — 02/11/2026

[Thiết kế workflow](THIET-KE-QUY-TRINH.md) và [kế hoạch triển khai](plans/WORKFLOW-CHECKLIST.md) đề xuất 5 bảng cho mẫu có phiên bản, bước mẫu, hồ sơ, bước xử lý và lịch sử; tái sử dụng nhân sự/tài khoản/RBAC, bổ sung head phòng ban nếu hỗ trợ tự tìm người duyệt. Bản đầu tuần tự, một người mỗi bước, xử lý bằng Server Actions/Prisma transaction. **Chưa triển khai hoặc migration; DB vẫn 9 bảng nghiệp vụ.** Không cài dependency, đổi môi trường, thêm worker hoặc gọi 1Office trong bước thiết kế.

## Thu gọn DB, ưu tiên tài khoản và phân quyền — 31/10/2026

- Theo yêu cầu, gỡ 8 model/bảng tài sản và 8 enum bằng migration `20261031090000_remove_asset_module`; giữ nguyên các migration đã chạy. DB còn 9 bảng nghiệp vụ: Company, Department, Employee, User, Role, Permission, RolePermission, UserRole, AuditLog (ngoài `_prisma_migrations`).
- Bỏ quan hệ tài sản khỏi bảng lõi, xóa `prisma/seed-it-assets.ts` và npm script `db:seed:it-assets`. Không thêm/gỡ thư viện, không đổi biến môi trường. Script cleanup HR một lần `prisma/clean-hr-legacy.ts` đã ngừng để không truy vấn các bảng tài sản đã gỡ hoặc xóa lại dữ liệu đang dùng.
- Code 3D hiện chỉ đọc Department/Employee nên tiếp tục hoạt động. PhysicalLocation thuộc thiết kế tài sản, chưa có dữ liệu và đã gỡ cùng phân hệ.
- Tài liệu và file nguồn tài sản giữ làm lịch sử, không tự tạo lại bảng hoặc seed. Khi khởi động lại phân hệ cần kế hoạch/migration mới.
- Bốn bảng RBAC đều có vai trò riêng, giữ nguyên dữ liệu/quyền. [Kế hoạch phân quyền](plans/ROLE-MANAGEMENT-CHECKLIST.md) có sơ đồ, số liệu thực tế và các điểm chưa hoàn thiện.



## Lưu trữ tài liệu và đầu ra — 28/10/2026

Git theo dõi mã nguồn, tài nguyên ứng dụng và tài liệu Markdown. Các thư mục `outputs/`, `output/`, `ouput/`, `tmp/`, `temp/`, export 1Office và tài liệu nhị phân/ảnh trong `docs/` chỉ lưu cục bộ theo `.gitignore`. Script tạo tài liệu dùng tạm đặt trong `outputs/`. Khi clone mới, các file nguồn phục vụ seed/import và tài liệu báo cáo phải được cung cấp riêng vào đúng đường dẫn; không tự tải lại 1Office. Bỏ theo dõi giữ nguyên file trên máy, không xóa chúng khỏi lịch sử commit cũ.

## HR độc lập — triển khai 28/10/2026

- Giữ mô hình `Department → Employee → User`. PostgreSQL dùng tên Việt (`phong_ban`, `nhan_su`, `nguoi_dung`); Ở thời điểm 28/10 Studio dùng model tiếng Anh; từ 03/11 đã đồng nhất tên như phần đầu tài liệu. Không phải hai bộ bảng trùng nhau.
- Migration `20261028090000_independent_hr`: bỏ 9 cột hồ sơ legacy trong tài khoản, đổi nhãn tài khoản `ho_ten` → `ten_hien_thi`, thêm `Employee.notes` / `ghi_chu`. Mã tự cấp qua sequence/default và trigger bất biến; schema Prisma giữ `employeeCode` required có default DB. Không reset sequence.
- HR final 72 là dữ liệu khởi tạo; sau đó sửa trực tiếp trong ERP theo HR MANAGE, cùng công ty và có audit. Metadata nguồn chỉ phục vụ truy nguyên. Họ tên, chức danh, phòng ban và ghi chú không còn bị khóa vì nguồn.
- Giữ ID/mã của 72 người cùng 60 tài khoản hợp lệ/admin; loại 8 hồ sơ cũ và 8 tài khoản tương ứng sau backup. Không dựng lại toàn DB. Phòng ban, role, quyền và dữ liệu tài sản giữ nguyên.
- `prisma/bootstrap-hr-final.ts`: bootstrap final một lần cho HR rỗng, có marker/khóa theo công ty chống chạy lặp; không tạo tài khoản hàng loạt. `prisma/seed.ts` không đọc file 67 người, không ghi đè HR/phòng ban khi chạy lại. `prisma/import-hr-final-20261026.ts` đã vô hiệu hóa.
- `prisma/clean-hr-legacy.ts`: đã hoàn thành lần làm sạch 28/10, ngừng chạy từ 31/10; thuật toán cũ nằm trong backup riêng, không dùng lại cho dữ liệu vận hành.
- Form/action sử dụng validation strict, không nhận mã/metadata nguồn từ client; chọn phòng theo cây. Ghi chú vận hành chỉnh được, ghi chú file HR gốc nằm trong mục nguồn nhập. Không thêm dependency hoặc biến môi trường.
- Kiểm thử: `npx playwright test tests/e2e/hr-independent.spec.ts tests/e2e/identity.spec.ts --workers=1`. File nguồn final lưu cục bộ, cần được cấp riêng khi clone máy mới để bootstrap/kiểm thử bootstrap.

Các mục bên dưới ghi lịch sử các đợt triển khai trước; quyết định HR độc lập phía trên là hiện hành.

## Nguồn nhân sự HR chốt 26/10/2026

- `Employee.hrSourceFile`, `hrSnapshotAt`, `hrNotes` lưu nguồn HR chính thức, ngày chốt và ghi chú; không thay `externalSystem/externalId/externalSnapshotAt` của mapping 1Office.
- Migration `20261027033903_hr_final_source` chỉ thêm ba cột nullable; không xóa/đổi dữ liệu cũ.
- `prisma/hr-final-data.ts` đọc ngày Excel theo lịch UTC và mapping đã đối chiếu; `prisma/import-hr-final-20261026.ts` là lệnh nhập một lần, preview mặc định, khóa theo hash file, backup riêng tư ngoài repo, transaction và audit. Không phải API/sync định kỳ.
- Preview: `npx tsx prisma/import-hr-final-20261026.ts --company-id=1`; thêm `--apply` để nhập. Có marker ngăn nhập lại cùng snapshot, tránh đè sửa đổi mới.
- Người phụ trách chốt ưu tiên độ chính xác của file HR final 72 người (27/10/2026): tên, ngày sinh, chức danh, phòng ban gán cho người, ghi chú và danh sách người theo final. Export/API 1Office mới phải trình chênh lệch để chốt cập nhật, không tự ghi đè trường HR đã xác nhận. Không suy bộ phận con từ chức danh; giữ nguyên cây phòng ban và lưu phân bổ cũ trong audit. Không tạo tài khoản/đổi role khi nhập.
- Không thêm dependency hoặc biến môi trường; dùng `xlsx`, `tsx`, Prisma sẵn có. Kiểm thử importer: `npx tsx --test tests/unit/hr-final-data.test.ts`.


## Cập nhật nhân sự – tài khoản (26/10/2026)

- DB: `Employee` → `nhan_su` là hồ sơ người thật; `User` → `nguoi_dung` là tài khoản. `Department.employees` và `Employee.accounts` thay cho dùng tài khoản làm hồ sơ. Một người có 0..N tài khoản; role gắn từng tài khoản.
- Migration `20261026100000_split_employees_accounts`: bổ sung bảng, chuyển dữ liệu và FK tài sản; giữ ID/mật khẩu/quyền tài khoản, không xóa cột hồ sơ cũ. Các field `User.legacy*` từng giữ tạm để đối chiếu và đã được loại ở migration 28/10/2026.
- `/employees`: hồ sơ và tình trạng làm việc. `/accounts`: tạo/sửa/liên kết tài khoản, khóa/mở, đặt lại mật khẩu và gán role hiện có; chỉ ADMIN/IT_ADMIN. `/roles` vẫn chưa triển khai ma trận quản lý role.
- `src/actions/account.ts`, `src/lib/account-access.ts`, `src/lib/account-session.ts`, `src/lib/session-token.ts` (JWT cho middleware, không import Prisma), `src/components/accounts/AccountManager.tsx` là các tệp mới. `src/components/ui/checkbox.tsx` dùng Radix đã có; không thêm thư viện.
- Server xác minh tài khoản còn mở, phiên bản phiên và quyền hiện tại từ DB. Thay đổi tài khoản tăng `sessionVersion`; phiên cũ bị từ chối. Đăng nhập bằng username, không dùng mã nhân sự vì một người có nhiều tài khoản.
- Nhân sự giữ mapping 1Office; file HR final ưu tiên theo mục nguồn HR phía trên. Từ 28/10/2026 chỉ mã không sửa; tên/phòng/chức vụ sửa được theo HR MANAGE. Có thể thêm hồ sơ nội bộ chưa có mapping, cần đối chiếu trước khi đồng bộ. Chưa có importer nhân sự định kỳ/API/webhook.
- Bộ đếm: tổng hồ sơ gồm lịch sử, đang làm việc chỉ `ACTIVE`, `UNKNOWN` tách riêng. 3D chỉ hiển thị `Employee.ACTIVE`; phòng ban hiển thị tổng hồ sơ gắn đơn vị. Không đổi quy tắc vị trí ngồi 3D trong lần này.
- Giữ Next.js 16.4.0 theo yêu cầu; không thay package/dependency/env. Sau khi sinh Prisma Client cần khởi động lại dev server để tránh giữ client cũ.

## SAO ĐỎ GROUP ERP (SDG ERP)

> **Vị trí tệp:** `docs/ARCHITECTURE.md`  
> **Vai trò:** Bản thiết kế kiến trúc hệ thống cấp cao (High-Level Architecture) & Sổ bộ quản lý Dependencies/Cấu hình hạ tầng.  
> **Nguyên tắc Single Source of Truth:** Tệp này **không lặp lại** các quy chuẩn chi tiết viết mã (Coding Standards). Khi cần tra cứu chi tiết cách lập trình, tham chiếu trực tiếp đến 3 tệp quy tắc trụ cột:
> * Cơ sở dữ liệu: [.agents/rules/DATABASE-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/DATABASE-RULES.md)
> * Backend & Server Actions: [.agents/rules/BACKEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/BACKEND-RULES.md)
> * Frontend & UI Theme: [.agents/rules/FRONTEND-RULES.md](file:///Users/duonghoangnam/Desktop/SGDERP/.agents/rules/FRONTEND-RULES.md)

---

## 1. TỔNG QUAN HỆ THỐNG & ĐỊNH VỊ CHIẾN LƯỢC

SDG ERP là hệ thống điều hành doanh nghiệp nội bộ tập trung của **Tập đoàn Sao Đỏ**, phục vụ Trụ sở Tập đoàn và **Khối độc lập Ban QLDA KCN Nam Đình Vũ 1**.

```mermaid
graph TD
    UserClient[Người Dùng: Web / Mobile Browser] --> NextMonolith[Next.js 16 Monolith - Port 4000]
    
    subgraph Presentation & Spatial
        TailwindUI[Tailwind CSS v4 + Shadcn/UI]
        DigitalTwin3D[Three.js WebGL - 3D Building Floorplan]
    end
    
    subgraph Core Execution
        AppRouter[App Router / Server Components]
        ServerActions[Direct-to-DB Server Actions]
    end
    
    subgraph Storage & External
        PrismaORM[Prisma ORM v6.19.3]
        LocalPostgres[(PostgreSQL 5432 - Dedicated Server)]
        OneOffice[1Office - Nguồn tham khảo khởi tạo trước đây]
        AccountingServer[(Server Kế Toán Riêng - Tương Lai)]
    end

    NextMonolith --> TailwindUI
    NextMonolith --> DigitalTwin3D
    NextMonolith --> AppRouter
    AppRouter --> ServerActions
    ServerActions --> PrismaORM --> LocalPostgres
    OneOffice -.->|Lịch sử nhập ban đầu, không đồng bộ hiện hành| ServerActions
    ServerActions -.->|Tích hợp 2 chiều| AccountingServer
```

### Các Trục Nghiệp Vụ Trọng Tâm:
1. **Quản trị Nhân sự & Định danh (Core HR & IAM):** 72 người theo danh sách HR chốt 26/10/2026 (đã làm sạch hồ sơ dư), cây phòng ban 2 cấp gắn ID số nguyên (`Int`), liên kết kế thừa quyền.
2. **Không gian số 3D Tòa nhà (Digital Twin 3D Office):** Trực quan hóa mặt bằng văn phòng, định vị phòng ban và hiển thị tức thì nhân sự ngồi tại từng phòng bằng WebGL Three.js.
3. **Tài sản IT:** quản lý từng thiết bị tại `/assets`; hai bảng mới dùng chung vị trí, nhân sự, RBAC và audit. Không khôi phục schema/seed cũ đã gỡ ngày 31/10/2026.
4. **Điều hành Xe Công Vụ (Fleet Management):** Xếp lịch điều xe đưa đón giữa Tập đoàn và KCN Nam Đình Vũ.
5. **Cầu nối Phê duyệt Dự án (Executive Bridge):** Luân chuyển hồ sơ, biên bản bàn giao đất, nghiệm thu giữa Tập đoàn và Ban QLDA Nam Đình Vũ.

### Vị trí & không gian — triển khai 10/11/2026

- `/locations` nằm trong Quản trị hệ thống; `/office-3d` là menu cấp cao nhất. Cả hai chỉ hiện theo LOCATIONS VIEW/MANAGE, không thêm yêu cầu quyền admin. Thêm bảng `vi_tri`, mã tự cấp bất biến, cây cùng công ty, kiểm tra vòng lặp, trạng thái và audit. Không tự cấp quyền hoặc nhập dữ liệu mẫu.
- Cấu trúc mới: `src/actions/location.ts`, `src/lib/validations/location.ts`, `src/lib/location-tree.ts`, `src/components/locations/LocationManager.tsx`, `src/app/(dashboard)/locations/`; kiểm thử tại `tests/e2e/locations.spec.ts`.
- Migration `20261110100000_vi_tri_khong_gian` đã áp dụng sau backup/khôi phục thử DB tạm; Prisma Client đã generate. Không cài/gỡ dependency hoặc đổi biến môi trường. Khởi động lại dev/Studio sau thay schema để nạp Client mới.
- [Plan vị trí](plans/LOCATION-MANAGEMENT-CHECKLIST.md) sở hữu thiết kế và nghiệm thu; HR và tài sản dùng danh mục chọn tối thiểu; tài sản chặn xóa/ngừng dùng vị trí còn tham chiếu. Tòa nhà và HCNS đọc vị trí qua ánh xạ ID riêng theo [plan 3D](plans/OFFICE-3D-CHECKLIST.md); cách ghép phòng ban vào không gian của khung cũ đã gỡ.

### Tài sản và không gian — thiết kế lưu trữ

Phân hệ tài sản cũ đã gỡ khỏi DB ngày 31/10/2026. [Kế hoạch tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md) đã triển khai: tài sản sở hữu hai bảng `loai_tai_san`, `tai_san`. [Vị trí & không gian](plans/LOCATION-MANAGEMENT-CHECKLIST.md) là phân hệ dùng chung riêng, sở hữu `vi_tri`, menu `/locations` và quyền LOCATIONS; triển khai trước tài sản. HR đã có FK vị trí làm việc chính nullable; quyền quản lý tài sản không bao gồm sửa cây vị trí. Dùng lại RBAC và nhật ký hiện có. Vật tư tiêu hao/phụ kiện đã tách sang ba bảng và /inventory theo [plan vật tư](plans/INVENTORY-MANAGEMENT-CHECKLIST.md). Giao diện `/assets` và Server Actions đã có. Bản 3D HCNS đọc/gán người ACTIVE theo quyền HR, đọc/gán thiết bị theo quyền ASSETS qua FK vị trí riêng; khung 3D nhân sự cũ đã được thay bằng viewer tòa nhà dùng vị trí chung.

### Quy ước tên vật lý PostgreSQL — 22/10/2026

16 bảng nghiệp vụ và 194 cột được ánh xạ sang tên tiếng Việt không dấu bằng `@@map`/`@map` trong Prisma. Ví dụ `Company` → `cong_ty`, `Department` → `phong_ban`, `User` → `nguoi_dung`, `Asset` → `tai_san`; `companyId` → `company_id`. API Prisma/TypeScript giữ nguyên để các action, seed và giao diện tiếp tục hoạt động. Danh mục đầy đủ tại [DATABASE-DICTIONARY.md](./DATABASE-DICTIONARY.md); quy tắc bắt buộc tại [DATABASE-RULES.md](../.agents/rules/DATABASE-RULES.md). Migration chỉ đổi tên, không chuyển đổi dữ liệu nghiệp vụ.

### Nguồn cơ cấu và cách ánh xạ

Từ 03/11/2026, cả hồ sơ nhân sự và cơ cấu phòng ban đều do ERP quản lý độc lập sau khởi tạo. Metadata `Department.external*` giữ lịch sử nhập, không được dùng để khóa tên/cấp trên hoặc tính trạng thái khớp nguồn. Không còn giao diện đối soát hay tác vụ đồng bộ phòng ban từ 1Office. Khi sửa, khóa liên kết Employee.departmentId vẫn giữ nguyên; chỉ xóa đơn vị không còn nhân sự hoặc đơn vị con.

---

## 2. BẢN ĐỒ CẤU TRÚC THƯ MỤC DỰ ÁN

`src/components/ai/DashboardWorkspace.tsx` quản lý tab và liên kết lọc workflow giữ query, nhận nội dung workflow từ Server Component; cả hai tab được giữ mounted để bảo toàn chat/bản nháp. `AiAssistant` quản lý cột lịch sử desktop/Sheet mobile, tiêu đề, panel theo công việc và composer; `AiMessageText.tsx` định dạng đậm/code bằng text đã escape. Phạm vi tại [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#đề-xuất-dashboard-là-không-gian-làm-việc-với-agent--17112026); không thêm dependency, biến môi trường hoặc bảng/cột.

`src/components/ui/searchable-select.tsx` cung cấp ô chọn danh mục có tìm kiếm, dùng `popover.tsx` bọc Radix đã cài cùng Input/Button hiện có. `src/lib/search-text.ts` chuẩn hóa tiếng Việt chỉ để lọc; biểu mẫu giữ ID và kiểm tra server hiện hành. Dùng cho các danh mục tham chiếu dài tại HR, tài sản, vị trí, tài khoản và workflow; không thêm dependency, biến môi trường hoặc DB. Theo dõi tại [tổng quan plan](plans/README.md#ô-chọn-dữ-liệu-có-tìm-kiếm--12112026).

`src/components/ui/feature-overview.tsx` cung cấp thẻ số liệu, hướng dẫn mở rộng, trạng thái trống và avatar chữ cho các màn hình nghiệp vụ. Component chỉ trình bày dữ liệu đã được phân quyền từ màn hình gọi; không truy vấn DB, không cài thư viện hoặc thêm biến môi trường.

`src/components/ui/password-input.tsx` dùng Input/Button và icon Lucide hiện có để hiện/ẩn mật khẩu trong form cấp tài khoản tại Nhân sự và Tài khoản. Giữ ref và thuộc tính truy cập của React Hook Form; không lưu mật khẩu ra ngoài state của form. Chính sách cấp mới/reset và kiểm chứng tại [plan cá nhân](plans/PROFILE-DASHBOARD-CHECKLIST.md#cấp-tài-khoản-và-xem-mật-khẩu--16112026); không thêm dependency, biến môi trường hoặc schema.

Ba rule kỹ thuật Frontend/Backend/Database giữ chuẩn chung. Rule riêng tại `.agents/rules/`: [HR](../.agents/rules/HR-RULES.md), [phân quyền](../.agents/rules/ROLE-MANAGEMENT-RULES.md), [workflow](../.agents/rules/WORKFLOW-RULES.md), [tài khoản/profile/dashboard](../.agents/rules/PROFILE-DASHBOARD-RULES.md), [tài sản](../.agents/rules/ASSET-MANAGEMENT-RULES.md) và [vị trí dùng chung](../.agents/rules/LOCATION-MANAGEMENT-RULES.md). Tài sản và vị trí đã có bản đầu. Nghiệp vụ đọc tại rule riêng; thiết kế DB, trạng thái và kiểm thử theo plan liên kết. Định tuyến do `AGENTS.md` quản lý; không thêm dependency hoặc cấu hình chạy khi sắp xếp tài liệu.

Tài liệu trong `docs/strategy` dùng tên tiếng Việt không dấu, viết hoa và phân cách bằng dấu gạch ngang. File bối cảnh chính là [BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md](./strategy/BOI-CANH-HIEN-TAI-VA-DINH-HUONG-SO-HOA.md). Khi đổi tên phải cập nhật các liên kết trong router, checklist và tài liệu liên quan.

Ngày 20/11 bổ sung [plan Công việc và ticket hỗ trợ](plans/TASK-MANAGEMENT-CHECKLIST.md) và [rule phân hệ](../.agents/rules/TASK-MANAGEMENT-RULES.md). Bản triển khai và kho tệp theo mục Công việc bên dưới; không thêm dependency. Quy chuẩn tài liệu A/B được quản lý tại [README kế hoạch](plans/README.md#quy-chuẩn-lập-và-cập-nhật-plan).

```
SGDERP/
├── .agents/                          # Quy tắc & Kỹ năng dành cho AI Agent
│   └── rules/                        # 3 rule kỹ thuật chung + rule nghiệp vụ từng phân hệ
├── docs/                             # Tài liệu nghiệp vụ & Kế hoạch
│   ├── ARCHITECTURE.md               # [TỆP NÀY] Kiến trúc tổng thể & Sổ bộ thư viện
│   ├── plans/                        # Kế hoạch & Checklist phân hệ (HR-CHECKLIST.md...)
│   ├── strategy/                     # Bối cảnh hiện trạng, chiến lược số hóa và ranh giới hệ thống
│   ├── 1office-sources/               # Manifest trong Git; export nội bộ chỉ lưu cục bộ
│   └── HR_danhsachnhanvien/          # Dữ liệu nguồn Excel 67 cán bộ nhân sự
├── prisma/                           # Schema PostgreSQL, Migrations & Seed data
│   ├── schema.prisma                 # Lược đồ quan hệ thực thể (Data Model)
│   ├── migrations/                   # Lịch sử các bản migration chính thức
│   ├── seed.ts                       # Script khởi tạo 67 nhân viên, 18 phòng ban, 7 roles
│   └── sync-oneoffice-departments.ts # Nhập snapshot cơ cấu 1Office và cập nhật mapping 18 đơn vị
├── src/
│   ├── actions/                      # Server Actions xử lý logic nghiệp vụ (Direct-to-DB)
│   ├── app/                          # Next.js App Router (Giao diện & Điều hướng)
│   │   ├── (auth)/login/             # Đăng nhập
│   │   ├── (dashboard)/              # Không gian làm việc chính
│   │   │   ├── [...slug]/             # Fallback thống nhất cho URL/tính năng chưa phát triển
│   │   │   ├── departments/          # Quản lý cơ cấu phòng ban (Tree & Table)
│   │   │   ├── system/               # Tổng quan quản trị theo hợp quyền mục con, số liệu cùng công ty
│   │   │   ├── hr/                   # Tổng quan nhân sự theo quyền HR; số liệu hồ sơ cùng công ty
│   │   │   ├── employees/            # Quản lý hồ sơ & danh bạ nhân sự
│   │   │   └── office-3d/            # [3D Digital Twin] Không gian văn phòng 3D
│   │   └── globals.css               # Theme tokens & CSS toàn cục
│   ├── components/                   # Thư viện UI Components
│   │   ├── ui/                       # Atomic UI (Shadcn/UI components)
│   │   ├── layout/                   # Sidebar, Navbar, Header
│   │   │   └── FeatureInDevelopment  # Thông báo dùng chung cho chức năng chưa sẵn sàng
│   │   ├── departments/              # Giao diện Phòng ban
│   │   ├── employees/                # Giao diện Nhân sự
│   │   └── office-3d/                # Canvas 3D Three.js & Controls
│   └── lib/                          # Tiện ích dùng chung (db, auth, audit, permissions, utils)
├── tests/e2e/                        # Playwright E2E bằng Chrome hệ thống
├── .env                              # Biến môi trường local (PORT, DATABASE_URL, JWT_SECRET)
├── .env.example                      # File mẫu biến môi trường chuẩn
├── package.json                      # Danh mục dependencies và scripts chạy
├── playwright.config.ts              # Cấu hình base URL, web server, trace và Chrome channel
└── tsconfig.json                     # Cấu hình TypeScript
```

---

## 3. SỔ BỘ THƯ VIỆN & CÔNG NGHỆ (DEPENDENCY REGISTRY)
> **Quy định:** Mỗi khi chạy lệnh `npm install`, Agent **bắt buộc** bổ sung thông tin thư viện vào bảng này.

| Nhóm Phân Loại | Gói Thư Viện (Package) | Phiên Bản | Mục Đích Nghiệp Vụ & Lý Do Cài Đặt |
| :--- | :--- | :---: | :--- |
| **Framework Lõi** | `next` | `16.4.0` | Nền tảng Fullstack chính (App Router, Server Components & Actions). |
| | `react`, `react-dom` | `19.3.0` | Thư viện Render UI Core. |
| | `typescript` | `^5` | Đảm bảo tính an toàn kiểu dữ liệu tĩnh (Type-safety). |
| **Cơ Sở Dữ Liệu** | `@prisma/client`, `prisma` | `^6.19.3` | ORM kết nối PostgreSQL. *(Khóa cứng v6, không lên v7/v8).* |
| | `dotenv` | `^18.0.7` | Nạp biến môi trường cho các tiến trình chạy CLI độc lập (seed, studio). |
| **Giao Diện & Style** | `tailwindcss`, `@tailwindcss/postcss` | `^4.3.3` | Engine styling thế hệ mới theo biến CSS Variables. |
| | `radix-ui` | `^1.7.0` | Headless Accessible UI primitives cho modal, dropdown, popover. |
| | `lucide-react` | `^1.52.0` | Bộ biểu tượng vector giao diện chuẩn nhất quán. |
| | `sonner` | `^2.0.8` | Hệ thống Toast thông báo trạng thái thao tác người dùng. |
| | `clsx`, `tailwind-merge`, `cva` | Latest | Hợp nhất class style an toàn qua hàm helper `cn()`. |
| **Không Gian Số 3D** | `three` | `^0.186.1` | Engine WebGL dựng mô hình tòa nhà và nội thất. |
| | `@types/three` | `^0.186.0` | Type definitions cho Three.js. |
| | `@react-three/fiber` | `^9.8.2` | Quản lý scene tòa nhà và HCNS bằng React, tải client và vẽ theo yêu cầu. |
| | `@react-three/drei` | `^10.7.9` | CameraControls và hình khối bo góc dùng lại. |
| **Ảnh đại diện** | `sharp` | `^0.35.5` | Kiểm tra, giới hạn kích thước, chuẩn hóa ảnh cá nhân sang WebP trên server. |
| **Tem tài sản** | `qrcode` / `@types/qrcode` (dev) | `^1.5.4` / `^1.5.6` | Tạo PNG QR tại trình duyệt, không gửi URL hoặc hồ sơ ra dịch vụ ngoài. |
| **Kiểm thử QR** | `jsqr` (dev) | `^1.4.0` | Giải mã PNG tải thực tế để kiểm tra URL bằng bộ giải mã độc lập. |
| **Bảo Mật & Xác Thực** | `jose` | `^6.2.12` | Ký & giải mã JWT Session Cookie cho kiến trúc Edge/Serverless. |
| | `bcryptjs` | `^3.0.3` | Băm mật khẩu tài khoản người dùng với Salt. |
| **Form & Xử Lý Dữ Liệu**| `zod` | `^3.25.76` | Xác thực Schema dữ liệu đầu vào phía Server Action. |
| | `react-hook-form`, `@hookform/resolvers` | `^7.89.0` | Quản lý trạng thái và validation biểu mẫu phức tạp. |
| | `@tanstack/react-table` | `^9.2.6` | Quản lý bảng dữ liệu nhân sự lớn (phân trang, lọc, sắp xếp). |
| | `xlsx` | `^0.18.5` | Đọc và nạp dữ liệu danh bạ nhân sự gốc từ file Excel. |
| **Kiểm Thử Trình Duyệt** | `@playwright/test` | `^1.64.1` | Kiểm thử E2E bằng trình duyệt thật, khảo sát DOM và xác minh giao diện desktop/mobile của SDG ERP. |

---

## 4. HẠ TẦNG & CẤU HÌNH MÔI TRƯỜNG (INFRASTRUCTURE & CONFIG)

### Các Cổng Dịch Vụ Mặc Định:
* **`4000`**: Cổng chạy ứng dụng Next.js ERP (`http://localhost:4000`).
* **`5432`**: Cổng máy chủ CSDL PostgreSQL (`localhost:5432`).
* **`5555`**: Cổng giao diện trực quan Prisma Studio (`http://localhost:5555`).

### Biến Môi Trường Chuẩn (`.env`):
```env
# Kết nối PostgreSQL (Cơ sở dữ liệu nội bộ)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sdg_erp?schema=public"

# Khóa bí mật ký JWT Session (tối thiểu 32 ký tự)
JWT_SECRET="sdg-erp-super-secret-key-saodogroup-2026-very-secure"

# Cổng khởi chạy hệ thống
PORT=4000
```

---

## 5. HƯỚNG DẪN KHỞI CHẠY NHANH (QUICKSTART)

Dành cho nhà phát triển mới hoặc thiết lập máy chủ triển khai:

```bash
# 1. Cài đặt các thư viện trong package.json
npm install

# 2. Cấu hình biến môi trường
cp .env.example .env

# 3. Đồng bộ cấu trúc bảng và khởi tạo HR final 72 người một lần
# Cần cung cấp riêng file HR final vào docs/HR_danhsachnhanvien/
npx prisma migrate dev
npm run db:seed

# 4. Khởi tạo cơ cấu từ snapshot cục bộ đã được cấp riêng, chỉ khi cần
# Không truy cập 1Office hoặc đồng bộ lại nhân sự
npm run db:sync:oneoffice-departments

# 5. Khởi động hệ thống
npm run dev
# Truy cập: http://localhost:4000 (Tài khoản mẫu: admin / 123456)

# 6. Chạy E2E bằng Chrome đã cài trên máy
E2E_ADMIN_USERNAME=<local-admin> E2E_ADMIN_PASSWORD=<local-password> npm run test:e2e
# Thêm E2E_ALLOW_WRITES=1 để chạy ca ghi metadata có hoàn tác.
```

Playwright 1.64 không cung cấp Chromium đóng gói cho macOS 13; cấu hình local dùng `channel: "chrome"` để chạy Google Chrome hệ thống. Video mặc định tắt để không phụ thuộc FFmpeg; trace và screenshot lỗi vẫn được giữ. Không ghi tài khoản kiểm thử vào repository.

Next.js 16 mặc định ghi tên, đối số và thời gian chạy của Server Function trong môi trường development. Vì action đăng nhập nhận mật khẩu, `next.config.ts` đặt `logging.serverFunctions: false` để tránh mật khẩu và dữ liệu form nhạy cảm xuất hiện trong terminal; request log thông thường vẫn được giữ.
Base URL E2E mặc định phải dùng `http://localhost:4000`; Next.js 16 dev HMR trên môi trường này không hydrate ổn định khi truy cập bằng `127.0.0.1`.

---

## 6. QUY TRÌNH CẬP NHẬT TÀI LIỆU KHI THÊM THƯ VIỆN HOẶC ĐỔI CẤU HÌNH

Khi AI Agent hoặc kỹ sư thêm thư viện mới hoặc thay đổi hạ tầng, **thực hiện quy trình 3 bước sau**:

1. **Thực thi cài đặt:** Chạy lệnh `npm install <package>`.
2. **Cập nhật Bảng Mục 3 (Sổ bộ thư viện):** 
   - Thêm 1 dòng tương ứng gồm: Nhóm, Tên gói, Phiên bản cài đặt, và **Mục đích nghiệp vụ cụ thể** (Tại sao phải cài, phục vụ tính năng gì).
3. **Cập nhật `.env.example` & Mục 4 (nếu có biến môi trường mới):** Đảm bảo không lộ secret keys nhưng vẫn đủ thông số mẫu cho môi trường khác.

### Tài liệu báo cáo nội bộ

- `docs/bao-cao/`: bản trình bày phục vụ báo cáo thử việc và trao đổi nội bộ. `BAO-CAO-TUAN-THU-VIEC-DAU-TIEN-BAN-NHAP-01.pptx` bám 5 đầu việc tại trang 20 cẩm nang hội nhập, là bản nháp chờ người báo cáo xác nhận thông tin cá nhân và quản lý chốt KPI; không phải quyết định triển khai tính năng.
- Việc tạo báo cáo không bổ sung dependency hoặc thay đổi cấu hình ứng dụng.




### Sơ đồ tổ chức — 23/10/2026
- `src/components/departments/OrganizationChart.tsx`: client component vẽ cây ngang bằng SVG và các nút Shadcn trong foreignObject, không thêm dependency. Tọa độ/kích thước SVG tính từ cây DB; màu dùng theme Tailwind.
- Trang `/departments` có hai tab danh sách và sơ đồ dùng chung dữ liệu; tên công ty được truy vấn theo session. Đối soát snapshot chuyển vào dialog cho HR MANAGE. Sơ đồ không sửa quan hệ tổ chức.



### Cập nhật bố cục cơ cấu — 24/10/2026
- `OrganizationChart.tsx` chuyển từ cây ngang sang cây từ trên xuống, x phân theo nhánh và y phân theo cấp; đường nối SVG từ đáy nút cha tới đỉnh nút con. Không thay nguồn dữ liệu hoặc dependency.

### Kế hoạch phân quyền — 24/10/2026
- Thêm tài liệu [ROLE-MANAGEMENT-CHECKLIST.md](plans/ROLE-MANAGEMENT-CHECKLIST.md), đăng ký router AGENTS. Đây là kế hoạch, chưa thay kiến trúc chạy thật hoặc dependencies.
- Tái sử dụng Role/Permission/RolePermission/UserRole, dự kiến tách quyền RBAC, xử lý hiệu lực phiên và thêm quản lý phạm vi theo giai đoạn; xem plan cho các bước chưa thực hiện.

### Danh mục ý tưởng — 24/10/2026
- Thêm [Ý tưởng tính năng](strategy/Y-TUONG-TINH-NANG.md), ghi nhận quét mã tài sản qua web điện thoại và liên kết checklist tài sản. Chưa thay kiến trúc vận hành, schema hoặc dependency.

### Công cụ kiểm tra lần tách nhân sự (27/10/2026)

TypeScript, ESLint, Prisma validate/migrate diff và production build webpack; Playwright Chrome kiểm thử trên tài khoản tạm và dọn sau test. Prettier 3 chạy qua npm exec để định dạng tệp mới, không thêm dependency vào package.json hoặc thay lockfile. Snapshot trước chuyển đổi được lưu ngoài repo; không công khai nội dung mật khẩu băm trong báo cáo.

### Route tính năng và trang không tìm thấy — 11/11/2026

Route thật trong `src/app/(dashboard)` là nguồn xác định chức năng đã có. `[...slug]/page.tsx` chỉ giữ trang chờ cho các đường dẫn đã khai báo (công việc, cài đặt và hồ sơ nhân sự chi tiết); URL ngoài danh sách gọi `notFound()`. Đã gỡ trang tạm hoãn và bộ kiểm thử riêng của công cụ hồ sơ thanh toán AI theo yêu cầu, cùng plan và hướng dẫn khôi phục. Không có bảng hoặc dependency riêng cần gỡ; không đổi DB hay quyền dùng chung. Đối chiếu tính năng–mã nguồn–DB tại [tổng quan plan](plans/README.md#đối-chiếu-plan-với-code-và-db).

## Vật tư tiêu hao và phụ kiện — 17/11/2026

- `/inventory?kind=consumable|accessory` dùng `src/components/inventory/` (bảng/panel, form danh mục, giao dịch và breadcrumb về `/asset-management`). Server page kiểm tra phiên/quyền, tương tác qua `src/actions/inventory.ts`, Zod tại `src/lib/validations/inventory.ts`; không thêm dependency hoặc biến môi trường.
- Prisma thêm `loai_vat_tu`, `mat_hang_vat_tu`, `giao_dich_vat_tu`; migration có hàm SQL tính tồn/đang cấp và trigger kiểm tra sổ chỉ ghi thêm. Không có bảng tồn riêng, repository/service hoặc API song song. Thiết kế, tiến độ migration và kiểm chứng tại [plan vật tư](plans/INVENTORY-MANAGEMENT-CHECKLIST.md).
- Quyền `INVENTORY VIEW/MANAGE` độc lập; catalog/ma trận dùng lại vai trò, options chỉ trả dữ liệu đủ chọn. Vị trí/phòng ban giữ FK lịch sử. Không thay gán thiết bị/người ở 3D và không thêm license.

### Vật tư IT và ticket — 18/11/2026

Vật tư IT 18/11: migration `20261118090000_ton_chung_tieu_hao` sửa CHECK/hàm/trigger để tiêu hao tính tồn chung; giữ ba bảng/cột, phụ kiện theo nơi giữ. Form tạo ghi số ban đầu và audit cùng transaction có UUID chống lặp; giao diện hồ sơ cho ghi nhận sử dụng. Không thêm dependency/env. VPP để kế hoạch; liên kết ticket được triển khai trong cùng đợt theo [plan vật tư](plans/INVENTORY-MANAGEMENT-CHECKLIST.md). `WorkflowMaterials.tsx` sửa dòng dự kiến; `workflow.ts` ghi tiêu hao khi hồ sơ hoàn thành trong cùng transaction. Migration `20261118100000_vat_tu_ticket` thêm `dong_vat_tu_quy_trinh` và FK unique trên giao dịch, không tạo động cơ ticket mới.

### Điều hướng Tài sản & vật tư — 17/11/2026

`/asset-management` là trang tổng quan server: đếm hồ sơ/mặt hàng đang dùng, phân bố loại, nhóm cần rà soát và năm tài sản vừa cập nhật trong cùng snapshot RepeatableRead sau kiểm tra quyền ASSETS/INVENTORY độc lập. Bấm số liệu mở bộ lọc/panel hiện có; thiết kế và kiểm chứng tại [plan tài sản](plans/ASSET-MANAGEMENT-CHECKLIST.md#tổng-quan-khi-mở-phân-hệ--19112026). Sidebar dùng một liên kết cho cả khu vực; `ManagementBreadcrumb.tsx` thay `ManagementTabs.tsx` trên `/assets` và `/inventory`. `AssetCategoryFilters.tsx` cung cấp lựa chọn loại gọn và tìm kiếm; `asset-list-navigation.ts` đọc/ghi truy vấn danh sách vào URL bằng History API tích hợp Next. Giữ URL QR/hồ sơ hiện có, Tailwind/shadcn, không thêm dependency/env/schema. Trạng thái triển khai và kiểm chứng theo [plan IA](plans/INFORMATION-ARCHITECTURE-CHECKLIST.md).

### Đính kèm AI — 18/11/2026

`mammoth` (^1.13.0) trích DOCX thành văn bản; `yauzl` (^3.4.0) + `@types/yauzl` (^3.4.0) kiểm tra ZIP Office theo luồng có giới hạn giải nén. Tái sử dụng `xlsx` cho bảng tính trong worker `ai-sheet-worker.cjs` (15 giây/128 MiB heap), đóng gói worker/dependency bằng outputFileTracingIncludes và `sharp` cho ảnh. Kho riêng `var/ai-attachments` (override `AI_ATTACHMENT_STORAGE_DIR`, không cần thêm `.env` local); backup cùng DB. Server Actions tải/bỏ tệp, Route Handler `/media/ai-attachments/[id]` phục vụ tải/preview có kiểm tra quyền. Bộ đọc/công cụ tại `src/lib/ai-attachment*.ts`; UI tại `AiAttachments`. Giới hạn và DB thuộc [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#đính-kèm-và-phân-tích-tệp--18112026). Upload mỗi request một tệp ≤10 MiB, Server Actions body limit 12mb (các action khác vẫn giữ validation riêng).

### Công cụ ghi tài liệu AI — 18/11/2026

Thêm `docx` (^9.15.4), `exceljs` (^4.4.0), `pdf-lib` (^1.17.1) và `@pdf-lib/fontkit` (^1.1.1) cho font Unicode cho tạo/điền Word, chỉnh bảng tính và thao tác PDF; LibreOffice được cài ở máy chạy backend để xuất PDF headless. Công cụ/worker đặt tại `src/lib/ai-document*`; kho tệp, quyền và lịch sử dùng lại phần đính kèm. Phạm vi/DB/kiểm chứng tại [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#tạo-sửa-và-xuất-tài-liệu--18112026).

Đợt PDF → Word 23/11 thêm `pdfjs-dist` ^6.5.438, `@napi-rs/canvas` ^1.2.0, `@xmldom/xmldom` ^0.9.12, `jszip` ^3.10.2. Node cần >=22.13.0 (máy local dùng 24). `ai-pdf-worker.cjs` trích chữ/render trang bằng PDF.js/canvas; `ai-word-edit-worker.cjs` sửa XML Word qua DOM/ZIP sau validation. Hai helper chạy trong worker tài liệu hiện có. Next externalize/trace thư viện, font/CMap/WASM PDF.js và binary canvas; npm ci trên đúng OS/kiến trúc máy chủ. Scan dùng ảnh trang gửi model vision ở lượt được yêu cầu, không thêm dịch vụ OCR ngoài. Không thêm env/migration; LibreOffice xuất PDF như hiện có. Giới hạn/kiểm chứng tại [plan PDF](plans/AI-ASSISTANT-CHECKLIST.md#đọc-pdf-và-dựng-word-chỉnh-sửa--23112026).

LibreOffice 26.8.3 bản Intel cho macOS 13 được cài trong `~/Applications/LibreOffice.app` từ bản phân phối ký của The Document Foundation; runtime tự tìm đường dẫn này hoặc `LIBREOFFICE_PATH`. Điền PDF Unicode dùng Noto Sans đi kèm LibreOffice, hoặc `PDF_FONT_PATH` trỏ tới font được phép dùng; Linux mặc định thử DejaVu Sans. Không thêm khóa API hoặc sửa `.env`.


Chạy môi trường mới: `npm ci`; cài LibreOffice trên **máy chạy backend**, không phải từng máy người dùng. macOS dùng bản đúng CPU tại [trang tải chính thức](https://www.libreoffice.org/download/download-libreoffice/); Linux cài gói LibreOffice Writer/Calc và font Unicode. Runtime tìm `~/Applications/LibreOffice.app`, `/Applications/LibreOffice.app`, `/usr/bin/libreoffice` hoặc `/usr/bin/soffice`; đường dẫn khác cấu hình `LIBREOFFICE_PATH` tới executable. `PDF_FONT_PATH` tùy chọn trỏ TTF Unicode cho PDF form. LibreOffice/font không nằm trong npm hoặc Git; deploy phải cung cấp riêng.

Worker `ai-document-worker.cjs` chạy trong Node (256 MiB heap/30 giây); Next externalize và trace các thư viện cùng worker. Xuất PDF gọi executable cố định, tham số dạng mảng, profile/thư mục tạm riêng, timeout 45 giây, không truyền credential ERP. macOS chặn kết nối IP đi ra nhưng giữ IPC cần cho LibreOffice. Office có macro/đối tượng nhúng/liên kết ngoài/field code không được xử lý; sửa Excel từ chối workbook có biểu đồ/pivot/drawing để tránh mất cấu trúc. Đây không phải sandbox hệ điều hành đầy đủ: khi đưa lên Linux/production, chạy worker chuyển đổi trong container riêng, giới hạn CPU/RAM, chặn mạng và không mount dữ liệu ERP. Chưa hỗ trợ runtime edge/serverless không có process hoặc ổ đĩa ghi riêng.


Dashboard AI tinh gọn 18/11: `DashboardWorkspace` sở hữu hàng tiêu đề/tab; `AiChatActions` chứa menu hội thoại và form đổi tên dùng `renameAiChat`/`RenameChatSchema`. Tái sử dụng cột `hoi_thoai_ai.tieu_de`, không migration/dependency/env mới. Bố cục, bảo toàn ngữ cảnh và kết quả đo UX thuộc [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#tinh-gọn-theo-phản-hồi-giao-diện--18112026).

### Khung giao diện chung

`src/components/layout/AppLayout.tsx` vẫn là Server Component đọc session. `AppShell.tsx` là Client Component giữ trạng thái sidebar (mặc định thu gọn, giữ qua điều hướng nội bộ); header sticky suốt chiều ngang chứa nút menu/logo, sidebar nằm dưới header. `Sidebar` và `Header` dùng chung cấu hình nhóm điều hướng; `AppContent.tsx` là Client Component nhỏ chọn giới hạn chiều rộng theo URL và nhận nội dung server qua children. Không thêm thư viện hoặc thay quyền/route. Bản đồ menu, các mẫu vùng nội dung và kiểm chứng do [plan IA](plans/INFORMATION-ARCHITECTURE-CHECKLIST.md#khung-ứng-dụng-chung--đã-áp-dụng-1811) sở hữu.

Công cụ AI vật tư 18/11: `src/lib/ai-tool-access.ts` ánh xạ công cụ nghiệp vụ/quyền; `ai-inventory-tools.ts` chứa schema và định nghĩa công cụ; `src/actions/ai-inventory.ts` tra cứu/lập bản nháp qua action vật tư có sẵn. `InventoryItemForm` và `InventoryTransactionForm` nhận giá trị khởi tạo từ AI, giữ action lưu chung. Metadata chat thêm tham chiếu mặt hàng/loại vật tư trong JSON hiện có; không migration/dependency/env mới. Phạm vi và kiểm chứng tại [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#công-cụ-vật-tư-theo-quyền-tài-khoản--18112026).

Ghi nhận hàng mua qua AI: `src/actions/ai-inventory-receipt.ts` xử lý đề xuất/chỉnh sửa/duyệt nguyên tử trực tiếp Prisma; `src/lib/ai-inventory-receipt.ts` giữ hợp đồng JSON và view; `src/components/ai/AiInventoryReceiptCard.tsx` hiển thị bảng và chỉnh sửa tại chỗ. Tái sử dụng `cong_viec_ai` với loại `NHAP_VAT_TU`, dispatcher `ai-work.ts`; migration `20261119110000_cong_viec_nhap_vat_tu` chỉ mở rộng CHECK loại công việc. Không thêm dependency/env. Trạng thái áp dụng và kiểm chứng theo [plan AI](plans/AI-ASSISTANT-CHECKLIST.md#ghi-nhận-hàng-vừa-mua--19112026).

## Công việc và ticket hỗ trợ — bản thử 20/11/2026

`src/actions/support-task.ts` truy cập Prisma trực tiếp; `src/lib/support-task*.ts` giữ validation, phạm vi quyền và lưu tệp; `src/components/tasks/` phục vụ `/tasks`, `/tasks/department`, `/tasks/[id]` và điểm tạo yêu cầu/thông báo ở dashboard. Bốn bảng nghiệp vụ, quan hệ quản lý trực tiếp trên HR và quyền `SUPPORT_TASK` theo [plan Công việc](plans/TASK-MANAGEMENT-CHECKLIST.md). Tệp ở `var/task-attachments/` ngoài Git/public, có thể dùng `TASK_ATTACHMENT_STORAGE_DIR` trỏ volume bền vững; chưa thêm biến vào `.env`. Tải từng tệp qua Server Action (giới hạn body hiện có 12 MiB), xem/tải qua `/media/task-files/[id]` kiểm tra quyền. Dùng lại Zod, sharp, pdf-lib và kiểm tra ZIP Office hiện có; không thêm dependency. Sao lưu DB cùng kho tệp; migration/restore và kiểm thử ghi tại plan.


Sao lưu công việc: chạy `node scripts/backup-support-tasks.cjs outputs/<thu-muc-moi>` với `DATABASE_URL` và `TASK_ATTACHMENT_STORAGE_DIR` của môi trường; `PG_DUMP_BIN` tùy chọn trỏ `pg_dump` tương thích phiên bản server. Script dùng snapshot PostgreSQL chung cho dump và manifest, sao chép byte bất biến, đối chiếu SHA-256; đầu ra gồm `database.dump`, `manifest.json`, `files/`. Thư mục sao lưu riêng, không ghi đè bản cũ. Phục hồi bằng `pg_restore` vào DB riêng và trỏ kho tệp tới `files/`, kiểm tra quyền và hash trước chuyển môi trường. `node scripts/check-support-task-files.cjs` chỉ đối chiếu tệp/DB và báo tệp mồ côi trên 24 giờ, không tự xóa. Đây là công cụ thủ công, chưa lập lịch/đồng bộ ra nơi lưu dự phòng. Không ghi URL/khoá vào log hoặc source.

Ticket qua AI (23/11): `src/lib/ai-support-task.ts` chứa schema/tool và hợp đồng nháp; `src/actions/ai-support-task.ts` tra danh mục tối thiểu, kiểm tra nháp bằng helper chung `validateTaskCreation`. `src/components/ai/AiSupportTicket.tsx` dùng lại `TaskCreate`, kiểm tra yêu cầu đã tạo trước mở form. Nháp lưu vào JSON metadata tin nhắn hiện có; tool không ghi đầu việc, chỉ action tạo khi người dùng xác nhận. Không thêm dependency, env hoặc migration. Phạm vi/quyền và kiểm chứng theo [plan Công việc B.9](plans/TASK-MANAGEMENT-CHECKLIST.md#b9-ticket-hỗ-trợ-qua-ai-và-tinh-gọn-thao-tác--23112026).

Tra đích hỗ trợ AI: `src/lib/support-target-search.ts` chuẩn hóa tìm tên/mã/chức danh, tên viết tắt phòng và từ đồng nghĩa IT/CNTT; không ánh xạ người phụ trách hoặc cấp quyền. `getTaskOptions` trả danh mục tối thiểu và lý do chưa đủ điều kiện nhận; lựa chọn chat lưu trong metadata trace hiện có. Không thêm dependency/env/migration; chi tiết tại B.9 plan Công việc.

## Office web trong chat — đang triển khai 23/11/2026

ONLYOFFICE Docs chạy riêng theo `deploy/office/compose.yaml`; không cài Microsoft Office trên máy người dùng. Cấu hình `OFFICE_PUBLIC_URL` (trình duyệt), `OFFICE_INTERNAL_URL` (ERP gọi dịch vụ), `OFFICE_APP_URL` (dịch vụ gọi ERP), `OFFICE_JWT_SECRET` riêng ít nhất 32 ký tự; ví dụ tại `deploy/office/env.example`. Dùng jose có sẵn, không thêm dependency hoặc schema. `src/actions/office-editor.ts` cấp cấu hình/lệnh lưu/trạng thái; `src/lib/office-editor.ts`, `office-access.ts` kiểm tra chữ ký và quyền; `/api/office/source`, `/api/office/callback` phục vụ tích hợp không cookie, kiểm tra token và quyền hiện hành. Trạng thái nghiệm thu và DB giữ tại plan AI. Dịch vụ 10.0.0.1 đã chạy trên Mac, healthcheck trả true; kết quả chỉnh/lưu thật cập nhật tại plan AI.

Client `AiOfficePanel.tsx` nạp DocsAPI từ origin cấu hình, giữ editor khi resize và chặn mất thay đổi chưa lưu. `OFFICE_MOBILE_EDIT_ENABLED` mặc định false; Compose cho chọn `OFFICE_IMAGE`. `deploy/office/start-local.mjs` kiểm tra Docker trước, tạo `.env.office` và nối cấu hình vào `.env.local` ngoài Git, không in secret; đợi job font/cache và healthcheck tối đa 10 phút trước báo sẵn sàng. Next dev bỏ log `/api/office/` để không ghi ticket; proxy production phải bỏ query nhạy cảm. [Hướng dẫn khởi chạy](../deploy/office/README.md). Kiểm thử unit/integration và browser mô phỏng tại `tests/*/office-editor.*`; chưa thay thế Document Server thật.

Máy phát triển Mac Intel macOS 13.7.8: dùng Lima 2.3.0/VZ thay Docker Desktop mới đã hết hỗ trợ macOS 13. Đã cài binary Lima + Docker CLI 29.10.0 + Compose 5.8.0 tại `~/.local/share/sdg-office-runtime`, symlink `~/.local/bin`; plugin Compose tại `~/.docker/cli-plugins`. Tải từ release chính thức, xác minh SHA256 của Lima/Compose; không sửa shell profile hoặc cài bằng sudo. VM `sdg-office` đã khởi động 4 CPU/6 GiB RAM/50 GiB đĩa sparse, không mount thư mục cá nhân; trạng thái kiểm chứng thuộc plan AI. VM dùng Ubuntu 26.04.1 LTS, Docker Engine 29.10.0; đã thử khởi động lại và mở rộng đĩa, còn khoảng 41 GiB trống. VPS Linux dùng Docker Engine + Compose trực tiếp, không cần Lima.

Cấu hình VPS mẫu ở `deploy/office/env.vps.example`; Compose dùng chung Mac/Linux. Script local tự tìm Docker CLI và context Lima, giữ cấu hình có sẵn; `.env.office`/`.env.local` đã được tạo ngoài Git bằng khóa ngẫu nhiên riêng, mode 600. Trên Lima `OFFICE_APP_URL` dùng `host.lima.internal:4000`. Hướng dẫn VPS trong README Office gồm HTTPS/WebSocket, mạng hai chiều, DB/kho tệp/khóa và cài lại dependency theo OS; chưa triển khai VPS.

Kiểm chứng local Office thật đã đạt mở/sửa/lưu Word và Excel, công thức và xuất PDF; không gọi OpenAI. Image amd64 `onlyoffice/documentserver:10.0.0.1`, digest `sha256:ca17889f10b11141cc6441836aebdd2835cf3e1b49681b2fd6e155c94b7850b3`. Container tạo font/theme/cache rồi restart dịch vụ khi khởi động; chờ hoàn tất trước mở tài liệu. Sau reboot Mac, khởi động lại Lima rồi chạy script local; Office trong VM dùng restart policy `unless-stopped`. Chưa cấu hình tự mở VM lúc đăng nhập.
