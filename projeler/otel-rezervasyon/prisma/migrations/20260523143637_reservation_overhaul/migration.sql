/*
  Warnings:

  - You are about to drop the column `cabin_id` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `cabin_name` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `cleaning_fee` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `guests_count` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `service_fee` on the `reservations` table. All the data in the column will be lost.
  - Added the required column `email` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room_id` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "reservations_cabin_id_idx";

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "cabin_id",
DROP COLUMN "cabin_name",
DROP COLUMN "cleaning_fee",
DROP COLUMN "guests_count",
DROP COLUMN "service_fee",
ADD COLUMN     "adults_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "children_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "nationality" TEXT DEFAULT 'TR',
ADD COLUMN     "passport_expiry" TIMESTAMP(3),
ADD COLUMN     "passport_no" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "room_id" TEXT NOT NULL,
ADD COLUMN     "special_requests" TEXT,
ADD COLUMN     "tax_number" TEXT,
ADD COLUMN     "tax_office" TEXT,
ADD COLUMN     "tc_kimlik_no" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "nationality" TEXT DEFAULT 'TR',
ADD COLUMN     "passport_expiry" TIMESTAMP(3),
ADD COLUMN     "passport_no" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "tax_number" TEXT,
ADD COLUMN     "tax_office" TEXT,
ADD COLUMN     "tc_kimlik_no" TEXT;

-- CreateIndex
CREATE INDEX "reservations_room_id_idx" ON "reservations"("room_id");

-- CreateIndex
CREATE INDEX "reservations_check_in_date_check_out_date_idx" ON "reservations"("check_in_date", "check_out_date");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
