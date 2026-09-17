ALTER TABLE "registrations"
  ADD COLUMN "registration_notice_read_at" TIMESTAMP(3),
  ADD COLUMN "checkin_notice_read_at" TIMESTAMP(3);

CREATE INDEX "registrations_user_id_registered_at_idx"
  ON "registrations"("user_id", "registered_at");
