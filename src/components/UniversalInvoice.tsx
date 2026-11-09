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
import { InvoCoreLogo } from './InvoCoreLogo';
import { getMarketConfig } from '../constants/jurisdictions';

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

  const market = useMemo(
    () => getMarketConfig(invoice.jurisdiction || seller.jurisdiction || 'KSA'),
    [invoice.jurisdiction, seller.jurisdiction]
  );
  const currencySymbol = isAr ? market.currencySymbolAr : market.currencySymbolEn;

  const pages = useMemo(
    () => paginateInvoiceItems(invoice.items),
    [invoice.items]
  );

  const autoTafqeet = useMemo(() => {
    return isAr
      ? numberToArabicTafqeet(totals.finalTotal, market.code)
      : numberToEnglishWords(totals.finalTotal, market.majorUnitEn, market.minorUnitEn);
  }, [totals.finalTotal, isAr, market]);

  const displayedTafqeet =
    invoice.tafqeetManual && invoice.tafqeetManual.trim() !== ''
      ? invoice.tafqeetManual
      : autoTafqeet;

  const zatcaQrBase64 = useMemo(() => {
    return generateZatcaQrBase64({
      sellerName: seller.arabicName || seller.englishName || 'InvoCore Technologies',
      vatNumber: seller.taxNumber || '310987654300003',
      date: invoice.date,
      time: invoice.time,
      totalWithVat: totals.finalTotal,
      vatTotal: totals.vatAmount,
    });
  }, [seller, invoice, totals]);

  const publicUrl = useMemo(() => {
    return encodePublicInvoiceUrl(invoice, seller, lang);
  }, [invoice, seller, lang]);

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

        // =========================================================================
        // TEMPLATE A: EXECUTIVE MODERN
        // =========================================================================
        if (templateStyle === 'modern') {
          return (
            <div
              key={`page-modern-${actualPageNo}`}
              dir={isAr ? 'rtl' : 'ltr'}
              style={{
                fontFamily: seller.fontFamily || (isAr ? "'Tajawal', 'Cairo', sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
              }}
              className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border rounded-2xl overflow-hidden border border-slate-200"
            >
              {isWatermarked && <TrialWatermark />}

              <div>
                {/* 1. Full-Bleed Solid Brand Banner */}
                <header
                  style={{ backgroundColor: primaryColor }}
                  className="p-6 text-white relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    {/* Left/Right: Logo in crisp white badge + Seller details */}
                    <div className="flex items-center gap-3.5">
                      <div className="bg-white rounded-xl p-2.5 shadow-md flex items-center justify-center min-w-[70px] min-h-[50px] shrink-0">
                        {seller.logoDataUrl ? (
                          <img
                            src={seller.logoDataUrl}
                            alt="Logo"
                            className="max-h-12 max-w-32 object-contain"
                          />
                        ) : (
                          <InvoCoreLogo size={40} variant="dark" />
                        )}
                      </div>
                      <div>
                        <h1 className="text-lg font-black text-white leading-tight">
                          {isAr
                            ? (seller.arabicName || 'منصة InvoCore')
                            : (seller.englishName || seller.arabicName || 'InvoCore Technologies')}
                        </h1>
                        {seller.englishName && isAr && (
                          <div className="text-[11px] font-bold text-white/80 tracking-wide mt-0.5">
                            {seller.englishName}
                          </div>
                        )}
                        {seller.arabicName && !isAr && (
                          <div className="text-[11px] font-bold text-white/80 tracking-wide mt-0.5">
                            {seller.arabicName}
                          </div>
                        )}
                        <div className="text-[10px] font-medium text-white/85 mt-1 flex flex-wrap gap-2.5 num-tabular">
                          {seller.crNumber && (
                            <span>{isAr ? `${market.crNumberLabelAr}:` : `${market.crNumberLabelEn}:`} <strong className="text-white">{seller.crNumber}</strong></span>
                          )}
                          {seller.taxNumber && (
                            <span>{isAr ? `${market.taxNumberLabelAr}:` : `${market.taxNumberLabelEn}:`} <strong className="text-white">{seller.taxNumber}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Floating Glass Summary Strip */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl p-3 text-white flex flex-col items-start sm:items-end gap-1 shrink-0 min-w-[190px]">
                      <div className="text-[12px] font-black uppercase tracking-wider">
                        {isAr ? market.invoiceTitleAr : market.invoiceTitleEn}
                      </div>
                      <div className="text-[10px] text-white/80 uppercase font-semibold">
                        {isAr ? market.authorityNameAr : market.authorityNameEn}
                      </div>
                      <div className="w-full h-[1px] bg-white/20 my-1" />
                      <div className="text-[11px] font-bold text-white flex justify-between w-full num-tabular">
                        <span>{isAr ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
                        <span className="font-black text-amber-300">#{invoice.invoiceNumber}</span>
                      </div>
                      <div className="text-[10.5px] text-white/90 flex justify-between w-full num-tabular">
                        <span>{isAr ? 'التاريخ:' : 'Date:'}</span>
                        <span>{invoice.date}</span>
                      </div>
                    </div>
                  </div>
                </header>

                <div className="p-6 space-y-5">
                  {/* 2. Modern Card-Based Seller vs Buyer Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs">
                    {/* Buyer / Customer Card */}
                    <div className="sm:col-span-8 bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                      <div style={{ color: primaryColor }} className="text-[10.5px] font-black uppercase tracking-wider border-b border-slate-200/80 pb-1">
                        {isAr ? 'فاتورة إلى (Billed To / Customer)' : 'Billed To (Customer Details)'}
                      </div>
                      <div className="text-sm font-black text-slate-900 pt-0.5">
                        {invoice.client.name || (isAr ? 'عميل نقدي' : 'Cash Client')}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 num-tabular">
                        {isAr ? `${market.taxNumberLabelAr}:` : `${market.taxNumberLabelEn}:`} <span className="text-slate-900">{invoice.client.taxNumber || (isAr ? 'غير مسجل' : 'N/A')}</span>
                      </div>
                      {invoice.client.address && (
                        <div className="text-[10.5px] text-slate-500 font-medium">{invoice.client.address}</div>
                      )}
                      {invoice.client.notes && (
                        <div className="text-[10px] text-slate-600 pt-0.5">
                          <strong>{isAr ? 'ملاحظات:' : 'Notes:'}</strong> {invoice.client.notes}
                        </div>
                      )}
                    </div>

                    {/* Invoice Specifics Card */}
                    <div className="sm:col-span-4 bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-1 flex flex-col justify-between">
                      <div className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200/80 pb-1">
                        {isAr ? 'بيانات الإصدار' : 'Invoice Specifics'}
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 flex justify-between items-center">
                        <span>{isAr ? 'طريقة الدفع:' : 'Payment:'}</span>
                        <span
                          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-black"
                        >
                          {invoice.paymentMethod === 'آجل' && !isAr ? 'Credit' : invoice.paymentMethod === 'نقدي' && !isAr ? 'Cash' : invoice.paymentMethod === 'تحويل بنكي' && !isAr ? 'Wire Transfer' : invoice.paymentMethod === 'شبكة' && !isAr ? 'POS' : invoice.paymentMethod}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 flex justify-between items-center num-tabular">
                        <span>{isAr ? 'الوقت:' : 'Time:'}</span>
                        <span className="font-semibold text-slate-900">{invoice.time}</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 flex justify-between items-center num-tabular">
                        <span>{isAr ? 'الصفحة:' : 'Page:'}</span>
                        <span className="font-black text-slate-900">{actualPageNo} / {totalPagesCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Sleek Borderless Table with Brand Header Bar */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: primaryColor }} className="text-white text-[11px] font-bold">
                          <th className="py-2.5 px-2 w-10">#</th>
                          <th className={`py-2.5 px-3 ${isAr ? 'text-right' : 'text-left'}`}>
                            {isAr ? 'البيان / الوصف (Description)' : 'Item Description / Service'}
                          </th>
                          <th className="py-2.5 px-2 w-16">{isAr ? 'الوحدة' : 'Unit'}</th>
                          <th className="py-2.5 px-2 w-16">{isAr ? 'الكمية' : 'Qty'}</th>
                          <th className="py-2.5 px-2 w-20">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                          <th className="py-2.5 px-2 w-16">{isAr ? market.taxShortLabelAr : market.taxShortLabelEn}</th>
                          <th className="py-2.5 px-2 w-24">
                            {isAr ? `الإجمالي (${currencySymbol})` : `Total (${currencySymbol})`}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {pageData.items.map((item, idx) => {
                          const rowNo = pageData.startIndex + idx + 1;
                          const lineSubtotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                          const lineVatRate = invoice.isReverseCharge ? 0 : (invoice.vatRate ?? market.defaultVatRate);
                          const vatAmount = lineSubtotal * (lineVatRate / 100);
                          const lineTotal = lineSubtotal + vatAmount;

                          return (
                            <tr key={item.id || idx} className="even:bg-slate-50/70 hover:bg-slate-100/50 transition-colors">
                              <td className="py-3 px-1 num-tabular font-bold text-slate-500">{rowNo}</td>
                              <td className={`py-3 px-3 ${isAr ? 'text-right' : 'text-left'}`}>
                                <div className="font-extrabold text-slate-900 text-[12.5px]">{item.description}</div>
                                {item.itemCode && (
                                  <div className="text-[9.5px] text-slate-400 num-tabular">SKU: {item.itemCode}</div>
                                )}
                              </td>
                              <td className="py-3 px-1.5 text-slate-600 font-medium">{item.unit || (isAr ? 'وحدة' : 'Unit')}</td>
                              <td className="py-3 px-1.5 num-tabular font-extrabold">{formatQty(item.qty)}</td>
                              <td className="py-3 px-1.5 num-tabular font-bold">{formatMoney(item.unitPrice)}</td>
                              <td className="py-3 px-1.5 num-tabular text-slate-500">{lineVatRate}%</td>
                              <td className="py-3 px-2 num-tabular font-black text-slate-950">{formatMoney(lineTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Financial Totals & Grand Total Block */}
                  {isLastPage ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2">
                      <div className="sm:col-span-7 space-y-2.5">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-slate-500">
                            {isAr ? 'المبلغ كتابةً وتفقيطاً:' : 'Amount in Words:'}
                          </div>
                          <div style={{ color: primaryColor }} className="text-xs font-black mt-0.5 leading-relaxed">
                            {displayedTafqeet}
                          </div>
                        </div>

                        {seller.iban && (
                          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-[10.5px] text-slate-600 flex justify-between num-tabular">
                            <span>{isAr ? 'التحصيل البنكي:' : 'Bank Transfer:'} <strong>{seller.bankName || 'SNB Bank'}</strong></span>
                            <span dir="ltr" className="font-mono font-bold">IBAN: {seller.iban}</span>
                          </div>
                        )}

                        {totals.isReverseCharge && (
                          <div className="bg-blue-50/90 border border-blue-200 rounded-lg p-2.5 text-[10px] font-bold text-blue-900 leading-snug">
                            {isAr
                              ? 'إقرار ضريبي: خاضع لآلية التكليف العكسي (المادة 196 من توجيه المجلس الأوروبي 2006/112/EC).'
                              : 'Tax Notice: B2B Reverse Charge applies (Article 196 EU Council Directive 2006/112/EC).'}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-5 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs text-xs divide-y divide-slate-100">
                        <div className="flex justify-between p-2.5 font-bold text-slate-700 num-tabular">
                          <span>{isAr ? 'المجموع قبل الضريبة:' : 'Subtotal (Excl. Tax):'}</span>
                          <span>{formatMoney(totals.subtotal)} {currencySymbol}</span>
                        </div>
                        {totals.totalDiscount > 0 && (
                          <div className="flex justify-between p-2.5 font-bold text-rose-700 num-tabular">
                            <span>{isAr ? 'إجمالي الخصم:' : 'Total Discount:'}</span>
                            <span>-{formatMoney(totals.totalDiscount)} {currencySymbol}</span>
                          </div>
                        )}
                        <div className="flex justify-between p-2.5 font-bold text-slate-700 num-tabular">
                          <span>{isAr ? `${market.taxShortLabelAr} (${totals.vatRate}%):` : `${market.taxShortLabelEn} (${totals.vatRate}%):`}</span>
                          <span>{formatMoney(totals.vatAmount)} {currencySymbol}</span>
                        </div>
                        {totals.withholdingTaxAmount && totals.withholdingTaxAmount > 0 ? (
                          <div className="flex justify-between p-2.5 font-bold text-amber-700 bg-amber-50/70 num-tabular">
                            <span>{isAr ? `خصم أرباح تجارية (${totals.withholdingTaxRate}%):` : `Withholding Tax (-${totals.withholdingTaxRate}%):`}</span>
                            <span>-{formatMoney(totals.withholdingTaxAmount)} {currencySymbol}</span>
                          </div>
                        ) : null}
                        <div
                          style={{ backgroundColor: primaryColor }}
                          className="flex justify-between p-3.5 font-black text-white text-sm num-tabular"
                        >
                          <span>{isAr ? 'الصافي الإجمالي المستحق:' : 'Total Due:'}</span>
                          <span className="text-base text-emerald-300">{formatMoney(totals.finalTotal)} {currencySymbol}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-xl">
                      {isAr ? '(يتبع تفاصيل البنود والإجماليات في الصفحة التالية...)' : '(Continued on next page...)'}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Modern Verification Footer with QR Code */}
              <footer className="p-5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="text-[10px] font-semibold text-slate-500 space-y-0.5">
                  <div className="text-slate-700 font-bold">
                    {isAr
                      ? `فاتورة ضريبية إلكترونية معتمدة — ${seller.arabicName || 'منصة InvoCore'}`
                      : `Official E-Invoice — ${seller.englishName || seller.arabicName || 'InvoCore Technologies'}`}
                  </div>
                  <div>
                    {isAr
                      ? 'تم التشفير والتحقق وفق اشتراطات الفوترة الإلكترونية المعتمدة'
                      : 'Cryptographically verified under official e-invoicing compliance'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 border border-slate-200 rounded-lg bg-white shadow-xs shrink-0">
                    <SafeQRCode
                      value={invoice.qrMode === 'zatca' ? zatcaQrBase64 : publicUrl}
                      size={105}
                      level="L"
                      includeMargin={false}
                    />
                  </div>
                </div>
              </footer>
            </div>
          );
        }

        // =========================================================================
        // TEMPLATE B: CORPORATE CLASSIC GRID (OFFICIAL ACCOUNTING LEDGER)
        // =========================================================================
        if (templateStyle === 'classic') {
          return (
            <div
              key={`page-classic-${actualPageNo}`}
              dir={isAr ? 'rtl' : 'ltr'}
              style={{
                fontFamily: seller.fontFamily || (isAr ? "'Amiri', 'Traditional Arabic', serif" : "Georgia, 'Times New Roman', serif"),
              }}
              className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border p-7 border-4 border-double border-slate-900"
            >
              {isWatermarked && <TrialWatermark />}

              <div>
                {/* 1. Formal Corporate Header: Arabic Right, English Left, Logo & Double-Bordered Title Center */}
                <header className="border-b-4 border-double border-slate-900 pb-4 mb-4">
                  <div className="grid grid-cols-12 items-center gap-2">
                    {/* Arabic Company Credentials (Col 4) */}
                    <div className="col-span-4 text-right space-y-0.5">
                      <h2 className="text-sm font-black text-slate-900 leading-tight">
                        {seller.arabicName || 'شركة إنفو كور المحدودة'}
                      </h2>
                      <div className="text-[10px] font-bold text-slate-700 num-tabular">
                        {market.crNumberLabelAr}: {seller.crNumber || '—'}
                      </div>
                      <div className="text-[10px] font-bold text-slate-700 num-tabular">
                        {market.taxNumberLabelAr}: {seller.taxNumber || '—'}
                      </div>
                      {seller.address && (
                        <div className="text-[9px] text-slate-600 leading-snug">{seller.address}</div>
                      )}
                    </div>

                    {/* Centered Formal Emblem & Double-Bordered Title (Col 4) */}
                    <div className="col-span-4 flex flex-col items-center justify-center text-center">
                      <div className="mb-1.5 flex items-center justify-center">
                        {seller.logoDataUrl ? (
                          <img
                            src={seller.logoDataUrl}
                            alt="Logo"
                            className="max-h-14 max-w-28 object-contain"
                          />
                        ) : (
                          <InvoCoreLogo size={42} variant="dark" />
                        )}
                      </div>
                      <div className="border-2 border-slate-900 bg-slate-50 px-3 py-1 rounded-sm shadow-2xs">
                        <div className="text-xs font-black tracking-wide text-slate-900">
                          {market.invoiceTitleAr}
                        </div>
                        <div className="text-[9px] font-bold text-slate-700 tracking-wider uppercase">
                          {market.invoiceTitleEn}
                        </div>
                      </div>
                      <div className="text-[8.5px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        {market.authorityNameAr}
                      </div>
                    </div>

                    {/* English Company Credentials (Col 4) */}
                    <div dir="ltr" className="col-span-4 text-left space-y-0.5">
                      <h2 className="text-xs font-black text-slate-900 leading-tight">
                        {seller.englishName || 'InvoCore Technologies Ltd.'}
                      </h2>
                      <div className="text-[10px] font-bold text-slate-700 num-tabular">
                        INV #{invoice.invoiceNumber} | {invoice.date}
                      </div>
                      {seller.iban && (
                        <div className="text-[9.5px] font-mono font-bold text-slate-700">
                          IBAN: {seller.iban}
                        </div>
                      )}
                      {seller.phone && (
                        <div className="text-[9px] text-slate-600">TEL: {seller.phone}</div>
                      )}
                    </div>
                  </div>
                </header>

                {/* 2. Formal Accounting Grid for Customer & Invoice Details */}
                <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-4">
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className="bg-slate-100 font-bold p-2 w-32 border-l border-slate-800">
                        {isAr ? 'اسم العميل / المكلف:' : 'Customer Name:'}
                      </td>
                      <td className="p-2 font-black text-slate-900 border-l border-slate-800">
                        {invoice.client.name || (isAr ? 'عميل نقدي عام' : 'Cash Client')}
                      </td>
                      <td className="bg-slate-100 font-bold p-2 w-28 border-l border-slate-800">
                        {isAr ? 'رقم الفاتورة:' : 'Invoice No:'}
                      </td>
                      <td className="p-2 font-mono font-black text-slate-900 num-tabular">
                        #{invoice.invoiceNumber}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="bg-slate-100 font-bold p-2 border-l border-slate-800">
                        {isAr ? market.taxNumberLabelAr : market.taxNumberLabelEn}:
                      </td>
                      <td className="p-2 font-mono font-bold num-tabular border-l border-slate-800">
                        {invoice.client.taxNumber || '—'}
                      </td>
                      <td className="bg-slate-100 font-bold p-2 border-l border-slate-800">
                        {isAr ? 'تاريخ الفاتورة:' : 'Issue Date:'}
                      </td>
                      <td className="p-2 font-bold num-tabular">
                        {invoice.date}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border-l border-slate-800">
                        {isAr ? 'العنوان والمقر:' : 'Address:'}
                      </td>
                      <td className="p-2 text-slate-700 border-l border-slate-800">
                        {invoice.client.address || '—'}
                      </td>
                      <td className="bg-slate-100 font-bold p-2 border-l border-slate-800">
                        {isAr ? 'طريقة الدفع:' : 'Terms:'}
                      </td>
                      <td className="p-2 font-bold">
                        {invoice.paymentMethod}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 3. Full Structured Accounting Ledger Table (border-collapse on all cells) */}
                <table className="w-full border-collapse border-2 border-slate-900 text-xs text-center mb-4">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-black border-b-2 border-slate-900 text-[11px]">
                      <th className="border border-slate-700 py-2 px-1 w-10">م</th>
                      <th className={`border border-slate-700 py-2 px-3 ${isAr ? 'text-right' : 'text-left'}`}>
                        {isAr ? 'البيان وتفاصيل الأصناف والخدمات' : 'Description of Goods / Services'}
                      </th>
                      <th className="border border-slate-700 py-2 px-2 w-14">{isAr ? 'الوحدة' : 'Unit'}</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">{isAr ? 'السعر' : 'Rate'}</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">{isAr ? 'الضريبة' : 'VAT'}</th>
                      <th className="border border-slate-700 py-2 px-2 w-24">
                        {isAr ? `الإجمالي (${currencySymbol})` : `Total (${currencySymbol})`}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.items.map((item, idx) => {
                      const rowNo = pageData.startIndex + idx + 1;
                      const lineSubtotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                      const lineVatRate = invoice.isReverseCharge ? 0 : (invoice.vatRate ?? market.defaultVatRate);
                      const vatAmount = lineSubtotal * (lineVatRate / 100);
                      const lineTotal = lineSubtotal + vatAmount;

                      return (
                        <tr key={item.id || idx} className="border-b border-slate-400">
                          <td className="border border-slate-400 py-2 px-1 num-tabular font-bold">{rowNo}</td>
                          <td className={`border border-slate-400 py-2 px-3 ${isAr ? 'text-right' : 'text-left'}`}>
                            <div className="font-bold text-slate-900">{item.description}</div>
                          </td>
                          <td className="border border-slate-400 py-2 px-1 text-slate-700">{item.unit || 'وحدة'}</td>
                          <td className="border border-slate-400 py-2 px-1 num-tabular font-bold">{formatQty(item.qty)}</td>
                          <td className="border border-slate-400 py-2 px-1 num-tabular font-bold">{formatMoney(item.unitPrice)}</td>
                          <td className="border border-slate-400 py-2 px-1 num-tabular">{lineVatRate}%</td>
                          <td className="border border-slate-400 py-2 px-2 num-tabular font-black">{formatMoney(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* 4. Structured Accounting Sub-Table */}
                {isLastPage && (
                  <div className="grid grid-cols-12 gap-3 mb-4">
                    <div className="col-span-7 border-2 border-slate-900 p-2.5 space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700">
                        {isAr ? 'المبلغ كتابةً وتفقيطاً:' : 'Amount in Words:'}
                      </div>
                      <div className="font-black text-slate-900 bg-slate-50 p-2 border border-slate-300">
                        {displayedTafqeet}
                      </div>
                      {seller.iban && (
                        <div className="text-[10px] text-slate-700 pt-1">
                          <strong>{isAr ? 'الحساب البنكي:' : 'Bank:'}</strong> {seller.bankName} — IBAN: {seller.iban}
                        </div>
                      )}
                    </div>

                    <div className="col-span-5">
                      <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                        <tbody>
                          <tr className="border-b border-slate-800">
                            <td className="bg-slate-100 font-bold p-1.5 border-l border-slate-800">
                              {isAr ? 'المجموع قبل الضريبة:' : 'Subtotal:'}
                            </td>
                            <td className="p-1.5 font-bold num-tabular text-right">
                              {formatMoney(totals.subtotal)} {currencySymbol}
                            </td>
                          </tr>
                          {totals.totalDiscount > 0 && (
                            <tr className="border-b border-slate-800">
                              <td className="bg-slate-100 font-bold p-1.5 border-l border-slate-800 text-rose-700">
                                {isAr ? 'الخصم:' : 'Discount:'}
                              </td>
                              <td className="p-1.5 font-bold num-tabular text-right text-rose-700">
                                -{formatMoney(totals.totalDiscount)} {currencySymbol}
                              </td>
                            </tr>
                          )}
                          <tr className="border-b border-slate-800">
                            <td className="bg-slate-100 font-bold p-1.5 border-l border-slate-800">
                              {isAr ? market.taxShortLabelAr : market.taxShortLabelEn} ({totals.vatRate}%):
                            </td>
                            <td className="p-1.5 font-bold num-tabular text-right">
                              {formatMoney(totals.vatAmount)} {currencySymbol}
                            </td>
                          </tr>
                          <tr className="bg-slate-900 text-white font-black text-sm">
                            <td className="p-2 border-l border-slate-700">
                              {isAr ? 'صافي الفاتورة:' : 'Total Due:'}
                            </td>
                            <td className="p-2 num-tabular text-right text-amber-300">
                              {formatMoney(totals.finalTotal)} {currencySymbol}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Traditional Formal 3-Column Signature & Official Stamp Boxes */}
              <div className="pt-3 border-t-2 border-slate-900">
                <div className="grid grid-cols-12 gap-3 text-xs">
                  {/* Box 1: Receiver */}
                  <div className="col-span-4 border border-slate-800 p-2.5 text-center flex flex-col justify-between min-h-[128px]">
                    <div className="font-bold text-slate-800 border-b border-slate-300 pb-1">
                      {isAr ? 'توقيع المستلم (Receiver)' : 'Receiver Signature'}
                    </div>
                    <div className="text-[10px] text-slate-400">....................................</div>
                  </div>

                  {/* Box 2: Accountant */}
                  <div className="col-span-4 border border-slate-800 p-2.5 text-center flex flex-col justify-between min-h-[128px]">
                    <div className="font-bold text-slate-800 border-b border-slate-300 pb-1">
                      {isAr ? 'المحاسب المالي (Accountant)' : 'Finance / Accountant'}
                    </div>
                    <div className="text-[10px] text-slate-400">....................................</div>
                  </div>

                  {/* Box 3: Official Stamp & QR */}
                  <div className="col-span-4 border-2 border-dashed border-slate-800 p-2 text-center flex items-center justify-between min-h-[128px] bg-slate-50/50 gap-2">
                    <div className="flex-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isAr ? 'الختم الرسمي للمنشأة' : 'Official Seal'}
                    </div>
                    <div className="shrink-0 p-2 bg-white border border-slate-200 rounded-lg shadow-2xs">
                      <SafeQRCode
                        value={invoice.qrMode === 'zatca' ? zatcaQrBase64 : publicUrl}
                        size={105}
                        level="L"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // =========================================================================
        // TEMPLATE C: SWISS MINIMALIST (STRIPE / APPLE ARCHITECTURAL STYLE)
        // =========================================================================
        return (
          <div
            key={`page-minimalist-${actualPageNo}`}
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              fontFamily: seller.fontFamily || "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
            }}
            className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border p-8 border border-slate-200"
          >
            {isWatermarked && <TrialWatermark />}

            <div>
              {/* 1. Ultra-Clean Architectural Header */}
              <header className="border-b border-slate-200 pb-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-slate-900 uppercase">
                      {isAr ? market.invoiceTitleAr : 'Invoice'}
                    </h1>
                    <div className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mt-1">
                      {isAr ? market.authorityNameAr : market.authorityNameEn}
                    </div>
                  </div>

                  <div className={`flex flex-col ${isAr ? 'items-start text-right' : 'items-end text-left'}`}>
                    {seller.logoDataUrl ? (
                      <img src={seller.logoDataUrl} alt="Logo" className="max-h-12 max-w-28 object-contain mb-2" />
                    ) : (
                      <div className="mb-2">
                        <InvoCoreLogo size={36} variant="dark" />
                      </div>
                    )}
                    <div className="text-sm font-bold text-slate-900">
                      {isAr ? (seller.arabicName || 'منصة InvoCore') : (seller.englishName || seller.arabicName || 'InvoCore Technologies')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono num-tabular mt-0.5">
                      {isAr ? market.taxNumberLabelAr : 'VAT'}: {seller.taxNumber || '—'}
                    </div>
                    {seller.address && (
                      <div className="text-[10px] text-slate-400 max-w-xs">{seller.address}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isAr ? 'رقم الفاتورة' : 'Invoice Number'}
                    </div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5 num-tabular">#{invoice.invoiceNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isAr ? 'تاريخ الإصدار' : 'Issue Date'}
                    </div>
                    <div className="font-medium text-slate-900 mt-0.5 num-tabular">{invoice.date}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isAr ? 'طريقة الدفع' : 'Payment Terms'}
                    </div>
                    <div className="font-medium text-slate-900 mt-0.5">{invoice.paymentMethod}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isAr ? 'الصفحة' : 'Page'}
                    </div>
                    <div className="font-mono text-slate-900 mt-0.5 num-tabular">{actualPageNo} / {totalPagesCount}</div>
                  </div>
                </div>
              </header>

              {/* 2. Client Section with Whitespace-Driven Micro-Labels */}
              <div className="mb-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isAr ? 'بيانات العميل (Billed To)' : 'Billed To'}
                </div>
                <div className="text-base font-bold text-slate-900">
                  {invoice.client.name || (isAr ? 'عميل نقدي' : 'Cash Client')}
                </div>
                {invoice.client.taxNumber && (
                  <div className="text-xs font-mono text-slate-600 mt-0.5 num-tabular">
                    {market.taxShortLabelEn}: {invoice.client.taxNumber}
                  </div>
                )}
                {invoice.client.address && (
                  <div className="text-xs text-slate-500 mt-0.5">{invoice.client.address}</div>
                )}
              </div>

              {/* 3. Open Whitespace-Driven Table with Bottom Hairline Borders Only */}
              <table className="w-full text-xs text-left mb-6">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-1 w-8">#</th>
                    <th className={`py-2.5 px-2 ${isAr ? 'text-right' : 'text-left'}`}>
                      {isAr ? 'البيان (Item)' : 'Item'}
                    </th>
                    <th className="py-2.5 px-2 text-center w-16">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2.5 px-2 text-right w-24">{isAr ? 'السعر' : 'Price'}</th>
                    <th className="py-2.5 px-2 text-right w-24">
                      {isAr ? `الإجمالي (${currencySymbol})` : `Total (${currencySymbol})`}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {pageData.items.map((item, idx) => {
                    const rowNo = pageData.startIndex + idx + 1;
                    const lineSubtotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                    const lineVatRate = invoice.isReverseCharge ? 0 : (invoice.vatRate ?? market.defaultVatRate);
                    const vatAmount = lineSubtotal * (lineVatRate / 100);
                    const lineTotal = lineSubtotal + vatAmount;

                    return (
                      <tr key={item.id || idx}>
                        <td className="py-3.5 px-1 text-slate-400 num-tabular">{rowNo}</td>
                        <td className={`py-3.5 px-2 ${isAr ? 'text-right' : 'text-left'}`}>
                          <div className="font-semibold text-slate-900">{item.description}</div>
                        </td>
                        <td className="py-3.5 px-2 text-center num-tabular text-slate-600">
                          {formatQty(item.qty)} {item.unit || ''}
                        </td>
                        <td className="py-3.5 px-2 text-right num-tabular text-slate-600">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="py-3.5 px-2 text-right num-tabular font-bold text-slate-950">
                          {formatMoney(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 4. Minimalist Floating Summary Block */}
              {isLastPage && (
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200">
                  <div className="space-y-2 max-w-sm text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isAr ? 'المبلغ بالحروف' : 'Amount in Words'}
                    </div>
                    <div className="text-slate-800 font-medium leading-relaxed">
                      {displayedTafqeet}
                    </div>
                    {seller.iban && (
                      <div className="text-[10px] text-slate-500 font-mono pt-1">
                        Bank: {seller.bankName} | IBAN: {seller.iban}
                      </div>
                    )}
                  </div>

                  <div className="w-full sm:w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 num-tabular">
                      <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                      <span>{formatMoney(totals.subtotal)} {currencySymbol}</span>
                    </div>
                    {totals.totalDiscount > 0 && (
                      <div className="flex justify-between text-rose-600 num-tabular">
                        <span>{isAr ? 'الخصم:' : 'Discount:'}</span>
                        <span>-{formatMoney(totals.totalDiscount)} {currencySymbol}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 num-tabular">
                      <span>{isAr ? market.taxShortLabelAr : market.taxShortLabelEn} ({totals.vatRate}%):</span>
                      <span>{formatMoney(totals.vatAmount)} {currencySymbol}</span>
                    </div>
                    <div className="border-t border-slate-900 pt-2 flex justify-between items-baseline num-tabular">
                      <span className="text-sm font-bold text-slate-900">{isAr ? 'الصافي الإجمالي:' : 'Total:'}</span>
                      <span className="text-2xl font-black text-slate-950">
                        {formatMoney(totals.finalTotal)} <span className="text-sm font-semibold">{currencySymbol}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Minimalist Discreet Footer */}
            <footer className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <div>
                <span>{seller.arabicName || seller.englishName}</span> • <span>E-Invoice Compliance</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                <SafeQRCode
                  value={invoice.qrMode === 'zatca' ? zatcaQrBase64 : publicUrl}
                  size={105}
                  level="L"
                  includeMargin={false}
                />
              </div>
            </footer>
          </div>
        );
      })}
    </div>
  );
};
