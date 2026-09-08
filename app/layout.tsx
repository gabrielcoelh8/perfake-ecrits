import type { Metadata } from "next";
import { UnifrakturMaguntia, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import EffectsProvider from "@/components/EffectsProvider";
import { SITE_TITLE } from "@/lib/constants";

// Blackletter drop-cap font (classic-book initial letter).
const fraktur = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-fraktur",
  display: "swap",
});

// Kanji numerals on the home cards and chapter kickers (一〜十). preload:false
// keeps the heavy CJK face off the critical path; display:swap paints Times
// first and swaps the glyphs in.
const notoSerifJp = Noto_Serif_JP({
  weight: "600",
  variable: "--font-kanji",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "Contos de Gabriel Coelho — uma sinfonia em dez movimentos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraktur.variable} ${notoSerifJp.variable}`}
    >
      <body>
        <EffectsProvider>
          <NavBar />
          <main className="site-main">{children}</main>
        </EffectsProvider>
      </body>
    </html>
  );
}
