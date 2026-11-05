/**
 * InvoCore SaaS: Multi-Jurisdiction Global Tax & Compliance Engine
 * Standardized for Saudi Arabia (ZATCA), Egypt (ETA), United States (IRS/Sales Tax),
 * and European Union (Eurozone VAT & VIES).
 */

export type TaxJurisdiction = 'KSA' | 'EGY' | 'USA' | 'EU';

export interface MarketTaxPreset {
  label: string;
  rate: number;
}

export interface MarketConfig {
  code: TaxJurisdiction;
  countryNameAr: string;
  countryNameEn: string;
  authorityNameAr: string;
  authorityNameEn: string;
  flag: string;
  currencyCode: string;
  currencySymbolAr: string;
  currencySymbolEn: string;
  majorUnitAr: string;
  minorUnitAr: string;
  majorUnitEn: string;
  minorUnitEn: string;
  defaultVatRate: number;
  taxType: 'vat' | 'sales_tax';
  taxLabelAr: string;
  taxLabelEn: string;
  taxShortLabelAr: string;
  taxShortLabelEn: string;
  taxNumberLabelAr: string;
  taxNumberLabelEn: string;
  crNumberLabelAr: string;
  crNumberLabelEn: string;
  taxNumberPlaceholder: string;
  crNumberPlaceholder: string;
  qrStandard: 'zatca' | 'eta' | 'standard';
  invoiceTitleAr: string;
  invoiceTitleEn: string;
  supportsWithholdingTax?: boolean;
  supportsReverseCharge?: boolean;
  taxPresets?: MarketTaxPreset[];
}

