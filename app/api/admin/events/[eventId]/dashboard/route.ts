import { requireUser } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { getEventDashboard } from "@/services/dashboard.service";

export async function GET(_request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    await requireUser();
    return ok(await getEventDashboard(params.eventId));
  } catch (error) {
    return handleRouteError(error);
  }
}
