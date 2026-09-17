import { requireUser } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { getAdminEvent, patchEvent } from "@/services/event.service";

export async function GET(_request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    await requireUser();
    return ok({ event: await getAdminEvent(params.eventId) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    await requireUser();
    return ok({ event: await patchEvent(params.eventId, await request.json()) });
  } catch (error) {
    return handleRouteError(error);
  }
}
