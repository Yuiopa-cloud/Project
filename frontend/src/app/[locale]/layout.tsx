import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/navbar";
import { TopAnnouncementMarquee } from "@/components/top-announcement-marquee";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleHtmlAttributes } from "@/components/locale-html";
import { CartProvider } from "@/contexts/cart-context";
import { SiteFooter } from "@/components/site-footer";
import { GoogleAnalytics } from "@/components/google-analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://atlas-auto.ma"),
  title: {
    default: "Atlas Auto — Accessoires automobile Maroc",
    template: "%s | Atlas Auto",
  },
  description:
    "E-commerce accessoires auto premium au Maroc. MAD, livraison par ville, paiement à la livraison, WhatsApp.",
  openGraph: {
    title: "Atlas Auto Morocco",
    description: "Premium automotive accessories — Casablanca & nationwide zones.",
    locale: "fr_MA",
    type: "website",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleHtmlAttributes locale={locale} dir={dir} />
      <ThemeProvider>
        <CartProvider>
          <GoogleAnalytics />
          <div className="flex min-h-dvh min-h-full flex-col">
            <TopAnnouncementMarquee />
            <Suspense
              fallback={
                <div className="h-14 border-b border-[var(--border)] bg-white sm:h-16" />
              }
            >
              <Navbar />
            </Suspense>
            <main className="min-w-0 flex-1 pb-[max(0px,env(safe-area-inset-bottom))]">
              {children}
            </main>
            <SiteFooter />
          </div>
        </CartProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
