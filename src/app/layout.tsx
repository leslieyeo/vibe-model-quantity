import type { Metadata } from "next";
import { Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "vibeModelQuantity — local AI coding token ledger",
  description: "Local token usage dashboard for AI coding clients.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      translate="no"
      className={`notranslate ${instrument.variable} ${geist.variable} ${geistMono.variable}`}
      data-theme="paper"
      data-accent="orange"
      data-density="comfortable"
      data-layout="right"
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="has-grain notranslate" translate="no">
        {children}
      </body>
    </html>
  );
}
