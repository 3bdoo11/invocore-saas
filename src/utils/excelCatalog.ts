import XLSX from 'xlsx-js-style';
import { CatalogItem, InvoiceData, SellerInfo } from '../types/invoice';
import {
  calculateInvoiceTotals,
  getTodayDateString,
  normalizeArabic,
  round2,
} from './formatters';

const INDEX_HEADER_PATTERNS = [
  'م',
  'م.',
  '#',
  'ت',
  'رقم',
  'الرقم',
  'تسلسل',
  'مسلسل',
  'الترتيب',
  'no',
  'no.',
  'id',
  'index',
  'seq',
  's/n',
  'sr',
].map(normalizeArabic);

const NAME_HEADER_PATTERNS = [
  'البيان / اسم الصنف',
  'البيان',
  'بيان',
  'اسم الصنف',
  'الصنف',
  'صنف',
  'الاسم',
  'الوصف',
  'البند',
  'بند',
  'الخدمه',
  'المنتج',
  'item',
  'name',
  'description',
  'product',
  'title',
].map(normalizeArabic);

const PRICE_HEADER_PATTERNS = [
  'السعر الافرادي',
  'السعر الإفرادي',
  'السعر',
  'سعر الوحده',
  'سعر الصنف',
  'سعر',
  'القيمه',
  'التكلفه',
  'المبلغ',
  'الافرادي',
  'price',
  'unitprice',
  'unit price',
  'unit_price',
  'rate',
  'amount',
  'cost',
].map(normalizeArabic);

const BANNER_AND_SUMMARY_PATTERNS = [
  'شركه واحه صقر العروبه',
  'منصة invocore',
  'invocore',
  'انفو كور',
  'تقرير النظام',
  'قاعده بيانات الاصناف',
  'نموذج استيراد الاصناف',
  'ارشادات الاستخدام',
  'تاريخ التصدير',
  'اجمالي عدد الاصناف',
  'اجمالي الفواتير',
].map(normalizeArabic);

const HAS_LETTER_REGEX = /[\u0600-\u06FFa-zA-Z]/;

// Corporate Excel Style Presets (xlsx-js-style)
const THIN_GRAY_BORDER = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const HEADER_BORDER = {
  top: { style: 'thin', color: { rgb: '0F172A' } },
  bottom: { style: 'medium', color: { rgb: 'B45309' } },
  left: { style: 'thin', color: { rgb: '1E3A8A' } },
  right: { style: 'thin', color: { rgb: '1E3A8A' } },
};

const SUMMARY_BORDER = {
  top: { style: 'medium', color: { rgb: 'B45309' } },
  bottom: { style: 'double', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: 'D97706' } },
  right: { style: 'thin', color: { rgb: 'D97706' } },
};

const TITLE_BANNER_STYLE = {
  fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } },
  font: {
    name: 'Arial',
    family: 2,
    sz: 14,
    bold: true,
    color: { rgb: 'FFFFFF' },
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
    wrapText: true,
  },
  border: {
    top: { style: 'medium', color: { rgb: '0F172A' } },
    bottom: { style: 'medium', color: { rgb: 'B45309' } },
    left: { style: 'thin', color: { rgb: '0F172A' } },
    right: { style: 'thin', color: { rgb: '0F172A' } },
  },
};

const SUBTITLE_BAR_STYLE = {
  fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
  font: {
    name: 'Arial',
    family: 2,
    sz: 10,
    bold: true,
    color: { rgb: '334155' },
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
  },
  border: THIN_GRAY_BORDER,
};

function createTableHeaderStyle(bgRgb: '047857' | '1E3A8A' = '047857') {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: bgRgb } },
    font: {
      name: 'Arial',
      family: 2,
      sz: 11,
      bold: true,
      color: { rgb: 'FFFFFF' },
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true,
    },
    border: HEADER_BORDER,
  };
}

function createDataCellStyle(
  isEvenRow: boolean,
  align: 'right' | 'center' | 'left' = 'right',
  bold = false,
  numFmt?: string
) {
  return {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: isEvenRow ? 'F8FAFC' : 'FFFFFF' },
    },
    font: {
      name: 'Arial',
      family: 2,
      sz: 11,
      bold,
      color: { rgb: '0F172A' },
    },
    alignment: {
      horizontal: align,
      vertical: 'center',
      wrapText: true,
    },
    border: THIN_GRAY_BORDER,
    ...(numFmt ? { numFmt } : {}),
  };
}

function createSummaryCellStyle(
  align: 'right' | 'center' | 'left' = 'center',
  numFmt?: string
) {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } },
    font: {
      name: 'Arial',
      family: 2,
      sz: 11,
      bold: true,
      color: { rgb: '0F172A' },
    },
    alignment: {
      horizontal: align,
      vertical: 'center',
    },
    border: SUMMARY_BORDER,
    ...(numFmt ? { numFmt } : {}),
  };
}

