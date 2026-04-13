import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleHtmlAttributes } from "@/components/locale-html";
import { CartProvider } from "@/contexts/cart-context";
import { CartFlyProvider } from "@/contexts/cart-fly-context";
import { CustomerAuthProvider } from "@/contexts/customer-auth-context";
import { GoogleAnalytics } from "@/components/google-analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://gooddeals.sa"),
  title: {
    default: "Easy Handles — متجر منتجات عملية",
    template: "%s | Easy Handles",
  },
  description:
    "Easy Handles: متجر سعودي بواجهة عربية لمنتجات عملية وسهلة الاستخدام مع أسعار بالريال السعودي.",
  openGraph: {
    title: "Easy Handles",
    description: "منتجات عملية للمنزل والحديقة والشتاء — Easy Handles — أسعار بالريال السعودي.",
    locale: "ar_SA",
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
        <CustomerAuthProvider>
          <CartProvider>
            <CartFlyProvider>
              <GoogleAnalytics />
              {children}
            </CartFlyProvider>
          </CartProvider>
        </CustomerAuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
