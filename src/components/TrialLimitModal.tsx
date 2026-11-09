import React from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  Cloud,
  Crown,
  ExternalLink,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { logActivity } from '../lib/supabase';

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoicesGenerated: number;
  maxInvoices: number;
  userEmail?: string;
  isHardBlocked?: boolean;
  lang?: 'ar' | 'en';
  prospectName?: string | null;
}

export const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  invoicesGenerated,
  maxInvoices,
  userEmail,
  isHardBlocked = false,
  lang = 'ar',
  prospectName = null,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const companyRef = prospectName || userEmail || (isAr ? 'منشأة تجارية' : 'Corporate Client');

  const handleContactWhatsApp = (tier: 'pro_cloud' | 'white_label' = 'white_label') => {
    logActivity('UPGRADE_CLICK', { method: 'whatsapp', tier, invoicesGenerated, prospectName });
    const text = isAr
      ? encodeURIComponent(
          tier === 'white_label'
            ? `مرحباً م. عبد الله، نتواصل معك بخصوص تفعيل النسخة المؤسسية الكاملة (White-Label / Pro License) لنظام الفوترة الإلكترونية لصالح "${companyRef}". نرجو تزويدنا بتفاصيل التفعيل.`
            : `مرحباً م. عبد الله، أرغب في تفعيل باقة السحابة الاحترافية (InvoCore Pro Cloud) غير المحدودة لصالح "${companyRef}".`
        )
      : encodeURIComponent(
          tier === 'white_label'
            ? `Hello Abdallah, we are reaching out regarding activating a full White-Label / Enterprise License of InvoCore for "${companyRef}". Please share deployment and licensing details.`
            : `Hello Abdallah, I would like to activate the unlimited InvoCore Pro Cloud SaaS plan for "${companyRef}".`
        );
    window.open(`https://wa.me/201062075574?text=${text}`, '_blank');
  };

  const handleContactEmail = () => {
    logActivity('UPGRADE_CLICK', { method: 'email', invoicesGenerated, prospectName });
    const subject = encodeURIComponent(
      isAr
        ? `طلب ترخيص وتفعيل نظام الفوترة المؤسسي - ${companyRef}`
        : `InvoCore Enterprise / White-Label Licensing Inquiry - ${companyRef}`
    );
    const body = encodeURIComponent(
      isAr
        ? `مرحباً م. عبد الله محمد،\n\nنود الاستفسار عن تفعيل الترخيص الكامل لنظام الفوترة الإلكترونية وسندات القبض لصالح منشأتنا (${companyRef}).\n\nالخيار المطلوب:\n[ ] الحساب السحابي الاحترافي (Pro Cloud SaaS)\n[ ] النسخة المؤسسية الخاصة بالمنشأة (Custom White-Label Deployment)\n\nشكراً لك.`
        : `Hello Abdallah,\n\nWe would like to inquire about activating a commercial license of the InvoCore B2B E-Invoicing & Receipt Voucher platform for our organization (${companyRef}).\n\nInterested Option:\n[ ] Pro Cloud Account (Multi-Device SaaS)\n[ ] Custom White-Label Enterprise Deployment\n\nBest regards,`
    );
    window.open(`mailto:abdallahmohamedama12@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  const handleOpenPortfolio = () => {
    logActivity('UPGRADE_CLICK', { method: 'portfolio', invoicesGenerated, prospectName });
    window.open('https://abdallah-portfolio-the.vercel.app', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={!isHardBlocked ? onClose : undefined}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 selection:bg-teal-400 selection:text-slate-950 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Executive Header Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-[#1E293B] text-white px-6 py-5 relative overflow-hidden shrink-0 border-b border-slate-800">
          {!isHardBlocked && (
            <button
              type="button"
              onClick={onClose}
              className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-400/40 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>
                  {isAr
                    ? 'حلول الفوترة الإلكترونية المؤسسية وتراخيص المنشآت (B2B)'
                    : 'B2B Enterprise Licensing & White-Label Deployment'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                {prospectName
                  ? isAr
                    ? `تفعيل النظام الكامل لصالح ${prospectName}`
                    : `Activate Full Enterprise System for ${prospectName}`
                  : invoicesGenerated >= maxInvoices
                  ? isAr
                    ? 'تم استهلاك رصيد الفواتير التجريبية — اختر باقة منشأتك'
                    : 'Trial Quota Reached — Choose Your Corporate Plan'
                  : isAr
                  ? 'ترقية الحساب أو طلب نسخة خاصة كاملة بهوية منشأتك'
                  : 'Upgrade to Pro Cloud or Request Custom White-Label Deployment'}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Trial Status Notice */}
          {invoicesGenerated >= maxInvoices ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-0.5">
                <p className="font-black">
                  {isAr
                    ? `لقد أصدرت ${invoicesGenerated} من أصل ${maxInvoices} وثائق تجريبية مسموحة.`
                    : `You have generated ${invoicesGenerated} of ${maxInvoices} free trial documents.`}
                </p>
                <p className="font-medium text-amber-800">
                  {isAr
                    ? 'لتفعيل الإصدار غير المحدود وإزالة العلامة المائية نهائياً، اختر إحدى الباقات المؤسسية أدناه وتواصل معنا للتفعيل الفوري.'
                    : 'To unlock unlimited document generation and remove all trial watermarks, select one of the corporate options below.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 font-medium flex items-center justify-between gap-2 shadow-2xs">
              <span>
                {isAr
                  ? `أنت تتصفح النسخة التجريبية الحية (متبقي ${Math.max(0, maxInvoices - invoicesGenerated)} من ${maxInvoices} فواتير تجريبية).`
                  : `You are exploring the live preview (${Math.max(0, maxInvoices - invoicesGenerated)} of ${maxInvoices} trial documents remaining).`}
              </span>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200 shrink-0">
                {isAr ? 'جاهز للتشغيل الفوري' : 'Production Ready'}
              </span>
            </div>
          )}

          {/* Two B2B Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Pro Cloud Account (Multi-Device SaaS) */}
            <div className="bg-white border-2 border-slate-200 hover:border-slate-400 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                    <Cloud className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isAr ? 'الباقة السحابية الجاهزة' : 'Multi-Device SaaS'}</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {isAr ? 'تفعيل فوري' : 'Instant Setup'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isAr
                      ? 'حساب سحابي احترافي (Pro Cloud Account)'
                      : 'Pro Cloud Account (Multi-Device SaaS)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {isAr
                      ? 'مثالي للشركات والمؤسسات التي ترغب في بدء إصدار الفواتير وسندات القبض فوراً عبر السحابة.'
                      : 'Ideal for teams needing immediate, unlimited cloud invoicing and catalog sync across all devices.'}
                  </p>
                </div>

                <ul className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'إصدار غير محدود للفواتير الضريبية وسندات القبض (A4 PDF)'
                        : 'Unlimited tax invoices & official receipt vouchers (A4 PDF)'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'مزامنة سحابية فورية للأصناف والعملاء عبر الكمبيوتر والجوال والتابلت'
                        : 'Real-time Cloud & Excel catalog sync across PC, Mobile & Tablet'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'إزالة كاملة للعلامة المائية وتخصيص الشعار والألوان'
                        : 'Zero trial watermarks + custom company logo & brand colors'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'روابط مشاركة ذكية للعملاء مع رمز QR مشفر ومعتمد'
                        : 'Instant cryptographic QR verification & client share links'}
                    </span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleContactWhatsApp('pro_cloud')}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{isAr ? 'طلب تفعيل حساب Pro Cloud' : 'Request Pro Cloud Activation'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
              </button>
            </div>

            {/* Option 2: Custom White-Label Enterprise Deployment */}
            <div className="bg-slate-900 text-white border-2 border-teal-500/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>{isAr ? 'النسخة المؤسسية الخاصة' : 'Enterprise White-Label'}</span>
                  </span>
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                    {isAr ? 'الأكثر طلباً للشركات' : 'One-Time Setup'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">
                    {isAr
                      ? 'نسخة خاصة كاملة باسم منشأتك (White-Label Deployment)'
                      : 'Custom White-Label Enterprise Deployment'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isAr
                      ? 'امتلك النظام بالكامل تحت النطاق الرسمي لشركتك وبعلامتك التجارية المستقلة مع تخصيص كامل.'
                      : 'Full standalone deployment under your own corporate domain, brand identity, and custom workflow.'}
                  </p>
                </div>

                <ul className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'نشر مستقل بالكامل على نطاق شركتك الخاص (YourCompany.com)'
                        : 'Full deployment under your own company domain & private database'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'تصميم قوالب طباعة وفواتير وسندات مخصصة حسب طلب الإدارة المالية'
                        : 'Custom-tailored print templates, headers, and accounting fields'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'امتثال ضريبي متعدد الأسواق (السعودية ZATCA / مصر ETA / أمريكا / أوروبا)'
                        : 'Multi-market tax compliance (ZATCA KSA / Egypt ETA / US / EU VAT)'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? 'إعداد لمرة واحدة بدون رسوم اشتراك شهري متكررة لكل مستخدم'
                        : 'One-time enterprise setup with unlimited internal company users'}
                    </span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleContactWhatsApp('white_label')}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer relative z-10 shadow-md"
              >
                <span>
                  {isAr
                    ? 'اطلب عرض سعر النسخة الخاصة (White-Label)'
                    : 'Request White-Label Enterprise Quote'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Multi-Channel Direct Contact Actions (WhatsApp, Official Email, Portfolio Verification) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="text-xs font-black text-slate-900">
                {isAr
                  ? 'قنوات التواصل المباشر مع مهندس النظام (Abdallah Mohamed):'
                  : 'Direct Consultation & Engineering Verification Channels:'}
              </div>
              <span className="text-[11px] font-mono text-slate-500" dir="ltr">
                abdallahmohamedama12@gmail.com • +20 106 207 5574
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Direct WhatsApp Consultation */}
              <button
                type="button"
                onClick={() => handleContactWhatsApp('white_label')}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'استشارة فورية عبر واتساب' : 'WhatsApp Consultation'}</span>
                <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
              </button>

              {/* 2. Pre-filled Official Email */}
              <button
                type="button"
                onClick={handleContactEmail}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{isAr ? 'مراسلة عبر البريد الرسمي' : 'Send Official Email'}</span>
                <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
              </button>

              {/* 3. Developer Portfolio & Credentials Verification */}
              <button
                type="button"
                onClick={handleOpenPortfolio}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
              >
                <Award className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{isAr ? 'معرض الأعمال والاعتماد الهندسي' : 'Developer Portfolio'}</span>
                <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>
              {isAr
                ? 'نظام مؤسسي موثوق يدعم التخصيص الكامل والربط الضريبي'
                : 'Enterprise-grade B2B architecture with full white-label support'}
            </span>
          </div>

          {!isHardBlocked && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isAr ? 'إغلاق والعودة للمعاينة' : 'Close & Continue Preview'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
