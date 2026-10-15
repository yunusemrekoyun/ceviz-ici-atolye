-- Public reservation payments and iyzico checkout attempts.
ALTER TABLE "reservations"
  ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN "payment_expires_at" TIMESTAMP(3);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'iyzico',
  "status" TEXT NOT NULL DEFAULT 'initializing',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "conversation_id" TEXT NOT NULL,
  "iyzico_token" TEXT,
  "iyzico_payment_id" TEXT,
  "payment_page_url" TEXT,
  "checkout_form_html" TEXT,
  "error_code" TEXT,
  "error_message" TEXT,
  "paid_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_conversation_id_key" ON "payments"("conversation_id");
CREATE UNIQUE INDEX "payments_iyzico_token_key" ON "payments"("iyzico_token");
CREATE INDEX "payments_reservation_id_idx" ON "payments"("reservation_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
