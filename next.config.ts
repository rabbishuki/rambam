import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        // Cache Sefaria API responses
        urlPattern: /^https:\/\/www\.sefaria\.org\/api\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "sefaria-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        // Cache Hebcal API responses
        urlPattern: /^https:\/\/www\.hebcal\.com\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "hebcal-api-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        // Cache static assets
        urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.sefaria.org",
      },
    ],
  },
};

export default withPWA(withNextIntl(nextConfig));
