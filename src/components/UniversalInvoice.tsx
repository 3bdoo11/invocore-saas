import React, { useMemo } from 'react';
import { SafeQRCode } from './SafeQRCode';
import { InvoiceData, SellerInfo } from '../types/invoice';
import {
  calculateInvoiceTotals,
  formatMoney,
  formatQty,
  paginateInvoiceItems,
} from '../utils/formatters';
import { numberToArabicTafqeet } from '../utils/tafqeet';
import { numberToEnglishWords } from '../utils/numberToWordsEn';
import {
  encodePublicInvoiceUrl,
  generateZatcaQrBase64,
} from '../utils/zatcaQr';
import { TrialWatermark } from './TrialWatermark';

export interface UniversalInvoiceProps {
  invoice: InvoiceData;
  seller: SellerInfo;
  activePage?: number;
  viewMode?: 'single' | 'all';
  renderAllPages?: boolean;
  isWatermarked?: boolean;
  lang?: 'ar' | 'en';
}

export const UniversalInvoice: React.FC<UniversalInvoiceProps> = ({
  invoice,
  seller,
  activePage = 1,
  viewMode = 'single',
  renderAllPages = false,
  isWatermarked = false,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);

  const pages = useMemo(
    () => paginateInvoiceItems(invoice.items),
    [invoice.items]
  );

  const autoTafqeet = useMemo(() => {
    return isAr
      ? numberToArabicTafqeet(totals.finalTotal)
      : numberToEnglishWords(totals.finalTotal);
  }, [totals.finalTotal, isAr]);

  const displayedTafqeet =
    invoice.tafqeetManual && invoice.tafqeetManual.trim() !== ''
      ? invoice.tafqeetManual
      : autoTafqeet;

  const zatcaQrBase64 = useMemo(() => {
    return generateZatcaQrBase64({
      sellerName: seller.arabicName || seller.englishName || 'NovaCore Technologies',
      vatNumber: seller.taxNumber || '310987654300003',
      date: invoice.date,
      time: invoice.time,
      totalWithVat: totals.finalTotal,
      vatTotal: totals.vatAmount,
    });
  }, [seller, invoice, totals]);

  const publicUrl = useMemo(() => {
    return encodePublicInvoiceUrl(invoice, seller);
  }, [invoice, seller]);

  const primaryColor = seller.primaryColor || '#0F172A';
  const templateStyle = seller.templateStyle || 'modern';

  // Render Single Page or All Pages
  const pagesToRender = renderAllPages || viewMode === 'all'
    ? pages
    : [pages[Math.min(activePage - 1, pages.length - 1)] || pages[0]];

  return (
    <div className="universal-invoice-wrapper space-y-6 print:space-y-0">
      {pagesToRender.map((pageData, pIdx) => {
        const actualPageNo = renderAllPages || viewMode === 'all' ? pIdx + 1 : activePage;
        const totalPagesCount = pages.length;
        const isLastPage = actualPageNo === totalPagesCount;

        return (
          <div
            key={`page-${actualPageNo}`}
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              borderColor: primaryColor,
              fontFamily: seller.fontFamily || (isAr ? "'Tajawal', 'Cairo', sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
            }}
            className={`invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-7 ${
              templateStyle === 'classic'
                ? 'border-4 border-double'
                : templateStyle === 'modern'
                ? 'border-t-8 border-x border-b border-slate-200'
                : 'border border-slate-200'
            }`}
          >
            {isWatermarked && <TrialWatermark />}

            {/* ------------------------------------------------------------- */}
            {/* TOP HEADER SECTION                                            */}
            {/* ------------------------------------------------------------- */}
            {templateStyle === 'modern' && (
              <header className="border-b border-slate-200 pb-4 mb-4">
                <div className="flex justify-between items-start gap-4">
                  {/* Company Info & Logo */}
                  <div className="flex items-center gap-3.5">
                    {seller.logoDataUrl ? (
                      <img
                        src={seller.logoDataUrl}
                        alt="Logo"
                        className="max-h-16 max-w-36 object-contain rounded-lg border border-slate-200 p-1"
                      />
                    ) : (
                      <div
                        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: primaryColor }}
                        className="w-14 h-14 rounded-xl border flex items-center justify-center font-black text-xl shadow-xs"
                      >
                        {isAr ? (seller.arabicName ? seller.arabicName.slice(0, 2) : 'IC') : (seller.englishName ? seller.englishName.slice(0, 2) : 'IC')}
                      </div>
                    )}
                    <div>
                      <h1 style={{ color: primaryColor }} className="text-lg font-black leading-tight">
                        {isAr ? (seller.arabicName || 'منصة InvoCore') : (seller.englishName || seller.arabicName || 'InvoCore Technologies')}
                      </h1>
                      {seller.englishName && isAr && (
                        <div className="text-[11px] font-bold text-slate-500 tracking-wide">
                          {seller.englishName}
                        </div>
                      )}
                      {seller.arabicName && !isAr && (
                        <div className="text-[11px] font-bold text-slate-500 tracking-wide">
                          {seller.arabicName}
                        </div>
                      )}
                      <div className="text-[10px] font-semibold text-slate-600 mt-1 flex flex-wrap gap-2 num-tabular">
                        {seller.crNumber && (
                          <span>{isAr ? 'س.ت:' : 'CR:'} <strong>{seller.crNumber}</strong></span>
                        )}
                        {seller.taxNumber && (
                          <span>{isAr ? 'الرقم الضريبي:' : 'VAT:'} <strong>{seller.taxNumber}</strong></span>
                        )}
                      </div>
                      {seller.address && (
                        <div className="text-[9.5px] text-slate-500 mt-0.5">{seller.address}</div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Badge & Metadata */}
                  <div className={`flex flex-col ${isAr ? 'items-end text-left' : 'items-start text-right'}`}>
                    <div
                      style={{ backgroundColor: primaryColor }}
                      className="text-white px-3.5 py-1.5 rounded-lg text-center shadow-xs"
                    >
                      <div className="text-[13px] font-black">{isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}</div>
                      <div className="text-[8.5px] font-bold tracking-widest uppercase opacity-90">
                        {isAr ? 'TAX INVOICE' : 'SIMPLIFIED VAT INVOICE'}
                      </div>
                    </div>
                    <div className="text-[11px] font-extrabold text-slate-700 mt-2 space-y-0.5 num-tabular" dir="ltr">
                      <div>Invoice No: <span className="font-black text-slate-900">#{invoice.invoiceNumber}</span></div>
                      <div>Date: <span className="font-bold">{invoice.date}</span></div>
                    </div>
                  </div>
                </div>
              </header>
            )}

            {templateStyle === 'classic' && (
              <header className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className={`col-span-5 ${isAr ? 'text-right' : 'text-left'}`}>
                    <h1 style={{ color: primaryColor }} className="text-base font-black leading-snug">
                      {isAr ? (seller.arabicName || 'منصة InvoCore') : (seller.englishName || seller.arabicName || 'InvoCore Technologies')}
                    </h1>
                    <div className="text-[10px] font-bold text-slate-600 num-tabular mt-0.5">
                      {isAr ? 'سجل تجاري:' : 'CR:'} {seller.crNumber || '—'} | {isAr ? 'الرقم الضريبي:' : 'VAT:'} {seller.taxNumber || '—'}
                    </div>
                    <div className="text-[9.5px] text-slate-500 mt-0.5">{seller.address}</div>
                  </div>

                  <div className="col-span-2 text-center flex flex-col items-center justify-center">
                    {seller.logoDataUrl ? (
                      <img src={seller.logoDataUrl} alt="Logo" className="max-h-14 max-w-28 object-contain mb-1" />
                    ) : (
                      <div
                        style={{ borderColor: primaryColor, color: primaryColor }}
                        className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-base mb-1"
                      >
                        {seller.arabicName ? seller.arabicName.slice(0, 1) : 'I'}
                      </div>
                    )}
                    <div className="border border-slate-800 rounded px-2 py-0.5 text-[11px] font-black bg-slate-100">
                      {isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}
                    </div>
                  </div>

                  <div dir="ltr" className={`col-span-5 ${isAr ? 'text-left' : 'text-right'}`}>
                    <div className="text-xs font-black text-slate-800 leading-snug">
                      {seller.englishName || 'InvoCore Platform'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 num-tabular mt-0.5">
                      INV: #{invoice.invoiceNumber} | Date: {invoice.date}
                    </div>
                    {seller.iban && (
                      <div className="text-[9.5px] font-bold text-slate-700 num-tabular mt-0.5">
                        IBAN: {seller.iban}
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}

            {templateStyle === 'minimalist' && (
              <header className="border-b border-slate-300 pb-4 mb-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      {isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}
                    </h1>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      TAX INVOICE • VAT COMPLIANT
                    </div>
                    <div className="pt-2 text-[11.5px] font-bold text-slate-700 space-y-0.5 num-tabular">
                      <div>{isAr ? 'رقم الفاتورة:' : 'Invoice No:'} <span className="font-extrabold text-slate-900">#{invoice.invoiceNumber}</span></div>
                      <div>{isAr ? 'التاريخ:' : 'Date:'} <span className="font-extrabold text-slate-900">{invoice.date}</span></div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`${isAr ? 'text-left' : 'text-right'} space-y-0.5`}>
                      <div style={{ color: primaryColor }} className="text-sm font-black">
                        {isAr ? (seller.arabicName || 'منصة InvoCore') : (seller.englishName || seller.arabicName || 'InvoCore Technologies')}
                      </div>
                      <div className="text-[10.5px] font-bold text-slate-600">
                        {seller.englishName || 'InvoCore Platform'}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 num-tabular">
                        {isAr ? 'س.ت:' : 'CR:'} {seller.crNumber} | {isAr ? 'الرقم الضريبي:' : 'VAT:'} {seller.taxNumber}
                      </div>
                    </div>
                    {seller.logoDataUrl && (
                      <img src={seller.logoDataUrl} alt="Logo" className="max-h-14 max-w-28 object-contain" />
                    )}
                  </div>
                </div>
              </header>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CLIENT & INVOICE METADATA SECTION                             */}
            {/* ------------------------------------------------------------- */}
            <section className="grid grid-cols-12 gap-3 mb-4 text-xs">
              {/* Client Info Card */}
              <div
                style={{ backgroundColor: `${primaryColor}08` }}
                className={`col-span-8 border border-slate-200 rounded-xl p-3 space-y-1 ${isAr ? 'text-right' : 'text-left'}`}
              >
                <div style={{ color: primaryColor }} className="text-[11px] font-extrabold border-b border-slate-200/80 pb-1">
                  {isAr ? 'بيانات العميل / Customer Details' : 'Customer & Buyer Details'}
                </div>
                <div className="text-[13px] font-black text-slate-900 pt-0.5">
                  {invoice.client.name || (isAr ? 'عميل نقدي' : 'Cash Client')}
                </div>
                <div className="text-[11px] font-bold text-slate-600 num-tabular">
                  {isAr ? 'الرقم الضريبي:' : 'VAT Number:'} {invoice.client.taxNumber || (isAr ? 'غير مسجل' : 'N/A')}
                </div>
                {invoice.client.address && (
                  <div className="text-[10.5px] text-slate-500">{invoice.client.address}</div>
                )}
                {invoice.client.notes && (
                  <div className="text-[10px] text-slate-600 font-medium">
                    {isAr ? 'ملاحظات:' : 'Notes:'} {invoice.client.notes}
                  </div>
                )}
              </div>

              {/* Invoice Specifics Card */}
              <div className={`col-span-4 border border-slate-200 rounded-xl p-3 space-y-1 bg-slate-50/70 ${isAr ? 'text-right' : 'text-left'}`}>
                <div className="text-[11px] font-extrabold text-slate-700 border-b border-slate-200 pb-1">
                  {isAr ? 'تفاصيل الفاتورة' : 'Invoice Specifics'}
                </div>
                <div className="text-[11px] font-bold text-slate-700">
                  {isAr ? 'طريقة الدفع:' : 'Payment:'}{' '}
                  <span style={{ color: primaryColor }} className="font-black">
                    {invoice.paymentMethod === 'آجل' && !isAr ? 'Credit' : invoice.paymentMethod === 'نقدي' && !isAr ? 'Cash' : invoice.paymentMethod === 'تحويل بنكي' && !isAr ? 'Wire Transfer' : invoice.paymentMethod === 'شبكة' && !isAr ? 'POS' : invoice.paymentMethod}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-700">
                  {isAr ? 'وقت الإصدار:' : 'Time:'} <span className="num-tabular font-bold">{invoice.time}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-700">
                  {isAr ? 'الصفحة:' : 'Page:'}{' '}
                  <span className="num-tabular font-black">
                    {isAr ? `${actualPageNo} من ${totalPagesCount}` : `${actualPageNo} of ${totalPagesCount}`}
                  </span>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* LINE ITEMS TABLE                                              */}
            {/* ------------------------------------------------------------- */}
            <section className="mb-4 flex-1">
              <table className="w-full text-xs text-center border-collapse border border-slate-200">
                <thead>
                  <tr style={{ backgroundColor: primaryColor }} className="text-white text-[11px] font-bold">
                    <th className="py-2 px-1.5 w-10">#</th>
                    <th className={`py-2 px-3 ${isAr ? 'text-right' : 'text-left'}`}>
                      {isAr ? 'البيان / الوصف (Description)' : 'Item Description / Service'}
                    </th>
                    <th className="py-2 px-2 w-16">{isAr ? 'الوحدة' : 'Unit'}</th>
                    <th className="py-2 px-2 w-16">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2 px-2 w-20">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th className="py-2 px-2 w-16">{isAr ? 'الضريبة' : 'VAT'}</th>
                    <th className="py-2 px-2 w-24">
                      {isAr ? 'الإجمالي (ر.س)' : 'Total (SAR)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {pageData.items.map((item, idx) => {
                    const rowNo = pageData.startIndex + idx + 1;
                    const lineSubtotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                    const vatAmount = lineSubtotal * ((invoice.vatRate ?? 15) / 100);
                    const lineTotal = lineSubtotal + vatAmount;

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-1 num-tabular font-bold text-slate-500">{rowNo}</td>
                        <td className={`py-2.5 px-3 ${isAr ? 'text-right' : 'text-left'}`}>
                          <div className="font-extrabold text-slate-900 text-[12.5px]">{item.description}</div>
                          {item.itemCode && (
                            <div className="text-[9.5px] text-slate-400 num-tabular">
                              {isAr ? 'كود:' : 'SKU:'} {item.itemCode}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-1.5 text-slate-600 font-bold">{item.unit || (isAr ? 'وحدة' : 'Unit')}</td>
                        <td className="py-2.5 px-1.5 num-tabular font-extrabold">{formatQty(item.qty)}</td>
                        <td className="py-2.5 px-1.5 num-tabular font-bold">{formatMoney(item.unitPrice)}</td>
                        <td className="py-2.5 px-1.5 num-tabular text-slate-500">{invoice.vatRate ?? 15}%</td>
                        <td className="py-2.5 px-2 num-tabular font-black text-slate-950">{formatMoney(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* TOTALS & SUMMARY BLOCK                                        */}
            {/* ------------------------------------------------------------- */}
            <div className="mt-auto pt-3 border-t border-slate-200">
              {isLastPage ? (
                <div className="grid grid-cols-12 gap-3.5 items-end mb-4">
                  {/* Left Column: Tafqeet & Bank details */}
                  <div className="col-span-7 space-y-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-slate-500">
                        {isAr ? 'المبلغ كتابةً وتفقيطاً:' : 'Amount in Words (Tafqeet):'}
                      </div>
                      <div style={{ color: primaryColor }} className="text-xs font-black mt-0.5">
                        {displayedTafqeet}
                      </div>
                    </div>

                    {seller.iban && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2 text-[10px] text-slate-600 flex justify-between num-tabular">
                        <span>{isAr ? 'الحساب البنكي:' : 'Bank Wire:'} <strong>{seller.bankName || 'SNB Bank'}</strong></span>
                        <span dir="ltr" className="font-mono font-bold">IBAN: {seller.iban}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial Totals Breakdown */}
                  <div className="col-span-5 border border-slate-300 rounded-xl overflow-hidden bg-white text-xs">
                    <div className="divide-y divide-slate-100">
                      <div className="flex justify-between p-2 font-bold text-slate-700 num-tabular">
                        <span>{isAr ? 'المجموع الفرعي (غير شامل الضريبة):' : 'Subtotal (Excl. VAT):'}</span>
                        <span>{formatMoney(totals.subtotal)} {isAr ? 'ر.س' : 'SAR'}</span>
                      </div>
                      {totals.totalDiscount > 0 && (
                        <div className="flex justify-between p-2 font-bold text-rose-700 num-tabular">
                          <span>{isAr ? 'إجمالي الخصم:' : 'Discount:'}</span>
                          <span>-{formatMoney(totals.totalDiscount)} {isAr ? 'ر.س' : 'SAR'}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-2 font-bold text-slate-700 num-tabular">
                        <span>{isAr ? `ضريبة القيمة المضافة (${totals.vatRate}%):` : `VAT (${totals.vatRate}%):`}</span>
                        <span>{formatMoney(totals.vatAmount)} {isAr ? 'ر.س' : 'SAR'}</span>
                      </div>
                      <div
                        style={{ backgroundColor: primaryColor }}
                        className="flex justify-between p-2.5 font-black text-white text-sm num-tabular"
                      >
                        <span>{isAr ? 'الإجمالي الكلي شامل الضريبة:' : 'Grand Total (Incl. VAT):'}</span>
                        <span>{formatMoney(totals.finalTotal)} {isAr ? 'ر.س' : 'SAR'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-lg mb-3">
                  {isAr ? '(يتبع تفاصيل البنود والإجماليات في الصفحة التالية...)' : '(Continued on next page...)'}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* FOOTER & ZATCA VERIFICATION QR                                */}
              {/* ------------------------------------------------------------- */}
              <footer className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[10px] font-semibold text-slate-500 space-y-0.5">
                  <div>
                    {isAr ? (
                      <>فاتورة ضريبية إلكترونية معتمدة صادرة من: <strong>{seller.arabicName || 'منصة InvoCore'}</strong></>
                    ) : (
                      <>Official Tax Invoice issued by: <strong>{seller.englishName || seller.arabicName || 'InvoCore Technologies'}</strong></>
                    )}
                  </div>
                  <div>
                    {isAr
                      ? 'هذا الرمز مشفر وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)'
                      : 'Encrypted QR code generated in compliance with ZATCA e-invoicing standards'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1 border border-slate-200 rounded-lg bg-white shadow-xs">
                    <SafeQRCode
                      value={invoice.qrMode === 'zatca' ? zatcaQrBase64 : publicUrl}
                      size={68}
                      level="L"
                      includeMargin={false}
                    />
                  </div>
                </div>
              </footer>
            </div>
          </div>
        );
      })}
    </div>
  );
};
