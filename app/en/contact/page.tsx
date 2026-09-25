import type { Metadata } from "next";
import { TokamaContactPage } from "../../../components/tokama-contact/TokamaContactPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/en/contact",
  },

  title: "Contact | TOKAMA near Iława",
  description:
    "Contact TOKAMA near Iława, Poland for stays, events and gatherings by the lake.",
};

export default function ContactPage() {
  return <TokamaContactPage locale="en" />;
}
