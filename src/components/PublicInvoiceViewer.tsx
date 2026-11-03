import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageCircle,
  Printer,
} from 'lucide-react';
import { InvoiceData, SellerInfo } from '../types/invoice';
import {
  DEFAULT_APP_TITLE,
  paginateInvoiceItems,
  sanitizeDocumentTitleForPrint,
  triggerSafePrint,
  triggerWhatsAppInvoiceShare,
} from '../utils/formatters';
import { encodePublicInvoiceUrl } from '../utils/zatcaQr';
import { UniversalInvoice } from './UniversalInvoice';

interface PublicInvoiceViewerProps {
  decodedData: { invoice: InvoiceData; seller: SellerInfo } | null;
}

const A4_WIDTH_PX = 794; // 210mm at 96dpi

export const PublicInvoiceViewer: React.FC<PublicInvoiceViewerProps> = ({
  decodedData,
}) => {
  const [scale, setScale] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      if (vw < A4_WIDTH_PX + 32) {
        const nextScale = Math.max(0.38, (vw - 24) / A4_WIDTH_PX);
        setScale(nextScale);
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    document.title = DEFAULT_APP_TITLE;
    if (!decodedData) return;

    const safeTitle = sanitizeDocumentTitleForPrint(
      decodedData.invoice.invoiceNumber,
      'Invoice'
    );

    const handleBeforePrint = () => {
      document.title = safeTitle;
    };
    const handleAfterPrint = () => {
      document.title = DEFAULT_APP_TITLE;
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.title = DEFAULT_APP_TITLE;
    };
  }, [decodedData]);

  const totalPages = useMemo(() => {
    if (!decodedData) return 1;
    return paginateInvoiceItems(decodedData.invoice.items).length;
  }, [decodedData]);

  if (!decodedData) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center p-6"
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-[#B45309] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-extrabold text-[#0F172A]">
            رابط الفاتورة غير صالح أو غير مكتمل
          </h1>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            تعذر قراءة بيانات الفاتورة الضريبية من الرابط الممسوح. يرجى التأكد من
            مسح رمز الاستجابة السريعة (QR) كاملًا من أصل الفاتورة.
          </p>
        </div>
      </div>
    );
  }

  const { invoice, seller } = decodedData;

  return (
    <>
      {/* Screen Interactive Client Viewer */}
      <div
        dir="rtl"
        className="no-print min-h-screen bg-slate-200/80 flex flex-col"
      >
        <header className="sticky top-0 z-40 bg-[#0F172A] text-white border-b-2 border-[#B45309] shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-sm">
                <Layers className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-white leading-tight">
                    Invo<span className="text-amber-400">Core</span>
                  </span>
                  <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                    إنفو كور
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-200">
                    {seller.arabicName || 'منصة InvoCore'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-semibold num-tabular">
                  نسخة إلكترونية معتمدة — فاتورة ضريبية رقم #{invoice.invoiceNumber}{' '}
                  ({totalPages} {totalPages === 1 ? 'صفحة' : 'صفحات'})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((prev) => (prev === 'all' ? 'single' : 'all'))
                  }
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {viewMode === 'all'
                      ? 'عرض صفحة بصفحة'
                      : 'عرض كل الصفحات تحت بعض'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const shareUrl = encodePublicInvoiceUrl(invoice, seller);
                  triggerWhatsAppInvoiceShare(
                    invoice,
                    seller.arabicName,
                    shareUrl
                  );
                }}
                className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1DA851] text-slate-950 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>مشاركة واتساب</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerSafePrint(invoice.invoiceNumber, 'Invoice')
                }
                className="inline-flex items-center gap-2 bg-[#B45309] hover:bg-[#D97706] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>تحميل الفاتورة PDF / طباعة</span>
              </button>
            </div>
          </div>
        </header>

        {/* Multi-Page Navigation Bar if Single Page Mode */}
        {totalPages > 1 && viewMode === 'single' && (
          <div className="bg-white border-b border-slate-200 py-2 px-4 flex items-center justify-center gap-3 shadow-sm">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <span className="text-xs font-extrabold text-[#0F172A] num-tabular">
              صفحة {activePage} من {totalPages}
            </span>
            <button
              type="button"
              disabled={activePage >= totalPages}
              onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 py-6 sm:py-8 px-3 flex justify-center overflow-x-hidden">
          <div
            className="origin-top transition-transform duration-150"
            style={
              scale < 1
                ? {
                    transform: `scale(${scale})`,
                    marginBottom: `${
                      -(1 - scale) *
                      1122 *
                      (viewMode === 'all' ? totalPages : 1)
                    }px`,
                  }
                : undefined
            }
          >
            <UniversalInvoice
              invoice={invoice}
              seller={seller}
              activePage={activePage}
              viewMode={viewMode}
              renderAllPages={false}
            />
          </div>
        </main>

        {/* Global Footer */}
        <footer className="no-print bg-[#0F172A] border-t border-slate-800 text-slate-400 text-xs py-3 px-4 shrink-0 mt-auto">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">InvoCore</span>
              <span className="text-slate-600">|</span>
              <span>منصة الفوترة الإلكترونية الذكية للمنشآت (B2B)</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]" dir="ltr">
              © 2026 InvoCore. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* Dedicated Top-Level Print Mount (Renders ALL Pages Sequentially on Print) */}
      <div className="hidden print:block">
        <UniversalInvoice
          invoice={invoice}
          seller={seller}
          renderAllPages={true}
        />
      </div>
    </>
  );
};
