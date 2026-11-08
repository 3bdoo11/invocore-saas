import React, { useRef, useState } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  Palette,
  Layout,
  Check,
  Save,
  Globe,
  Phone,
  Mail,
  CreditCard,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { SellerInfo, TemplateStyle } from '../types/invoice';
import { BRAND_COLOR_PRESETS } from '../constants/defaults';
import { compressAndResizeImage } from '../utils/imageUtils';
import { JURISDICTIONS, getMarketConfig, TaxJurisdiction } from '../constants/jurisdictions';

interface CompanySettingsTabProps {
  seller: SellerInfo;
  onUpdateSeller: (updated: SellerInfo) => void;
  onSave: () => void;
  lang?: 'ar' | 'en';
}

export const CompanySettingsTab: React.FC<CompanySettingsTabProps> = ({
  seller,
  onUpdateSeller,
  onSave,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(
        isAr
          ? 'يرجى اختيار ملف صورة صالح (PNG, JPEG, WebP, SVG)'
          : 'Please select a valid image file (PNG, JPEG, WebP, SVG)'
      );
      return;
    }

    try {
      setIsProcessingLogo(true);
      // Compress and resize image using HTML5 canvas (max 300x300, < 40KB)
      const { dataUrl, extractedColor } = await compressAndResizeImage(file, 300, 300);

      onUpdateSeller({
        ...seller,
        logoDataUrl: dataUrl,
        primaryColor: seller.primaryColor === '#0F172A' ? extractedColor : seller.primaryColor,
      });
    } catch (err) {
      console.error('Logo upload/compression error:', err);
      setUploadError(
        isAr
          ? 'تعذر معالجة الصورة. يرجى تجربة صورة أخرى.'
          : 'Failed to process image. Please try another file.'
      );
    } finally {
      setIsProcessingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    try {
      onUpdateSeller({
        ...seller,
        logoDataUrl: undefined,
      });
    } catch (err) {
      console.warn('Remove logo error:', err);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const primaryColor = seller.primaryColor || '#0F172A';
  const activeStyle = seller.templateStyle || 'modern';
  const currentMarket = getMarketConfig(seller.jurisdiction);

  const templateOptions: Array<{
    id: TemplateStyle;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    badgeAr: string;
    badgeEn: string;
  }> = [
    {
      id: 'modern',
      titleAr: 'تنفيذي عصري (Executive Modern)',
      titleEn: 'Executive Modern',
      descAr: 'ترويسة عريضة ملونة، بطاقات بيانات معاصرة، وتدرجات أنيقة متوافقة مع الفوترة الإلكترونية.',
      descEn: 'Full-bleed brand banner, contemporary card modules, and executive invoice styling.',
      badgeAr: 'الأكثر استخداماً',
      badgeEn: 'Popular Choice',
    },
    {
      id: 'classic',
      titleAr: 'كلاسيكي محاسبي (Corporate Classic Grid)',
      titleEn: 'Corporate Classic Grid',
      descAr: 'تخطيط رسمي بجدول محاسبي كامل الحدود، ترويسة ثنائية اللغة، وختم وتواقيع رسمية ثلاثية.',
      descEn: 'Traditional accounting ledger grid, bilingual corporate header, and formal 3-box signature footer.',
      badgeAr: 'رسمي معتمد',
      badgeEn: 'Formal Ledger',
    },
    {
      id: 'minimalist',
      titleAr: 'مبسط سويسري (Swiss Minimalist)',
      titleEn: 'Swiss Minimalist',
      descAr: 'تصميم هندسي فائق النقاء بخطوط رفيعة، ومساحات بيضاء مفتوحة، وعناوين طباعية بارزة.',
      descEn: 'Ultra-clean architectural typography, hairline borders, and open whitespace design.',
      badgeAr: 'أنيق وحديث',
      badgeEn: 'Modern Editorial',
    },
  ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
          >
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              {isAr ? 'إعدادات المنشأة والهوية البصرية' : 'Company Settings & Brand Identity'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isAr
                ? 'خصص بيانات شركتك، الشعار المعتمد، نطاق الامتثال الضريبي، ونمط القالب المفضل.'
                : 'Configure official company details, corporate logo, tax compliance, and invoice templates.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          style={{ backgroundColor: primaryColor }}
          className="text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
        </button>
      </div>

      {/* 1. Market & Tax Jurisdiction Selector (Full-Width 2x2 Grid) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>
              {isAr
                ? 'نطاق الامتثال الضريبي والسوق الافتراضي (Tax Compliance Jurisdiction)'
                : 'Tax Compliance & Default Market Jurisdiction'}
            </span>
          </h3>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 num-tabular">
            {currentMarket.flag} {currentMarket.currencyCode} ({isAr ? currentMarket.currencySymbolAr : currentMarket.currencySymbolEn})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {(Object.keys(JURISDICTIONS) as TaxJurisdiction[]).map((jKey) => {
            const item = JURISDICTIONS[jKey];
            const isSelected = (seller.jurisdiction || 'KSA') === jKey;
            return (
              <button
                key={jKey}
                type="button"
                onClick={() => onUpdateSeller({ ...seller, jurisdiction: jKey })}
                className={`p-4 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{item.flag}</span>
                    <span className="text-xs font-black text-slate-900 whitespace-normal break-words">
                      {isAr ? item.countryNameAr : item.countryNameEn}
                    </span>
                  </div>
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md num-tabular shrink-0 ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.currencyCode} ({isAr ? item.currencySymbolAr : item.currencySymbolEn})
                  </span>
                </div>

                <div className="border-t border-slate-100/80 pt-2 w-full">
                  <div className="text-[11px] font-bold text-slate-700 whitespace-normal break-words leading-snug">
                    {isAr ? item.authorityNameAr : item.authorityNameEn}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>{isAr ? item.taxLabelAr : item.taxLabelEn}</span>
                    {isSelected && (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{isAr ? 'مفعّل' : 'Active'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Official Legal & Registration Information (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-600" />
          <span>
            {isAr
              ? 'البيانات الرسمية والقانونية للمنشأة (Official Legal Information)'
              : 'Official Company Legal & Registration Details'}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? 'اسم الشركة / المنشأة بالعربية *' : 'Company Official Name (Arabic) *'}
            </label>
            <input
              type="text"
              value={seller.arabicName}
              onChange={(e) => onUpdateSeller({ ...seller, arabicName: e.target.value })}
              placeholder={isAr ? 'مثال: شركة إنفو كور للحلول الذكية' : 'e.g. InvoCore Solutions LLC'}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? 'الاسم الرسمي بالإنجليزية (Company English Name) *' : 'Company Official Name (English) *'}
            </label>
            <input
              type="text"
              dir="ltr"
              value={seller.englishName}
              onChange={(e) => onUpdateSeller({ ...seller, englishName: e.target.value })}
              placeholder="e.g. InvoCore Technologies Ltd."
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white text-left"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? currentMarket.crNumberLabelAr : currentMarket.crNumberLabelEn} *
            </label>
            <input
              type="text"
              dir="ltr"
              value={seller.crNumber}
              onChange={(e) => onUpdateSeller({ ...seller, crNumber: e.target.value })}
              placeholder={currentMarket.crNumberPlaceholder}
              className="w-full text-xs font-bold num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white text-left"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? currentMarket.taxNumberLabelAr : currentMarket.taxNumberLabelEn} *
            </label>
            <input
              type="text"
              dir="ltr"
              value={seller.taxNumber}
              onChange={(e) => onUpdateSeller({ ...seller, taxNumber: e.target.value })}
              placeholder={currentMarket.taxNumberPlaceholder}
              className="w-full text-xs font-bold num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white text-left"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            {isAr ? 'العنوان الوطني والمقر الرئيسي' : 'National Address & Corporate Headquarters'}
          </label>
          <input
            type="text"
            value={seller.address}
            onChange={(e) => onUpdateSeller({ ...seller, address: e.target.value })}
            placeholder={
              isAr
                ? 'المملكة العربية السعودية - الرياض - حي الملقا'
                : 'King Fahd Road, Al-Malqa District, Riyadh, Saudi Arabia'
            }
            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white"
          />
        </div>
      </div>

      {/* 3. Contact & Banking Details (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-teal-600" />
          <span>
            {isAr
              ? 'بيانات الاتصال والتحصيل البنكي (اختياري)'
              : 'Contact & Banking Information (Optional)'}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{isAr ? 'رقم الهاتف / الجوال' : 'Phone / Mobile Number'}</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={seller.phone || ''}
              onChange={(e) => onUpdateSeller({ ...seller, phone: e.target.value })}
              placeholder="05XXXXXXXX"
              className="w-full text-xs font-bold num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white text-left"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{isAr ? 'البريد الإلكتروني الرسمي' : 'Official Corporate Email'}</span>
            </label>
            <input
              type="email"
              dir="ltr"
              value={seller.email || ''}
              onChange={(e) => onUpdateSeller({ ...seller, email: e.target.value })}
              placeholder="contact@invocore.io"
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white text-left"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{isAr ? 'اسم البنك المعتمد' : 'Primary Bank Name'}</span>
            </label>
            <input
              type="text"
              value={seller.bankName || ''}
              onChange={(e) => onUpdateSeller({ ...seller, bankName: e.target.value })}
              placeholder={isAr ? 'البنك الأهلي السعودي (SNB)' : 'Saudi National Bank (SNB)'}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? 'رقم الآيبان البنكي (IBAN)' : 'Bank Account (IBAN)'}
            </label>
            <input
              type="text"
              dir="ltr"
              value={seller.iban || ''}
              onChange={(e) => onUpdateSeller({ ...seller, iban: e.target.value })}
              placeholder="SAXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all bg-white text-left"
            />
          </div>
        </div>
      </div>

      {/* 4. Company Logo & Brand Color (Full Width Stacked Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Custom Logo Upload (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'شعار المنشأة المعتمد (Company Logo)' : 'Official Company Logo'}</span>
          </h3>

          {uploadError && (
            <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
              {uploadError}
            </div>
          )}

          {isProcessingLogo ? (
            <div className="border-2 border-dashed border-teal-400 bg-teal-50/50 rounded-xl p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-700">
                {isAr ? 'جاري ضغط وتحسين الشعار...' : 'Optimizing and resizing logo...'}
              </div>
            </div>
          ) : seller.logoDataUrl ? (
            <div className="border border-slate-200 rounded-xl p-4 text-center space-y-3 bg-slate-50/60">
              <div className="flex justify-center py-2">
                <img
                  src={seller.logoDataUrl}
                  alt="Custom Logo"
                  className="max-h-24 max-w-56 object-contain bg-white rounded-lg p-2 border border-slate-200 shadow-xs"
                />
              </div>
              <div className="flex justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  {isAr ? 'تغيير الشعار' : 'Change Logo'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حذف الشعار' : 'Remove'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/20 rounded-xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Upload className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-xs font-black text-slate-800">
                {isAr ? 'انقر هنا لرفع شعار شركتك' : 'Click here to upload company logo'}
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium">
                {isAr
                  ? 'يدعم صيغ PNG, JPG, SVG بحجم أقصى 2MB (يُضغط تلقائياً لسرعة التحميل)'
                  : 'Supports PNG, JPG, SVG up to 2MB (auto-compressed for crisp rendering)'}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>

        {/* Brand Primary Color Picker (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'لون الهوية الرسمي' : 'Official Brand Color'}</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onUpdateSeller({ ...seller, primaryColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                title={isAr ? 'اختر لوناً مخصصاً' : 'Pick custom color'}
              />
              <span className="text-[10.5px] font-mono font-bold text-slate-600 num-tabular">
                {primaryColor}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {BRAND_COLOR_PRESETS.map((p) => {
              const isSelected = primaryColor.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => onUpdateSeller({ ...seller, primaryColor: p.hex, accentColor: p.accent })}
                  style={{ backgroundColor: p.hex }}
                  className={`h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-xs ${
                    isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : ''
                  }`}
                  title={p.label}
                >
                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Approved Template Style Selector (Full-Width Horizontal 3-Card Row) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
            <Layout className="w-4 h-4 text-teal-600" />
            <span>
              {isAr
                ? 'نمط وهيكل القالب المعتمد (Approved Invoice & Voucher Template)'
                : 'Approved Invoice & Receipt Voucher Template Layout'}
            </span>
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? '3 تصاميم مميزة ومستقلة تماماً' : '3 Distinct Architectural Styles'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {templateOptions.map((style) => {
            const isSelected = activeStyle === style.id;
            return (
              <div
                key={style.id}
                onClick={() => onUpdateSeller({ ...seller, templateStyle: style.id })}
                style={
                  isSelected
                    ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                    : undefined
                }
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isSelected ? 'shadow-xs ring-2 ring-teal-500/15' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-black text-slate-900">
                    {isAr ? style.titleAr : style.titleEn}
                  </div>
                  <div
                    style={
                      isSelected
                        ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                        : undefined
                    }
                    className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs shrink-0"
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-normal break-words">
                  {isAr ? style.descAr : style.descEn}
                </div>

                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    {isAr ? style.badgeAr : style.badgeEn}
                  </span>
                  {isSelected && (
                    <span
                      style={{ color: primaryColor }}
                      className="text-[10.5px] font-extrabold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isAr ? 'مفعّل حالياً' : 'Active'}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
