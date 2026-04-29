import type { Metadata } from "next";
import "./globals.css";
import { Cormorant_Garamond, Inter, Pinyon_Script } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { StateProvider } from "@/lib/state";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const script = Pinyon_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "La Di Da — your AI atelier",
  description:
    "Bombshell looks on demand. A verified-self AI photo & video studio for dancers and adult creators.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${script.variable}`}>
      <body className="min-h-screen bg-cream antialiased">
        <StateProvider>
          <div className="pointer-events-none fixed inset-0 -z-10 bg-silk-blush opacity-60" />
          <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60vh] bg-boudoir-glow" />
          <TopBar />
          <main className="relative">{children}</main>
          <Footer />
        </StateProvider>
      </body>
    </html>
  );
}
