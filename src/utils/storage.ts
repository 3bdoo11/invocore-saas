import {
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_SAVED_CLIENTS,
  DEFAULT_SELLER_INFO,
  EMPTY_CLIENT_INFO,
  INITIAL_INVOICE_NUMBER,
  STORAGE_KEYS,
} from '../constants/defaults';
import {
  CatalogItem,
  DocumentPrintView,
  InvoiceData,
  SavedClient,
  SellerInfo,
} from '../types/invoice';
import {
  generateId,
  getCurrentTimeString,
  getTodayDateString,
} from './formatters';

export function loadCatalogFromStorage(): CatalogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATALOG);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.CATALOG,
        JSON.stringify(DEFAULT_CATALOG_ITEMS)
      );
      return DEFAULT_CATALOG_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: CatalogItem) => ({
        ...item,
        unit: item.unit?.trim() || 'وحدة',
        defaultQuantity:
          Number(item.defaultQuantity) > 0 ? Number(item.defaultQuantity) : 1,
      }));
    }
    return DEFAULT_CATALOG_ITEMS;
  } catch {
    return DEFAULT_CATALOG_ITEMS;
  }
}

export function saveCatalogToStorage(catalog: CatalogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadInvoicesFromStorage(): InvoiceData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((inv: InvoiceData) => ({
      ...inv,
      discountType: inv.discountType || 'amount',
      vatRate: inv.vatRate !== undefined ? inv.vatRate : 15,
    }));
  } catch {
    return [];
  }
}

export function saveInvoicesToStorage(invoices: InvoiceData[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (err) {
    console.warn('saveInvoicesToStorage quota/write error:', err);
    try {
      if (invoices.length > 50) {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices.slice(0, 50)));
      }
    } catch {}
  }
}

export function loadNextInvoiceNumber(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NEXT_INVOICE_NO);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.NEXT_INVOICE_NO,
        String(INITIAL_INVOICE_NUMBER)
      );
      return INITIAL_INVOICE_NUMBER;
    }
    const num = parseInt(raw, 10);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
    return INITIAL_INVOICE_NUMBER;
  } catch {
    return INITIAL_INVOICE_NUMBER;
  }
}

export function saveNextInvoiceNumber(nextNo: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NEXT_INVOICE_NO, String(nextNo));
  } catch {
    // Ignore
  }
}

export function loadSellerFromStorage(): SellerInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELLER_INFO);
    if (!raw) return DEFAULT_SELLER_INFO;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SELLER_INFO,
      ...parsed,
      arabicName: parsed.arabicName?.trim() || DEFAULT_SELLER_INFO.arabicName,
      englishName: parsed.englishName?.trim() || DEFAULT_SELLER_INFO.englishName,
    };
  } catch {
    return DEFAULT_SELLER_INFO;
  }
}

export function saveSellerToStorage(seller: SellerInfo): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELLER_INFO, JSON.stringify(seller));
  } catch (err) {
    console.warn('saveSellerToStorage quota error, retrying without logo:', err);
    try {
      const withoutLogo = { ...seller, logoDataUrl: undefined };
      localStorage.setItem(STORAGE_KEYS.SELLER_INFO, JSON.stringify(withoutLogo));
    } catch (e2) {
      console.error('saveSellerToStorage failed completely:', e2);
    }
  }
}

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed: boolean): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.ONBOARDING_COMPLETED,
      completed ? 'true' : 'false'
    );
  } catch {
    // Ignore
  }
}

export function createFreshBlankInvoice(
  invoiceNo: number | string = '',
  preferredQrMode: InvoiceData['qrMode'] = 'web'
): InvoiceData {
  return {
    id: generateId('inv'),
    invoiceNumber: String(invoiceNo),
    date: getTodayDateString(),
    time: getCurrentTimeString(),
    paymentMethod: 'آجل',
    itemsCountManual: null,
    pageNumberManual: null,
    client: { ...EMPTY_CLIENT_INFO },
    items: [
      {
        id: generateId('row'),
        itemCode: 'SaaS-101',
        description: 'Cloud Infrastructure & API Integration / تطوير وربط البنية السحابية',
        unit: 'خدمة',
        qty: 1,
        unitPrice: 1500,
      },
    ],
    discountType: 'amount',
    discount: 0,
    invoiceDiscount: 0,
    vatRate: 15,
    paidAmount: 0,
    tafqeetManual: null,
    qrMode: preferredQrMode,
    status: 'draft',
  };
}

export function loadSavedClientsFromStorage(): SavedClient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_CLIENTS);
    if (!raw) return DEFAULT_SAVED_CLIENTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_SAVED_CLIENTS;
  } catch {
    return DEFAULT_SAVED_CLIENTS;
  }
}

export function saveSavedClientsToStorage(clients: SavedClient[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_CLIENTS, JSON.stringify(clients));
  } catch {
    // Ignore quota errors
  }
}

export interface ActiveDraftState {
  invoice: InvoiceData;
  docPrintView?: DocumentPrintView;
  updatedAt?: number;
}

export function loadActiveDraftFromStorage(): ActiveDraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.invoice &&
      Array.isArray(parsed.invoice.items) &&
      parsed.invoice.items.length > 0
    ) {
      return {
        invoice: {
          ...parsed.invoice,
          discountType: parsed.invoice.discountType || 'amount',
          vatRate:
            parsed.invoice.vatRate !== undefined ? parsed.invoice.vatRate : 15,
        },
        docPrintView: parsed.docPrintView || 'invoice',
        updatedAt: parsed.updatedAt || Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveActiveDraftToStorage(
  invoice: InvoiceData,
  docPrintView: DocumentPrintView = 'invoice'
): void {
  try {
    const payload: ActiveDraftState = {
      invoice,
      docPrintView,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DRAFT, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearActiveDraftFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRAFT);
  } catch {
    // Ignore
  }
}

