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
import { SellerInfo } from '../types/invoice';
import { BRAND_COLOR_PRESETS, TEMPLATE_STYLES } from '../constants/defaults';
import { compressAndResizeImage } from '../utils/imageUtils';
import { JURISDICTIONS, getMarketConfig, TaxJurisdiction } from '../constants/jurisdictions';

interface CompanySettingsTabProps {
  seller: SellerInfo;
  onUpdateSeller: (updated: SellerInfo) => void;
  onSave: () => void;
}

export const CompanySettingsTab: React.FC<CompanySettingsTabProps> = ({
  seller,
  onUpdateSeller,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار ملف صورة صالح (PNG, JPEG, WebP, SVG)');
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
      setUploadError('تعذر معالجة الصورة. يرجى تجربة صورة أخرى.');
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

  return (
    <div dir="rtl" className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            className="w-12 h-12 rounded-xl flex items-center justify-center"
          >
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              إعدادات المنشأة والهوية البصرية (SaaS Tenant Settings)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              خصص بيانات شركتك، الشعار المعتمد، الألوان الرسمية، ونمط القالب المفضل.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          style={{ backgroundColor: primaryColor }}
          className="text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>حفظ التعديلات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Column 1: Company Profile & Tax Info (7 cols) */}
        <div className="md:col-span-7 space-y-5">
          {/* Card 0: Market / Tax Jurisdiction Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>نطاق الامتثال الضريبي والسوق الافتراضي (Market Jurisdiction)</span>
              </h3>
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                {getMarketConfig(seller.jurisdiction).flag} {getMarketConfig(seller.jurisdiction).currencyCode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(JURISDICTIONS) as TaxJurisdiction[]).map((jKey) => {
                const item = JURISDICTIONS[jKey];
                const isSelected = (seller.jurisdiction || 'KSA') === jKey;
                return (
                  <button
                    key={jKey}
                    type="button"
                    onClick={() => onUpdateSeller({ ...seller, jurisdiction: jKey })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{item.flag}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.currencyCode} ({item.currencySymbolAr})
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{item.countryNameAr}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">{item.authorityNameAr}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Legal Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>البيانات الرسمية والقانونية للمنشأة</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  اسم الشركة / المنشأة بالعربية *
                </label>
                <input
                  type="text"
                  value={seller.arabicName}
                  onChange={(e) => onUpdateSeller({ ...seller, arabicName: e.target.value })}
                  placeholder="مثال: شركة إنفو كور للحلول الذكية"
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الاسم الرسمي بالإنجليزية (Company English Name)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={seller.englishName}
                  onChange={(e) => onUpdateSeller({ ...seller, englishName: e.target.value })}
                  placeholder="e.g. InvoCore Technologies Ltd."
                  className="w-full text-xs font-bold text-right border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {getMarketConfig(seller.jurisdiction).crNumberLabelAr} *
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={seller.crNumber}
                    onChange={(e) => onUpdateSeller({ ...seller, crNumber: e.target.value })}
                    placeholder={getMarketConfig(seller.jurisdiction).crNumberPlaceholder}
                    className="w-full text-xs font-black text-right num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {getMarketConfig(seller.jurisdiction).taxNumberLabelAr} *
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={seller.taxNumber}
                    onChange={(e) => onUpdateSeller({ ...seller, taxNumber: e.target.value })}
                    placeholder={getMarketConfig(seller.jurisdiction).taxNumberPlaceholder}
                    className="w-full text-xs font-black text-right num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  العنوان الوطني والمقر الرئيسي
                </label>
                <input
                  type="text"
                  value={seller.address}
                  onChange={(e) => onUpdateSeller({ ...seller, address: e.target.value })}
                  placeholder="المملكة العربية السعودية - الرياض - حي الملقا"
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>
          </div>

          {/* Card: Contact & Banking Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <span>بيانات الاتصال والتحصيل البنكي (اختياري)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>رقم الهاتف / الجوال</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={seller.phone || ''}
                  onChange={(e) => onUpdateSeller({ ...seller, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                  className="w-full text-xs font-bold text-right border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>البريد الإلكتروني</span>
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={seller.email || ''}
                  onChange={(e) => onUpdateSeller({ ...seller, email: e.target.value })}
                  placeholder="contact@invocore.io"
                  className="w-full text-xs font-bold text-right border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  <span>اسم البنك المعتمد</span>
                </label>
                <input
                  type="text"
                  value={seller.bankName || ''}
                  onChange={(e) => onUpdateSeller({ ...seller, bankName: e.target.value })}
                  placeholder="البنك الأهلي السعودي (SNB)"
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رقم الآيبان (IBAN)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={seller.iban || ''}
                  onChange={(e) => onUpdateSeller({ ...seller, iban: e.target.value })}
                  placeholder="SAXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full text-xs font-mono font-bold text-right border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Logo, Branding Colors & Template Style (5 cols) */}
        <div className="md:col-span-5 space-y-5">
          {/* Card: Custom Logo Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>شعار المنشأة (Custom Logo)</span>
            </h3>

            {uploadError && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl text-center">
                {uploadError}
              </div>
            )}

            {isProcessingLogo ? (
              <div className="border-2 border-dashed border-teal-400 bg-teal-50/50 rounded-xl p-6 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                <div className="text-xs font-bold text-slate-700">جاري ضغط وتحسين الشعار...</div>
              </div>
            ) : seller.logoDataUrl ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center space-y-3 bg-slate-50/50">
                <div className="flex justify-center">
                  <img
                    src={seller.logoDataUrl}
                    alt="Custom Logo"
                    className="max-h-24 max-w-44 object-contain bg-white rounded-lg p-2 border border-slate-200 shadow-xs"
                  />
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    تغيير الشعار
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/20 rounded-xl p-5 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-black text-slate-800">
                  انقر هنا لرفع شعار شركتك
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  يدعم PNG, JPG, SVG بحجم أقصى 2 ميجابايت (يتم حفظه محلياً كـ Base64)
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

          {/* Card: Brand Primary Color Picker */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-500" />
                <span>لون الهوية الرسمي (Brand Color)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => onUpdateSeller({ ...seller, primaryColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  title="اختر لون مخصص"
                />
                <span className="text-[10px] font-mono font-bold text-slate-600 num-tabular">
                  {primaryColor}
                </span>
              </div>
            </h3>

            {/* Presets */}
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

          {/* Card: Template Style Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Layout className="w-4 h-4 text-slate-500" />
              <span>نمط وهيكل القالب المعتمد (Template Style)</span>
            </h3>

            <div className="space-y-2">
              {TEMPLATE_STYLES.map((style) => {
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
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected ? 'border-amber-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      style={
                        isSelected
                          ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                          : undefined
                      }
                      className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs shrink-0 mt-0.5"
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                        <span>{style.name}</span>
                        {isSelected && (
                          <span
                            style={{ color: primaryColor }}
                            className="text-[10px] font-bold flex items-center gap-0.5"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>مفعّل</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {style.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
