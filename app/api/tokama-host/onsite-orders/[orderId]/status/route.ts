import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isHostApiRequest, unauthorizedResponse } from "@/lib/tokama/hostAuth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "new",
  "accepted",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
]);

type Context = {
  params: Promise<{ orderId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const { orderId } = await context.params;

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowy identyfikator zamówienia." },
      { status: 400 }
    );
  }

  let body: { status?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowe dane." },
      { status: 400 }
    );
  }

  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowy status zamówienia." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const update: Record<string, string> = {
    status,
    updated_at: now,
  };

  if (status === "accepted") update.accepted_at = now;
  if (status === "ready") update.ready_at = now;
  if (status === "delivered") update.delivered_at = now;
  if (status === "cancelled") update.cancelled_at = now;

  const { data: order, error } = await getSupabaseAdmin()
    .from("tokama_onsite_orders")
    .update(update)
    .eq("id", orderId)
    .select("id, public_code, status, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Nie znaleziono zamówienia." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, order });
}
