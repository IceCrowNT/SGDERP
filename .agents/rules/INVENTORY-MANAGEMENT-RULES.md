# QUY TẮC VẬT TƯ TIÊU HAO VÀ PHỤ KIỆN

**Trạng thái: bản đầu đã triển khai.** Phạm vi, DB và tiến độ tại [Plan vật tư](../../docs/plans/INVENTORY-MANAGEMENT-CHECKLIST.md).

- Ba hạng mục giao diện là Tài sản, Vật tư tiêu hao và Phụ kiện. Tài sản từng chiếc tiếp tục theo [rule tài sản](ASSET-MANAGEMENT-RULES.md); không tạo hồ sơ thiết bị cho từng đơn vị vật tư hoặc tự chuyển dữ liệu cũ.
- Vật tư/phụ kiện dùng mặt hàng theo số lượng; tên bảng bắt buộc `mat_hang_vat_tu`. Loại xác định hạng mục; một mặt hàng một đơn vị cơ sở. Mã mặt hàng ổn định, không nhận diện từng chiếc.
- Tiêu hao cấp ra là xuất dùng; phụ kiện theo dõi đang cấp và thu hồi theo lần cấp gốc. Không ghi tên nhiều người trong ghi chú để thay các khoản đang cấp. Cấp cho người hoặc phòng phải chọn đích rõ ràng, không suy từ cơ cấu hay vị trí.
- Tồn theo nơi giữ và số đang cấp lấy từ sổ giao dịch, không sửa trực tiếp số tổng. Giao dịch đã lưu chỉ ghi thêm; sửa sai bằng đảo/điều chỉnh có lý do theo plan. Chặn âm, thu hồi vượt, đảo trùng và ghi lặp do gửi lại.
- Vị trí, phòng ban, nhân sự, tài khoản và audit dùng lại. Không tạo danh mục kho/người/phòng song song hoặc tự gán quyền. Người nghỉ việc vẫn giữ khoản phụ kiện chưa tất toán.
- Quyền INVENTORY độc lập ASSETS/HR/LOCATIONS, phạm vi công ty; phòng quản lý không tự trở thành scope. Options chỉ trả dữ liệu tối thiểu để thao tác, server bảo vệ cả đọc/ghi/số đếm/lịch sử.
- Không xóa lịch sử để ngừng mặt hàng/loại hoặc bỏ liên kết nơi giữ. Ràng buộc với vị trí/phòng và luồng tất toán giữ tại plan; không ghi lại chuẩn kỹ thuật chung vào rule này.
- Bản quyền, mua hàng/duyệt, giá vốn kế toán, lô/hạn dùng, quy đổi đơn vị, import hàng loạt, hình 3D và công cụ AI cho vật tư nằm ngoài bản đầu. Chưa tự tạo thêm cấp nhóm CNTT/Nội thất khi chỉ triển khai ba hạng mục.
