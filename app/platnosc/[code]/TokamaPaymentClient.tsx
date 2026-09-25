"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { TOKAMA_BANK_TRANSFER } from "@/lib/payments/bank-transfer";
import type { P24DemoMethod } from "@/lib/payments/p24-demo";
import { TOKAMA_TERMS_PATH, TOKAMA_TERMS_VERSION } from "@/lib/tokama/legal";
import styles from "./TokamaPaymentPage.module.css";

type SharedPaymentProps = {
  publicCode: string;
  guestName: string;
  amountLabel: string;
  reservationDates: string;
};

type PaymentClientProps = SharedPaymentProps & {
  provider: "bank_transfer" | "p24_demo" | "stripe" | "p24";
  paymentRequestId: string;
  initialStatus: string;
  demoSessionId?: string;
  publishableKey?: string;
  clientSecret?: string;
};

const P24_METHODS: Array<{
  id: P24DemoMethod;
  label: string;
  description: string;
}> = [
  { id: "blik", label: "BLIK", description: "Kod jednorazowy" },
  { id: "card", label: "Karta", description: "Visa lub Mastercard" },
  { id: "apple_pay", label: "Apple Pay", description: "Portfel Apple" },
  { id: "google_pay", label: "Google Pay", description: "Portfel Google" },
];

function ReservationSummary(props: SharedPaymentProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.eyebrow}>Płatność TOKAMA</p>
      <h1>
        Płatność za <em>pobyt</em>.
      </h1>

      <p className={styles.intro}>
        Sprawdź podsumowanie pobytu i należną kwotę, a następnie wybierz
        bezpieczną formę płatności przygotowaną przez hosta.
      </p>

      <div className={styles.meta}>
        <div>
          <span>Rezerwacja</span>
          <strong>{props.publicCode}</strong>
        </div>
        <div>
          <span>Gość</span>
          <strong>{props.guestName}</strong>
        </div>
        <div>
          <span>Termin</span>
          <strong>{props.reservationDates}</strong>
        </div>
        <div>
          <span>Kwota</span>
          <strong>{props.amountLabel}</strong>
        </div>
      </div>
    </div>
  );
}

function PaymentLegalConsent({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  return (
    <label className={styles.paymentLegalConsent}>
      <input
        type="checkbox"
        required
        checked={accepted}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        Potwierdzam <Link href={TOKAMA_TERMS_PATH}>Regulamin rezerwacji</Link>,
        cenę, termin i zasady anulowania. Wiem, że jest to usługa zakwaterowania
        w oznaczonym terminie, bez ustawowego 14-dniowego prawa odstąpienia.
      </span>
    </label>
  );
}

async function savePaymentTermsAcceptance(input: {
  paymentRequestId: string;
  publicCode: string;
}) {
  const response = await fetch("/api/tokama-payments/accept-terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payment_request_id: input.paymentRequestId,
      public_code: input.publicCode,
      terms_accepted: true,
      terms_version: TOKAMA_TERMS_VERSION,
    }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.message || "Nie udało się zapisać akceptacji Regulaminu.");
  }
}

function SuccessScreen({
  publicCode,
  demo = false,
}: {
  publicCode: string;
  demo?: boolean;
}) {
  return (
    <section data-tokama-payment-page className={styles.successScreen}>
      <div className={styles.successCard}>
        <div className={styles.successMark}>
          <span />
        </div>

        <p className={styles.eyebrow}>{demo ? "PRZELEWY24 DEMO" : "TOKAMA"}</p>
        <h1>
          Płatność <em>przyjęta</em>
        </h1>

        <div className={styles.successReservationCode}>
          <span>Numer rezerwacji</span>
          <strong>{publicCode}</strong>
        </div>

        <p>
          {demo
            ? "Status rezerwacji został testowo zmieniony na opłacony. To demonstracja — żadne środki nie zostały pobrane."
            : "Dziękujemy. Twoja płatność została przyjęta, a rezerwacja jest teraz potwierdzona."}
        </p>
      </div>
    </section>
  );
}

