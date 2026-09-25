import type { Metadata } from "next";
import { TokamaCottagesPage } from "@/components/tokama-cottages/TokamaCottagesPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/en/cottages",
  },

  title: "Year-round lakeside cottages | TOKAMA",
  description: "Three year-round TOKAMA cottages in Windyki, near Iława and Lake Łabędź.",
};

export default function EnglishCottagesPage() {
  return <TokamaCottagesPage locale="en" />;
}
