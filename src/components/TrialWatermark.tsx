import React from 'react';

interface TrialWatermarkProps {
  className?: string;
}

export const TrialWatermark: React.FC<TrialWatermarkProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden p-4 ${className}`}
    >
      <div className="transform -rotate-[30deg] text-center opacity-25 print:opacity-30 border-4 border-dashed border-rose-600 bg-rose-50/50 p-6 rounded-3xl max-w-xl shadow-sm">
        <div className="text-[11px] font-black tracking-widest text-rose-900 uppercase mb-1">
          INVOCORE.SAAS • COMMERCIAL EVALUATION
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-700 tracking-wider uppercase leading-snug">
          TRIAL PREVIEW — NOT VALID FOR OFFICIAL TAX USE — INVOCORE.SAAS
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-800 mt-1">
          نسخة تجريبية للعرض فقط
        </div>
        <div className="text-[10px] font-extrabold text-rose-700 tracking-widest uppercase mt-2.5 border-t border-rose-300 pt-1.5">
          UPGRADE TO PRO TO UNLOCK OFFICIAL ZATCA EXPORTS & REMOVE WATERMARK
        </div>
      </div>
    </div>
  );
};
