CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORGANIZER');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED');
CREATE TYPE "CheckinMethod" AS ENUM ('QR', 'MANUAL');
CREATE TYPE "EventFieldType" AS ENUM ('TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'SELECT', 'RADIO', 'CHECKBOX', 'TEXTAREA');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "start_time" TIMESTAMP(3) NOT NULL,
  "end_time" TIMESTAMP(3) NOT NULL,
  "registration_open_at" TIMESTAMP(3) NOT NULL,
  "registration_close_at" TIMESTAMP(3) NOT NULL,
  "checkin_open_at" TIMESTAMP(3) NOT NULL,
  "checkin_close_at" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER,
  "status" "EventStatus" NOT NULL,
  "code_prefix" TEXT NOT NULL,
  "registration_counter" INTEGER NOT NULL DEFAULT 0,
  "collect_phone" BOOLEAN NOT NULL DEFAULT true,
  "require_phone" BOOLEAN NOT NULL DEFAULT false,
  "collect_faculty" BOOLEAN NOT NULL DEFAULT true,
  "require_faculty" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_fields" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "field_key" TEXT NOT NULL,
  "type" "EventFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB,
  "order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registrations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "registration_code" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "faculty" TEXT,
  "qr_token_hash" TEXT NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "confirmation_email_sent_at" TIMESTAMP(3),
  CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registration_id" UUID NOT NULL,
  "event_field_id" UUID NOT NULL,
  "value" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checkins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registration_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checked_in_by" UUID NOT NULL,
  "method" "CheckinMethod" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_start_time_idx" ON "events"("start_time");
CREATE UNIQUE INDEX "event_fields_event_id_field_key_key" ON "event_fields"("event_id", "field_key");
CREATE INDEX "event_fields_event_id_order_idx" ON "event_fields"("event_id", "order");
CREATE UNIQUE INDEX "registrations_registration_code_key" ON "registrations"("registration_code");
CREATE UNIQUE INDEX "registrations_qr_token_hash_key" ON "registrations"("qr_token_hash");
CREATE UNIQUE INDEX "registrations_event_id_student_id_key" ON "registrations"("event_id", "student_id");
CREATE UNIQUE INDEX "registrations_event_id_email_key" ON "registrations"("event_id", "email");
CREATE INDEX "registrations_event_id_idx" ON "registrations"("event_id");
CREATE INDEX "registrations_student_id_idx" ON "registrations"("student_id");
CREATE INDEX "registrations_email_idx" ON "registrations"("email");
CREATE INDEX "registrations_registered_at_idx" ON "registrations"("registered_at");
CREATE UNIQUE INDEX "registration_answers_registration_id_event_field_id_key" ON "registration_answers"("registration_id", "event_field_id");
CREATE UNIQUE INDEX "checkins_registration_id_key" ON "checkins"("registration_id");
CREATE INDEX "checkins_event_id_idx" ON "checkins"("event_id");
CREATE INDEX "checkins_checked_in_at_idx" ON "checkins"("checked_in_at");

ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_fields" ADD CONSTRAINT "event_fields_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_answers" ADD CONSTRAINT "registration_answers_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_answers" ADD CONSTRAINT "registration_answers_event_field_id_fkey" FOREIGN KEY ("event_field_id") REFERENCES "event_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
