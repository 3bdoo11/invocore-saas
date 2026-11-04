import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  MessageCircle,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { InvoiceData, SellerInfo } from '../types/invoice';
import { exportInvoicesHistoryToExcel } from '../utils/excelCatalog';
import {
  calculateInvoiceTotals,
  formatMoney,
  normalizeArabic,
  triggerWhatsAppInvoiceShare,
} from '../utils/formatters';
import { encodePublicInvoiceUrl } from '../utils/zatcaQr';

interface InvoicesHistoryTabProps {
  invoices: InvoiceData[];
  activeInvoiceId: string;
  seller: SellerInfo;
  onSelectInvoice: (invoice: InvoiceData) => void;
  onPrintInvoice: (invoice: InvoiceData) => void;
  onDeleteInvoice: (id: string) => void;
  onExportExcel?: () => void;
}

export const InvoicesHistoryTab: React.FC<InvoicesHistoryTabProps> = ({
  invoices,
  activeInvoiceId,
  seller,
  onSelectInvoice,
  onPrintInvoice,
  onDeleteInvoice,
  onExportExcel,
}) => {
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        normalizeArabic(inv.client.name).includes(q) ||
        inv.client.taxNumber.includes(q)
    );
  }, [invoices, query]);

  const totalVolume = useMemo(() => {
    return invoices.reduce(
      (sum, inv) => sum + calculateInvoiceTotals(inv).finalTotal,
      0
    );
  }, [invoices]);

  const handleCopyClientLink = async (inv: InvoiceData) => {
    const invSeller = inv.sellerSnapshot || seller;
    const url = encodePublicInvoiceUrl(inv, invSeller);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary KPI Header */}
      <div className="bg-gradient-to-l from-[#0F172A] to-slate-800 text-white rounded-xl p-4 shadow-sm border-r-4 border-r-[#B45309] space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-extrabold">الأرشيف وسجل الفواتير</h3>
            </div>
            <span className="num-tabular text-xs font-bold bg-white/10 px-2.5 py-0.5 rounded-full text-amber-300">
              {invoices.length} فاتورة
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/10">
            <span className="text-slate-300">إجمالي الفواتير المصدرة:</span>
            <span className="num-tabular font-extrabold text-amber-400">
              {formatMoney(totalVolume)} ر.س
            </span>
          </div>
        </div>

        {/* Export Invoices History to Styled Corporate Excel Button */}
        <button
          type="button"
          disabled={invoices.length === 0}
          onClick={() => {
            if (onExportExcel) {
              onExportExcel();
            } else {
              exportInvoicesHistoryToExcel(invoices);
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-300" />
          <span>تصدير سجل الفواتير إلى إكسل (.xlsx)</span>
          <Download className="w-3.5 h-3.5 mr-auto opacity-80" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث برقم الفاتورة (#112463) أو اسم العميل..."
          className="w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-9 py-2.5 text-xs font-semibold focus:border-[#B45309] focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Saved Invoices List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-xs font-bold text-slate-500">
            {invoices.length === 0
              ? 'لا توجد فواتير محفوظة بعد. اضغط على "حفظ وإصدار الفاتورة" لحفظ أول فاتورة.'
              : 'لا توجد نتائج مطابقة لبحثك.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5">
          {filtered.map((inv) => {
            const totals = calculateInvoiceTotals(inv);
            const isSelected = inv.id === activeInvoiceId;
            return (
              <div
                key={inv.id}
                className={`bg-white border rounded-xl p-3.5 transition-all shadow-sm ${
                  isSelected
                    ? 'border-[#B45309] ring-2 ring-amber-500/15'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        dir="ltr"
                        className="num-tabular text-xs font-black bg-[#0F172A] text-white px-2 py-0.5 rounded"
                      >
                        #{inv.invoiceNumber}
                      </span>
                      <span className="text-[11px] font-bold bg-amber-50 text-[#92400E] border border-amber-200 px-2 py-0.5 rounded">
                        {inv.paymentMethod}
                      </span>
                      {isSelected && (
                        <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          معروضة حالياً
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 mt-1.5">
                      {inv.client.name || 'عميل غير محدد'}
                    </h4>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="num-tabular text-xs font-black text-[#0F172A]">
                      {formatMoney(totals.finalTotal)} ر.س
                    </div>
                    <div
                      dir="ltr"
                      className="num-tabular text-[10.5px] font-semibold text-slate-400 mt-0.5"
                    >
                      {inv.date} • {inv.time}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectInvoice(inv)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#B45309]" />
                      <span>عرض / تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrintInvoice(inv)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#0F172A] hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>طباعة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const invSeller = inv.sellerSnapshot || seller;
                        const url = encodePublicInvoiceUrl(inv, invSeller);
                        triggerWhatsAppInvoiceShare(
                          inv,
                          invSeller.arabicName,
                          url
                        );
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-[#25D366] hover:bg-[#1DA851] text-slate-950 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      title="مشاركة الفاتورة عبر واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>مشاركة واتساب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyClientLink(inv)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-[#92400E] border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      title="نسخ رابط عرض PDF للعميل"
                    >
                      {copiedId === inv.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>رابط العميل</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteInvoice(inv.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="حذف الفاتورة من السجل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
