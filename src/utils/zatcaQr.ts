import {
  COMMON_UNITS,
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_SELLER_INFO,
  PAYMENT_METHODS,
} from '../constants/defaults';
import {
  DiscountType,
  InvoiceData,
  InvoiceLineItem,
  PaymentMethod,
  QrEncodingMode,
  SellerInfo,
  TaxJurisdiction,
  TemplateStyle,
} from '../types/invoice';
import { deflateSync, inflateSync } from 'fflate';
import { round2 } from './formatters';

export interface ZatcaTlvInput {
  sellerName: string;
  vatNumber: string;
  date: string;
  time: string;
  totalWithVat: number;
  vatTotal: number;
}

export interface DecodedZatcaTag {
  tag: number;
  label: string;
  byteLength: number;
  value: string;
}

const ZATCA_TAG_LABELS: Record<number, string> = {
  1: 'اسم المورد (البائع)',
  2: 'الرقم الضريبي للمورد',
  3: 'تاريخ ووقت الفاتورة (ISO)',
  4: 'إجمالي الفاتورة مع الضريبة',
  5: 'مبلغ ضريبة القيمة المضافة',
};

/**
 * Formats invoice Date ("YYYY/MM/DD") and Time ("HH:mm") into ISO timestamp "YYYY-MM-DDTHH:mm"
 */
