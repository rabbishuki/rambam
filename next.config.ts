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
        // Cache Sefaria text content - CacheFirst (texts rarely change)
        urlPattern: /^https:\/\/www\.sefaria\.org\/api\/v3\/texts\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "sefaria-texts",
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
      {
        // Cache Sefaria calendar - StaleWhileRevalidate (should be fresh but fast)
        urlPattern: /^https:\/\/www\.sefaria\.org\/api\/calendars.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "sefaria-calendar",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
        },
      },
      {
        // Cache Hebcal API - StaleWhileRevalidate (date info should be fresh but fast)
        urlPattern: /^https:\/\/www\.hebcal\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "hebcal-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
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
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default withPWA(withNextIntl(nextConfig));
