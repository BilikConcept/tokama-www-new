"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackTokamaEvent } from "@/lib/tokama/analytics";

export function TokamaAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/pobyt/")) return;
    trackTokamaEvent("page_view", {
      page_path: `${pathname}${search ? `?${search}` : ""}`,
      page_title: document.title,
    });
  }, [pathname, search]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!target) return;

      const href = target.getAttribute("href") || "";
      if (href.startsWith("/rezerwacja") || href.startsWith("/en/book")) {
        trackTokamaEvent("click_book_stay", {
          link_url: href,
          link_text: target.textContent?.trim().slice(0, 100) || "",
        });
      } else if (href.startsWith("tel:") || href.startsWith("mailto:")) {
        trackTokamaEvent("contact_click", {
          contact_method: href.startsWith("tel:") ? "phone" : "email",
        });
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
