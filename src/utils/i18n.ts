/**
 * InvoCore SaaS Internationalization (i18n) Engine
 * Provides 100% Arabic & English bidirectional localization.
 */

export type Language = 'ar' | 'en';

export interface Translations {
  // Brand & Top Header
  brandName: string;
  brandTagline: string;
  guestPreviewBadge: string;
  proLicensedBadge: string;
  trialBalanceBadge: string;
  upgradeToPro: string;
  signIn: string;
  signOut: string;
  signInOrCreate: string;
  langSwitchBtn: string;

  // Main Tabs
  tabInvoiceDetails: string;
  tabClientInfo: string;
  tabLineItems: string;
  tabReceiptVoucher: string;
  tabCatalog: string;
  tabHistory: string;
  tabSettings: string;

  // Invoice Details Form
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTime: string;
  paymentMethod: string;
  payCredit: string;
  payCash: string;
  payBankTransfer: string;
  payPos: string;
  vatRate: string;
  qrMode: string;
  qrZatca: string;
  qrWeb: string;

  // Client Details Form
  clientDetailsTitle: string;
  clientName: string;
  clientNamePlaceholder: string;
  clientTaxNumber: string;
  clientPhone: string;
  clientAddress: string;
  clientAddressPlaceholder: string;
  clientNotes: string;
  clientNotesPlaceholder: string;
  savedClientsTitle: string;
  selectClient: string;
  saveClientBtn: string;

  // Line Items Section
  itemsTableTitle: string;
  addItemBtn: string;
  itemCodeCol: string;
  itemDescCol: string;
  itemUnitCol: string;
  itemQtyCol: string;
  itemPriceCol: string;
  itemTotalCol: string;
  itemActionsCol: string;
  deleteItem: string;
  downloadExcelTemplate: string;
  exportInvoiceItemsExcel: string;
  importExcelAppend: string;
  importExcelReplace: string;

  // Financial Summary Cards
  financialSummaryTitle: string;
  subtotal: string;
  discount: string;
  discountAmount: string;
  discountPercent: string;
  vatAmount: string;
  grandTotal: string;
  amountInWords: string;
  paidAmount: string;
  remainingAmount: string;

  // Actions Bar
  printInvoiceBtn: string;
  printReceiptBtn: string;
  printBothBtn: string;
  shareWhatsAppBtn: string;
  newInvoiceBtn: string;
  saveInvoiceToHistoryBtn: string;

  // Receipt Voucher Section
  voucherTitle: string;
  voucherNumber: string;
  voucherDate: string;
  voucherReceivedFrom: string;
  voucherAmount: string;
  voucherBeingFor: string;
  voucherCashier: string;
  voucherAccountant: string;
  voucherPrintNotice: string;

  // Company Settings
  settingsTitle: string;
  companyArabicName: string;
  companyEnglishName: string;
  commercialReg: string;
  taxNumber: string;
  nationalAddress: string;
  phone: string;
  email: string;
  bankName: string;
  ibanNumber: string;
  brandColor: string;
  templateStyle: string;
  uploadLogo: string;
  changeLogo: string;
  deleteLogo: string;
  saveSettingsBtn: string;

  // Watermark
  watermarkText: string;

  // Common
  currency: string;
  loading: string;
  success: string;
  cancel: string;
  confirm: string;
  close: string;
  allRightsReserved: string;
}

