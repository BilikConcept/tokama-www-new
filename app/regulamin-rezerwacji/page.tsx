import type { Metadata } from "next";
import Link from "next/link";
import {
  TokamaLegalPage,
  type LegalSection,
} from "@/components/tokama-legal/TokamaLegalPage";

export const metadata: Metadata = {
  title: "Regulamin rezerwacji",
  description:
    "Regulamin rezerwacji i świadczenia usług noclegowych TOKAMA.",
  alternates: { canonical: "/regulamin-rezerwacji" },
};

const sections: LegalSection[] = [
  {
    title: "1. Informacje o TOKAMA",
    paragraphs: [
      <>Usługodawcą i stroną umowy jest <strong>TKM GROUP sp. z o.o.</strong>, ul. Mieszka I 20, 14-200 Iława, KRS 0000979657, NIP 7441830510, REGON 522436791, kapitał zakładowy 5 000 zł.</>,
      <>Obiekt TOKAMA znajduje się pod adresem Windyki 116, 14-200 Iława. Kontakt: <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>, tel. <a href="tel:+48604811474">+48 604 811 474</a>.</>,
    ],
  },
  {
    title: "2. Definicje",
    items: [
      "TOKAMA lub Usługodawca – TKM GROUP sp. z o.o.",
      "Gość – osoba dokonująca rezerwacji albo korzystająca z usług TOKAMA.",
      "Obiekt – kompleks trzech domków TO, KA i MA w Windykach.",
      "Serwis – strona tokama.pl wraz z systemem rezerwacji.",
      "Rezerwacja – zamówienie usługi noclegowej w oznaczonym terminie.",
      "Pakiet – usługa obejmująca pobyt o dokładnie określonej liczbie nocy i wskazane świadczenia dodatkowe.",
      "Przedpłata – część albo całość ceny pobytu płatna przed przyjazdem i zaliczana na cenę Rezerwacji.",
      "Host – osoba obsługująca Rezerwacje w imieniu TOKAMA.",
    ],
  },
  {
    title: "3. Zakres usług",
    paragraphs: [
      "TOKAMA świadczy usługi krótkotrwałego zakwaterowania w domkach TO, KA i MA oraz usługi dodatkowe dostępne w Serwisie albo uzgodnione z Hostem.",
    ],
    items: [
      "System rezerwacji przyjmuje maksymalnie 7 dorosłych na jeden domek.",
      "Standardowa minimalna długość pobytu wynosi 2 noce, chyba że oferta stanowi inaczej.",
      "Pakiet obowiązuje przez dokładnie liczbę nocy wskazaną w jego opisie. Przedłużenie wymaga osobnego uzgodnienia z Hostem.",
      "Zwierzęta są akceptowane po wcześniejszym poinformowaniu TOKAMA.",
    ],
  },
  {
    title: "4. Wymagania techniczne",
    paragraphs: [
      "Do korzystania z Serwisu potrzebne są urządzenie z dostępem do Internetu, aktualna przeglądarka, aktywny adres e-mail i numer telefonu. Gość podaje prawdziwe i aktualne dane oraz nie może dostarczać treści bezprawnych.",
    ],
  },
  {
    title: "5. Proces rezerwacji",
    items: [
      "Gość wybiera termin, liczbę osób, Pakiet lub dodatki, sprawdza podsumowanie oraz wysyła prośbę o Rezerwację.",
      "Wysłanie prośby przyciskiem oznaczonym „z obowiązkiem zapłaty” tworzy obowiązek zapłaty pod warunkiem zaakceptowania terminu przez Hosta. Samo automatyczne potwierdzenie otrzymania prośby nie jest jeszcze potwierdzeniem pobytu i nie powoduje pobrania środków.",
      "Host sprawdza dostępność i może zaakceptować prośbę, odrzucić ją albo zaproponować inny termin.",
      "Po akceptacji Gość otrzymuje numer Rezerwacji, ostateczną kwotę i link do płatności.",
      "Jeżeli wiadomość nie stanowi inaczej, płatność powinna zostać wykonana w ciągu 24 godzin. Brak płatności może spowodować zwolnienie terminu.",
      "Umowa zostaje zawarta po akceptacji Regulaminu, dokonaniu wymaganej płatności i otrzymaniu końcowego potwierdzenia Rezerwacji.",
      "Rezerwacje pochodzące z Booking.com, AlohaCamp lub innych platform mogą podlegać zasadom właściwym dla danej platformy.",
    ],
  },
  {
    title: "6. Ceny",
    paragraphs: [
      "Ceny dla konsumentów są podawane w PLN i są cenami brutto. Przed wysłaniem prośby Gość widzi termin, liczbę nocy i domków, liczbę osób, cenę pobytu, dodatki, rabat i cenę łączną.",
      "Standardowa cena zależy od liczby nocy i domków. Cena Pakietu obejmuje dokładnie świadczenia opisane w ofercie. Host może skorygować wyliczenie przed akceptacją prośby, jeżeli dane były nieprawidłowe albo zakres wymaga indywidualnego ustalenia.",
    ],
  },
  {
    title: "7. Płatności",
    paragraphs: [
      "Dostępne metody mogą obejmować Przelewy24, BLIK, kartę płatniczą, przelew internetowy, Apple Pay, Google Pay, tradycyjny przelew bankowy albo metodę uzgodnioną z Hostem.",
      "TOKAMA może umożliwić zapłatę całej ceny albo wskazanej przedpłaty i pozostałej należności w terminie podanym przez Hosta. Przedpłata nie stanowi zadatku w rozumieniu Kodeksu cywilnego.",
      "Płatność uważa się za dokonaną po potwierdzeniu operatora płatności albo zaksięgowaniu przelewu. TOKAMA nie przechowuje pełnych danych kart.",
      <>Obsługę płatności internetowych prowadzi PayPro S.A., właściciel serwisu Przelewy24, ul. Pastelowa 8, 60-198 Poznań, KRS 0000347935, NIP 7792369887, REGON 301345068.</>,
      <>Operatorem kart płatniczych jest PayPro S.A. Agent Rozliczeniowy, ul. Pastelowa 8, 60-198 Poznań, wpisany do Rejestru Przedsiębiorców KRS prowadzonego przez Sąd Rejonowy Poznań – Nowe Miasto i Wilda w Poznaniu, VIII Wydział Gospodarczy KRS, pod numerem 0000347935, NIP 7792369887, REGON 301345068.</>,
    ],
  },
  {
    title: "8. Anulowanie przez Gościa",
    paragraphs: [
      <>Anulowanie należy wysłać na <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>, podając imię i nazwisko, numer Rezerwacji oraz termin pobytu. Decyduje chwila otrzymania wiadomości przez TOKAMA.</>,
    ],
    items: [
      "Co najmniej 14 dni przed przyjazdem – zwrot 100% otrzymanej płatności.",
      "Od 13 do 7 dni przed przyjazdem – zwrot 50% otrzymanej płatności.",
      "Później niż 7 dni przed przyjazdem albo w przypadku niepojawienia się – TOKAMA może zatrzymać kwotę odpowiadającą rzeczywiście poniesionej stracie, nie więcej niż 100% wartości Rezerwacji.",
      "Przy obliczaniu straty TOKAMA uwzględnia oszczędzone koszty i możliwość ponownej sprzedaży terminu.",
      "Zwrot następuje zasadniczo tą samą metodą płatności, nie później niż w ciągu 14 dni od ustalenia należnej kwoty.",
    ],
  },
  {
    title: "9. Anulowanie przez TOKAMA",
    paragraphs: [
      "TOKAMA może anulować Rezerwację w razie braku płatności, podania danych uniemożliwiających realizację, naruszenia warunków bezpieczeństwa albo niemożności świadczenia z przyczyn technicznych lub siły wyższej.",
      "Jeżeli przyczyna leży po stronie TOKAMA, Gość może wybrać dostępny termin zastępczy albo zwrot wszystkich kwot za niezrealizowaną usługę w ciągu 14 dni.",
    ],
  },
  {
    title: "10. Brak ustawowego prawa odstąpienia",
    paragraphs: [
      "Rezerwacja dotyczy usługi zakwaterowania świadczonej w oznaczonym terminie. Zgodnie z art. 38 pkt 12 ustawy o prawach konsumenta Gościowi będącemu konsumentem nie przysługuje ustawowe 14-dniowe prawo odstąpienia od tej umowy. Gość może jednak anulować pobyt na zasadach określonych w punkcie 8.",
    ],
  },
  {
    title: "11. Zasady pobytu",
    items: [
      "Doba pobytowa trwa od 15:00 w dniu przyjazdu do 11:00 w dniu wyjazdu.",
      "Wcześniejszy przyjazd lub późniejszy wyjazd wymaga zgody Hosta.",
      "W Obiekcie mogą przebywać osoby objęte Rezerwacją; dodatkowi Goście i wydarzenia wymagają zgody TOKAMA.",
      "Cisza nocna obowiązuje od 22:00 do 7:00.",
      "Palenie tytoniu i papierosów elektronicznych wewnątrz domków jest zabronione.",
      "Gość odpowiada za osoby małoletnie, zwierzęta oraz rzeczywistą, udokumentowaną szkodę wyrządzoną z jego winy.",
      "Awarię, szkodę lub zagrożenie należy niezwłocznie zgłosić Hostowi.",
    ],
  },
  {
    title: "12. Usługi dodatkowe",
    paragraphs: [
      "Cena, dostępność i sposób wykonania dodatku są prezentowane przed zamówieniem. Niektóre usługi mogą realizować partnerzy zewnętrzni. Jeśli dodatek stanie się niedostępny, TOKAMA zaproponuje zamiennik albo zwróci jego cenę.",
    ],
  },
  {
    title: "13. Reklamacje",
    paragraphs: [
      <>Reklamację można złożyć na <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a> albo listownie na adres TKM GROUP sp. z o.o., ul. Mieszka I 20, 14-200 Iława. Należy podać dane Gościa, numer Rezerwacji, opis problemu i oczekiwane rozwiązanie.</>,
      "TOKAMA odpowie na reklamację konsumenta w ciągu 14 dni. Konsument może także skorzystać z pomocy rzecznika konsumentów lub właściwego Wojewódzkiego Inspektoratu Inspekcji Handlowej.",
    ],
  },
  {
    title: "14. Dane osobowe",
    paragraphs: [
      <>Administratorem danych jest TKM GROUP sp. z o.o. Dane są przetwarzane w celu obsługi Rezerwacji, płatności, komunikacji, reklamacji, obowiązków księgowych i roszczeń. Szczegóły znajdują się w <Link href="/polityka-prywatnosci">Polityce prywatności</Link>.</>,
    ],
  },
  {
    title: "15. Akceptacja i wersje Regulaminu",
    paragraphs: [
      "Regulamin jest dostępny bezpłatnie w formie pozwalającej na zapisanie i wydrukowanie. Przed wysłaniem prośby Gość akceptuje go osobnym, domyślnie niezaznaczonym polem.",
      "TOKAMA zapisuje numer Rezerwacji, wersję Regulaminu, datę i godzinę akceptacji oraz dane techniczne potrzebne do jej udokumentowania. Dowód jest przechowywany przez okres realizacji umowy i co najmniej 2 lata po pobycie, a dłużej, jeżeli wymagają tego przepisy lub okres dochodzenia roszczeń.",
    ],
  },
  {
    title: "16. Postanowienia końcowe",
    paragraphs: [
      "Do umowy stosuje się prawo polskie, z zachowaniem bezwzględnie obowiązującej ochrony konsumenta. Do Rezerwacji stosuje się wersję Regulaminu zaakceptowaną przy jej składaniu. Indywidualnie uzgodnione warunki mają pierwszeństwo przed Regulaminem.",
    ],
  },
];

export default function BookingTermsPage() {
  return (
    <TokamaLegalPage
      title="Regulamin rezerwacji"
      updatedAt="24.09.2026"
      intro={[
        "Niniejszy Regulamin określa zasady rezerwowania i opłacania pobytów oraz korzystania z usług noclegowych TOKAMA.",
        "Wersja regulaminu: 1.1-2026-09-24.",
      ]}
      sections={sections}
      closing="W sprawach związanych z Rezerwacją skontaktuj się z TOKAMA: kontakt@tokama.pl lub +48 604 811 474."
    />
  );
}
