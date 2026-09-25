type StayCardSmsInput = {
  locale: "pl" | "en";
  publicCode: string;
  houseCodes: string[];
};

function formatHouseCodes(houseCodes: string[]) {
  return houseCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean)
    .join(", ");
}

export function buildStayCardSms(input: StayCardSmsInput) {
  const houseCodes = formatHouseCodes(input.houseCodes);

  if (input.locale === "en") {
    return `TOKAMA
Reservation number: ${input.publicCode}
${input.houseCodes.length > 1 ? "Cottages" : "Cottage"}: ${houseCodes}.

Use this number after scanning the QR code in your cottage to open your Stay Card. In the Stay Card you can order KANZAN Food & Cocktails and other services for your stay.

See you soon.`;
  }

  return `TOKAMA
Numer rezerwacji: ${input.publicCode}
${input.houseCodes.length > 1 ? "Domki" : "Domek"}: ${houseCodes}.

Ten numer służy do otwarcia Karty Pobytu po zeskanowaniu QR w domku. W Karcie Pobytu zamówisz KANZAN Food & Cocktails i inne usługi na czas pobytu.

Do zobaczenia.`;
}
