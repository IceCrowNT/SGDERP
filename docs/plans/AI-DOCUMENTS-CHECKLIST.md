# Kế hoạch hồ sơ thanh toán AI

Cập nhật: **04/11/2026**. **TẠM HOÃN từ 27/10**; chưa tích hợp gọi AI thật.

## Trạng thái hiện tại

- [x] Đã gỡ menu, form thử nghiệm, bộ xuất Word và dependency `docx`; giữ `/ai-documents` là trang thông báo tạm hoãn, yêu cầu đăng nhập.
- [x] Bản thử trước đây chỉ chuẩn bị yêu cầu và xuất Word từ dữ liệu nhập; chưa đọc hóa đơn/gọi API hoặc phát sinh phí AI.
- [x] Lưu mã thử nghiệm ở nhánh cục bộ `archive/ai-documents-20261027`, commit `168109ff0d995b250001b67f1fcf0cc79bdf3b68`; giữ tài liệu đã xuất cục bộ.

## Phương án nếu khởi động lại

Ảnh hóa đơn → trích xuất dữ liệu → người dùng kiểm tra → AI soạn nội dung theo quy tắc/mẫu → xuất Word đề nghị thanh toán và tờ trình.

- [ ] Chốt người/phòng được sử dụng, biểu mẫu chính thức và quyền riêng cho phân hệ.
- [ ] Dùng API key/model cấu hình phía server qua môi trường; không bắt người dùng nhập key trên tab, không truyền bí mật ra trình duyệt.
- [ ] Chốt ngân sách/hạn mức và cách phân bổ theo phòng. Không mặc định tài khoản ChatGPT của phòng cung cấp hạn mức API cho ERP.
- [ ] Khôi phục có chọn lọc từng file cần thiết, đối chiếu nền HR/RBAC hiện hành; không checkout cả nhánh cũ hoặc ghi đè package/lockfile.
- [ ] Xây gọi API, xử lý lỗi/hết hạn mức, xác nhận dữ liệu và xuất DOCX; thiết kế lưu hồ sơ nếu có yêu cầu.
- [ ] Kiểm thử quyền, chi phí, tính đúng của dữ liệu và bố cục Word bằng render trực quan trước pilot.

**Tiêu chí chốt:** người dùng xác nhận dữ liệu hóa đơn; AI không tự bịa số tiền/chứng từ; file Word dùng được, chi phí có giới hạn, thiếu quyền không truy cập được. Sign in with ChatGPT chỉ là hướng nghiên cứu cũ, không phải điều kiện chờ của phương án API.

Tham khảo [Ý tưởng tính năng](../strategy/Y-TUONG-TINH-NANG.md). Khi cần đọc mã cũ dùng `git show archive/ai-documents-20261027:<đường-dẫn>`; chưa tự khôi phục tính năng.
