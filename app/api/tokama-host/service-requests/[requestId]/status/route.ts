import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

const ALLOWED_STATUSES = new Set([
  "new",
  "seen",
  "confirmed",
  "completed",
  "cancelled",
]);

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireHostApi(request);
    if (!auth.ok) return auth.response;

    const { requestId } = await context.params;
    const body = await request.json().catch(() => null);
    const status = String(body?.status || "").trim();

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, message: "Nieprawidłowy status usługi." },
        { status: 400 }
      );
    }

    const { data: updatedRequest, error } = await auth.supabase
      .from("tokama_onsite_service_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("id, reservation_id, status, updated_at")
      .maybeSingle();

    if (error || !updatedRequest) {
      return NextResponse.json(
        { ok: false, message: error?.message || "Nie udało się zmienić statusu usługi." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, serviceRequest: updatedRequest });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nie udało się zmienić statusu usługi.",
      },
      { status: 500 }
    );
  }
}
