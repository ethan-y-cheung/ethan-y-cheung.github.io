import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display serif — wonky old-style curves at large sizes (SOFT/WONK axes). */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

/** Body serif drawn for on-screen reading; italics carry the book pages. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Ethan Cheung",
  description: "The collected works of Ethan Cheung — a portfolio read like a book.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The catalog pages set data-catalog-theme on <html> pre-paint (inline
      // script in their Shell), so the server HTML legitimately differs.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${newsreader.variable} h-full antialiased`}
    >
      {/* ReadingLight lives on the pages that want it (the book), not here —
          the catalog wing is deliberately free of the following lamp. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
