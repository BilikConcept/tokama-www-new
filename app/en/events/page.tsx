import type { Metadata } from "next";
import { TokamaEventsPage } from "../../../components/tokama-events/TokamaEventsPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/en/events",
  },

  title: "Events at TOKAMA | venue near Iława",
  description:
    "Intimate celebrations, gatherings and company events at TOKAMA near Iława, Poland.",
};

export default function EventsPage() {
  return <TokamaEventsPage locale="en" />;
}
