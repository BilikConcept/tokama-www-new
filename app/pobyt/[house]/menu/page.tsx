import { notFound } from "next/navigation";
import { TokamaOnsiteMenu } from "@/components/tokama-onsite/TokamaOnsiteMenu";

type Props = {
  params: Promise<{ house: string }>;
};

export const metadata = {
  title: "Menu podczas pobytu | TOKAMA",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnsiteMenuPage({ params }: Props) {
  const { house } = await params;
  const houseCode = house.trim().toUpperCase();

  if (!["TO", "KA", "MA"].includes(houseCode)) {
    notFound();
  }

  return <TokamaOnsiteMenu houseCode={houseCode} />;
}
