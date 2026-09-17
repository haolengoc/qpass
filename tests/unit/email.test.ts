import { afterEach, describe, expect, it } from "vitest";
import {
  escapeHtml,
  renderConfirmationEmail,
  sendRegistrationConfirmation
} from "@/services/email.service";

const originalApiKey = process.env.RESEND_API_KEY;
const originalEmailFrom = process.env.EMAIL_FROM;

afterEach(() => {
  process.env.RESEND_API_KEY = originalApiKey;
  process.env.EMAIL_FROM = originalEmailFrom;
});

describe("confirmation email", () => {
  it("escapes user-controlled values in the HTML template", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );

    const html = renderConfirmationEmail({
      registrationId: "registration-id",
      recipientEmail: "participant@example.test",
      participantName: "<b>Test</b>",
      registrationCode: "TEST-000001",
      eventName: "Event & Friends",
      eventLocation: "Room > 1",
      eventStartTime: new Date("2026-10-20T02:00:00.000Z"),
      eventEndTime: new Date("2026-10-20T05:00:00.000Z")
    });

    expect(html).toContain("&lt;b&gt;Test&lt;/b&gt;");
    expect(html).toContain("Event &amp; Friends");
    expect(html).not.toContain("<b>Test</b>");
  });

  it("returns a safe failure when Resend is not configured", async () => {
    process.env.RESEND_API_KEY = "";
    process.env.EMAIL_FROM = "";

    await expect(
      sendRegistrationConfirmation({
        registrationId: "registration-id",
        recipientEmail: "participant@example.test",
        participantName: "Participant",
        registrationCode: "TEST-000001",
        eventName: "Test Event",
        eventLocation: null,
        eventStartTime: new Date("2026-10-20T02:00:00.000Z"),
        eventEndTime: new Date("2026-10-20T05:00:00.000Z"),
        qrToken: "opaque-token"
      })
    ).resolves.toBe(false);
  });
});

