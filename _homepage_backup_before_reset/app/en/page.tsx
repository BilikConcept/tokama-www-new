import type { Metadata } from "next";
import { TokamaHome } from "@/components/tokama-home/TokamaHome";

export const metadata: Metadata = {
  title: "TOKAMA — lakeside cottages near Iława",
  description: "Three year-round lakeside cottages in Windyki near Iława.",
};

export default function EnglishHomePage() {
  return <TokamaHome locale="en" />;
}
