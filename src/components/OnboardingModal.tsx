import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Upload,
  Palette,
  Layout,
  Check,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import { SellerInfo } from '../types/invoice';
import { BRAND_COLOR_PRESETS, TEMPLATE_STYLES } from '../constants/defaults';
import { compressAndResizeImage } from '../utils/imageUtils';

interface OnboardingModalProps {
  initialSeller: SellerInfo;
  onComplete: (configuredSeller: SellerInfo) => void;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialSeller,
  onComplete,
  onClose,
}) => {
  const [seller, setSeller] = useState<SellerInfo>({ ...initialSeller });
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const primaryColor = seller.primaryColor || '#0F172A';
  const activeStyle = seller.templateStyle || 'modern';

  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (PNG, JPEG, WebP, SVG)');
      return;
    }

    try {
      setIsProcessingLogo(true);
      const { dataUrl, extractedColor } = await compressAndResizeImage(file, 300, 300);
      setSeller((prev) => ({
        ...prev,
        logoDataUrl: dataUrl,
        primaryColor: prev.primaryColor === '#0F172A' ? extractedColor : prev.primaryColor,
      }));
    } catch (err) {
      console.error('Onboarding logo upload error:', err);
      setError('تعذر معالجة وتصغير الصورة. يرجى تجربة صورة أخرى.');
    } finally {
      setIsProcessingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (!seller.arabicName?.trim()) {
      setError('يرجى إدخال اسم المنشأة أو الشركة بالعربية للمتابعة.');
      return;
    }
    if (!seller.taxNumber?.trim()) {
      setError('يرجى إدخال الرقم الضريبي للمنشأة (15 رقماً).');
      return;
    }
    setStep(2);
  };

  const handleFinish = () => {
    setError(null);
    if (!seller.arabicName?.trim() || !seller.taxNumber?.trim()) {
      setError('يرجى التأكد من استكمال اسم المنشأة والرقم الضريبي.');
      setStep(1);
      return;
    }
    onComplete(seller);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div
          style={{ backgroundColor: primaryColor }}
          className="text-white p-6 sm:p-7 relative overflow-hidden shrink-0"
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>إعداد المنشأة والتهيئة الأولى (InvoCore SaaS Onboarding)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                مرحبًا بك في منصة InvoCore للفوترة الذكية
              </h2>
              <p className="text-xs text-slate-300">
                قم بتهيئة بيانات منشأتك وشعارك المعتمد في منصة InvoCore لتوليد فواتير وسندات ضريبية متوافقة مع هيئة الزكاة (ZATCA).
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-amber-300" />
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/15 text-xs font-bold">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                step === 1 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
              <span>بيانات المنشأة والضرائب</span>
            </div>
            <span className="text-white/40">←</span>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                step === 2 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
              <span>الشعار والهوية والقالب</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  اسم المنشأة أو الشركة بالعربية *
                </label>
                <input
                  type="text"
                  value={seller.arabicName}
                  onChange={(e) => setSeller({ ...seller, arabicName: e.target.value })}
                  placeholder="مثال: شركة نوفاكور للتقنية الذكية"
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3.5 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الرسمي بالإنجليزية (Company Legal Name)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={seller.englishName}
                  onChange={(e) => setSeller({ ...seller, englishName: e.target.value })}
                  placeholder="e.g. NovaCore Technologies Ltd."
                  className="w-full text-xs font-bold text-right border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم السجل التجاري (CR)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={seller.crNumber}
                    onChange={(e) => setSeller({ ...seller, crNumber: e.target.value })}
                    placeholder="1010XXXXXX"
                    className="w-full text-xs font-black text-right num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    الرقم الضريبي (ZATCA VAT - 15 رقماً) *
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={seller.taxNumber}
                    onChange={(e) => setSeller({ ...seller, taxNumber: e.target.value })}
                    placeholder="300XXXXXXXXX003"
                    className="w-full text-xs font-black text-right num-tabular border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان والمقر الرئيسي
                </label>
                <input
                  type="text"
                  value={seller.address}
                  onChange={(e) => setSeller({ ...seller, address: e.target.value })}
                  placeholder="المملكة العربية السعودية - الرياض"
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>شعار المنشأة (Custom Logo)</span>
                </label>

                {isProcessingLogo ? (
                  <div className="flex items-center justify-center gap-2 border-2 border-dashed border-amber-400 rounded-xl p-4 bg-amber-50/50">
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-700">جاري ضغط ومعالجة الشعار...</span>
                  </div>
                ) : seller.logoDataUrl ? (
                  <div className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <img
                      src={seller.logoDataUrl}
                      alt="Logo"
                      className="max-h-16 max-w-28 object-contain bg-white rounded border p-1"
                    />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>تم تحميل الشعار بنجاح</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-slate-600 underline cursor-pointer"
                      >
                        تغيير الشعار
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/20 rounded-xl p-4 text-center cursor-pointer transition-all space-y-1"
                  >
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-700">انقر هنا لرفع الشعار الرسمي</div>
                    <div className="text-[10px] text-slate-400">PNG, JPG, SVG (اختياري - يمكنك تجاوزه)</div>
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

              {/* Brand Color Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-500" />
                  <span>لون الهوية الرسمي (Brand Color)</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {BRAND_COLOR_PRESETS.map((p) => {
                    const isSelected = primaryColor.toLowerCase() === p.hex.toLowerCase();
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setSeller({ ...seller, primaryColor: p.hex, accentColor: p.accent })}
                        style={{ backgroundColor: p.hex }}
                        className={`h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-xs ${
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

              {/* Template Style */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-slate-500" />
                  <span>نمط هيكل الفاتورة (Template Style)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TEMPLATE_STYLES.map((style) => {
                    const isSelected = activeStyle === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => setSeller({ ...seller, templateStyle: style.id })}
                        style={
                          isSelected
                            ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                            : undefined
                        }
                        className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                          isSelected ? 'border-amber-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900 flex items-center justify-between mb-1">
                          <span>{style.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          {style.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg cursor-pointer"
            >
              ← السابق (البيانات)
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium">
              الخطوة 1 من 2
            </div>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              style={{ backgroundColor: primaryColor }}
              className="text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>التالي (الهوية والقالب)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>إطلاق منصة InvoCore وبدء الفوترة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
