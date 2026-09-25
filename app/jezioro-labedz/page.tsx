import type { Metadata } from "next";
import { TokamaAreaPage } from "../../components/tokama-area/TokamaAreaPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/jezioro-labedz",
  },

  title: "Jezioro Łabędź | Domki nad jeziorem TOKAMA",
  description: "Spokojny wypoczynek nad Jeziorem Łabędź w Windykach koło Iławy.",
};

export default function SwanLakePage() {
  return (
    <TokamaAreaPage
      eyebrow="Windyki · okolice TOKAMY"
      title={<>Jezioro <em>Łabędź.</em></>}
      lead="Blisko, naturalnie i bez potrzeby układania wielkiego planu. Jezioro Łabędź jest jednym z tych miejsc, które najlepiej odkrywa się we własnym tempie."
      sections={[
        {
          number: "01",
          title: "Blisko wody",
          paragraphs: [
            "Jezioro Łabędź to spokojna część krajobrazu Windyk. Zieleń, las i otwarta przestrzeń wokół wody tworzą warunki do prawdziwego oddechu od miejskiego rytmu.",
            "Poranki mogą zacząć się tu od spaceru, a wieczory od ciszy, która nie potrzebuje żadnej oprawy.",
          ],
        },
        {
          number: "02",
          title: "Na własnych zasadach",
          paragraphs: [
            "Okolica sprzyja zarówno aktywnemu dniu, jak i temu całkiem wolnemu. Możesz wybrać rower, wędkowanie, czas nad wodą albo po prostu dłuższy spacer leśną drogą.",
            "To miejsce dla osób, które nie szukają atrakcji na każdą godzinę — tylko miejsca, w którym można spokojnie pobyć.",
          ],
        },
        {
          number: "03",
          title: "Powrót do TOKAMY",
          paragraphs: [
            "Po dniu nad jeziorem wracasz do własnego domku, prywatnej przestrzeni i wszystkiego, czego potrzeba do niespiesznego wieczoru.",
            "TOKAMA pozwala połączyć bliskość natury z komfortem pobytu — o każdej porze roku.",
          ],
        },
      ]}
    />
  );
}
