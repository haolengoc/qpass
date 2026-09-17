import { requireUser } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/errors/api-response";
import { AppError } from "@/lib/errors/app-error";
import { createEventExport } from "@/services/export.service";

export async function GET(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    await requireUser();
    const format = new URL(request.url).searchParams.get("format") ?? "xlsx";
    if (format !== "csv" && format !== "xlsx") {
      throw new AppError("VALIDATION_ERROR", "Định dạng export không hợp lệ.", 422);
    }
    const file = await createEventExport(params.eventId, format);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
