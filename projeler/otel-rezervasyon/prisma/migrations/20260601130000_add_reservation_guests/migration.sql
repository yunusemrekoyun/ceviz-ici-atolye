-- Additional staying guests captured at check-in (lead guest stays on the reservation).
CREATE TABLE "reservation_guests" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "is_child" BOOLEAN NOT NULL DEFAULT false,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "birth_date" TIMESTAMP(3),
  "gender" TEXT,
  "nationality" TEXT DEFAULT 'TR',
  "tc_kimlik_no" TEXT,
  "passport_no" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservation_guests_reservation_id_idx" ON "reservation_guests"("reservation_id");

ALTER TABLE "reservation_guests"
  ADD CONSTRAINT "reservation_guests_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
