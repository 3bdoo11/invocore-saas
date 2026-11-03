import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
import { encodePublicInvoiceUrl } from '../utils/zatcaQr';

interface ReceiptVoucherA4SheetProps {
  invoice: InvoiceData;
  seller: SellerInfo;
}

export const ReceiptVoucherA4Sheet: React.FC<ReceiptVoucherA4SheetProps> = ({
  invoice,
  seller,
}) => {
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
    () => numberToArabicTafqeet(voucherAmount),
    [voucherAmount]
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
      : `دفعة من فاتورة رقم (${invoice.invoiceNumber}) بتاريخ ${invoice.date}`;

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
      dir="rtl"
      style={{
        borderColor: primaryColor,
        fontFamily: seller.fontFamily || "'Tajawal', 'Cairo', sans-serif",
      }}
      className={`invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-7 ${
        templateStyle === 'classic'
          ? 'border-4 border-double'
          : templateStyle === 'modern'
          ? 'border-t-8 border-x border-b border-slate-200'
          : 'border border-slate-200'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* HEADER SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 pb-4 mb-5">
        <div className="flex justify-between items-start gap-4">
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
                {seller.arabicName ? seller.arabicName.slice(0, 2) : 'IC'}
              </div>
            )}
            <div>
              <h1 style={{ color: primaryColor }} className="text-lg font-black leading-tight">
                {seller.arabicName || 'منصة InvoCore'}
              </h1>
              <div className="text-[11px] font-bold text-slate-500">
                {seller.englishName || 'InvoCore B2B Platform'}
              </div>
              <div className="text-[10px] font-semibold text-slate-600 mt-1 space-x-2 space-x-reverse num-tabular">
                {seller.crNumber && <span>س.ت: <strong>{seller.crNumber}</strong></span>}
                {seller.taxNumber && <span>الرقم الضريبي: <strong>{seller.taxNumber}</strong></span>}
              </div>
            </div>
          </div>

          <div className="text-left">
            <div
              style={{ backgroundColor: primaryColor }}
              className="text-white px-4 py-1.5 rounded-lg text-center shadow-xs"
            >
              <div className="text-[14px] font-black">سند قبض مالي</div>
              <div className="text-[8.5px] font-bold tracking-widest uppercase opacity-90">RECEIPT VOUCHER</div>
            </div>
            <div className="text-[11px] font-extrabold text-slate-700 mt-2 space-y-0.5 num-tabular" dir="ltr">
              <div>Voucher No: <span className="font-black text-slate-900">{receiptNumber}</span></div>
              <div>Date: <span className="font-bold">{receiptDate} ({formattedTime12h})</span></div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* VOUCHER AMOUNT HIGHLIGHT BANNER                                */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{ backgroundColor: `${primaryColor}0c`, borderColor: primaryColor }}
        className="border-r-4 rounded-xl p-4 mb-6 flex items-center justify-between"
      >
        <div>
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            المبلغ المقبوض / RECEIVED AMOUNT
          </div>
          <div style={{ color: primaryColor }} className="text-[13.5px] font-black mt-0.5">
            {displayedAmountWords}
          </div>
        </div>
        <div className="text-left bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs" dir="ltr">
          <div className="text-[10px] font-bold text-slate-400">SAR</div>
          <div className="text-2xl font-black text-slate-900 num-tabular">
            {formatMoney(voucherAmount)} <span className="text-base font-bold">﷼</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VOUCHER FORM FIELDS                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4 mb-6 text-xs">
        <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between">
          <span className="font-bold text-slate-500 w-36 shrink-0">استلمنا من المكرم / السادة:</span>
          <span className="font-black text-slate-900 text-sm flex-1 text-right">{receivedFrom}</span>
        </div>

        <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between">
          <span className="font-bold text-slate-500 w-36 shrink-0">وذلك مقابل (البيان):</span>
          <span className="font-bold text-slate-800 flex-1 text-right">{forReason}</span>
        </div>

        <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
          <span className="font-bold text-slate-500 w-36 shrink-0">طريقة التحصيل:</span>
          <div className="flex items-center gap-2 flex-1">
            {PAYMENT_METHODS.map((pm) => (
              <span
                key={pm}
                style={
                  activePaymentMethod === pm
                    ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                    : undefined
                }
                className={`text-[11px] font-extrabold px-3 py-1 rounded-lg transition-colors ${
                  activePaymentMethod === pm
                    ? ''
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pm}
              </span>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between">
          <span className="font-bold text-slate-500 w-36 shrink-0">الفاتورة المرتبطة:</span>
          <span className="font-extrabold text-slate-800 flex-1 text-right num-tabular">
            فاتورة ضريبية رقم #{invoice.invoiceNumber}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACCOUNT RECONCILIATION SUMMARY TABLE                          */}
      {/* ------------------------------------------------------------- */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 text-xs">
        <table className="w-full text-center">
          <thead style={{ backgroundColor: `${primaryColor}10` }} className="border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="py-2 px-3">إجمالي الفاتورة المرتبطة</th>
              <th className="py-2 px-3">المبلغ المقبوض بهذا السند</th>
              <th className="py-2 px-3">الرصيد المتبقي على العميل</th>
            </tr>
          </thead>
          <tbody className="font-extrabold num-tabular divide-y divide-slate-100">
            <tr>
              <td className="py-2.5">{formatMoney(totals.finalTotal)} ر.س</td>
              <td style={{ color: primaryColor }} className="py-2.5 font-black">{formatMoney(voucherAmount)} ر.س</td>
              <td className="py-2.5 text-amber-700">{formatMoney(remainingBalance)} ر.س</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SIGNATURES & QR FOOTER                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-end">
        <div className="flex gap-10">
          <div className="text-center space-y-2">
            <div className="text-[11px] font-bold text-slate-500">توقيع المستلم</div>
            {receiverName ? <div className="text-xs font-bold">{receiverName}</div> : <div className="h-5" />}
            <div className="border-b border-slate-400 w-32" />
          </div>
          <div className="text-center space-y-2">
            <div className="text-[11px] font-bold text-slate-500">المحاسب المسؤول / الاعتماد</div>
            {accountantName ? <div className="text-xs font-bold">{accountantName}</div> : <div className="h-5" />}
            <div className="border-b border-slate-400 w-32" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left text-[9.5px] text-slate-400 space-y-0.5">
            <div>سند إلكتروني رسمي معتمد</div>
            <div>{seller.arabicName}</div>
          </div>
          <div className="p-1 border border-slate-200 rounded-lg bg-white shadow-xs">
            <QRCodeSVG value={publicUrl} size={72} level="L" includeMargin={false} />
          </div>
        </div>
      </div>
    </div>
  );
};
