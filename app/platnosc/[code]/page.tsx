import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import TokamaPaymentClient from "./TokamaPaymentClient";
import styles from "./TokamaPaymentPage.module.css";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(cents: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function TokamaPaymentPage({ params }: PageProps) {
  const { code } = await params;
  const publicCode = decodeURIComponent(code);

  const supabase = getSupabaseAdmin();

  const { data: paymentRequest, error: paymentRequestError } = await supabase
    .from("tokama_payment_requests")
    .select(`
      id,
      public_code,
      provider,
      provider_checkout_session_id,
      stripe_client_secret,
      amount_cents,
      currency,
      status,
      reservation:tokama_reservations(
        public_code,
        guest_name,
        checkin,
        checkout
      )
    `)
    .eq("public_code", publicCode)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (paymentRequestError) {
    console.error("Unable to load TOKAMA payment request", {
      code: paymentRequestError.code,
      message: paymentRequestError.message,
    });
  }

  if (!paymentRequest) {
    notFound();
  }

  const provider = (["bank_transfer", "p24_demo", "stripe", "p24"] as const).includes(
    paymentRequest.provider
  )
    ? paymentRequest.provider as "bank_transfer" | "p24_demo" | "stripe" | "p24"
    : "bank_transfer";

  const reservation = Array.isArray(paymentRequest.reservation)
    ? paymentRequest.reservation[0]
    : paymentRequest.reservation;

  return (
    <main className={styles.page}>
      <TokamaPaymentClient
        provider={provider}
        paymentRequestId={paymentRequest.id}
        initialStatus={paymentRequest.status}
        publishableKey={undefined}
        clientSecret={undefined}
        demoSessionId={undefined}
        publicCode={paymentRequest.public_code || publicCode}
        guestName={reservation?.guest_name || "Gość TOKAMA"}
        amountLabel={formatMoney(
          Number(paymentRequest.amount_cents || 0),
          paymentRequest.currency || "PLN"
        )}
        reservationDates={`${formatDate(reservation?.checkin || null)} — ${formatDate(
          reservation?.checkout || null
        )}`}
      />
    </main>
  );
}
