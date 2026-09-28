import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka cookie",
  description:
    "Informacje o plikach cookie wykorzystywanych na stronie TOKAMA oraz zasadach ich stosowania.",
  alternates: {
    canonical: "/polityka-cookie",
  },
};

import { TokamaLegalPage, type LegalSection } from "../../components/tokama-legal/TokamaLegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Czym są pliki cookie?",
    paragraphs: [
      "Niniejsza Polityka dotyczy plików „cookies” i odnosi się do serwisu tokama.pl, dostępnego pod adresem www.tokama.pl, prowadzonego przez TKM GROUP sp. z o.o. z siedzibą przy ul. Mieszka I 20, 14-200 Iława.",
      "Przez pliki „cookies” należy rozumieć dane informatyczne, w szczególności pliki tekstowe, przechowywane w urządzeniach końcowych użytkowników, przeznaczone do korzystania ze stron internetowych. Pliki te pozwalają rozpoznać urządzenie użytkownika i odpowiednio wyświetlić stronę internetową dostosowaną do jego indywidualnych preferencji. Cookies zazwyczaj zawierają nazwę strony internetowej, z której pochodzą, czas przechowywania ich na urządzeniu końcowym oraz unikalny numer.",
    ],
  },
  {
    title: "2. Do czego używane są pliki cookie?",
    paragraphs: ["Pliki cookie używane są w celu dostosowania zawartości stron internetowych do preferencji użytkownika oraz optymalizacji korzystania ze stron internetowych. Używane są również w celu tworzenia anonimowych, zagregowanych statystyk, które pomagają zrozumieć, w jaki sposób użytkownik korzysta ze stron internetowych. Umożliwia to ulepszanie ich struktury i zawartości, z wyłączeniem personalnej identyfikacji użytkownika."],
  },
  {
    title: "3. Jakich plików cookie używamy?",
    paragraphs: ["Stosujemy trzy kategorie plików cookie: niezbędne, analityczne i reklamowe. Niezbędne odpowiadają za bezpieczeństwo, zapis preferencji oraz działanie rezerwacji i nie można ich wyłączyć. Analityczne pomagają mierzyć sposób korzystania ze strony. Reklamowe służą do pomiaru skuteczności kampanii Google Ads i Meta oraz — po uzyskaniu zgody — do dopasowywania reklam.", "Pliki analityczne i reklamowe nie są zapisywane bez zgody użytkownika. Serwis przekazuje do Google Consent Mode v2 decyzję oddzielnie dla analityki, przechowywania reklamowego, danych reklamowych i personalizacji reklam."],
  },
  {
    title: "4. Narzędzia zewnętrzne",
    paragraphs: ["Po wyrażeniu odpowiedniej zgody serwis może korzystać z Google Analytics 4, Google Ads i Meta Pixel. Narzędzia te mogą zapisywać identyfikatory urządzenia, informacje o odwiedzonych podstronach oraz zdarzenia związane z procesem rezerwacji. Do systemów analitycznych i reklamowych nie przekazujemy imienia, adresu e-mail ani numeru telefonu podanych w formularzu rezerwacji.", "Zgoda może zostać w każdej chwili zmieniona przez opcję „Ustawienia cookies” w stopce strony."],
  },
  {
    title: "5. Czy pliki cookie zawierają dane osobowe?",
    paragraphs: ["Dane osobowe gromadzone przy użyciu plików cookie mogą być zbierane wyłącznie w celu wykonywania określonych funkcji na rzecz użytkownika. Dane te są zaszyfrowane w sposób uniemożliwiający dostęp do nich osobom nieuprawnionym."],
  },
  {
    title: "6. Usuwanie plików cookie",
    paragraphs: ["Standardowo oprogramowanie służące do przeglądania stron internetowych domyślnie dopuszcza umieszczanie plików cookie na urządzeniu końcowym. Ustawienia te mogą zostać zmienione tak, aby blokować automatyczną obsługę plików cookie w ustawieniach przeglądarki internetowej bądź informować o ich każdorazowym przesłaniu na urządzenie użytkownika.", "Szczegółowe informacje o możliwości i sposobach obsługi plików cookie dostępne są w ustawieniach przeglądarki. Ograniczenie stosowania plików cookie może wpłynąć na niektóre funkcjonalności dostępne na stronie internetowej."],
  },
];

export default function CookiePolicyPage() {
  return (
    <TokamaLegalPage
      title="Polityka plików cookie"
      intro={["Ta Polityka dotyczy plików cookie używanych w serwisie TOKAMA."]}
      sections={sections}
    />
  );
}
