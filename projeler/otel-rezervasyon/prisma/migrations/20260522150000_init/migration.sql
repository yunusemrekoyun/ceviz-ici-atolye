CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "role_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "cabin_id" TEXT NOT NULL,
  "cabin_name" TEXT NOT NULL,
  "check_in_date" TIMESTAMP(3) NOT NULL,
  "check_out_date" TIMESTAMP(3) NOT NULL,
  "guests_count" INTEGER NOT NULL,
  "nights" INTEGER NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "cleaning_fee" INTEGER NOT NULL,
  "service_fee" INTEGER NOT NULL,
  "total_price" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "confirmation_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_requests" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "experience_bookings" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "experience_id" TEXT NOT NULL,
  "experience_name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "guests" INTEGER NOT NULL,
  "base_price" INTEGER NOT NULL,
  "insurance_and_gear_fee" INTEGER NOT NULL,
  "total_price" INTEGER NOT NULL,
  "confirmation_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experience_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE UNIQUE INDEX "reservations_confirmation_id_key" ON "reservations"("confirmation_id");
CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");
CREATE INDEX "reservations_cabin_id_idx" ON "reservations"("cabin_id");
CREATE UNIQUE INDEX "contact_requests_ticket_id_key" ON "contact_requests"("ticket_id");
CREATE INDEX "contact_requests_user_id_idx" ON "contact_requests"("user_id");
CREATE UNIQUE INDEX "experience_bookings_confirmation_id_key" ON "experience_bookings"("confirmation_id");
CREATE INDEX "experience_bookings_user_id_idx" ON "experience_bookings"("user_id");
CREATE INDEX "experience_bookings_experience_id_idx" ON "experience_bookings"("experience_id");

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "experience_bookings" ADD CONSTRAINT "experience_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