function applyMergedRowStyle(
  ws: Record<string, unknown>,
  rowIdx: number,
  colCount: number,
  style: Record<string, unknown>
) {
  for (let c = 0; c < colCount; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
    if (!ws[cellRef]) {
      ws[cellRef] = { t: 's', v: '' };
    }
    (ws[cellRef] as Record<string, unknown>).s = style;
  }
}

function parseNumericPrice(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, round2(raw));
  }
  if (typeof raw === 'string') {
    const easternConverted = raw.replace(/[٠-٩]/g, (d) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    );
    const cleaned = easternConverted.replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return Math.max(0, round2(parsed));
    }
  }
  return null;
}

export interface ImportedCatalogItemData {
  name: string;
  unit: string;
  defaultQuantity: number;
  unitPrice: number;
}

export interface ImportedCatalogResult {
  items: ImportedCatalogItemData[];
  skippedRows: number;
}

function isBannerOrSummaryRow(row: unknown[]): boolean {
  if (!Array.isArray(row)) return true;

  const nonEmptyCells = row
    .map((c) => String(c ?? '').trim())
    .filter((s) => s.length > 0);

  if (nonEmptyCells.length === 0) return true;

  // Single non-empty cell across a multi-column row is a merged title/subtitle banner
  if (nonEmptyCells.length === 1 && row.length >= 2) {
    return true;
  }

  for (const cellStr of nonEmptyCells) {
    const norm = normalizeArabic(cellStr);
    if (BANNER_AND_SUMMARY_PATTERNS.some((p) => norm.includes(p))) {
      return true;
    }
  }

  const firstNorm = normalizeArabic(nonEmptyCells[0]);
  if (
    firstNorm === 'الاجمالي' ||
    firstNorm === 'المجموع' ||
    firstNorm === 'total' ||
    firstNorm.startsWith('اجمالي ')
  ) {
    return true;
  }

  return false;
}

/**
 * Parses an uploaded .xlsx, .xls, or .csv sheet and extracts 6-column { name, unit, defaultQuantity, unitPrice } items.
 * Automatically skips corporate title banner rows, subtitle/instruction bars, and summary rows,
 * ignores index columns (`م` / `#`), and supports both 6-column and 2/3-column sheets.
 */