export function buildZatcaIsoTimestamp(dateStr: string, timeStr: string): string {
  const cleanDate = (dateStr || '').trim().replace(/\//g, '-');
  const cleanTime = (timeStr || '00:00').trim();
  const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(cleanDate)
    ? cleanDate
    : new Date().toISOString().slice(0, 10);
  const normalizedTime = /^\d{2}:\d{2}(:\d{2})?$/.test(cleanTime)
    ? cleanTime
    : '00:00';
  return `${normalizedDate}T${normalizedTime}`;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64ToUtf8(base64: string): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(base64ToUint8Array(base64));
}

/**
 * Generates exact ZATCA Phase 1 TLV (Tag-Length-Value) UTF-8 Base64 QR payload.
 * Uses TextEncoder to compute exact UTF-8 byte lengths for Arabic seller names.
 */
export function generateZatcaQrBase64(input: ZatcaTlvInput): string {
  const encoder = new TextEncoder();
  const isoTimestamp = buildZatcaIsoTimestamp(input.date, input.time);

  const fields: Array<[number, string]> = [
    [1, (input.sellerName || '').trim()],
    [2, (input.vatNumber || '').trim()],
    [3, isoTimestamp],
    [4, round2(input.totalWithVat).toFixed(2)],
    [5, round2(input.vatTotal).toFixed(2)],
  ];

  const encodedChunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (const [tag, val] of fields) {
    const valueBytes = encoder.encode(val);
    const safeValueBytes =
      valueBytes.length > 255 ? valueBytes.subarray(0, 255) : valueBytes;
    const tlv = new Uint8Array(2 + safeValueBytes.length);
    tlv[0] = tag;
    tlv[1] = safeValueBytes.length;
    tlv.set(safeValueBytes, 2);
    encodedChunks.push(tlv);
    totalBytes += tlv.length;
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of encodedChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return uint8ArrayToBase64(combined);
}

/**
 * Decodes a ZATCA Phase 1 Base64 TLV string back into readable tags for verification.
 */
export function decodeZatcaQrBase64(base64: string): DecodedZatcaTag[] {
  try {
    const bytes = base64ToUint8Array(base64);
    const decoder = new TextDecoder('utf-8');
    const result: DecodedZatcaTag[] = [];
    let idx = 0;

    while (idx + 2 <= bytes.length) {
      const tag = bytes[idx];
      const len = bytes[idx + 1];
      if (idx + 2 + len > bytes.length) break;
      const valueBytes = bytes.subarray(idx + 2, idx + 2 + len);
      const value = decoder.decode(valueBytes);
      result.push({
        tag,
        label: ZATCA_TAG_LABELS[tag] || `وسم ${tag}`,
        byteLength: len,
        value,
      });
      idx += 2 + len;
    }

    return result;
  } catch {
    return [];
  }
}

interface CompactInvoicePayload {
  v: 1;
  n: string;
  d: string;
  t: string;
  p: number;
  ic?: string;
  pg?: string;
  c: [string, string, string, string, string];
  i: Array<[string, number, number, string?]>;
  dt?: DiscountType;
  vr?: number;
  f?: [number, number, number]; // [discount, invoiceDiscount, paidAmount]
  tf?: string;
  q?: QrEncodingMode;
  s?: Partial<
    Record<
      | 'a'
      | 'l'
      | 'cr'
      | 'tx'
      | 'e'
      | 'ad'
      | 'tm'
      | 'col'
      | 'tpl'
      | 'ph'
      | 'em'
      | 'ib'
      | 'bk'
      | 'lg',
      string | number
    >
  >;
}

/**
 * Lossless compressed share-link encoder.
 * Payload (JSON array) -> raw DEFLATE -> Base64Url, prefixed with "Z".
 * Nothing is truncated: every client field and every line item is preserved.
 * Item descriptions are stored via a string table: a number refers to the
 * per-invoice `dict`, "@n" refers to the static built-in catalog, otherwise literal.
 */
const STATIC_CATALOG_NAMES: string[] = DEFAULT_CATALOG_ITEMS.map((c) => c.name);

function bytesToBase64Url(bytes: Uint8Array): string {
  return uint8ArrayToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function encodePublicInvoiceUrl(
  invoice: InvoiceData,
  seller: SellerInfo,
  lang?: 'ar' | 'en'
): string {
  const pmIndex = Math.max(0, PAYMENT_METHODS.indexOf(invoice.paymentMethod));
  const styleIdx =
    seller.templateStyle === 'classic' ? 1 : seller.templateStyle === 'minimalist' ? 2 : 0;
  const activeJurisdiction = invoice.jurisdiction || seller.jurisdiction || 'KSA';
  const activeLang = lang || (activeJurisdiction === 'USA' || activeJurisdiction === 'EU' ? 'en' : 'ar');

  // Build deduplicated description string table
  const counts = new Map<string, number>();
  for (const it of invoice.items) {
    counts.set(it.description, (counts.get(it.description) || 0) + 1);
  }
  const dict: string[] = [];
  const dictIndex = new Map<string, number>();
  const descRef = (d: string): number | string => {
    const catIdx = STATIC_CATALOG_NAMES.indexOf(d);
    if (catIdx !== -1) return `@${catIdx}`;
    if ((counts.get(d) || 0) > 1) {
      let idx = dictIndex.get(d);
      if (idx === undefined) {
        idx = dict.length;
        dict.push(d);
        dictIndex.set(d, idx);
      }
      return idx;
    }
    return d;
  };

  const items = invoice.items.map((it) => {
    const unit = it.unit || 'وحدة';
    const uIdx = COMMON_UNITS.indexOf(unit as (typeof COMMON_UNITS)[number]);
    const row: unknown[] = [
      descRef(it.description),
      uIdx >= 0 ? uIdx : unit,
      Number(it.qty) || 0,
      round2(Number(it.unitPrice) || 0),
    ];
    if (it.itemCode) row.push(it.itemCode);
    return row;
  });

  const extras: Record<string, unknown> = {};
  if (invoice.itemsCountManual && invoice.itemsCountManual.trim() !== '')
    extras.ic = invoice.itemsCountManual;
  if (invoice.pageNumberManual && invoice.pageNumberManual.trim() !== '')
    extras.pg = invoice.pageNumberManual;
  if (invoice.tafqeetManual && invoice.tafqeetManual.trim() !== '')
    extras.tf = invoice.tafqeetManual;
  if (invoice.qrMode && invoice.qrMode !== 'web') extras.q = invoice.qrMode;

  // Preserve jurisdiction and language in payload
  extras.jur = activeJurisdiction;
  extras.lng = activeLang;

  const s: Record<string, string> = {
    a: seller.arabicName || '',
    e: seller.englishName || '',
    cr: seller.crNumber || '',
    tx: seller.taxNumber || '',
    ad: seller.address || '',
    col: seller.primaryColor || '#0F172A',
    tpl: seller.templateStyle || 'modern',
    jur: activeJurisdiction,
  };
  if (seller.phone) s.ph = seller.phone;
  if (seller.email) s.em = seller.email;
  if (seller.iban) s.ib = seller.iban;
  if (seller.bankName) s.bk = seller.bankName;
  // Never embed inline Base64 data URLs into QR code URLs to prevent QR capacity overflows
  if (seller.logoDataUrl && !seller.logoDataUrl.startsWith('data:') && seller.logoDataUrl.length < 256) {
    s.lg = seller.logoDataUrl;
  }
  extras.s = s;

  const payload: unknown[] = [
    1, // version
    styleIdx,
    invoice.invoiceNumber,
    invoice.date,
    invoice.time,
    pmIndex,
    invoice.client.name || '',
    invoice.client.taxNumber || '',
    invoice.client.phone || '',
    invoice.client.address || '',
    invoice.client.notes || '',
    invoice.discountType === 'percentage' ? 1 : 0,
    round2(Number(invoice.discount) || 0),
    round2(Number(invoice.invoiceDiscount) || 0),
    invoice.vatRate !== undefined ? Number(invoice.vatRate) : 15,
    round2(Number(invoice.paidAmount) || 0),
    dict,
    items,
  ];
  if (Object.keys(extras).length > 0) payload.push(extras);

  const compressed = deflateSync(new TextEncoder().encode(JSON.stringify(payload)), {
    level: 9,
  });
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://invocore.vercel.app';
  return `${origin}/v/Z${bytesToBase64Url(compressed)}`;
}

function decodeCompressedInvoice(
  encoded: string
): { invoice: InvoiceData; seller: SellerInfo; lang?: 'ar' | 'en' } | null {
  const bytes = inflateSync(base64ToUint8Array(encoded));
  const p = JSON.parse(new TextDecoder('utf-8').decode(bytes)) as unknown[];
  const [
    ,
    cIdx,
    invNo,
    date,
    time,
    pmIdx,
    clientName,
    clientTax,
    clientPhone,
    clientAddr,
    clientNotes,
    discFlag,
    discVal,
    extraDisc,
    vatRate,
    paidAmt,
    dictRaw,
    itemsRaw,
    extrasRaw,
  ] = p as [
    number, number, string, string, string, number, string, string, string,
    string, string, number, number, number, number, number, string[],
    unknown[][], Record<string, unknown> | undefined,
  ];
  const extras = (extrasRaw || {}) as Record<string, unknown>;
  const sOv = (extras.s || {}) as Record<string, string>;
  const styleFromIdx: TemplateStyle =
    Number(cIdx) === 1 ? 'classic' : Number(cIdx) === 2 ? 'minimalist' : 'modern';

  const decodedJurisdiction = (extras.jur as TaxJurisdiction) || (sOv.jur as TaxJurisdiction) || 'KSA';
  const decodedLang = (extras.lng as 'ar' | 'en') || (decodedJurisdiction === 'USA' || decodedJurisdiction === 'EU' ? 'en' : 'ar');
  const tplStyle: TemplateStyle = (sOv.tpl as TemplateStyle) || styleFromIdx;

  const seller: SellerInfo = {
    arabicName: sOv.a || DEFAULT_SELLER_INFO.arabicName,
    englishName: sOv.e || DEFAULT_SELLER_INFO.englishName,
    legalType: sOv.l || 'شركة',
    crNumber: sOv.cr || '',
    taxNumber: sOv.tx || '',
    address: sOv.ad || '',
    phone: sOv.ph,
    email: sOv.em,
    iban: sOv.ib,
    bankName: sOv.bk,
    primaryColor: sOv.col || '#0F172A',
    templateStyle: tplStyle,
    logoDataUrl: sOv.lg,
    jurisdiction: decodedJurisdiction,
  };
  const dict = Array.isArray(dictRaw) ? dictRaw : [];
  const resolveDesc = (ref: unknown): string => {
    if (typeof ref === 'number') return dict[ref] ?? '';
    const str = String(ref ?? '');
    if (str.startsWith('@') && /^@\d+$/.test(str)) {
      return STATIC_CATALOG_NAMES[Number(str.slice(1))] ?? '';
    }
    return str;
  };
  const items: InvoiceLineItem[] = (itemsRaw || []).map((r, idx) => {
    const u = r[1];
    const unit =
      typeof u === 'number' ? COMMON_UNITS[u] || 'وحدة' : String(u || 'وحدة');
    return {
      id: `pub-${idx + 1}`,
      description: resolveDesc(r[0]),
      unit,
      qty: Number(r[2]) || 0,
      unitPrice: Number(r[3]) || 0,
      ...(r[4] ? { itemCode: String(r[4]) } : {}),
    };
  });
  const invoice: InvoiceData = {
    id: `public-${invNo}`,
    invoiceNumber: String(invNo),
    date: String(date),
    time: String(time),
    paymentMethod: PAYMENT_METHODS[pmIdx] || PAYMENT_METHODS[0],
    itemsCountManual: (extras.ic as string) ?? null,
    pageNumberManual: (extras.pg as string) ?? null,
    client: {
      name: String(clientName || ''),
      taxNumber: String(clientTax || ''),
      phone: String(clientPhone || ''),
      address: String(clientAddr || ''),
      notes: String(clientNotes || ''),
    },
    items,
    discountType: discFlag === 1 ? 'percentage' : 'amount',
    discount: Number(discVal) || 0,
    invoiceDiscount: Number(extraDisc) || 0,
    vatRate: Number.isFinite(Number(vatRate)) ? Number(vatRate) : 15,
    paidAmount: Number(paidAmt) || 0,
    tafqeetManual: (extras.tf as string) ?? null,
    qrMode: ((extras.q as QrEncodingMode) || 'web') as QrEncodingMode,
    jurisdiction: decodedJurisdiction,
    status: 'issued',
  };
  return { invoice, seller, lang: decodedLang };
}


export function decodePublicInvoiceParam(
  rawParam: string
): { invoice: InvoiceData; seller: SellerInfo; lang?: 'ar' | 'en' } | null {
  try {
    const cleaned = decodeURIComponent(rawParam.trim());
    if (cleaned.startsWith('Z')) {
      return decodeCompressedInvoice(cleaned.slice(1));
    }
    const decodedText =
      cleaned.startsWith('[') ||
      cleaned.startsWith('{') ||
      cleaned.startsWith('P|')
        ? cleaned
        : base64ToUtf8(cleaned);

    // 0. Ultra-compact Pipe-delimited format: P|cIdx|invNo|date|pmIdx|clientName|clientTax|fin|items
    if (decodedText.startsWith('P|')) {
      const parts = decodedText.split('|');
      const companyIdx = Math.max(0, Math.min(7, Number(parts[1]) || 0));
      const invNo = parts[2] || '1';
      const rawDate = parts[3] || '';
      const date =
        rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate || new Date().toISOString().slice(0, 10);
      const pmIndex = Number(parts[4]) || 0;
      const clientName = parts[5] || '';
      const clientTax = parts[6] || '';
      const finToken = parts[7] || '';
      const itemsToken = parts[8] || '';

      let discountType: 'amount' | 'percentage' = 'amount';
      let discount = 0;
      let invoiceDiscount = 0;
      let paidAmount = 0;
      let vatRate = 15;

      if (finToken) {
        const fp = finToken.split(',');
        discountType = Number(fp[0]) === 1 ? 'percentage' : 'amount';
        discount = Number(fp[1]) || 0;
        invoiceDiscount = Number(fp[2]) || 0;
        paidAmount = Number(fp[3]) || 0;
        vatRate = fp[4] !== undefined && fp[4] !== '' ? Number(fp[4]) : 15;
      }

      const items: InvoiceLineItem[] = itemsToken
        ? itemsToken
            .split('^')
            .filter(Boolean)
            .map((row, idx) => {
              const [desc, q, p, uRaw] = row.split('~');
              let unit = 'وحدة';
              if (uRaw !== undefined && uRaw !== '') {
                const asNum = Number(uRaw);
                if (
                  !Number.isNaN(asNum) &&
                  asNum >= 0 &&
                  asNum < COMMON_UNITS.length
                ) {
                  unit = COMMON_UNITS[asNum];
                } else {
                  unit = uRaw;
                }
              }
              return {
                id: `pub-${idx + 1}`,
                description: desc || '',
                unit,
                qty: Number(q) || 0,
                unitPrice: Number(p) || 0,
              };
            })
        : [];

      const baseCompany: SellerInfo = {
        ...DEFAULT_SELLER_INFO,
        templateStyle:
          companyIdx === 1 ? 'classic' : companyIdx === 2 ? 'minimalist' : 'modern',
      };

      const invoice: InvoiceData = {
        id: `public-${invNo}`,
        invoiceNumber: String(invNo),
        date: String(date),
        time: '12:00',
        paymentMethod: PAYMENT_METHODS[pmIndex] || PAYMENT_METHODS[0],
        status: 'issued',
        qrMode: 'web',
        vatRate,
        client: {
          name: String(clientName),
          taxNumber: String(clientTax),
          phone: '',
          address: '',
          notes: '',
        },
        items,
        discount,
        discountType,
        invoiceDiscount,
        paidAmount,
        itemsCountManual: null,
        pageNumberManual: null,
        tafqeetManual: null,
      };

      return { invoice, seller: baseCompany };
    }

    const parsed = JSON.parse(decodedText);

    // 1. Ultra-compact tuple format: [invNo, date, time, payMethod, clientName, clientTax, clientPhone, clientAddr, clientNotes, discType, discVal, extraDisc, paidAmt, items, extras?]
    if (Array.isArray(parsed) && parsed.length >= 14 && Array.isArray(parsed[13])) {
      const [
        invNo,
        date,
        time,
        payMethodRaw,
        clientName,
        clientTax,
        clientPhone,
        clientAddr,
        clientNotes,
        discTypeRaw,
        discVal,
        extraDisc,
        paidAmt,
        rawItems,
        rawExtras,
      ] = parsed;

      const paymentMethod: PaymentMethod =
        typeof payMethodRaw === 'number'
          ? PAYMENT_METHODS[payMethodRaw] || PAYMENT_METHODS[0]
          : (PAYMENT_METHODS.find((m) => m === payMethodRaw) ?? PAYMENT_METHODS[0]);

      const extras = (rawExtras && typeof rawExtras === 'object' ? rawExtras : {}) as Partial<
        Pick<CompactInvoicePayload, 'ic' | 'pg' | 'tf' | 'q' | 'vr' | 's'>
      >;

      const tplStyle: TemplateStyle =
        extras.s?.tpl === 'classic' || extras.s?.tpl === 'minimalist'
          ? (extras.s.tpl as TemplateStyle)
          : 'modern';

      const seller: SellerInfo = {
        ...DEFAULT_SELLER_INFO,
        arabicName: String(extras.s?.a ?? DEFAULT_SELLER_INFO.arabicName),
        legalType: String(extras.s?.l ?? DEFAULT_SELLER_INFO.legalType),
        crNumber: String(extras.s?.cr ?? DEFAULT_SELLER_INFO.crNumber),
        taxNumber: String(extras.s?.tx ?? DEFAULT_SELLER_INFO.taxNumber),
        englishName: String(extras.s?.e ?? DEFAULT_SELLER_INFO.englishName),
        address: String(extras.s?.ad ?? DEFAULT_SELLER_INFO.address),
        primaryColor: String(extras.s?.col ?? DEFAULT_SELLER_INFO.primaryColor),
        templateStyle: tplStyle,
        phone: extras.s?.ph ? String(extras.s.ph) : undefined,
        email: extras.s?.em ? String(extras.s.em) : undefined,
        iban: extras.s?.ib ? String(extras.s.ib) : undefined,
        bankName: extras.s?.bk ? String(extras.s.bk) : undefined,
        logoDataUrl: extras.s?.lg ? String(extras.s.lg) : undefined,
      };

      const discountType: DiscountType =
        discTypeRaw === 1 || discTypeRaw === 'percentage' ? 'percentage' : 'amount';

      const invoice: InvoiceData = {
        id: `public-${invNo}`,
        invoiceNumber: String(invNo || ''),
        date: String(date || ''),
        time: String(time || ''),
        paymentMethod,
        itemsCountManual: extras.ic ?? null,
        pageNumberManual: extras.pg ?? null,
        client: {
          name: String(clientName || ''),
          taxNumber: String(clientTax || ''),
          phone: String(clientPhone || ''),
          address: String(clientAddr || ''),
          notes: String(clientNotes || ''),
        },
        items: (rawItems as Array<[string, number, number, string?]>).map((tuple, idx) => ({
          id: `pub-item-${idx}`,
          description: String(tuple[0] || ''),
          qty: Number(tuple[1]) || 0,
          unitPrice: Number(tuple[2]) || 0,
          unit: tuple[3] ? String(tuple[3]) : 'وحدة',
        })),
        discountType,
        discount: Number(discVal) || 0,
        invoiceDiscount: Number(extraDisc) || 0,
        vatRate: extras.vr !== undefined ? Number(extras.vr) : 15,
        paidAmount: Number(paidAmt) || 0,
        tafqeetManual: extras.tf ?? null,
        qrMode: extras.q ?? 'web',
        status: 'issued',
        companyId: seller.id,
        sellerSnapshot: seller,
      };

      return { invoice, seller };
    }

    // 2. Legacy v1 object format
    if (parsed && parsed.v === 1 && Array.isArray(parsed.c) && Array.isArray(parsed.i)) {
      const p = parsed as CompactInvoicePayload;
      const paymentMethod: PaymentMethod =
        PAYMENT_METHODS[p.p] || PAYMENT_METHODS[0];

      const seller: SellerInfo = {
        arabicName: String(p.s?.a ?? DEFAULT_SELLER_INFO.arabicName),
        legalType: String(p.s?.l ?? DEFAULT_SELLER_INFO.legalType),
        crNumber: String(p.s?.cr ?? DEFAULT_SELLER_INFO.crNumber),
        taxNumber: String(p.s?.tx ?? DEFAULT_SELLER_INFO.taxNumber),
        englishName: String(p.s?.e ?? DEFAULT_SELLER_INFO.englishName),
        address: String(p.s?.ad ?? DEFAULT_SELLER_INFO.address),
      };

      const invoice: InvoiceData = {
        id: `public-${p.n}`,
        invoiceNumber: String(p.n || ''),
        date: String(p.d || ''),
        time: String(p.t || ''),
        paymentMethod,
        itemsCountManual: p.ic ?? null,
        pageNumberManual: p.pg ?? null,
        client: {
          name: p.c[0] || '',
          taxNumber: p.c[1] || '',
          address: p.c[2] || '',
          phone: p.c[3] || '',
          notes: p.c[4] || '',
        },
        items: p.i.map((tuple, idx) => ({
          id: `pub-item-${idx}`,
          description: String(tuple[0] || ''),
          qty: Number(tuple[1]) || 0,
          unitPrice: Number(tuple[2]) || 0,
        })),
        discountType: p.dt === 'percentage' ? 'percentage' : 'amount',
        discount: p.f ? Number(p.f[0]) || 0 : 0,
        invoiceDiscount: p.f ? Number(p.f[1]) || 0 : 0,
        paidAmount: p.f ? Number(p.f[2]) || 0 : 0,
        tafqeetManual: p.tf ?? null,
        qrMode: p.q ?? 'both',
        status: 'issued',
        sellerSnapshot: seller,
      };

      return { invoice, seller };
    }

    if (parsed && parsed.invoiceNumber && Array.isArray(parsed.items)) {
      const seller: SellerInfo = parsed.sellerSnapshot || DEFAULT_SELLER_INFO;
      return {
        invoice: {
          discountType: 'amount',
          ...parsed,
          status: 'issued',
        } as InvoiceData,
        seller,
      };
    }

    return null;
  } catch {
    return null;
  }
}
