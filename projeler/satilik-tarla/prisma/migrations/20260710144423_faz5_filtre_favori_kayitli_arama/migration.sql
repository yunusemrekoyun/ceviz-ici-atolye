-- CreateEnum
CREATE TYPE "ImarDurumu" AS ENUM ('imarsiz', 'koyYerlesik', 'konutImarli', 'sanayiTicari', 'diger');

-- CreateEnum
CREATE TYPE "YolDurumu" AS ENUM ('cepheli', 'yakin', 'yok');

-- CreateEnum
CREATE TYPE "TapuDurumu" AS ENUM ('mustakil', 'hisseli', 'tahsisli');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "areaM2" INTEGER,
ADD COLUMN     "elektrikVar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imarDurumu" "ImarDurumu",
ADD COLUMN     "priceValue" BIGINT,
ADD COLUMN     "suVar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tapuDurumu" "TapuDurumu",
ADD COLUMN     "yolDurumu" "YolDurumu";

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_listingId_key" ON "Favorite"("userId", "listingId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "Listing_status_publishedAt_idx" ON "Listing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Listing_priceValue_idx" ON "Listing"("priceValue");

-- CreateIndex
CREATE INDEX "Listing_areaM2_idx" ON "Listing"("areaM2");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
