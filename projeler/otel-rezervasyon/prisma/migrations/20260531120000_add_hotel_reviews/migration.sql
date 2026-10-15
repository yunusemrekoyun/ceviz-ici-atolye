-- CreateTable
CREATE TABLE "hotel_reviews" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'internal',
    "approved_at" TIMESTAMP(3),
    "moderated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotel_reviews_reservation_id_key" ON "hotel_reviews"("reservation_id");

-- CreateIndex
CREATE INDEX "hotel_reviews_user_id_idx" ON "hotel_reviews"("user_id");

-- CreateIndex
CREATE INDEX "hotel_reviews_status_idx" ON "hotel_reviews"("status");

-- CreateIndex
CREATE INDEX "hotel_reviews_created_at_idx" ON "hotel_reviews"("created_at");

-- AddForeignKey
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
