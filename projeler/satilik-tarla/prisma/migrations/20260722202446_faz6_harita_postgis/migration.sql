-- imresamu/postgis imajı eklentiyi zaten yükler ama her ihtimale karşı (taze
-- bir DB'de) idempotent şekilde garanti altına alınır.
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "geom" geometry(Point, 4326);

-- CreateIndex
CREATE INDEX "Listing_geom_idx" ON "Listing" USING GIST ("geom");

-- geom, lat/lng'nin türevidir — Prisma Client bu alana yazamadığı için (tip
-- Unsupported) senkronu bir trigger üstlenir: lat/lng her INSERT/UPDATE'te
-- (admin formu, seed script'leri, toplu-seed hepsi) otomatik olarak geom'a
-- yansır; uygulama kodunda ayrıca senkronlama gerekmez.
CREATE OR REPLACE FUNCTION listing_sync_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_geom_sync
  BEFORE INSERT OR UPDATE OF lat, lng ON "Listing"
  FOR EACH ROW EXECUTE FUNCTION listing_sync_geom();

-- Backfill: migration öncesi zaten var olan ilanlar (trigger yalnızca
-- bundan sonraki INSERT/UPDATE'lerde devreye girer).
UPDATE "Listing"
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL;
