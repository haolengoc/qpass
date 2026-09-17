import { requireUser } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import { checkInByQr } from "@/services/checkin.service";

export async function POST(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    return ok(await checkInByQr(params.eventId, user.id, await request.json()));
  } catch (error) {
    return handleRouteError(error);
  }
}
