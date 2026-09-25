import type { Metadata } from "next";
import { TokamaContactPage } from "../../components/tokama-contact/TokamaContactPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/kontakt",
  },

  title: "Kontakt | TOKAMA — domki nad jeziorem koło Iławy",
  description:
    "Skontaktuj się z TOKAMA w Windykach koło Iławy. Pytania o pobyt, rezerwacje, eventy i organizację spotkań.",
};

export default function ContactPage() {
  return <TokamaContactPage locale="pl" />;
}
