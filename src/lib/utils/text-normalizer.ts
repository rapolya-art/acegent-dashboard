/**
 * Ukrainian text normalizer for TTS.
 * Converts numbers, dates, times, prices to Ukrainian words
 * so that TTS reads them correctly.
 *
 * Ported from Python: Acegent/Livekit/agent/text_normalizer.py
 */

// --- Cardinal numbers ---

const UNITS: Record<number, string> = {
  0: "нуль", 1: "один", 2: "два", 3: "три", 4: "чотири",
  5: "п'ять", 6: "шість", 7: "сім", 8: "вісім", 9: "дев'ять",
};

const UNITS_FEM: Record<number, string> = { 1: "одна", 2: "дві" };

const TEENS: Record<number, string> = {
  10: "десять", 11: "одинадцять", 12: "дванадцять", 13: "тринадцять",
  14: "чотирнадцять", 15: "п'ятнадцять", 16: "шістнадцять",
  17: "сімнадцять", 18: "вісімнадцять", 19: "дев'ятнадцять",
};

const TENS: Record<number, string> = {
  20: "двадцять", 30: "тридцять", 40: "сорок", 50: "п'ятдесят",
  60: "шістдесят", 70: "сімдесят", 80: "вісімдесят", 90: "дев'яносто",
};

const HUNDREDS: Record<number, string> = {
  100: "сто", 200: "двісті", 300: "триста", 400: "чотириста",
  500: "п'ятсот", 600: "шістсот", 700: "сімсот", 800: "вісімсот",
  900: "дев'ятсот",
};

// --- Dates ---

const MONTHS: Record<number, string> = {
  1: "січня", 2: "лютого", 3: "березня", 4: "квітня",
  5: "травня", 6: "червня", 7: "липня", 8: "серпня",
  9: "вересня", 10: "жовтня", 11: "листопада", 12: "грудня",
};

const DAYS_ORD_GEN: Record<number, string> = {
  1: "першого", 2: "другого", 3: "третього", 4: "четвертого", 5: "п'ятого",
  6: "шостого", 7: "сьомого", 8: "восьмого", 9: "дев'ятого", 10: "десятого",
  11: "одинадцятого", 12: "дванадцятого", 13: "тринадцятого", 14: "чотирнадцятого",
  15: "п'ятнадцятого", 16: "шістнадцятого", 17: "сімнадцятого", 18: "вісімнадцятого",
  19: "дев'ятнадцятого", 20: "двадцятого", 21: "двадцять першого", 22: "двадцять другого",
  23: "двадцять третього", 24: "двадцять четвертого", 25: "двадцять п'ятого",
  26: "двадцять шостого", 27: "двадцять сьомого", 28: "двадцять восьмого",
  29: "двадцять дев'ятого", 30: "тридцятого", 31: "тридцять першого",
};

/**
 * Convert integer 0–999999 to Ukrainian words.
 */
export function numberToWords(n: number, feminine = false): string {
  if (n === 0) return "нуль";
  if (n < 0) return "мінус " + numberToWords(-n, feminine);

  const parts: string[] = [];
  let rem = n;

  // Thousands (тисяча is feminine)
  if (rem >= 1000) {
    const t = Math.floor(rem / 1000);
    rem %= 1000;

    if (t === 1) {
      parts.push("тисяча");
    } else if (t === 2) {
      parts.push("дві тисячі");
    } else if (t >= 3 && t <= 4) {
      parts.push(`${UNITS[t]} тисячі`);
    } else if (t >= 5 && t <= 19) {
      const tWord = TEENS[t] ?? UNITS[t] ?? String(t);
      parts.push(`${tWord} тисяч`);
    } else if (t === 20) {
      parts.push("двадцять тисяч");
    } else if (t > 20) {
      const tensPart = Math.floor(t / 10) * 10;
      const unitsPart = t % 10;
      const tTens = TENS[tensPart] ?? String(tensPart);

      if (unitsPart === 0) {
        parts.push(`${tTens} тисяч`);
      } else if (unitsPart === 1) {
        parts.push(`${tTens} одна тисяча`);
      } else if (unitsPart === 2) {
        parts.push(`${tTens} дві тисячі`);
      } else if (unitsPart <= 4) {
        parts.push(`${tTens} ${UNITS[unitsPart]} тисячі`);
      } else {
        parts.push(`${tTens} ${UNITS[unitsPart]} тисяч`);
      }
    }
  }

  // Hundreds
  if (rem >= 100) {
    parts.push(HUNDREDS[Math.floor(rem / 100) * 100]);
    rem %= 100;
  }

  // Tens and units
  if (rem >= 20) {
    parts.push(TENS[Math.floor(rem / 10) * 10]);
    rem %= 10;
  }

  if (rem >= 10 && rem <= 19) {
    parts.push(TEENS[rem]);
    rem = 0;
  }

  if (rem >= 1) {
    if (feminine && rem in UNITS_FEM) {
      parts.push(UNITS_FEM[rem]);
    } else {
      parts.push(UNITS[rem]);
    }
  }

  return parts.join(" ");
}

