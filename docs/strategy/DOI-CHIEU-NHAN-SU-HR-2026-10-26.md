# Nhập danh sách nhân sự HR chốt ngày 26/10/2026

> **Bổ sung từ đối chiếu file gốc:** [Bảng so sánh HR final–1Office](BANG-SO-SANH-HR-FINAL-VA-1OFFICE.md) phân biệt 58 cặp có căn cứ và 1 liên kết tạm “Nhân viên IT” ↔ Dương Hoàng Nam. Con số 59 cập nhật bên dưới là số hồ sơ ERP đã được cập nhật, không phải 59 danh tính nguồn đã xác minh chắc chắn. Ngày sinh có đủ ở cả hai file nguồn khớp 56/56; lỗi lệch ngày nằm ở lần nhập ERP cũ.


Thực hiện ngày 27/10/2026 theo yêu cầu dùng file final do HR cung cấp. Đã ghi vào PostgreSQL của dự án, không chỉ cập nhật seed.

## Nguồn và kết quả

- File: `docs/HR_danhsachnhanvien/DS_nhan_su_Sao_Do_26.10.2026.xlsx`, sheet `Danh sach nhan su`, 72 dòng người (dòng Excel 6–77).
- SHA256: `ff7b5573f0896bac588649dbc869a233dd7cc9a280814d19f21b97992994a9a8`.
- 59 hồ sơ có sẵn được cập nhật; thêm 13 hồ sơ, mã nội bộ SDG-075 đến SDG-087. File không cấp mã nhân viên, nên đây là mã ERP, không phải mã do HR/1Office cấp. Không dùng STT làm định danh người.
- Kết quả: **72 ACTIVE theo danh sách HR**, **7 UNKNOWN chờ đối chiếu**, **1 LEFT đã nghỉ**; tổng **80 hồ sơ lưu trữ**, không phải 80 người đang làm.
- 68 tài khoản, liên kết tài khoản–người, toàn bộ mật khẩu băm, trạng thái, phiên bản phiên và quyền giữ nguyên. Không tự tạo tài khoản cho 13 người mới.
- 18 đơn vị và cây cấp trên giữ nguyên. File HR xác nhận 9 phòng/ban cấp chính; lần nhập này gán nhân sự đúng 9 đơn vị đó, không suy diễn bộ phận con từ chức danh. Liên kết bộ phận trước nhập được giữ trong audit và backup.

| Phòng/ban ERP | Người theo file HR |
| --- | ---: |
| BLD | 3 |
| BKS | 2 |
| KD | 10 |
| TCKT | 6 |
| HCNS | 13 |
| PC | 2 |
| KHDT | 5 |
| PTDA | 3 |
| QLDA_NDV1 | 28 |
| **Tổng** | **72** |

## Quy tắc đối chiếu đã áp dụng

1. Giữ ID, mã nhân viên và mapping 1Office của hồ sơ cũ. Ghép tên chính xác sau chuẩn hóa Unicode/khoảng trắng; không ghép mờ hàng loạt.
2. `YOON JOON SUN` dùng hồ sơ SDG-010 (`Joonsun Yoon`): ngày sinh trong file HR và export gốc 1Office cùng 29/06/1973, cùng khối kinh doanh. Cập nhật tên theo HR, không tạo người thứ hai.
3. Dòng Đào Thị Thu Trang, trưởng phòng HCNS, dùng SDG-018, khớp phòng/chức vụ cũ. SDG-070 trùng tên nhưng thiếu phòng/chức vụ xác định, vẫn là hồ sơ riêng UNKNOWN; không gộp hoặc chuyển tài khoản.
4. Trần Thị Ngọc Dung được tạo mới; không tự gán tài khoản chung `Lễ tân` cho người này khi chưa có xác nhận.
5. Tên, chức danh, ngày sinh, phòng ban và ghi chú lấy theo HR. Nguyễn Tiến Trung chuyển từ BKS sang PTDA theo đúng cột phòng ban trong file, dù chức danh ghi “Phó BKS”; không suy phòng từ chức danh.
6. Ngày sinh đọc từ serial Excel thành ngày UTC. Dữ liệu cũ có lỗi lệch ngày do chuyển múi giờ; chỉ sửa ngày sinh các dòng được HR xác nhận. Không sửa hàng loạt ngày vào làm vì file mới không có cột này.
7. Điện thoại, email, ngày vào làm và các trường không có trong file mới được giữ. `hrSourceFile/hrSnapshotAt/hrNotes` lưu riêng; không thay `externalSystem/externalId/externalSnapshotAt` của nguồn 1Office cũ.

## Hồ sơ cũ không có trong danh sách final

