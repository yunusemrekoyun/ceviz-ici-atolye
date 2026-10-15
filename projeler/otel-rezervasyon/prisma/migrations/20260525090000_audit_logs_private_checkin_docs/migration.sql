-- Private check-in document metadata.
ALTER TABLE "reservations"
  ADD COLUMN "checkin_document_private_path" TEXT,
  ADD COLUMN "checkin_document_original_name" TEXT,
  ADD COLUMN "checkin_document_mime_type" TEXT,
  ADD COLUMN "checkin_document_size" INTEGER,
  ADD COLUMN "checkin_document_uploaded_at" TIMESTAMP(3);

-- Append-only operational audit trail.
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "actor_email" TEXT,
  "actor_role" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "summary" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
