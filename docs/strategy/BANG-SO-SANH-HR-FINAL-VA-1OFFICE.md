# Bảng đối chiếu HR final và các export 1Office

> **Quyết định sau đối chiếu — 27/10/2026:** Người phụ trách chốt ưu tiên độ chính xác của file HR final 72 người. Các chênh lệch thông tin nhân sự trong bảng được xử lý theo final; không cần chờ xác nhận lại chỉ vì 1Office cũ ghi khác. Những điểm còn cần làm rõ là liên kết danh tính/tài khoản hoặc thông tin chi tiết final chưa nêu. Bảng bên dưới giữ nguyên bằng chứng hai nguồn để tra cứu.


**Ngày lập:** 27/10/2026. **Phạm vi:** chỉ đọc file trong project, không truy cập 1Office, không sửa DB trong lần đối chiếu này.

Danh sách chuẩn là **72 người**. Không cộng thêm hồ sơ lưu trữ/tài khoản vào số này. Số thứ tự bên dưới là STT của file HR để dễ tìm, không phải mã nhân viên.

## 1. Nguồn so sánh

| Nguồn | Ngày dữ liệu | Phạm vi |
| --- | --- | --- |
| [HR final](../HR_danhsachnhanvien/DS_nhan_su_Sao_Do_26.10.2026.xlsx) | 26/10/2026 | 72 dòng, sheet Danh sach nhan su; dòng Excel = STT + 5. |
| [Hồ sơ 1Office](../HR_danhsachnhanvien/67-ban-ghi-Ho-so-nhan-su-ngay-14102026.xlsx) | 14/10/2026 | 67 hồ sơ; dùng tên/phòng/vị trí/chức vụ/ngày sinh/trạng thái. |
| [Export quản trị 1Office](../1office-sources/README.md) | 21/10/2026 | 56 tài khoản kích hoạt + 11 khóa; 19 nút tổ chức gồm công ty và 18 đơn vị. |

Hai mốc 1Office cũ hơn HR final lần lượt 12 và 5 ngày. Đây là chênh lệch giữa các snapshot, chưa phải kết luận 1Office hiện tại sai. File tài khoản không có cột ngày sinh; đối chiếu ngày sinh dùng file hồ sơ 14/10.

## 2. Tổng quan

| Nội dung | Kết quả | Cách hiểu |
| --- | --- | --- |
| Danh sách chuẩn HR | 72 người | Đây là số nhân sự chuẩn theo file chốt 26/10/2026. |
| Export hồ sơ 1Office | 67 hồ sơ | Ngày 14/10/2026: 66 ghi đang làm, 1 nghỉ; có cả tên chung/trùng, không mặc định là 67 người khác nhau. |
| Ghép có căn cứ | 58 dòng final | 56 tên duy nhất + 1 tên Hàn Quốc đổi cách viết/ngày sinh khớp + 1 trưởng phòng HCNS chọn theo phòng/chức vụ. |
| Đối ứng tạm theo ERP | 1 dòng final | Dương Hoàng Nam ↔ “Nhân viên IT”; cần xác nhận chủ hồ sơ nguồn. |
| Final có, chưa thấy hồ sơ cũ | 13 người | Chưa thấy trong các export đã lưu; không khẳng định thiếu trên hệ thống 1Office đang chạy. |
| Hồ sơ cũ không có đối ứng trong final | 8 hồ sơ | Gồm người đã nghỉ, tên trùng, tên chung và các trường hợp cần xác nhận. |
| Phòng ban khác cấp chính | 1 người | Nguyễn Tiến Trung: BKS ở export cũ, PTDA ở final. |
| Khác mức chi tiết phòng/bộ phận | 30 người | 1Office ghi bộ phận con, final chỉ ghi phòng/ban mẹ. Không coi đây là 30 lỗi chuyển phòng. |
| Ngày sinh | 56 khớp, 3 thiếu ở nguồn cũ | Trong 59 cặp kể cả hồ sơ IT tạm ghép; 13 người còn lại không có hồ sơ cũ để so. Không có cặp có đủ ngày sinh mà khác ngày. |
| Tài khoản trong 72 dòng final | 50 kích hoạt / 8 khóa / 14 chưa thấy | 50 kích hoạt bao gồm 1 tài khoản IT đang tạm ghép. Tài khoản khóa không đồng nghĩa nghỉ việc. |

**Cách đếm:** 72 = 58 ghép có căn cứ + 1 liên kết IT tạm + 13 chưa thấy hồ sơ. Phía cũ: 67 = 58 + 1 + 8. Không được diễn giải 59 cặp đều đã xác minh chắc danh tính.

## 3. Theo phòng ban

