import {
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_CLIENT_INFO,
  DEFAULT_COMPANIES,
  DEFAULT_INITIAL_LINE_ITEMS,
  DEFAULT_SAVED_CLIENTS,
  DEFAULT_SELLER_INFO,
  EMPTY_CLIENT_INFO,
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed
        .filter(
          (item: CatalogItem) =>
            item &&
            typeof item.name === 'string' &&
            /[\u0600-\u06FFa-zA-Z]/.test(item.name.trim()) &&
            item.name.trim() !== 'م'
        )
        .map((item: CatalogItem) => ({
          ...item,
          unit: item.unit?.trim() || 'وحدة',
          defaultQuantity:
            Number(item.defaultQuantity) > 0 ? Number(item.defaultQuantity) : 1,
        }));
      if (cleaned.length > 0) {
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    localStorage.setItem(
      STORAGE_KEYS.CATALOG,
      JSON.stringify(DEFAULT_CATALOG_ITEMS)
    );
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

export function loadCompaniesFromStorage(): SellerInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.COMPANIES,
        JSON.stringify(DEFAULT_COMPANIES)
      );
      return DEFAULT_COMPANIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= DEFAULT_COMPANIES.length) {
      return parsed.map((c: SellerInfo, idx: number) => ({
        id: c.id || DEFAULT_COMPANIES[idx]?.id || `comp-${idx + 1}`,
        templateId:
          c.templateId ||
          DEFAULT_COMPANIES[idx]?.templateId ||
          (((idx % 8) + 1) as SellerInfo['templateId']),
        ...c,
      }));
    }
    localStorage.setItem(
      STORAGE_KEYS.COMPANIES,
      JSON.stringify(DEFAULT_COMPANIES)
    );
    return DEFAULT_COMPANIES;
  } catch {
    return DEFAULT_COMPANIES;
  }
}

export function saveCompaniesToStorage(companies: SellerInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch {
    // Ignore
  }
}

export function loadSelectedCompanyId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COMPANY_ID);
  } catch {
    return null;
  }
}

export function saveSelectedCompanyId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY_ID, id);
  } catch {
    // Ignore
  }
}

export function loadSellerFromStorage(): SellerInfo {
  try {
    const companies = loadCompaniesFromStorage();
    const selectedId = loadSelectedCompanyId();
    if (selectedId) {
      const found = companies.find((c) => c.id === selectedId);
      if (found) return found;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.SELLER_INFO);
    if (!raw) return companies[0] || DEFAULT_SELLER_INFO;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SELLER_INFO,
      ...parsed,
    };
  } catch {
    return DEFAULT_SELLER_INFO;
  }
}

export function saveSellerToStorage(seller: SellerInfo): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELLER_INFO, JSON.stringify(seller));
  } catch {
    // Ignore
  }
}

export function createInitialShowcaseInvoice(invoiceNo: number): InvoiceData {
  return {
    id: generateId('inv'),
    invoiceNumber: String(invoiceNo),
    date: getTodayDateString(),
    time: getCurrentTimeString(),
    paymentMethod: 'آجل',
    itemsCountManual: null,
    pageNumberManual: null,
    client: { ...DEFAULT_CLIENT_INFO },
    items: DEFAULT_INITIAL_LINE_ITEMS.map((item) => ({
      ...item,
      unit: item.unit || 'مقطوعية',
      id: generateId('row'),
    })),
    discountType: 'amount',
    discount: 0,
    invoiceDiscount: 0,
    vatRate: 15,
    paidAmount: 0,
    tafqeetManual: null,
    qrMode: 'web',
    status: 'draft',
  };
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
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.SAVED_CLIENTS,
        JSON.stringify(DEFAULT_SAVED_CLIENTS)
      );
      return DEFAULT_SAVED_CLIENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(
      STORAGE_KEYS.SAVED_CLIENTS,
      JSON.stringify(DEFAULT_SAVED_CLIENTS)
    );
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
