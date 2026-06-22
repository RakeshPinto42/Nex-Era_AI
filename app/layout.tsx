import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// Geist (Vercel) drives body + mono (clean, technical, AI-native). Space Grotesk
// is the display face — geometric, heavy, with real character at large sizes; it
// extrudes cleanly for the dimensional headings. CSS vars keep the --font-* tokens.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
