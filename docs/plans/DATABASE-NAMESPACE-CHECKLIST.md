# Phân nhóm bảng PostgreSQL theo namespace

Cập nhật: **25/11/2026**. Trạng thái: **đã triển khai và kiểm chứng kỹ thuật**.
Đây là kế hoạch tổ chức DB liên phân hệ; không tạo tính năng ERP hay cơ chế phân quyền mới.
Mục lục: [A. Yêu cầu](#a-đặc-tả-yêu-cầu) · [B. Kỹ thuật](#b-thiết-kế-kỹ-thuật).

## A. Đặc tả yêu cầu

Nhóm bảng theo phân hệ ngay trong PostgreSQL để tìm dễ hơn khi quản trị trên Mac, Windows hoặc VPS. Giữ tên bảng, dữ liệu và các liên kết. Dùng tài khoản DB hiện hành cho tất cả nhóm; không thêm tài khoản kỹ thuật hay phân quyền DB theo nhóm. Quyền ERP không đổi.

Công cụ quản trị có hỗ trợ schema (ví dụ DBeaver) sẽ hiển thị các nhóm. Đã kiểm tra Prisma Studio 6.19.3 tại cổng 5555: vẫn hiển thị danh sách model theo tên, không có cây thư mục namespace. Muốn xem các nhóm trực quan, dùng công cụ có cây schema như DBeaver; không cần đổi dữ liệu lần nữa.

| Tiêu chí | Kết quả cần đạt |
| --- | --- |
| N1 | 34 bảng nghiệp vụ nằm đúng 9 nhóm, tên bảng/cột giữ nguyên |
| N2 | Dữ liệu, ID, FK, index, check và trigger được giữ |
| N3 | Prisma, SQL trực tiếp, cấp mã và nghiệp vụ vẫn chạy |
| N4 | Có backup đã thử phục hồi; migration chạy được từ DB hiện hữu và từ chuỗi migration |

## B. Thiết kế kỹ thuật

### Thiết kế DB cần giữ

| Namespace | Số bảng | Bảng |
| --- | ---: | --- |
| `chung` | 5 | `cong_ty`, `phong_ban`, `nhan_su`, `tai_khoan`, `vi_tri` |
| `phan_quyen` | 4 | `vai_tro`, `quyen`, `vai_tro_quyen`, `tai_khoan_vai_tro` |
| `he_thong` | 1 | `nhat_ky_hoat_dong` |
| `ai` | 7 | `ket_noi_ai`, `cau_hinh_tac_vu_ai`, `nhat_ky_goi_ai`, `hoi_thoai_ai`, `tin_nhan_ai`, `tep_dinh_kem_ai`, `cong_viec_ai` |
| `cong_viec` | 4 | `cong_viec_ho_tro`, `lich_su_cong_viec`, `tep_cong_viec`, `thong_bao_cong_viec` |
| `quy_trinh` | 5 | `mau_quy_trinh`, `buoc_mau_quy_trinh`, `ho_so_quy_trinh`, `buoc_xu_ly_quy_trinh`, `lich_su_quy_trinh` |
| `tai_san` | 2 | `loai_tai_san`, `tai_san` |
| `vat_tu` | 4 | `loai_vat_tu`, `mat_hang_vat_tu`, `giao_dich_vat_tu`, `dong_vat_tu_quy_trinh` |
| `khong_gian_3d` | 2 | `lien_ket_phong_3d`, `vat_the_3d` |

Các quan hệ vẫn là FK hiện có giữa các bảng, kể cả khi khác namespace. Ví dụ `tai_san.tai_san.nguoi_su_dung_id` → `chung.nhan_su.id`; không thêm bảng nối, không đổi nullable/hành vi xóa. Sơ đồ và cột từng phân hệ tiếp tục theo [từ điển DB](../DATABASE-DICTIONARY.md).

- Prisma v6 dùng `datasource.schemas` và `@@schema` trên model/enum; API `db.nhan_su`, `db.tai_san` giữ nguyên.
- Migration `20261125120000_nhom_bang_theo_namespace`: `ALTER TABLE/TYPE SET SCHEMA` trong transaction, giới hạn chờ khóa 10 giây; không drop/create bảng. Enum theo nhóm sở hữu.
- Sequence thuộc cột tự đi cùng bảng. Sequence mã nghiệp vụ độc lập, 34 hàm SQL/trigger và `_prisma_migrations` giữ tại `public`. Hàm hiện hữu có `search_path` cố định tại cấp hàm để tìm đúng bảng/enum sau di chuyển; không thay search_path của tài khoản/database.
- SQL trực tiếp dùng tên đủ `namespace.bang`. Migration mới và hàm mới cần tham chiếu namespace tương ứng; không sửa migration cũ. Backup/restore phải gồm toàn DB, không giới hạn `--schema=public`.
- Không thay thông tin kết nối, dependency, quyền ứng dụng hoặc cấp quyền DB mới. Không có luồng upload/chia sẻ tệp trong thay đổi này. Backup chứa dữ liệu nội bộ chỉ giữ ở `outputs/` ngoài Git.
- Triển khai: backup → khôi phục DB tạm → migrate/đối chiếu/kiểm thử → backup mới → migrate DB đang dùng → generate client và khởi động lại web/Studio. Khi migration chưa commit mà lỗi, transaction rollback. Phục hồi sau triển khai cần đồng thời khôi phục DB và code trước chuyển nhóm, không chạy reset.

### Tiến độ và kiểm chứng

- [x] Kiểm kê 34 bảng/16 enum/34 hàm và SQL gọi trực tiếp.
- [x] Sao lưu và khôi phục vào DB thử riêng.
- [x] Viết migration bảo toàn dữ liệu, cập nhật Prisma/SQL trực tiếp.
- [x] Prisma validate/generate và diff DB thử đạt, diff rỗng.
- [x] N1–N2: dấu vân tay toàn bộ dữ liệu 34 bảng khớp trước/sau trên DB thử và DB vận hành; giữ 101 FK, 69 check, 29 trigger, 155 index trên DB thử.
- [x] N3: 81 kiểm thử tích hợp đạt (namespace 2, vật tư 24, công việc 10, quản trị AI 31, gán tài sản/vị trí 7, liên kết phòng 7; bao gồm test cha của Node). TypeScript và lint phần mới đạt. SQL trực tiếp và ép kiểu enum vật tư đã chuyển sang tên đủ namespace. Test hàm vật tư lịch sử đặt search_path cục bộ; test 3D cập nhật kỳ vọng điểm đã chuyển khỏi phòng có thể không còn trong danh sách DB, và fixture liên kết phòng được làm sạch chỉ trong DB thử.
- [x] N4: toàn bộ 42 migration chạy thành công từ DB rỗng; backup được khôi phục sang DB riêng trước thử nghiệm, Prisma diff sau chuyển nhóm rỗng.
- [x] Đã áp dụng DB local `sdg_erp`, generate Prisma Client và khởi động lại web :4000/Studio :5555. Chrome kiểm tra có phiên ở `/hr`, `/employees`, `/roles`, `/assets`, `/inventory`, `/office-3d`, `/tasks`: HTTP 200, không lỗi tải dữ liệu. Đã xem ảnh Studio và xác nhận model đọc được sau chuyển nhóm. Đây là kiểm tra mở trang; không thay thế nghiệm thu toàn bộ UX/WebGL.

Backup trước khi triển khai: `outputs/db-namespaces/live-before.dump`; bản sao lưu dùng thử khôi phục: `before.dump` cùng thư mục. Dấu vân tay, log migration/test và ảnh Studio lưu cục bộ tại đó, không đưa Git. DB thử đã dọn sau kiểm chứng. Ba rule kỹ thuật chung không thay đổi. Next dev vẫn báo khuyến nghị cập nhật bảo mật có sẵn; không nâng phiên bản trong phạm vi này.
