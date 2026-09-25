import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    reservationId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { reservationId } = await context.params;

    console.log("[TOKAMA cash-on-arrival] HIT", reservationId);

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      console.log("[TOKAMA cash-on-arrival] Missing token");

      return NextResponse.json(
        { ok: false, message: "Missing authorization token." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log("[TOKAMA cash-on-arrival] Unauthorized", userError?.message);

      return NextResponse.json(
        { ok: false, message: userError?.message || "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("hostapp_profiles")
      .select("id, is_active, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_active) {
      console.log("[TOKAMA cash-on-arrival] No active profile", profileError?.message);

      return NextResponse.json(
        {
          ok: false,
          message: profileError?.message || "No active HOSTapp profile.",
        },
        { status: 403 }
      );
    }

    const { data: reservation, error: reservationError } = await supabase
      .from("tokama_reservations")
      .select("id, status, payment_method, payment_status")
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      console.log("[TOKAMA cash-on-arrival] Reservation not found", reservationError?.message);

      return NextResponse.json(
        {
          ok: false,
          message: reservationError?.message || "Reservation not found.",
        },
        { status: 404 }
      );
    }

    console.log("[TOKAMA cash-on-arrival] Current reservation", reservation);

    if (reservation.status === "cancelled" || reservation.status === "rejected") {
      return NextResponse.json(
        {
          ok: false,
          message: "Cancelled or rejected reservations cannot be marked as cash on arrival.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: updatedReservation, error: updateError } = await supabase
      .from("tokama_reservations")
      .update({
        payment_method: "cash_on_arrival",
        payment_status: "cash_on_arrival",
        cash_payment_marked_at: now,
        cash_payment_marked_by: user.id,
        updated_at: now,
      })
      .eq("id", reservationId)
      .select(
        "id, public_code, status, payment_method, payment_status, cash_payment_marked_at"
      )
      .single();

    if (updateError || !updatedReservation) {
      console.log("[TOKAMA cash-on-arrival] Update failed", updateError?.message);

      return NextResponse.json(
        {
          ok: false,
          message: updateError?.message || "Reservation update failed.",
        },
        { status: 500 }
      );
    }

    console.log("[TOKAMA cash-on-arrival] Updated", updatedReservation);

    return NextResponse.json({
      ok: true,
      reservation: updatedReservation,
    });
  } catch (error) {
    console.log("[TOKAMA cash-on-arrival] Unknown error", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown cash payment marker error.",
      },
      { status: 500 }
    );
  }
}
