BEGIN;
ALTER TABLE "ket_noi_ai"
  ADD COLUMN "ten_ket_noi" VARCHAR(100) NOT NULL DEFAULT 'OpenAI',
  ADD COLUMN "la_mac_dinh" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ket_noi_ai" SET "la_mac_dinh" = true;
DROP INDEX "ket_noi_ai_company_id_key";
CREATE INDEX "ket_noi_ai_company_id_idx" ON "ket_noi_ai"("company_id");
CREATE UNIQUE INDEX "ket_noi_ai_mac_dinh_key" ON "ket_noi_ai"("company_id") WHERE "la_mac_dinh";
ALTER TABLE "ket_noi_ai" ADD CONSTRAINT "ket_noi_ai_name_check" CHECK (length(btrim("ten_ket_noi")) > 0);
COMMIT;
