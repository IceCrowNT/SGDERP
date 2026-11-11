# Kế hoạch SDG ERP — đọc nhanh

Cập nhật: **10/11/2026**. Ưu tiên: **phân quyền → phân công thực tế → workflow thử nghiệm**. Các chức năng hiện tại vẫn là bản thử nghiệm, chưa đồng nghĩa nghiệm thu vận hành.

Giao diện đã đồng bộ cho nhân sự, tài khoản, phòng ban, profile, workflow, nhật ký và 3D: số liệu có phạm vi rõ, bảng/thẻ responsive, hướng dẫn mở khi cần. Kiểm tra 09/11: lượt toàn bộ 52 E2E đạt 50, hai lỗi hiển thị/selector đã sửa và nhóm liên quan chạy lại **14/14 đạt**; TypeScript/lint đạt. Chrome kiểm tra 7 màn hình trên desktop/mobile không tràn ngang. Riêng danh bạ nhân sự mới: 20 E2E liên quan đạt, chi tiết tại plan HR. Chi tiết các mảng tại từng plan. Hiện có 3 vai trò (ADMIN, DEFAULT, HCNS); lần cập nhật UI không đổi schema hoặc quyền.

| Mảng | Hiện tại | Việc tiếp theo |
| --- | --- | --- |
| [Nhân sự/phòng ban](HR-CHECKLIST.md) | Đã có CRUD, tài khoản riêng, head kiêm nhiệm, tự khóa khi nghỉ việc; danh bạ theo phòng, hồ sơ bên phải, bảng phân trang và gán vị trí làm việc | Chọn head thực tế, chốt phạm vi xem dữ liệu |
| [Vai trò/phân quyền](ROLE-MANAGEMENT-CHECKLIST.md) | Đã có `/roles`, ma trận, gán/gỡ; đã thu gọn vai trò mẫu còn 3 | Dùng thử với tài khoản thực tế; quyền workflow đã có, chờ cấp thực tế |
| [Workflow](WORKFLOW-CHECKLIST.md) | Đã có `/workflows`, 5 bảng, mẫu có phiên bản và xử lý tuần tự; đã thiết kế kéo thả, biểu mẫu, giao việc và thông báo | Cấu hình pilot thực tế; sau đó làm bản mẫu kỹ thuật vùng kéo thả và migration an toàn |
| [Tài khoản mặc định/Profile/Dashboard](PROFILE-DASHBOARD-CHECKLIST.md) | Đã có DEFAULT/tên tự sinh, profile và dashboard cá nhân; đã thiết kế ưu tiên việc đến lượt | Dùng thử thực tế; bổ sung thông báo trong ứng dụng cùng workflow mở rộng |
| [Vị trí & không gian](LOCATION-MANAGEMENT-CHECKLIST.md) | Đã có cây `vi_tri`, `/locations`, quyền LOCATIONS; đã nhập thêm 10 điểm HCNS theo yêu cầu | Gán/chuyển/bỏ gán người ngay tại vị trí; xóa có xác nhận tự bỏ gán. Tài sản tích hợp sau |
| [Tài sản/3D](ASSET-MANAGEMENT-CHECKLIST.md) | Mức 1: 2 bảng loại/tài sản, tham chiếu vị trí chung; chưa triển khai. Vật tư làm sau | Sau nền vị trí: migration an toàn và UI tài sản; không gộp quyền sửa cây vị trí |
| [3D tòa nhà & HCNS](OFFICE-3D-CHECKLIST.md) | Tòa nhà ba tầng mở mái, nội thất HCNS dùng chung; đọc người qua vị trí theo quyền HR. Chi tiết HCNS có gán/chuyển/bỏ gán trực tiếp theo HR MANAGE | Bổ sung sơ đồ nội thất và ánh xạ các phòng còn lại |
| [Hồ sơ AI](AI-DOCUMENTS-CHECKLIST.md) | Tạm hoãn, đã gỡ pilot | Chờ duyệt mẫu, người dùng và ngân sách API |
| [Số hóa/báo cáo](DIGITAL-TRANSFORMATION-CHECKLIST.md) | Đã khảo sát và chuẩn bị báo cáo | Chốt KPI, đầu mối, lịch và tiêu chí nghiệm thu |

## Cách cập nhật để kế hoạch luôn ngắn

- Rule Frontend/Backend/Database giữ chuẩn kỹ thuật chung, ổn định; nghiệp vụ tính năng ở rule riêng. Quyết định DB riêng đặt trong mục `Thiết kế DB cần giữ` của plan sở hữu tính năng; chi tiết dài liên kết sang thiết kế, không dồn vào rule DB chung.
- Mỗi plan giữ trạng thái, quyết định, việc tiếp theo và tiêu chí hoàn thành; `[x]` là đã làm, `[ ]` là còn lại.
- Cập nhật mục hiện có khi quyết định thay đổi; không nối thêm nhật ký từng lệnh hoặc lặp lịch sử kiểm thử.
- Tên bảng/cột xem [Từ điển DB](../DATABASE-DICTIONARY.md); schema/luồng workflow xem [Thiết kế quy trình](../THIET-KE-QUY-TRINH.md); hướng dẫn kỹ thuật xem [Kiến trúc](../ARCHITECTURE.md) và [rules](../../.agents/rules).
- Quy ước DB từ 06/11/2026: bảng nghiệp vụ dùng tiếng Việt; khóa kỹ thuật dùng tên Anh ngắn gọn; FK nghiệp vụ phức tạp dùng tiếng Việt + `_id`. Migration đổi tên đã áp dụng và không thay dữ liệu.
- Lịch sử mã nguồn ở Git; bản nguyên trạng sáu plan trước lần rút gọn được lưu cục bộ trong `outputs/ke-hoach-truoc-rut-gon/20261104-161557/`, có checksum. Bản sao là lịch sử, không thay thế quyết định hiện hành.

## Rà soát tài liệu

- [x] Thiết lập [quy trình duyệt ba rule kỹ thuật chung](../../AGENTS.md#quy-trình-duyệt-ba-rule-kỹ-thuật-chung): trình bày nội dung và tác động trước, chỉ sửa sau yêu cầu triển khai ở lượt tiếp theo. Lần này chỉ cập nhật quy trình trong `AGENTS.md` và liên kết theo dõi tại đây; không sửa ba rule hoặc mã ứng dụng/DB.
- [x] Bổ sung chuẩn Frontend toàn dự án: ẩn ID/metadata và giải thích kỹ thuật không giúp người dùng thao tác; ưu tiên tên/ngữ cảnh, chỉ hiện mã nghiệp vụ khi có giá trị sử dụng. Đây là cập nhật rule; chưa đồng nghĩa đã rà soát, sửa toàn bộ giao diện hiện có.
- [x] Rà soát cả ba rule chung: Frontend giữ chuẩn giao diện và nguyên tắc trực quan toàn dự án; Backend giữ chuẩn server và kiểm tra đúng quyền từng hành động; Database giữ chuẩn thiết kế ổn định. Nghiệp vụ tách sang rule HR, phân quyền, workflow và tài khoản/profile/dashboard, đã đăng ký tại `AGENTS.md` và liên kết từ plan. Cả ba file giữ dưới giới hạn 12.000 ký tự. Đã kiểm tra 113 liên kết/anchor và `git diff --check`; bản trước chỉnh sửa lưu cục bộ trong `outputs/rule-cleanup/`. Lần rà soát này chỉ sửa tài liệu, không đổi mã ứng dụng hoặc DB.
