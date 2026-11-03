import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, ExternalLink, MessageCircle, Monitor, X } from 'lucide-react';

interface ShareInvoiceModalProps {
  message: string;
  url: string;
  onClose: () => void;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  message,
  url,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(message);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0F172A] text-white px-5 py-3 flex items-center justify-between border-b-2 border-[#25D366]">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            <span>مشاركة الفاتورة عبر واتساب</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex justify-center">
            <div className="bg-white border border-slate-300 rounded-xl p-2">
              <QRCodeSVG
                value={url}
                size={220}
                level="L"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
          </div>
          <p className="text-[11px] text-center font-semibold text-slate-500">
            امسح الرمز بالجوال لفتح الفاتورة كاملة
          </p>

          <a
            href={`https://web.whatsapp.com/send?text=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-slate-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح واتساب ويب (WhatsApp Web)</span>
          </a>
          <a
            href={`whatsapp://send?text=${encoded}`}
            className="w-full flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
          >
            <Monitor className="w-4 h-4" />
            <span>فتح تطبيق واتساب للكمبيوتر</span>
          </a>
          <button
            type="button"
            onClick={copy}
            className="w-full flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-700" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? 'تم النسخ' : 'نسخ رسالة ورابط الفاتورة'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
