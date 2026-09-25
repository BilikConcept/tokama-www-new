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
    paragraphs: ["Stosowane są dwa rodzaje plików cookie: „sesyjne” oraz „stałe”. Pierwsze z nich są plikami tymczasowymi, które pozostają na urządzeniu użytkownika do wylogowania ze strony internetowej lub wyłączenia przeglądarki. „Stałe” pliki pozostają na urządzeniu użytkownika przez czas określony w parametrach plików cookie albo do momentu ich ręcznego usunięcia przez użytkownika. Pliki cookie wykorzystywane przez partnerów operatora strony internetowej podlegają ich własnej polityce prywatności."],
  },
  {
    title: "4. Czy pliki cookie zawierają dane osobowe?",
    paragraphs: ["Dane osobowe gromadzone przy użyciu plików cookie mogą być zbierane wyłącznie w celu wykonywania określonych funkcji na rzecz użytkownika. Dane te są zaszyfrowane w sposób uniemożliwiający dostęp do nich osobom nieuprawnionym."],
  },
  {
    title: "5. Usuwanie plików cookie",
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
