import { requireUser } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { getParticipantDetail } from "@/services/participant.service";

export async function GET(_request: Request, props: { params: Promise<{ registrationId: string }> }) {
  const params = await props.params;
  try {
    await requireUser();
    return ok({ registration: await getParticipantDetail(params.registrationId) });
  } catch (error) {
    return handleRouteError(error);
  }
}
