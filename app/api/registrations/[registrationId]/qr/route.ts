import { requireAccount } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { getParticipantQr } from "@/services/participant-qr.service";

const privateResponse = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(_request: Request, props: { params: Promise<{ registrationId: string }> }) {
  try {
    const user = await requireAccount();
    const { registrationId } = await props.params;
    return ok(await getParticipantQr(registrationId, user.id), privateResponse);
  } catch (error) {
    return handleRouteError(error);
  }
}