Số cũ là tổng hồ sơ, gồm một hồ sơ đã nghỉ ở HCNS. Gộp bộ phận con về phòng/ban mẹ để so cùng cấp. Ban Kiểm soát có parent ID = 0 trong export cơ cấu; vẫn nhận diện là Ban Kiểm soát, không coi là thiếu phòng.

| Phòng/ban | Hồ sơ 1Office 14/10 | Người HR final 26/10 | Chênh lệch | Giải thích |
| --- | --- | --- | --- | --- |
| Ban lãnh đạo | 1 | 3 | +2 | Thêm Trần Văn Thắng, Đặng Thị Bích Liên trong file final. |
| Ban Kiểm soát | 3 | 2 | -1 | Nguyễn Tiến Trung ở PTDA trong file final. |
| Phòng Kinh doanh | 9 | 10 | +1 | Thêm Nguyễn Thị Thanh Thủy trong file final. |
| Phòng Tài chính – Kế toán | 6 | 6 | 0 | Cùng 6 người. |
| Phòng HCNS | 9 | 13 | +4 | Có 5 tên mới so với export; Lương Thị Anh Đào không có trong final. Hồ sơ Lễ tân cũ chưa gắn phòng, không tự ghép với Trần Thị Ngọc Dung. |
| Ban Pháp chế | 2 | 2 | 0 | Cùng 2 người; final thêm ghi chú thời hạn của Vũ Thị Thái Thanh. |
| Phòng Kế hoạch – Đầu tư | 6 | 5 | -1 | Nguyễn Văn Công không có trong final. |
| Phòng Phát triển Dự án | 2 | 3 | +1 | Final xếp Nguyễn Tiến Trung vào đây. |
| Ban QLDA | 27 | 28 | +1 | Thêm 5 tên trong final; 4 hồ sơ cũ không có trong final. |
| Chưa gắn phòng | 2 | 0 | -2 | Hồ sơ Đào Thị Thu Trang thứ hai và Lễ tân. |
| Tổng | 67 | 72 | +5 | Không phải chỉ thêm 5 người: có 13 tên bổ sung và 8 hồ sơ không còn đối ứng, theo liên kết IT tạm. |

## 4. Người có trong final nhưng chưa thấy hồ sơ cũ

Không thấy các tên này trong export hồ sơ; export tài khoản cũng không bổ sung hồ sơ người tương ứng. Chưa đủ căn cứ kết luận họ mới vào công ty.

| STT HR | Họ tên | Phòng/ban | Chức danh HR |
| --- | --- | --- | --- |
| 1 | Trần Văn Thắng | Ban lãnh đạo | Cố vấn CC |
| 2 | Đặng Thị Bích Liên | Ban lãnh đạo | Cố vấn CC |
| 13 | Nguyễn Thị Thanh Thủy | Phòng Kinh doanh | NV BP CSKH |
| 29 | Nguyễn Thế Tuấn | Phòng HCNS | Lái xe |
| 30 | Nguyễn Thị Thúy | Phòng HCNS | NV Hành chính |
| 31 | Phan Quốc Anh | Phòng HCNS | Lái xe |
| 32 | Phạm Thị Thúy Hà | Phòng HCNS | NV cảnh quan |
| 33 | Trần Thị Ngọc Dung | Phòng HCNS | Lễ tân |
| 68 | Tạ Văn Mạnh | Ban QLDA | NV nước |
| 69 | Phạm Văn Đoàn | Ban QLDA | NV nước |
| 70 | Phạm Thị Thụy | Ban QLDA | NV Hành chính |
| 71 | Hoàng Văn Hường | Ban QLDA | Nhân viên vận hành trạm xử lý nước thải |
| 72 | Nguyễn Quang Lịch | Ban QLDA | Nhân viên vận hành trạm xử lý nước thải |

## 5. Hồ sơ cũ không có đối ứng trong final

| Tên trong export | Phòng/bộ phận cũ | Trạng thái hồ sơ 14/10 | Tài khoản 21/10 | Lưu ý |
| --- | --- | --- | --- | --- |
| Lương Thị Anh Đào | PHÒNG HÀNH CHÍNH NHÂN SỰ | Nghỉ việc | daolta: Khóa | Nguồn cũ đã ghi nghỉ việc. |
| Nguyễn Văn Công | PHÒNG KẾ HOẠCH ĐẦU TƯ | Đang làm việc | congnv: Kích hoạt | Không suy nghỉ việc chỉ từ việc vắng trong final. |
| Nguyễn Văn Dũng | Bộ phận giao nhận - Ban QLDA | Đang làm việc | dungnv: Khóa | Không suy nghỉ việc chỉ từ việc vắng trong final. |
| Cao Đức Phương | Bộ phận kỹ thuật - Ban QLDA | Đang làm việc | phuongcd: Kích hoạt | Không suy nghỉ việc chỉ từ việc vắng trong final. |
| Nguyễn Hữu Thuân | Bộ phận điện nước - Ban QLDA | Đang làm việc | thuannh: Khóa | Không suy nghỉ việc chỉ từ việc vắng trong final. |
| Đặng Trung Dũng | Bộ phận văn phòng - Ban QLDA | Đang làm việc | dungdt: Kích hoạt | Không suy nghỉ việc chỉ từ việc vắng trong final. |
| Đào Thị Thu Trang | Chưa gắn | Đang làm việc | trangdtt2: Kích hoạt | Hồ sơ thứ hai; không phải dòng trưởng phòng đã ghép. |
| Lễ tân | Chưa gắn | Đang làm việc | letan: Kích hoạt | Tên chung, chưa xác định chủ sở hữu. |

