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
}

export function ExternalLinks({
  sefariaLink,
  chabadLink,
  isPreview = false,
}: ExternalLinksProps) {
  const locale = useLocale();
  const t = useTranslations("info");
  const isHebrew = locale === "he";

  return (
    <div className="space-y-3" dir={isHebrew ? "rtl" : "ltr"}>
      {/* Sefaria link */}
      <ExternalLinkItem
        href={isPreview ? undefined : sefariaLink}
        logo="/contributors/sefaria.png"
        name="Sefaria"
        description={
          isHebrew ? "צפה בטקסט המלא עם פירושים" : t("viewOnSefaria")
        }
        bgColor="bg-blue-50"
        borderColor="border-blue-200"
        textColor="text-blue-900"
      />

      {/* Chabad.org link */}
      <ExternalLinkItem
        href={isPreview ? undefined : chabadLink}
        logo="/contributors/chabad.png"
        name="Chabad.org"
        description={isHebrew ? "צפה עם תרגום ופירוש" : t("viewOnChabad")}
        bgColor="bg-amber-50"
        borderColor="border-amber-200"
        textColor="text-amber-900"
      />
    </div>
  );
}
