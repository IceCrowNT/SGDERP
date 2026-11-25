-- Widen assistant answers without changing any existing message or user-input limit.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "tin_nhan_ai"
  DROP CONSTRAINT "tin_nhan_ai_length_check",
  ADD CONSTRAINT "tin_nhan_ai_length_check" CHECK (
    char_length("noi_dung") <= CASE WHEN "vai_tro" = 'TRO_LY' THEN 32000 ELSE 8000 END
  );
COMMIT;
