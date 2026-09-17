ALTER TABLE "registration_answers"
DROP CONSTRAINT "registration_answers_event_field_id_fkey";

ALTER TABLE "registration_answers"
ADD CONSTRAINT "registration_answers_event_field_id_fkey"
FOREIGN KEY ("event_field_id") REFERENCES "event_fields"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