## 6. Những khác biệt cần xem trực tiếp

| Người | 1Office lưu trong file | HR final | Nhận xét |
| --- | --- | --- | --- |
| Nguyễn Tiến Trung | Ban Kiểm soát; Phó ban kiểm soát | Phòng Phát triển Dự án; Phó BKS | Dùng PTDA theo final. Nếu cần quản lý kiêm nhiệm thì bổ sung xác nhận riêng; không suy phòng từ chức danh. |
| Nguyễn Đức Hậu | Nhân viên nước; Bộ phận điện nước – Ban QLDA | Lái xe BQLDA; Ban QLDA | Khác nội dung công việc. |
| Trần Thị Tố Loan | Trưởng phòng Kinh doanh | TP Kinh doanh kiêm PTGĐ | Final nêu thêm vai trò PTGĐ; không tự cấp role đăng nhập từ chức danh. |
| Nguyễn Thành Phương | Tổng giám đốc | TGĐ/TV HĐQT | Final nêu thêm vai trò thành viên HĐQT. |
| YOON JOON SUN | Joonsun Yoon; Nhân viên Sales Marketing | YOON JOON SUN; Chuyên gia Phụ trách KD khu vực Hàn Quốc | Khác cách viết tên và chức danh; ngày sinh khớp 29/06/1973. |
| Dương Hoàng Nam | Tên hồ sơ: Nhân viên IT; thiếu ngày sinh | Tên thật, ngày sinh và thời hạn thử việc | Liên kết ERP có sẵn là giả định cần xác nhận, không phải bằng chứng định danh từ file gốc. |
| Đào Thị Thu Trang | Hai hồ sơ cùng tên; một trưởng phòng HCNS, một không có phòng/vị trí | Một người: trưởng phòng HCNS | Đối chiếu với hồ sơ trưởng phòng; không kết luận hai hồ sơ là hai người hay tự gộp tài khoản. |
| Trần Thị Ngọc Dung | Không có tên này; có hồ sơ chung “Lễ tân” | Lễ tân – HCNS | Không đủ bằng chứng để gán hồ sơ/tài khoản chung cho người này. |
| Phạm Văn Được | Nhân viên Văn phòng | NV Hành chính | Khác cách mô tả; chưa đủ căn cứ nói đổi nhiệm vụ. |

Các chữ viết tắt như “NV”, “KTT”, “TBP”, “Phó BKS” khác chuỗi ký tự nhưng thường cùng nghĩa với mô tả đầy đủ. Không dùng số chuỗi khác nhau làm số thay đổi chức vụ. 1Office tách “Vị trí” và “Chức vụ”; HR final gộp thành “Chức danh”, nên cần xem cả hai cột nguồn.

## 7. Ngày sinh và thời hạn

- 56 cặp có ngày sinh ở cả hai file: **khớp toàn bộ**. Không có sai lệch ngày sinh trong nhóm này.
- Nguồn cũ thiếu ngày sinh: Trần Thị Tố Loan, Đào Thị Thu Trang (trưởng phòng HCNS), hồ sơ “Nhân viên IT” tạm liên kết Dương Hoàng Nam. File final đã bổ sung.
- 13 người chưa có đối ứng nguồn cũ: không so được ngày sinh.
- Lệch một ngày từng ghi nhận ở DB ERP là lỗi nhập/chuyển múi giờ trước đây, **không phải lỗi của file 1Office**.

| Người | Ghi chú final | Cột ghi chú nguồn cũ |
| --- | --- | --- |
| Nguyễn Minh Dương | Làm hết 31/10/2026 | Trống |
| Dương Hoàng Nam | Thử việc đến 17/12/2026 | Trống |
| Vũ Thị Thái Thanh | Làm hết 31/10/2026 | Trống |
| Nguyễn Diệu Loan | Làm hết 30/11/2026 | Trống |
| Hoàng Văn Hường | Thử việc đến 13/11/2026 | Chưa có hồ sơ đối ứng |
| Nguyễn Quang Lịch | Thử việc đến 07/11/2026 | Chưa có hồ sơ đối ứng |

