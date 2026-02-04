import type { Metadata, Viewport } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-sans-hebrew",
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700"],
});

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
        <link rel="preconnect" href="https://www.sefaria.org" />
        <link rel="preconnect" href="https://www.hebcal.com" />
      </head>
      <body
        className={`${notoSansHebrew.variable} font-sans antialiased bg-gradient-to-br from-indigo-400 to-purple-500 min-h-screen`}
        style={{
          padding:
            "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
        }}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
