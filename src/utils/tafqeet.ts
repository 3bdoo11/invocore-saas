import { round2 } from './formatters';

const ONES_MASC: string[] = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
];

const ONES_FEM: string[] = [
  '',
  'واحدة',
  'اثنتان',
  'ثلاث',
  'أربع',
  'خمس',
  'ست',
  'سبع',
  'ثمان',
  'تسع',
];

const TEENS_MASC: string[] = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TEENS_FEM: string[] = [
  'عشر',
  'إحدى عشرة',
  'اثنتا عشرة',
  'ثلاث عشرة',
  'أربع عشرة',
  'خمس عشرة',
  'ست عشرة',
  'سبع عشرة',
  'ثماني عشرة',
  'تسع عشرة',
];

const TENS: string[] = [
  '',
  'عشرة',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const HUNDREDS: string[] = [
  '',
  'مائة',
  'مئتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertThreeDigits(num: number, feminine = false): string {
  if (num === 0) return '';

  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(HUNDREDS[hundreds]);
  }

  if (remainder > 0) {
    if (remainder < 10) {
      parts.push(feminine ? ONES_FEM[remainder] : ONES_MASC[remainder]);
    } else if (remainder < 20) {
      parts.push(feminine ? TEENS_FEM[remainder - 10] : TEENS_MASC[remainder - 10]);
    } else {
      const unit = remainder % 10;
      const ten = Math.floor(remainder / 10);
      if (unit > 0) {
        const unitWord = feminine ? ONES_FEM[unit] : ONES_MASC[unit];
        parts.push(`${unitWord} و${TENS[ten]}`);
      } else {
        parts.push(TENS[ten]);
      }
    }
  }

  return parts.join(' و');
}

interface ScaleUnit {
  singular: string;
  accusativeSingular: string;
  dual: string;
  plural: string;
}

const SCALES: ScaleUnit[] = [
  { singular: '', accusativeSingular: '', dual: '', plural: '' },
  {
    singular: 'ألف',
    accusativeSingular: 'ألفاً',
    dual: 'ألفان',
    plural: 'آلاف',
  },
  {
    singular: 'مليون',
    accusativeSingular: 'مليوناً',
    dual: 'اثنان مليون',
    plural: 'ملايين',
  },
  {
    singular: 'مليار',
    accusativeSingular: 'ملياراً',
    dual: 'ملياران',
    plural: 'مليارات',
  },
  {
    singular: 'تريليون',
    accusativeSingular: 'تريليوناً',
    dual: 'تريليونان',
    plural: 'تريليونات',
  },
];

function convertIntegerToArabic(n: number, feminine = false): string {
  if (n === 0) return 'صفر';

  const groups: number[] = [];
  let temp = Math.floor(Math.abs(n));
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const groupPhrases: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val === 0) continue;

    if (i === 0) {
      groupPhrases.push(convertThreeDigits(val, feminine));
    } else {
      const scale = SCALES[i] || {
        singular: '',
        accusativeSingular: '',
        dual: '',
        plural: '',
      };
      const rem100 = val % 100;
      if (val === 1) {
        groupPhrases.push(scale.singular);
      } else if (val === 2) {
        groupPhrases.push(scale.dual);
      } else if (rem100 >= 3 && rem100 <= 10) {
        groupPhrases.push(`${convertThreeDigits(val, false)} ${scale.plural}`);
      } else if (rem100 >= 11 && rem100 <= 99) {
        groupPhrases.push(
          `${convertThreeDigits(val, false)} ${scale.accusativeSingular}`
        );
      } else {
        groupPhrases.push(`${convertThreeDigits(val, false)} ${scale.singular}`);
      }
    }
  }

  return groupPhrases.join(' و');
}

/**
 * Converts a monetary SAR value into formal Saudi Arabic accounting words (التفقيط)
 * with "فقط لا غير" at the very end of the string (and no "فقط" at the beginning).
 *
 * Examples:
 * - 2249917.50 -> "اثنان مليون ومئتان وتسعة وأربعون ألفاً وتسعمائة وسبعة عشر ريالاً وخمسون هللة فقط لا غير"
 * - 2227.00    -> "ألفان ومئتان وسبعة وعشرون ريالاً سعودياً فقط لا غير"
 */
