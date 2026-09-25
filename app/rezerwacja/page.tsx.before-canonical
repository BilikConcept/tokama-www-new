import type { Metadata } from "next";
import { Suspense } from "react";
import { TokamaBookingPage } from "@/components/tokama/booking/TokamaBookingPage";

export const metadata: Metadata = {
  title: "Rezerwacja — Tokama",
  description:
    "Wyślij prośbę o rezerwację pobytu w Tokamie. Host potwierdzi dostępność i wyśle link do płatności po akceptacji.",
  alternates: {
    canonical: "/rezerwacja",
    languages: {
      pl: "/rezerwacja",
      en: "/en/book",
    },
  },
};

export default function BookingRoute() {
  return (
    <Suspense>
      <TokamaBookingPage locale="pl" />
    </Suspense>
  );
}
