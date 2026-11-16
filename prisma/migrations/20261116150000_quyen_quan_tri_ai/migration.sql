-- Catalog only. Existing roles/accounts are not automatically granted this action.
INSERT INTO "quyen" ("phan_he", "hanh_dong", "ten_quyen", "pham_vi", "created_at", "updated_at")
VALUES ('AI', 'MANAGE_CONNECTIONS', 'Quản lý kết nối & model AI', 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("phan_he", "hanh_dong") DO NOTHING;
