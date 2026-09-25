import { notFound } from "next/navigation";
import { TokamaOnsiteDashboard } from "@/components/tokama-onsite/TokamaOnsiteDashboard";

type Props = {
  params: Promise<{ house: string }>;
};

export const metadata = {
  title: "Mój pobyt | TOKAMA",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnsitePanelPage({ params }: Props) {
  const { house } = await params;
  const houseCode = house.trim().toUpperCase();

  if (!["TO", "KA", "MA"].includes(houseCode)) {
    notFound();
  }

  return <TokamaOnsiteDashboard houseCode={houseCode} />;
}
