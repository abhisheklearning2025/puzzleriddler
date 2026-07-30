import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TrackVisit } from "@/components/analytics/TrackVisit";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-face",
  display: "swap",
});
const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PuzzleRiddler — party puzzle games",
  description: "Guess-the-emoji and dingbat riddles for a room. Pick a game, split into teams, shout the answers.",
};

// Runs before paint to set the saved skin/theme, avoiding a flash of the default.
const noFlash = `(function(){try{var s=localStorage.getItem("pr_skin");var t=localStorage.getItem("pr_theme");var r=document.documentElement;r.dataset.skin=(s==="glass"||s==="y2k")?s:"brutal";r.dataset.theme=(t==="dark")?"dark":"light";}catch(e){document.documentElement.dataset.skin="brutal";document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-skin="brutal"
      data-theme="light"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script
          id="pr-no-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: noFlash }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <TrackVisit />
      </body>
    </html>
  );
}
