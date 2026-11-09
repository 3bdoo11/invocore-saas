import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Layout,
  Link2,
  Mail,
  MessageSquare,
  Palette,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { TaxJurisdiction, TemplateStyle } from '../types/invoice';

interface ProspectLinkGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  onApplyLocally?: (config: {
    prospect: string;
    market: TaxJurisdiction;
    lang: 'ar' | 'en';
    template: TemplateStyle;
    color: string;
  }) => void;
}

const BRAND_COLOR_PRESETS = [
  { hex: '#0F172A', labelAr: 'كحلي تنفيذي', labelEn: 'Executive Navy' },
  { hex: '#0D9488', labelAr: 'تيل عصري', labelEn: 'Modern Teal' },
  { hex: '#1E3A8A', labelAr: 'أزرق ملكي', labelEn: 'Royal Blue' },
  { hex: '#065F46', labelAr: 'أخضر زمردي', labelEn: 'Emerald Green' },
  { hex: '#7C2D12', labelAr: 'برونزي رسمي', labelEn: 'Corporate Bronze' },
  { hex: '#312E81', labelAr: 'نيلي رقمي', labelEn: 'Deep Indigo' },
  { hex: '#881337', labelAr: 'عنابي فاخر', labelEn: 'Burgundy' },
  { hex: '#18181B', labelAr: 'أسود سويسري', labelEn: 'Swiss Monochrome' },
];

const MARKET_OPTIONS: Array<{
  code: TaxJurisdiction;
  labelAr: string;
  labelEn: string;
  subAr: string;
  subEn: string;
}> = [
  {
    code: 'KSA',
    labelAr: 'السعودية (KSA)',
    labelEn: 'Saudi Arabia (KSA)',
    subAr: 'SAR • ضريبة 15% • ZATCA',
    subEn: 'SAR • 15% VAT • ZATCA',
  },
  {
    code: 'EGY',
    labelAr: 'مصر (EGY)',
    labelEn: 'Egypt (EGY)',
    subAr: 'EGP • ضريبة 14% • ETA',
    subEn: 'EGP • 14% VAT • ETA',
  },
  {
    code: 'USA',
    labelAr: 'أمريكا (USA)',
    labelEn: 'United States (USA)',
    subAr: 'USD • Sales Tax 8%',
    subEn: 'USD • 8% Sales Tax',
  },
  {
    code: 'EU',
    labelAr: 'أوروبا (EU)',
    labelEn: 'European Union (EU)',
    subAr: 'EUR • ضريبة 20% • EU VAT',
    subEn: 'EUR • 20% VAT • EN 16931',
  },
];

const TEMPLATE_OPTIONS: Array<{
  id: 'modern' | 'classic' | 'minimal';
  styleValue: TemplateStyle;
  labelAr: string;
  labelEn: string;
}> = [
  {
    id: 'modern',
    styleValue: 'modern',
    labelAr: 'عصري تنفيذي (Modern)',
    labelEn: 'Executive Modern',
  },
  {
    id: 'classic',
    styleValue: 'classic',
    labelAr: 'كلاسيكي شبكي (Classic)',
    labelEn: 'Classic Ledger Grid',
  },
  {
    id: 'minimal',
    styleValue: 'minimalist',
    labelAr: 'سويسري مبسط (Minimal)',
    labelEn: 'Swiss Minimalist',
  },
];

