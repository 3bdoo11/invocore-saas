import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, Sparkles } from 'lucide-react';

interface HandoverLockScreenProps {
  onUnlock: () => void;
}

const MASTER_ACTIVATION_CODE = 'SAQR2026';

export const HandoverLockScreen: React.FC<HandoverLockScreenProps> = ({ onUnlock }) => {
  const [activationCode, setActivationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = activationCode.trim();
    if (!trimmed) {
      setErrorMessage('يرجى إدخال رمز التفعيل أولاً.');
      return;
    }

    setIsSubmitting(true);

    // Strict master code check (case-insensitive for convenience)
    if (trimmed.toUpperCase() === MASTER_ACTIVATION_CODE) {
      // Correct master code
      onUnlock();
    } else {
      setIsSubmitting(false);
      setErrorMessage(
        'رمز التفعيل غير صحيح — يرجى التواصل مع مطور النظام لإتمام التسليم النهائي.'
      );
    }
  };

  return (
    <>
      {/* Screen Presentation (Hidden during print or printed gracefully) */}
      <div
        dir="rtl"
        className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950 font-sans print:hidden"
      >
        {/* Ambient Gold & Navy Glow Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -top-20 -right-20 absolute" />
          <div className="w-[500px] h-[500px] bg-blue-900/15 rounded-full blur-[140px] -bottom-20 -left-20 absolute" />
        </div>

        {/* Executive Lock Card */}
        <div className="relative w-full max-w-lg bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
          {/* Top Gold Security Badge Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border-2 border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <ShieldCheck className="w-10 h-10 text-amber-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1.5 rounded-lg shadow-md">
                <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Titles & Status Badge */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              منصة صقر للفوترة الإلكترونية الموحدة
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>النظام في وضع المعاينة قبل التسليم النهائي</span>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed max-w-md mx-auto pt-1 font-medium">
              تم اكتمال بناء وتجهيز النظام بالكامل (8 شركات معتمدة، نظام سندات القبض، واستيراد/تصدير الإكسل). يرجى إدخال رمز التفعيل النهائي لتسليم وتشغيل المنصة.
            </p>
          </div>

          {/* Form Action */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                dir="ltr"
                value={activationCode}
                onChange={(e) => {
                  setActivationCode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="أدخل رمز التفعيل النهائي..."
                autoFocus
                autoComplete="off"
                className="w-full text-center text-sm sm:text-base font-black tracking-widest text-white bg-slate-950/80 border-2 border-slate-700 rounded-xl px-4 py-3 placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-sm py-3 px-5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              تفعيل وتشغيل النظام
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>منظومة صقر للإصدار والفوترة الضريبية</span>
            <span dir="ltr" className="font-mono text-slate-600">v1.0 • 2026</span>
          </div>
        </div>
      </div>

      {/* Print Protection: If user attempts Ctrl+P while locked, print only this secure notice */}
      <div
        dir="rtl"
        className="hidden print:flex min-h-screen flex-col items-center justify-center text-center p-8 bg-white text-slate-900"
      >
        <div className="border-4 border-slate-900 p-8 max-w-lg space-y-4">
          <h2 className="text-xl font-black">منصة صقر للفوترة الإلكترونية الموحدة</h2>
          <div className="text-sm font-bold text-slate-700">
            تنبيه: النظام في وضع المعاينة قبل التسليم النهائي ولا يمكن الطباعة أو تصدير المستندات إلا بعد التفعيل.
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-300">
            يرجى إدخال رمز التفعيل النهائي في نافذة المنصة لتمكين الطباعة والمشاركة.
          </div>
        </div>
      </div>
    </>
  );
};
