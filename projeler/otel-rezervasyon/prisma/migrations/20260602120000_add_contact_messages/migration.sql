-- Support conversation thread (customer ↔ staff) per contact request.
CREATE TABLE "contact_messages" (
  "id" TEXT NOT NULL,
  "contact_request_id" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "author_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_messages_contact_request_id_idx" ON "contact_messages"("contact_request_id");

ALTER TABLE "contact_messages"
  ADD CONSTRAINT "contact_messages_contact_request_id_fkey"
  FOREIGN KEY ("contact_request_id") REFERENCES "contact_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
