import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description:
    "Zasady przetwarzania danych osobowych oraz ochrony prywatności użytkowników strony TOKAMA.",
  alternates: {
    canonical: "/polityka-prywatnosci",
  },
};

import { TokamaLegalPage, type LegalSection } from "../../components/tokama-legal/TokamaLegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Administrator danych",
    paragraphs: [
      <>Administratorem danych osobowych, zgodnie z RODO, jest TKM GROUP sp. z o.o., NIP: 7441830510.</>,
      <>W razie jakichkolwiek pytań lub wątpliwości dotyczących przetwarzania danych osobowych prosimy o kontakt: TKM GROUP sp. z o.o., ul. Mieszka I 20, 14-200 Iława lub <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>.</>,
    ],
  },
  {
    title: "2. Rodzaje danych, które gromadzimy",
    paragraphs: ["Podczas korzystania z naszej strony internetowej możemy gromadzić następujące rodzaje danych osobowych:"],
    items: [
      "Dane identyfikacyjne, takie jak imię i nazwisko, adres e-mail, numer telefonu.",
      "Dane zbierane automatycznie, takie jak adres IP, przeglądarka internetowa i typ urządzenia, gromadzone za pomocą plików cookie oraz innych technologii śledzenia.",
    ],
  },
  {
    title: "3. Cel przetwarzania danych osobowych",
    paragraphs: ["Gromadzimy i przetwarzamy dane osobowe w celu:"],
    items: [
      "Zapewnienia dostępu i korzystania z naszej strony internetowej.",
      "Realizacji umów i zamówień.",
      "Obsługi klienta i rozwiązywania problemów.",
      "Przeprowadzania analiz i badań rynkowych w celu doskonalenia naszych usług.",
      "Marketingu i promocji naszych produktów oraz usług — za wyraźną zgodą użytkownika.",
      "Obsługi rezerwacji, płatności, wiadomości e-mail i SMS oraz dostępu do Karty Pobytu.",
      "Zapisywania dowodu zaakceptowania Regulaminu rezerwacji.",
    ],
  },
  {
    title: "4. Podstawa prawna przetwarzania danych osobowych",
    paragraphs: ["Przetwarzamy dane osobowe na podstawie różnych podstaw prawnych, w tym:"],
    items: [
      "Wykonania umowy, której użytkownik jest stroną.",
      "Ustalenia, dochodzenia lub obrony roszczeń.",
      "Prawidłowego spełnienia obowiązków prawnych.",
      "Wyraźnej zgody na przetwarzanie danych w celach marketingowych.",
    ],
  },
  {
    title: "5. Pliki cookie",
    paragraphs: ["Nasza strona internetowa wykorzystuje pliki cookie, które pomagają nam zbierać informacje o korzystaniu z serwisu. Szczegółowe informacje znajdują się w Polityce plików cookie."],
  },
  {
    title: "6. Przekazywanie danych osobowych",
    paragraphs: ["Dane osobowe mogą być przekazywane wyłącznie w zakresie niezbędnym do realizacji usług, w szczególności dostawcom hostingu i infrastruktury IT, poczty elektronicznej i SMS, księgowości, bankom oraz operatorom płatności. Przy płatnościach Przelewy24 odbiorcą niezbędnych danych transakcyjnych może być PayPro S.A., ul. Pastelowa 8, 60-198 Poznań. Dane mogą być także udostępniane organom publicznym, gdy wymagają tego przepisy."],
  },
  {
    title: "7. Okres przechowywania danych",
    items: [
      "Dane rezerwacyjne i rozliczeniowe – przez okres realizacji umowy, obowiązkowego przechowywania dokumentacji podatkowej oraz przedawnienia roszczeń.",
      "Dowód zaakceptowania Regulaminu – przez okres realizacji umowy i co najmniej 2 lata po zakończeniu pobytu, a dłużej, gdy jest to potrzebne do obrony roszczeń.",
      "Dane przetwarzane na podstawie zgody – do jej wycofania, chyba że istnieje inna podstawa dalszego przetwarzania.",
      "Dane techniczne i cookie – zgodnie z terminami wskazanymi w Polityce plików cookie.",
    ],
  },
  {
    title: "8. Ochrona danych osobowych",
    paragraphs: ["Stosujemy odpowiednie środki techniczne i organizacyjne, aby chronić dane osobowe przed dostępem nieautoryzowanym lub nielegalnym przetwarzaniem."],
  },
  {
    title: "9. Twoje prawa",
    paragraphs: ["Zgodnie z RODO użytkownik ma prawo do:"],
    items: [
      "Dostępu do swoich danych osobowych.",
      "Poprawiania błędów w swoich danych osobowych.",
      "Usunięcia swoich danych osobowych w pewnych okolicznościach.",
      "Ograniczenia przetwarzania swoich danych osobowych.",
      "Wniesienia sprzeciwu wobec przetwarzania danych w określonych sytuacjach.",
      "Przeniesienia danych osobowych do innego administratora, jeśli jest to możliwe.",
      "Wycofania zgody na przetwarzanie danych, jeśli przetwarzanie opiera się na zgodzie.",
      "Wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.",
    ],
  },
  {
    title: "10. Dobrowolność podania danych",
    paragraphs: ["Podanie danych wymaganych w formularzu rezerwacji jest dobrowolne, ale konieczne do obsługi prośby, zawarcia i wykonania umowy. Podanie danych marketingowych jest dobrowolne i nie wpływa na możliwość dokonania rezerwacji."],
  },
  {
    title: "11. Zautomatyzowane podejmowanie decyzji",
    paragraphs: ["System może automatycznie obliczać cenę, liczbę potrzebnych domków i dostępność terminu. Ostateczna akceptacja prośby o rezerwację należy do Hosta. TOKAMA nie podejmuje wobec Gości decyzji wywołujących skutki prawne wyłącznie na podstawie zautomatyzowanego profilowania."],
  },
  {
    title: "12. Zmiany w Polityce Prywatności",
    paragraphs: ["Niniejsza Polityka Prywatności może ulec zmianie. Aktualizacje zostaną opublikowane na naszej stronie internetowej, a data ostatniej aktualizacji zostanie zmieniona na górze dokumentu."],
  },
  {
    title: "13. Kontakt",
    paragraphs: [<>Jeśli masz pytania, uwagi lub wątpliwości dotyczące Polityki Prywatności, skontaktuj się z nami pod adresem <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>.</>],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <TokamaLegalPage
      title="Polityka prywatności"
      updatedAt="22.08.2026"
      intro={[
        "Niniejsza Polityka Prywatności opisuje, jak gromadzimy, przetwarzamy i chronimy Twoje dane osobowe podczas korzystania z naszej strony internetowej (https://tokama.pl).",
        "Dokładamy wszelkich starań, aby Twoje dane były bezpieczne i chronione zgodnie z wymaganiami Ogólnego Rozporządzenia o Ochronie Danych (RODO) oraz innymi obowiązującymi przepisami dotyczącymi ochrony prywatności.",
        "Wersja Polityki prywatności: 2.0-2026-08-22.",
      ]}
      sections={sections}
      closing="Dziękujemy za korzystanie z naszej strony internetowej."
    />
  );
}
