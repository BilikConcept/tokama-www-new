import { TokamaCookieBanner } from "../components/tokama-site/TokamaCookieBanner";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { SmoothScrollProvider } from "@/components/system/SmoothScrollProvider";
import { ScrollRevealProvider } from "@/components/system/ScrollRevealProvider";
import { TokamaGlobalHeader } from "@/components/tokama-site/TokamaGlobalHeader";
import { TokamaGlobalFooter } from "@/components/tokama-site/TokamaGlobalFooter";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tokama.pl"),

  title: {
    default: "TOKAMA — domki nad jeziorem",
    template: "%s | TOKAMA",
  },

  description:
    "TOKAMA to trzy całoroczne domki nad jeziorem w Windykach koło Iławy. Kameralne pobyty blisko natury, basen, sauna, jacuzzi i dostęp do Jezioraka.",

  applicationName: "TOKAMA",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    title: "TOKAMA — domki nad jeziorem",
    description:
      "Trzy całoroczne domki nad jeziorem w Windykach koło Iławy. Kameralne pobyty blisko natury.",
    url: "https://tokama.pl",
    siteName: "TOKAMA",
    locale: "pl_PL",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "TOKAMA — domki nad jeziorem",
    description:
      "Trzy całoroczne domki nad jeziorem w Windykach koło Iławy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={dmSans.variable}>
      <body>
        <SmoothScrollProvider>
          <TokamaGlobalHeader />
          <ScrollRevealProvider>{children}</ScrollRevealProvider>
          <TokamaGlobalFooter />
        </SmoothScrollProvider>

        <TokamaCookieBanner />
      </body>
    </html>
  );
}
