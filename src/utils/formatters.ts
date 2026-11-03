import { InvoiceData, InvoiceLineItem, InvoiceTotals } from '../types/invoice';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export const ITEMS_PER_PAGE = 15;
export const MAX_CONTINUATION_PAGE_ITEMS = ITEMS_PER_PAGE;
export const MAX_SUMMARY_PAGE_ITEMS = ITEMS_PER_PAGE;

export interface PaginatedLineItem {
  item: InvoiceLineItem;
  serialNumber: number; // 1-based sequential index (م)
}

export interface InvoicePageSlice {
  pageNumber: number; // 1-based
  totalPages: number;
  rows: PaginatedLineItem[];
  items: InvoiceLineItem[];
  startIndex: number;
  isLastPage: boolean;
  pageSubtotal: number;
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return currencyFormatter.format(round2(safe));
}

export function formatQty(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return qtyFormatter.format(safe);
}

/**
 * Formats a time string ("18:05" or "06:05 مساءً") into 12-hour Arabic format: "06:05 مساءً" or "09:30 صباحاً".
 */
export function formatTime12hArabic(timeStr: string): string {
  const raw = (timeStr || '').trim();
  if (!raw) return '—';

  // If already contains صباحاً or مساءً, return as-is
  if (raw.includes('صباح') || raw.includes('مساء')) {
    return raw;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;

  const hours24 = parseInt(match[1], 10);
  const minutes = match[2];
  if (!Number.isFinite(hours24)) return raw;

  const period = hours24 >= 12 ? 'مساءً' : 'صباحاً';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const paddedHours = String(hours12).padStart(2, '0');
  return `${paddedHours}:${minutes} ${period}`;
}

/**
 * Extracts "HH:mm" (24h) for `<input type="time">` from either "18:05" or "06:05 مساءً".
 */
export function to24HourTimeInput(timeStr: string): string {
  const raw = (timeStr || '').trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return getCurrentTimeString();

  let h = parseInt(match[1], 10);
  const m = match[2];
  if (raw.includes('مساء') && h < 12) {
    h += 12;
  } else if (raw.includes('صباح') && h === 12) {
    h = 0;
  }
  return `${String(Math.min(23, Math.max(0, h))).padStart(2, '0')}:${m}`;
}

export const DEFAULT_APP_TITLE =
  'منصة صقر للفوترة الإلكترونية الموحدة | Saqr E-Invoicing Hub';

/**
 * Sanitizes `document.title` for iPhone (iOS Safari) WhatsApp PDF sharing before calling `window.print()`.
 * Removes `/`, `:`, `#`, and special characters that cause WhatsApp on iOS to reject the PDF file.
 */
export function sanitizeDocumentTitleForPrint(
  docNumber?: string,
  prefix: 'Invoice' | 'Receipt' = 'Invoice'
): string {
  const cleanedNo = String(docNumber || 'Document')
    .trim()
    .replace(/[\/:#\\*?<>|"\s]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${cleanedNo || 'Document'}`;
}

export function triggerSafePrint(
  docNumber?: string,
  prefix: 'Invoice' | 'Receipt' = 'Invoice'
): void {
  const safeTitle = sanitizeDocumentTitleForPrint(docNumber, prefix);
  const restoreTitle = () => {
    document.title = DEFAULT_APP_TITLE;
    window.removeEventListener('afterprint', restoreTitle);
  };

  window.addEventListener('afterprint', restoreTitle);
  document.title = safeTitle;
  window.print();
  setTimeout(restoreTitle, 1000);
}

/**
 * Builds the official formatted WhatsApp message & wa.me launch URL for sharing an invoice.
 */
export function buildWhatsAppInvoiceMessage(
  invoice: InvoiceData,
  sellerArabicName: string,
  publicInvoiceUrl: string
): { messageText: string; whatsappUrl: string } {
  const totals = calculateInvoiceTotals(invoice);
  const formattedTotal = formatMoney(totals.finalTotal);
  const clientName = invoice.client.name?.trim() || 'العميل الكريم';
  const companyName = sellerArabicName?.trim() || 'منصة صقر للفوترة الإلكترونية';

  const messageText = `مرحبًا، مرفق لكم الفاتورة الضريبية رقم (#${invoice.invoiceNumber}) الصادرة من ${companyName} لصالح ${clientName} بقيمة إجمالية ${formattedTotal} ر.س.\nلفتح وتحميل الفاتورة PDF مباشرة:\n${publicInvoiceUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
  return { messageText, whatsappUrl };
}

/**
 * Synchronous (popup-safe) WhatsApp share: copies the message to the clipboard
 * and opens WhatsApp in a new tab directly inside the click handler.
 */
export function triggerWhatsAppInvoiceShare(
  invoice: InvoiceData,
  sellerArabicName: string,
  publicInvoiceUrl: string
): void {
  const { messageText, whatsappUrl } = buildWhatsAppInvoiceMessage(
    invoice,
    sellerArabicName,
    publicInvoiceUrl
  );
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  try {
    void navigator.clipboard?.writeText(messageText).catch(() => undefined);
  } catch {
    // clipboard unavailable
  }
}

/**
 * Splits invoice line items into discrete A4 pages with a 15-items-per-page capacity:
 * - Page 1 holds items 1..15 along with the Financial Summary.
 * - Page 2 is created when item #16 is added (items 16..30), and so on.
 */
export function paginateInvoiceItems(
  items: InvoiceLineItem[]
): InvoicePageSlice[] {
  const safeItems =
    items.length > 0
      ? items
      : [
          {
            id: 'empty-row-1',
            description: '',
            unit: 'وحدة',
            qty: 1,
            unitPrice: 0,
          },
        ];

  const indexed: PaginatedLineItem[] = safeItems.map((item, idx) => ({
    item,
    serialNumber: idx + 1,
  }));

  const rawChunks: PaginatedLineItem[][] = [];
  for (let i = 0; i < indexed.length; i += ITEMS_PER_PAGE) {
    rawChunks.push(indexed.slice(i, i + ITEMS_PER_PAGE));
  }

  if (rawChunks.length === 0) {
    rawChunks.push([]);
  }

  const totalPages = rawChunks.length;

  return rawChunks.map((rows, index) => {
    const pageSubtotal = round2(
      rows.reduce(
        (sum, r) =>
          sum +
          Math.max(0, Number(r.item.qty) || 0) *
            Math.max(0, Number(r.item.unitPrice) || 0),
        0
      )
    );
    return {
      pageNumber: index + 1,
      totalPages,
      rows,
      items: rows.map((r) => r.item),
      startIndex: index * ITEMS_PER_PAGE,
      isLastPage: index === totalPages - 1,
      pageSubtotal,
    };
  });
}

export function calculateTotalInvoicePages(itemsCount: number): number {
  const dummyItems: InvoiceLineItem[] = Array.from(
    { length: Math.max(1, itemsCount) },
    (_, i) => ({
      id: `d-${i}`,
      description: '',
      unit: 'وحدة',
      qty: 1,
      unitPrice: 0,
    })
  );
  return paginateInvoiceItems(dummyItems).length;
}

export function calculateAutoPageLabel(itemsCount: number): string {
  const totalPages = calculateTotalInvoicePages(itemsCount);
  return `1 من ${totalPages}`;
}

/**
 * Calculates subtotal, flexible discount (% percentage OR fixed SAR amount) deducted BEFORE VAT,
 * configurable VAT % (default 15%) on taxable amount after discount, and final net total.
 */
export function calculateInvoiceTotals(
  invoice: Pick<
    InvoiceData,
    'items' | 'discount' | 'invoiceDiscount' | 'paidAmount'
  > & {
    discountType?: InvoiceData['discountType'];
    vatRate?: InvoiceData['vatRate'];
  }
): InvoiceTotals {
  const subtotal = round2(
    invoice.items.reduce((acc, item) => {
      const qty = Number.isFinite(item.qty) ? Math.max(0, item.qty) : 0;
      const price = Number.isFinite(item.unitPrice)
        ? Math.max(0, item.unitPrice)
        : 0;
      return acc + qty * price;
    }, 0)
  );

  const discountType = invoice.discountType || 'amount';
  const discountInput = Math.max(0, Number(invoice.discount) || 0);

  const discountAmount =
    discountType === 'percentage'
      ? round2(subtotal * (Math.min(100, discountInput) / 100))
      : round2(discountInput);

  const invoiceDiscount = Math.max(
    0,
    round2(Number(invoice.invoiceDiscount) || 0)
  );
  const totalDiscount = Math.min(
    subtotal,
    round2(discountAmount + invoiceDiscount)
  );

  // Deduct discount BEFORE calculating VAT
  const taxableAmount = Math.max(0, round2(subtotal - totalDiscount));
  const vatRate =
    invoice.vatRate !== undefined && Number.isFinite(Number(invoice.vatRate))
      ? Math.max(0, Number(invoice.vatRate))
      : 15;
  const vatAmount = round2(taxableAmount * (vatRate / 100));
  const finalTotal = round2(taxableAmount + vatAmount);
  const paidAmount = Math.max(0, round2(Number(invoice.paidAmount) || 0));
  const remainingBalance = Math.max(0, round2(finalTotal - paidAmount));

  return {
    subtotal,
    discountType,
    discountInput,
    discountAmount,
    invoiceDiscount,
    totalDiscount,
    taxableAmount,
    vatRate,
    vatAmount,
    finalTotal,
    paidAmount,
    remainingBalance,
  };
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function slashDateToIsoInput(dateStr: string): string {
  const trimmed = (dateStr || '').trim();
  const normalized = trimmed.replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  return getTodayDateString().replace(/\//g, '-');
}

export function isoInputToSlashDate(isoDate: string): string {
  if (!isoDate) return getTodayDateString();
  return isoDate.replace(/-/g, '/');
}

export function normalizeArabic(text: string): string {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
