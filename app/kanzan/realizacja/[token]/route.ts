import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaSms } from "@/lib/tokamaNotifications";
import { sendTokamaHostPush } from "@/lib/tokamaPush";
import {
  firstName,
  formatKanzanMoney,
  getKanzanOrderContext,
  hashKanzanToken,
} from "@/lib/tokama/kanzanVendor";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ token: string }>;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getContextFromToken(token: string) {
  if (!/^[A-Za-z0-9_-]{24,}$/i.test(token)) return null;

  const { data: row, error } = await getSupabaseAdmin()
    .from("tokama_onsite_orders")
    .select("id")
    .eq("vendor_confirmation_token_hash", hashKanzanToken(token))
    .gt("vendor_confirmation_expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !row) return null;

  return getKanzanOrderContext(row.id);
}

function renderPage(
  context: NonNullable<Awaited<ReturnType<typeof getContextFromToken>>>,
  token: string,
  accepted: boolean
) {
  const isPreparing = context.order.status === "preparing";
  const house = context.house?.code || "—";
  const reservationCode = context.reservation?.code || context.order.code;
  const guest = firstName(context.reservation?.guestName);

  const items = context.items.map((item) => {
    const options = item.selectedOptions.length
      ? `<p class="muted">Opcje: ${escapeHtml(item.selectedOptions.map((option) => {
          const extra = option.priceCents > 0
            ? ` (+${formatKanzanMoney(option.priceCents, context.order.currency)})`
            : "";
          return `${option.groupName ? `${option.groupName}: ` : ""}${option.name}${extra}`;
        }).join(" · "))}</p>`
      : "";

    const instructions = item.specialInstructions
      ? `<p class="note">Uwagi: ${escapeHtml(item.specialInstructions)}</p>`
      : "";

    return `
      <article class="item">
        <div class="item-top">
          <strong>${escapeHtml(item.quantity)}× ${escapeHtml(item.name)}</strong>
          <strong>${escapeHtml(formatKanzanMoney(item.totalCents, context.order.currency))}</strong>
        </div>
        ${item.description ? `<p class="muted">${escapeHtml(item.description)}</p>` : ""}
        ${options}
        ${instructions}
      </article>
    `;
  }).join("");

  const acceptedMessage = accepted || isPreparing
    ? `<div class="success">Zamówienie jest przyjęte do realizacji. Gość i TOKAMA zostali poinformowani.</div>`
    : "";

  const action = context.order.status === "accepted"
    ? `
      <form method="post">
        <input type="hidden" name="action" value="accept">
        <button type="submit">Przyjmuję do realizacji</button>
      </form>
    `
    : `<div class="status">Status: ${isPreparing ? "w realizacji" : escapeHtml(context.order.status)}</div>`;

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex,nofollow">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>KANZAN · zamówienie TOKAMA</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; background: #fff; font-family: Arial, sans-serif; }
    main { width: min(100% - 32px, 680px); margin: 0 auto; padding: 32px 0 56px; }
    .eyebrow { margin: 0 0 12px; font-size: 12px; letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(30px, 7vw, 48px); letter-spacing: -.05em; font-weight: 500; }
    .meta { display: grid; gap: 4px; margin: 24px 0; padding: 18px 0; border-top: 1px solid #111; border-bottom: 1px solid #111; line-height: 1.45; }
    h2 { margin: 30px 0 12px; font-size: 20px; font-weight: 500; }
    .item { padding: 16px 0; border-top: 1px solid #ddd; }
    .item-top { display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; font-size: 16px; }
    p { margin: 7px 0 0; line-height: 1.45; }
    .muted { color: #5d5d5d; font-size: 14px; }
    .note { color: #a61b28; font-size: 14px; }
    .summary { margin-top: 24px; padding-top: 16px; border-top: 1px solid #111; }
    .summary > div { display: flex; justify-content: space-between; gap: 16px; margin-top: 8px; }
    .total { font-size: 20px; font-weight: 700; }
    button { width: 100%; margin-top: 28px; padding: 17px 20px; border: 0; color: #fff; background: #111; font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; }
    .success, .status { margin-top: 28px; padding: 16px 0; border-top: 2px solid #177542; color: #177542; font-weight: 700; }
    .status { color: #111; border-color: #111; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">TOKAMA × KANZAN</p>
    <h1>Zamówienie do domku ${escapeHtml(house)}</h1>

    ${acceptedMessage}

    <div class="meta">
      <span><strong>Rezerwacja:</strong> ${escapeHtml(reservationCode)}</span>
      <span><strong>Gość:</strong> ${escapeHtml(guest)}</span>
      <span><strong>Domek:</strong> ${escapeHtml(house)}</span>
    </div>

    <h2>Pozycje zamówienia</h2>
    ${items}

    ${context.order.note ? `<p class="note"><strong>Uwagi do całego zamówienia:</strong> ${escapeHtml(context.order.note)}</p>` : ""}

    <div class="summary">
      <div><span>Suma pozycji</span><span>${escapeHtml(formatKanzanMoney(context.order.subtotalCents, context.order.currency))}</span></div>
      <div><span>Rabat TOKAMA</span><span>−${escapeHtml(formatKanzanMoney(context.order.discountCents, context.order.currency))}</span></div>
      <div><span>Napoje bez rabatu</span><span>${escapeHtml(formatKanzanMoney(context.order.nonDiscountedSubtotalCents, context.order.currency))}</span></div>
      <div><span>Dostawa</span><span>${context.order.deliveryCents === 0 ? "gratis" : escapeHtml(formatKanzanMoney(context.order.deliveryCents, context.order.currency))}</span></div>
      <div class="total"><span>Do zapłaty</span><span>${escapeHtml(formatKanzanMoney(context.order.guestTotalCents, context.order.currency))}</span></div>
    </div>

    ${action}
  </main>
</body>
</html>`;
}

export async function GET(request: Request, context: Context) {
  const { token } = await context.params;
  const order = await getContextFromToken(token);

  if (!order) {
    return new NextResponse("Link jest nieprawidłowy lub wygasł.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const accepted = new URL(request.url).searchParams.get("accepted") === "1";

  return new NextResponse(renderPage(order, token, accepted), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  const order = await getContextFromToken(token);

  if (!order) {
    return new NextResponse("Link jest nieprawidłowy lub wygasł.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const form = await request.formData().catch(() => null);

  if (form?.get("action") !== "accept") {
    return NextResponse.redirect(
      new URL(`/kanzan/realizacja/${encodeURIComponent(token)}`, request.url),
      303
    );
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (order.order.status === "accepted") {
    const { error } = await supabase
      .from("tokama_onsite_orders")
      .update({
        status: "preparing",
        vendor_confirmed_at: now,
        updated_at: now,
      })
      .eq("id", order.order.id);

    if (error) {
      return new NextResponse("Nie udało się potwierdzić zamówienia.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  if (
    order.reservation?.guestPhone &&
    !order.order.guestPreparingSmsSentAt
  ) {
    try {
      await sendTokamaSms({
        to: order.reservation.guestPhone,
        text: `Dzień dobry ${firstName(order.reservation.guestName)}, Twoje zamówienie KANZAN do domku ${order.house?.code || "—"} jest przygotowywane. Dostawa w ciągu około 60 minut. TOKAMA`,
      });

      await supabase
        .from("tokama_onsite_orders")
        .update({ guest_preparing_sms_sent_at: new Date().toISOString() })
        .eq("id", order.order.id);
    } catch (error) {
      console.error("[KANZAN] Guest preparing SMS failed", error);
    }
  }

  if (!order.order.hostPreparingPushSentAt) {
    await sendTokamaHostPush({
      title: "KANZAN · w realizacji",
      body: `${order.house?.code || "—"} · ${firstName(order.reservation?.guestName)} · ${order.reservation?.code || order.order.code}`,
      data: {
        type: "onsite_order_preparing",
        reservation_id: order.reservation?.id || null,
        public_code: order.reservation?.code || order.order.code,
        onsite_order_id: order.order.id,
      },
    });

    await supabase
      .from("tokama_onsite_orders")
      .update({ host_preparing_push_sent_at: new Date().toISOString() })
      .eq("id", order.order.id);
  }

  return NextResponse.redirect(
    new URL(`/kanzan/realizacja/${encodeURIComponent(token)}?accepted=1`, request.url),
    303
  );
}