export async function parseExcelCatalogFile(
  file: File
): Promise<ImportedCatalogResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { items: [], skippedRows: 0 };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    return { items: [], skippedRows: 0 };
  }

  let headerRowIdx = -1;
  let nameColIdx = -1;
  let unitColIdx = -1;
  let qtyColIdx = -1;
  let priceColIdx = -1;
  let totalColIdx = -1;

  // 1. Scan first 15 rows to locate the actual table header row (skipping banners)
  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row) || isBannerOrSummaryRow(row)) continue;

    let detectedName = -1;
    let detectedUnit = -1;
    let detectedQty = -1;
    let detectedPrice = -1;
    let detectedTotal = -1;

    row.forEach((cell, cIdx) => {
      const rawStr = String(cell ?? '').trim();
      if (!rawStr || rawStr.length > 45) return;

      const norm = normalizeArabic(rawStr);
      if (!norm) return;

      // Strictly ignore index columns (`م`, `#`, `ت`, `No`, etc.)
      if (INDEX_HEADER_PATTERNS.includes(norm)) {
        return;
      }

      if (
        detectedName === -1 &&
        NAME_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        detectedName = cIdx;
      } else if (
        detectedUnit === -1 &&
        UNIT_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        detectedUnit = cIdx;
      } else if (
        detectedQty === -1 &&
        QTY_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        detectedQty = cIdx;
      } else if (
        detectedPrice === -1 &&
        (norm.includes(normalizeArabic('السعر قبل الضريبه')) ||
          norm.includes(normalizeArabic('السعر الفردي')) ||
          norm.includes(normalizeArabic('السعر الافرادي')) ||
          PRICE_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p)))
      ) {
        detectedPrice = cIdx;
      } else if (
        detectedTotal === -1 &&
        TOTAL_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        detectedTotal = cIdx;
      }
    });

    if (detectedName !== -1 && (detectedPrice !== -1 || detectedTotal !== -1)) {
      headerRowIdx = r;
      nameColIdx = detectedName;
      unitColIdx = detectedUnit;
      qtyColIdx = detectedQty;
      priceColIdx = detectedPrice;
      totalColIdx = detectedTotal;
      break;
    }

    if (detectedName !== -1 && headerRowIdx === -1) {
      headerRowIdx = r;
      nameColIdx = detectedName;
      unitColIdx = detectedUnit;
      qtyColIdx = detectedQty;
      priceColIdx = detectedPrice;
      totalColIdx = detectedTotal;
    }
  }

  let startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

  // 2. Fallback when no headers exist or price column was not explicitly labeled
  if (nameColIdx === -1 || priceColIdx === -1) {
    const candidateRows = rows
      .slice(startRow)
      .filter((r) => Array.isArray(r) && !isBannerOrSummaryRow(r));

    const maxCols = candidateRows.reduce(
      (max, r) => Math.max(max, r.length),
      0
    );

    if (nameColIdx === -1 && maxCols >= 5) {
      // Standard 6-column layout without headers: [0: #, 1: Name, 2: Unit, 3: Qty, 4: UnitPrice, 5: LineTotal]
      nameColIdx = 1;
      unitColIdx = 2;
      qtyColIdx = 3;
      priceColIdx = 4;
      totalColIdx = 5;
    } else {
      const colStats = Array.from({ length: maxCols }, (_, c) => {
        let textCount = 0;
        let numericCount = 0;
        const numericValues: number[] = [];

        for (const r of candidateRows) {
          const val = r[c];
          const str = String(val ?? '').trim();
          if (!str) continue;

          if (HAS_LETTER_REGEX.test(str)) {
            textCount++;
          } else {
            const num = parseNumericPrice(val);
            if (num !== null) {
              numericCount++;
              numericValues.push(num);
            }
          }
        }

        // Detect if a numeric column is just sequential row numbers (1, 2, 3...)
        const isSequentialIndex =
          numericValues.length >= 2 &&
          numericValues.every((v, idx) => v === idx + 1);

        return { c, textCount, numericCount, isSequentialIndex };
      });

      if (nameColIdx === -1) {
        const bestTextCol = colStats
          .filter((s) => s.textCount > 0)
          .sort((a, b) => b.textCount - a.textCount)[0];
        nameColIdx = bestTextCol ? bestTextCol.c : 0;
      }

      if (priceColIdx === -1) {
        const numericCandidates = colStats.filter(
          (s) => s.c !== nameColIdx && s.numericCount > 0
        );
        const nonIndexCandidate =
          numericCandidates.find(
            (s) => !s.isSequentialIndex && s.c > nameColIdx
          ) ||
          numericCandidates.find((s) => !s.isSequentialIndex) ||
          numericCandidates[numericCandidates.length - 1];

        priceColIdx = nonIndexCandidate ? nonIndexCandidate.c : nameColIdx + 1;
      }
    }
  }

  // 3. Extract valid items (never allowing pure numbers or banners as item names)
  const extracted: ImportedCatalogItemData[] = [];
  let skippedRows = 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || isBannerOrSummaryRow(row)) {
      skippedRows++;
      continue;
    }

    const rawName = String(row[nameColIdx] ?? '').trim();
    const normName = normalizeArabic(rawName);

    // Reject empty strings, pure numbers (e.g. 1, 2, 3), repeated headers, or totals
    if (
      !rawName ||
      !HAS_LETTER_REGEX.test(rawName) ||
      INDEX_HEADER_PATTERNS.includes(normName) ||
      NAME_HEADER_PATTERNS.includes(normName) ||
      normName.startsWith('اجمالي') ||
      normName === 'المجموع' ||
      BANNER_AND_SUMMARY_PATTERNS.some((p) => normName.includes(p))
    ) {
      skippedRows++;
      continue;
    }

    const rawUnit =
      unitColIdx !== -1 ? String(row[unitColIdx] ?? '').trim() : '';
    const unit = rawUnit || 'وحدة';

    const parsedQty =
      qtyColIdx !== -1 ? parseNumericPrice(row[qtyColIdx]) : null;
    const defaultQuantity = parsedQty !== null && parsedQty > 0 ? parsedQty : 1;

    const parsedPrice =
      priceColIdx !== -1 ? parseNumericPrice(row[priceColIdx]) : null;
    const parsedTotal =
      totalColIdx !== -1 ? parseNumericPrice(row[totalColIdx]) : null;

    let unitPrice = parsedPrice !== null ? parsedPrice : 0;
    if (
      unitPrice === 0 &&
      parsedTotal !== null &&
      parsedTotal > 0 &&
      defaultQuantity > 0
    ) {
      unitPrice = round2(parsedTotal / defaultQuantity);
    }

    extracted.push({
      name: rawName,
      unit,
      defaultQuantity,
      unitPrice,
    });
  }

  return { items: extracted, skippedRows };
}

/**
 * 1. Exports catalog items (all or selected subset) as a richly styled 6-Column corporate RTL .xlsx file:
 * [المسلسل | اسم الصنف أو البيان | الوحدة | الكمية | السعر الفردي قبل الضريبة | الإجمالي قبل الضريبة]
 */
