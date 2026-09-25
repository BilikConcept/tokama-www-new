"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { blogArticles } from "@/app/blog/data";
import { MEDIA_ACCEPT, validateMediaFile } from "@/lib/content-studio/media-upload";
import { BLOCK_TYPES, createBlock, type BlockType, type StudioBlock } from "@/lib/content-studio/types";
import { ArticlePresentation } from "./ArticlePresentation";
import type { ArticleRendererMedia } from "./ArticleRenderer";
import styles from "./ContentStudio.bilik.module.css";

type Row = Record<string, any>;
type Tab = "dashboard" | "stays" | "calendars" | "pricing" | "discounts" | "packages" | "media" | "website-media" | "articles" | "sections";
const labels: Record<Tab, string> = { dashboard: "Home", stays: "Pobyty", calendars: "Kalendarze", pricing: "Ceny", discounts: "Rabaty", packages: "Pakiety", media: "Media", "website-media": "Strona", articles: "Artykuły", sections: "Sekcje" };
const paths: Record<Tab, string> = { dashboard: "/admin", stays: "/admin/pobyty", calendars: "/admin/kalendarze", pricing: "/admin/ceny", discounts: "/admin/rabaty", packages: "/admin/pakiety", media: "/admin/media", "website-media": "/admin/strona", articles: "/admin/artykuly", sections: "/admin/sekcje" };
const pathTabs = Object.fromEntries(Object.entries(paths).map(([tab, path]) => [path, tab])) as Record<string, Tab>;
const heroCopy: Record<Tab, { eyebrow: string; title: React.ReactNode; text: string }> = {
  dashboard: { eyebrow: "TOKAMA OPERATING SYSTEM", title: <>Twoja TOKAMA.<br />Jedno <em>workspace</em>.</>, text: "Pakiety, treści, media i wszystkie pobyty w jednym prywatnym centrum zarządzania." },
  stays: { eyebrow: "BOOKING & HOST", title: <>Pobyty i <em>rezerwacje</em>.</>, text: "Akceptuj prośby, wysyłaj płatności i zarządzaj pobytami z tej samej bazy co HOSTapp." },
  calendars: { eyebrow: "AVAILABILITY HUB", title: <>Jeden kalendarz.<br /><em>Zero kolizji</em>.</>, text: "Połącz TO, KA i MA z Booking.com oraz AlohaCamp, kontroluj blokady i sprawdzaj stan każdej synchronizacji." },
  pricing: { eyebrow: "DYNAMIC PRICING", title: <>Ceny pod Twoją<br /><em>kontrolą</em>.</>, text: "Ustaw cenę bazową oraz reguły dla sezonów, weekendów, świąt i wybranych dni tygodnia." },
  discounts: { eyebrow: "DISCOUNT CENTER", title: <>Kody i <em>rabaty</em>.</>, text: "Twórz promocje ograniczone terminem i dniami tygodnia, a ich wykorzystanie kontroluj w jednym miejscu." },
  packages: { eyebrow: "STAY PACKAGES", title: <>Pakiety <em>pobytowe</em>.</>, text: "Twórz oferty, przypisuj zdjęcia i łącz je bezpośrednio z systemem rezerwacji." },
  media: { eyebrow: "MEDIA LIBRARY", title: <>Zdjęcia i <em>nagrania</em>.</>, text: "Jedna biblioteka wszystkich materiałów TOKAMY wraz z opisami, tagami i użyciem." },
  "website-media": { eyebrow: "WEBSITE MEDIA", title: <>Cała strona w <em>jednym miejscu</em>.</>, text: "Zarządzaj mediami przypisanymi do każdej ważnej sekcji strony TOKAMA." },
  articles: { eyebrow: "ARTICLE STUDIO", title: <>Opowieści i <em>journal</em>.</>, text: "Zaawansowany kreator blokowy do publikowania historii TOKAMY." },
  sections: { eyebrow: "GLOBAL SECTIONS", title: <>Sekcje i <em>szablony</em>.</>, text: "Buduj elementy wielokrotnego użytku i spójne szablony publikacji." },
};
const blockLabels: Record<BlockType, string> = { text:"Tekst", eyebrow:"Eyebrow", headline:"Headline", "full-width-image":"Zdjęcie full width", "full-bleed-image":"Zdjęcie full bleed", "portrait-image":"Zdjęcie portrait", "landscape-image":"Zdjęcie landscape", "image-text":"Zdjęcie + tekst", "text-image":"Tekst + zdjęcie", "two-images":"2 zdjęcia", "three-images":"3 zdjęcia", "editorial-grid":"Editorial grid", "horizontal-gallery":"Galeria pozioma", carousel:"Karuzela", quote:"Cytat", video:"Wideo", "cottage-card":"Karta domku", "package-card":"Karta pakietu", "booking-cta":"Booking CTA", "experience-card":"Karta atrakcji", "kanzan-card":"Karta KANZAN", amenities:"Udogodnienia", "related-stay":"Powiązany pobyt" };

function supabaseBrowser() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: true } });
}

function money(cents?: number) { return cents == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(cents / 100); }
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function legacyArticleToStudio(article: (typeof blogArticles)[number]): Row {
  const blocks = article.sections.flatMap(section => {
    const headline = createBlock("headline");
    headline.content.text = section.heading;
    const text = createBlock("text");
    text.content.text = section.paragraphs.join("\n\n");
    return [headline, text];
  });
  return {
    title: article.title,
    eyebrow: article.category,
    excerpt: article.intro || article.description,
    slug: article.slug,
    status: "published",
    published_at: new Date().toISOString(),
    scheduled_at: null,
    blocks,
    seo: { title: article.title, description: article.description, author: article.author || "TOKAMA", coverMediaId: null, homepageFeatured: false, ogImageId: null, canonical: `/blog/${article.slug}`, noindex: false, jsonLd: "" },
    legacyImport: true,
  };
}

type ContentApi = (path: string, init?: RequestInit) => Promise<any>;

function uploadWithProgress(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = "Nie udało się wysłać pliku.";
      try { message = JSON.parse(request.responseText)?.message || message; } catch { /* response is not JSON */ }
      reject(new Error(message));
    });
    request.addEventListener("error", () => reject(new Error("Połączenie zostało przerwane podczas wysyłania pliku.")));
    request.addEventListener("abort", () => reject(new Error("Wysyłanie pliku zostało anulowane.")));
    const form = new FormData();
    form.append("cacheControl", "31536000");
    form.append("", file);
    request.send(form);
  });
}

async function uploadContentMedia(
  api: ContentApi,
  file: File,
  options: { altText?: string; tags?: string[]; onProgress?: (percent: number) => void } = {},
) {
  const validationError = validateMediaFile(file.name, file.type, file.size);
  if (validationError) throw new Error(validationError);
  let path = "";
  try {
    const prepared = await api("upload", {
      method: "POST",
      body: JSON.stringify({ action: "prepare", file_name: file.name, mime_type: file.type, size_bytes: file.size }),
    });
    path = prepared.data.path;
    await uploadWithProgress(prepared.data.signed_url, file, options.onProgress || (() => undefined));
    const completed = await api("upload", {
      method: "POST",
      body: JSON.stringify({
        action: "complete",
        path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: options.altText || "",
        tags: options.tags || [],
      }),
    });
    return completed.data;
  } catch (error) {
    if (path) {
      await api("upload", { method: "POST", body: JSON.stringify({ action: "cleanup", path }) }).catch(() => undefined);
    }
    throw error;
  }
}

