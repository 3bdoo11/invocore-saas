/**
 * Converts numbers into English currency words (e.g., 1500.50 -> One Thousand Five Hundred Saudi Riyals and Fifty Halalas).
 */

const ONES = [
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

const TENS = [
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

function convertThreeDigits(num: number): string {
  let str = '';
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    str += `${ONES[hundreds]} Hundred`;
    if (remainder > 0) str += ' and ';
  }

  if (remainder > 0) {
    if (remainder < 20) {
      str += ONES[remainder];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      str += TENS[ten];
      if (one > 0) str += `-${ONES[one]}`;
    }
  }

  return str;
}

import { TaxJurisdiction, getMarketConfig } from '../constants/jurisdictions';

export function formatEnglishTafqeetWithJurisdiction(
  amount: number,
  jurisdiction: TaxJurisdiction = 'KSA'
): string {
  const market = getMarketConfig(jurisdiction);
  return numberToEnglishWords(amount, market.majorUnitEn, market.minorUnitEn);
}

export function numberToEnglishWords(
  amount: number,
  currencyName = 'Saudi Riyals',
  fractionName = 'Halalas'
): string {
  if (isNaN(amount) || amount === 0) {
    return `Zero ${currencyName} Only`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const fractionalPart = Math.round((absAmount - integerPart) * 100);

  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let num = integerPart;
  const chunks: string[] = [];

  let scaleIdx = 0;
  while (num > 0 && scaleIdx < scales.length) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const chunkWords = convertThreeDigits(chunk);
      const scale = scales[scaleIdx];
      chunks.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }

  const intWords = chunks.length > 0 ? chunks.join(', ') : 'Zero';
  let result = `${intWords} ${currencyName}`;

  if (fractionalPart > 0) {
    const fracWords = convertThreeDigits(fractionalPart);
    result += ` and ${fracWords} ${fractionName}`;
  }

  result += ' Only.';

  return isNegative ? `Negative ${result}` : result;
}
