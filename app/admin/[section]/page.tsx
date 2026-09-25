import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentStudio } from "@/components/content-studio/ContentStudio";

const sections = new Set(["pobyty", "kalendarze", "ceny", "rabaty", "pakiety", "media", "strona", "artykuly", "sekcje"]);

export const metadata: Metadata = { title: "Content Studio", robots: { index: false, follow: false } };

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  return <ContentStudio />;
}
