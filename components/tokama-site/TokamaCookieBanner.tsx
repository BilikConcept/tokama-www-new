"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./TokamaCookieBanner.module.css";

const STORAGE_KEY = "tokama-cookie-consent-v2";
const LEGACY_STORAGE_KEY = "tokama-cookie-consent-v1";
export const OPEN_COOKIE_SETTINGS_EVENT = "tokama:open-cookie-settings";
type Consent = { analytics: boolean; marketing: boolean };

function updateGoogleConsent(consent: Consent) {
  window.gtag?.("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
  });
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "tokama_consent_update", ...consent });
}

export function TokamaCookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const isEnglish = pathname.startsWith("/en");

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const consent = JSON.parse(saved) as Consent;
          setAnalytics(Boolean(consent.analytics));
          setMarketing(Boolean(consent.marketing));
          updateGoogleConsent(consent);
        } catch { setVisible(true); }
      } else {
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const consent = { analytics: legacy === "all", marketing: legacy === "all" };
          setAnalytics(consent.analytics);
          setMarketing(consent.marketing);
          updateGoogleConsent(consent);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
        } else { setVisible(true); }
      }
    });
    function openSettings() { setCustomizing(true); setVisible(true); }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  function saveDecision(consent: Consent) {
    setAnalytics(consent.analytics);
    setMarketing(consent.marketing);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    document.cookie = `tokama_cookie_consent=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    updateGoogleConsent(consent);
    setVisible(false);
    setCustomizing(false);
  }

  if (!visible || pathname.startsWith("/admin")) return null;
  const t = isEnglish ? {
    title: "Your privacy", text: "We use essential cookies to operate the website. Analytics and advertising cookies are activated only with your consent.", privacy: "Privacy policy", cookies: "Cookie policy", reject: "Reject optional", settings: "Settings", accept: "Accept all", save: "Save choices", necessary: "Essential", necessaryText: "Required for security, booking and website operation. Always active.", analytics: "Analytics", analyticsText: "Helps us understand which content and booking steps are useful.", marketing: "Advertising", marketingText: "Allows Google Ads and Meta to measure campaigns and show relevant advertising.", always: "Always active",
  } : {
    title: "Twoja prywatność", text: "Używamy niezbędnych plików cookie do działania strony. Analitykę i pomiar reklam włączamy dopiero po Twojej zgodzie.", privacy: "Polityka prywatności", cookies: "Polityka cookie", reject: "Odrzuć opcjonalne", settings: "Ustawienia", accept: "Akceptuję wszystkie", save: "Zapisz wybór", necessary: "Niezbędne", necessaryText: "Potrzebne do bezpieczeństwa, rezerwacji i działania strony. Zawsze aktywne.", analytics: "Analityczne", analyticsText: "Pomagają nam zrozumieć, które treści i etapy rezerwacji są przydatne.", marketing: "Reklamowe", marketingText: "Pozwalają Google Ads i Meta mierzyć kampanie i wyświetlać dopasowane reklamy.", always: "Zawsze aktywne",
  };

  return <div className={styles.backdrop}><aside className={styles.banner} aria-label={t.title} role="dialog" aria-modal="true">
    <div className={styles.copy}><span className={styles.eyebrow}>TOKAMA · COOKIES</span><strong>{t.title}</strong><p>{t.text}</p>
      {customizing ? <div className={styles.preferences}>
        <div className={styles.preference}><div><b>{t.necessary}</b><small>{t.necessaryText}</small></div><span>{t.always}</span></div>
        <label className={styles.preference}><div><b>{t.analytics}</b><small>{t.analyticsText}</small></div><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
        <label className={styles.preference}><div><b>{t.marketing}</b><small>{t.marketingText}</small></div><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /></label>
      </div> : null}
      <div className={styles.links}><a href="/polityka-prywatnosci">{t.privacy}</a><a href="/polityka-cookie">{t.cookies}</a></div>
    </div>
    <div className={styles.actions}>
      <button type="button" className={styles.secondary} onClick={() => saveDecision({ analytics: false, marketing: false })}>{t.reject}</button>
      {customizing ? <button type="button" className={styles.primary} onClick={() => saveDecision({ analytics, marketing })}>{t.save}</button> : <><button type="button" className={styles.secondary} onClick={() => setCustomizing(true)}>{t.settings}</button><button type="button" className={styles.primary} onClick={() => saveDecision({ analytics: true, marketing: true })}>{t.accept}</button></>}
    </div>
  </aside></div>;
}
