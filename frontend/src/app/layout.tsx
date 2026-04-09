import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Cairo, Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f1ea" }],
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      dir="ltr"
      suppressHydrationWarning
      className="h-full"
      data-theme="light"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${cairo.variable} min-h-dvh min-h-full overflow-x-clip bg-[var(--bg)] font-sans text-[var(--fg)] antialiased [font-feature-settings:'cv02','cv03','cv04','cv11']`}
      >
        {children}
      </body>
    </html>
  );
}
