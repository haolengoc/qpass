ALTER TYPE "UserRole" ADD VALUE 'PARTICIPANT';
ALTER TABLE "registrations" ADD COLUMN "user_id" UUID;
CREATE UNIQUE INDEX "registrations_event_id_user_id_key" ON "registrations"("event_id", "user_id");
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
