-- Track open/resolved state for contact requests so staff "dismiss" persists.
ALTER TABLE "contact_requests"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';
