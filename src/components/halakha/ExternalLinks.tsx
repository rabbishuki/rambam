"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

interface ExternalLinkItemProps {
  href?: string;
  logo: string;
  name: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  onClick?: () => void;
}

function ExternalLinkItem({
  href,
  logo,
  name,
  description,
  bgColor,
  borderColor,
  textColor,
  onClick,
}: ExternalLinkItemProps) {
  const content = (
    <>
      <Image
        src={logo}
        alt={name}
        width={40}
        height={40}
        className="rounded-lg"
      />
      <div className="flex-1">
        <div className={`font-medium ${textColor}`}>{name}</div>
        <div className={`text-sm ${textColor} opacity-70`}>{description}</div>
      </div>
      <svg
        className={`w-5 h-5 ${textColor} opacity-60`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </>
  );

  const className = `flex items-center gap-3 p-4 rounded-xl ${bgColor} hover:opacity-90 border ${borderColor} transition-colors`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} onClick={onClick}>
      {content}
    </div>
  );
}

interface ExternalLinksProps {
  sefariaLink?: string;
  chabadLink?: string;
  /** If true, links are non-functional (for tutorial preview) */
  isPreview?: boolean;
  /** Label for translation button (shown next to Sefaria row) */
  translateLabel?: string;
  /** Callback when translation button is clicked */
  onTranslate?: () => void;
}

export function ExternalLinks({
  sefariaLink,
  chabadLink,
  isPreview = false,
  translateLabel,
  onTranslate,
}: ExternalLinksProps) {
  const locale = useLocale();
  const t = useTranslations("info");

  return (
    <div className="space-y-3" dir={locale === "he" ? "rtl" : "ltr"}>
      {/* Sefaria link + optional translate button */}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <ExternalLinkItem
            href={isPreview ? undefined : sefariaLink}
            logo="/contributors/sefaria.png"
            name="Sefaria"
            description={t("viewOnSefaria")}
            bgColor="bg-[var(--color-primary)]/10"
            borderColor="border-[var(--color-primary)]/20"
            textColor="text-[var(--color-primary-dark)]"
          />
        </div>
        {onTranslate && translateLabel && (
          <button
            onClick={onTranslate}
            className="flex flex-col items-center justify-center gap-1 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition-colors"
            title={translateLabel}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <span className="text-[10px] font-medium leading-tight text-center">
              {translateLabel}
            </span>
          </button>
        )}
      </div>

      {/* Chabad.org link */}
      <ExternalLinkItem
        href={isPreview ? undefined : chabadLink}
        logo="/contributors/chabad.png"
        name="Chabad.org"
        description={t("viewOnChabad")}
        bgColor="bg-amber-50"
        borderColor="border-amber-200"
        textColor="text-amber-900"
      />
    </div>
  );
}
