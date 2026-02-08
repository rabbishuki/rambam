import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { notoSansHebrew } from "../fonts";
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
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: 'רמב"ם יומי - Daily Rambam',
    description: 'עקוב אחר לימוד הרמב"ם היומי שלך עם כרטיסיות להחלקה',
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: 'רמב"ם יומי - Daily Rambam',
    description: 'עקוב אחר לימוד הרמב"ם היומי שלך עם כרטיסיות להחלקה',
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
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
    <html
      lang={locale}
      dir={dir}
      translate="no"
      className={notoSansHebrew.variable}
    >
      <head>
        {/* Prevent Google Translate from prompting - we handle Hebrew and English */}
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="he, en" />
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://www.sefaria.org" />
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