export function exportCatalogToExcel(
  catalog: CatalogItem[],
  isSelectedSubset = false
): void {
  const headers = [
    'المسلسل',
    'اسم الصنف أو البيان',
    'الوحدة',
    'الكمية',
    'السعر الفردي قبل الضريبة',
    'الإجمالي قبل الضريبة',
  ];
  const colCount = headers.length;

  let totalLineSum = 0;
  let totalUnitPricesSum = 0;

  const dataRows = catalog.map((item, idx) => {
    const qty = Number(item.defaultQuantity) > 0 ? Number(item.defaultQuantity) : 1;
    const price = round2(Number(item.unitPrice) || 0);
    const lineTotal = round2(qty * price);
    totalUnitPricesSum = round2(totalUnitPricesSum + price);
    totalLineSum = round2(totalLineSum + lineTotal);

    return [
      idx + 1,
      item.name,
      item.unit || 'وحدة',
      qty,
      price,
      lineTotal,
    ];
  });

  const sheetData: unknown[][] = [
    [
      'قاعدة بيانات الأصناف والأسعار المعتمدة (6 أعمدة قياسية)',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      `${
        isSelectedSubset ? 'تصدير الأصناف المحددة فقط' : 'تصدير كامل قاعدة الأصناف'
      } — تاريخ التصدير: ${getTodayDateString()} — إجمالي الأصناف: ${catalog.length}`,
      '',
      '',
      '',
      '',
      '',
    ],
    headers,
    ...dataRows,
    [
      '',
      `الإجمالي الكلي (${catalog.length} صنف)`,
      '',
      '',
      totalUnitPricesSum,
      totalLineSum,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData) as Record<string, unknown>;

  // RTL View
  ws['!views'] = [{ rightToLeft: true }];

  // Generous 6-Column Widths
  ws['!cols'] = [
    { wch: 12 },
    { wch: 46 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
  ];

  // Row Heights
  ws['!rows'] = [
    { hpt: 36 },
    { hpt: 22 },
    { hpt: 28 },
    ...dataRows.map(() => ({ hpt: 24 })),
    { hpt: 28 },
  ];

  // Merge Title Banner (Row 0) & Subtitle (Row 1)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  applyMergedRowStyle(ws, 0, colCount, TITLE_BANNER_STYLE);
  applyMergedRowStyle(ws, 1, colCount, SUBTITLE_BAR_STYLE);

  // Style Table Header Row (Row 2) - Emerald Green (#047857)
  const headerStyle = createTableHeaderStyle('047857');
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) (ws[ref] as Record<string, unknown>).s = headerStyle;
  }

  // Style Data Rows (Rows 3 .. 3 + catalog.length - 1)
  dataRows.forEach((_, idx) => {
    const r = 3 + idx;
    const isEven = idx % 2 === 1;

    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      const isCurrency = c === 4 || c === 5;
      const align = c === 1 ? 'right' : 'center';
      const bold = c === 0 || c === 1 || c === 5;
      if (isCurrency) {
        (ws[ref] as Record<string, unknown>).t = 'n';
        (ws[ref] as Record<string, unknown>).z = '#,##0.00';
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          'center',
          bold,
          '#,##0.00'
        );
      } else {
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          align,
          bold
        );
      }
    }
  });

  // Style Summary Row
  const summaryRowIdx = 3 + dataRows.length;
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: summaryRowIdx, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    if (c === 4 || c === 5) {
      (ws[ref] as Record<string, unknown>).t = 'n';
      (ws[ref] as Record<string, unknown>).z = '#,##0.00';
      (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
        'center',
        '#,##0.00'
      );
    } else {
      (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
        c === 1 ? 'right' : 'center'
      );
    }
  }

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(
    workbook,
    ws as unknown as XLSX.WorkSheet,
    'قاعدة بيانات الأصناف'
  );
  XLSX.writeFile(
    workbook,
    isSelectedSubset
      ? `الأصناف_المحددة_${catalog.length}_صنف.xlsx`
      : 'قاعدة_بيانات_الأصناف_6_أعمدة.xlsx'
  );
}

/**
 * 2. Downloads a richly styled, ready-to-fill 6-Column .xlsx template for catalog imports:
 * [المسلسل | اسم الصنف أو البيان | الوحدة | الكمية | السعر الفردي قبل الضريبة | الإجمالي قبل الضريبة]
 */
