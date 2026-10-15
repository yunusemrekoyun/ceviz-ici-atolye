CREATE TABLE "system_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "room_types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amenities" TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media" (
  "id" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "path_original" TEXT NOT NULL,
  "path_thumb" TEXT,
  "path_medium" TEXT,
  "path_large" TEXT,
  "is_processed" BOOLEAN NOT NULL DEFAULT false,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "media_entity_type_entity_id_idx" ON "media"("entity_type", "entity_id");

ALTER TABLE "media" ADD CONSTRAINT "media_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
