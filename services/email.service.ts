import QRCode from "qrcode";
import { Resend } from "resend";
import { formatEventDate } from "@/lib/time/format";

export type ConfirmationEmailInput = {
  registrationId: string;
  recipientEmail: string;
  participantName: string;
  registrationCode: string;
  eventName: string;
  eventLocation: string | null;
  eventStartTime: Date;
  eventEndTime: Date;
  qrToken: string;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };
    return entities[character];
  });
}

export function renderConfirmationEmail(input: Omit<ConfirmationEmailInput, "qrToken">) {
  const name = escapeHtml(input.participantName);
  const eventName = escapeHtml(input.eventName);
  const location = escapeHtml(input.eventLocation || "Sẽ cập nhật");
  const code = escapeHtml(input.registrationCode);

  return `<!doctype html>
<html lang="vi">
  <body style="margin:0;background:#f4f7f6;color:#17211f;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #dfe7e4;padding:28px">
        <p style="margin:0 0 8px;color:#117864;font-size:14px;font-weight:700">ĐĂNG KÝ THÀNH CÔNG</p>
        <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3">${eventName}</h1>
        <p style="margin:0 0 20px;line-height:1.6">Xin chào ${name}, đăng ký của bạn đã được ghi nhận.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:10px 0;color:#60706c">Mã đăng ký</td><td style="padding:10px 0;text-align:right;font-weight:700">${code}</td></tr>
          <tr><td style="padding:10px 0;color:#60706c">Bắt đầu</td><td style="padding:10px 0;text-align:right">${formatEventDate(input.eventStartTime)}</td></tr>
          <tr><td style="padding:10px 0;color:#60706c">Kết thúc</td><td style="padding:10px 0;text-align:right">${formatEventDate(input.eventEndTime)}</td></tr>
          <tr><td style="padding:10px 0;color:#60706c">Địa điểm</td><td style="padding:10px 0;text-align:right">${location}</td></tr>
        </table>
        <p style="margin:24px 0 0;line-height:1.6">Mã QR check-in được đính kèm email này. Vui lòng lưu lại và xuất trình khi đến sự kiện.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendRegistrationConfirmation(input: ConfirmationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  try {
    const qrImage = await QRCode.toBuffer(input.qrToken, {
      type: "png",
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M"
    });
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.recipientEmail,
      subject: `Xác nhận đăng ký - ${input.eventName}`,
      html: renderConfirmationEmail(input),
      attachments: [
        {
          filename: `qr-${input.registrationCode}.png`,
          content: qrImage,
          contentType: "image/png"
        }
      ],
      tags: [{ name: "category", value: "registration_confirmation" }]
    });

    if (result.error) throw new Error(result.error.message);
    return true;
  } catch (error) {
    console.error("Failed to send registration confirmation", {
      registrationId: input.registrationId,
      error: error instanceof Error ? error.message : "Unknown email provider error"
    });
    return false;
  }
}

