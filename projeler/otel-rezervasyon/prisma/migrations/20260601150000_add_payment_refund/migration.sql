-- Refund tracking for cancellations and (later) reservation changes.
ALTER TABLE "payments"
  ADD COLUMN "refunded_amount" INTEGER,
  ADD COLUMN "refunded_at" TIMESTAMP(3);
