DROP INDEX "registrations_registration_code_key";

CREATE UNIQUE INDEX "registrations_event_id_registration_code_key"
ON "registrations"("event_id", "registration_code");
