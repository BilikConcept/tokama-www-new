import type { Metadata } from "next";
import { TokamaAreaPage } from "../../components/tokama-area/TokamaAreaPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/atrakcje",
  },

  title: "Atrakcje w okolicy Iławy | TOKAMA",
  description: "Odkryj Jezioro Łabędź, Jeziorak i spokojne okolice Iławy podczas pobytu w TOKAMIE.",
};

export default function AttractionsPage() {
  return (
    <TokamaAreaPage
      eyebrow="Windyki · okolice Iławy"
      title={<>Czas, który płynie <em>wolniej.</em></>}
      lead="TOKAMA jest punktem wyjścia do dni bez pośpiechu — nad wodą, w lesie albo w pobliskiej Iławie. Wybierz to, na co naprawdę masz ochotę."
      sections={[
        {
          number: "01",
          title: "Jezioro Łabędź",
          paragraphs: [
            "Najbliżej TOKAMY jest Jezioro Łabędź: spokojne, otoczone zielenią i stworzone do bycia po prostu blisko natury.",
            "To dobre miejsce na poranny spacer, wędkowanie, chwilę nad wodą lub dłuższą trasę rowerową przez okoliczne lasy.",
          ],
          href: "/jezioro-labedz",
          linkLabel: "Poznaj Jezioro Łabędź",
        },
        {
          number: "02",
          title: "Jeziorak i Iława",
          paragraphs: [
            "Kilka chwil od Windyk czeka Iława i Jeziorak — przestrzeń dla żagli, kajaków, miejskiego spaceru oraz dnia spędzonego na wodzie.",
            "W porcie, na plaży miejskiej czy na trasie wokół jeziora łatwo ułożyć własny rytm dnia.",
          ],
          href: "/jezioro-jeziorak",
          linkLabel: "Poznaj Jeziorak",
        },
        {
          number: "03",
          title: "Pojezierze Iławskie",
          paragraphs: [
            "Lasy, jeziora i małe drogi regionu zapraszają do niespiesznego odkrywania. Wystarczy wybrać kierunek: pieszo, rowerem, kajakiem albo bez żadnego planu.",
            "Po dniu poza domkiem wracasz do ciszy, prywatności i własnego tempa pobytu w TOKAMIE.",
          ],
        },
      ]}
    />
  );
}