export const ProspectLinkGenerator: React.FC<ProspectLinkGeneratorProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  onApplyLocally,
}) => {
  const isAr = lang === 'ar';

  const [prospectName, setProspectName] = useState<string>('شركة الأفق للمقاولات والتوريدات');
  const [targetMarket, setTargetMarket] = useState<TaxJurisdiction>('KSA');
  const [targetLang, setTargetLang] = useState<'ar' | 'en'>('ar');
  const [targetTemplate, setTargetTemplate] = useState<'modern' | 'classic' | 'minimal'>('modern');
  const [brandColor, setBrandColor] = useState<string>('#0F172A');

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedArPitch, setCopiedArPitch] = useState(false);
  const [copiedEnPitch, setCopiedEnPitch] = useState(false);

  const cleanCompanyName = prospectName.trim() || (targetLang === 'ar' ? 'شركة الأفق للمقاولات' : 'Horizon Contracting Ltd.');

  const generatedDemoUrl = useMemo(() => {
    const baseUrl = 'https://invocore-saas.vercel.app/';
    const params = new URLSearchParams();
    params.set('prospect', cleanCompanyName);
    params.set('market', targetMarket);
    params.set('lang', targetLang);
    params.set('template', targetTemplate);
    params.set('color', brandColor.replace('#', ''));
    return `${baseUrl}?${params.toString()}`;
  }, [cleanCompanyName, targetMarket, targetLang, targetTemplate, brandColor]);

  const arabicPitch = useMemo(() => {
    const marketName =
      targetMarket === 'KSA'
        ? 'المملكة العربية السعودية (متوافق مع هيئة الزكاة والضريبة والجمارك ZATCA)'
        : targetMarket === 'EGY'
        ? 'جمهورية مصر العربية (متوافق مع الفاتورة الإلكترونية المصرية ETA)'
        : targetMarket === 'USA'
        ? 'السوق الأمريكي (US Sales Tax)'
        : 'الاتحاد الأوروبي (EU VAT)';

    return `مرحباً فريق عمل "${cleanCompanyName}" الكرام،

لقد قمت بتجهيز نسخة عرض حيّة (Live Interactive Preview) من نظام الفوترة الإلكترونية وسندات القبض مخصصة باسم "${cleanCompanyName}" ومضبوطة مسبقاً لمعايير ${marketName}.

يمكنكم تجربة إصدار الفواتير الضريبية وسندات القبض ومعاينة الهوية البصرية الخاصة بكم مباشرة عبر الرابط التالي (دون الحاجة لتسجيل حساب):
${generatedDemoUrl}

النظام يدعم العمل السحابي عبر كافة الأجهزة (كمبيوتر، تابلت، جوال)، استيراد قوائم الأصناف من Excel، ومشاركة الفواتير بروابط ذكية فورية، مع إمكانية تفعيل نسخة خاصة كاملة (White-Label) تحت النطاق والشعار الرسمي لمنشأتكم.

يسعدني تواصلكم لتفعيل النسخة الكاملة أو تخصيصها وفق احتياجاتكم المحاسبية.

مع خالص التحية،
م. عبد الله محمد
مهندس برمجيات ومطور أنظمة الأعمال (B2B SaaS)
معرض الأعمال: https://abdallah-portfolio-the.vercel.app
واتساب: https://wa.me/201062075574`;
  }, [cleanCompanyName, targetMarket, generatedDemoUrl]);

  const englishPitch = useMemo(() => {
    const marketName =
      targetMarket === 'KSA'
        ? 'KSA ZATCA Phase-2 VAT (15% SAR)'
        : targetMarket === 'EGY'
        ? 'Egypt ETA VAT (14% EGP)'
        : targetMarket === 'USA'
        ? 'US Commercial Sales Tax (USD)'
        : 'European Union EN 16931 VAT (EUR)';

    return `Hi ${cleanCompanyName} Team,

I have prepared a personalized live interactive preview of our B2B E-Invoicing & Receipt Voucher platform pre-configured with "${cleanCompanyName}" branding and ${marketName} compliance.

You can test generating tax invoices, official receipt vouchers, and instant QR verification links directly in your browser (zero login required):
${generatedDemoUrl}

Key capabilities available for ${cleanCompanyName}:
• Instant A4 PDF Tax Invoices & Official Receipt Vouchers with 3 architectural templates
• Multi-device Cloud & Excel Catalog synchronization across Desktop, Tablet, and Mobile
• Full White-Label Enterprise Deployment option under your own corporate domain & brand identity

Feel free to reply here or reach out directly if you'd like to activate a full company license or customize the platform for your workflow.

Best regards,
Abdallah Mohamed
B2B SaaS & Full-Stack Software Engineer
Portfolio: https://abdallah-portfolio-the.vercel.app
WhatsApp: https://wa.me/201062075574`;
  }, [cleanCompanyName, targetMarket, generatedDemoUrl]);

  if (!isOpen) return null;

  const handleCopyText = async (
    text: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Executive Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr
                    ? 'مولد روابط العروض المخصصة للعملاء (Outreach Link Builder)'
                    : 'B2B Prospect Demo Link Generator'}
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md">
                  Shift + Alt + D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'أنشئ رابط تجربة فوري باسم شركة العميل المستهدف مع رسالة جاهزة للإرسال عبر LinkedIn أو البريد أو واتساب'
                  : 'Generate a personalized zero-friction demo link and outreach pitch for any B2B prospect in 1 click'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/60">
          {/* Step 1: Configuration Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
            {/* Prospect Company Name */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>
                  {isAr
                    ? 'اسم الشركة / العميل المستهدف (Prospect Company Name)'
                    : 'Prospect Company Name (Arabic or English)'}
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: شركة الأفق للمقاولات / Horizon Contracting Ltd.'
                      : 'e.g., Horizon Contracting Ltd. / شركة الأفق للمقاولات'
                  }
                  className="flex-1 bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition-all"
                />
                {onApplyLocally && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyLocally({
                        prospect: cleanCompanyName,
                        market: targetMarket,
                        lang: targetLang,
                        template:
                          targetTemplate === 'minimal'
                            ? 'minimalist'
                            : targetTemplate,
                        color: brandColor,
                      });
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'معاينة فورية هنا' : 'Preview Here Now'}</span>
                  </button>
                )}
              </div>
              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { name: 'شركة الأفق للمقاولات والتوريدات', m: 'KSA' as TaxJurisdiction, l: 'ar' as const },
                  { name: 'مجموعة النيل للتجارة والتوزيع', m: 'EGY' as TaxJurisdiction, l: 'ar' as const },
                  { name: 'Apex Global Logistics LLC', m: 'USA' as TaxJurisdiction, l: 'en' as const },
                  { name: 'Nordic Tech Solutions GmbH', m: 'EU' as TaxJurisdiction, l: 'en' as const },
                ].map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      setProspectName(sample.name);
                      setTargetMarket(sample.m);
                      setTargetLang(sample.l);
                    }}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    {sample.name} ({sample.m})
                  </button>
                ))}
              </div>
            </div>

            {/* Target Market Jurisdiction (4-Grid) */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>
                  {isAr
                    ? 'السوق الضريبي والعملة الافتراضية (Target Market)'
                    : 'Target Market & Tax Compliance'}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {MARKET_OPTIONS.map((m) => {
                  const active = targetMarket === m.code;
                  return (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => {
                        setTargetMarket(m.code);
                        if (m.code === 'USA' || m.code === 'EU') {
                          setTargetLang('en');
                        } else {
                          setTargetLang('ar');
                        }
                      }}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="text-xs font-black">
                        {isAr ? m.labelAr : m.labelEn}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 font-mono ${
                          active ? 'text-teal-300' : 'text-slate-500'
                        }`}
                      >
                        {isAr ? m.subAr : m.subEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language + Template + Brand Color */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Default UI Language */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  {isAr ? 'لغة الواجهة والوثيقة (Language)' : 'Default Language'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetLang('ar')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      targetLang === 'ar'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    العربية (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLang('en')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      targetLang === 'en'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    English (LTR)
                  </button>
                </div>
              </div>

              {/* Default Template */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1">
                  <Layout className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'القالب المعماري (Template)' : 'Default Template'}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TEMPLATE_OPTIONS.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTargetTemplate(tpl.id)}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer truncate ${
                        targetTemplate === tpl.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tpl.id === 'modern'
                        ? isAr
                          ? 'عصري'
                          : 'Modern'
                        : tpl.id === 'classic'
                        ? isAr
                          ? 'كلاسيكي'
                          : 'Classic'
                        : isAr
                        ? 'مبسط'
                        : 'Minimal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Color Preset */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'لون الهوية (Brand Color)' : 'Brand Accent Color'}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BRAND_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setBrandColor(preset.hex)}
                      title={isAr ? preset.labelAr : preset.labelEn}
                      style={{ backgroundColor: preset.hex }}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                        brandColor.toUpperCase() === preset.hex.toUpperCase()
                          ? 'border-teal-400 scale-110 ring-2 ring-slate-900'
                          : 'border-white shadow-xs hover:scale-105'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Generated Custom Demo URL */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                <Link2 className="w-4 h-4" />
                <span>
                  {isAr
                    ? '1. رابط العرض المخصص الجاهز للإرسال (Custom Prospect Demo URL)'
                    : '1. Generated Custom Prospect Demo URL'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={generatedDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isAr ? 'فتح الرابط في تبويب جديد' : 'Open Link'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyText(generatedDemoUrl, setCopiedUrl)}
                  className="inline-flex items-center gap-1.5 text-xs font-black bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isAr ? 'تم نسخ الرابط!' : 'Copied URL!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{isAr ? 'نسخ رابط العميل' : 'Copy Custom Demo URL'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              dir="ltr"
              className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-teal-300 break-all select-all"
            >
              {generatedDemoUrl}
            </div>
          </div>

          {/* Step 3: Ready-to-Send LinkedIn / Email Pitches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Arabic Outreach Pitch */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <span>رسالة عرض جاهزة (عربي - LinkedIn / WhatsApp / Email)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(arabicPitch, setCopiedArPitch)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  {copiedArPitch ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-teal-400" />
                      <span>نسخ الرسالة العربية</span>
                    </>
                  )}
                </button>
              </div>
              <pre
                dir="rtl"
                className="text-[11.5px] leading-relaxed text-slate-700 font-sans whitespace-pre-wrap bg-slate-50 border border-slate-200/80 rounded-lg p-3 max-h-60 overflow-y-auto select-all"
              >
                {arabicPitch}
              </pre>
            </div>

            {/* English Outreach Pitch */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5" dir="ltr">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <Mail className="w-4 h-4 text-teal-600" />
                  <span>Ready-to-Send Pitch (English - LinkedIn / Email)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(englishPitch, setCopiedEnPitch)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  {copiedEnPitch ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-teal-400" />
                      <span>Copy English Pitch</span>
                    </>
                  )}
                </button>
              </div>
              <pre
                dir="ltr"
                className="text-[11.5px] leading-relaxed text-slate-700 font-sans whitespace-pre-wrap bg-slate-50 border border-slate-200/80 rounded-lg p-3 max-h-60 overflow-y-auto select-all text-left"
              >
                {englishPitch}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            {isAr
              ? 'نصيحة: يمكنك فتح هذه النافذة في أي وقت بالضغط على Shift + Alt + D'
              : 'Tip: Press Shift + Alt + D anytime to open the Prospect Link Builder'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
