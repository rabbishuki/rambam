"use client";

import { useLocale, useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { BookmarkItem } from "./BookmarkItem";
import { useAppStore, getBookmarksArray } from "@/stores/appStore";

interface BookmarksListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarksList({ isOpen, onClose }: BookmarksListProps) {
  const locale = useLocale();
  const t = useTranslations("bookmarks");
  const isHebrew = locale === "he";

  const bookmarks = useAppStore((state) => state.bookmarks);
  const bookmarksArray = getBookmarksArray(bookmarks);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t("title")}>
      <div dir={isHebrew ? "rtl" : "ltr"}>
        {bookmarksArray.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-600 font-medium">{t("noBookmarks")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("noBookmarksHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarksArray.map((bookmark) => (
              <BookmarkItem key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
