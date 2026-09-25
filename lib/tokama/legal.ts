export const TOKAMA_TERMS_VERSION = "1.1-2026-09-24";
export const TOKAMA_PRIVACY_VERSION = "2.0-2026-08-22";

export const TOKAMA_TERMS_PATH = "/regulamin-rezerwacji";
export const TOKAMA_PRIVACY_PATH = "/polityka-prywatnosci";

export type LegalAcceptanceInput = {
  termsAccepted: unknown;
  termsVersion: unknown;
  privacyAcknowledged: unknown;
  privacyVersion: unknown;
};

export function validateLegalAcceptance(input: LegalAcceptanceInput) {
  if (input.termsAccepted !== true) {
    return "Akceptacja Regulaminu rezerwacji jest wymagana.";
  }

  if (input.termsVersion !== TOKAMA_TERMS_VERSION) {
    return "Regulamin został zaktualizowany. Odśwież stronę i zaakceptuj aktualną wersję.";
  }

  if (input.privacyAcknowledged !== true) {
    return "Potwierdzenie zapoznania się z Polityką prywatności jest wymagane.";
  }

  if (input.privacyVersion !== TOKAMA_PRIVACY_VERSION) {
    return "Polityka prywatności została zaktualizowana. Odśwież stronę i zapoznaj się z aktualną wersją.";
  }

  return null;
}