export function downloadEmptyCatalogTemplate(): void {
  const headers = [
    'المسلسل',
    'اسم الصنف أو البيان',
    'الوحدة',
    'الكمية',
    'السعر الفردي قبل الضريبة',
    'الإجمالي قبل الضريبة',
  ];
  const colCount = headers.length;
  const sampleRows: Array<[number, string, string, number, number, number]> = [
    [1, 'توريد خرسانة جاهزة جهد 400 مقاوم', 'م3', 120, 285, 34200],
    [2, 'أعمال لياسة داخلية وخارجية شاملة المواد', 'م2', 450, 35, 15750],
    [3, 'توريد وتركيب حديد تسليح سابك', 'طن', 15, 2850, 42750],
  ];

  const templateData: unknown[][] = [
    ['نموذج استيراد قاعدة بيانات الأصناف والأسعار (6 أعمدة قياسية)', '', '', '', '', ''],
    [
      'أضف أصنافك مع الوحدة والكمية الافتراضية والسعر الفردي قبل الضريبة ثم ارفع الملف للنظام',
      '',
      '',
      '',
      '',
      '',
    ],
    headers,
    ...sampleRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData) as Record<string, unknown>;
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 12 },
    { wch: 46 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
  ];
  ws['!rows'] = [
    { hpt: 36 },
    { hpt: 22 },
    { hpt: 28 },
    ...sampleRows.map(() => ({ hpt: 24 })),
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  applyMergedRowStyle(ws, 0, colCount, TITLE_BANNER_STYLE);
  applyMergedRowStyle(ws, 1, colCount, SUBTITLE_BAR_STYLE);

  const headerStyle = createTableHeaderStyle('1E3A8A');
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) (ws[ref] as Record<string, unknown>).s = headerStyle;
  }

  sampleRows.forEach((_, idx) => {
    const r = 3 + idx;
    const isEven = idx % 2 === 1;
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      const isCurrency = c === 4 || c === 5;
      const align = c === 1 ? 'right' : 'center';
      const bold = c === 0 || c === 1 || c === 5;
      if (isCurrency) {
        (ws[ref] as Record<string, unknown>).t = 'n';
        (ws[ref] as Record<string, unknown>).z = '#,##0.00';
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          'center',
          bold,
          '#,##0.00'
        );
      } else {
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          align,
          bold
        );
      }
    }
  });

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(
    workbook,
    ws as unknown as XLSX.WorkSheet,
    'نموذج الأصناف'
  );
  XLSX.writeFile(workbook, 'نموذج_قاعدة_الأصناف_6_أعمدة.xlsx');
}

/**
 * 3. Exports the Saved Invoices History (`saas_invoices`) to a styled corporate RTL Excel sheet
 * with a Gold/Amber bottom summary row calculating total Subtotal, Discount, VAT 15%, and Net Total.
 */
export function exportInvoicesHistoryToExcel(invoices: InvoiceData[]): void {
  const headers = [
    'م',
    'رقم الفاتورة',
    'التاريخ والوقت',
    'اسم العميل',
    'الرقم الضريبي للعميل',
    'طريقة الدفع',
    'الإجمالي قبل الضريبة (ر.س)',
    'الخصم (ر.س)',
    'ضريبة القيمة المضافة 15% (ر.س)',
    'صافي الفاتورة النهائي (ر.س)',
  ];
  const colCount = headers.length;

  let sumSubtotal = 0;
  let sumDiscount = 0;
  let sumVat = 0;
  let sumFinal = 0;

  const dataRows = invoices.map((inv, idx) => {
    const t = calculateInvoiceTotals(inv);
    sumSubtotal = round2(sumSubtotal + t.subtotal);
    sumDiscount = round2(sumDiscount + t.totalDiscount);
    sumVat = round2(sumVat + t.vatAmount);
    sumFinal = round2(sumFinal + t.finalTotal);

    return [
      idx + 1,
      `#${inv.invoiceNumber}`,
      `${inv.date} ${inv.time}`,
      inv.client.name || '—',
      inv.client.taxNumber || '—',
      inv.paymentMethod,
      t.subtotal,
      t.totalDiscount,
      t.vatAmount,
      t.finalTotal,
    ];
  });

  const summaryRow = [
    '',
    'الإجمالي الكلي',
    `عدد الفواتير: ${invoices.length}`,
    '',
    '',
    '',
    sumSubtotal,
    sumDiscount,
    sumVat,
    sumFinal,
  ];

  const sheetData: unknown[][] = [
    ['منصة InvoCore للفوترة الذكية - تقرير النظام', ...Array(colCount - 1).fill('')],
    [
      `تقرير سجل الفواتير الضريبية الصادرة — تاريخ التصدير: ${getTodayDateString()} — إجمالي الفواتير: ${invoices.length}`,
      ...Array(colCount - 1).fill(''),
    ],
    headers,
    ...dataRows,
    summaryRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData) as Record<string, unknown>;

  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 20 },
    { wch: 38 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 26 },
    { wch: 26 },
  ];

  ws['!rows'] = [
    { hpt: 36 },
    { hpt: 22 },
    { hpt: 30 },
    ...dataRows.map(() => ({ hpt: 24 })),
    { hpt: 30 },
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  applyMergedRowStyle(ws, 0, colCount, TITLE_BANNER_STYLE);
  applyMergedRowStyle(ws, 1, colCount, SUBTITLE_BAR_STYLE);

  // Table Header Row (Row 2) - Royal Blue (#1E3A8A)
  const headerStyle = createTableHeaderStyle('1E3A8A');
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) (ws[ref] as Record<string, unknown>).s = headerStyle;
  }

  // Data Rows
  dataRows.forEach((_, rOffset) => {
    const r = 3 + rOffset;
    const isEven = rOffset % 2 === 1;

    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      const isCurrencyCol = c >= 6;
      const align = c === 3 ? 'right' : 'center';
      const isBold = c === 1 || c === 3 || c === 9;

      if (isCurrencyCol) {
        (ws[ref] as Record<string, unknown>).t = 'n';
        (ws[ref] as Record<string, unknown>).z = '#,##0.00';
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          'center',
          isBold,
          '#,##0.00'
        );
      } else {
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          align,
          isBold
        );
      }
    }
  });

  // Summary Row (Soft Gold/Amber #FEF3C7)
  const sumRowIdx = 3 + dataRows.length;
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: sumRowIdx, c });
    if (!ws[ref]) {
      ws[ref] = { t: 's', v: '' };
    }
    const isCurrencyCol = c >= 6;
    if (isCurrencyCol) {
      (ws[ref] as Record<string, unknown>).t = 'n';
      (ws[ref] as Record<string, unknown>).z = '#,##0.00';
      (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
        'center',
        '#,##0.00'
      );
    } else {
      (ws[ref] as Record<string, unknown>).s =
        createSummaryCellStyle('center');
    }
  }

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(
    workbook,
    ws as unknown as XLSX.WorkSheet,
    'سجل الفواتير الضريبية'
  );
  XLSX.writeFile(workbook, 'سجل_الفواتير_الضريبية.xlsx');
}

