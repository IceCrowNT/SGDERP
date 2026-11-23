-- Unit is an editable display label, including after transactions.
-- Keep identity, category, lifecycle, stock and append-only ledger safeguards.
CREATE OR REPLACE FUNCTION bao_ve_danh_muc_vat_tu() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_kind "HangMucVatTu"; new_kind "HangMucVatTu"; active_kind boolean;
BEGIN
  PERFORM id FROM cong_ty WHERE id=NEW.company_id FOR UPDATE;
  PERFORM pg_advisory_xact_lock(260126,NEW.company_id);
  IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.company_id<>OLD.company_id) THEN RAISE EXCEPTION 'Vật tư: không đổi định danh hoặc công ty.'; END IF;
  IF TG_TABLE_NAME='loai_vat_tu' THEN
    IF TG_OP='UPDATE' THEN
      IF NEW.ma_loai<>OLD.ma_loai THEN RAISE EXCEPTION 'Vật tư: mã loại không thể thay đổi.'; END IF;
      IF NEW.hang_muc<>OLD.hang_muc AND EXISTS(SELECT 1 FROM mat_hang_vat_tu WHERE loai_vat_tu_id=OLD.id) THEN RAISE EXCEPTION 'Vật tư: loại đã có mặt hàng; không đổi hạng mục.'; END IF;
      IF NOT NEW.dang_su_dung AND EXISTS(SELECT 1 FROM mat_hang_vat_tu WHERE loai_vat_tu_id=OLD.id AND dang_su_dung) THEN RAISE EXCEPTION 'Vật tư: hãy ngừng các mặt hàng trước khi ngừng loại.'; END IF;
    END IF;
  ELSE
    SELECT hang_muc,dang_su_dung INTO new_kind,active_kind FROM loai_vat_tu WHERE id=NEW.loai_vat_tu_id AND company_id=NEW.company_id;
    IF NEW.dang_su_dung AND NOT coalesce(active_kind,false) THEN RAISE EXCEPTION 'Vật tư: hãy chọn loại đang sử dụng.'; END IF;
    IF TG_OP='UPDATE' THEN
      SELECT hang_muc INTO old_kind FROM loai_vat_tu WHERE id=OLD.loai_vat_tu_id;
      IF NEW.ma_mat_hang<>OLD.ma_mat_hang OR new_kind<>old_kind THEN RAISE EXCEPTION 'Vật tư: không đổi mã hoặc hạng mục mặt hàng.'; END IF;
      IF NOT NEW.dang_su_dung AND (EXISTS(SELECT 1 FROM ton_vat_tu(OLD.id) WHERE so_luong<>0) OR EXISTS(SELECT 1 FROM dang_cap_vat_tu(OLD.id) WHERE so_luong<>0)) THEN RAISE EXCEPTION 'Vật tư: còn tồn hoặc đang cấp; hãy tất toán trước khi ngừng.'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
