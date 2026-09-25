import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isHostApiRequest, unauthorizedResponse } from "@/lib/tokama/hostAuth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaSms } from "@/lib/tokamaNotifications";
import {
  buildKanzanSms,
  getKanzanOrderContext,
  hashKanzanToken,
} from "@/lib/tokama/kanzanVendor";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: Context) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const { orderId } = await context.params;

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowy identyfikator zamówienia." },
      { status: 400 }
    );
  }

  const kanzanPhone = String(process.env.KANZAN_SMS_PHONE || "").trim();
  const publicUrl = String(process.env.TOKAMA_PUBLIC_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!kanzanPhone) {
    return NextResponse.json(
      { ok: false, message: "Brakuje numeru KANZAN w konfiguracji." },
      { status: 500 }
    );
  }

  if (!/^https?:\/\//i.test(publicUrl)) {
    return NextResponse.json(
      { ok: false, message: "Brakuje poprawnego TOKAMA_PUBLIC_URL w konfiguracji." },
      { status: 500 }
    );
  }

  let order;

  try {
    order = await getKanzanOrderContext(orderId);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Nie udało się odczytać zamówienia." },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Nie znaleziono zamówienia." },
      { status: 404 }
    );
  }

  if (order.order.vendorSmsSentAt) {
    return NextResponse.json({
      ok: true,
      alreadySent: true,
      message: "Zamówienie zostało już przekazane do KANZAN.",
    });
  }

  if (!["new", "accepted"].includes(order.order.status)) {
    return NextResponse.json(
      { ok: false, message: "To zamówienie nie może już zostać ponownie przekazane do KANZAN." },
      { status: 409 }
    );
  }

  const token = randomBytes(24).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const tokenHash = hashKanzanToken(token);
  const supabase = getSupabaseAdmin();

  const { error: tokenError } = await supabase
    .from("tokama_onsite_orders")
    .update({
      vendor_confirmation_token_hash: tokenHash,
      vendor_confirmation_expires_at: expiresAt,
      updated_at: now.toISOString(),
    })
    .eq("id", orderId);

  if (tokenError) {
    return NextResponse.json(
      { ok: false, message: tokenError.message },
      { status: 500 }
    );
  }

  const link = `${publicUrl}/kanzan/realizacja/${encodeURIComponent(token)}`;

  try {
    await sendTokamaSms({
      to: kanzanPhone,
      text: buildKanzanSms(order, link),
    });
  } catch (error) {
    await supabase
      .from("tokama_onsite_orders")
      .update({
        vendor_confirmation_token_hash: null,
        vendor_confirmation_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error
          ? `Nie udało się wysłać SMS-a do KANZAN: ${error.message}`
          : "Nie udało się wysłać SMS-a do KANZAN.",
      },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("tokama_onsite_orders")
    .update({
      status: "accepted",
      accepted_at: now.toISOString(),
      vendor_sms_sent_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, message: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    smsSent: true,
    expiresAt,
  });
}
