// schedule.js - Torah Ohr + Likkutei Torah daily schedule
// Index 0 = Oct 12, 2025 (א' בראשית) | Cycle length: 365 days
// Index 183 = Apr 13, 2026 (ב' תזריע - שוש תשיש) ← current start
// Each entry: { he, books: [{ book, chapter }, ...] }
// NOTE: Some weeks have approximate chapter mapping for ShirHashirim interleaving.
//       Verify and correct as you go through the cycle.

const TO  = (p, c) => ({ book: `Torah_Ohr,_${p}`, chapter: c });
const LT  = (p, c) => ({ book: `Likkutei_Torah,_${p}`, chapter: c });
const TOS = (p, c) => ({ book: `Torah_Ohr,_Supplements,_${p}`, chapter: c });
const LTS = (p, c) => ({ book: `Likkutei_Torah,_Supplements,_${p}`, chapter: c });
const day = (he, ...books) => ({ he, books });

window.SCHEDULE = [
  // ═══════════════════════════════════════
  // BERESHIT  Oct 12-18 2025  [idx 0-6]
  // ═══════════════════════════════════════
  day('בראשית - השמים כסאי',             TO('Bereshit', 1)),
  day('בראשית - כי כאשר',                TO('Bereshit', 2)),
  day('בראשית - ביאור על הנ"ל',          TO('Bereshit', 3)),
  day('בראשית - להבין הטעם',             TO('Bereshit', 4)),
  day('בראשית - לא טוב',                 TO('Bereshit', 5)),
  day('בראשית - להבין ענין',             TO('Bereshit', 6), TO('Bereshit', 7)),
  day('בראשית - יבל הוא',                TO('Bereshit', 8)),

  // ═══════════════════════════════════════
  // NOACH  Oct 19-25  [idx 7-13]
  // LT ShirHashirim pt1 (ch1-5) + TO Noach
  // ═══════════════════════════════════════
  day('שה"ש א - שיר השירים',             LT('Shir_HaShirim', 1)),
  day('שה"ש א - והנה כל זה',             LT('Shir_HaShirim', 2)),
  day('שה"ש א - לריח שמניך',             LT('Shir_HaShirim', 3)),
  day('שה"ש א - לריח שמניך ב',           LT('Shir_HaShirim', 4)),
  day('שה"ש א - שחורה אני',              LT('Shir_HaShirim', 5)),
  day('נח - מים רבים',                   TO('Noach', 1)),
  day('נח - ויאמר ה\'',                   TO('Noach', 4)),

  // ═══════════════════════════════════════
  // LECH LECHA  Oct 26 - Nov 1  [idx 14-20]
  // LT ShirHashirim pt2 (ch6-10) + TO Lech Lecha
  // ═══════════════════════════════════════
  day('שה"ש ב - וזהו שהשרפים',           LT('Shir_HaShirim', 6)),
  day('שה"ש ב - כאהלי קדר',              LT('Shir_HaShirim', 7)),
  day('שה"ש ב - ביאור ענין שחורה אני',   LT('Shir_HaShirim', 7)),
  day('שה"ש ב - ביאור הדברים',           LT('Shir_HaShirim', 8)),
  day('שה"ש ב - והנה כמ"כ',              LT('Shir_HaShirim', 9), LT('Shir_HaShirim', 10)),
  day('לך לך - הנה אברם',               TO('Lech_Lecha', 1)),
  day('לך לך - והבדילה הפרוכת',          TO('Lech_Lecha', 4)),

  // ═══════════════════════════════════════
  // VAYERA  Nov 2-8  [idx 21-27]
  // LT ShirHashirim pt3 (ch9-13) + TO Vayera
  // ═══════════════════════════════════════
  day('שה"ש ג - ד ולבאר הטעם',           LT('Shir_HaShirim', 9)),
  day('שה"ש ג - והנה פי\' וענין',         LT('Shir_HaShirim', 10)),
  day('שה"ש ג - לסוסתי ברכבי פרעה',      LT('Shir_HaShirim', 9)),
  day('שה"ש ג - נאוו לחייך',             LT('Shir_HaShirim', 11)),
  day('שה"ש ג - הנך יפה',               LT('Shir_HaShirim', 12), LT('Shir_HaShirim', 13)),
  day('וירא - פתח אליהו',               TO('Vayera', 1)),
  day('וירא - ארדה נא',                  TO('Vayera', 2)),

  // ═══════════════════════════════════════
  // CHAYEI SARA  Nov 9-15  [idx 28-34]
  // LT ShirHashirim pt4 (ch13-17) + TO Chayei Sara
  // ═══════════════════════════════════════
  day('שה"ש ד - קול דודי',              LT('Shir_HaShirim', 13)),
  day('שה"ש ד - מדלג על ההרים',         LT('Shir_HaShirim', 14)),
  day('שה"ש ד - ולהבין ענין',           LT('Shir_HaShirim', 15)),
  day('שה"ש ד - יונתי בחגוי',           LT('Shir_HaShirim', 16)),
  day('שה"ש ד - ביאור הדברים',          LT('Shir_HaShirim', 17), LT('Shir_HaShirim', 18)),
  day('חיי שרה - יגלה לן',              TO('Chayei_Sara', 3)),
  day('חיי שרה - לשון אדמו"ר',          TO('Chayei_Sara', 2)),

  // ═══════════════════════════════════════
  // TOLDOT  Nov 16-22  [idx 35-41]
  // LT ShirHashirim pt5 (ch18-21) + TO Toldot
  // ═══════════════════════════════════════
  day('שה"ש ה - וזהו ותורה',            LT('Shir_HaShirim', 19)),
  day('שה"ש ה - עוד ביאור',             LT('Shir_HaShirim', 20)),
  day('שה"ש ה - וביאור ענין זה',        LT('Shir_HaShirim', 21)),
  day('תולדות - אלה תולדות',            TO('Toldot', 1)),
  day('תולדות - וזהו מים רבים',         TO('Toldot', 2)),
  day('תולדות - ומעתה יובנו',           TO('Toldot', 3)),
  day('תולדות - ראה ריח',               TO('Toldot', 5)),

  // ═══════════════════════════════════════
  // VAYETZEI  Nov 23-29  [idx 42-48]
  // LT ShirHashirim pt6 (ch18-23) + TO Vayetzei
  // ═══════════════════════════════════════
  day('שה"ש ו - צאינה וראינה',          LT('Shir_HaShirim', 18)),
  day('שה"ש ו - להבין ענין',            LT('Shir_HaShirim', 19)),
  day('שה"ש ו - ובזה יובן',             LT('Shir_HaShirim', 20)),
  day('שה"ש ו - והנה עם כל הנ"ל',       LT('Shir_HaShirim', 21), LT('Shir_HaShirim', 22)),
  day('ויצא - ושבתי בשלום',             TO('Vayetzei', 1)),
  day('ויצא - ביאור על הנ"ל',           TO('Vayetzei', 2)),
  day('ויצא - וללבן שתי בנות',          TO('Vayetzei', 3)),

  // ═══════════════════════════════════════
  // VAYISHLACH  Nov 30 - Dec 6  [idx 49-55]
  // LT ShirHashirim pt7 (ch18-23) + TO Vayishlach
  // ═══════════════════════════════════════
  day('שה"ש ז - צאינה וראינה ב',        LT('Shir_HaShirim', 18)),
  day('שה"ש ז - להצהיל פנים',           LT('Shir_HaShirim', 19)),
  day('שה"ש ז - וזהו ענין',             LT('Shir_HaShirim', 20)),
  day('שה"ש ז - לבבתני',               LT('Shir_HaShirim', 22)),
  day('שה"ש ז - ביאור על פסוק לבבתני', LT('Shir_HaShirim', 23)),
  day('וישלח - וישלח יעקב',             TO('Vayishlach', 1)),
  day('וישלח - ויקח מן הבא',            TO('Vayishlach', 4)),

  // ═══════════════════════════════════════
  // VAYESHEV  Dec 7-13  [idx 56-62]
  // LT ShirHashirim pt8 (ch24-25) + TO Vayeshev
  // ═══════════════════════════════════════
  day('שה"ש ח - ועתה התפלה',            LT('Shir_HaShirim', 24)),
  day('שה"ש ח - באתי לגני',             LT('Shir_HaShirim', 24)),
  day('שה"ש ח - ביאור ע"פ באתי לגני',  LT('Shir_HaShirim', 25)),
  day('וישב - וישב יעקב',               TO('Vayeshev', 1)),
  day('וישב - והנה אנחנו',              TO('Vayeshev', 2)),
  day('וישב - שיר המעלות',              TO('Vayeshev', 3)),
  day('וישב - וביאור ענין זה',          TO('Vayeshev', 5)),

  // ═══════════════════════════════════════
  // MIKETZ  Dec 14-20  [idx 63-69]
  // TO Miketz ch1-8
  // ═══════════════════════════════════════
  day('מקץ - ויהי מקץ',                 TO('Miketz', 1)),
  day('מקץ - ויהי מקץ ב',               TO('Miketz', 2)),
  day('מקץ - ענין חנוכה',               TO('Miketz', 3)),
  day('מקץ - ת"ר מצות נר חנוכה',        TO('Miketz', 4)),
  day('מקץ - כי עמך מקור חיים',         TO('Miketz', 5)),
  day('מקץ - רני ושמחי',                TO('Miketz', 7)),
  day('מקץ - רני ושמחי ב',              TO('Miketz', 8), TO('Miketz', 9)),

  // ═══════════════════════════════════════
  // VAYIGASH  Dec 21-27  [idx 70-76]
  // Continuation Chanukah drushim (Miketz ch10-15) + TO Vayigash
  // ═══════════════════════════════════════
  day('מקץ - מי כה\'',                  TO('Miketz', 10)),
  day('מקץ - ביאור על הנ"ל',            TO('Miketz', 11)),
  day('מקץ - כי אתה נרי',               TO('Miketz', 12)),
  day('מקץ - נר חנוכה',                 TO('Miketz', 14)),
  day('מקץ - ביאור על הנ"ל ב',          TO('Miketz', 15)),
  day('ויגש - ויגש',                    TO('Vayigash', 1)),
  day('ויגש - וילקט יוסף',              TO('Vayigash', 2)),

  // ═══════════════════════════════════════
  // VAYECHI  Dec 28 - Jan 3 2026  [idx 77-83]
  // TO Vayechi + Supplements
  // ═══════════════════════════════════════
  day('ויחי - יהודה אתה',               TO('Vayechi', 1)),
  day('ויחי - אסרי לגפן',               TO('Vayechi', 3)),
  day('ויחי - חכלילי',                  TO('Vayechi', 4)),
  day('ויחי הוס\' - ואני נתתי',          TOS('Vayechi', 1)),
  day('ויחי הוס\' - להבין שרש',          TOS('Vayechi', 2)),
  day('ויחי הוס\' - ועתה יש להבין',      TOS('Vayechi', 2)),
  day('ויחי הוס\' - בן פורת',            TOS('Vayechi', 2)),

  // ═══════════════════════════════════════
  // SHEMOT  Jan 4-10  [idx 84-90]
  // TO Shemot + Supplements
  // ═══════════════════════════════════════
  day('שמות - ואלה שמות',               TO('Shemot', 1)),
  day('שמות - קול דודי',                TO('Shemot', 2)),
  day('שמות - ויאמר ה\' אליו',           TO('Shemot', 3)),
  day('שמות - זה שמי',                  TO('Shemot', 4)),
  day('שמות - הבאים ישרש',              TO('Shemot', 5)),
  day('שמות הוס\' - להבין ענין',         TO('Shemot', 6)),
  day('שמות הוס\' - להבין שרש כל',       TO('Shemot', 7)),

  // ═══════════════════════════════════════
  // VAERA  Jan 11-17  [idx 91-97]
  // LT ShirHashirim pt9 (ch26-27) + TO Vaera
  // ═══════════════════════════════════════
  day('שה"ש ט - אני ישנה',              LT('Shir_HaShirim', 26)),
  day('שה"ש ט - להבין ביאור הדברים',    LT('Shir_HaShirim', 27)),
  day('וארא - וארא אל אברהם',           TO('Vaera', 1)),
  day('וארא - וידבר אלקים',             TO('Vaera', 2)),
  day('וארא - לכן אמר',                 TO('Vaera', 3)),
  day('וארא - ביאור על הנ"ל',           TO('Vaera', 4)),
  day('וארא - והנה נתבאר לעיל',         TO('Vaera', 5)),

  // ═══════════════════════════════════════
  // BO  Jan 18-24  [idx 98-104]
  // LT ShirHashirim pt10 (ch28-32) + TO Bo
  // ═══════════════════════════════════════
  day('שה"ש י - הסבי עיניך',             LT('Shir_HaShirim', 28)),
  day('שה"ש י - שניך כעדר הרחלים',       LT('Shir_HaShirim', 29)),
  day('שה"ש י - והנה ע"ז נאמר',          LT('Shir_HaShirim', 30)),
  day('שה"ש י - ששים המה מלכות',         LT('Shir_HaShirim', 30)),
  day('שה"ש י - להבין בתוספת ביאור',     LT('Shir_HaShirim', 31), LT('Shir_HaShirim', 32)),
  day('בא - בעצם היום',                  TO('Bo', 1)),
  day('בא - למען תהיה',                  TO('Bo', 2)),

  // ═══════════════════════════════════════
  // BESHALACH  Jan 25-31  [idx 105-111]
  // TO Beshalach + LT Beshalach
  // ═══════════════════════════════════════
  day('בשלח - ויהי בשלח פרעה',           TO('Beshalach', 1)),
  day('בשלח - אז ישיר',                  TO('Beshalach', 3)),
  day('בשלח - לסוסתי',                   TO('Beshalach', 5)),
  day('בשלח - ויאמר משה',                TO('Beshalach', 7)),
  day('בשלח - להבין ענין',               TO('Beshalach', 8)),
  day('לקו"ת בשלח - ראו כי',             LT('Beshalach', 1)),
  day('לקו"ת בשלח - והנה כתיב',          LT('Beshalach', 1)),

  // ═══════════════════════════════════════
  // YITRO  Feb 1-7  [idx 112-118]
  // TO Yitro + Supplement
  // ═══════════════════════════════════════
  day('יתרו - בחדש השלישי',             TO('Yitro', 1)),
  day('יתרו - ביאור על הנ"ל',           TO('Yitro', 3)),
  day('יתרו - וביאור הדבר',             TO('Yitro', 4)),
  day('יתרו - וזהו זכור',               TO('Yitro', 6)),
  day('יתרו - להבין ביאור ענין',        TO('Yitro', 9)),
  day('יתרו - וכל העם רואים',           TO('Yitro', 10)),
  day('יתרו הוס\' - להבין שרש',         TO('Yitro', 7)),

  // ═══════════════════════════════════════
  // MISHPATIM  Feb 8-14  [idx 119-125]
  // Megillat Esther pt1 + TO Mishpatim
  // ═══════════════════════════════════════
  day('מג"א - יביאו לבוש מלכות',        TO('Megillat_Esther', 1)),
  day('מג"א - ביאור על הנ"ל',           TO('Megillat_Esther', 2)),
  day('מג"א - ומרדכי יצא',              TO('Megillat_Esther', 3), TO('Megillat_Esther', 4)),
  day('משפטים - ואלה המשפטים',          TO('Mishpatim', 1)),
  day('משפטים - ביאור על הנ"ל',         TO('Mishpatim', 2)),
  day('משפטים - וזהו ביאור ענין',       TO('Mishpatim', 3)),
  day('משפטים - ביאור ע"פ ותחת רגליו', TO('Mishpatim', 5)),

  // ═══════════════════════════════════════
  // TERUMAH  Feb 15-21  [idx 126-132]
  // Megillat Esther pt2 + TO Terumah
  // ═══════════════════════════════════════
  day('מג"א - ותסף אסתר',               TO('Megillat_Esther', 7)),
  day('מג"א - ובבואה לפני',             TO('Megillat_Esther', 9)),
  day('מג"א - ביאור על הנ"ל',           TO('Megillat_Esther', 10)),
  day('מג"א - חייב אינש',               TO('Megillat_Esther', 8)),
  day('מג"א - ועפ"ז יובן',              TO('Megillat_Esther', 11)),
  day('תרומה - מי יתנך כאח',            TO('Terumah', 1)),
  day('תרומה - ביאור על הנ"ל',          TO('Terumah', 2)),

  // ═══════════════════════════════════════
  // TETZAVEH  Feb 22-28  [idx 133-139]
  // Megillat Esther Supplements pt1 + TO Tetzaveh + Zakhor
  // ═══════════════════════════════════════
  day('מג"א הוס\' - להבין למה לעתיד',    TOS('Megillat_Esther', 1)),
  day('מג"א הוס\' - וביאור הדברים',       TOS('Megillat_Esther', 2)),
  day('מג"א הוס\' - והנה כללות',          TOS('Megillat_Esther', 3)),
  day('תצוה - ואתה תצוה',               TO('Tetzaveh', 1)),
  day('תצוה - ועשית ציץ זהב',           TO('Tetzaveh', 3)),
  day('תצוה - זכור את',                 TO('Parashat_Zakhor', 1)),
  day('תצוה הוס\' - להבין שרשי',         TO('Tetzaveh', 4)),

  // ═══════════════════════════════════════
  // KI TISA  Mar 1-7  [idx 140-146]
  // Megillat Esther Supplements pt2 + TO Ki Tisa + Supplements
  // ═══════════════════════════════════════
  day('מג"א הוס\' - ויקח המן',            TOS('Megillat_Esther', 2)),
  day('מג"א הוס\' - אם ישים אליו',         TOS('Megillat_Esther', 3)),
  day('מג"א הוס\' - ע"כ קראו לימים',      TOS('Megillat_Esther', 4)),
  day('מג"א הוס\' - רפאות תהי',           TOS('Megillat_Esther', 5)),
  day('כי תשא - שמאלו תחת לראשי',       TO('Ki_Tisa', 1)),
  day('כי תשא הוס\' - כי תשא את',        TO('Ki_Tisa', 2)),
  day('כי תשא הוס\' - להבין ביאור',      TO('Parashat_Zakhor', 2)),

  // ═══════════════════════════════════════
  // VAYAKHEL  Mar 8-14  [idx 147-153]
  // TO Vayakhel + Supplements
  // ═══════════════════════════════════════
  day('ויקהל - ויקהל משה',               TO('Vayakhel', 1)),
  day('ויקהל - והנה כ"ז',                TO('Vayakhel', 1)),
  day('ויקהל - וע"פ כל הנ"ל',            TO('Vayakhel', 2)),
  day('ויקהל - עוד יובן זה',             TO('Vayakhel', 2)),
  day('ויקהל הוס\' - להבין שרשי',        TO('Vayakhel', 2)),
  day('ויקהל הוס\' - והנה כל',            TO('Vayakhel', 2)),
  day('ויקהל הוס\' - וזהו פי\'',           TO('Vayakhel', 2)),

  // ═══════════════════════════════════════
  // PEKUDEI  Mar 15-21  [idx 154-160]
  // LT Pekudei
  // ═══════════════════════════════════════
  day('פקודי - אלה פקודי המשכן',         LT('Pekudei', 1)),
  day('פקודי - וזהו מ"ש ששם',            LT('Pekudei', 1)),
  day('פקודי - ועפ"ז יובן',              LT('Pekudei', 2)),
  day('פקודי - הנה פקודי המשכן',         LT('Pekudei', 2)),
  day('פקודי - וזהו הטעם',               LT('Pekudei', 2)),
  day('פקודי - אשר פקד',                 LT('Pekudei', 2)),
  day('פקודי - והנה פי\'',                LT('Pekudei', 2)),

  // ═══════════════════════════════════════
  // VAYIKRA  Mar 22-28  [idx 161-167]
  // LT Vayikra + Supplements
  // ═══════════════════════════════════════
  day('ויקרא - ויקרא אל משה',            LT('Vayikra', 1)),
  day('ויקרא - אדם כי יקריב',            LT('Vayikra', 2)),
  day('ויקרא - לבאר הדברים',             LT('Vayikra', 3)),
  day('ויקרא - ביאור הדברים הנ"ל',       LT('Vayikra', 4)),
  day('ויקרא - ועפ"ז יתורץ',             LT('Vayikra', 5)),
  day('ויקרא הוס\' - קיצור ע"פ ולא תשבית', LTS('Vayikra', 1)),
  day('ויקרא הוס\' - ולהבין ביאור',      LTS('Vayikra', 2)),

  // ═══════════════════════════════════════
  // TZAV  Mar 29 - Apr 4  [idx 168-174]
  // LT Tzav
  // ═══════════════════════════════════════
  day('צו - ואכלתם אכול ושבוע',          LT('Tzav', 1)),
  day('צו - להבין ענין',                 LT('Tzav', 2)),
  day('צו - ענין שבעת ימי',              LT('Tzav', 3)),
  day('צו - להבין מ"ש בהגדה',            LT('Tzav', 4)),
  day('צו - ששת ימים',                   LT('Tzav', 5), LT('Tzav', 6)),
  day('צו - ששת ימים ב',                 LT('Tzav', 7), LT('Tzav', 8)),
  day('צו - הים ראה',                    LT('Tzav', 9)),

  // ═══════════════════════════════════════
  // SHEMINI  Apr 5-11  [idx 175-181]
  // LT ShirHashirim pt11 (ch30-35) + LT Shmini
  // ═══════════════════════════════════════
  day('שה"ש יא - ששים המה מלכות',        LT('Shir_HaShirim', 30)),
  day('שה"ש יא - ושמונים פילגשים',       LT('Shir_HaShirim', 31)),
  day('שה"ש יא - הנה ענין',              LT('Shir_HaShirim', 32)),
  day('שה"ש יא - מה יפו פעמיך',          LT('Shir_HaShirim', 34)),
  day('שה"ש יא - מי יתנך',               LT('Shir_HaShirim', 35)),
  day('שמיני - לויתן זה יצרת',           LT('Shmini', 1)),
  day('שמיני - ביאור על לויתן',          LT('Shmini', 2)),

  // ═══════════════════════════════════════
  // TAZRIA  Apr 12-18  [idx 182-188]
  // LT Tazria                ← Apr 13 = idx 183
  // ═══════════════════════════════════════
  day('תזריע - אשה כי תזריע',            LT('Tazria', 1)),
  day('תזריע - שוש תשיש',                LT('Tazria', 2)),  // ← Apr 13 2026
  day('תזריע - וביום השמיני ימול',        LT('Tazria', 3)),
  day('תזריע - וזהו ענין',               LT('Tazria', 4)),
  day('תזריע - אדם כי יהיה',             LT('Tazria', 5)),
  day('תזריע - ומעתה נחזור',             LT('Tazria', 6)),
  day('תזריע - ועפ"ז יובן',              LT('Tazria', 6)),

  // ═══════════════════════════════════════
  // METZORA  Apr 19-25  [idx 189-195]
  // LT Metzora (flat - 1 Sefaria chapter, many paras)
  // ═══════════════════════════════════════
  day('מצורע - זאת תהיה',                LT('Metzora', 1)),
  day('מצורע - וזהו ענין מצורע',         LT('Metzora', 1)),
  day('מצורע - והנה התיקון',             LT('Metzora', 1)),
  day('מצורע - והנה להבין',              LT('Metzora', 1)),
  day('מצורע - וזהו ענין תשובה',         LT('Metzora', 1)),
  day('מצורע - ובזה יש לפרש',            LT('Metzora', 1)),
  day('מצורע - והנה לזאת עיקר',          LT('Metzora', 1)),

  // ═══════════════════════════════════════
  // ACHAREI  Apr 26 - May 2  [idx 196-202]
  // LT Achrei Mot
  // ═══════════════════════════════════════
  day('אחרי - כי ביום הזה',              LT('Achrei_Mot', 1)),
  day('אחרי - והנה לתוספת',             LT('Achrei_Mot', 2)),
  day('אחרי - כי ביום הזה ב',            LT('Achrei_Mot', 2)),
  day('אחרי - וכאשר ישכיל',             LT('Achrei_Mot', 3)),
  day('אחרי - ביאור הדברים',            LT('Achrei_Mot', 3)),
  day('אחרי - ביאור הדברים ב',           LT('Achrei_Mot', 4)),
  day('אחרי - והנה להבין',              LT('Achrei_Mot', 4)),

  // ═══════════════════════════════════════
  // KEDOSHIM  May 3-9  [idx 203-209]
  // LT Kedoshim
  // ═══════════════════════════════════════
  day('קדושים - וכי תבואו אל הארץ',      LT('Kedoshim', 1)),
  day('קדושים - והנה בזח"ג',             LT('Kedoshim', 1)),
  day('קדושים - וזהו ענין הנז"ל',        LT('Kedoshim', 2)),
  day('קדושים - ומכ"ז יובן',             LT('Kedoshim', 2)),
  day('קדושים - ובשנה החמישית',          LT('Kedoshim', 2)),
  day('קדושים - נמצא אשר',               LT('Kedoshim', 2)),
  day('קדושים - והדרת פני זקן',          LT('Kedoshim', 2)),

  // ═══════════════════════════════════════
  // EMOR  May 10-16  [idx 210-216]
  // LT Emor
  // ═══════════════════════════════════════
  day('אמור - ונקדשתי בתוך',             LT('Emor', 1)),
  day('אמור - ובזה',                     LT('Emor', 2)),
  day('אמור - לבאר הדברים',              LT('Emor', 3)),
  day('אמור - והקדוש',                   LT('Emor', 4)),
  day('אמור - וספרתם',                   LT('Emor', 5)),
  day('אמור - והניף את העומר',           LT('Emor', 6)),
  day('אמור - ביאור ע"פ והניף',          LT('Emor', 6)),

  // ═══════════════════════════════════════
  // BEHAR  May 17-23  [idx 217-223]
  // LT Behar
  // ═══════════════════════════════════════
  day('בהר - כי תבואו אל הארץ',          LT('Behar', 1)),
  day('בהר - וכדי שתתאחד',               LT('Behar', 1)),
  day('בהר - ועניין העלייה',              LT('Behar', 2)),
  day('בהר - אך ענין העלייה',             LT('Behar', 2)),
  day('בהר - וזהו את שבתותי',             LT('Behar', 3)),
  day('בהר - ומעתה יובן',                LT('Behar', 3)),
  day('בהר - ומכל מקום צ"ע',             LT('Behar', 3)),

  // ═══════════════════════════════════════
  // BECHUKOTAI  May 24-30  [idx 224-230]
  // LT Bechukotai
  // ═══════════════════════════════════════
  day('בחקותי - אם בחקותי',              LT('Bechukotai', 1)),
  day('בחקותי - ביאור אם בחקותי',        LT('Bechukotai', 2)),
  day('בחקותי - ועתה נבוא לביאור',       LT('Bechukotai', 3)),
  day('בחקותי - אם בחקותי ב',            LT('Bechukotai', 4)),
  day('בחקותי - בשברי לכם',              LT('Bechukotai', 5)),
  day('בחקותי - אסור לאדם שיטעום',       LT('Bechukotai', 6)),
  day('בחקותי - וילך ראובן',             LT('Bechukotai', 6)),

  // ═══════════════════════════════════════
  // BAMIDBAR  May 31 - Jun 6  [idx 231-237]
  // LT Bamidbar
  // ═══════════════════════════════════════
  day('במדבר - וידבר ה\' אל משה',         LT('Bamidbar', 1)),
  day('במדבר - להבין ביאור הדברים',       LT('Bamidbar', 2), LT('Bamidbar', 3)),
  day('במדבר - והנה כל זה',               LT('Bamidbar', 4), LT('Bamidbar', 5)),
  day('במדבר - ביאור מעט ע"פ',            LT('Bamidbar', 6), LT('Bamidbar', 7)),
  day('במדבר - וספרתם מעט',               LT('Bamidbar', 8), LT('Bamidbar', 9)),
  day('במדבר - ביאור על בשעה',            LT('Bamidbar', 10), LT('Bamidbar', 11)),
  day('במדבר - ענין שניתנה התורה',        LT('Bamidbar', 12), LT('Bamidbar', 13)),

  // ═══════════════════════════════════════
  // NASSO  Jun 7-13  [idx 238-244]
  // Drush Shavuot + LT Nasso
  // ═══════════════════════════════════════
  day('במדבר - דרוש לשבועות',            LT('Bamidbar', 14), LT('Bamidbar', 15)),
  day('נשא - נשא את ראש',                LT('Nasso', 1)),
  day('נשא - ביאור ע"פ נשא',             LT('Nasso', 2)),
  day('נשא - וידבר ה\' כו\' נשא',         LT('Nasso', 3)),
  day('נשא - כתיב ה\' יחתו',              LT('Nasso', 4)),
  day('נשא - ביאור ע"פ כה תברכו',        LT('Nasso', 5)),
  day('נשא - זאת חנוכת המזבח',           LT('Nasso', 6)),

  // ═══════════════════════════════════════
  // BEHAALOTECHA  Jun 14-20  [idx 245-251]
  // LT Behaalotcha
  // ═══════════════════════════════════════
  day('בהעלותך - בהעלותך',               LT("Beha'alotcha", 1)),
  day('בהעלותך - ובזה יובן',              LT("Beha'alotcha", 2)),
  day('בהעלותך - ביאור על הנ"ל',         LT("Beha'alotcha", 3)),
  day('בהעלותך - וזהו ענין',              LT("Beha'alotcha", 4)),
  day('בהעלותך - ראיתי והנה',             LT("Beha'alotcha", 5)),
  day('בהעלותך - וזהו ענין ברכות',        LT("Beha'alotcha", 6)),
  day('בהעלותך - והנה בחי\' כתישה',       LT("Beha'alotcha", 7)),

  // ═══════════════════════════════════════
  // SHELACH  Jun 21-27  [idx 252-258]
  // LT Shelach
  // ═══════════════════════════════════════
  day('שלח - שלח לך',                    LT("Sh'lach", 1), LT("Sh'lach", 2)),
  day('שלח - ועתה יגדל',                 LT("Sh'lach", 3), LT("Sh'lach", 4)),
  day('שלח - אך אמנם',                   LT("Sh'lach", 5), LT("Sh'lach", 6)),
  day('שלח - קצת ביאור',                 LT("Sh'lach", 7), LT("Sh'lach", 8)),
  day('שלח - ביאר ע"פ והיה',             LT("Sh'lach", 9), LT("Sh'lach", 10)),
  day('שלח - מעט ביאור',                 LT("Sh'lach", 11), LT("Sh'lach", 12)),
  day('שלח - ביאור הדברים',              LT("Sh'lach", 13), LT("Sh'lach", 14)),

  // ═══════════════════════════════════════
  // KORACH  Jun 28 - Jul 4  [idx 259-265]
  // LT ShirHashirim pt12 (ch36-37) + LT Korach
  // ═══════════════════════════════════════
  day('שה"ש יב - שימני כחותם',            LT('Shir_HaShirim', 36)),
  day('שה"ש יב - ביאור על זה',            LT('Shir_HaShirim', 37)),
  day('קרח - ויקח קרח',                  LT('Korach', 1)),
  day('קרח - והנה מ"ש מלא כל',           LT('Korach', 2)),
  day('קרח - ועתה י"ל ענין',             LT('Korach', 2)),
  day('קרח - והשיב לו מרבע"ה',          LT('Korach', 3)),
  day('קרח - ועבד הלוי הוא',             LT('Korach', 3)),

  // ═══════════════════════════════════════
  // CHUKAT  Jul 5-11  [idx 266-272]
  // LT Chukat
  // ═══════════════════════════════════════
  day('חקת - וידבר הוי\'',                LT('Chukat', 1)),
  day('חקת - ביאור ע"פ זאת',             LT('Chukat', 2)),
  day('חקת - וזהו ענין',                 LT('Chukat', 3)),
  day('חקת - ויקחו אליך פרה',            LT('Chukat', 4)),
  day('חקת - והנה מן הבאר',              LT('Chukat', 5)),
  day('חקת - על כן יאמרו',               LT('Chukat', 6)),
  day('חקת - תבנה ותכונן',               LT('Chukat', 7)),

  // ═══════════════════════════════════════
  // BALAK  Jul 12-18  [idx 273-279]
  // LT Balak
  // ═══════════════════════════════════════
  day('בלק - מי מנה',                    LT('Balak', 1)),
  day('בלק - ביאור על פסוק',             LT('Balak', 2)),
  day('בלק - וזהו הירידה',               LT('Balak', 3)),
  day('בלק - לא הביט און',               LT('Balak', 3)),
  day('בלק - ולא ראה',                   LT('Balak', 4)),
  day('בלק - מה טובו',                   LT('Balak', 4)),
  day('בלק - והנה כל הג\'',               LT('Balak', 5)),

  // ═══════════════════════════════════════
  // PINCHAS  Jul 19-25  [idx 280-286]
  // LT Pinchas
  // ═══════════════════════════════════════
  day('פינחס - צו את בני ישראל',         LT('Pinchas', 1)),
  day('פינחס - אך כיצד',                 LT('Pinchas', 1)),
  day('פינחס - ביאור ע"פ את קרבני',      LT('Pinchas', 2)),
  day('פינחס - צו את בני ישראל ב',       LT('Pinchas', 3)),
  day('פינחס - אך זאת עוד',              LT('Pinchas', 3)),
  day('פינחס - קדש ישראל לה\'',           LT('Pinchas', 4)),
  day('פינחס - אבל כתיב',                LT('Pinchas', 4)),

  // ═══════════════════════════════════════
  // MATOT  Jul 26 - Aug 1  [idx 287-293]
  // LT Matot
  // ═══════════════════════════════════════
  day('מטות - וידבר משה',                LT('Matot', 1)),
  day('מטות - לאמר זה הדבר',             LT('Matot', 2)),
  day('מטות - איש כי ידור',              LT('Matot', 3)),
  day('מטות - וזהו ואשה כי תדור',        LT('Matot', 4)),
  day('מטות - עיני כל',                  LT('Matot', 5)),
  day('מטות - החלצו',                    LT('Matot', 6)),
  day('מטות - ביאור ענין החלצו',         LT('Matot', 7)),

  // ═══════════════════════════════════════
  // MASEI  Aug 2-8  [idx 294-300]
  // LT Masei
  // ═══════════════════════════════════════
  day('מסעי - אלה מסעי',                 LT('Masei', 1)),
  day('מסעי - לבאר ענין המסעות',         LT('Masei', 2)),
  day('מסעי - אלה מסעי ב',               LT('Masei', 3)),
  day('מסעי - ביאור על זה',              LT('Masei', 4)),
  day('מסעי - וענין',                    LT('Masei', 5)),
  day('מסעי - וירד הגבול',               LT('Masei', 6)),
  day('מסעי - ביאור עוד לענין',          LT('Masei', 7)),

  // ═══════════════════════════════════════
  // DEVARIM  Aug 9-15  [idx 301-307]
  // LT ShirHashirim pt13 (ch38-41) + LT Devarim
  // ═══════════════════════════════════════
  day('שה"ש יג - כי על כל',              LT('Shir_HaShirim', 38)),
  day('שה"ש יג - תנו רבנן',              LT('Shir_HaShirim', 40)),
  day('שה"ש יג - והנה ע"י',              LT('Shir_HaShirim', 39)),
  day('שה"ש יג - ביאור ע"פ כי כאשר',    LT('Shir_HaShirim', 41)),
  day('שה"ש יג - והארץ הדום רגלי',       LT('Shir_HaShirim', 41)),
  day('דברים - ציון במשפט',              LT('Devarim', 1)),
  day('דברים - ברבות פ\' עקב',            LT('Devarim', 2)),

  // ═══════════════════════════════════════
  // VAETCHANAN  Aug 16-22  [idx 308-314]
  // LT Vaetchanan
  // ═══════════════════════════════════════
  day('ואתחנן - ואתחנן',                 LT('Vaetchanan', 1)),
  day('ואתחנן - וזהו ואתחנן',            LT('Vaetchanan', 2)),
  day('ואתחנן - והנה הארה זו',           LT('Vaetchanan', 3)),
  day('ואתחנן - והנה פי\'',               LT('Vaetchanan', 4)),
  day('ואתחנן - והנה גילוי',             LT('Vaetchanan', 5)),
  day('ואתחנן - למען תירא',              LT('Vaetchanan', 6)),
  day('ואתחנן - ענין ק"ש',               LT('Vaetchanan', 7)),

  // ═══════════════════════════════════════
  // EIKEV  Aug 23-29  [idx 315-321]
  // LT Eikev
  // ═══════════════════════════════════════
  day('עקב - ויאכילך את המן',            LT('Eikev', 1)),
  day('עקב - ואכלת ושבעת',              LT('Eikev', 2)),
  day('עקב - וזהו ג"כ שצריך',            LT('Eikev', 2)),
  day('עקב - וענין הטובה',               LT('Eikev', 3)),
  day('עקב - ומעתה יש לבאר',             LT('Eikev', 3)),
  day('עקב - ולהבין שרש טעם',            LT('Eikev', 4)),
  day('עקב - ארץ הרים ובקעות',           LT('Eikev', 4)),

  // ═══════════════════════════════════════
  // REEH  Aug 30 - Sep 5  [idx 322-328]
  // LT Re'eh
  // ═══════════════════════════════════════
  day('ראה - ראה אנכי',                  LT("Re'eh", 1)),
  day('ראה - ביאור אחרי',                LT("Re'eh", 2)),
  day('ראה - כי תשמע',                   LT("Re'eh", 3)),
  day('ראה - וזהו ענין',                 LT("Re'eh", 4)),
  day('ראה - ואמר הקב"ה',               LT("Re'eh", 5)),
  day('ראה - והנה עפ"ז יובן',            LT("Re'eh", 6)),
  day('ראה - אני לדודי',                 LT("Re'eh", 7), LT("Re'eh", 8)),

  // ═══════════════════════════════════════
  // ROSH HASHANA (Shoftim missing)  Sep 6-12  [idx 329-335]
  // LT Rosh Hashanah pt1
  // ═══════════════════════════════════════
  day('דרושים לר"ה - תקעו בחדש שופר',   LT('Rosh_Hashanah', 1)),
  day('דרושים לר"ה - תקעו בחדש שופר ב', LT('Rosh_Hashanah', 2)),
  day('דרושים לר"ה - להבין המשנה',      LT('Rosh_Hashanah', 3)),
  day('דרושים לר"ה - ומעתה יבואר',      LT('Rosh_Hashanah', 4)),
  day('דרושים לר"ה - והיה ביום ההוא',   LT('Rosh_Hashanah', 5)),
  day('דרושים לר"ה - והנה עוד זאת',     LT('Rosh_Hashanah', 6)),
  day('דרושים לר"ה - ואזי כתיב ובאו',   LT('Rosh_Hashanah', 7)),

  // ═══════════════════════════════════════
  // KI TEITZEI  Sep 13-19  [idx 336-342]
  // LT Ki Teitzei
  // ═══════════════════════════════════════
  day('תצא - כי תצא',                    LT('Ki_Teitzei', 1)),
  day('תצא - כי תצא ב',                  LT('Ki_Teitzei', 2)),
  day('תצא - ביאור כי תצא',              LT('Ki_Teitzei', 3)),
  day('תצא - כי תהיין',                  LT('Ki_Teitzei', 4)),
  day('תצא - ולא אבה',                   LT('Ki_Teitzei', 5)),
  day('תצא - ביאור ולא אבה',             LT('Ki_Teitzei', 6)),
  day('תצא - כי ההרים ימושו',            LT('Ki_Teitzei', 7)),

  // ═══════════════════════════════════════
  // KI TAVO  Sep 20-26  [idx 343-349]
  // LT Rosh Hashanah pt2 + LT Ki Tavo
  // ═══════════════════════════════════════
  day('דרושים לר"ה - להבין ענין',        LT('Rosh_Hashanah', 1)),
  day('דרושים לר"ה - אך כיצד',           LT('Rosh_Hashanah', 2)),
  day('דרושים לר"ה - שיר המעלות',        LT('Rosh_Hashanah', 3)),
  day('דרושים לר"ה - יחיינו מיומים',     LT('Rosh_Hashanah', 4)),
  day('תבוא - היום הזה',                 LT('Ki_Tavo', 1)),
  day('תבוא - תחת אשר לא עבדת',         LT('Ki_Tavo', 2)),
  day('תבוא - ויקרא משה',               LT('Ki_Tavo', 3)),

  // ═══════════════════════════════════════
  // NITZAVIM  Sep 27 - Oct 3  [idx 350-356]
  // LT Nitzavim
  // ═══════════════════════════════════════
  day('נצבים - אתם נצבים',               LT('Nitzavim', 1)),
  day('נצבים - כי המצוה',                LT('Nitzavim', 2)),
  day('נצבים - כי קרוב',                 LT('Nitzavim', 3)),
  day('נצבים - שוש אשיש',               LT('Nitzavim', 4)),
  day('נצבים - ביאור ע"פ שוש אשיש',     LT('Nitzavim', 5)),
  day('נצבים - כי כארץ',                LT('Nitzavim', 6)),
  day('נצבים - ביאור ע"פ כי כארץ',      LT('Nitzavim', 7)),

  // ═══════════════════════════════════════
  // SHABBAT SHUVA / YOM KIPPUR  Oct 4-10  [idx 357-363]
  // (Vayeilech missing in Sefaria)
  // ═══════════════════════════════════════
  day('שבת שובה - שובה ישראל',           LT('Shabbat_Shuvah', 1)),
  day('שבת שובה - והנה סדר התשובה',      LT('Shabbat_Shuvah', 2)),
  day('שבת שובה - שובה ישראל ב',         LT('Shabbat_Shuvah', 3)),
  day('דרושים ליוה"כ - לבאר ענין',       LT('Yom_Kippur', 1)),
  day('דרושים ליוה"כ - שבת שבתון',       LT('Yom_Kippur', 1)),
  day('דרושים ליוה"כ - אך כל זה',        LT('Yom_Kippur', 2)),
  day('דרושים ליוה"כ - ביאור מעט',       LT('Yom_Kippur', 2)),

  // ═══════════════════════════════════════
  // HAAZINU / end of cycle  Oct 11  [idx 364]
  // ═══════════════════════════════════════
  day('דרושים לסוכות - ושאבתם מים',      LT('Sukkot', 1), LT("Ha'Azinu", 1)),
];

// Sanity check (runs only in browser dev)
if (typeof window !== 'undefined' && window.SCHEDULE.length !== 365) {
  console.warn(`⚠️ SCHEDULE length is ${window.SCHEDULE.length}, expected 365`);
}
