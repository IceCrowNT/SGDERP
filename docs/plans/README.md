# Kế hoạch SDG ERP — đọc nhanh

Cập nhật: **06/11/2026**. Ưu tiên: **phân quyền → phân công thực tế → workflow thử nghiệm**. Các chức năng hiện tại vẫn là bản thử nghiệm, chưa đồng nghĩa nghiệm thu vận hành.

Kiểm tra kỹ thuật gần nhất sau migration quy ước tên: **51 E2E + 9 unit đạt**, build Webpack đạt, Prisma schema không lệch DB. Ngày 06/11 database local được tạo lại và seed bộ demo: 72 nhân sự, 1 tài khoản quản trị, 18 phòng ban, 8 vai trò và 18 quyền.

| Mảng | Hiện tại | Việc tiếp theo |
| --- | --- | --- |
| [Nhân sự/phòng ban](HR-CHECKLIST.md) | Đã có CRUD, tài khoản riêng, head kiêm nhiệm, tự khóa khi nghỉ việc | Chọn head thực tế, chốt phạm vi xem dữ liệu |
| [Vai trò/phân quyền](ROLE-MANAGEMENT-CHECKLIST.md) | Đã có `/roles`, ma trận, gán/gỡ và quyền hiệu lực | Dùng thử với tài khoản thực tế; quyền workflow đã có, chờ cấp thực tế |
| [Workflow](WORKFLOW-CHECKLIST.md) | Đã có `/workflows`, 5 bảng, mẫu có phiên bản và xử lý tuần tự; đã thiết kế kéo thả, biểu mẫu, giao việc và thông báo | Cấu hình pilot thực tế; sau đó làm bản mẫu kỹ thuật vùng kéo thả và migration an toàn |
| [Tài khoản mặc định/Profile/Dashboard](PROFILE-DASHBOARD-CHECKLIST.md) | Đã có DEFAULT/tên tự sinh, profile và dashboard cá nhân; đã thiết kế ưu tiên việc đến lượt | Dùng thử thực tế; bổ sung thông báo trong ứng dụng cùng workflow mở rộng |
| [Tài sản/3D](ASSET-MANAGEMENT-CHECKLIST.md) | Tài sản tạm hoãn, đã gỡ bảng; 3D nhân sự còn hoạt động | Chờ duyệt phạm vi khởi động lại |
| [Hồ sơ AI](AI-DOCUMENTS-CHECKLIST.md) | Tạm hoãn, đã gỡ pilot | Chờ duyệt mẫu, người dùng và ngân sách API |
| [Số hóa/báo cáo](DIGITAL-TRANSFORMATION-CHECKLIST.md) | Đã khảo sát và chuẩn bị báo cáo | Chốt KPI, đầu mối, lịch và tiêu chí nghiệm thu |

## Cách cập nhật để kế hoạch luôn ngắn

- Mỗi plan giữ trạng thái, quyết định, việc tiếp theo và tiêu chí hoàn thành; `[x]` là đã làm, `[ ]` là còn lại.
- Cập nhật mục hiện có khi quyết định thay đổi; không nối thêm nhật ký từng lệnh hoặc lặp lịch sử kiểm thử.
- Tên bảng/cột xem [Từ điển DB](../DATABASE-DICTIONARY.md); schema/luồng workflow xem [Thiết kế quy trình](../THIET-KE-QUY-TRINH.md); hướng dẫn kỹ thuật xem [Kiến trúc](../ARCHITECTURE.md) và [rules](../../.agents/rules).
- Quy ước DB từ 06/11/2026: bảng nghiệp vụ dùng tiếng Việt; khóa kỹ thuật dùng tên Anh ngắn gọn; FK nghiệp vụ phức tạp dùng tiếng Việt + `_id`. Migration đổi tên đã áp dụng và không thay dữ liệu.
- Lịch sử mã nguồn ở Git; bản nguyên trạng sáu plan trước lần rút gọn được lưu cục bộ trong `outputs/ke-hoach-truoc-rut-gon/20261104-161557/`, có checksum. Bản sao là lịch sử, không thay thế quyết định hiện hành.
