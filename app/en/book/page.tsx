import type { Metadata } from "next";
import { Suspense } from "react";
import { TokamaBookingPage } from "@/components/tokama/booking/TokamaBookingPage";

export const metadata: Metadata = {
  title: "Booking — Tokama",
  description:
    "Send a booking request for your stay at Tokama. The host will confirm availability and send a payment link after approval.",
  alternates: {
    canonical: "/en/book",
    languages: {
      pl: "/rezerwacja",
      en: "/en/book",
    },
  },
};

export default function EnglishBookingRoute() {
  return (
    <Suspense>
      <TokamaBookingPage locale="en" />
    </Suspense>
  );
}
