-- CreateTable
CREATE TABLE "account_people" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT,
    "relation" TEXT NOT NULL DEFAULT 'self',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birth_date" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT DEFAULT 'TR',
    "tc_kimlik_no" TEXT,
    "passport_no" TEXT,
    "passport_expiry" TIMESTAMP(3),
    "company_name" TEXT,
    "tax_number" TEXT,
    "tax_office" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_people_user_id_idx" ON "account_people"("user_id");

-- CreateIndex
CREATE INDEX "account_people_user_id_is_default_idx" ON "account_people"("user_id", "is_default");

-- AddForeignKey
ALTER TABLE "account_people" ADD CONSTRAINT "account_people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