Chỉ đối chiếu cột ghi chú cho các mốc này; không khẳng định mọi module 1Office đều chưa lưu thông tin thời hạn. Hết thử việc không đồng nghĩa nghỉ việc.

## 8. Tài khoản — tách khỏi số người

| Trong 72 dòng final | Số lượng | Ý nghĩa |
| --- | --- | --- |
| Ghép tài khoản kích hoạt | 50 | 49 cặp có căn cứ + 1 tài khoản IT tạm ghép. |
| Ghép tài khoản khóa | 8 | Vẫn có trong final. Không dùng trạng thái khóa làm trạng thái nghỉ việc. |
| Chưa tìm thấy tài khoản tương ứng | 14 | 13 tên chưa có hồ sơ cũ + Vũ Văn Khoa (có hồ sơ nhưng không thấy tài khoản). |

| Người có trong final | Tài khoản 21/10 |
| --- | --- |
| Nguyễn Văn Thịnh | Khóa |
| Trần Văn Tư | Khóa |
| Phạm Hải Ninh | Khóa |
| Nguyễn Xuân Hiếu | Khóa |
| Trần Văn Toàn | Khóa |
| Vũ Duy Doanh | Khóa |
| Phạm Văn Hiệp | Khóa |
| Nguyễn Đức Hậu | Khóa |

Tổng export quản trị: 56 kích hoạt + 11 khóa = 67 tài khoản. Có 1 tài khoản Admin không đối ứng trong file 67 hồ sơ. Trong 8 hồ sơ cũ vắng ở final: 5 tài khoản kích hoạt + 3 khóa. Vì vậy không thể lấy tổng tài khoản làm số người.

## 9. Đối chiếu đầy đủ 72 dòng

“Chưa thấy TK” chỉ có nghĩa chưa tìm được trong hai export tài khoản đã lưu. Tên/phòng/chức danh dưới đây giữ nguyên cách ghi nguồn, không lấy dữ liệu ERP đã sửa để giả làm dữ liệu 1Office.

