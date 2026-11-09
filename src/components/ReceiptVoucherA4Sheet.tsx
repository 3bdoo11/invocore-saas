import React, { useMemo } from 'react';
import { SafeQRCode } from './SafeQRCode';
import { PAYMENT_METHODS } from '../constants/defaults';
import {
  InvoiceData,
  PaymentMethod,
  SellerInfo,
} from '../types/invoice';
import {
  calculateInvoiceTotals,
  formatMoney,
  formatTime12hArabic,
} from '../utils/formatters';
import { numberToArabicTafqeet } from '../utils/tafqeet';
import { numberToEnglishWords } from '../utils/numberToWordsEn';
import { encodePublicInvoiceUrl } from '../utils/zatcaQr';
import { TrialWatermark } from './TrialWatermark';
import { InvoCoreLogo } from './InvoCoreLogo';
import { getMarketConfig } from '../constants/jurisdictions';

interface ReceiptVoucherA4SheetProps {
  invoice: InvoiceData;
  seller: SellerInfo;
  isWatermarked?: boolean;
  lang?: 'ar' | 'en';
}

export const ReceiptVoucherA4Sheet: React.FC<ReceiptVoucherA4SheetProps> = ({
  invoice,
  seller,
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

  const rv = invoice.receiptVoucher || {};

  const receiptNumber =
    rv.receiptNumber && rv.receiptNumber.trim() !== ''
      ? rv.receiptNumber
      : `RV-${invoice.invoiceNumber}`;

  const receiptDate = rv.date && rv.date.trim() !== '' ? rv.date : invoice.date;
  const receiptTime = rv.time && rv.time.trim() !== '' ? rv.time : invoice.time;
  const formattedTime12h = useMemo(
    () => formatTime12hArabic(receiptTime),
    [receiptTime]
  );

  const receivedFrom =
    rv.receivedFrom && rv.receivedFrom.trim() !== ''
      ? rv.receivedFrom
      : invoice.client.name
        ? invoice.client.name
        : (isAr ? 'عميل نقدي' : 'Cash Client');

  const voucherAmount =
    rv.amount !== undefined && rv.amount !== null && Number.isFinite(rv.amount)
      ? Math.max(0, Number(rv.amount))
      : invoice.paidAmount > 0
        ? invoice.paidAmount
        : totals.finalTotal;

  const autoAmountWords = useMemo(
    () =>
      isAr
        ? numberToArabicTafqeet(voucherAmount, market.code)
        : numberToEnglishWords(voucherAmount, market.majorUnitEn, market.minorUnitEn),
    [voucherAmount, isAr, market]
  );

  const displayedAmountWords =
    rv.amountInWordsManual !== undefined &&
    rv.amountInWordsManual !== null &&
    rv.amountInWordsManual.trim() !== ''
      ? rv.amountInWordsManual
      : autoAmountWords;

  const forReason =
    rv.forReason !== undefined && rv.forReason.trim() !== ''
      ? rv.forReason
      : isAr
      ? `سداد دفعة من فاتورة رقم (${invoice.invoiceNumber}) بتاريخ ${invoice.date}`
      : `Payment settlement for Invoice #${invoice.invoiceNumber} dated ${invoice.date}`;

  const activePaymentMethod: PaymentMethod =
    rv.paymentMethod || invoice.paymentMethod || 'نقدي';

  const receiverName = rv.receiverName || '';
  const accountantName = rv.accountantName || '';

  const publicUrl = useMemo(
    () => encodePublicInvoiceUrl(invoice, seller, lang),
    [invoice, seller, lang]
  );

  const remainingBalance = Math.max(0, totals.finalTotal - voucherAmount);
  const primaryColor = seller.primaryColor || '#0F172A';
  const templateStyle = seller.templateStyle || 'modern';

  // =========================================================================
  // TEMPLATE A: EXECUTIVE MODERN
  // =========================================================================
  if (templateStyle === 'modern') {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          fontFamily:
            seller.fontFamily ||
            (isAr
              ? "'Tajawal', 'Cairo', sans-serif"
              : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
        }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border rounded-2xl overflow-hidden border border-slate-200"
      >
        {isWatermarked && <TrialWatermark />}

        <div>
          {/* Full-Bleed Solid Brand Banner */}
          <header
            style={{ backgroundColor: primaryColor }}
            className="p-6 text-white relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
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
                      ? seller.arabicName || 'منصة InvoCore'
                      : seller.englishName || seller.arabicName || 'InvoCore Technologies'}
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
                  <div className="text-[10px] text-white/80 font-mono mt-1 flex flex-wrap gap-3 num-tabular">
                    {seller.crNumber && (
                      <span>
                        {market.crNumberLabelAr}: {seller.crNumber}
                      </span>
                    )}
                    {seller.taxNumber && (
                      <span>
                        {market.taxNumberLabelAr}: {seller.taxNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Glass Summary Strip */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-white min-w-[200px] text-left shrink-0">
                <div className="flex items-center justify-between gap-3 text-xs mb-1">
                  <span className="text-[10px] uppercase font-bold text-white/70">
                    {isAr ? 'نوع السند' : 'VOUCHER TYPE'}
                  </span>
                  <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-[11px]">
                    {receiptNumber}
                  </span>
                </div>
                <div className="text-sm font-black text-white">
                  {isAr ? 'سند قبض مالي معتمد' : 'OFFICIAL RECEIPT VOUCHER'}
                </div>
                <div className="text-[10px] text-white/80 font-mono mt-1 flex justify-between">
                  <span>{receiptDate}</span>
                  <span>{formattedTime12h}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Form Content / Cards */}
          <div className="p-6 space-y-4">
            {/* Top Hero Highlight Card: Received Amount */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 shadow-xs gap-3">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0"
                >
                  ✓
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {isAr ? 'المبلغ المستلم نقداً / قيداً' : 'Total Amount Received'}
                  </div>
                  <div
                    style={{ color: primaryColor }}
                    className="text-2xl font-black font-mono tracking-tight num-tabular mt-0.5"
                  >
                    {formatMoney(voucherAmount)} {currencySymbol}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {isAr ? 'طريقة التحصيل:' : 'Payment Mode:'}
                </span>
                <span
                  style={{ backgroundColor: primaryColor }}
                  className="px-3 py-1 rounded-lg text-white font-bold text-xs shadow-xs"
                >
                  {activePaymentMethod === 'آجل' && !isAr
                    ? 'Credit'
                    : activePaymentMethod === 'نقدي' && !isAr
                    ? 'Cash'
                    : activePaymentMethod === 'تحويل بنكي' && !isAr
                    ? 'Wire Transfer'
                    : activePaymentMethod === 'شبكة' && !isAr
                    ? 'POS'
                    : activePaymentMethod}
                </span>
              </div>
            </div>

            {/* Card 1: Received From */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'استلمنا من المكرم / السادة (Received From)' : 'Received From (Customer / Client)'}
              </div>
              <div className="text-sm font-black text-slate-900 border-b border-dashed border-slate-200 pb-1.5">
                {receivedFrom}
              </div>
            </div>

            {/* Card 2: Amount in Words */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'مبلغ وقدره كتابةً (The Sum Of)' : 'The Sum Of (Amount in Words)'}
              </div>
              <div
                style={{ color: primaryColor }}
                className="text-xs font-black border-b border-dashed border-slate-200 pb-1.5"
              >
                {displayedAmountWords}
              </div>
            </div>

            {/* Card 3: For Reason */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'وذلك سداداً عن / مقابل (Being Payment For)' : 'Being Payment For (Reason / Reference)'}
              </div>
              <div className="text-xs font-bold text-slate-800 border-b border-dashed border-slate-200 pb-1.5">
                {forReason}
              </div>
            </div>

            {/* Settlement & Balance Breakdown */}
            <div className="grid grid-cols-12 gap-3 pt-1">
              <div className="col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700">
                  {isAr ? 'خيارات وطرق السداد المعتمدة:' : 'Settlement Mode & Bank Details:'}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = pm === activePaymentMethod;
                    const label =
                      pm === 'آجل' && !isAr
                        ? 'Credit'
                        : pm === 'نقدي' && !isAr
                        ? 'Cash'
                        : pm === 'تحويل بنكي' && !isAr
                        ? 'Wire Transfer'
                        : pm === 'شبكة' && !isAr
                        ? 'POS'
                        : pm;
                    return (
                      <span
                        key={pm}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        <span className={isSelected ? 'text-amber-400' : 'text-slate-300'}>
                          {isSelected ? '●' : '○'}
                        </span>
                        <span>{label}</span>
                      </span>
                    );
                  })}
                </div>
                {seller.iban && (
                  <div className="text-[10px] text-slate-500 pt-1 font-mono">
                    <span className="font-sans font-semibold text-slate-600">
                      {isAr ? 'الآيبان البنكي للمنشأة:' : 'Company IBAN:'}
                    </span>{' '}
                    <strong className="text-slate-800">{seller.iban}</strong>
                  </div>
                )}
              </div>

              <div className="col-span-4 border border-slate-200 rounded-xl p-3.5 bg-white space-y-2 text-[11px] shadow-2xs num-tabular">
                <div className="flex justify-between text-slate-500 text-[10.5px]">
                  <span>{isAr ? 'إجمالي الفاتورة:' : 'Invoice Total:'}</span>
                  <span className="font-bold text-slate-700">
                    {formatMoney(totals.finalTotal)} {currencySymbol}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1.5">
                  <span>{isAr ? 'المدفوع بهذا السند:' : 'Paid via Voucher:'}</span>
                  <span>
                    {formatMoney(voucherAmount)} {currencySymbol}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1.5 text-xs">
                  <span>{isAr ? 'الرصيد المتبقي:' : 'Balance Due:'}</span>
                  <span>
                    {formatMoney(remainingBalance)} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 pt-6 pb-2">
              <div className="text-center space-y-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-500">
                  {isAr ? 'المستلم / أمين الصندوق' : 'Received By / Cashier'}
                </div>
                <div className="text-sm font-black text-slate-900 min-h-[22px]">
                  {receiverName || '...........................................'}
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-1 max-w-[200px] mx-auto">
                  {isAr ? 'التوقيع والختم المالي' : 'Signature & Official Seal'}
                </div>
              </div>

              <div className="text-center space-y-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-500">
                  {isAr ? 'المحاسب المعتمد' : 'Certified Accountant'}
                </div>
                <div className="text-sm font-black text-slate-900 min-h-[22px]">
                  {accountantName || '...........................................'}
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-1 max-w-[200px] mx-auto">
                  {isAr ? 'التدقيق والاعتماد' : 'Audited & Authorized'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Footer & Verification Badge */}
        <footer className="p-6 pt-3 border-t border-slate-200 mt-auto flex items-center justify-between">
          <div className="text-[10px] font-semibold text-slate-500 space-y-0.5">
            <div>
              {isAr
                ? 'سند إلكتروني رسمي معتمد صادر من منصة InvoCore للفوترة الذكية'
                : 'Official Electronic Receipt Voucher issued via InvoCore Smart Billing Platform'}
            </div>
            <div className="text-slate-400 text-[9px]">
              {isAr
                ? 'الوثيقة صالحة كإثبات سداد مالي رسمي ومطابقة لمعايير الضوابط المالية والمحاسبية'
                : 'This document serves as an official proof of payment and accounting settlement'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`text-[9.5px] text-slate-400 space-y-0.5 ${isAr ? 'text-left' : 'text-right'}`}>
              <div>{isAr ? 'رمز التحقق الرقمي' : 'Digital Verification'}</div>
              <div className="font-bold text-slate-600">
                {isAr ? seller.arabicName : seller.englishName || seller.arabicName}
              </div>
            </div>
            <div className="p-2 border border-slate-200 rounded-lg bg-white shadow-xs shrink-0">
              <SafeQRCode value={publicUrl} size={105} level="L" includeMargin={false} />
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // TEMPLATE B: CORPORATE CLASSIC GRID (FORMAL ACCOUNTING LEDGER)
  // =========================================================================
  if (templateStyle === 'classic') {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          fontFamily:
            seller.fontFamily ||
            (isAr
              ? "'Amiri', 'Traditional Arabic', serif"
              : "Georgia, 'Times New Roman', serif"),
        }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border p-7 border-4 border-double border-slate-900"
      >
        {isWatermarked && <TrialWatermark />}

        <div>
          {/* Formal Accounting Header: Arabic Right, English Left, Centered Emblem Title */}
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
                    {isAr ? 'سند قبض مالي' : 'RECEIPT VOUCHER'}
                  </div>
                  <div className="text-[9px] font-bold text-slate-700 tracking-wider uppercase">
                    {isAr ? 'OFFICIAL RECEIPT VOUCHER' : 'ACCOUNTS RECEIVABLE'}
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
                  VOUCHER #{receiptNumber}
                </div>
                <div className="text-[10px] font-bold text-slate-700 num-tabular">
                  DATE: {receiptDate} | {receiptTime}
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

          {/* Full Structured Accounting Ledger Grid Table */}
          <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-4">
            <tbody>
              {/* Row 1: Amount & Voucher No */}
              <tr>
                <td className="w-1/4 bg-slate-100 p-2 font-black border border-slate-900 text-slate-800">
                  {isAr ? 'المبلغ المستلم بالأرقام:' : 'Amount Received (Figures):'}
                </td>
                <td className="w-2/4 p-2 font-mono font-black text-base border border-slate-900 text-slate-950 num-tabular bg-slate-50">
                  {formatMoney(voucherAmount)} {currencySymbol}
                </td>
                <td className="w-1/4 bg-slate-100 p-2 font-bold border border-slate-900 text-slate-800 text-center">
                  <span className="text-[10px] block font-bold text-slate-500">
                    {isAr ? 'طريقة السداد' : 'Payment Mode'}
                  </span>
                  <span className="font-black text-slate-900">
                    {activePaymentMethod === 'آجل' && !isAr
                      ? 'Credit'
                      : activePaymentMethod === 'نقدي' && !isAr
                      ? 'Cash'
                      : activePaymentMethod === 'تحويل بنكي' && !isAr
                      ? 'Wire Transfer'
                      : activePaymentMethod === 'شبكة' && !isAr
                      ? 'POS'
                      : activePaymentMethod}
                  </span>
                </td>
              </tr>

              {/* Row 2: Received From */}
              <tr>
                <td className="bg-slate-100 p-2 font-black border border-slate-900 text-slate-800">
                  {isAr ? 'استلمنا من المكرم / السادة:' : 'Received From:'}
                </td>
                <td colSpan={2} className="p-2 font-bold text-sm border border-slate-900 text-slate-900">
                  {receivedFrom}
                </td>
              </tr>

              {/* Row 3: Amount in Words */}
              <tr>
                <td className="bg-slate-100 p-2 font-black border border-slate-900 text-slate-800">
                  {isAr ? 'المبلغ كتابة وتفقيطاً:' : 'Amount in Words:'}
                </td>
                <td colSpan={2} className="p-2 font-black border border-slate-900 text-slate-900">
                  {displayedAmountWords}
                </td>
              </tr>

              {/* Row 4: Reason / Reference */}
              <tr>
                <td className="bg-slate-100 p-2 font-black border border-slate-900 text-slate-800">
                  {isAr ? 'وذلك سداداً عن / مقابل:' : 'Being Payment For:'}
                </td>
                <td colSpan={2} className="p-2 font-medium border border-slate-900 text-slate-900">
                  {forReason}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Structured Accounting Ledger Balances */}
          <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-4">
            <thead>
              <tr className="bg-slate-100 text-center font-black">
                <th className="p-2 border border-slate-900 w-1/3">
                  {isAr ? 'إجمالي قيمة الفاتورة' : 'Original Invoice Total'}
                </th>
                <th className="p-2 border border-slate-900 w-1/3">
                  {isAr ? 'المدفوع بهذا السند' : 'Amount Paid via Voucher'}
                </th>
                <th className="p-2 border border-slate-900 w-1/3">
                  {isAr ? 'المتبقي ذمة مستحقة' : 'Remaining Balance Due'}
                </th>
              </tr>
            </thead>
            <tbody className="text-center font-mono font-bold text-sm num-tabular">
              <tr>
                <td className="p-2 border border-slate-900 text-slate-800">
                  {formatMoney(totals.finalTotal)} {currencySymbol}
                </td>
                <td className="p-2 border border-slate-900 text-emerald-800 bg-emerald-50 font-black">
                  {formatMoney(voucherAmount)} {currencySymbol}
                </td>
                <td className="p-2 border border-slate-900 text-slate-950 font-black">
                  {formatMoney(remainingBalance)} {currencySymbol}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment Methods Checkboxes Matrix */}
          <div className="border-2 border-slate-900 p-2.5 mb-4 bg-slate-50/50">
            <div className="text-[11px] font-black text-slate-800 mb-1">
              {isAr ? 'وسيلة التحصيل والقيد المحاسبي:' : 'Payment Settlement Mode:'}
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = pm === activePaymentMethod;
                const label =
                  pm === 'آجل' && !isAr
                    ? 'Credit'
                    : pm === 'نقدي' && !isAr
                    ? 'Cash'
                    : pm === 'تحويل بنكي' && !isAr
                    ? 'Wire Transfer'
                    : pm === 'شبكة' && !isAr
                    ? 'POS'
                    : pm;
                return (
                  <span key={pm} className="inline-flex items-center gap-1.5 font-bold">
                    <span className="inline-block w-4 h-4 border border-slate-900 text-center leading-3 font-mono font-black text-xs bg-white">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Formal 3-Column Signatures & Official Stamp Grid */}
        <div className="border-t-2 border-slate-900 pt-3">
          <div className="grid grid-cols-12 gap-2">
            {/* Box 1: Receiver / Cashier */}
            <div className="col-span-4 border-2 border-slate-900 p-2.5 text-center min-h-[128px] flex flex-col justify-between">
              <div className="text-[10px] font-black uppercase text-slate-700">
                {isAr ? 'المستلم / أمين الصندوق' : 'Receiver / Cashier'}
              </div>
              <div className="text-xs font-bold text-slate-900 min-h-[16px]">
                {receiverName || '...............................'}
              </div>
              <div className="border-t border-dotted border-slate-400 text-[9px] text-slate-500 pt-0.5">
                {isAr ? 'التوقيع' : 'Signature'}
              </div>
            </div>

            {/* Box 2: Certified Accountant */}
            <div className="col-span-4 border-2 border-slate-900 p-2.5 text-center min-h-[128px] flex flex-col justify-between">
              <div className="text-[10px] font-black uppercase text-slate-700">
                {isAr ? 'المحاسب المالي' : 'Accountant'}
              </div>
              <div className="text-xs font-bold text-slate-900 min-h-[16px]">
                {accountantName || '...............................'}
              </div>
              <div className="border-t border-dotted border-slate-400 text-[9px] text-slate-500 pt-0.5">
                {isAr ? 'التوقيع والاعتماد' : 'Audited & Approved'}
              </div>
            </div>

            {/* Box 3: Official Seal & QR */}
            <div className="col-span-4 border-2 border-dashed border-slate-900 p-2 text-center flex items-center justify-between min-h-[128px] bg-slate-50/50 gap-2">
              <div className="flex-1 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                {isAr ? 'الختم الرسمي للمنشأة' : 'Official Seal'}
              </div>
              <div className="shrink-0 p-2 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <SafeQRCode value={publicUrl} size={105} level="L" includeMargin={false} />
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
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        fontFamily:
          seller.fontFamily ||
          "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
      }}
      className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border p-8 border border-slate-200"
    >
      {isWatermarked && <TrialWatermark />}

      <div>
        {/* Ultra-Clean Architectural Header */}
        <header className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-slate-900 uppercase">
                {isAr ? 'سند قبض' : 'RECEIPT'}
              </h1>
              <div className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mt-1">
                {isAr ? 'سند قبض مالي إلكتروني' : 'OFFICIAL ACCOUNTS RECEIVABLE VOUCHER'}
              </div>
            </div>

            <div className={`flex flex-col ${isAr ? 'items-start text-right' : 'items-end text-left'}`}>
              {seller.logoDataUrl ? (
                <img
                  src={seller.logoDataUrl}
                  alt="Logo"
                  className="max-h-12 max-w-28 object-contain mb-2"
                />
              ) : (
                <div className="mb-2">
                  <InvoCoreLogo size={36} variant="dark" />
                </div>
              )}
              <div className="text-sm font-bold text-slate-900">
                {isAr
                  ? seller.arabicName || 'منصة InvoCore'
                  : seller.englishName || seller.arabicName || 'InvoCore Technologies'}
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
                {isAr ? 'رقم السند' : 'Voucher No.'}
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5 num-tabular">
                #{receiptNumber}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'تاريخ السند' : 'Receipt Date'}
              </div>
              <div className="font-medium text-slate-900 mt-0.5 num-tabular">{receiptDate}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'وسيلة التحصيل' : 'Payment Mode'}
              </div>
              <div className="font-medium text-slate-900 mt-0.5">
                {activePaymentMethod === 'آجل' && !isAr
                  ? 'Credit'
                  : activePaymentMethod === 'نقدي' && !isAr
                  ? 'Cash'
                  : activePaymentMethod === 'تحويل بنكي' && !isAr
                  ? 'Wire Transfer'
                  : activePaymentMethod === 'شبكة' && !isAr
                  ? 'POS'
                  : activePaymentMethod}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'المبلغ المستلم' : 'Amount Received'}
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5 num-tabular">
                {formatMoney(voucherAmount)} {currencySymbol}
              </div>
            </div>
          </div>
        </header>

        {/* Customer / Received From Section with Micro-Labels */}
        <div className="mb-6 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {isAr ? 'استلمنا من (Received From)' : 'Received From'}
            </div>
            <div className="text-base font-bold text-slate-900">{receivedFrom}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {isAr ? 'المبلغ كتابةً وتفقيطاً (The Sum Of)' : 'Amount in Words'}
            </div>
            <div className="text-sm font-medium text-slate-800 italic">
              {displayedAmountWords}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {isAr ? 'وذلك سداداً عن / مقابل (Being Payment For)' : 'Reason / Reference'}
            </div>
            <div className="text-xs text-slate-700">{forReason}</div>
          </div>
        </div>

        {/* Open Whitespace Accounting Summary */}
        <div className="border-t border-b border-slate-200 py-4 my-6">
          <div className="grid grid-cols-3 gap-6 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'إجمالي الفاتورة' : 'Invoice Total'}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-1 num-tabular">
                {formatMoney(totals.finalTotal)} {currencySymbol}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'المستلم بهذا السند' : 'Amount Received'}
              </div>
              <div className="text-sm font-bold text-emerald-700 mt-1 num-tabular">
                {formatMoney(voucherAmount)} {currencySymbol}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'الرصيد المتبقي' : 'Balance Remaining'}
              </div>
              <div className="text-sm font-black text-slate-900 mt-1 num-tabular">
                {formatMoney(remainingBalance)} {currencySymbol}
              </div>
            </div>
          </div>
        </div>

        {/* Architectural Signature Strip */}
        <div className="grid grid-cols-2 gap-12 pt-8 pb-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-8">
              {isAr ? 'المستلم / أمين الصندوق' : 'Received By / Cashier'}
            </div>
            <div className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-800 min-h-[20px]">
              {receiverName}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-8">
              {isAr ? 'المحاسب المعتمد' : 'Certified Accountant'}
            </div>
            <div className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-800 min-h-[20px]">
              {accountantName}
            </div>
          </div>
        </div>
      </div>

      {/* Discreet Minimalist Footer */}
      <footer className="pt-6 border-t border-slate-200 mt-auto flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-900">
            {isAr ? seller.arabicName : seller.englishName || seller.arabicName}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isAr
              ? 'سند قبض مالي إلكتروني رسمي معتمد'
              : 'Official Electronic Receipt Voucher'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-[10px] text-slate-400 font-mono">
            <div>#{receiptNumber}</div>
            <div>{receiptDate}</div>
          </div>
          <div className="p-2 border border-slate-200 rounded-lg bg-white shadow-2xs shrink-0">
            <SafeQRCode value={publicUrl} size={105} level="L" includeMargin={false} />
          </div>
        </div>
      </footer>
    </div>
  );
};
