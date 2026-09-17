import { handleRouteError, ok } from "@/lib/errors/api-response";
import {
  enforceRegistrationRateLimit,
  getRequestIp
} from "@/lib/rate-limit/registration";
import { createRegistration } from "@/services/registration.service";
import { requireAccount } from "@/lib/auth/session";

export async function POST(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const user = await requireAccount();
    await enforceRegistrationRateLimit(`${params.eventId}:${getRequestIp(request)}`);
    return ok(
      await createRegistration(params.eventId, await request.json(), user.id),
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
