import {
  CatalogItem,
  ClientInfo,
  InvoiceLineItem,
  PaymentMethod,
  SavedClient,
  SellerInfo,
  TemplateStyle,
} from '../types/invoice';

export const DEFAULT_APP_TITLE =
  'InvoCore | Smart B2B E-Invoicing Platform';

export const STORAGE_KEYS = {
  CATALOG: 'saas_catalog',
  INVOICES: 'saas_invoices',
  NEXT_INVOICE_NO: 'saas_next_invoice_no',
  SELLER_INFO: 'saas_company_settings_v1',
  SAVED_CLIENTS: 'saas_clients',
  ONBOARDING_COMPLETED: 'saas_onboarding_completed',
} as const;

export const INITIAL_INVOICE_NUMBER = 1001;

export const PAYMENT_METHODS: PaymentMethod[] = [
  'آجل',
  'نقدي',
  'تحويل بنكي',
  'شبكة',
];

export interface TemplateStyleOption {
  id: TemplateStyle;
  name: string;
  englishLabel: string;
  description: string;
  iconName: string;
}

export const TEMPLATE_STYLES: TemplateStyleOption[] = [
  {
    id: 'modern',
    name: 'تصميم عصري متطور (Modern)',
    englishLabel: 'Contemporary Cards & Vibrant Badges',
    description: 'ترويسة عصرية أنيقة، بطاقات بيانات محددة، تدرجات احترافية لهوية المنشأة.',
    iconName: 'Sparkles',
  },
  {
    id: 'classic',
    name: 'تصميم كلاسيكي تنفيذي (Classic)',
    englishLabel: 'Executive Double Borders & Formal Grid',
    description: 'إطار رسمي متكامل، ترويسة ثلاثية متوازنة، وتنسيق محاسبي للشركات والمؤسسات الكبرى.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'minimalist',
    name: 'تصميم بسيط ونظيف (Minimalist)',
    englishLabel: 'Clean Hairline Lines & Minimalist Flow',
    description: 'تركيز على البيانات بخطوط أفقية ناعمة، مساحات بيضاء واسعة، وإبراز واضح للمبالغ.',
    iconName: 'Layers',
  },
];

export const BRAND_COLOR_PRESETS = [
  { label: 'كحلي ملكي (Royal Navy)', hex: '#0F172A', accent: '#D97706' },
  { label: 'أزرق احترافي (Corporate Blue)', hex: '#1D4ED8', accent: '#3B82F6' },
  { label: 'فيروزي حديث (Modern Teal)', hex: '#0D9488', accent: '#14B8A6' },
  { label: 'أخضر زمردي (Emerald Green)', hex: '#059669', accent: '#10B981' },
  { label: 'نيلي معاصر (Indigo)', hex: '#4F46E5', accent: '#818CF8' },
  { label: 'أحمر قرمزي (Crimson ATC)', hex: '#DC2626', accent: '#991B1B' },
  { label: 'عنبري دافئ (Warm Amber)', hex: '#B45309', accent: '#D97706' },
  { label: 'رمادي حجري (Slate Industrial)', hex: '#334155', accent: '#64748B' },
];

export const EMPTY_SELLER_INFO: SellerInfo = {
  arabicName: '',
  englishName: '',
  legalType: 'شركة ذات مسؤولية محدودة',
  crNumber: '',
  taxNumber: '',
  address: '',
  phone: '',
  email: '',
  bankName: '',
  accountNumber: '',
  iban: '',
  primaryColor: '#0F172A',
  accentColor: '#D97706',
  templateStyle: 'modern',
};

export const DEFAULT_SELLER_INFO: SellerInfo = {
  arabicName: 'شركة نوفاكور للتقنية الذكية',
  englishName: 'NovaCore Technologies Ltd.',
  legalType: 'شركة ذات مسؤولية محدودة',
  crNumber: '1010892451',
  taxNumber: '310987654300003',
  address: 'المملكة العربية السعودية - الرياض',
  phone: '+966 50 000 0000',
  email: 'contact@novacore.io',
  bankName: 'البنك الأهلي السعودي (SNB)',
  iban: 'SA0000000000000000000000',
  primaryColor: '#0F172A',
  accentColor: '#D97706',
  templateStyle: 'modern',
};

export const CATEGORIZED_UNITS = [
  {
    category: 'وحدات المسافة والأطوال',
    units: [
      'متر طولي (م.ط)',
      'سم (سنتيمتر)',
      'ملم (مليمتر)',
      'كم (كيلومتر)',
      'بوصة (إنش)',
    ],
  },
  {
    category: 'وحدات المساحة والحجم',
    units: ['م2 (متر مربع)', 'م3 (متر مكعب)', 'لتر', 'جالون'],
  },
  {
    category: 'وحدات الأوزان',
    units: ['طن', 'كجم (كيلوجرام)', 'جرام'],
  },
  {
    category: 'وحدات العدد والتعبئة',
    units: [
      'وحدة',
      'حبة',
      'قطعة',
      'كيس',
      'ربطة',
      'لفة',
      'كرتون',
      'صفيحة',
      'برميل',
      'طقم',
      'لوح',
    ],
  },
  {
    category: 'وحدات المقاولات والعمل',
    units: ['مقطوعية', 'رد', 'شحنة', 'يومية', 'ساعة عمل', 'شهر', 'مستخلص'],
  },
] as const;

export const COMMON_UNITS: string[] = [
  'وحدة',
  'حبة',
  'قطعة',
  'طن',
  'كجم',
  'م3',
  'م2',
  'متر طولي',
  'مقطوعية',
  'ساعة عمل',
  'يومية',
  'شهر',
  'مستخلص',
  'كرتون',
  'كيس',
  'ربطة',
  'لفة',
  'رد',
];

export const EMPTY_CLIENT_INFO: ClientInfo = {
  name: '',
  taxNumber: '',
  notes: '',
  address: '',
  phone: '',
};

export const DEFAULT_SAVED_CLIENTS: SavedClient[] = [];

export const DEFAULT_INITIAL_LINE_ITEMS: InvoiceLineItem[] = [
  {
    id: 'item-initial-1',
    itemCode: 'SaaS-101',
    description: 'Cloud Infrastructure & API Integration / تطوير وربط البنية السحابية',
    unit: 'خدمة',
    qty: 1,
    unitPrice: 1500,
  },
];

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [];
