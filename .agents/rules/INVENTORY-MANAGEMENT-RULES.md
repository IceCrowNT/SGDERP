# QUY TẮC VẬT TƯ TIÊU HAO VÀ PHỤ KIỆN

**Trạng thái: bản đầu đã triển khai.** Phạm vi, DB và tiến độ tại [Plan vật tư](../../docs/plans/INVENTORY-MANAGEMENT-CHECKLIST.md).

- Menu chung Tài sản & vật tư dẫn tới `/asset-management`, ba card hạng mục theo quyền; bên trong dùng breadcrumb quay lại, không lặp ba tab. Ba hạng mục giao diện là Tài sản, Vật tư tiêu hao và Phụ kiện. Tài sản từng chiếc tiếp tục theo [rule tài sản](ASSET-MANAGEMENT-RULES.md); không tạo hồ sơ thiết bị cho từng đơn vị vật tư hoặc tự chuyển dữ liệu cũ.
- Vật tư/phụ kiện dùng mặt hàng theo số lượng; tên bảng bắt buộc `mat_hang_vat_tu`. Loại xác định hạng mục; một mặt hàng một đơn vị cơ sở. Mã mặt hàng ổn định, không nhận diện từng chiếc. Đơn vị tính là nhãn mô tả được sửa theo quyền INVENTORY MANAGE cả khi có giao dịch; lưu audit trước/sau, không quy đổi số lượng. Lịch sử giao dịch hiển thị theo đơn vị hiện tại.
- Tiêu hao cấp ra là xuất dùng; phụ kiện theo dõi đang cấp và thu hồi theo lần cấp gốc. Không ghi tên nhiều người trong ghi chú để thay các khoản đang cấp. Cấp cho người hoặc phòng phải chọn đích rõ ràng, không suy từ cơ cấu hay vị trí.
- Tiêu hao dùng tồn chung theo mặt hàng/công ty, không yêu cầu kho hoặc vị trí; phụ kiện giữ tồn theo nơi giữ. Tồn và số đang cấp lấy từ sổ giao dịch, không sửa trực tiếp số tổng. Giao dịch đã lưu chỉ ghi thêm; sửa sai bằng đảo/điều chỉnh có lý do theo plan. Chặn âm, thu hồi vượt, đảo trùng và ghi lặp do gửi lại.
- Vị trí, phòng ban, nhân sự, tài khoản và audit dùng lại. Không tạo danh mục kho/người/phòng song song hoặc tự gán quyền. Người nghỉ việc vẫn giữ khoản phụ kiện chưa tất toán.
- Quyền INVENTORY độc lập ASSETS/HR/LOCATIONS, phạm vi công ty; phòng quản lý không tự trở thành scope. Options chỉ trả dữ liệu tối thiểu để thao tác, server bảo vệ cả đọc/ghi/số đếm/lịch sử.
- Không xóa lịch sử để ngừng mặt hàng/loại hoặc bỏ liên kết nơi giữ. Ràng buộc với vị trí/phòng và luồng tất toán giữ tại plan; không ghi lại chuẩn kỹ thuật chung vào rule này.
- Bản quyền, mua hàng/duyệt, giá vốn kế toán, lô/hạn dùng, quy đổi đơn vị, import hàng loạt và hình 3D nằm ngoài bản đầu. Công cụ AI vật tư được bổ sung theo đợt 18/11 trong plan AI. Chưa tự tạo thêm cấp nhóm CNTT/Nội thất khi chỉ triển khai ba hạng mục.

- Vật tư trên ticket dùng hồ sơ workflow hiện có: người được giao TASK có WORKFLOW EXECUTE và INVENTORY MANAGE sửa dòng dự kiến; lưu nháp không trừ tồn. Hoàn thành hồ sơ có vật tư cần INVENTORY MANAGE và xuất toàn bộ cùng transaction; thiếu tồn/quyền thì không hoàn thành. Không giữ chỗ, không xuất ở bước trung gian/hủy/từ chối, chống trừ lặp. Chi tiết DB/quyền và sửa sai tại plan.
- VPP hành chính theo định mức/mua theo kỳ hiện chỉ lưu kế hoạch, chưa nhập danh mục hoặc áp dụng luồng tồn IT.

- Trợ lý AI dùng cùng INVENTORY VIEW/MANAGE và action vật tư: tra cứu mặt hàng/tồn/lịch sử/danh mục, lập bản nháp mặt hàng hoặc giao dịch. Người dùng kiểm tra/xác nhận trong form hiện có mới ghi; giữ snapshot tồn, chống lặp, audit và kiểm tra quyền lúc lưu. Không biến lời chat thành phiếu đã ghi. Tiến độ và kiểm chứng tại [plan AI](../../docs/plans/AI-ASSISTANT-CHECKLIST.md#công-cụ-vật-tư-theo-quyền-tài-khoản--18112026).
