-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "max_adults" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "max_children" INTEGER NOT NULL DEFAULT 0;
