import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TOKAMA_TERMS_VERSION } from "@/lib/tokama/legal";

type Body = {
  payment_request_id?: string;
  public_code?: string;
  terms_accepted?: boolean;
  terms_version?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (body.terms_accepted !== true || body.terms_version !== TOKAMA_TERMS_VERSION) {
      return NextResponse.json(
        { ok: false, message: "Zaakceptuj aktualny Regulamin rezerwacji." },
        { status: 400 }
      );
    }

    const paymentRequestId = String(body.payment_request_id || "").trim();
    const publicCode = String(body.public_code || "").trim();

    if (!paymentRequestId || !publicCode) {
      return NextResponse.json(
        { ok: false, message: "Brakuje danych płatności." },
        { status: 400 }
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const acceptanceIp = forwardedFor.split(",")[0]?.trim() || null;
    const acceptanceUserAgent = (request.headers.get("user-agent") || "").slice(0, 500) || null;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tokama_payment_requests")
      .update({
        terms_version: TOKAMA_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
        terms_acceptance_ip: acceptanceIp,
        terms_acceptance_user_agent: acceptanceUserAgent,
      })
      .eq("id", paymentRequestId)
      .eq("public_code", publicCode)
      .in("status", ["created", "sent", "cancelled"])
      .select("id, terms_version, terms_accepted_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Nie znaleziono aktywnego żądania płatności." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, acceptance: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Nie udało się zapisać akceptacji." },
      { status: 500 }
    );
  }
}
