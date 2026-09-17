import { handleRouteError, ok } from "@/lib/errors/api-response";
import { getPublicEventBySlug } from "@/services/registration.service";

export async function GET(_request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    return ok({ event: await getPublicEventBySlug(params.eventId) });
  } catch (error) {
    return handleRouteError(error);
  }
}