export const DICTIONARY: Record<Language, Translations> = {
  ar: {
    brandName: 'InvoCore',
    brandTagline: 'منصة الفوترة الإلكترونية الذكية للمنشآت (B2B)',
    guestPreviewBadge: 'زائر تجريبي (معاينة سريعة)',
    proLicensedBadge: 'حساب مرخص (PRO Licensed)',
    trialBalanceBadge: 'رصيد الفواتير التجريبية',
    upgradeToPro: 'ترقية إلى PRO',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    signInOrCreate: 'تسجيل الدخول / إنشاء حساب',
    langSwitchBtn: 'English',

    tabInvoiceDetails: 'بيانات الفاتورة',
    tabClientInfo: 'بيانات العميل',
    tabLineItems: 'أصناف الفاتورة',
    tabReceiptVoucher: 'سند القبض',
    tabCatalog: 'دليل الأصناف',
    tabHistory: 'سجل الفواتير',
    tabSettings: 'إعدادات المنشأة',

    invoiceNumber: 'رقم الفاتورة',
    invoiceDate: 'تاريخ الإصدار',
    invoiceTime: 'وقت الإصدار',
    paymentMethod: 'طريقة السداد',
    payCredit: 'آجل',
    payCash: 'نقدي',
    payBankTransfer: 'تحويل بنكي',
    payPos: 'شبكة',
    vatRate: 'نسبة الضريبة (%)',
    qrMode: 'نمط رمز الاستجابة السريعة (QR)',
    qrZatca: 'مشفر ZATCA الرسمي',
    qrWeb: 'رابط العميل المباشر',

    clientDetailsTitle: 'بيانات العميل أو المنشأة المشترية',
    clientName: 'اسم الشركة أو العميل',
    clientNamePlaceholder: 'اسم الشركة أو العميل (مثال: شركة الحلول الرقمية)...',
    clientTaxNumber: 'الرقم الضريبي للعميل (15 رقماً)',
    clientPhone: 'رقم الجوال / الهاتف',
    clientAddress: 'العنوان الوطني للعميل',
    clientAddressPlaceholder: 'المدينة - الحي - الرمز البريدي...',
    clientNotes: 'ملاحظات إضافية / رقم التعميد',
    clientNotesPlaceholder: 'سجل تجاري / رقم التعميد / شروط الدفع...',
    savedClientsTitle: 'دفتر العملاء المحفوظين',
    selectClient: 'اختر عميل محفوظ للتعبئة التلقائية...',
    saveClientBtn: 'حفظ كعميل دائم',

    itemsTableTitle: 'جدول الأصناف والخدمات',
    addItemBtn: 'إضافة بند جديد',
    itemCodeCol: 'الكود',
    itemDescCol: 'البيان / الوصف',
    itemUnitCol: 'الوحدة',
    itemQtyCol: 'الكمية',
    itemPriceCol: 'سعر الوحدة',
    itemTotalCol: 'الإجمالي قبل الضريبة',
    itemActionsCol: 'إجراءات',
    deleteItem: 'حذف البند',
    downloadExcelTemplate: 'تحميل قالب فارغ للتعبئة',
    exportInvoiceItemsExcel: 'تصدير بنود الفاتورة الحالية إلى إكسل (.xlsx)',
    importExcelAppend: 'استيراد + دمج مع الحالية',
    importExcelReplace: 'استيراد واستبدال بالكامل',

    financialSummaryTitle: 'الملخص المالي والضريبي',
    subtotal: 'الإجمالي قبل الضريبة',
    discount: 'الخصم التجاري',
    discountAmount: 'مبلغ نقدي',
    discountPercent: 'نسبة مئوية (%)',
    vatAmount: 'ضريبة القيمة المضافة (15%)',
    grandTotal: 'المبلغ الإجمالي المستحق',
    amountInWords: 'المبلغ كتابةً (تفقيط)',
    paidAmount: 'المبلغ المدفوع',
    remainingAmount: 'المبلغ المتبقي',

    printInvoiceBtn: 'طباعة الفاتورة (A4)',
    printReceiptBtn: 'طباعة سند القبض (A4)',
    printBothBtn: 'طباعة المستندين معاً',
    shareWhatsAppBtn: 'مشاركة الفاتورة عبر واتساب',
    newInvoiceBtn: 'فاتورة جديدة',
    saveInvoiceToHistoryBtn: 'حفظ وإصدار الفاتورة في السجل',

    voucherTitle: 'سند قبض مالي',
    voucherNumber: 'رقم السند',
    voucherDate: 'تاريخ السند',
    voucherReceivedFrom: 'استلمنا من المكرم',
    voucherAmount: 'مبلغ وقدره',
    voucherBeingFor: 'وذلك مقابل',
    voucherCashier: 'المستلم / أمين الصندوق',
    voucherAccountant: 'المحاسب المعتمد',
    voucherPrintNotice: 'سند إلكتروني رسمي معتمد وفق لوائح المدفوعات والفوترة الذكية',

    settingsTitle: 'إعدادات المنشأة والهوية المعتمدة',
    companyArabicName: 'اسم المنشأة بالعربية',
    companyEnglishName: 'اسم المنشأة بالإنجليزية',
    commercialReg: 'رقم السجل التجاري (CR)',
    taxNumber: 'الرقم الضريبي للمنشأة (15 رقماً)',
    nationalAddress: 'العنوان الوطني / المقر الرئيسي',
    phone: 'رقم التواصل الرسمي',
    email: 'البريد الإلكتروني الرسمي',
    bankName: 'اسم البنك المعتمد',
    ibanNumber: 'رقم الآيبان (IBAN)',
    brandColor: 'لون الهوية الرسمي',
    templateStyle: 'نمط تصميم الفاتورة',
    uploadLogo: 'انقر هنا لرفع شعار شركتك',
    changeLogo: 'تغيير الشعار',
    deleteLogo: 'حذف',
    saveSettingsBtn: 'حفظ بيانات المنشأة والشعار',

    watermarkText: 'نسخة تجريبية للعرض فقط — غير صالحة للاستخدام الضريبي الرسمي — INVOCORE.SAAS',

    currency: 'ر.س',
    loading: 'جاري التحميل...',
    success: 'تم بنجاح',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',
    allRightsReserved: 'جميع الحقوق محفوظة.',
  },

  en: {
    brandName: 'InvoCore',
    brandTagline: 'Smart B2B E-Invoicing & Revenue Operations Platform',
    guestPreviewBadge: 'Guest Preview Mode',
    proLicensedBadge: 'PRO Licensed Account',
    trialBalanceBadge: 'Trial Invoices Left',
    upgradeToPro: 'Upgrade to PRO',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signInOrCreate: 'Sign In / Create Account',
    langSwitchBtn: 'العربية',

    tabInvoiceDetails: 'Invoice Info',
    tabClientInfo: 'Buyer / Client',
    tabLineItems: 'Line Items',
    tabReceiptVoucher: 'Receipt Voucher',
    tabCatalog: 'Catalog Manager',
    tabHistory: 'Invoices History',
    tabSettings: 'Company Settings',

    invoiceNumber: 'Invoice Number',
    invoiceDate: 'Issue Date',
    invoiceTime: 'Issue Time',
    paymentMethod: 'Payment Method',
    payCredit: 'Credit / On Account',
    payCash: 'Cash',
    payBankTransfer: 'Bank Wire / Transfer',
    payPos: 'POS / Card Network',
    vatRate: 'VAT Rate (%)',
    qrMode: 'QR Code Mode',
    qrZatca: 'ZATCA Official Encrypted TLV',
    qrWeb: 'Instant Client Verification Link',

    clientDetailsTitle: 'Buyer / Client Organization Info',
    clientName: 'Company or Client Name',
    clientNamePlaceholder: 'Client or Company Name (e.g., NovaCore Technologies Ltd.)...',
    clientTaxNumber: 'Client VAT Number (15 digits)',
    clientPhone: 'Phone / Mobile',
    clientAddress: 'Client Business Address',
    clientAddressPlaceholder: 'City - District - Postal Code...',
    clientNotes: 'Additional Notes / PO Number',
    clientNotesPlaceholder: 'Commercial Reg / PO Number / Payment Terms...',
    savedClientsTitle: 'Saved Clients Directory',
    selectClient: 'Select saved client for auto-fill...',
    saveClientBtn: 'Save Client to Directory',

    itemsTableTitle: 'Invoice Items & Services Table',
    addItemBtn: 'Add Line Item',
    itemCodeCol: 'Code',
    itemDescCol: 'Description / Service',
    itemUnitCol: 'Unit',
    itemQtyCol: 'Qty',
    itemPriceCol: 'Unit Price',
    itemTotalCol: 'Total (Pre-VAT)',
    itemActionsCol: 'Actions',
    deleteItem: 'Delete Item',
    downloadExcelTemplate: 'Download Blank Excel Template',
    exportInvoiceItemsExcel: 'Export Current Line Items to Excel (.xlsx)',
    importExcelAppend: 'Import & Append (+ Merge)',
    importExcelReplace: 'Import & Replace All',

    financialSummaryTitle: 'Financial & Tax Summary',
    subtotal: 'Subtotal (Excl. VAT)',
    discount: 'Commercial Discount',
    discountAmount: 'Fixed Amount',
    discountPercent: 'Percentage (%)',
    vatAmount: 'Value Added Tax (15%)',
    grandTotal: 'Total Payable Amount',
    amountInWords: 'Amount in Words (Tafqeet)',
    paidAmount: 'Paid Amount',
    remainingAmount: 'Remaining Balance',

    printInvoiceBtn: 'Print Invoice (A4)',
    printReceiptBtn: 'Print Receipt (A4)',
    printBothBtn: 'Print Both Documents',
    shareWhatsAppBtn: 'Share via WhatsApp',
    newInvoiceBtn: 'New Blank Invoice',
    saveInvoiceToHistoryBtn: 'Issue & Save Invoice to History',

    voucherTitle: 'OFFICIAL RECEIPT VOUCHER',
    voucherNumber: 'Receipt No.',
    voucherDate: 'Date',
    voucherReceivedFrom: 'Received From',
    voucherAmount: 'The Sum Of',
    voucherBeingFor: 'Being Payment For',
    voucherCashier: 'Received By / Cashier',
    voucherAccountant: 'Certified Accountant',
    voucherPrintNotice: 'Certified official electronic receipt voucher issued via smart invoicing guidelines.',

    settingsTitle: 'Organization Profile & Corporate Identity',
    companyArabicName: 'Company Name (Arabic)',
    companyEnglishName: 'Company Name (English)',
    commercialReg: 'Commercial Registration (CR)',
    taxNumber: 'Company VAT Number (15 digits)',
    nationalAddress: 'National Business Address',
    phone: 'Official Phone / Contact',
    email: 'Corporate Email',
    bankName: 'Bank Name',
    ibanNumber: 'IBAN Number',
    brandColor: 'Brand Primary Color',
    templateStyle: 'Invoice Layout Template',
    uploadLogo: 'Click here to upload corporate logo',
    changeLogo: 'Change Logo',
    deleteLogo: 'Delete',
    saveSettingsBtn: 'Save Company Settings & Logo',

    watermarkText: 'TRIAL PREVIEW — NOT VALID FOR OFFICIAL TAX USE — INVOCORE.SAAS',

    currency: 'SAR',
    loading: 'Loading...',
    success: 'Successful',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    allRightsReserved: 'All rights reserved.',
  },
};

export function getTranslation(lang: Language): Translations {
  return DICTIONARY[lang] || DICTIONARY.ar;
}
