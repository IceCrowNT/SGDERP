-- Nới CHECK riêng của câu hỏi, đồng bộ với giới hạn 8.000 ký tự ở server/UI.
-- Không sửa hoặc xóa tin nhắn đã lưu; giữ yêu cầu trạng thái HOAN_TAT và nội dung không rỗng.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "tin_nhan_ai"
  DROP CONSTRAINT "tin_nhan_ai_user_check",
  ADD CONSTRAINT "tin_nhan_ai_user_check" CHECK (
    "vai_tro" <> 'NGUOI_DUNG' OR
    ("trang_thai" = 'HOAN_TAT' AND char_length("noi_dung") BETWEEN 1 AND 8000)
  );
COMMIT;
