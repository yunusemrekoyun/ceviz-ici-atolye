-- Payment collection method for manual desk payments (cash/card/transfer) and online.
ALTER TABLE "payments"
  ADD COLUMN "method" TEXT;