| STT HR | Tên HR | Tên nguồn cũ | Phòng HR | Phòng 1Office | Phân loại | Tài khoản 21/10 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Trần Văn Thắng | — | Ban lãnh đạo | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 2 | Đặng Thị Bích Liên | — | Ban lãnh đạo | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 3 | Vũ Văn Khoa | Vũ Văn Khoa | Ban Kiểm soát | BAN KIỂM SOÁT | Khớp tên duy nhất; Cùng phòng cấp chính | Chưa thấy TK |
| 4 | Trần Triệu Tuấn | Trần Triệu Tuấn | Ban Kiểm soát | BAN KIỂM SOÁT | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 5 | Nguyễn Thành Phương | Nguyễn Thành Phương | Ban lãnh đạo | BAN LÃNH ĐẠO | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 6 | Trần Thị Tố Loan | Trần Thị Tố Loan | Phòng Kinh doanh | PHÒNG KINH DOANH | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 7 | Nguyễn Phi Hùng | Nguyễn Phi Hùng | Phòng Kinh doanh | Bộ phận CSKH - Phòng Kinh Doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 8 | Vũ Tú Anh | Vũ Tú Anh | Phòng Kinh doanh | Bộ phận Sales Marketing - Phòng Kinh doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 9 | Nguyễn Đình Bách | Nguyễn Đình Bách | Phòng Kinh doanh | Bộ phận Sales Marketing - Phòng Kinh doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 10 | Lại Tố Nga | Lại Tố Nga | Phòng Kinh doanh | Bộ phận Sales Marketing - Phòng Kinh doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 11 | Nguyễn Thị Lan Anh | Nguyễn Thị Lan Anh | Phòng Kinh doanh | Bộ phận Sales Marketing - Phòng Kinh doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 12 | Lê Thị Thanh Huyền | Lê Thị Thanh Huyền | Phòng Kinh doanh | Bộ phận CSKH - Phòng Kinh Doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 13 | Nguyễn Thị Thanh Thủy | — | Phòng Kinh doanh | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 14 | Đào Thị Thảo Hiền | Đào Thị Thảo Hiền | Phòng Kinh doanh | Bộ phận CSKH - Phòng Kinh Doanh | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 15 | YOON JOON SUN | Joonsun Yoon | Phòng Kinh doanh | Bộ phận Sales Marketing - Phòng Kinh doanh | Tên khác, ngày sinh khớp; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 16 | Phạm Thị Kim Loan | Phạm Thị Kim Loan | Phòng Tài chính – Kế toán | PHÒNG TÀI CHÍNH - KẾ TOÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 17 | Mạc Thị Lê Dung | Mạc Thị Lê Dung | Phòng Tài chính – Kế toán | PHÒNG TÀI CHÍNH - KẾ TOÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 18 | Nguyễn Thu Minh | Nguyễn Thu Minh | Phòng Tài chính – Kế toán | PHÒNG TÀI CHÍNH - KẾ TOÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 19 | Trần Thị Thu Hoài | Trần Thị Thu Hoài | Phòng Tài chính – Kế toán | PHÒNG TÀI CHÍNH - KẾ TOÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 20 | Nguyễn Diệu Linh | Nguyễn Diệu Linh | Phòng Tài chính – Kế toán | PHÒNG TÀI CHÍNH - KẾ TOÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 21 | Phạm Thị Hương | Phạm Thị Hương | Phòng Tài chính – Kế toán | PHÒNG TÀI CHÍNH - KẾ TOÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 22 | Đào Thị Thu Trang | Đào Thị Thu Trang | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên/phòng/chức vụ; Cùng phòng cấp chính | Kích hoạt |
| 23 | Nguyễn Thị Minh | Nguyễn Thị Minh | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 24 | Nguyễn Minh Dương | Nguyễn Minh Dương | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 25 | Nguyễn Hùng Cường | Nguyễn Hùng Cường | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 26 | Vũ Hoài Nam | Vũ Hoài Nam | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 27 | Dương Ngọc Cường | Dương Ngọc Cường | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 28 | Trịnh Văn Hòa | Trịnh Văn Hòa | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 29 | Nguyễn Thế Tuấn | — | Phòng HCNS | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 30 | Nguyễn Thị Thúy | — | Phòng HCNS | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 31 | Phan Quốc Anh | — | Phòng HCNS | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 32 | Phạm Thị Thúy Hà | — | Phòng HCNS | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 33 | Trần Thị Ngọc Dung | — | Phòng HCNS | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 34 | Dương Hoàng Nam | Nhân viên IT | Phòng HCNS | PHÒNG HÀNH CHÍNH NHÂN SỰ | Mapping ERP cần xác nhận; Cùng phòng cấp chính | Kích hoạt |
| 35 | Vũ Trọng Toàn | Vũ Trọng Toàn | Ban Pháp chế | BAN PHÁP CHẾ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 36 | Vũ Thị Thái Thanh | Vũ Thị Thái Thanh | Ban Pháp chế | BAN PHÁP CHẾ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 37 | Trần Bảo Nam | Trần Bảo Nam | Phòng Kế hoạch – Đầu tư | PHÒNG KẾ HOẠCH ĐẦU TƯ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 38 | Phạm Đức Toàn | Phạm Đức Toàn | Phòng Kế hoạch – Đầu tư | PHÒNG KẾ HOẠCH ĐẦU TƯ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 39 | Nguyễn Ngọc Huy | Nguyễn Ngọc Huy | Phòng Kế hoạch – Đầu tư | PHÒNG KẾ HOẠCH ĐẦU TƯ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 40 | Phan Duy Chiến | Phan Duy Chiến | Phòng Kế hoạch – Đầu tư | PHÒNG KẾ HOẠCH ĐẦU TƯ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 41 | Phạm Đình Tuân | Phạm Đình Tuân | Phòng Kế hoạch – Đầu tư | PHÒNG KẾ HOẠCH ĐẦU TƯ | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 42 | Nguyễn Ngọc Tú | Nguyễn Ngọc Tú | Phòng Phát triển Dự án | PHÒNG PHÁT TRIỂN DỰ ÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 43 | Nguyễn Tiến Trung | Nguyễn Tiến Trung | Phòng Phát triển Dự án | BAN KIỂM SOÁT | Khớp tên duy nhất; Khác phòng cấp chính | Kích hoạt |
| 44 | Phạm Thị Thu Trang | Phạm Thị Thu Trang | Phòng Phát triển Dự án | PHÒNG PHÁT TRIỂN DỰ ÁN | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 45 | Lương Xuân Đam | Lương Xuân Đam | Ban QLDA | BAN QLDA KCN NAM ĐÌNH VŨ 1 | Khớp tên duy nhất; Cùng phòng cấp chính | Kích hoạt |
| 46 | Phạm Tiến Huy | Phạm Tiến Huy | Ban QLDA | Ban giám đốc KCN NAM ĐÌNH VŨ 1 | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 47 | Lê Đức Thiện | Lê Đức Thiện | Ban QLDA | Ban giám đốc KCN NAM ĐÌNH VŨ 1 | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 48 | Nguyễn Văn Cung | Nguyễn Văn Cung | Ban QLDA | Bộ phận điện nước - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 49 | Bùi Quang Tuyến | Bùi Quang Tuyến | Ban QLDA | Bộ phận cảnh quan môi trường - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 50 | Nguyễn Văn Dương | Nguyễn Văn Dương | Ban QLDA | Bộ phận kỹ thuật - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 51 | Hoàng Đức Lâm | Hoàng Đức Lâm | Ban QLDA | Bộ phận kỹ thuật - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 52 | Phạm Văn Được | Phạm Văn Được | Ban QLDA | Bộ phận văn phòng - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 53 | Nguyễn Văn Thịnh | Nguyễn Văn Thịnh | Ban QLDA | Bộ phận PCCC - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 54 | Trần Văn Tư | Trần Văn Tư | Ban QLDA | Bộ phận điện nước - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 55 | Nguyễn Diệu Loan | Nguyễn Diệu Loan | Ban QLDA | Bộ phận cảnh quan môi trường - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 56 | Hoàng Thị Thảo | Hoàng Thị Thảo | Ban QLDA | Bộ phận cảnh quan môi trường - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 57 | Trần Thị Vân Thủy | Trần Thị Vân Thủy | Ban QLDA | Ban giám đốc KCN NAM ĐÌNH VŨ 1 | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 58 | Lê Gia Thịnh | Lê Gia Thịnh | Ban QLDA | Ban giám đốc KCN NAM ĐÌNH VŨ 1 | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 59 | Vũ Văn Hậu | Vũ Văn Hậu | Ban QLDA | Bộ phận điện nước - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 60 | Phạm Quang Bằng | Phạm Quang Bằng | Ban QLDA | Bộ phận kỹ thuật - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 61 | Đào Ngọc Duy Anh | Đào Ngọc Duy Anh | Ban QLDA | Bộ phận điện nước - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Kích hoạt |
| 62 | Phạm Hải Ninh | Phạm Hải Ninh | Ban QLDA | Bộ phận điện nước - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 63 | Nguyễn Xuân Hiếu | Nguyễn Xuân Hiếu | Ban QLDA | Bộ phận giao nhận - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 64 | Trần Văn Toàn | Trần Văn Toàn | Ban QLDA | Bộ phận giao nhận - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 65 | Vũ Duy Doanh | Vũ Duy Doanh | Ban QLDA | Bộ phận giao nhận - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 66 | Phạm Văn Hiệp | Phạm Văn Hiệp | Ban QLDA | Bộ phận giao nhận - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 67 | Nguyễn Đức Hậu | Nguyễn Đức Hậu | Ban QLDA | Bộ phận điện nước - Ban QLDA | Khớp tên duy nhất; Cùng phòng, 1Office chi tiết bộ phận | Khóa |
| 68 | Tạ Văn Mạnh | — | Ban QLDA | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 69 | Phạm Văn Đoàn | — | Ban QLDA | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 70 | Phạm Thị Thụy | — | Ban QLDA | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 71 | Hoàng Văn Hường | — | Ban QLDA | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |
| 72 | Nguyễn Quang Lịch | — | Ban QLDA | — | Chưa thấy hồ sơ; Không có hồ sơ | Chưa thấy TK |

