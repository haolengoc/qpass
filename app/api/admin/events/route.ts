import { requireUser } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { createEvent, listAdminEvents } from "@/services/event.service";

export async function GET(request: Request) {
  try {
    await requireUser();
    const query = new URL(request.url).searchParams;
    const status = query.get("status");
    const result = await listAdminEvents({
      search: query.get("search") ?? undefined,
      status:
        status === "DRAFT" || status === "PUBLISHED" || status === "CANCELLED"
          ? status
          : undefined,
      page: Number(query.get("page")) || 1,
      limit: Number(query.get("limit")) || 10
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const event = await createEvent(user.id, await request.json());
    return ok({ event }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