Không có tên trong danh sách chốt không đủ để kết luận lý do nghỉ việc hoặc khóa tài khoản. Sáu hồ sơ ACTIVE chuyển UNKNOWN; một UNKNOWN và một LEFT giữ nguyên.

| Mã ERP | Hồ sơ | Xử lý |
| --- | --- | --- |
| SDG-024 | Lương Thị Anh Đào | Giữ LEFT đã có |
| SDG-033 | Nguyễn Văn Công | UNKNOWN — chờ xác nhận |
| SDG-048 | Nguyễn Văn Dũng | UNKNOWN — chờ xác nhận |
| SDG-050 | Cao Đức Phương | UNKNOWN — chờ xác nhận |
| SDG-055 | Nguyễn Hữu Thuân | UNKNOWN — chờ xác nhận |
| SDG-059 | Đặng Trung Dũng | UNKNOWN — chờ xác nhận |
| SDG-070 | Đào Thị Thu Trang | Giữ UNKNOWN; chưa đủ căn cứ gộp SDG-018 |
| SDG-072 | Lễ tân | UNKNOWN; hồ sơ chung chưa xác định người thật |

## Ghi chú thời hạn

Lưu đủ 6 ghi chú HR: Nguyễn Minh Dương và Vũ Thị Thái Thanh làm hết 31/10/2026; Nguyễn Diệu Loan làm hết 30/11/2026; Dương Hoàng Nam thử việc đến 17/12/2026; Hoàng Văn Hường đến 13/11/2026; Nguyễn Quang Lịch đến 07/11/2026.

Các mốc này ở tương lai tại ngày nhập. Cả 6 người vẫn ACTIVE theo danh sách chốt; chưa có tác vụ tự chuyển trạng thái khi tới hạn. Hết thử việc không đồng nghĩa nghỉ việc. Tài khoản được quản lý riêng.

## Vận hành và kiểm chứng

- Importer: `prisma/import-hr-final-20261026.ts`; parser/mapping: `prisma/hr-final-data.ts`.
- Preview: `npx tsx prisma/import-hr-final-20261026.ts --company-id=1`; nhập bằng thêm `--apply`. Chỉ hỗ trợ đúng snapshot này, bắt buộc khớp SHA256; không dùng để nhập file tháng sau.
- Transaction có khóa ghi và kiểm tra dữ liệu trước nhập. Mỗi hồ sơ thay đổi có audit trước/sau, tên file, dòng nguồn và hash. Marker IMPORT ngăn áp dụng lại cùng snapshot; đã thử chạy lại và không ghi thêm.
- Đã đối chiếu 72/72 dòng theo tên, ngày sinh, chức danh, phòng ban, ghi chú, ngày chốt; kiểm tra giữ nguyên ID/mapping nguồn/liên hệ và toàn bộ tài khoản/quyền/cây phòng ban trong transaction trước commit.
- Backup riêng tư ngoài Git: `/var/folders/6_/4sm1jc0n09vdg5l8gcc9vvt00000gn/T/sdg-hr-final-l3oQt7/` chứa `before.json`, `plan.json`, `verification.json`. Đây là snapshot các bảng liên quan, không phải backup toàn cluster; nằm ở thư mục tạm của máy.
- Kiểm thử ngày Excel lịch sử/múi giờ, chặn ghép trùng tên và mapping ngoại lệ đạt. TypeScript, ESLint phần thay đổi và kiểm tra diff đạt; Prisma không lệch schema. Playwright trực tiếp kiểm tra `/employees` HTTP 200, số người 72, ngày sinh, ghi chú HR, khóa sửa tên nguồn và mobile đều đạt.
- Kiểm tra DB độc lập sau commit: 72 hồ sơ HR, đủ 6 ghi chú, 80 hồ sơ lưu trữ; toàn bộ tài khoản/quyền/đơn vị giống backup. Kết quả lưu trong `post-check.json` cùng thư mục backup.

## Hiệu lực nguồn

Với dữ liệu nhân sự lần này, file HR final ưu tiên hơn export 1Office cũ. Cơ cấu đơn vị vẫn lấy cây 1Office đang có. Chưa có đồng bộ API/webhook; một lần nhập không cam kết dữ liệu luôn mới. Khi có nguồn mới cần xem chênh lệch trước, tránh seed hoặc đồng bộ cũ ghi đè dữ liệu HR đã chốt.

Cần bổ sung về sau: xác nhận 7 hồ sơ UNKNOWN, xác định tài khoản chung thuộc ai nếu cần, và danh sách bộ phận con nếu muốn phân bổ chi tiết hơn cấp phòng ban.
