-- CreateEnum
CREATE TYPE "PriceRequestStatus" AS ENUM ('bekliyor', 'uygulandi', 'reddedildi');

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'cekimBekliyor';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT,
ALTER COLUMN "lat" DROP NOT NULL,
ALTER COLUMN "lng" DROP NOT NULL,
ALTER COLUMN "specs" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ListingPriceRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestedPrice" TEXT NOT NULL,
    "note" TEXT,
    "status" "PriceRequestStatus" NOT NULL DEFAULT 'bekliyor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ListingPriceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPriceRequest_listingId_idx" ON "ListingPriceRequest"("listingId");

-- CreateIndex
CREATE INDEX "ListingPriceRequest_status_idx" ON "ListingPriceRequest"("status");

-- AddForeignKey
ALTER TABLE "ListingPriceRequest" ADD CONSTRAINT "ListingPriceRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
