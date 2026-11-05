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
        : '................................................';

  const voucherAmount =
    rv.amount !== undefined && rv.amount !== null && Number.isFinite(rv.amount)
      ? Math.max(0, Number(rv.amount))
      : invoice.paidAmount > 0
        ? invoice.paidAmount
        : totals.finalTotal;

  const autoAmountWords = useMemo(
    () => (isAr ? numberToArabicTafqeet(voucherAmount) : numberToEnglishWords(voucherAmount)),
    [voucherAmount, isAr]
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
      ? `دفعة من فاتورة رقم (${invoice.invoiceNumber}) بتاريخ ${invoice.date}`
      : `Payment for Invoice #${invoice.invoiceNumber} dated ${invoice.date}`;

  const activePaymentMethod: PaymentMethod =
    rv.paymentMethod || invoice.paymentMethod || 'نقدي';

  const receiverName = rv.receiverName || '';
  const accountantName = rv.accountantName || '';

  const publicUrl = useMemo(
    () => encodePublicInvoiceUrl(invoice, seller),
    [invoice, seller]
  );

  const remainingBalance = Math.max(0, totals.finalTotal - voucherAmount);
  const primaryColor = seller.primaryColor || '#0F172A';
  const templateStyle = seller.templateStyle || 'modern';

  return (
    <div
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
      {/* HEADER SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex justify-between items-start gap-4">
          {/* Company Brand & Logo */}
          <div className="flex items-center gap-3">
            {seller.logoDataUrl ? (
              <img
                src={seller.logoDataUrl}
                alt="Company Logo"
                className="max-h-16 max-w-36 object-contain rounded-lg border border-slate-200 p-1 bg-white"
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

          {/* Voucher Badge & Metadata */}
          <div className={`flex flex-col ${isAr ? 'items-end text-left' : 'items-start text-right'}`}>
            <div
              style={{ backgroundColor: primaryColor }}
              className="text-white px-4 py-2 rounded-xl text-center shadow-sm"
            >
              <div className="text-base font-black tracking-tight">
                {isAr ? 'سند قبض مالي' : 'OFFICIAL RECEIPT VOUCHER'}
              </div>
              <div className="text-[9px] font-bold tracking-widest uppercase opacity-90">
                {isAr ? 'OFFICIAL RECEIPT VOUCHER' : 'ACCOUNTS RECEIVABLE'}
              </div>
            </div>
            <div className="text-xs font-black text-slate-800 mt-2.5 space-y-0.5 num-tabular" dir="ltr">
              <div>Voucher No: <span style={{ color: primaryColor }} className="font-mono text-sm">{receiptNumber}</span></div>
              <div className="text-slate-600 font-bold text-[11px]">Date: {receiptDate}</div>
              <div className="text-slate-500 text-[10px]">{formattedTime12h}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* VOUCHER BODY / FORM GRID                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4 text-xs font-semibold text-slate-800 flex-1">
        {/* Row 1: Amount in Numbers Box */}
        <div className="flex justify-between items-center bg-slate-50 border-2 border-slate-300 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wide">
              {isAr ? 'المبلغ المستلم:' : 'Amount Received:'}
            </span>
            <div
              style={{ color: primaryColor }}
              className="text-2xl font-black font-mono tracking-tight num-tabular"
            >
              {formatMoney(voucherAmount)} {isAr ? 'ر.س' : 'SAR'}
            </div>
          </div>

          <div className="text-right text-[11px] font-bold text-slate-500">
            {isAr ? 'طريقة التحصيل:' : 'Payment Mode:'}{' '}
            <span
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="px-2.5 py-0.5 rounded-full font-black"
            >
              {activePaymentMethod === 'آجل' && !isAr ? 'Credit' : activePaymentMethod === 'نقدي' && !isAr ? 'Cash' : activePaymentMethod === 'تحويل بنكي' && !isAr ? 'Wire Transfer' : activePaymentMethod === 'شبكة' && !isAr ? 'POS' : activePaymentMethod}
            </span>
          </div>
        </div>

        {/* Row 2: Received From */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
          <div className="text-[10.5px] font-bold text-slate-400">
            {isAr ? 'استلمنا من المكرم / السادة:' : 'Received From (Customer / Client):'}
          </div>
          <div className="text-sm font-black text-slate-900 border-b border-dashed border-slate-300 pb-1">
            {receivedFrom}
          </div>
        </div>

        {/* Row 3: Amount in Words */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
          <div className="text-[10.5px] font-bold text-slate-400">
            {isAr ? 'مبلغ وقدره (كتابة وتفقيطاً):' : 'The Sum Of (Amount in Words):'}
          </div>
          <div style={{ color: primaryColor }} className="text-xs font-black border-b border-dashed border-slate-300 pb-1">
            {displayedAmountWords}
          </div>
        </div>

        {/* Row 4: Reason / Description */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
          <div className="text-[10.5px] font-bold text-slate-400">
            {isAr ? 'وذلك سداداً عن / مقابل:' : 'Being Payment For (Reason / Reference):'}
          </div>
          <div className="text-xs font-bold text-slate-800 border-b border-dashed border-slate-300 pb-1">
            {forReason}
          </div>
        </div>

        {/* Row 5: Payment Breakdown & Bank Details */}
        <div className="grid grid-cols-12 gap-3 pt-1">
          <div className="col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-[11px]">
            <div className="font-bold text-slate-600">
              {isAr ? 'طرق الدفع والتسوية:' : 'Payment Mode & Details:'}
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = pm === activePaymentMethod;
                const label = pm === 'آجل' && !isAr ? 'Credit' : pm === 'نقدي' && !isAr ? 'Cash' : pm === 'تحويل بنكي' && !isAr ? 'Wire Transfer' : pm === 'شبكة' && !isAr ? 'POS' : pm;
                return (
                  <span
                    key={pm}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border ${
                      isSelected
                        ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-xs'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    <span>{isSelected ? '☑' : '☐'}</span>
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
            {seller.iban && (
              <div className="text-[10px] text-slate-500 pt-1">
                {isAr ? 'الآيبان البنكي للمنشأة:' : 'Company IBAN:'} <span className="font-mono font-bold text-slate-800">{seller.iban}</span>
              </div>
            )}
          </div>

          <div className="col-span-4 border border-slate-300 rounded-xl p-3 bg-white space-y-1.5 text-[11px] num-tabular">
            <div className="flex justify-between text-slate-600">
              <span>{isAr ? 'إجمالي الفاتورة:' : 'Invoice Total:'}</span>
              <span className="font-bold">{formatMoney(totals.finalTotal)} {isAr ? 'ر.س' : 'SAR'}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1">
              <span>{isAr ? 'المدفوع بهذا السند:' : 'Paid via Voucher:'}</span>
              <span>{formatMoney(voucherAmount)} {isAr ? 'ر.س' : 'SAR'}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1 text-xs">
              <span>{isAr ? 'الرصيد المتبقي:' : 'Balance Due:'}</span>
              <span>{formatMoney(remainingBalance)} {isAr ? 'ر.س' : 'SAR'}</span>
            </div>
          </div>
        </div>

        {/* Signatures Pod */}
        <div className="grid grid-cols-2 gap-8 pt-8 pb-4">
          <div className="text-center space-y-4">
            <div className="text-xs font-bold text-slate-500">
              {isAr ? 'المستلم / أمين الصندوق' : 'Received By / Cashier'}
            </div>
            <div className="text-sm font-black text-slate-900 min-h-[22px]">
              {receiverName || '...........................................'}
            </div>
            <div className="text-[10px] text-slate-400 border-t border-slate-300 pt-1 max-w-[200px] mx-auto">
              {isAr ? 'التوقيع والختم الرسمي' : 'Signature & Corporate Seal'}
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="text-xs font-bold text-slate-500">
              {isAr ? 'المحاسب المعتمد' : 'Certified Accountant'}
            </div>
            <div className="text-sm font-black text-slate-900 min-h-[22px]">
              {accountantName || '...........................................'}
            </div>
            <div className="text-[10px] text-slate-400 border-t border-slate-300 pt-1 max-w-[200px] mx-auto">
              {isAr ? 'التوقيع والاعتماد' : 'Audited & Approved'}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER & VERIFICATION QR                                      */}
      {/* ------------------------------------------------------------- */}
      <footer className="pt-3 border-t border-slate-200 mt-auto flex items-center justify-between">
        <div className="text-[10px] font-semibold text-slate-500 space-y-0.5">
          <div>
            {isAr
              ? 'سند إلكتروني رسمي معتمد صادر من منصة InvoCore للفوترة الذكية'
              : 'Official Electronic Receipt Voucher issued via InvoCore Smart Billing Platform'}
          </div>
          <div className="text-slate-400">
            {isAr
              ? 'الوثيقة صالحة كإثبات سداد مالي رسمي ومطابقة لمعايير الضوابط المالية'
              : 'This document serves as an official proof of payment and accounting settlement'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-[9.5px] text-slate-400 space-y-0.5 ${isAr ? 'text-left' : 'text-right'}`}>
            <div>{isAr ? 'سند إلكتروني رسمي' : 'Official Electronic Voucher'}</div>
            <div className="font-bold text-slate-600">{isAr ? seller.arabicName : (seller.englishName || seller.arabicName)}</div>
          </div>
          <div className="p-1 border border-slate-200 rounded-lg bg-white shadow-xs">
            <SafeQRCode value={publicUrl} size={72} level="L" includeMargin={false} />
          </div>
        </div>
      </footer>
    </div>
  );
};
