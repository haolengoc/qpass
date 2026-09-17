import { requireAccount } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { listNotifications, markNotificationsRead } from "@/services/notifications.service";

const privateResponse = { headers: { "Cache-Control": "private, no-store" } };

export async function GET() {
  try {
    const user = await requireAccount();
    return ok(await listNotifications(user.id), privateResponse);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAccount();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      throw new AppError("FORBIDDEN", "Yêu cầu không hợp lệ.", 403);
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AppError("VALIDATION_ERROR", "Dữ liệu không hợp lệ.", 422);
    }
    let input: unknown;
    try { input = await request.json(); } catch { throw new AppError("VALIDATION_ERROR", "Dữ liệu không hợp lệ.", 422); }
    await markNotificationsRead(user.id, input);
    return ok(await listNotifications(user.id), privateResponse);
  } catch (error) {
    return handleRouteError(error);
  }
}