const UNIT_HEADER_PATTERNS = [
  'الوحده',
  'الوحدة',
  'وحده',
  'وحدة',
  'unit',
  'uom',
].map(normalizeArabic);

const QTY_HEADER_PATTERNS = [
  'الكميه',
  'الكمية',
  'العدد',
  'كميه',
  'عدد',
  'qty',
  'quantity',
].map(normalizeArabic);

const TOTAL_HEADER_PATTERNS = [
  'الاجمالي قبل الضريبه',
  'الإجمالي قبل الضريبة',
  'الاجمالي',
  'الإجمالي',
  'اجمالي',
  'المجموع',
  'total',
  'subtotal',
].map(normalizeArabic);

export interface ImportedInvoiceLineItem {
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

/**
 * 4. Parses a 6-column Invoice Items Excel file directly into invoice line items:
 * Columns: [1: المسلسل, 2: اسم الصنف أو البيان, 3: الوحدة, 4: الكمية, 5: السعر قبل الضريبة, 6: الإجمالي قبل الضريبة]
 */
export async function parseInvoiceItemsExcelFile(
  file: File
): Promise<ImportedInvoiceLineItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) return [];

  let headerRowIdx = -1;
  let nameCol = -1;
  let unitCol = -1;
  let qtyCol = -1;
  let priceCol = -1;
  let totalCol = -1;

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row) || isBannerOrSummaryRow(row)) continue;

    let dName = -1;
    let dUnit = -1;
    let dQty = -1;
    let dPrice = -1;
    let dTotal = -1;

    row.forEach((cell, cIdx) => {
      const rawStr = String(cell ?? '').trim();
      if (!rawStr || rawStr.length > 45) return;
      const norm = normalizeArabic(rawStr);
      if (!norm || INDEX_HEADER_PATTERNS.includes(norm)) return;

      if (
        dName === -1 &&
        NAME_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        dName = cIdx;
      } else if (
        dUnit === -1 &&
        UNIT_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        dUnit = cIdx;
      } else if (
        dQty === -1 &&
        QTY_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        dQty = cIdx;
      } else if (
        dPrice === -1 &&
        (norm.includes(normalizeArabic('السعر قبل الضريبه')) ||
          norm.includes(normalizeArabic('السعر الافرادي')) ||
          PRICE_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p)))
      ) {
        dPrice = cIdx;
      } else if (
        dTotal === -1 &&
        TOTAL_HEADER_PATTERNS.some((p) => norm === p || norm.includes(p))
      ) {
        dTotal = cIdx;
      }
    });

    if (dName !== -1) {
      headerRowIdx = r;
      nameCol = dName;
      unitCol = dUnit;
      qtyCol = dQty;
      priceCol = dPrice;
      totalCol = dTotal;
      break;
    }
  }

  let startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

  // Fallback for 6-column standard layout if header row was omitted
  if (nameCol === -1) {
    startRow = 0;
    const firstValid = rows.find(
      (r) => Array.isArray(r) && !isBannerOrSummaryRow(r)
    );
    if (firstValid && firstValid.length >= 5) {
      nameCol = 1;
      unitCol = 2;
      qtyCol = 3;
      priceCol = 4;
      totalCol = 5;
    } else {
      nameCol = 0;
      priceCol = 1;
    }
  }

  const items: ImportedInvoiceLineItem[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || isBannerOrSummaryRow(row)) continue;

    const rawName = String(row[nameCol] ?? '').trim();
    const normName = normalizeArabic(rawName);

    if (
      !rawName ||
      !HAS_LETTER_REGEX.test(rawName) ||
      INDEX_HEADER_PATTERNS.includes(normName) ||
      NAME_HEADER_PATTERNS.includes(normName) ||
      normName.startsWith('اجمالي') ||
      normName === 'المجموع' ||
      BANNER_AND_SUMMARY_PATTERNS.some((p) => normName.includes(p))
    ) {
      continue;
    }

    const rawUnit =
      unitCol !== -1 ? String(row[unitCol] ?? '').trim() : '';
    const unit = rawUnit || 'وحدة';

    const parsedQty = qtyCol !== -1 ? parseNumericPrice(row[qtyCol]) : null;
    const qty = parsedQty !== null && parsedQty > 0 ? parsedQty : 1;

    const parsedPrice =
      priceCol !== -1 ? parseNumericPrice(row[priceCol]) : null;
    const parsedTotal =
      totalCol !== -1 ? parseNumericPrice(row[totalCol]) : null;

    let unitPrice = parsedPrice !== null ? parsedPrice : 0;
    if (unitPrice === 0 && parsedTotal !== null && parsedTotal > 0 && qty > 0) {
      unitPrice = round2(parsedTotal / qty);
    }

    items.push({
      description: rawName,
      unit,
      qty,
      unitPrice,
    });
  }

  return items;
}

