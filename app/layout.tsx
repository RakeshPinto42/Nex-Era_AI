import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Poppins } from "next/font/google";
import "./globals.css";

// Geist (Vercel) drives body + mono (clean, technical, AI-native). Poppins is the
// display face — a friendly geometric-rounded sans that gives headings the warm,
// approachable character of the Command Center design language. CSS vars keep the
// --font-* tokens so callers using `font-display` pick it up app-wide.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${poppins.variable}`} style={{ colorScheme: "light" }}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
