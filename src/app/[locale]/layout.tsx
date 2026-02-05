import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import "../globals.css";

export const metadata: Metadata = {
  title: 'רמב"ם יומי - Daily Rambam',
  description: 'עקוב אחר לימוד הרמב"ם היומי שלך עם כרטיסיות להחלקה',
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: 'רמב"ם יומי',
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as "he" | "en")) {
    notFound();
  }

  // Get messages for the current locale
  const messages = await getMessages();

  const isRTL = locale === "he";
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} translate="no">
      <head>
        {/* Prevent Google Translate from prompting - we handle Hebrew and English */}
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="he, en" />
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.sefaria.org" />
        <link rel="preconnect" href="https://www.hebcal.com" />
      </head>
      <body
        className="font-sans antialiased min-h-screen"
        style={{
          padding:
            "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
        }}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
