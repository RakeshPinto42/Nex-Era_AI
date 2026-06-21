import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Geist (Vercel) — clean, technical, AI-native. Drives body + display; mono for
// data/code. CSS vars keep the existing --font-* token names.

export const metadata: Metadata = {
  title: "NEXERA — Decentralized Intelligence Network",
  description:
    "One interface. Infinite models. NEXERA is the operating system for decentralized AI — chat, code, research, generate media and automate through a network of open models.",
  metadataBase: new URL("https://nexera.ai"),
  openGraph: {
    title: "NEXERA — Decentralized Intelligence Network",
    description: "One Interface. Infinite Models.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
