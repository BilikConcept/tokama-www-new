import type { Metadata } from "next";
import { TokamaEventsPage } from "../../components/tokama-events/TokamaEventsPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/eventy",
  },

  title: "Eventy w TOKAMA | przestrzeń rekreacyjno-integracyjna koło Iławy",
  description:
    "Kameralne eventy, przyjęcia i spotkania firmowe w TOKAMA w Windykach koło Iławy. Sala dla maksymalnie 40 osób, noclegi i spokojna oprawa nad jeziorem.",
};

export default function EventsPage() {
  return <TokamaEventsPage locale="pl" />;
}