export const JURISDICTIONS: Record<TaxJurisdiction, MarketConfig> = {
  KSA: {
    code: 'KSA',
    countryNameAr: 'المملكة العربية السعودية',
    countryNameEn: 'Saudi Arabia',
    authorityNameAr: 'هيئة الزكاة والضريبة والجمارك (ZATCA)',
    authorityNameEn: 'ZATCA Compliance',
    flag: '🇸🇦',
    currencyCode: 'SAR',
    currencySymbolAr: 'ر.س',
    currencySymbolEn: 'SAR',
    majorUnitAr: 'ريال سعودي',
    minorUnitAr: 'هللة',
    majorUnitEn: 'Saudi Riyals',
    minorUnitEn: 'Halalas',
    defaultVatRate: 15,
    taxType: 'vat',
    taxLabelAr: 'ضريبة القيمة المضافة (15%)',
    taxLabelEn: 'Value Added Tax (15% VAT)',
    taxShortLabelAr: 'ض.ق.م (15%)',
    taxShortLabelEn: 'VAT (15%)',
    taxNumberLabelAr: 'الرقم الضريبي (15 رقماً)',
    taxNumberLabelEn: 'VAT Number (15 digits)',
    crNumberLabelAr: 'السجل التجاري (10 أرقام)',
    crNumberLabelEn: 'Commercial Registration (CR)',
    taxNumberPlaceholder: '300XXXXXXXXX003',
    crNumberPlaceholder: '1010XXXXXX',
    qrStandard: 'zatca',
    invoiceTitleAr: 'فاتورة ضريبية',
    invoiceTitleEn: 'TAX INVOICE',
    taxPresets: [
      { label: 'ضريبة قياسية (15%)', rate: 15 },
      { label: 'صفرية / صادرات (0%)', rate: 0 },
    ],
  },
  EGY: {
    code: 'EGY',
    countryNameAr: 'جمهورية مصر العربية',
    countryNameEn: 'Egypt',
    authorityNameAr: 'مصلحة الضرائب المصرية (ETA)',
    authorityNameEn: 'Egyptian Tax Authority (ETA)',
    flag: '🇪🇬',
    currencyCode: 'EGP',
    currencySymbolAr: 'ج.م',
    currencySymbolEn: 'EGP',
    majorUnitAr: 'جنيه مصري',
    minorUnitAr: 'قرش',
    majorUnitEn: 'Egyptian Pounds',
    minorUnitEn: 'Piasters',
    defaultVatRate: 14,
    taxType: 'vat',
    taxLabelAr: 'ضريبة القيمة المضافة (14%)',
    taxLabelEn: 'Value Added Tax (14% VAT)',
    taxShortLabelAr: 'ض.ق.م (14%)',
    taxShortLabelEn: 'VAT (14%)',
    taxNumberLabelAr: 'رقم التسجيل الضريبي (9 أرقام)',
    taxNumberLabelEn: 'Tax Registration No. (9 digits)',
    crNumberLabelAr: 'السجل التجاري',
    crNumberLabelEn: 'Commercial Register',
    taxNumberPlaceholder: '123-456-789',
    crNumberPlaceholder: '123456',
    qrStandard: 'eta',
    invoiceTitleAr: 'فاتورة ضريبية إلكترونية',
    invoiceTitleEn: 'ELECTRONIC TAX INVOICE',
    supportsWithholdingTax: true,
    taxPresets: [
      { label: 'ضريبة عامة (14%)', rate: 14 },
      { label: 'ضريبة جدول / معفى (0%)', rate: 0 },
    ],
  },
  USA: {
    code: 'USA',
    countryNameAr: 'الولايات المتحدة الأمريكية',
    countryNameEn: 'United States',
    authorityNameAr: 'إدارة الإيرادات الداخلية (IRS & State Sales Tax)',
    authorityNameEn: 'IRS & State Sales Tax',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbolAr: '$',
    currencySymbolEn: '$',
    majorUnitAr: 'دولار أمريكي',
    minorUnitAr: 'سنت',
    majorUnitEn: 'US Dollars',
    minorUnitEn: 'Cents',
    defaultVatRate: 8.0,
    taxType: 'sales_tax',
    taxLabelAr: 'ضريبة المبيعات الحكومية (Sales Tax)',
    taxLabelEn: 'State Sales Tax',
    taxShortLabelAr: 'ضريبة المبيعات',
    taxShortLabelEn: 'Sales Tax',
    taxNumberLabelAr: 'رقم تعريف صاحب العمل (EIN)',
    taxNumberLabelEn: 'Employer Identification Number (EIN)',
    crNumberLabelAr: 'رقم تسجيل الشركة / الولاية',
    crNumberLabelEn: 'State Registration / Corp ID',
    taxNumberPlaceholder: '12-3456789',
    crNumberPlaceholder: 'DE-CORP-123456',
    qrStandard: 'standard',
    invoiceTitleAr: 'فاتورة تجارية رسمية',
    invoiceTitleEn: 'COMMERCIAL SALES INVOICE',
    taxPresets: [
      { label: 'خدمات سحابية معفاة (0%)', rate: 0 },
      { label: 'تكساس TX (6.25%)', rate: 6.25 },
      { label: 'كاليفورنيا CA (7.25%)', rate: 7.25 },
      { label: 'نيويورك NY (8.875%)', rate: 8.875 },
    ],
  },
  EU: {
    code: 'EU',
    countryNameAr: 'الاتحاد الأوروبي (منطقة اليورو)',
    countryNameEn: 'European Union',
    authorityNameAr: 'منظومة ضريبة القيمة المضافة الأوروبية (VIES)',
    authorityNameEn: 'EU VAT & VIES Compliance',
    flag: '🇪🇺',
    currencyCode: 'EUR',
    currencySymbolAr: '€',
    currencySymbolEn: '€',
    majorUnitAr: 'يورو',
    minorUnitAr: 'سنت',
    majorUnitEn: 'Euros',
    minorUnitEn: 'Cents',
    defaultVatRate: 20,
    taxType: 'vat',
    taxLabelAr: 'ضريبة القيمة المضافة الأوروبية (EU VAT)',
    taxLabelEn: 'Value Added Tax (EU VAT)',
    taxShortLabelAr: 'ض.ق.م (EU VAT)',
    taxShortLabelEn: 'EU VAT',
    taxNumberLabelAr: 'الرقم الضريبي الأوروبي (EU VAT No)',
    taxNumberLabelEn: 'EU VAT Registration No (VIES)',
    crNumberLabelAr: 'رقم السجل / EORI',
    crNumberLabelEn: 'Company Reg / EORI No',
    taxNumberPlaceholder: 'DE123456789 / FR12345678901',
    crNumberPlaceholder: 'HRB 123456 / EORI',
    qrStandard: 'standard',
    invoiceTitleAr: 'فاتورة ضريبية أوروبية',
    invoiceTitleEn: 'EU TAX INVOICE',
    supportsReverseCharge: true,
    taxPresets: [
      { label: 'ألمانيا DE (19%)', rate: 19 },
      { label: 'فرنسا FR (20%)', rate: 20 },
      { label: 'هولندا NL (21%)', rate: 21 },
      { label: 'تكليف عكسي B2B (0%)', rate: 0 },
    ],
  },
};

export function getMarketConfig(code?: TaxJurisdiction | string): MarketConfig {
  if (code && code in JURISDICTIONS) {
    return JURISDICTIONS[code as TaxJurisdiction];
  }
  return JURISDICTIONS.KSA;
}
