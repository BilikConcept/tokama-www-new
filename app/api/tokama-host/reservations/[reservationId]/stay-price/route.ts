import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";

type RouteContext = {
  params: Promise<{ reservationId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireHostApi(request);
    if (!auth.ok) return auth.response;

    const { reservationId } = await context.params;
    const body = await request.json().catch(() => null);
    const stayPriceCents = Number(body?.stayPriceCents);

    if (
      !Number.isInteger(stayPriceCents) ||
      stayPriceCents < 0 ||
      stayPriceCents > 100000000
    ) {
      return NextResponse.json(
        { ok: false, message: "Podaj poprawną cenę noclegów." },
        { status: 400 }
      );
    }

    const { data: reservation, error: reservationError } = await auth.supabase
      .from("tokama_reservations")
      .select(
        "id, status, payment_status, addons_price_cents, currency"
      )
      .eq("id", reservationId)
      .maybeSingle();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Nie znaleziono rezerwacji." },
        { status: 404 }
      );
    }

    if (reservation.payment_status === "paid") {
      return NextResponse.json(
        {
          ok: false,
          message: "Nie można zmienić ceny noclegów po oznaczeniu płatności jako opłaconej.",
        },
        { status: 409 }
      );
    }

    const addonsPriceCents = Math.max(0, Number(reservation.addons_price_cents || 0));
    const totalEstimatedCents = stayPriceCents + addonsPriceCents;
    const now = new Date().toISOString();

    const { data: updatedReservation, error: updateError } = await auth.supabase
      .from("tokama_reservations")
      .update({
        stay_price_cents: stayPriceCents,
        total_estimated_cents: totalEstimatedCents,
        host_final_amount_cents: totalEstimatedCents,
        updated_at: now,
      })
      .eq("id", reservation.id)
      .select(
        "id, stay_price_cents, addons_price_cents, total_estimated_cents, host_final_amount_cents, currency"
      )
      .single();

    if (updateError || !updatedReservation) {
      return NextResponse.json(
        { ok: false, message: updateError?.message || "Nie udało się zapisać ceny noclegów." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservation: {
        id: updatedReservation.id,
        stayPriceCents: Number(updatedReservation.stay_price_cents || 0),
        addonsPriceCents: Number(updatedReservation.addons_price_cents || 0),
        totalEstimatedCents: Number(updatedReservation.total_estimated_cents || 0),
        currency: updatedReservation.currency || "PLN",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nie udało się zapisać ceny noclegów.",
      },
      { status: 500 }
    );
  }
}