type LoginScreenProps = {
  email: string;
  password: string;
  busy: boolean;
  message: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

function LoginScreen({ email, password, busy, message, onEmail, onPassword, onSubmit }: LoginScreenProps) {
  return <main className={styles.login}>
    <section className={styles.loginHero}>
      <video className={styles.loginVideo} autoPlay muted loop playsInline preload="metadata" src="/desktop/main-hero.mp4" />
      <div className={styles.loginOverlay} />
      <header className={styles.loginNav}>
        <Image className={styles.loginLogoImage} src="/tokama-logo.svg" alt="TOKAMA" width={162} height={40} priority />
        <span>PRIVATE ACCESS</span>
      </header>
      <div className={styles.loginCopy}>
        <p className={styles.loginEyebrow}>TOKAMA CONTENT STUDIO</p>
        <h1>Zaloguj się<br />do <em>Studio</em>.</h1>
        <p className={styles.loginLead}>Pakiety, media i opowieści TOKAMY — w jednym prywatnym miejscu.</p>
      </div>
    </section>
    <section className={styles.loginPanel}>
      <div className={styles.loginIntro}>
        <p className={styles.loginEyebrow}>SECURE LOGIN</p>
        <h2>Dostęp<br /><em>administracyjny</em>.</h2>
        <p>Po zalogowaniu zobaczysz pakiety, bibliotekę mediów i Article Studio.</p>
      </div>
      <form className={styles.loginForm} onSubmit={onSubmit}>
        <label><span>E-mail</span><input type="email" value={email} onChange={event => onEmail(event.target.value)} placeholder="admin@tokama.pl" autoComplete="email" required /></label>
        <label><span>Hasło</span><input type="password" value={password} onChange={event => onPassword(event.target.value)} placeholder="Hasło Content Studio" autoComplete="current-password" required /></label>
        <button disabled={busy}>{busy ? "Logowanie…" : "Zaloguj się"}</button>
        {message ? <span className={styles.error} role="alert">{message}</span> : null}
      </form>
    </section>
  </main>;
}

export function ContentStudio() {
  const pathname = usePathname();
  const router = useRouter();
  const tab = pathTabs[pathname] || "dashboard";
  const [client, setClient] = useState<ReturnType<typeof supabaseBrowser> | null>(null); const [token, setToken] = useState("");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loadIssues, setLoadIssues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/tokama-content/${path}`, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }) } });
    const body = await response.json(); if (!response.ok) throw new Error(body.message || "Operacja nie powiodła się."); return body;
  }, [token]);

  const hostApi = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/tokama-host/${path}`, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const body = await response.json(); if (!response.ok) throw new Error(body.message || "Operacja na pobycie nie powiodła się."); return body;
  }, [token]);

  const calendarApi = useCallback(async (path = "", init?: RequestInit) => {
    const suffix = path ? (path.startsWith("?") ? path : `/${path}`) : "";
    const response = await fetch(`/api/tokama-calendars${suffix}`, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const body = await response.json(); if (!response.ok) throw new Error(body.message || "Operacja na kalendarzu nie powiodła się."); return body;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return; setBusy(true);
    try {
      const keys = ["packages", "articles", "media", "website-media", "sections"];
      const results = await Promise.allSettled([
        ...keys.map(key => api(key)),
        hostApi("reservations"),
        calendarApi(),
      ]);
      const nextData: Record<string, Row[]> = {};
      const issues: Record<string, string> = {};
      keys.forEach((key, index) => {
        const result = results[index];
        if (result.status === "fulfilled") nextData[key] = result.value.data || [];
        else issues[key] = result.reason instanceof Error ? result.reason.message : "Błąd ładowania.";
      });
      const stays = results[keys.length];
      if (stays.status === "fulfilled") nextData.reservations = stays.value.reservations || [];
      else issues.reservations = stays.reason instanceof Error ? stays.reason.message : "Błąd ładowania pobytów.";
      const calendars = results[keys.length + 1];
      if (calendars.status === "fulfilled") {
        nextData["calendar-connections"] = calendars.value.connections || [];
        nextData["calendar-feeds"] = calendars.value.feeds || [];
        nextData["calendar-events"] = calendars.value.events || [];
        nextData["date-blocks"] = calendars.value.blocks || [];
      } else issues.calendars = calendars.reason instanceof Error ? calendars.reason.message : "Błąd ładowania kalendarzy.";
      setData(current => ({ ...current, ...nextData }));
      setLoadIssues(issues);
      if (Object.keys(issues).length) setMessage("Część modułów wymaga uwagi. Szczegóły znajdziesz na dashboardzie.");
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Błąd ładowania."); }
    finally { setBusy(false); }
  }, [api, calendarApi, hostApi, token]);

  // Supabase is initialized in the browser so static generation never requires public env values.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setClient(supabaseBrowser()); }, []);
  useEffect(() => { if (!client) return; client.auth.getSession().then(({ data }) => setToken(data.session?.access_token || "")); const { data: sub } = client.auth.onAuthStateChange((_event, session) => setToken(session?.access_token || "")); return () => sub.subscription.unsubscribe(); }, [client]);
  // Data loading follows the external auth session lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function login(event: React.FormEvent) { event.preventDefault(); if (!client) return; setBusy(true); const { error } = await client.auth.signInWithPassword({ email, password }); setMessage(error?.message || ""); setBusy(false); }
  if (!client) return <main className={styles.loginLoading}><div>TOKAMA<small>CONTENT STUDIO</small></div></main>;
  if (!token) return <LoginScreen email={email} password={password} busy={busy} message={message} onEmail={setEmail} onPassword={setPassword} onSubmit={login} />;

  const common = { api, data, reload: load, notify: setMessage };
  const copy = heroCopy[tab];
  const pending = (data.reservations || []).filter(item => item.status === "requested").length;
  return <main className={styles.shell}>
    <section className={`${styles.adminHero} ${tab === "dashboard" ? styles.adminHeroHome : styles.adminHeroModule}`}>
      <video autoPlay muted loop playsInline src="/desktop/main-hero.mp4" />
      <div className={styles.adminHeroShade} />
      <header className={styles.adminNav}>
        <Link href="/admin" aria-label="TOKAMA Content Studio"><Image src="/tokama-logo.svg" alt="TOKAMA" width={154} height={39} priority /></Link>
        <nav>{(["dashboard","stays","calendars","pricing","discounts","packages","media","website-media","articles","sections"] as Tab[]).map(key => <Link key={key} href={paths[key]} className={tab === key ? styles.active : ""}>{labels[key]}</Link>)}<button onClick={() => client.auth.signOut()}>Logout</button></nav>
      </header>
      <div className={styles.adminHeroCopy}><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.text}</span></div>
      <aside className={styles.heroStatus}><p>LIVE STATUS</p><strong>{pending ? `${pending} ${pending === 1 ? "pobyt czeka" : "pobyty czekają"}` : "Wszystko pod kontrolą"}</strong><span>{busy ? "Synchronizacja danych…" : "Content Studio i HOST są zsynchronizowane."}</span><Link href="/admin/pobyty">Otwórz pobyty</Link></aside>
    </section>
    {message ? <button className={styles.toast} onClick={() => setMessage("")}>{message} ×</button> : null}
    <section className={styles.workspace}>
      {tab === "dashboard" && <Dashboard data={data} issues={loadIssues} setTab={key => router.push(paths[key])} />}{tab === "stays" && <Stays data={data} hostApi={hostApi} reload={load} notify={setMessage} />}{tab === "calendars" && <CalendarCenter data={data} calendarApi={calendarApi} hostApi={hostApi} reload={load} notify={setMessage} issue={loadIssues.calendars} />}{tab === "pricing" && <PricingCenter hostApi={hostApi} notify={setMessage} />}{tab === "discounts" && <DiscountCenter hostApi={hostApi} notify={setMessage} />}{tab === "packages" && <Packages {...common} />}{tab === "media" && <Media {...common} />}{tab === "website-media" && <WebsiteMedia {...common} />}{tab === "articles" && <Articles {...common} />}{tab === "sections" && <Sections {...common} />}
    </section>
  </main>;
}

const weekdayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const emptyPricingRule = { name: "", price_cents: 120000, valid_from: "", valid_to: "", weekdays: [1,2,3,4,5,6,7], priority: 0, is_active: true };

