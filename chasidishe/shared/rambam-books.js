// Mishneh Torah book structure - mapping book names to chapter counts
// This allows us to detect when a book is completed
// Data source: Sefaria API (https://www.sefaria.org)

const RAMBAM_BOOKS = {
  // Sefer Madda (Book of Knowledge)
  "Foundations of the Torah": 10,
  "Human Dispositions": 7,
  "Torah Study": 7,
  "Foreign Worship and Customs of the Nations": 12,
  "Repentance": 10,

  // Sefer Ahavah (Book of Love)
  "Reading the Shema": 4,
  "Prayer and the Priestly Blessing": 15,
  "Tefillin, Mezuzah and the Torah Scroll": 10,
  "Fringes": 3,
  "Blessings": 11,
  "Circumcision": 3,
  "The Order of Prayer": 5,

  // Sefer Zemanim (Book of Seasons)
  "Sabbath": 30,
  "Eruvin": 8,
  "Rest on the Tenth of Tishrei": 3,
  "Rest on a Holiday": 8,
  "Leavened and Unleavened Bread": 8,
  "Shofar, Sukkah and Lulav": 8,
  "Sheqel Dues": 4,
  "Sanctification of the New Month": 19,
  "Fasts": 5,
  "Scroll of Esther and Hanukkah": 4,

  // Sefer Nashim (Book of Women)
  "Marriage": 25,
  "Divorce": 13,
  "Levirate Marriage and Release": 8,
  "Virgin Maiden": 3,
  "Woman Suspected of Infidelity": 4,

  // Sefer Kedushah (Book of Holiness)
  "Forbidden Intercourse": 22,
  "Food": 17,
  "Ritual Slaughter": 14,

  // Sefer Hafla'ah (Book of Utterances)
  "Oaths": 12,
  "Vows": 13,
  "Nazariteship": 10,
  "Appraisals and Devoted Property": 8,

  // Sefer Zera'im (Book of Seeds)
  "Diverse Species": 10,
  "Gifts to the Poor": 10,
  "Heave Offerings": 15,
  "Tithes": 14,
  "Second Tithes and Fourth Year's Fruit": 11,
  "First Fruits and other Gifts to Priests": 12,
  "Sabbatical Year and the Jubilee": 13,

  // Sefer Avodah (Book of Service)
  "The Chosen Temple": 8,
  "Vessels of the Sanctuary and Those who Serve Therein": 10,
  "Admission into the Sanctuary": 9,
  "Things Forbidden on the Altar": 7,
  "The Temple Service on Yom Kippur": 5,

  // Sefer Korbanot (Book of Sacrifices)
  "Daily Offerings and Additional Offerings": 10,
  "Sacrifices Rendered Unfit": 19,
  "Service on the Day of Atonement": 5,
  "Trespass": 8,
  "Paschal Offering": 10,
  "Festival Offering": 3,
  "Firstlings": 8,
  "Offerings for Unintentional Transgressions": 15,
  "Offerings for Those with Incomplete Atonement": 5,
  "Substitution": 4,

  // Sefer Taharah (Book of Purity)
  "Defilement by a Corpse": 25,
  "Red Heifer": 15,
  "Defilement by Leprosy": 16,
  "Those Who Defile Bed or Seat": 13,
  "Other Sources of Defilement": 20,
  "Immersion Pools": 11,

  // Sefer Nezikin (Book of Damages)
  "Damages to Property": 14,
  "Theft": 9,
  "Robbery and Lost Property": 18,
  "One Who Injures a Person or Property": 8,
  "Murderer and the Preservation of Life": 13,

  // Sefer Kinyan (Book of Acquisition)
  "Sales": 30,
  "Ownerless Property and Gifts": 12,
  "Neighbors": 14,
  "Agents and Partners": 10,
  "Slaves": 9,

  // Sefer Mishpatim (Book of Judgments)
  "Hiring": 13,
  "Borrowing and Deposit": 8,
  "Creditor and Debtor": 27,
  "Plaintiff and Defendant": 16,
  "Inheritances": 11,

  // Sefer Shoftim (Book of Judges)
  "The Sanhedrin and the Penalties within their Jurisdiction": 26,
  "Testimony": 22,
  "Rebels": 7,
  "Mourning": 14,
  "Kings and Wars": 12
};

// Helper function to extract book name from Sefaria display value
// Examples:
//   "הלכות יסודי התורה א-ג" -> "Foundations of the Torah"
//   "הלכות דעות ב" -> "Human Dispositions"
//   "Prayer and the Priestly Blessing 8-10" -> "Prayer and the Priestly Blessing"
function extractBookName(displayValue) {
  // Try English format first (from API ref field)
  const enMatch = displayValue.match(/^Mishneh Torah, (.+?) \d+/);
  if (enMatch) {
    return enMatch[1];
  }

  return null;
}

// Extract just the Hebrew book name from full Hebrew display value
// Examples:
//   "הלכות דעות ו׳-ז׳, הלכות תלמוד תורה א׳" -> "דעות"
//   "הלכות יסודי התורה א׳-ג׳" -> "יסודי התורה"
function extractHebrewBookName(hebrewDisplay) {
  // Match pattern: "הלכות [book name] [chapter numbers]"
  // Look for the first occurrence before chapter numbers (Hebrew letters)
  const match = hebrewDisplay.match(/הלכות\s+(.+?)\s+[א-ת]׳/);
  if (match) {
    return match[1].trim();
  }

  // Fallback: just return everything after "הלכות " and before the first comma or end
  return hebrewDisplay.replace(/^הלכות\s+/, '').split(/\s+[א-ת]׳/)[0].split(',')[0].trim();
}

// Check if a specific chapter number is the last chapter of a book
// Returns book info if this is the last chapter, null otherwise
function checkIfLastChapter(ref, chapterNumber) {
  const bookName = extractBookName(ref);
  if (!bookName || !RAMBAM_BOOKS[bookName]) {
    return null;
  }

  const totalChapters = RAMBAM_BOOKS[bookName];

  // Check if this chapter number is the last one in the book
  if (chapterNumber === totalChapters) {
    return {
      bookName,
      totalChapters
    };
  }

  return null;
}

// Make available globally
window.RAMBAM_BOOKS = RAMBAM_BOOKS;
window.checkIfLastChapter = checkIfLastChapter;
window.extractHebrewBookName = extractHebrewBookName;