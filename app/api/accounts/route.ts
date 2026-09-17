import { createParticipant } from "@/services/account.service";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { enforceRegistrationRateLimit, getRequestIp } from "@/lib/rate-limit/registration";

export async function POST(request: Request) {
  try {
    await enforceRegistrationRateLimit(`signup:${getRequestIp(request)}`);
    return ok(await createParticipant(await request.json()), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