function PricingCenter({ hostApi, notify }: { hostApi: (path: string, init?: RequestInit) => Promise<any>; notify: (value: string) => void }) {
  const [settings, setSettings] = useState<Row | null>(null);
  const [rules, setRules] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, rulesResult] = await Promise.all([hostApi("settings"), hostApi("pricing-rules")]);
      setSettings(settingsResult.settings || { currency: "PLN", base_price_per_house_per_night_cents: 120000 });
      setRules(rulesResult.pricingRules || []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Nie udało się wczytać cennika.");
    } finally { setLoading(false); }
  }, [hostApi, notify]);

  useEffect(() => { void loadPricing(); }, [loadPricing]);

  async function saveBasePrice() {
    if (!settings) return;
    try {
      await hostApi("settings", { method: "POST", body: JSON.stringify({ currency: settings.currency || "PLN", base_price_per_house_per_night_cents: Number(settings.base_price_per_house_per_night_cents || 0) }) });
      notify("Cena bazowa została zapisana.");
      await loadPricing();
    } catch (error) { notify(error instanceof Error ? error.message : "Nie udało się zapisać ceny."); }
  }

  async function saveRule() {
    if (!editing) return;
    try {
      await hostApi("pricing-rules", { method: "POST", body: JSON.stringify(editing) });
      setEditing(null);
      notify("Reguła cenowa została zapisana.");
      await loadPricing();
    } catch (error) { notify(error instanceof Error ? error.message : "Nie udało się zapisać reguły."); }
  }

  async function removeRule(id: string) {
    try {
      await hostApi(`pricing-rules?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setEditing(null);
      notify("Reguła cenowa została usunięta.");
      await loadPricing();
    } catch (error) { notify(error instanceof Error ? error.message : "Nie udało się usunąć reguły."); }
  }

  if (loading) return <div className={styles.page}><p className={styles.intro}>Wczytywanie cennika…</p></div>;
  return <div className={styles.page}>
    <div className={styles.toolbar}><p className={styles.intro}>Zarządzaj ceną domyślną oraz wyjątkami dla weekendów, sezonów, świąt i wybranych terminów.</p><div><button className={styles.primary} onClick={() => setEditing({ ...emptyPricingRule, weekdays: [...emptyPricingRule.weekdays] })}>+ Nowa reguła</button></div></div>
    <div className={styles.calendarStats}>
      <article><small>CENA BAZOWA / DOMEK / NOC</small><strong>{Number(settings?.base_price_per_house_per_night_cents || 0) / 100}<span> PLN</span></strong></article>
      <article><small>AKTYWNE REGUŁY</small><strong>{rules.filter(rule => rule.is_active).length}<span> / {rules.length}</span></strong></article>
      <article><small>NAJWYŻSZY PRIORYTET</small><strong>{rules.length ? Math.max(...rules.map(rule => Number(rule.priority || 0))) : 0}</strong></article>
    </div>
    <section className={styles.calendarSection}>
      <header><div><p className={styles.eyebrow}>01 · CENA DOMYŚLNA</p><h2>Stawka bazowa</h2></div><span>Używana, gdy żadna reguła nie obejmuje wybranej nocy</span></header>
      <div className={styles.pricingBaseForm}><label><span>PLN / domek / noc</span><input type="number" min="0" step="1" value={Number(settings?.base_price_per_house_per_night_cents || 0) / 100} onChange={event => setSettings(current => ({ ...(current || {}), base_price_per_house_per_night_cents: Math.round(Number(event.target.value || 0) * 100) }))} /></label><button className={styles.primary} onClick={() => void saveBasePrice()}>Zapisz cenę</button></div>
    </section>
    <section className={styles.calendarSection}>
      <header><div><p className={styles.eyebrow}>02 · REGUŁY CENOWE</p><h2>Sezony i wybrane dni</h2></div><span>Wyższy priorytet wygrywa, gdy reguły się nakładają</span></header>
      <div className={styles.pricingRules}>
      {rules.length ? rules.map(rule => <button key={rule.id} className={styles.pricingRule} onClick={() => setEditing({ ...rule, valid_from: rule.valid_from || "", valid_to: rule.valid_to || "" })}>
        <span className={rule.is_active ? styles.ruleActive : styles.ruleInactive}>{rule.is_active ? "AKTYWNA" : "WYŁĄCZONA"}</span>
        <strong>{rule.name}</strong><b>{money(rule.price_cents)}</b>
        <small>{rule.valid_from || "bez daty początkowej"} — {rule.valid_to || "bez daty końcowej"}</small>
        <em>{(rule.weekdays || []).map((day:number) => weekdayLabels[day - 1]).join(" · ")}</em>
      </button>) : <section className={styles.pricingEmpty}><span>01</span><div><strong>Na razie bez wyjątków.</strong><p>Wszystkie terminy korzystają obecnie z ceny bazowej. Dodaj pierwszą regułę, gdy chcesz wyróżnić weekend, sezon lub święta.</p></div><button onClick={() => setEditing({ ...emptyPricingRule, weekdays: [...emptyPricingRule.weekdays] })}>Utwórz pierwszą regułę →</button></section>}
      </div>
    </section>
    {editing ? <Modal title={editing.id ? "Edytuj regułę cenową" : "Nowa reguła cenowa"} close={() => setEditing(null)} save={() => void saveRule()}>
      <div className={styles.pricingForm}>
        <label><span>Nazwa reguły</span><input value={editing.name || ""} onChange={event => setEditing({ ...editing, name: event.target.value })} placeholder="np. Wakacje 2027" /></label>
        <label><span>Cena PLN / domek / noc</span><input type="number" min="0" step="1" value={Number(editing.price_cents || 0) / 100} onChange={event => setEditing({ ...editing, price_cents: Math.round(Number(event.target.value || 0) * 100) })} /></label>
        <div className={styles.pricingDates}><label><span>Obowiązuje od</span><input type="date" value={editing.valid_from || ""} onChange={event => setEditing({ ...editing, valid_from: event.target.value })} /></label><label><span>Obowiązuje do</span><input type="date" value={editing.valid_to || ""} onChange={event => setEditing({ ...editing, valid_to: event.target.value })} /></label></div>
        <fieldset><legend>Dni tygodnia</legend><div className={styles.weekdayPicker}>{weekdayLabels.map((label, index) => { const day = index + 1; const selected = (editing.weekdays || []).includes(day); return <button type="button" key={day} className={selected ? styles.weekdaySelected : ""} onClick={() => setEditing({ ...editing, weekdays: selected ? editing.weekdays.filter((value:number) => value !== day) : [...(editing.weekdays || []), day].sort() })}>{label}</button>; })}</div></fieldset>
        <label><span>Priorytet</span><input type="number" value={editing.priority || 0} onChange={event => setEditing({ ...editing, priority: Number(event.target.value || 0) })} /><small>Wyższy priorytet wygrywa, gdy kilka reguł obejmuje tę samą noc.</small></label>
        <label className={styles.pricingToggle}><input type="checkbox" checked={editing.is_active !== false} onChange={event => setEditing({ ...editing, is_active: event.target.checked })} /><span>Reguła aktywna</span></label>
        {editing.id ? <button className={styles.danger} onClick={() => void removeRule(editing.id)}>Usuń regułę</button> : null}
      </div>
    </Modal> : null}
  </div>;
}

const emptyDiscount = { code: "", discount_percent: 10, valid_from: new Date().toISOString().slice(0,10), expires_at: "", weekdays: [1,2,3,4,5,6,7], is_active: true };

function DiscountCenter({ hostApi, notify }: { hostApi: (path: string, init?: RequestInit) => Promise<any>; notify: (value: string) => void }) {
  const [codes, setCodes] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const loadCodes = useCallback(async () => {
    setLoading(true);
    try { const result = await hostApi("discount-codes"); setCodes(result.discountCodes || []); }
    catch (error) { notify(error instanceof Error ? error.message : "Nie udało się wczytać kodów."); }
    finally { setLoading(false); }
  }, [hostApi, notify]);
  useEffect(() => { void loadCodes(); }, [loadCodes]);

  async function save() {
    if (!editing) return;
    try {
      await hostApi("discount-codes", { method: editing.id ? "PATCH" : "POST", body: JSON.stringify(editing) });
      setEditing(null); notify("Kod rabatowy został zapisany."); await loadCodes();
    } catch (error) { notify(error instanceof Error ? error.message : "Nie udało się zapisać kodu."); }
  }
  async function remove(id: string) {
    try { await hostApi(`discount-codes?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setEditing(null); notify("Kod rabatowy został usunięty."); await loadCodes(); }
    catch (error) { notify(error instanceof Error ? error.message : "Nie udało się usunąć kodu."); }
  }

  if (loading) return <div className={styles.page}><p className={styles.intro}>Wczytywanie rabatów…</p></div>;
  return <div className={styles.page}>
    <div className={styles.toolbar}><p className={styles.intro}>Twórz kody promocyjne i określaj dokładnie, dla jakich dat przyjazdu oraz dni tygodnia mają działać.</p><div><button className={styles.primary} onClick={() => setEditing({ ...emptyDiscount, weekdays: [...emptyDiscount.weekdays] })}>+ Nowy kod</button></div></div>
    <div className={styles.calendarStats}>
      <article><small>WSZYSTKIE KODY</small><strong>{codes.length}</strong></article>
      <article><small>AKTYWNE</small><strong>{codes.filter(code => code.is_active).length}<span> / {codes.length}</span></strong></article>
      <article><small>NAJWYŻSZY RABAT</small><strong>{codes.length ? Math.max(...codes.map(code => Number(code.discount_percent || 0))) : 0}<span>%</span></strong></article>
    </div>
    <section className={styles.calendarSection}>
      <header><div><p className={styles.eyebrow}>KODY RABATOWE</p><h2>Promocje i terminy</h2></div><span>Kod jest sprawdzany według daty przyjazdu</span></header>
      <div className={styles.discountList}>{codes.length ? codes.map(code => <button key={code.id} onClick={() => setEditing({ ...code, valid_from: String(code.valid_from || "").slice(0,10), expires_at: String(code.expires_at || "").slice(0,10) })}>
        <span className={code.is_active ? styles.ruleActive : styles.ruleInactive}>{code.is_active ? "AKTYWNY" : "WYŁĄCZONY"}</span><strong>{code.code}</strong><b>-{code.discount_percent}%</b><small>{String(code.valid_from || "").slice(0,10)} — {code.expires_at ? String(code.expires_at).slice(0,10) : "bez końca"}</small><em>{(code.weekdays || [1,2,3,4,5,6,7]).map((day:number) => weekdayLabels[day - 1]).join(" · ")}</em>
      </button>) : <div className={styles.calendarEmpty}>Nie utworzono jeszcze żadnego kodu rabatowego.</div>}</div>
    </section>
    {editing ? <Modal title={editing.id ? `Kod ${editing.code}` : "Nowy kod rabatowy"} close={() => setEditing(null)} save={() => void save()}><div className={styles.pricingForm}>
      <label><span>Kod</span><input value={editing.code || ""} disabled={Boolean(editing.id)} onChange={event => setEditing({ ...editing, code: event.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="np. JESIEN10" /></label>
      <label><span>Wysokość rabatu (%)</span><input type="number" min="1" max="100" value={editing.discount_percent || 1} onChange={event => setEditing({ ...editing, discount_percent: Number(event.target.value || 1) })} /></label>
      <div className={styles.pricingDates}><label><span>Obowiązuje od</span><input type="date" value={editing.valid_from || ""} onChange={event => setEditing({ ...editing, valid_from: event.target.value })} /></label><label><span>Obowiązuje do</span><input type="date" value={editing.expires_at || ""} onChange={event => setEditing({ ...editing, expires_at: event.target.value })} /></label></div>
      <fieldset><legend>Dni przyjazdu</legend><div className={styles.weekdayPicker}>{weekdayLabels.map((label,index) => { const day=index+1; const selected=(editing.weekdays || []).includes(day); return <button type="button" key={day} className={selected ? styles.weekdaySelected : ""} onClick={() => setEditing({ ...editing, weekdays: selected ? editing.weekdays.filter((value:number) => value !== day) : [...(editing.weekdays || []),day].sort() })}>{label}</button>; })}</div></fieldset>
      <label className={styles.pricingToggle}><input type="checkbox" checked={editing.is_active !== false} onChange={event => setEditing({ ...editing, is_active: event.target.checked })} /><span>Kod aktywny</span></label>
      {editing.id ? <button className={styles.danger} onClick={() => void remove(editing.id)}>Usuń kod</button> : null}
    </div></Modal> : null}
  </div>;
}

function Dashboard({ data, issues, setTab }: { data: Record<string, Row[]>; issues: Record<string, string>; setTab: (tab: Tab) => void }) {
  const stats = [["Do akceptacji", data.reservations?.filter(p => p.status === "requested").length || 0], ["Połączone kalendarze", data["calendar-connections"]?.filter(p => p.is_active).length || 0], ["Aktywne pakiety", data.packages?.filter(p => p.status === "active").length || 0], ["Artykuły", data.articles?.length || 0]];
  return <div className={styles.page}><div className={styles.stats}>{stats.map(([label, value]) => <article key={label}><p>{label}</p><strong>{value}</strong></article>)}</div>{Object.keys(issues).length ? <section className={styles.systemIssues}><p className={styles.eyebrow}>SYSTEM STATUS</p><h2>Moduły wymagające uwagi</h2>{Object.entries(issues).map(([key,value])=><div key={key}><strong>{key}</strong><span>{value}</span></div>)}</section> : <section className={styles.systemHealthy}><span /> Wszystkie moduły odpowiadają prawidłowo.</section>}<div className={styles.split}><section className={styles.card}><p className={styles.eyebrow}>SZYBKIE AKCJE</p><h2>Co dziś tworzymy?</h2><div className={styles.quick}><button onClick={() => setTab("calendars")}>Kalendarze <b>↗</b></button><button onClick={() => setTab("articles")}>Nowy artykuł <b>↗</b></button><button onClick={() => setTab("packages")}>Dodaj pakiet <b>↗</b></button></div></section><section className={styles.card}><p className={styles.eyebrow}>OSTATNIE ZMIANY</p>{[...(data.articles || []), ...(data.packages || [])].sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,5).map(row => <div className={styles.activity} key={row.id}><span>{row.title || row.name}</span><small>{row.status}</small></div>)}</section></div></div>;
}

function CalendarCenter({ data, calendarApi, hostApi, reload, notify, issue }: {
  data: Record<string, Row[]>;
  calendarApi: (path?: string, init?: RequestInit) => Promise<any>;
  hostApi: (path: string, init?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  notify: (value: string) => void;
  issue?: string;
}) {
  const [provider, setProvider] = useState<"booking" | "alohacamp">("booking");
  const [houseCode, setHouseCode] = useState("TO");
  const [importUrl, setImportUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [block, setBlock] = useState({ house_code: "TO", start_date: "", end_date: "", reason: "" });
  const connections = data["calendar-connections"] || [];
  const feeds = data["calendar-feeds"] || [];
  const blocks = data["date-blocks"] || [];
  const providerName = (value: string) => value === "booking" ? "Booking.com" : "AlohaCamp";
  const houseFrom = (row: Row) => Array.isArray(row.house) ? row.house[0] : row.house;
  const formattedTime = (value?: string) => value ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Jeszcze nie synchronizowano";

  async function saveConnection(event: React.FormEvent) {
    event.preventDefault();
    setSyncing(true);
    try {
      const saved = await calendarApi("", { method: "POST", body: JSON.stringify({ provider, house_code: houseCode, import_url: importUrl }) });
      setImportUrl("");
      await calendarApi("sync", { method: "POST", body: JSON.stringify({ connection_id: saved.data.id }) });
      await reload();
      notify(`${providerName(provider)} · ${houseCode} połączony i sprawdzony.`);
    } catch (error) {
      await reload();
      notify((error as Error).message);
    } finally { setSyncing(false); }
  }

  async function sync(connectionId?: string) {
    setSyncing(true);
    try {
      const result = await calendarApi("sync", { method: "POST", body: JSON.stringify(connectionId ? { connection_id: connectionId } : {}) });
      await reload(); notify(result.message);
    } catch (error) { await reload(); notify((error as Error).message); }
    finally { setSyncing(false); }
  }

  async function toggle(connection: Row) {
    try {
      await calendarApi("", { method: "PATCH", body: JSON.stringify({ id: connection.id, is_active: !connection.is_active }) });
      await reload(); notify(connection.is_active ? "Synchronizacja wstrzymana." : "Synchronizacja wznowiona.");
    } catch (error) { notify((error as Error).message); }
  }

  async function remove(connection: Row) {
    if (!window.confirm(`Usunąć połączenie ${providerName(connection.provider)} dla domku ${houseFrom(connection)?.code || ""}?`)) return;
    try { await calendarApi(`?id=${connection.id}`, { method: "DELETE" }); await reload(); notify("Połączenie usunięte."); }
    catch (error) { notify((error as Error).message); }
  }

  async function copyFeed(url: string, code: string) {
    try { await navigator.clipboard.writeText(url); notify(`Link TOKAMA ${code} skopiowany.`); }
    catch { notify(`Nie udało się skopiować. Link: ${url}`); }
  }

  async function createBlock(event: React.FormEvent) {
    event.preventDefault();
    try {
      await hostApi("house-date-blocks/create", { method: "POST", body: JSON.stringify(block) });
      setBlock(current => ({ ...current, start_date: "", end_date: "", reason: "" }));
      await reload(); notify("Termin został zablokowany.");
    } catch (error) { notify((error as Error).message); }
  }

  async function removeBlock(item: Row) {
    try {
      await hostApi("house-date-blocks/delete", { method: "POST", body: JSON.stringify({ house_code: item.house_code, start_date: item.start_date, end_date: item.end_date }) });
      await reload(); notify("Blokada usunięta.");
    } catch (error) { notify((error as Error).message); }
  }

  if (issue) return <div className={styles.page}><section className={styles.calendarFatal}><p className={styles.eyebrow}>KALENDARZE NIEDOSTĘPNE</p><h2>Moduł wymaga uwagi.</h2><p>{issue}</p><button className={styles.primary} onClick={() => void reload()}>Spróbuj ponownie</button></section></div>;

  return <div className={styles.page}>
    <div className={styles.calendarToolbar}><div><p className={styles.eyebrow}>CHANNEL MANAGER · AUTO SYNC CO 15 MINUT</p><h2>Dostępność TO, KA i MA</h2><p>Import zajmuje terminy w rezerwacji TOKAMY. Eksport przekazuje rezerwacje TOKAMY i ręczne blokady do zewnętrznych platform. Aktywne źródła odświeżają się automatycznie — przycisk służy do dodatkowej synchronizacji na żądanie.</p></div><button className={styles.primary} disabled={syncing || !connections.some(item => item.is_active)} onClick={() => void sync()}>{syncing ? "Synchronizuję…" : "Synchronizuj teraz"}</button></div>

    <div className={styles.calendarStats}>
      <article><small>AKTYWNE ŹRÓDŁA</small><strong>{connections.filter(item => item.is_active).length}<span>/ 6</span></strong></article>
      <article><small>ZAJĘTE TERMINY Z ZEWNĄTRZ</small><strong>{data["calendar-events"]?.length || 0}</strong></article>
      <article><small>POŁĄCZENIA Z BŁĘDEM</small><strong>{connections.filter(item => item.last_status === "error").length}</strong></article>
    </div>

    <section className={styles.calendarSection}>
      <header><div><p className={styles.eyebrow}>01 · IMPORT</p><h2>Booking.com i AlohaCamp</h2></div><span>Osobny adres iCal dla każdego domku</span></header>
      {connections.length ? <div className={styles.connectionList}>{connections.map(connection => <article key={connection.id} className={connection.last_status === "error" ? styles.connectionError : ""}>
        <div className={styles.connectionIdentity}><span className={styles.connectionDot} /><div><small>{providerName(connection.provider)}</small><strong>Domek {houseFrom(connection)?.code || "—"}</strong></div></div>
        <div><small>OSTATNIA SYNCHRONIZACJA</small><strong>{formattedTime(connection.last_synced_at)}</strong></div>
        <div><small>ZAJĘTE TERMINY</small><strong>{connection.event_count || 0}</strong></div>
        <div className={styles.connectionStatus}><span>{connection.is_active ? connection.last_status : "wstrzymany"}</span>{connection.last_error ? <small>{connection.last_error}</small> : null}</div>
        <div className={styles.connectionActions}><button onClick={() => void sync(connection.id)} disabled={syncing || !connection.is_active}>Odśwież</button><button onClick={() => void toggle(connection)}>{connection.is_active ? "Wstrzymaj" : "Wznów"}</button><button onClick={() => void remove(connection)}>Usuń</button></div>
      </article>)}</div> : <div className={styles.calendarEmpty}>Nie podłączono jeszcze żadnego zewnętrznego kalendarza.</div>}
      <form className={styles.connectionForm} onSubmit={saveConnection}>
        <label><span>Platforma</span><select value={provider} onChange={event => setProvider(event.target.value as "booking" | "alohacamp")}><option value="booking">Booking.com</option><option value="alohacamp">AlohaCamp</option></select></label>
        <label><span>Domek</span><select value={houseCode} onChange={event => setHouseCode(event.target.value)}>{["TO","KA","MA"].map(code => <option key={code}>{code}</option>)}</select></label>
        <label className={styles.calendarUrl}><span>Adres importu iCal</span><input type="url" value={importUrl} onChange={event => setImportUrl(event.target.value)} placeholder="https://…/calendar.ics" autoComplete="off" required /></label>
        <button className={styles.primary} disabled={syncing}>{syncing ? "Sprawdzam…" : "Połącz i sprawdź"}</button>
      </form>
    </section>

    <section className={styles.calendarSection}>
      <header><div><p className={styles.eyebrow}>02 · EKSPORT</p><h2>Linki kalendarzy TOKAMA</h2></div><span>Te linki wklejasz w Booking.com i AlohaCamp</span></header>
      <div className={styles.feedGrid}>{feeds.map(feed => <article key={feed.id}><small>DOMEK</small><strong>{houseFrom(feed)?.code || "—"}</strong><p>{feed.url}</p><button onClick={() => void copyFeed(feed.url, houseFrom(feed)?.code || "")}>Kopiuj link</button></article>)}</div>
    </section>

    <section className={styles.calendarSection}>
      <header><div><p className={styles.eyebrow}>03 · BLOKADY</p><h2>Terminy prywatne i techniczne</h2></div><span>Widoczne również w eksportowanych kalendarzach</span></header>
      <form className={styles.blockForm} onSubmit={createBlock}>
        <label><span>Domek</span><select value={block.house_code} onChange={event => setBlock({...block,house_code:event.target.value})}>{["TO","KA","MA"].map(code => <option key={code}>{code}</option>)}</select></label>
        <label><span>Od</span><input type="date" value={block.start_date} onChange={event => setBlock({...block,start_date:event.target.value})} required /></label>
        <label><span>Do</span><input type="date" value={block.end_date} onChange={event => setBlock({...block,end_date:event.target.value})} required /></label>
        <label><span>Powód</span><input value={block.reason} onChange={event => setBlock({...block,reason:event.target.value})} placeholder="np. serwis" /></label>
        <button className={styles.primary}>Zablokuj termin</button>
      </form>
      <div className={styles.blockList}>{blocks.map(item => <article key={item.id}><strong>{item.house_code}</strong><span>{item.start_date} → {item.end_date}</span><small>{item.reason || "Blokada"}</small><button onClick={() => void removeBlock(item)}>Usuń</button></article>)}</div>
    </section>
  </div>;
}

function Stays({ data, hostApi, reload, notify }: { data: Record<string, Row[]>; hostApi: (path: string, init?: RequestInit) => Promise<any>; reload: () => Promise<void>; notify: (value: string) => void }) {
  const [filter, setFilter] = useState<"requested" | "active" | "all">("requested");
  const [selected, setSelected] = useState<Row | null>(null);
  const reservations = (data.reservations || []).filter(item => filter === "all" || (filter === "active" ? !["cancelled","rejected"].includes(item.status) : item.status === "requested"));
  async function action(path: string, body: Row = {}) {
    if (!selected) return;
    try {
      await hostApi(`reservations/${selected.id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      setSelected(null); await reload(); notify("Pobyt został zaktualizowany.");
    } catch (error) { notify((error as Error).message); }
  }
  const statusLabel: Record<string,string> = { requested:"Do akceptacji",approved:"Zaakceptowany",payment_sent:"Wysłano płatność",paid:"Opłacony",confirmed:"Potwierdzony",cancelled:"Anulowany",rejected:"Odrzucony" };
  return <div className={styles.page}>
    <div className={styles.toolbar}><p>Te same pobyty i operacje, które widzisz w HOSTapp — bez osobnej bazy danych.</p><div className={styles.filterPills}>{(["requested","active","all"] as const).map(value => <button key={value} className={filter === value ? styles.active : ""} onClick={() => setFilter(value)}>{value === "requested" ? "Do akceptacji" : value === "active" ? "Aktywne" : "Wszystkie"}</button>)}</div></div>
    <div className={styles.stayList}>{reservations.map(item => <button className={styles.stayRow} key={item.id} onClick={() => setSelected(item)}>
      <span><small>{item.public_code}</small><strong>{item.guest_name}</strong></span>
      <span><small>Termin</small><strong>{item.checkin} → {item.checkout}</strong></span>
      <span><small>Wartość</small><strong>{money(item.host_final_amount_cents || item.total_estimated_cents)}</strong></span>
      <span className={styles.stayStatus}>{statusLabel[item.status] || item.status}</span><b>→</b>
    </button>)}</div>
    {!reservations.length ? <div className={styles.emptyState}><p className={styles.eyebrow}>BRAK POBYTÓW</p><h2>W tej kolejce jest spokojnie.</h2></div> : null}
    {selected ? <Modal title={`${selected.public_code} · ${selected.guest_name}`} close={() => setSelected(null)}><div className={styles.stayDetail}>
      <div className={styles.stayFacts}><span><small>Status</small><strong>{statusLabel[selected.status] || selected.status}</strong></span><span><small>Termin</small><strong>{selected.checkin} — {selected.checkout}</strong></span><span><small>Goście</small><strong>{selected.adults} dor. · {selected.children || 0} dzieci</strong></span><span><small>Domki</small><strong>{selected.houses?.map((entry:Row) => entry.house?.code).filter(Boolean).join(", ") || selected.houses_count}</strong></span><span><small>Telefon</small><strong>{selected.guest_phone}</strong></span><span><small>E-mail</small><strong>{selected.guest_email}</strong></span><span><small>Pakiet</small><strong>{selected.package_name_at_booking || "Bez pakietu"}</strong></span><span><small>Razem</small><strong>{money(selected.host_final_amount_cents || selected.total_estimated_cents)}</strong></span></div>
      {selected.guest_message ? <div className={styles.guestMessage}><p className={styles.eyebrow}>WIADOMOŚĆ GOŚCIA</p><p>{selected.guest_message}</p></div> : null}
      <div className={styles.stayActions}>
        {selected.status === "requested" ? <><button className={styles.primary} onClick={() => void action("approve", { payment_mode: "full" })}>Akceptuj pobyt</button><button onClick={() => void action("reject", { reason: "other" })}>Odrzuć</button></> : null}
        {["approved","payment_sent"].includes(selected.status) ? <><button className={styles.primary} onClick={() => void action("create-payment-link", { provider: "p24" })}>Wyślij płatność P24</button><button onClick={() => void action("create-payment-link", { provider: "bank_transfer" })}>Wyślij zwykły przelew</button></> : null}
        {!["paid","cancelled","rejected"].includes(selected.status) ? <button onClick={() => void action("mark-paid")}>Oznacz jako opłacony</button> : null}
        {!["cancelled","rejected"].includes(selected.status) ? <button className={styles.danger} onClick={() => void action("cancel")}>Anuluj pobyt</button> : null}
      </div>
    </div></Modal> : null}
  </div>;
}

type ModuleProps = { api: (path: string, init?: RequestInit) => Promise<any>; data: Record<string, Row[]>; reload: () => Promise<void>; notify: (v: string) => void };
function Packages({ api, data, reload, notify }: ModuleProps) {
  const empty = { name:"", slug:"", eyebrow:"", headline:"", short_description:"", description:"", booking_note:"", status:"draft", regular_price_cents:0, package_price_cents:0, valid_from:"", valid_to:"", weekdays:[1,2,3,4,5,6,7], min_nights:2, max_guests:6, inclusions:[], cta_label:"Zarezerwuj pobyt", cta_href:"/rezerwacja", featured:false, sort_order:0, hero_media_id:null, gallery_media_ids:[] };
  const [editing, setEditing] = useState<Row | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const packageFileRef = useRef<HTMLInputElement>(null);
  async function save() { try { const isNew = !editing?.id; await api("packages", { method: isNew ? "POST" : "PATCH", body: JSON.stringify(editing) }); setEditing(null); await reload(); notify("Pakiet zapisany."); } catch(e){ notify((e as Error).message); } }
  async function uploadPackageMedia(file?: File) {
    if (!file || !editing) return;
    setUploadProgress(0);
    try {
      const asset = await uploadContentMedia(api, file, { tags: ["PACKAGE"], onProgress: setUploadProgress });
      setEditing(current => current ? { ...current, hero_media_id: current.hero_media_id || asset.id, gallery_media_ids: current.hero_media_id ? [...(current.gallery_media_ids || []), asset.id] : current.gallery_media_ids } : current);
      await reload(); notify("Media dodane do pakietu.");
    } catch (error) { notify((error as Error).message); }
    finally { setUploadProgress(null); if (packageFileRef.current) packageFileRef.current.value = ""; }
  }
  function toggleGallery(id:string) { if (!editing) return; const ids = editing.gallery_media_ids || []; setEditing({ ...editing, gallery_media_ids: ids.includes(id) ? ids.filter((value:string) => value !== id) : [...ids,id] }); }
  return <div className={styles.page}>
    <div className={styles.toolbar}><p>Zarządzaj ofertami, warunkami pobytu, mediami i ekspozycją na stronie.</p><button className={styles.primary} onClick={() => setEditing(empty)}>+ Nowy pakiet</button></div>
    <div className={styles.table}>{(data.packages || []).map(item => <button key={item.id} className={styles.row} onClick={() => setEditing(item)}><span><b>{item.name}</b><small>/{item.slug || slugify(item.name)}</small></span><span>{money(item.package_price_cents)}</span><span className={styles.status}>{item.status}</span><span>{item.featured ? "Featured" : "—"}</span><b>→</b></button>)}</div>
    {editing ? <Modal title={editing.id ? "Edytuj pakiet" : "Nowy pakiet"} close={() => setEditing(null)} save={save}><div className={styles.formGrid}>
      <Field label="Nazwa"><input value={editing.name} onChange={e => setEditing({...editing,name:e.target.value,slug:editing.slug || slugify(e.target.value)})}/></Field><Field label="Slug strony"><input value={editing.slug || ""} onChange={e=>setEditing({...editing,slug:slugify(e.target.value)})}/></Field>
      <Field label="Status"><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}>{["draft","active","hidden","expired"].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Eyebrow"><input value={editing.eyebrow} onChange={e=>setEditing({...editing,eyebrow:e.target.value})}/></Field>
      <Field label="Headline" wide><input value={editing.headline} onChange={e=>setEditing({...editing,headline:e.target.value})}/></Field>
      <Field label="Cena regularna (PLN)"><input type="number" value={(editing.regular_price_cents || 0)/100} onChange={e=>setEditing({...editing,regular_price_cents:+e.target.value*100})}/></Field><Field label="Cena pakietowa (PLN)"><input type="number" value={(editing.package_price_cents || 0)/100} onChange={e=>setEditing({...editing,package_price_cents:+e.target.value*100})}/></Field>
      <Field label="Od"><input type="date" value={editing.valid_from || ""} onChange={e=>setEditing({...editing,valid_from:e.target.value||null})}/></Field><Field label="Do"><input type="date" value={editing.valid_to || ""} onChange={e=>setEditing({...editing,valid_to:e.target.value||null})}/></Field>
      <Field label="Min. nocy"><input type="number" min="1" value={editing.min_nights} onChange={e=>setEditing({...editing,min_nights:+e.target.value})}/></Field><Field label="Maks. gości"><input type="number" min="1" value={editing.max_guests || ""} onChange={e=>setEditing({...editing,max_guests:+e.target.value})}/></Field>
      <Field label="Krótki opis" wide><textarea value={editing.short_description} onChange={e=>setEditing({...editing,short_description:e.target.value})}/></Field><Field label="Pełny opis" wide><textarea rows={5} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></Field>
      <Field label="Warunki i ważne informacje" wide><textarea rows={4} value={editing.booking_note || ""} onChange={e=>setEditing({...editing,booking_note:e.target.value})}/></Field><Field label="Zalety i elementy pakietu (każda pozycja w nowej linii)" wide><textarea rows={6} value={(editing.inclusions||[]).join("\n")} onChange={e=>setEditing({...editing,inclusions:e.target.value.split("\n").map((value:string)=>value.trim()).filter(Boolean)})}/></Field>
      <Field label="CTA"><input value={editing.cta_label} onChange={e=>setEditing({...editing,cta_label:e.target.value})}/></Field><Field label="Kolejność"><input type="number" value={editing.sort_order} onChange={e=>setEditing({...editing,sort_order:+e.target.value})}/></Field>
      <Field label="Ekspozycja"><label className={styles.check}><input type="checkbox" checked={editing.featured} onChange={e=>setEditing({...editing,featured:e.target.checked})}/> Featured package</label></Field>
      <div className={styles.packageMediaField}><div className={styles.mediaFieldHeader}><span>Zdjęcie lub nagranie główne</span><input ref={packageFileRef} hidden type="file" accept={MEDIA_ACCEPT} onChange={e=>void uploadPackageMedia(e.target.files?.[0])}/><button type="button" disabled={uploadProgress !== null} onClick={()=>packageFileRef.current?.click()}>{uploadProgress === null ? "+ Dodaj nowe media" : `Wysyłanie ${uploadProgress}%`}</button></div>{uploadProgress !== null ? <UploadProgress percent={uploadProgress} label="Dodawanie do pakietu" /> : null}<div className={styles.packageMediaPicker}>{(data.media||[]).map(asset=><button type="button" key={asset.id} className={editing.hero_media_id===asset.id?styles.chosen:""} onClick={()=>setEditing({...editing,hero_media_id:asset.id})}>{asset.kind==="video"?<video src={asset.public_url}/>:<img src={asset.public_url} alt={asset.alt_text}/>}<span>{editing.hero_media_id===asset.id?"GŁÓWNE":"WYBIERZ"}</span></button>)}</div></div>
      <div className={styles.packageMediaField}><div className={styles.mediaFieldHeader}><span>Galeria pakietu</span><small>{(editing.gallery_media_ids||[]).length} wybranych</small></div><div className={styles.packageMediaPicker}>{(data.media||[]).map(asset=><button type="button" key={asset.id} className={(editing.gallery_media_ids||[]).includes(asset.id)?styles.chosen:""} onClick={()=>toggleGallery(asset.id)}>{asset.kind==="video"?<video src={asset.public_url}/>:<img src={asset.public_url} alt={asset.alt_text}/>}<span>{(editing.gallery_media_ids||[]).includes(asset.id)?"DODANE":"DODAJ"}</span></button>)}</div></div>
      {editing.id && editing.slug ? <Link className={styles.publicPackageLink} href={`/pakiety/${editing.slug}`} target="_blank">Otwórz stronę pakietu ↗</Link> : null}
    </div></Modal> : null}
  </div>;
}

function Media({ api, data, reload, notify }: ModuleProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Row|null>(null);
  const [uploadState, setUploadState] = useState<{ percent: number; current: number; total: number; fileName: string } | null>(null);

  async function upload(files: FileList|null) {
    if (!files?.length) return;
    const queue = Array.from(files);
    const failures: string[] = [];
    let completed = 0;
    for (const [index, file] of queue.entries()) {
      setUploadState({ percent: Math.round((index / queue.length) * 100), current: index + 1, total: queue.length, fileName: file.name });
      try {
        await uploadContentMedia(api, file, {
          onProgress: filePercent => setUploadState({
            percent: Math.round(((index + filePercent / 100) / queue.length) * 100),
            current: index + 1,
            total: queue.length,
            fileName: file.name,
          }),
        });
        completed += 1;
      } catch (error) {
        failures.push(`${file.name}: ${(error as Error).message}`);
      }
    }
    await reload();
    setUploadState(null);
    if (fileRef.current) fileRef.current.value = "";
    if (failures.length) notify(`${completed} dodano, ${failures.length} nie dodano. ${failures[0]}`);
    else notify(queue.length === 1 ? "Medium dodane." : `Dodano ${queue.length} plików.`);
  }
  const usage = (id:string) => { const hits:string[]=[]; (data.packages||[]).forEach(p=>JSON.stringify(p).includes(id)&&hits.push(`Pakiet → ${p.name}`)); (data.articles||[]).forEach(a=>JSON.stringify(a).includes(id)&&hits.push(`Artykuł → ${a.title}`)); (data["website-media"]||[]).forEach(s=>JSON.stringify(s.media_ids).includes(id)&&hits.push(s.label)); return hits; };
  return <div className={styles.page}><div className={styles.toolbar}><p>Jedno źródło zdjęć i wideo dla całej TOKAMY.</p><input ref={fileRef} hidden type="file" accept={MEDIA_ACCEPT} multiple onChange={e=>void upload(e.target.files)}/><button className={styles.primary} disabled={uploadState !== null} onClick={()=>fileRef.current?.click()}>{uploadState ? `Wysyłanie ${uploadState.percent}%` : "+ Dodaj media"}</button></div>{uploadState ? <UploadProgress percent={uploadState.percent} label={`${uploadState.current}/${uploadState.total} · ${uploadState.fileName}`} /> : null}<div className={styles.mediaGrid}>{(data.media||[]).map(asset=><button key={asset.id} className={styles.asset} onClick={()=>setSelected(asset)}>{asset.kind==="video"?<video src={asset.public_url}/>:<img src={asset.public_url} alt={asset.alt_text}/>}<span><b>{asset.file_name}</b><small>{asset.tags?.join(" · ") || "BEZ TAGÓW"}</small></span></button>)}</div>{selected?<Modal title={selected.file_name} close={()=>setSelected(null)}><div className={styles.assetDetail}>{selected.kind==="video"?<video controls src={selected.public_url}/>:<img src={selected.public_url} alt={selected.alt_text}/>}<div><p className={styles.eyebrow}>ALT TEXT</p><p>{selected.alt_text||"Nie ustawiono"}</p><p className={styles.eyebrow}>UŻYCIE</p>{usage(selected.id).length?usage(selected.id).map(x=><p key={x}>{x}</p>):<p>Nigdzie jeszcze nie używane</p>}<button className={styles.danger} onClick={async()=>{try{await api(`media?id=${selected.id}`,{method:"DELETE"});setSelected(null);await reload();notify("Asset usunięty.");}catch(e){notify((e as Error).message)}}}>Usuń asset</button></div></div></Modal>:null}</div>;
}

function UploadProgress({ percent, label }: { percent: number; label: string }) {
  return <div className={styles.uploadProgress} role="status" aria-live="polite" aria-label={`${label}: ${percent}%`}>
    <div><span>{label}</span><strong>{percent}%</strong></div>
    <progress max="100" value={percent}>{percent}%</progress>
  </div>;
}

function WebsiteMedia({ api, data, reload, notify }: ModuleProps) {
  async function toggle(section:Row,id:string){const ids=(section.media_ids||[]).includes(id)?section.media_ids.filter((v:string)=>v!==id):[...(section.media_ids||[]),id];try{await api("website-media",{method:"PATCH",body:JSON.stringify({id:section.id,media_ids:ids})});await reload();}catch(e){notify((e as Error).message)}}
  return <div className={styles.page}><p className={styles.intro}>Przypisz media do sekcji. Kliknięcie dodaje lub usuwa asset; kolejność wynika z kolejności wyboru.</p>{(data["website-media"]||[]).map(section=><section className={styles.websiteSection} key={section.id}><div><p className={styles.eyebrow}>{section.section_key}</p><h2>{section.label}</h2><span>{section.media_ids?.length||0} assetów</span></div><div className={styles.mediaStrip}>{(data.media||[]).map(asset=><button key={asset.id} className={(section.media_ids||[]).includes(asset.id)?styles.chosen:""} onClick={()=>void toggle(section,asset.id)}><img src={asset.public_url} alt={asset.alt_text}/></button>)}</div></section>)}</div>;
}

const mediaLimits: Partial<Record<BlockType, number>> = {
  "full-width-image": 1,
  "full-bleed-image": 1,
  "portrait-image": 1,
  "landscape-image": 1,
  "image-text": 1,
  "text-image": 1,
  "two-images": 2,
  "three-images": 3,
  "editorial-grid": 6,
  "horizontal-gallery": 12,
  carousel: 12,
  video: 1,
  "cottage-card": 1,
  "package-card": 1,
  "experience-card": 1,
  "kanzan-card": 1,
  "related-stay": 1,
};

const cardBlockTypes: BlockType[] = [
  "cottage-card",
  "package-card",
  "experience-card",
  "kanzan-card",
  "related-stay",
];

function Articles({ api, data, reload, notify }: ModuleProps) {
  const [article, setArticle] = useState<Row | null>(null);
  const [device, setDevice] = useState("desktop");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const empty = {
    title: "Nowa opowieść",
    eyebrow: "JOURNAL",
    excerpt: "",
    slug: "nowa-opowiesc",
    status: "draft",
    scheduled_at: null,
    blocks: [],
    seo: { title: "", description: "", author: "TOKAMA", coverMediaId: null, homepageFeatured: false, ogImageId: null, canonical: "", noindex: false, jsonLd: "" },
  };
  const studioSlugs = new Set((data.articles || []).map(item => item.slug));
  const editableArticles = [
    ...(data.articles || []),
    ...blogArticles.filter(item => !studioSlugs.has(item.slug)).map(item => ({
      id: undefined,
      title: item.title,
      eyebrow: item.category,
      excerpt: item.intro,
      slug: item.slug,
      status: "published",
      current_version: 0,
      seo: { author: item.author || "TOKAMA" },
      legacyImport: true,
    })),
  ];

  const persist = useCallback(async (next: Row) => {
    try {
      const payload = { ...next };
      delete payload.legacyImport;
      const result = await api("articles", {
        method: next.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setArticle(result.data);
      await reload();
      notify("Autosave · zapisano");
    } catch (error) {
      notify((error as Error).message);
    }
  }, [api, reload, notify]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function change(next: Row) {
    setArticle(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 1200);
  }

  function addBlock(type: BlockType) {
    if (!article) return;
    const block = createBlock(type);
    setSelectedBlockId(block.id);
    change({ ...article, blocks: [...(article.blocks || []), block] });
  }

  function updateBlock(nextBlock: StudioBlock) {
    if (!article) return;
    change({
      ...article,
      blocks: (article.blocks || []).map((block: StudioBlock) =>
        block.id === nextBlock.id ? nextBlock : block
      ),
    });
  }

  function removeBlock(id: string) {
    if (!article) return;
    setSelectedBlockId(current => current === id ? null : current);
    change({
      ...article,
      blocks: (article.blocks || []).filter((block: StudioBlock) => block.id !== id),
    });
  }

  function move(from: number, to: number) {
    if (!article || from === to) return;
    const blocks = [...article.blocks];
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    change({ ...article, blocks });
  }

  if (article) {
    const selectedBlock = (article.blocks || []).find(
      (block: StudioBlock) => block.id === selectedBlockId
    ) as StudioBlock | undefined;

    return (
      <div className={styles.editor}>
        <div className={styles.editorTop}>
          <button type="button" onClick={() => { setArticle(null); setSelectedBlockId(null); }}>← Artykuły</button>
          <input
            className={styles.titleInput}
            value={article.title}
            aria-label="Tytuł artykułu"
            onChange={event => change({
              ...article,
              title: event.target.value,
              slug: article.id ? article.slug : slugify(event.target.value),
            })}
          />
          <select
            aria-label="Status artykułu"
            value={article.status}
            onChange={event => change({
              ...article,
              status: event.target.value,
              published_at: event.target.value === "published" ? new Date().toISOString() : article.published_at,
            })}
          >
            {["draft", "review", "scheduled", "published"].map(value => <option key={value}>{value}</option>)}
          </select>
          <button type="button" className={styles.primary} onClick={() => void persist(article)}>Zapisz</button>
        </div>

        <div className={styles.editorBody}>
          <aside className={styles.blocksPanel}>
            <p className={styles.eyebrow}>DODAJ BLOK</p>
            <div>
              {BLOCK_TYPES.map(type => (
                <button type="button" key={type} onClick={() => addBlock(type)}>
                  <span>+</span> {blockLabels[type]}
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.canvas}>
            <div className={styles.deviceSwitch}>
              {["desktop", "tablet", "mobile"].map(value => (
                <button
                  type="button"
                  className={device === value ? styles.active : ""}
                  onClick={() => setDevice(value)}
                  key={value}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className={`${styles.preview} ${styles[device]}`}>
              <ArticlePresentation
                title={article.title}
                eyebrow={article.eyebrow}
                excerpt={article.excerpt}
                author={article.seo?.author}
                publishedAt={article.published_at || article.created_at}
                coverMediaId={article.seo?.coverMediaId || article.seo?.ogImageId || null}
                coverAlt={article.seo?.coverAlt}
                blocks={article.blocks || []}
                media={(data.media || []) as ArticleRendererMedia[]}
                editor={{ selectedBlockId, onSelect: setSelectedBlockId, onMove: move, onRemove: removeBlock }}
              />
              {!(article.blocks || []).length ? (
                <button type="button" className={styles.emptyCanvas} onClick={() => addBlock("text")}>
                  <span>+</span>
                  Dodaj pierwszy blok
                </button>
              ) : null}
            </div>
          </section>

          <aside className={styles.inspector}>
            <p className={styles.eyebrow}>{selectedBlock ? "USTAWIENIA BLOKU" : "USTAWIENIA ARTYKUŁU"}</p>
            {selectedBlock ? (
              <>
                <div className={styles.selectedBlockName}>
                  <strong>{blockLabels[selectedBlock.type]}</strong>
                  <button type="button" onClick={() => setSelectedBlockId(null)}>Ustawienia artykułu</button>
                </div>
                <BlockEditor block={selectedBlock} media={data.media || []} onChange={updateBlock} />
                <BlockSettings block={selectedBlock} onChange={updateBlock} />
              </>
            ) : (
              <ArticleSettings article={article} change={change} media={data.media || []} api={api} reload={reload} notify={notify} />
            )}
            {article.id ? (
              <a className={styles.previewLink} href={`/blog/${article.slug}?preview=${article.preview_token}`} target="_blank">
                Otwórz preview ↗
              </a>
            ) : null}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <p>Komponuj historie z prawdziwych bloków editorialowych.</p>
        <button type="button" className={styles.primary} onClick={() => setArticle(empty)}>+ Nowy artykuł</button>
      </div>
      <div className={styles.articleGrid}>
        {editableArticles.map(item => {
          const coverId = item.seo?.coverMediaId || item.seo?.ogImageId;
          const cover = (data.media || []).find(asset => asset.id === coverId);
          return <button type="button" key={item.id || `legacy-${item.slug}`} onClick={() => {
            if (item.legacyImport) {
              const legacy = blogArticles.find(articleItem => articleItem.slug === item.slug);
              if (legacy) setArticle(legacyArticleToStudio(legacy));
            } else setArticle(item);
          }} aria-label={`Edytuj artykuł: ${item.title}`}>
            <div className={styles.articleCardMedia}>
              {cover ? cover.kind === "video" ? <video src={cover.public_url} muted playsInline /> : <img src={cover.public_url} alt={cover.alt_text || item.title} /> : <span>Dodaj okładkę</span>}
              {item.seo?.homepageFeatured ? <b>STRONA GŁÓWNA</b> : null}
            </div>
            <div className={styles.articleCardCopy}>
              <p className={styles.eyebrow}>{item.eyebrow}</p>
              <h2>{item.title}</h2>
              <span>{item.legacyImport ? "ISTNIEJĄCY · DO EDYCJI" : `${item.status} · v${item.current_version}`}</span>
              <strong>{item.legacyImport ? "Przenieś do Studio i edytuj →" : "Edytuj artykuł →"}</strong>
            </div>
          </button>;
        })}
      </div>
    </div>
  );
}

function ArticleSettings({ article, change, media, api, reload, notify }: {
  article: Row;
  change: (next: Row) => void;
  media: Row[];
  api: ContentApi;
  reload: () => Promise<void>;
  notify: (value: string) => void;
}) {
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const coverMediaId = article.seo?.coverMediaId || article.seo?.ogImageId || null;
  const faq = Array.isArray(article.seo?.faq) ? article.seo.faq : [];

  function selectCover(id: string | null) {
    change({ ...article, seo: { ...article.seo, coverMediaId: id, ogImageId: id } });
  }

  async function uploadCover(file?: File) {
    if (!file) return;
    setCoverProgress(0);
    try {
      const asset = await uploadContentMedia(api, file, { tags: ["ARTICLE", "COVER"], onProgress: setCoverProgress });
      selectCover(asset.id);
      await reload();
      notify("Okładka dodana i przypisana do artykułu.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setCoverProgress(null);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  }

  return (
    <>
      <Field label="Eyebrow">
        <input value={article.eyebrow} onChange={event => change({ ...article, eyebrow: event.target.value })} />
      </Field>
      <Field label="Autor">
        <input value={article.seo?.author || ""} placeholder="np. TOKAMA lub imię i nazwisko" onChange={event => change({ ...article, seo: { ...article.seo, author: event.target.value } })} />
      </Field>
      <Field label="Slug">
        <input value={article.slug} onChange={event => change({ ...article, slug: slugify(event.target.value) })} />
      </Field>
      <Field label="Excerpt">
        <textarea value={article.excerpt} onChange={event => change({ ...article, excerpt: event.target.value })} />
      </Field>
      <section className={styles.articleFeatureSettings}>
        <p className={styles.eyebrow}>EKSPOZYCJA</p>
        <label className={styles.featureToggle}>
          <input type="checkbox" checked={Boolean(article.seo?.homepageFeatured)} onChange={event => change({ ...article, seo: { ...article.seo, homepageFeatured: event.target.checked } })} />
          <span><strong>Pokaż na stronie głównej</strong><small>Ten artykuł zastąpi dotychczasową historię na homepage.</small></span>
        </label>
      </section>
      <section className={styles.articleCoverSettings}>
        <div className={styles.articleCoverHeader}>
          <div><p className={styles.eyebrow}>OKŁADKA</p><span>Widoczna na homepage, w Journalu i w artykule.</span></div>
          <input ref={coverFileRef} hidden type="file" accept={MEDIA_ACCEPT} onChange={event => void uploadCover(event.target.files?.[0])} />
          <button type="button" disabled={coverProgress !== null} onClick={() => coverFileRef.current?.click()}>{coverProgress === null ? "+ Wgraj" : `${coverProgress}%`}</button>
        </div>
        {coverProgress !== null ? <UploadProgress percent={coverProgress} label="Wysyłanie okładki" /> : null}
        <div className={styles.articleCoverPicker}>
          {media.map(asset => <button type="button" key={asset.id} className={coverMediaId === asset.id ? styles.chosen : ""} onClick={() => selectCover(asset.id)}>
            {asset.kind === "video" ? <video src={asset.public_url} muted playsInline /> : <img src={asset.public_url} alt={asset.alt_text || asset.file_name} />}
            {coverMediaId === asset.id ? <span>WYBRANA</span> : null}
          </button>)}
        </div>
        {coverMediaId ? <button type="button" className={styles.removeCover} onClick={() => selectCover(null)}>Usuń okładkę</button> : null}
      </section>
      {article.status === "scheduled" ? (
        <Field label="Publikacja">
          <input type="datetime-local" value={article.scheduled_at?.slice(0, 16) || ""} onChange={event => change({ ...article, scheduled_at: event.target.value })} />
        </Field>
      ) : null}
      <section className={styles.articleFeatureSettings}>
        <p className={styles.eyebrow}>FAQ ARTYKUŁU</p>
        <small>Bez własnych pytań strona utworzy FAQ automatycznie z nagłówków artykułu.</small>
        {faq.map((item: { question?: string; answer?: string }, index: number) => <div key={index}>
          <Field label={`Pytanie ${index + 1}`}><input value={item.question || ""} onChange={event => change({ ...article, seo: { ...article.seo, faq: faq.map((entry: Row, entryIndex: number) => entryIndex === index ? { ...entry, question: event.target.value } : entry) } })} /></Field>
          <Field label="Odpowiedź"><textarea value={item.answer || ""} onChange={event => change({ ...article, seo: { ...article.seo, faq: faq.map((entry: Row, entryIndex: number) => entryIndex === index ? { ...entry, answer: event.target.value } : entry) } })} /></Field>
          <button type="button" className={styles.removeCover} onClick={() => change({ ...article, seo: { ...article.seo, faq: faq.filter((_: Row, entryIndex: number) => entryIndex !== index) } })}>Usuń pytanie</button>
        </div>)}
        <button type="button" onClick={() => change({ ...article, seo: { ...article.seo, faq: [...faq, { question: "", answer: "" }] } })}>+ Dodaj pytanie</button>
      </section>
      <details open>
        <summary>SEO</summary>
        <Field label="SEO title"><input value={article.seo?.title || ""} onChange={event => change({ ...article, seo: { ...article.seo, title: event.target.value } })} /></Field>
        <Field label="Description"><textarea value={article.seo?.description || ""} onChange={event => change({ ...article, seo: { ...article.seo, description: event.target.value } })} /></Field>
        <Field label="Canonical"><input value={article.seo?.canonical || ""} onChange={event => change({ ...article, seo: { ...article.seo, canonical: event.target.value } })} /></Field>
        <label className={styles.check}><input type="checkbox" checked={Boolean(article.seo?.noindex)} onChange={event => change({ ...article, seo: { ...article.seo, noindex: event.target.checked } })} /> noindex</label>
        <Field label="JSON-LD"><textarea value={article.seo?.jsonLd || ""} onChange={event => change({ ...article, seo: { ...article.seo, jsonLd: event.target.value } })} /></Field>
      </details>
    </>
  );
}

function BlockSettings({ block, onChange }: { block: StudioBlock; onChange: (block: StudioBlock) => void }) {
  function setting<K extends keyof StudioBlock["settings"]>(key: K, value: StudioBlock["settings"][K]) {
    onChange({ ...block, settings: { ...block.settings, [key]: value } });
  }

  return (
    <div className={styles.blockSettings}>
      <Field label="Szerokość">
        <select value={block.settings.width} onChange={event => setting("width", event.target.value as StudioBlock["settings"]["width"])}>
          {["narrow", "content", "wide", "full"].map(value => <option key={value}>{value}</option>)}
        </select>
      </Field>
      <Field label="Wyrównanie">
        <select value={block.settings.alignment} onChange={event => setting("alignment", event.target.value as StudioBlock["settings"]["alignment"])}>
          {["left", "center", "right"].map(value => <option key={value}>{value}</option>)}
        </select>
      </Field>
      <Field label="Odstępy">
        <select value={block.settings.spacing} onChange={event => setting("spacing", event.target.value as StudioBlock["settings"]["spacing"])}>
          {["none", "small", "medium", "large", "xlarge"].map(value => <option key={value}>{value}</option>)}
        </select>
      </Field>
      <Field label="Tło">
        <select value={block.settings.background} onChange={event => setting("background", event.target.value as StudioBlock["settings"]["background"])}>
          {["white", "sand", "ink", "transparent"].map(value => <option key={value}>{value}</option>)}
        </select>
      </Field>
      <Field label="Proporcje media">
        <select value={block.settings.mediaRatio} onChange={event => setting("mediaRatio", event.target.value as StudioBlock["settings"]["mediaRatio"])}>
          {["natural", "portrait", "landscape", "square", "cinematic"].map(value => <option key={value}>{value}</option>)}
        </select>
      </Field>
      <Field label="Wysokość sekcji">
        <select value={block.settings.sectionHeight} onChange={event => setting("sectionHeight", event.target.value as StudioBlock["settings"]["sectionHeight"])}>
          {["auto", "screen", "half-screen"].map(value => <option key={value}>{value}</option>)}
        </select>
      </Field>
      <Field label="Dopasowanie zdjęcia">
        <select value={block.settings.objectFit} onChange={event => setting("objectFit", event.target.value as StudioBlock["settings"]["objectFit"])}>
          <option value="contain">bez cropowania</option>
          <option value="cover">cropuj do ramki</option>
        </select>
      </Field>
      <label className={styles.check}><input type="checkbox" checked={block.settings.hideDesktop} onChange={event => setting("hideDesktop", event.target.checked)} /> Ukryj na desktopie</label>
      <label className={styles.check}><input type="checkbox" checked={block.settings.hideMobile} onChange={event => setting("hideMobile", event.target.checked)} /> Ukryj na telefonie</label>
    </div>
  );
}

function BlockEditor({ block, media, onChange }: { block: StudioBlock; media: Row[]; onChange: (block: StudioBlock) => void }) {
  const ids = (block.content.mediaIds as string[]) || [];
  const assets = ids.map(id => media.find(asset => asset.id === id)).filter((asset): asset is Row => Boolean(asset));
  const limit = mediaLimits[block.type];
  const text = String(block.content.text || "");
  const title = String(block.content.title || "");
  const href = String(block.content.href || "");
  const ctaLabel = String(block.content.ctaLabel || "");
  const background = block.settings.background === "sand" ? "#eee9df" : block.settings.background === "ink" ? "#1b1c19" : "transparent";

  function content(patch: Record<string, unknown>) {
    onChange({ ...block, content: { ...block.content, ...patch } });
  }

  function toggleMedia(id: string) {
    if (!limit) return;
    if (ids.includes(id)) {
      content({ mediaIds: ids.filter(value => value !== id) });
      return;
    }
    content({ mediaIds: limit === 1 ? [id] : ids.length < limit ? [...ids, id] : ids });
  }

  const textOnly = ["text", "eyebrow", "headline", "quote"].includes(block.type);
  const isCard = cardBlockTypes.includes(block.type);
  const isCta = block.type === "booking-cta";
  const isAmenities = block.type === "amenities";

  return (
    <div
      className={`${styles.blockContent} ${styles[block.settings.width]} ${styles[`block_${block.type.replaceAll("-", "_")}`] || ""}`}
      style={{ textAlign: block.settings.alignment, background }}
    >
      <small>{blockLabels[block.type]}</small>

      {textOnly ? (
        <textarea
          name={`${block.id}-${block.type}-text`}
          autoComplete="off"
          className={block.type === "headline" ? styles.headlineEditor : block.type === "eyebrow" ? styles.eyebrowEditor : block.type === "quote" ? styles.quoteEditor : styles.textEditor}
          value={text}
          placeholder={block.type === "headline" ? "Wpisz nagłówek…" : block.type === "quote" ? "Wpisz cytat…" : "Zacznij pisać…"}
          onChange={event => content({ text: event.target.value, ...(block.type === "text" ? { richText: null } : {}) })}
        />
      ) : null}

      {isCta ? (
        <div className={styles.ctaEditor}>
          <input name={`${block.id}-cta-title`} autoComplete="off" value={title} placeholder="Nagłówek CTA" onChange={event => content({ title: event.target.value })} />
          <textarea name={`${block.id}-cta-text`} autoComplete="off" value={text} placeholder="Krótki opis" onChange={event => content({ text: event.target.value })} />
          <div><input name={`${block.id}-cta-label`} autoComplete="off" value={ctaLabel} placeholder="Tekst przycisku" onChange={event => content({ ctaLabel: event.target.value })} /><input name={`${block.id}-cta-link`} autoComplete="off" value={href} placeholder="Link" onChange={event => content({ href: event.target.value })} /></div>
        </div>
      ) : null}

      {isAmenities ? (
        <div className={styles.amenitiesEditor}>
          <input name={`${block.id}-amenities-title`} autoComplete="off" value={title} placeholder="Nagłówek" onChange={event => content({ title: event.target.value })} />
          <textarea name={`${block.id}-amenities-text`} autoComplete="off" value={text} placeholder="Każde udogodnienie wpisz w nowej linii" onChange={event => content({ text: event.target.value })} />
        </div>
      ) : null}

      {limit ? (
        <>
          <div className={styles.blockMediaPreview}>
            {assets.length ? assets.map(asset => asset.kind === "video" ? (
              <video key={asset.id} src={asset.public_url} controls playsInline />
            ) : (
              <img key={asset.id} src={asset.public_url} alt={asset.alt_text || ""} style={{ objectFit: block.settings.objectFit }} />
            )) : (
              <div className={styles.placeholder}>Wybierz {limit === 1 ? "media" : `do ${limit} mediów`} z biblioteki poniżej</div>
            )}
          </div>
          <div className={styles.inlineMediaPicker} aria-label="Biblioteka mediów">
            {media.map(asset => (
              <button
                type="button"
                key={asset.id}
                aria-pressed={ids.includes(asset.id)}
                className={ids.includes(asset.id) ? styles.chosen : ""}
                onClick={event => { event.stopPropagation(); toggleMedia(asset.id); }}
              >
                {asset.kind === "video" ? <video src={asset.public_url} muted /> : <img src={asset.public_url} alt={asset.alt_text || ""} />}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {isCard ? (
        <div className={styles.cardEditorFields}>
          <input name={`${block.id}-card-title`} autoComplete="off" value={title} placeholder="Tytuł karty" onChange={event => content({ title: event.target.value })} />
          <textarea name={`${block.id}-card-text`} autoComplete="off" value={text} placeholder="Opis" onChange={event => content({ text: event.target.value })} />
          <input name={`${block.id}-card-link`} autoComplete="off" value={href} placeholder="Link, np. /domki" onChange={event => content({ href: event.target.value })} />
        </div>
      ) : null}

      {limit && !isCard && !isCta ? (
        <textarea name={`${block.id}-media-text`} autoComplete="off" value={text} placeholder="Podpis lub tekst sekcji (opcjonalnie)" onChange={event => content({ text: event.target.value })} />
      ) : null}
    </div>
  );
}

function Sections({api,data,reload,notify}:ModuleProps){const [name,setName]=useState("");async function add(){try{await api("sections",{method:"POST",body:JSON.stringify({name,handle:slugify(name),kind:"section",blocks:[]})});setName("");await reload()}catch(e){notify((e as Error).message)}}return <div className={styles.page}><div className={styles.toolbar}><p>Wielokrotnego użytku sekcje i szablony artykułów.</p><div><input placeholder="Nazwa sekcji" value={name} onChange={e=>setName(e.target.value)}/><button className={styles.primary} onClick={()=>void add()}>Dodaj</button></div></div><div className={styles.articleGrid}>{(data.sections||[]).map(s=><article key={s.id}><p className={styles.eyebrow}>{s.kind}</p><h2>{s.name}</h2><span>{s.handle}</span></article>)}</div></div>}

function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}){return <label className={wide?styles.wide:""}><span>{label}</span>{children}</label>}
function Modal({title,close,save,children}:{title:string;close:()=>void;save?:()=>void;children:React.ReactNode}){return <div className={styles.modalBackdrop} onMouseDown={e=>e.currentTarget===e.target&&close()}><section className={styles.modal}><header><h2>{title}</h2><button onClick={close}>×</button></header><div className={styles.modalBody}>{children}</div>{save?<footer><button onClick={close}>Anuluj</button><button className={styles.primary} onClick={save}>Zapisz</button></footer>:null}</section></div>}
