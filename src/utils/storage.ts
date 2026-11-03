import {
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_SAVED_CLIENTS,
  EMPTY_CLIENT_INFO,
  EMPTY_SELLER_INFO,
  INITIAL_INVOICE_NUMBER,
  STORAGE_KEYS,
} from '../constants/defaults';
import { CatalogItem, InvoiceData, SavedClient, SellerInfo } from '../types/invoice';
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
  } catch {
    // Ignore storage quota errors gracefully
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
    if (!raw) return EMPTY_SELLER_INFO;
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_SELLER_INFO,
      ...parsed,
    };
  } catch {
    return EMPTY_SELLER_INFO;
  }
}

export function saveSellerToStorage(seller: SellerInfo): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELLER_INFO, JSON.stringify(seller));
  } catch {
    // Ignore
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
        description: '',
        unit: 'وحدة',
        qty: 1,
        unitPrice: 0,
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
