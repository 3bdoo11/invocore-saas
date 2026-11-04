import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  ExternalLink,
  Mail,
  MessageCircle,
  ShieldAlert,
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
}

export const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  invoicesGenerated,
  maxInvoices,
  userEmail,
  isHardBlocked = false,
}) => {
  if (!isOpen) return null;

  const handleContactWhatsApp = () => {
    logActivity('UPGRADE_CLICK', { method: 'whatsapp', invoicesGenerated });
    const text = encodeURIComponent(
      `مرحبًا م. عبد الله، أود ترقية حساب InvoCore (${userEmail || 'حساب تجريبي'}) إلى باقة PRO غير المحدودة لتفعيل التصدير الضريبي وإزالة العلامة المائية.`
    );
    window.open(`https://wa.me/201096275876?text=${text}`, '_blank');
  };

  const handleContactEmail = () => {
    logActivity('UPGRADE_CLICK', { method: 'email', invoicesGenerated });
    const subject = encodeURIComponent('InvoCore PRO Upgrade Request');
    const body = encodeURIComponent(
      `Hello Abdallah,\n\nI would like to upgrade my InvoCore SaaS account (${userEmail || 'Trial User'}) to the PRO tier to unlock unlimited invoices and remove all watermarks.\n\nThank you!`
    );
    window.open(`mailto:abdallahmohamedama12@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-900 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-[#1E293B] text-white p-6 relative overflow-hidden shrink-0 border-b-2 border-amber-500">
          {!isHardBlocked && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>الترقية إلى الباقة الاحترافية (InvoCore PRO)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {invoicesGenerated >= maxInvoices
                  ? 'تم استهلاك رصيد الفواتير التجريبية بالكامل'
                  : 'ترقية حسابك وإزالة العلامة المائية'}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-right flex-1">
          {invoicesGenerated >= maxInvoices ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-black">
                  لقد أصدرت {invoicesGenerated} من أصل {maxInvoices} فواتير تجريبية مسموحة.
                </p>
                <p className="font-medium text-amber-800 leading-relaxed">
                  لحماية النظام وتفادي سوء الاستخدام، تم إيقاف تصدير الفواتير الجديدة في هذا الحساب. يمكنك التواصل الفوري مع المطور لتفعيل ترخيص PRO الدائم.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 font-medium">
              حسابك الحالي في الوضع التجريبي (متبقي لديك {Math.max(0, maxInvoices - invoicesGenerated)} فواتير). بادر بالترقية للاستمتاع بجميع ميزات الفوترة المؤسسية غير المحدودة.
            </div>
          )}

          {/* Feature Matrix */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-black text-slate-800 border-b border-slate-200 flex items-center justify-between">
              <span>مقارنة باقة التجربة مع باقة InvoCore PRO</span>
              <span className="text-[10px] text-amber-600 font-bold">ترخيص تجاري معتمد</span>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold">عدد الفواتير وسندات القبض:</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> غير محدود دائمًا
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold">العلامة المائية التجريبية:</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> إزالة كاملة للعلامة المائية
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold">تخصيص الهوية والشعار والألوان:</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> مفتوح بالكامل لجميع الشركات
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold">تصدير واستيراد قواعد بيانات Excel:</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> دعم شامل وسريع
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold">تشفير ZATCA Phase-2 QR:</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> متوافق ومعتمد محليًا
                </span>
              </div>
            </div>
          </div>

          {/* Direct Upgrade Contacts */}
          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-black text-slate-900">
              تواصل مع المطور (Abdallah Mohamed) لتفعيل الحساب فورًا:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleContactWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل عبر واتساب فوراً</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={handleContactEmail}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer border border-slate-700"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span>إرسال بريد إلكتروني</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-center text-slate-500 font-semibold border-t border-slate-100 pt-3">
            المطور: <strong className="text-slate-800">Abdallah Mohamed</strong> • هاتف/واتساب:{' '}
            <span className="font-mono text-slate-800 dir-ltr" dir="ltr">+20 109 627 5876</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>حماية تجارية ضد الاستخدام العشوائي</span>
          </div>

          {!isHardBlocked && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
