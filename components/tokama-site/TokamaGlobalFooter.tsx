"use client";

import { usePathname } from "next/navigation";
import { TokamaSiteFooter } from "./TokamaSiteFooter";

export function TokamaGlobalFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/pobyt/")) {
    return null;
  }

  return <TokamaSiteFooter locale={pathname.startsWith("/en") ? "en" : "pl"} />;
}
