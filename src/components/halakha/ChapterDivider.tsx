"use client";

import { formatChapterTitle } from "@/lib/hebrew";

interface ChapterDividerProps {
  chapterNumber: number;
}

export function ChapterDivider({ chapterNumber }: ChapterDividerProps) {
  return (
    <div className="text-center my-6 relative">
      {/* Left line */}
      <div className="absolute top-1/2 left-0 w-[40%] h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      {/* Right line */}
      <div className="absolute top-1/2 right-0 w-[40%] h-px bg-gradient-to-l from-transparent via-gray-300 to-transparent" />

      {/* Chapter badge */}
      <span className="relative z-10 inline-block bg-white px-4 py-2 text-base font-semibold text-blue-600 border border-gray-200 rounded-full">
        {formatChapterTitle(chapterNumber)}
      </span>
    </div>
  );
}
