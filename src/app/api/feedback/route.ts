import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      locale,
      studyPath,
      theme,
      headerStyle,
      cardStyle,
      textLanguage,
      hideCompleted,
      activePaths,
    } = body as {
      message: string;
      locale?: string;
      studyPath?: string;
      theme?: string;
      headerStyle?: string;
      cardStyle?: string;
      textLanguage?: string;
      hideCompleted?: string;
      activePaths?: string[];
    };

    // Validate
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message too long (max 1000)" },
        { status: 400 },
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    const pathNames: Record<string, string> = {
      rambam3: "3 Chapters",
      rambam1: "1 Chapter",
      mitzvot: "Sefer HaMitzvot",
    };

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });

    const paths = activePaths?.length
      ? activePaths.map((p) => pathNames[p] ?? p).join(", ")
      : studyPath
        ? (pathNames[studyPath] ?? studyPath)
        : "—";

    const text = [
      "📬 <b>Rambam App — Feedback</b>",
      "",
      `<blockquote>${message.trim()}</blockquote>`,
      "",
      `🌐 UI: ${locale === "he" ? "Hebrew" : "English"}  ·  Text: ${textLanguage ?? "—"}`,
      `📖 Paths: ${paths}`,
      `🎨 Theme: ${theme ?? "—"}  ·  Header: ${headerStyle ?? "—"}  ·  Cards: ${cardStyle ?? "—"}`,
      `👁 Hide completed: ${hideCompleted ?? "—"}`,
      "",
      `<i>🕐 ${date} (${tz})</i>`,
    ].join("\n");

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram API error:", err);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
