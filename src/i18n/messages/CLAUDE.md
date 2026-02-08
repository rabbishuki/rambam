# Translation Files

## Sync Rule
Both `en.json` and `he.json` must have **identical keys**. When adding or modifying a key in one file, always update the other.

## No Hardcoded User-Facing Strings
All user-visible text must go through `useTranslations()` / `t()`. Never hardcode Hebrew or English strings in components — use translation keys. The only exceptions are:
- Religious dedications in SettingsPanel (always Hebrew, intentional)
- Emoji/symbols

## Hebrew Plural/Singular (ICU MessageFormat)

Hebrew nouns, verbs, and pronouns change between singular and plural. Use `{count, plural, one {...} other {...}}` for any string with a count.

Key rules for the `one` (singular) branch in Hebrew:
- **Spell out the number** — use אחד/אחת instead of the digit 1 (e.g., "רשומה אחת" not "רשומה 1")
- **Noun form** — use singular noun (הלכה not הלכות, פריט not פריטים, רשומה not רשומות)
- **Verb/pronoun agreement** — match the singular (נקראה not נקראו, אותה not אותן)
- **Word order** — noun comes before the number in singular ("פריט אחד מוסתר"), number before noun in plural ("3 פריטים מוסתרים")

## English Plural/Singular

English also needs plural handling for count-based strings:
- `one` → singular noun (entry, halakha)
- `other` → plural noun (entries, halakhot)
- Verb agreement: "There is 1..." vs "There are 3..."

## RTL / LTR Directionality
- Hebrew is RTL, English is LTR. The root `<html>` dir is set by next-intl based on locale.
- Components that lay out text-heavy content (lists, date labels, filter bars) should set `dir={isHebrew ? "rtl" : "ltr"}` explicitly when they contain mixed directional content.
- CSS uses `[dir="rtl"]` / `[dir="ltr"]` selectors in `globals.css` for directional overrides.
- Toggle/button groups use `dir="ltr"` to keep consistent left-to-right visual order regardless of locale.

## Inline Bilingual Patterns
Some strings in the codebase use `isHebrew ? "..." : "..."` instead of translation keys (e.g., settings labels, path names). This is acceptable for:
- Short static labels in SettingsPanel that don't need ICU formatting
- Display values derived from data (city names, date labels)

For anything dynamic or reusable, prefer translation keys.

## String Interpolation
Never concatenate translated strings. Use ICU placeholders:
- Good: `"שלום {name}"` / `"Hello {name}"`
- Bad: `t("hello") + " " + name`
