-- Loyalty points + coupon (loyalty store & credit) infrastructure.

ALTER TABLE "users" ADD COLUMN "loyalty_points" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "reservations"
  ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "coupon_code" TEXT;

CREATE TABLE "coupon_products" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "points_cost" INTEGER NOT NULL,
  "discount_type" TEXT NOT NULL DEFAULT 'percent',
  "value" INTEGER NOT NULL,
  "min_spend" INTEGER NOT NULL DEFAULT 0,
  "max_discount" INTEGER,
  "expires_in_days" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coupon_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupons" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'loyalty',
  "discount_type" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "min_spend" INTEGER NOT NULL DEFAULT 0,
  "max_discount" INTEGER,
  "balance" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'active',
  "source_label" TEXT,
  "coupon_product_id" TEXT,
  "expires_at" TIMESTAMP(3),
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_user_id_idx" ON "coupons"("user_id");
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

CREATE TABLE "points_ledger" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "reservation_id" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "points_ledger_user_id_idx" ON "points_ledger"("user_id");

ALTER TABLE "coupons" ADD CONSTRAINT "coupons_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_coupon_product_id_fkey"
  FOREIGN KEY ("coupon_product_id") REFERENCES "coupon_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
