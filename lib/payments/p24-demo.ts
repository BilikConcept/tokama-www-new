export const P24_DEMO_METHODS = [
  "blik",
  "card",
  "apple_pay",
  "google_pay",
] as const;

export type P24DemoMethod = (typeof P24_DEMO_METHODS)[number];
export type P24DemoOutcome = "success" | "failure";
export type PaymentMode = "full" | "custom";

export function isP24DemoMethod(value: unknown): value is P24DemoMethod {
  return P24_DEMO_METHODS.includes(value as P24DemoMethod);
}

export function isP24DemoOutcome(value: unknown): value is P24DemoOutcome {
  return value === "success" || value === "failure";
}

export function resolvePaymentSplit(input: {
  totalCents: number;
  paymentMode: unknown;
  requestedOnlineCents: unknown;
}) {
  const totalCents = Number(input.totalCents);
  const paymentMode = input.paymentMode as PaymentMode;
  const requestedOnlineCents = Number(input.requestedOnlineCents);

  if (!Number.isInteger(totalCents) || totalCents < 100) {
    throw new Error("Reservation total is missing or too low.");
  }

  if (paymentMode !== "full" && paymentMode !== "custom") {
    throw new Error("Unsupported payment mode.");
  }

  const onlineDueCents =
    paymentMode === "full" ? totalCents : requestedOnlineCents;

  if (
    !Number.isInteger(onlineDueCents) ||
    onlineDueCents < 100 ||
    onlineDueCents > totalCents
  ) {
    throw new Error(
      "Online payment amount must be at least 1 PLN and no higher than the reservation total."
    );
  }

  return {
    paymentMode,
    onlineDueCents,
    arrivalDueCents: totalCents - onlineDueCents,
  };
}
