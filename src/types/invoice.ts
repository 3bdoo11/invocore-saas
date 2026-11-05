export type PaymentMethod = 'آجل' | 'نقدي' | 'تحويل بنكي' | 'شبكة';

export type QrEncodingMode = 'both' | 'zatca' | 'web';

export type DiscountType = 'amount' | 'percentage';

export type TemplateStyle = 'modern' | 'classic' | 'minimalist';

export type DocumentPrintView = 'invoice' | 'receipt' | 'both';

export interface CatalogItem {
  id: string;
  name: string;
  unit?: string;
  defaultQuantity?: number;
  unitPrice: number;
  itemCode?: string;
  isTaxable?: boolean;
}

export interface InvoiceLineItem {
  id: string;
  itemCode?: string;
  description: string;
  unit?: string;
  qty: number;
  unitPrice: number;
}

export interface SellerInfo {
  id?: string;
  arabicName: string;
  legalType?: string;
  crNumber: string;
  taxNumber: string;
  englishName: string;
  address: string;
  logoDataUrl?: string; // Custom Base64 logo
  primaryColor?: string; // Brand Hex color e.g. #0F172A
  accentColor?: string;
  templateStyle?: TemplateStyle; // 'modern' | 'classic' | 'minimalist'
  fontFamily?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  buildingNo?: string;
  streetName?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  additionalNo?: string;
  specialty?: string;
  salesperson?: string;
}

export interface ClientInfo {
  name: string;
  taxNumber: string;
  notes: string;
  address: string;
  phone: string;
  buildingNo?: string;
  streetName?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  additionalNo?: string;
  crNumber?: string;
}

export interface SavedClient extends ClientInfo {
  id: string;
}

export interface ReceiptVoucherData {
  receiptNumber: string;
  date: string;
  time: string;
  receivedFrom: string;
  amount: number | null;
  amountInWordsManual: string | null;
  forReason: string;
  paymentMethod: PaymentMethod;
  receiverName: string;
  accountantName: string;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY/MM/DD
  time: string; // HH:mm or 12h string
  paymentMethod: PaymentMethod;
  itemsCountManual: string | null; // null = auto-calculated from items.length
  pageNumberManual: string | null; // null = auto-calculated (e.g. "1 من 1")
  client: ClientInfo;
  items: InvoiceLineItem[];
  discountType: DiscountType; // 'amount' (SAR) or 'percentage' (%)
  discount: number; // raw input (SAR amount or % value)
  invoiceDiscount: number; // additional fixed SAR invoice discount
  vatRate?: number; // editable VAT percentage, defaults to 15
  paidAmount: number;
  tafqeetManual: string | null; // null = auto-generated Arabic Tafqeet
  qrMode: QrEncodingMode;
  status: 'draft' | 'issued';
  issuedAt?: string;
  companyId?: string;
  sellerSnapshot?: SellerInfo;
  receiptVoucher?: Partial<ReceiptVoucherData>;
}

export interface InvoiceTotals {
  subtotal: number;
  discountType: DiscountType;
  discountInput: number;
  discountAmount: number; // resolved SAR amount from % or fixed
  invoiceDiscount: number;
  totalDiscount: number; // discountAmount + invoiceDiscount
  taxableAmount: number; // subtotal - totalDiscount (BEFORE VAT)
  vatRate: number; // e.g. 15
  vatAmount: number; // taxableAmount * (vatRate / 100)
  finalTotal: number; // taxableAmount + vatAmount
  paidAmount: number;
  remainingBalance: number;
}
