import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { sendRegistrationConfirmation } from "../services/email.service";

async function main() {
  const { combinedEnv } = loadEnvConfig(process.cwd(), false);

  const recipientEmail = combinedEnv.TEST_EMAIL_TO?.trim();
  if (!recipientEmail) {
    throw new Error("Set TEST_EMAIL_TO to the inbox that should receive the test message.");
  }
  const apiKey = combinedEnv.RESEND_API_KEY?.trim();
  const from = combinedEnv.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM are required for the live email test.");
  }
  process.env.RESEND_API_KEY = apiKey;
  process.env.EMAIL_FROM = from;

  const now = new Date();
  const sent = await sendRegistrationConfirmation({
    registrationId: `email-test-${randomUUID()}`,
    recipientEmail,
    participantName: "Người tham gia thử nghiệm",
    registrationCode: `TEST-${Date.now().toString().slice(-6)}`,
    eventName: "Kiểm thử email và mã QR QPass",
    eventLocation: "Môi trường production",
    eventStartTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    eventEndTime: new Date(now.getTime() + 26 * 60 * 60 * 1000),
    qrToken: `qpass-email-test:${randomUUID()}`
  });

  if (!sent) throw new Error("Resend rejected the message. Check the provider log above.");
  console.log(`Test confirmation email with QR attachment sent to ${recipientEmail}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