function StripePaymentForm(props: SharedPaymentProps & { paymentRequestId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements || !legalAccepted) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      await savePaymentTermsAcceptance(props);
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (result.error) {
        setStatus("error");
        setErrorMessage(
          result.error.message || "Nie udało się zrealizować płatności."
        );
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        setStatus("success");
        return;
      }

      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Nie udało się rozpocząć płatności."
      );
    }
  }

  if (status === "success") {
    return <SuccessScreen publicCode={props.publicCode} />;
  }

  return (
    <section data-tokama-payment-page className={styles.card}>
      <ReservationSummary {...props} />

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.panelHeading}>
          <p className={styles.sectionLabel}>Płatność kartą</p>
          <h2>Bezpieczna płatność</h2>
        </div>

        <div className={styles.stripeMobileFix} id="tokama-payment-element-wrap">
          <div data-tokama-stripe-element>
            <PaymentElement />
          </div>
        </div>

        {status === "error" ? (
          <p className={styles.error}>{errorMessage}</p>
        ) : null}

        <PaymentLegalConsent accepted={legalAccepted} onChange={setLegalAccepted} />

        <button type="submit" disabled={!stripe || !elements || !legalAccepted || status === "loading"}>
          {status === "loading" ? "Przetwarzanie..." : `Rezerwuję i płacę · ${props.amountLabel}`}
        </button>

        <p className={styles.note}>
          Płatność obsługiwana jest bezpiecznie przez Stripe. TOKAMA nie
          przechowuje danych karty.
        </p>
      </form>
    </section>
  );
}

function StripePaymentClient(props: PaymentClientProps) {
  const stripePromise = useMemo(
    () => loadStripe(props.publishableKey || ""),
    [props.publishableKey]
  );

  if (!props.publishableKey || !props.clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#000000",
            colorText: "#000000",
            colorTextSecondary: "rgba(0,0,0,0.56)",
            colorBackground: "#ffffff",
            colorDanger: "#9f1d1d",
            borderRadius: "0px",
            fontFamily:
              "DM Sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSizeBase: "15px",
            spacingUnit: "5px",
          },
          rules: {
            ".Input": {
              border: "1px solid rgba(0,0,0,0.14)",
              boxShadow: "none",
            },
            ".Input:focus": {
              border: "1px solid #000000",
              boxShadow: "none",
            },
            ".Label": {
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.52)",
            },
          },
        },
      }}
    >
      <StripePaymentForm
        paymentRequestId={props.paymentRequestId}
        publicCode={props.publicCode}
        guestName={props.guestName}
        amountLabel={props.amountLabel}
        reservationDates={props.reservationDates}
      />
    </Elements>
  );
}

const BANK_TRANSFER_ROWS = [
  {
    id: "recipient",
    label: "Odbiorca",
    value: TOKAMA_BANK_TRANSFER.recipient,
    copyValue: TOKAMA_BANK_TRANSFER.recipient,
  },
  {
    id: "account",
    label: "Numer konta",
    value: TOKAMA_BANK_TRANSFER.accountNumber,
    copyValue: TOKAMA_BANK_TRANSFER.accountNumberCompact,
  },
  {
    id: "title",
    label: "Tytuł przelewu",
    value: TOKAMA_BANK_TRANSFER.transferTitle,
    copyValue: TOKAMA_BANK_TRANSFER.transferTitle,
  },
] as const;

