export type TokamaAnalyticsEvent =
  | "page_view"
  | "click_book_stay"
  | "view_booking"
  | "select_dates"
  | "begin_booking"
  | "booking_request_submitted"
  | "individual_offer_view"
  | "individual_offer_accept"
  | "begin_checkout"
  | "purchase"
  | "contact_click";

type AnalyticsValue = string | number | boolean | null | undefined;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackTokamaEvent(
  event: TokamaAnalyticsEvent,
  parameters: Record<string, AnalyticsValue> = {}
) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...parameters });
}

export function trackOnce(
  event: TokamaAnalyticsEvent,
  uniqueKey: string,
  parameters: Record<string, AnalyticsValue> = {}
) {
  if (typeof window === "undefined") return;

  const key = `tokama-analytics-${event}-${uniqueKey}`;
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  trackTokamaEvent(event, parameters);
}
