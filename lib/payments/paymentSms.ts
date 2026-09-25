import { TOKAMA_BANK_TRANSFER } from "./bank-transfer.ts";

export function buildPaymentSms(input: {
  locale: "pl" | "en";
  publicCode: string;
  amount: string;
  paymentPageUrl: string;
}) {
  if (input.locale === "en") {
    return `Your TOKAMA stay has been accepted.

Reservation: ${input.publicCode}
Amount: ${input.amount}
Payment page: ${input.paymentPageUrl}

Bank transfer:
Recipient: ${TOKAMA_BANK_TRANSFER.recipient}
Account: ${TOKAMA_BANK_TRANSFER.accountNumber}
SWIFT: ${TOKAMA_BANK_TRANSFER.swift}
Title: ${TOKAMA_BANK_TRANSFER.transferTitle}`;
  }

  return `Pobyt w TOKAMA został zaakceptowany.

Rezerwacja: ${input.publicCode}
Kwota: ${input.amount}
Dane do przelewu: ${input.paymentPageUrl}

Przelew bankowy:
Odbiorca: ${TOKAMA_BANK_TRANSFER.recipient}
Konto: ${TOKAMA_BANK_TRANSFER.accountNumber}
Bank: ${TOKAMA_BANK_TRANSFER.bankName}
Tytuł: ${TOKAMA_BANK_TRANSFER.transferTitle}`;
}