function BankTransferPaymentClient(props: PaymentClientProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [acceptanceStatus, setAcceptanceStatus] = useState<
    "idle" | "loading" | "accepted" | "error"
  >("idle");
  const [acceptanceError, setAcceptanceError] = useState("");

  async function acceptAndShowTransfer() {
    if (!legalAccepted || acceptanceStatus === "loading") return;
    setAcceptanceStatus("loading");
    setAcceptanceError("");

    try {
      await savePaymentTermsAcceptance(props);
      setAcceptanceStatus("accepted");
    } catch (error) {
      setAcceptanceStatus("error");
      setAcceptanceError(
        error instanceof Error ? error.message : "Nie udało się zapisać akceptacji."
      );
    }
  }

  async function copyValue(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setCopiedField(null);
    }
  }

  return (
    <section data-tokama-payment-page className={styles.card}>
      <ReservationSummary {...props} />

      {acceptanceStatus !== "accepted" ? (
        <div className={styles.paymentLegalGate}>
          <p className={styles.sectionLabel}>Potwierdzenie warunków</p>
          <h2>Sprawdź i zaakceptuj przed płatnością</h2>
          <p>
            Kwota do zapłaty: <strong>{props.amountLabel}</strong>. Termin: {props.reservationDates}.
          </p>
          <PaymentLegalConsent accepted={legalAccepted} onChange={setLegalAccepted} />
          {acceptanceError ? <p className={styles.error}>{acceptanceError}</p> : null}
          <button
            type="button"
            className={styles.paymentLegalButton}
            disabled={!legalAccepted || acceptanceStatus === "loading"}
            onClick={() => void acceptAndShowTransfer()}
          >
            {acceptanceStatus === "loading"
              ? "Zapisywanie..."
              : "Akceptuję i przechodzę do płatności"}
          </button>
        </div>
      ) : (
      <div className={styles.bankPanel}>
        <div className={styles.bankHeading}>
          <p className={styles.sectionLabel}>Przelew bankowy</p>
          <h2>Dane do przelewu</h2>
          <p>
            Wykonaj przelew dokładnie na poniższe dane. Rezerwacja zostanie
            oznaczona jako opłacona po zaksięgowaniu wpłaty przez hosta.
          </p>
        </div>

        <div className={styles.transferAmount}>
          <span>Kwota do zapłaty</span>
          <strong>{props.amountLabel}</strong>
        </div>

        <div className={styles.transferRows}>
          {BANK_TRANSFER_ROWS.map((row) => (
            <div className={styles.transferRow} key={row.id}>
              <div>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
              <button
                type="button"
                onClick={() => void copyValue(row.id, row.copyValue)}
                aria-label={`Kopiuj: ${row.label}`}
              >
                {copiedField === row.id ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>
          ))}
        </div>

        <div className={styles.bankDetails}>
          <div>
            <span>Bank</span>
            <strong>{TOKAMA_BANK_TRANSFER.bankName}</strong>
          </div>
          <div>
            <span>SWIFT / BIC</span>
            <strong>{TOKAMA_BANK_TRANSFER.swift}</strong>
          </div>
          <div>
            <span>Adres odbiorcy</span>
            <strong>{TOKAMA_BANK_TRANSFER.address}</strong>
          </div>
          <div>
            <span>NIP</span>
            <strong>{TOKAMA_BANK_TRANSFER.taxId}</strong>
          </div>
        </div>

        <p className={styles.bankNotice}>
          W tytule każdego przelewu wpisz dokładnie: <strong>pobyt w TOKAMA</strong>.
          Potwierdzenie płatności otrzymasz po zaksięgowaniu środków.
        </p>
      </div>
      )}
    </section>
  );
}