export function numberToArabicTafqeet(amount: number): string {
  const safeAmount = Math.max(0, round2(Number.isFinite(amount) ? amount : 0));
  const riyals = Math.floor(safeAmount);
  const halalas = Math.round((safeAmount - riyals) * 100);

  if (riyals === 0 && halalas === 0) {
    return 'صفر ريال سعودي فقط لا غير';
  }

  const parts: string[] = [];

  if (riyals > 0) {
    const rem100 = riyals % 100;
    const hasHalalas = halalas > 0;
    if (riyals === 1) {
      parts.push(hasHalalas ? 'ريال واحد' : 'ريال سعودي واحد');
    } else if (riyals === 2) {
      parts.push(hasHalalas ? 'ريالان اثنان' : 'ريالان سعوديان');
    } else if (rem100 >= 3 && rem100 <= 10) {
      parts.push(
        `${convertIntegerToArabic(riyals, false)} ${
          hasHalalas ? 'ريالات' : 'ريالات سعودية'
        }`
      );
    } else if (rem100 >= 11 && rem100 <= 99) {
      parts.push(
        `${convertIntegerToArabic(riyals, false)} ${
          hasHalalas ? 'ريالاً' : 'ريالاً سعودياً'
        }`
      );
    } else {
      parts.push(
        `${convertIntegerToArabic(riyals, false)} ${
          hasHalalas ? 'ريال' : 'ريال سعودي'
        }`
      );
    }
  }

  if (halalas > 0) {
    if (halalas === 1) {
      parts.push('هللة واحدة');
    } else if (halalas === 2) {
      parts.push('هللتان');
    } else if (halalas >= 3 && halalas <= 10) {
      parts.push(`${convertIntegerToArabic(halalas, true)} هللات`);
    } else {
      parts.push(`${convertIntegerToArabic(halalas, true)} هللة`);
    }
  }

  return `${parts.join(' و')} فقط لا غير`;
}

const EN_ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const EN_TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const EN_SCALES = ['', 'Thousand', 'Million', 'Billion'];

function convertThreeDigitsEn(num: number): string {
  if (num === 0) return '';
  const h = Math.floor(num / 100);
  const rem = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(`${EN_ONES[h]} Hundred`);
  }
  if (rem > 0) {
    if (rem < 20) {
      parts.push(EN_ONES[rem]);
    } else {
      const t = Math.floor(rem / 10);
      const u = rem % 10;
      parts.push(u > 0 ? `${EN_TENS[t]} ${EN_ONES[u]}` : EN_TENS[t]);
    }
  }
  return parts.join(' and ');
}

function convertIntegerToEnglish(n: number): string {
  if (n === 0) return 'Zero';
  let temp = Math.floor(Math.abs(n));
  const groups: number[] = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const chunk = convertThreeDigitsEn(g);
    const scale = EN_SCALES[i] || '';
    words.push(scale ? `${chunk} ${scale}` : chunk);
  }
  return words.join(', ');
}

export function numberToEnglishTafqeet(amount: number): string {
  const safeAmount = Math.max(0, round2(Number.isFinite(amount) ? amount : 0));
  const riyals = Math.floor(safeAmount);
  const halalas = Math.round((safeAmount - riyals) * 100);

  if (riyals === 0 && halalas === 0) {
    return 'Zero Saudi Riyals Only';
  }

  const riyalWords =
    riyals > 0
      ? `${convertIntegerToEnglish(riyals)} ${riyals === 1 ? 'Riyal' : 'Riyals'}`
      : '';
  const halalaWords =
    halalas > 0
      ? `${convertIntegerToEnglish(halalas)} ${halalas === 1 ? 'Halala' : 'Halalas'}`
      : '';

  if (riyalWords && halalaWords) {
    return `${riyalWords} and ${halalaWords} Only`;
  }
  return `${riyalWords || halalaWords} Only`;
}