/**
 * 5. Downloads a 6-Column Standard Invoice Items Excel Template (.xlsx):
 * [المسلسل | اسم الصنف أو البيان | الوحدة | الكمية | السعر قبل الضريبة | الإجمالي قبل الضريبة]
 */
export function downloadInvoiceItemsTemplate(): void {
  const headers = [
    'المسلسل',
    'اسم الصنف أو البيان',
    'الوحدة',
    'الكمية',
    'السعر قبل الضريبة',
    'الإجمالي قبل الضريبة',
  ];
  const colCount = headers.length;

  const sampleRows: Array<[number, string, string, number, number, number]> = [
    [1, 'توريد وصب خرسانة جاهزة جهد 400 مقاوم', 'م3', 120, 285, 34200],
    [2, 'توريد وتركيب حديد تسليح وطني سابك', 'طن', 15, 2850, 42750],
    [3, 'أعمال لياسة داخلية وخارجية شاملة المواد', 'م2', 450, 35, 15750],
    [4, 'أعمال عزل مائي وحراري للأسطح والقواعد', 'مقطوعية', 1, 18500, 18500],
  ];

  const totalSum = sampleRows.reduce((s, r) => s + r[5], 0);

  const sheetData: unknown[][] = [
    ['نموذج استيراد بنود الفاتورة الضريبية (6 أعمدة قياسية)', '', '', '', '', ''],
    [
      'أدخل البنود والوحدة والكمية والسعر قبل الضريبة ثم ارفع الملف مباشرة داخل قسم بنود الفاتورة',
      '',
      '',
      '',
      '',
      '',
    ],
    headers,
    ...sampleRows,
    ['', 'الإجمالي قبل الضريبة', '', '', '', totalSum],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData) as Record<string, unknown>;
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 12 },
    { wch: 46 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
  ];
  ws['!rows'] = [
    { hpt: 34 },
    { hpt: 22 },
    { hpt: 28 },
    ...sampleRows.map(() => ({ hpt: 24 })),
    { hpt: 28 },
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  applyMergedRowStyle(ws, 0, colCount, TITLE_BANNER_STYLE);
  applyMergedRowStyle(ws, 1, colCount, SUBTITLE_BAR_STYLE);

  const headerStyle = createTableHeaderStyle('047857');
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) (ws[ref] as Record<string, unknown>).s = headerStyle;
  }

  sampleRows.forEach((_, idx) => {
    const r = 3 + idx;
    const isEven = idx % 2 === 1;
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      const isCurrency = c === 4 || c === 5;
      const align = c === 1 ? 'right' : 'center';
      const bold = c === 0 || c === 1 || c === 5;
      if (isCurrency) {
        (ws[ref] as Record<string, unknown>).t = 'n';
        (ws[ref] as Record<string, unknown>).z = '#,##0.00';
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          'center',
          bold,
          '#,##0.00'
        );
      } else {
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          align,
          bold
        );
      }
    }
  });

  const sumRowIdx = 3 + sampleRows.length;
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: sumRowIdx, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    if (c === 5) {
      (ws[ref] as Record<string, unknown>).t = 'n';
      (ws[ref] as Record<string, unknown>).z = '#,##0.00';
      (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
        'center',
        '#,##0.00'
      );
    } else {
      (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
        c === 1 ? 'right' : 'center'
      );
    }
  }

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(
    workbook,
    ws as unknown as XLSX.WorkSheet,
    'بنود الفاتورة'
  );
  XLSX.writeFile(workbook, 'نموذج_بنود_الفاتورة_6_أعمدة.xlsx');
}