/**
 * Return correct form of 'гривня' for number n.
 */
function currencyForm(n: number): string {
  const lastTwo = Math.abs(n) % 100;
  const lastOne = Math.abs(n) % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return "гривень";
  if (lastOne === 1) return "гривня";
  if (lastOne >= 2 && lastOne <= 4) return "гривні";
  return "гривень";
}

const MONTH_NAMES_REGEX =
  "січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня";

/**
 * Normalize all numbers, dates, times, prices in text to Ukrainian words.
 */
export function normalizeText(text: string): string {
  // 1. Date: DD.MM.YYYY or DD.MM.YY
  text = text.replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g, (_m, d, mo) => {
    const day = parseInt(d, 10);
    const month = parseInt(mo, 10);
    const dayText = DAYS_ORD_GEN[day] ?? numberToWords(day);
    const monthText = MONTHS[month];
    if (monthText && day >= 1 && day <= 31) {
      return `${dayText} ${monthText}`;
    }
    return _m;
  });

  // 2. Date: YYYY-MM-DD (ISO)
  text = text.replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (_m, _y, mo, d) => {
    const month = parseInt(mo, 10);
    const day = parseInt(d, 10);
    const dayText = DAYS_ORD_GEN[day] ?? numberToWords(day);
    const monthText = MONTHS[month];
    if (monthText && day >= 1 && day <= 31) {
      return `${dayText} ${monthText}`;
    }
    return _m;
  });

  // 3. Time: HH:MM
  text = text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h, mi) => {
    const hours = parseInt(h, 10);
    const minutes = parseInt(mi, 10);
    const hText = numberToWords(hours);
    const mText = minutes === 0 ? "нуль нуль" : numberToWords(minutes);
    return `${hText} ${mText}`;
  });

  // 4. Price: number + грн/гривень/гривні/гривня
  text = text.replace(
    /\b(\d[\d\s\u00a0]*\d|\d)\s*(грн\.?|гривень|гривні|гривня)/g,
    (_m, numStr) => {
      const cleaned = numStr.replace(/[\s\u00a0]/g, "");
      const num = parseInt(cleaned, 10);
      if (isNaN(num)) return _m;
      return `${numberToWords(num, true)} ${currencyForm(num)}`;
    }
  );

  // 5. Percentage: number + %
  text = text.replace(/\b(\d+)\s*%/g, (_m, numStr) => {
    const num = parseInt(numStr, 10);
    return `${numberToWords(num)} відсотків`;
  });

  // 6. Day + month name
  const dayMonthRegex = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES_REGEX})\\b`, "g");
  text = text.replace(dayMonthRegex, (_m, d, month) => {
    const day = parseInt(d, 10);
    const dayText = DAYS_ORD_GEN[day];
    if (dayText) return `${dayText} ${month}`;
    return _m;
  });

  // 7. Standalone numbers (not already replaced)
  text = text.replace(/\b\d+\b/g, (m) => {
    const num = parseInt(m, 10);
    if (num > 999999) return m;
    return numberToWords(num);
  });

  return text;
}
