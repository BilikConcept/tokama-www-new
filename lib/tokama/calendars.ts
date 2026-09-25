export type IcalEvent = {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
};

function unfoldIcal(value: string) {
  return value.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function dateKey(value: string) {
  const compact = value.trim().slice(0, 8);
  if (!/^\d{8}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function unescapeIcal(value: string) {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

export function parseIcalEvents(source: string): IcalEvent[] {
  const calendar = unfoldIcal(source);
  if (!calendar.includes("BEGIN:VCALENDAR")) {
    throw new Error("Adres nie zwrócił prawidłowego kalendarza iCal.");
  }

  return calendar
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((chunk) => chunk.split("END:VEVENT")[0] || "")
    .map((chunk) => {
      const lines = chunk.split(/\r?\n/);
      const read = (name: string) => {
        const line = lines.find((item) => item.toUpperCase().startsWith(`${name}:`) || item.toUpperCase().startsWith(`${name};`));
        return line ? line.slice(line.indexOf(":") + 1) : "";
      };
      const startDate = dateKey(read("DTSTART"));
      const endDate = dateKey(read("DTEND"));
      const status = read("STATUS").toUpperCase();

      if (!startDate || !endDate || endDate <= startDate || status === "CANCELLED") return null;

      const uid = unescapeIcal(read("UID")) || `${startDate}-${endDate}-${unescapeIcal(read("SUMMARY"))}`;
      return { uid, startDate, endDate, summary: unescapeIcal(read("SUMMARY")) };
    })
    .filter((event): event is IcalEvent => Boolean(event));
}

export function assertSafeCalendarUrl(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  const privateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

  if (url.protocol !== "https:" || hostname === "localhost" || hostname.endsWith(".local") || privateIpv4.test(hostname) || hostname === "::1") {
    throw new Error("Kalendarz musi mieć bezpieczny publiczny adres HTTPS.");
  }

  return url.toString();
}

export function escapeIcal(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function toIcalDate(value: string) {
  return value.replaceAll("-", "");
}
