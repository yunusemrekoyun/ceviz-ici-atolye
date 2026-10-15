-- Make media table truly polymorphic: drop the FK constraint that tied entity_id to room_types
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_entity_id_fkey";
