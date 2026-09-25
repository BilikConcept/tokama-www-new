import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TokamaOnsiteAccess } from "@/components/tokama-onsite/TokamaOnsiteAccess";

type Props = {
  params: Promise<{ house: string }>;
};

export const metadata: Metadata = {
  title: "Twój pobyt | TOKAMA",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnsiteStayPage({ params }: Props) {
  const { house } = await params;
  const code = house.trim().toUpperCase();

  if (!["TO", "KA", "MA"].includes(code)) {
    notFound();
  }

  return <TokamaOnsiteAccess houseCode={code} />;
}
