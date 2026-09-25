"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./TokamaCookieBanner.module.css";

const STORAGE_KEY = "tokama-cookie-consent-v1";

export function TokamaCookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const isEnglish = pathname.startsWith("/en");
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    // The consent decision exists only in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!window.localStorage.getItem(STORAGE_KEY));
  }, []);

  function saveDecision(decision: "necessary" | "all") {
    window.localStorage.setItem(STORAGE_KEY, decision);
    document.cookie = `tokama_cookie_consent=${decision}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible || isAdmin) return null;

  const t = isEnglish
    ? {
        title: "Your privacy",
        text: "We use necessary cookies to ensure the website works properly. With your consent, cookies may also help us improve TOKAMA.",
        privacy: "Privacy policy",
        cookies: "Cookie policy",
        necessary: "Necessary only",
        accept: "Accept",
      }
    : {
        title: "Twoja prywatność",
        text: "Używamy niezbędnych plików cookie, aby strona działała prawidłowo. Za Twoją zgodą pliki cookie mogą również pomagać nam rozwijać TOKAMA.",
        privacy: "Polityka prywatności",
        cookies: "Polityka cookie",
        necessary: "Tylko niezbędne",
        accept: "Akceptuję",
      };

  return (
    <aside className={styles.banner} aria-label={t.title} role="dialog" aria-live="polite">
      <div className={styles.copy}>
        <strong>{t.title}</strong>
        <p>{t.text}</p>
        <div className={styles.links}>
          <a href="/polityka-prywatnosci">{t.privacy}</a>
          <a href="/polityka-cookie">{t.cookies}</a>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => saveDecision("necessary")}>
          {t.necessary}
        </button>
        <button type="button" className={styles.primary} onClick={() => saveDecision("all")}>
          {t.accept}
        </button>
      </div>
    </aside>
  );
}
