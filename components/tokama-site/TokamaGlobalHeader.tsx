"use client";

import { usePathname } from "next/navigation";
import { TokamaSiteHeader } from "./TokamaSiteHeader";

export function TokamaGlobalHeader() {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "pl";
  if (pathname.startsWith("/admin")) return null;

  const isHome = pathname === "/" || pathname === "/en";

  return <TokamaSiteHeader locale={locale} transparentOnHero={isHome} />;
}