### Chi tiết chức danh/ngày sinh theo từng dòng

| STT HR | Họ tên | Vị trí 1Office | Chức vụ 1Office | Chức danh HR | Ngày sinh đối chiếu | Dòng Excel hồ sơ cũ |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Trần Văn Thắng | — | — | Cố vấn CC | Không có hồ sơ | — |
| 2 | Đặng Thị Bích Liên | — | — | Cố vấn CC | Không có hồ sơ | — |
| 3 | Vũ Văn Khoa | Thành viên ban kiểm soát | Nhân viên | TV BKS | Khớp | 64 |
| 4 | Trần Triệu Tuấn | Thành viên ban kiểm soát | Nhân viên | TV BKS | Khớp | 61 |
| 5 | Nguyễn Thành Phương | Tổng giám đốc | Tổng giám đốc | TGĐ/TV HĐQT | Khớp | 2 |
| 6 | Trần Thị Tố Loan | Trưởng phòng Kinh doanh | Trưởng phòng | TP Kinh doanh kiêm PTGĐ | 1Office thiếu ngày sinh | 12 |
| 7 | Nguyễn Phi Hùng | Trưởng bộ phận CSKH | Trưởng bộ phận | TBP.CSKH | Khớp | 23 |
| 8 | Vũ Tú Anh | Nhân viên Sales Marketing | Nhân viên | NVBP Sales & Marketing | Khớp | 34 |
| 9 | Nguyễn Đình Bách | Nhân viên Sales Marketing | Nhân viên | NVBP Sales & Marketing | Khớp | 55 |
| 10 | Lại Tố Nga | Nhân viên Sales Marketing | Nhân viên | NVBP Sales & Marketing | Khớp | 62 |
| 11 | Nguyễn Thị Lan Anh | Nhân viên Sales Marketing | Nhân viên | NVBP Sales & Marketing | Khớp | 67 |
| 12 | Lê Thị Thanh Huyền | Nhân viên Chăm sóc Khách hàng | Nhân viên | NV BP CSKH | Khớp | 68 |
| 13 | Nguyễn Thị Thanh Thủy | — | — | NV BP CSKH | Không có hồ sơ | — |
| 14 | Đào Thị Thảo Hiền | Nhân viên Chăm sóc Khách hàng | Nhân viên | NV BP CSKH | Khớp | 45 |
| 15 | YOON JOON SUN | Nhân viên Sales Marketing | Nhân viên | Chuyên gia Phụ trách KD khu vực Hàn Quốc | Khớp | 3 |
| 16 | Phạm Thị Kim Loan | Trưởng phòng Tài chính - Kế toán | Trưởng phòng | Trưởng Phòng Tài chính Kế toán | Khớp | 4 |
| 17 | Mạc Thị Lê Dung | Kế toán trưởng | Kế toán trưởng | KTT | Khớp | 5 |
| 18 | Nguyễn Thu Minh | Kế toán tổng hợp | Nhân viên | Kế toán tổng hợp | Khớp | 7 |
| 19 | Trần Thị Thu Hoài | Kế toán | Nhân viên | Kế toán | Khớp | 6 |
| 20 | Nguyễn Diệu Linh | Kế toán | Nhân viên | Kế toán | Khớp | 8 |
| 21 | Phạm Thị Hương | Thủ quỹ | Nhân viên | Thủ quỹ | Khớp | 9 |
| 22 | Đào Thị Thu Trang | Trưởng phòng Hành chính nhân sự | Trưởng phòng | Trưởng phòng Hành chính Nhân sự | 1Office thiếu ngày sinh | 10 |
| 23 | Nguyễn Thị Minh | Nhân viên Hành chính | Nhân viên | NV HC | Khớp | 11 |
| 24 | Nguyễn Minh Dương | Nhân viên IT | Nhân viên | NV IT | Khớp | 15 |
| 25 | Nguyễn Hùng Cường | Lái xe | Nhân viên | Lái xe | Khớp | 13 |
| 26 | Vũ Hoài Nam | Lái xe | Nhân viên | Lái xe | Khớp | 14 |
| 27 | Dương Ngọc Cường | Lái xe | Nhân viên | Lái xe | Khớp | 16 |
| 28 | Trịnh Văn Hòa | Lái xe | Nhân viên | Lái xe | Khớp | 18 |
| 29 | Nguyễn Thế Tuấn | — | — | Lái xe | Không có hồ sơ | — |
| 30 | Nguyễn Thị Thúy | — | — | NV Hành chính | Không có hồ sơ | — |
| 31 | Phan Quốc Anh | — | — | Lái xe | Không có hồ sơ | — |
| 32 | Phạm Thị Thúy Hà | — | — | NV cảnh quan | Không có hồ sơ | — |
| 33 | Trần Thị Ngọc Dung | — | — | Lễ tân | Không có hồ sơ | — |
| 34 | Dương Hoàng Nam | Nhân viên IT | — | Nhân viên IT | 1Office thiếu ngày sinh | 66 |
| 35 | Vũ Trọng Toàn | Trưởng ban  Pháp chế | Trưởng phòng | Trưởng ban PC | Khớp | 19 |
| 36 | Vũ Thị Thái Thanh | Nhân viên Pháp chế | Nhân viên | NV PC | Khớp | 20 |
| 37 | Trần Bảo Nam | Trưởng phòng Kế hoạch đầu tư | Trưởng phòng | Trưởng phòng Kế hoạch Đầu tư | Khớp | 21 |
| 38 | Phạm Đức Toàn | Phó phòng Kế hoạch đầu tư | Phó phòng | Phó phòng KHĐT | Khớp | 22 |
| 39 | Nguyễn Ngọc Huy | Nhân viên KHDT | Nhân viên | NV P.KHĐT | Khớp | 24 |
| 40 | Phan Duy Chiến | Nhân viên KHDT | Nhân viên | NV P.KHĐT | Khớp | 25 |
| 41 | Phạm Đình Tuân | Nhân viên KHDT | Nhân viên | NV P.KHĐT | Khớp | 26 |
| 42 | Nguyễn Ngọc Tú | Trưởng phòng Phát triển dự án | Trưởng phòng | Trưởng phòng Phát triển Dự án | Khớp | 28 |
| 43 | Nguyễn Tiến Trung | Phó ban kiểm soát | Phó ban | Phó BKS | Khớp | 60 |
| 44 | Phạm Thị Thu Trang | Nhân viên Phát triển dự án | Nhân viên | NV P.PTDA | Khớp | 29 |
| 45 | Lương Xuân Đam | Giám đốc Ban | Giám đốc ban | GĐ Ban QLDA | Khớp | 30 |
| 46 | Phạm Tiến Huy | Phó GĐ Ban | Phó giám đốc ban | Phó GĐ Ban QLDA | Khớp | 33 |
| 47 | Lê Đức Thiện | Phó GĐ Ban | Phó giám đốc ban | Phó GĐ Ban QLDA | Khớp | 35 |
| 48 | Nguyễn Văn Cung | Phó bộ phận điện nước | Phó bộ phận | Phó BP điện nước | Khớp | 52 |
| 49 | Bùi Quang Tuyến | Nhân viên cảnh quan | Nhân viên | NV cảnh quan | Khớp | 38 |
| 50 | Nguyễn Văn Dương | Nhân viên kỹ thuật | Nhân viên | NV Kỹ thuật | Khớp | 49 |
| 51 | Hoàng Đức Lâm | Nhân viên kỹ thuật | Nhân viên | NV Kỹ thuật | Khớp | 37 |
| 52 | Phạm Văn Được | Nhân viên Văn phòng | Nhân viên | NV Hành chính | Khớp | 36 |
| 53 | Nguyễn Văn Thịnh | Nhân viên Phòng cháy chữa cháy | Nhân viên | NV PCCC | Khớp | 53 |
| 54 | Trần Văn Tư | Nhân viên nước | Nhân viên | NV nước | Khớp | 48 |
| 55 | Nguyễn Diệu Loan | Nhân viên Môi trường | Nhân viên | NV MT | Khớp | 56 |
| 56 | Hoàng Thị Thảo | Nhân viên cảnh quan | Nhân viên | NV cảnh quan | Khớp | 58 |
| 57 | Trần Thị Vân Thủy | Phó GĐ Ban | Phó giám đốc ban | Phó GĐ Ban QLDA | Khớp | 31 |
| 58 | Lê Gia Thịnh | Phó GĐ Ban | Phó giám đốc ban | Phó GĐ Ban | Khớp | 32 |
| 59 | Vũ Văn Hậu | Trưởng bộ phận điện nước | Trưởng bộ phận | TBP điện nước | Khớp | 47 |
| 60 | Phạm Quang Bằng | Nhân viên Trắc đạc | Nhân viên | NV trắc đạc | Khớp | 44 |
| 61 | Đào Ngọc Duy Anh | Nhân viên Điện | Nhân viên | NV điện | Khớp | 59 |
| 62 | Phạm Hải Ninh | Nhân viên nước | Nhân viên | NV nước | Khớp | 50 |
| 63 | Nguyễn Xuân Hiếu | Tổ trưởng Giao nhận | Trưởng bộ phận | Tổ trưởng GN | Khớp | 39 |
| 64 | Trần Văn Toàn | Nhân viên Giao nhận | Nhân viên | NV giao nhận | Khớp | 40 |
| 65 | Vũ Duy Doanh | Nhân viên Giao nhận | Nhân viên | NV giao nhận | Khớp | 41 |
| 66 | Phạm Văn Hiệp | Nhân viên Giao nhận | Nhân viên | NV giao nhận | Khớp | 42 |
| 67 | Nguyễn Đức Hậu | Nhân viên nước | Nhân viên | Lái xe BQLDA | Khớp | 57 |
| 68 | Tạ Văn Mạnh | — | — | NV nước | Không có hồ sơ | — |
| 69 | Phạm Văn Đoàn | — | — | NV nước | Không có hồ sơ | — |
| 70 | Phạm Thị Thụy | — | — | NV Hành chính | Không có hồ sơ | — |
| 71 | Hoàng Văn Hường | — | — | Nhân viên vận hành trạm xử lý nước thải | Không có hồ sơ | — |
| 72 | Nguyễn Quang Lịch | — | — | Nhân viên vận hành trạm xử lý nước thải | Không có hồ sơ | — |

## 10. Thứ tự xác nhận đề nghị

1. Chốt hồ sơ “Nhân viên IT” có đúng là Dương Hoàng Nam; xác định hồ sơ Đào Thị Thu Trang thứ hai và chủ tài khoản Lễ tân.
2. Áp dụng phòng ban/chức danh theo final: Nguyễn Tiến Trung thuộc PTDA; các chức danh ở bảng 6 lấy cột HR. Chỉ hỏi thêm nếu cần quản lý chi tiết kiêm nhiệm chưa được file nêu.
3. Dùng 72 dòng HR làm chuẩn người hiện tại; khi có export mới, kiểm tra lại 13 tên chưa thấy và 8 hồ sơ không có đối ứng.
4. Giữ thông tin bộ phận con của 1Office như dữ liệu chi tiết chờ xác nhận; không coi 30 trường hợp khác cấp là 30 lỗi.
5. Không đồng bộ quyền hoặc khóa tài khoản theo danh sách nhân sự. Công ty không cần tự đặt mã người; định danh kỹ thuật và các trường hợp ghép mơ hồ được xử lý riêng.