/**
 * 6. Exports ALL Line Items Currently in the Active Invoice (across ALL pages, whether 1 or 50 items)
 * to a richly styled 6-Column corporate RTL Excel sheet:
 * [المسلسل | اسم الصنف أو البيان | الوحدة | الكمية | السعر قبل الضريبة | الإجمالي قبل الضريبة]
 * plus bottom financial summary rows (Subtotal before VAT, Discount, VAT %, and Net Final Total).
 */
export function exportCurrentInvoiceItemsToExcel(
  invoice: InvoiceData,
  seller: SellerInfo
): void {
  const headers = [
    'المسلسل',
    'اسم الصنف أو البيان',
    'الوحدة',
    'الكمية',
    'السعر قبل الضريبة',
    'الإجمالي قبل الضريبة',
  ];
  const colCount = headers.length;
  const totals = calculateInvoiceTotals(invoice);

  const dataRows = invoice.items.map((item, idx) => {
    const qty = Number(item.qty) || 0;
    const price = round2(Number(item.unitPrice) || 0);
    const lineTotal = round2(qty * price);
    return [
      idx + 1,
      item.description || '—',
      item.unit || 'وحدة',
      qty,
      price,
      lineTotal,
    ];
  });

  const summaryRows: Array<[string, string, string, string, string, number]> = [
    [
      '',
      `الإجمالي قبل الضريبة (${invoice.items.length} بند)`,
      '',
      '',
      '',
      totals.subtotal,
    ],
  ];

  if (totals.totalDiscount > 0) {
    summaryRows.push([
      '',
      'إجمالي الخصومات على الفاتورة',
      '',
      '',
      '',
      totals.totalDiscount,
    ]);
    summaryRows.push([
      '',
      'المبلغ الخاضع للضريبة بعد الخصم',
      '',
      '',
      '',
      totals.taxableAmount,
    ]);
  }

  summaryRows.push([
    '',
    `ضريبة القيمة المضافة (${totals.vatRate}%)`,
    '',
    '',
    '',
    totals.vatAmount,
  ]);
  summaryRows.push([
    '',
    'الإجمالي الصافي النهائي شاملاً الضريبة (ر.س)',
    '',
    '',
    '',
    totals.finalTotal,
  ]);

  const sheetData: unknown[][] = [
    [
      `${seller.arabicName} — كشف بنود فاتورة ضريبية رقم (#${invoice.invoiceNumber})`,
      '',
      '',
      '',
      '',
      '',
    ],
    [
      `العميل: ${invoice.client.name || '—'} — التاريخ: ${invoice.date} — طريقة الدفع: ${invoice.paymentMethod} — إجمالي البنود: ${invoice.items.length}`,
      '',
      '',
      '',
      '',
      '',
    ],
    headers,
    ...dataRows,
    ...summaryRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData) as Record<string, unknown>;
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 12 },
    { wch: 50 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 26 },
  ];
  ws['!rows'] = [
    { hpt: 36 },
    { hpt: 24 },
    { hpt: 28 },
    ...dataRows.map(() => ({ hpt: 24 })),
    ...summaryRows.map(() => ({ hpt: 26 })),
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  applyMergedRowStyle(ws, 0, colCount, TITLE_BANNER_STYLE);
  applyMergedRowStyle(ws, 1, colCount, SUBTITLE_BAR_STYLE);

  const headerStyle = createTableHeaderStyle('047857');
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) (ws[ref] as Record<string, unknown>).s = headerStyle;
  }

  // Style all item rows
  dataRows.forEach((_, idx) => {
    const r = 3 + idx;
    const isEven = idx % 2 === 1;
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      const isCurrency = c === 4 || c === 5;
      const align = c === 1 ? 'right' : 'center';
      const bold = c === 0 || c === 1 || c === 5;
      if (isCurrency) {
        (ws[ref] as Record<string, unknown>).t = 'n';
        (ws[ref] as Record<string, unknown>).z = '#,##0.00';
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          'center',
          bold,
          '#,##0.00'
        );
      } else {
        (ws[ref] as Record<string, unknown>).s = createDataCellStyle(
          isEven,
          align,
          bold
        );
      }
    }
  });

  // Style summary rows at the bottom
  summaryRows.forEach((_, sIdx) => {
    const r = 3 + dataRows.length + sIdx;
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      if (c === 5) {
        (ws[ref] as Record<string, unknown>).t = 'n';
        (ws[ref] as Record<string, unknown>).z = '#,##0.00';
        (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
          'center',
          '#,##0.00'
        );
      } else {
        (ws[ref] as Record<string, unknown>).s = createSummaryCellStyle(
          c === 1 ? 'right' : 'center'
        );
      }
    }
  });

  const safeInvNo = String(invoice.invoiceNumber || 'Invoice').replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(
    workbook,
    ws as unknown as XLSX.WorkSheet,
    'بنود الفاتورة'
  );
  XLSX.writeFile(
    workbook,
    `بنود_فاتورة_${safeInvNo}_${invoice.items.length}_بند.xlsx`
  );
}
