import { requireUser } from "@/lib/auth/session";
import { handleRouteError, ok } from "@/lib/errors/api-response";
import {
  listParticipants,
  type ParticipantFilter
} from "@/services/participant.service";

export async function GET(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    await requireUser();
    const query = new URL(request.url).searchParams;
    const rawStatus = query.get("status");
    const status: ParticipantFilter =
      rawStatus === "checked_in" ||
      rawStatus === "not_checked_in" ||
      rawStatus === "cancelled"
        ? rawStatus
        : "all";
    return ok(
      await listParticipants(params.eventId, {
        search: query.get("search") ?? undefined,
        status,
        page: Number(query.get("page")) || 1,
        limit: Number(query.get("limit")) || 20
      })
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