function P24DemoPaymentClient(props: PaymentClientProps) {
  const [method, setMethod] = useState<P24DemoMethod>("blik");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(props.initialStatus === "paid" ? "success" : "idle");
  const [errorMessage, setErrorMessage] = useState(
    props.initialStatus === "cancelled"
      ? "Poprzednia symulacja została odrzucona. Możesz spróbować ponownie."
      : ""
  );
  const [legalAccepted, setLegalAccepted] = useState(false);

  async function simulate(outcome: "success" | "failure") {
    if (!props.demoSessionId || !legalAccepted || status === "loading") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      await savePaymentTermsAcceptance(props);
      const response = await fetch(
        `/api/tokama-payments/p24-demo/${encodeURIComponent(
          props.paymentRequestId
        )}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: props.demoSessionId,
            method,
            outcome,
          }),
        }
      );
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.message || "Nie udało się zapisać symulacji.");
      }

      if (result.status === "paid") {
        setStatus("success");
        return;
      }

      setStatus("error");
      setErrorMessage(
        result?.message || "Symulowana płatność została odrzucona."
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Nieznany błąd symulacji."
      );
    }
  }

  if (status === "success") {
    return <SuccessScreen publicCode={props.publicCode} demo />;
  }

  return (
    <section data-tokama-payment-page className={styles.card}>
      <ReservationSummary {...props} />

      <div className={styles.p24Panel}>
        <div className={styles.demoBanner} role="status">
          <span className={styles.demoIndex}>DEMO</span>
          <div>
            <strong>Środowisko demonstracyjne</strong>
            <p>Żadne środki nie zostaną pobrane.</p>
          </div>
        </div>

        <div className={styles.p24Heading}>
          <p className={styles.sectionLabel}>Przelewy24</p>
          <h2>Wybierz sposób płatności</h2>
        </div>

        <div className={styles.methodGrid} role="radiogroup" aria-label="Metoda płatności">
          {P24_METHODS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={method === item.id}
              className={method === item.id ? styles.methodActive : styles.method}
              onClick={() => setMethod(item.id)}
            >
              <span className={styles.methodIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.methodCopy}>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span className={styles.methodIndicator} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className={styles.demoMethodDetails}>
          {method === "blik" ? (
            <label>
              <span>Kod BLIK</span>
              <input
                inputMode="numeric"
                maxLength={6}
                defaultValue="123456"
                aria-label="Kod BLIK demo"
              />
            </label>
          ) : (
            <p>
              W trybie demonstracyjnym nie podajesz prawdziwych danych
              {method === "card" ? " karty" : " portfela"}. Przejdź dalej,
              aby zobaczyć symulację wyniku.
            </p>
          )}
        </div>

        {status === "error" ? (
          <div className={styles.demoError} role="alert">
            <strong>Płatność odrzucona — symulacja</strong>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <PaymentLegalConsent accepted={legalAccepted} onChange={setLegalAccepted} />

        <button
          type="button"
          className={styles.demoSuccessButton}
          disabled={!legalAccepted || status === "loading"}
          onClick={() => void simulate("success")}
        >
          {status === "loading"
            ? "Zapisywanie..."
            : `Rezerwuję i płacę · ${props.amountLabel} · DEMO`}
        </button>

        <button
          type="button"
          className={styles.demoFailureButton}
          disabled={status === "loading"}
          onClick={() => void simulate("failure")}
        >
          Symuluj błąd płatności
        </button>

        <p className={styles.demoLegal}>
          Płatność demonstracyjna nie łączy się z bankiem ani z systemem
          Przelewy24. Służy wyłącznie do sprawdzenia przebiegu rezerwacji.
        </p>
      </div>
    </section>
  );
}

function P24PaymentClient(props: PaymentClientProps) {
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function startPayment() {
    if (!legalAccepted || status === "loading") return;
    setStatus("loading");
    setErrorMessage("");

    try {
      await savePaymentTermsAcceptance(props);
      const response = await fetch("/api/tokama-payments/p24/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_request_id: props.paymentRequestId,
          public_code: props.publicCode,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true || !result?.paymentUrl) {
        throw new Error(result?.message || "Nie udało się rozpocząć płatności.");
      }
      window.location.assign(result.paymentUrl);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Nie udało się rozpocząć płatności."
      );
    }
  }

  if (props.initialStatus === "paid") {
    return <SuccessScreen publicCode={props.publicCode} />;
  }

  return (
    <section data-tokama-payment-page className={styles.card}>
      <ReservationSummary {...props} />
      <div className={styles.p24Panel}>
        <div className={styles.p24Heading}>
          <p className={styles.sectionLabel}>Przelewy24</p>
          <h2>Bezpieczna płatność online</h2>
          <p>
            Po zaakceptowaniu warunków przejdziesz do Przelewy24, gdzie wybierzesz
            BLIK, szybki przelew, kartę lub dostępny portfel mobilny.
          </p>
        </div>
        <div className={styles.transferAmount}>
          <span>Kwota do zapłaty</span>
          <strong>{props.amountLabel}</strong>
        </div>
        <PaymentLegalConsent accepted={legalAccepted} onChange={setLegalAccepted} />
        {status === "error" ? <p className={styles.error}>{errorMessage}</p> : null}
        <button
          type="button"
          className={styles.demoSuccessButton}
          disabled={!legalAccepted || status === "loading"}
          onClick={() => void startPayment()}
        >
          {status === "loading"
            ? "Łączenie z Przelewy24..."
            : `Przejdź do płatności · ${props.amountLabel}`}
        </button>
        <p className={styles.note}>
          Dane płatnicze podajesz wyłącznie w bezpiecznym serwisie Przelewy24.
          TOKAMA nie przechowuje danych karty ani danych logowania do banku.
        </p>
      </div>
    </section>
  );
}

export default function TokamaPaymentClient(props: PaymentClientProps) {
  if (props.provider === "stripe") {
    return <StripePaymentClient {...props} />;
  }

  if (props.provider === "bank_transfer") {
    return <BankTransferPaymentClient {...props} />;
  }

  if (props.provider === "p24") {
    return <P24PaymentClient {...props} />;
  }

  return <P24DemoPaymentClient {...props} />;
}
