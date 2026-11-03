import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { COMPANY_TEMPLATES, PAYMENT_METHODS } from '../constants/defaults';
import {
  CompanyTemplateId,
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
import { CompanyLogoSvg } from './CompanyBrandAssets';

interface ReceiptVoucherA4SheetProps {
  invoice: InvoiceData;
  seller: SellerInfo;
}

export const ReceiptVoucherA4Sheet: React.FC<ReceiptVoucherA4SheetProps> = ({
  invoice,
  seller,
}) => {
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);

  const templateId: CompanyTemplateId =
    (seller.templateId as CompanyTemplateId) || 1;
  const templateMeta =
    COMPANY_TEMPLATES.find((t) => t.id === templateId) || COMPANY_TEMPLATES[0];

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

  // =========================================================================
  // ARCHITECTURE 1: Wjdcom Co. Ltd (Ultra-Minimalist Accounting Sheet)
  // Matching Wjdcom reference: No outer heavy border box, giant bold balance, hairline rows
  // =========================================================================
  if (templateId === 1) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-8"
      >
        {/* Top Header */}
        <div className="flex justify-between items-start border-b border-slate-300 pb-5 mb-5">
          <div className="text-right space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">سند قبض</h1>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              RECEIPT VOUCHER
            </div>
            <div className="pt-2 text-[12px] font-bold text-slate-700 space-y-0.5">
              <div>رقم السند: <span className="font-extrabold text-slate-900 num-tabular">{receiptNumber}</span></div>
              <div>التاريخ: <span className="font-extrabold text-slate-900 num-tabular">{receiptDate}</span></div>
              <div>الوقت: <span className="font-extrabold text-slate-900 num-tabular">{formattedTime12h}</span></div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-left space-y-1">
              <div className="text-[15px] font-black text-slate-900">{seller.arabicName}</div>
              <div className="text-[11px] font-extrabold text-slate-600">{seller.englishName}</div>
              <div className="text-[10.5px] font-bold text-slate-500 space-y-0.5 num-tabular">
                <div>س.ت: {seller.crNumber}</div>
                <div>الرقم الضريبي: {seller.taxNumber}</div>
                <div>{seller.address}</div>
              </div>
            </div>
            <CompanyLogoSvg templateId={1} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="md" />
          </div>
        </div>

        {/* Giant Bold Balance Highlight Banner (Wjdcom Reference Style) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              المبلغ المقبوض / RECEIVED AMOUNT
            </div>
            <div className="text-[13px] font-extrabold text-slate-700 mt-0.5">
              {displayedAmountWords}
            </div>
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-[11px] font-bold text-slate-400">SAR</div>
            <div className="text-3xl font-black text-slate-950 num-tabular tracking-tight">
              {formatMoney(voucherAmount)} <span className="text-xl font-bold">﷼</span>
            </div>
          </div>
        </div>

        {/* Minimal Hairline Accounting Details */}
        <div className="space-y-4 mb-8">
          <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between">
            <span className="text-[12px] font-bold text-slate-500 w-36 shrink-0">استلمنا من المكرم:</span>
            <span className="text-[14px] font-black text-slate-900 flex-1 text-right">{receivedFrom}</span>
          </div>

          <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between">
            <span className="text-[12px] font-bold text-slate-500 w-36 shrink-0">وذلك مقابل:</span>
            <span className="text-[13px] font-bold text-slate-800 flex-1 text-right">{forReason}</span>
          </div>

          <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 w-36 shrink-0">طريقة التحصيل:</span>
            <div className="flex items-center gap-3 flex-1">
              {PAYMENT_METHODS.map((pm) => (
                <span
                  key={pm}
                  className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded ${
                    activePaymentMethod === pm
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {pm}
                </span>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between">
            <span className="text-[12px] font-bold text-slate-500 w-36 shrink-0">الفاتورة المرجعية:</span>
            <span className="text-[12.5px] font-extrabold text-slate-800 flex-1 text-right num-tabular">
              فاتورة ضريبية رقم #{invoice.invoiceNumber} — إجمالي الفاتورة: {formatMoney(totals.finalTotal)} ر.س
            </span>
          </div>

          <div className="border-b border-slate-200 pb-2.5 flex items-baseline justify-between bg-slate-50/70 p-2 rounded-lg">
            <span className="text-[12px] font-bold text-slate-600 w-36 shrink-0">الرصيد المتبقي:</span>
            <span className="text-[13px] font-black text-amber-900 flex-1 text-right num-tabular">
              {formatMoney(remainingBalance)} ر.س
            </span>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-4 text-center space-y-3">
              <div className="text-[11.5px] font-bold text-slate-600">توقيع المستلم</div>
              {receiverName ? <div className="text-[12px] font-bold">{receiverName}</div> : <div className="h-6" />}
              <div className="border-b border-slate-400 mx-4" />
            </div>

            <div className="col-span-5 text-center space-y-3">
              <div className="text-[11.5px] font-bold text-slate-600">المحاسب المسؤول / الاعتماد</div>
              {accountantName ? <div className="text-[12px] font-bold">{accountantName}</div> : <div className="h-6" />}
              <div className="border-b border-slate-400 mx-6" />
            </div>

            <div className="col-span-3 flex justify-end">
              <div className="p-1 border border-slate-200 rounded">
                <QRCodeSVG value={publicUrl} size={76} level="L" includeMargin={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 2: Kayanat Trading Co. (Modern Split Card Layout)
  // Matching Kayanat reference: Split client/metadata cards, soft gray/teal banner, bottom-right QR
  // =========================================================================
  if (templateId === 2) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-7 border-t-8 border-[#0D9488]"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-right space-y-1">
            <h1 className="text-2xl font-black text-slate-900">سند قبض</h1>
            <p className="text-[11px] font-bold text-[#0D9488] uppercase tracking-wider">TAX RECEIPT VOUCHER</p>
            <div className="text-[11px] font-bold text-slate-600 pt-1">
              <div>{seller.arabicName}</div>
              <div className="text-[10px] text-slate-500">{seller.address}</div>
              <div className="num-tabular text-[10px]">الرقم الضريبي: {seller.taxNumber}</div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <CompanyLogoSvg templateId={2} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="lg" />
          </div>
        </div>

        {/* Modern Split Cards */}
        <div className="grid grid-cols-12 gap-3.5 mb-5">
          {/* Right Card: Client & Account Information */}
          <div className="col-span-7 bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-right">
            <div className="text-[10.5px] font-extrabold text-[#0D9488] border-b border-slate-200 pb-1">
              تفاصيل العميل / المودع
            </div>
            <div className="text-[13.5px] font-black text-slate-900">{receivedFrom}</div>
            <div className="text-[11px] font-bold text-slate-600 num-tabular">
              الرقم الضريبي: {invoice.client.taxNumber || 'غير مسجل'}
            </div>
            {invoice.client.address && (
              <div className="text-[10.5px] text-slate-500">{invoice.client.address}</div>
            )}
            <div className="text-[11px] font-semibold text-slate-700 pt-1">
              البيان: <span className="font-bold">{forReason}</span>
            </div>
          </div>

          {/* Left Card: Voucher Metadata */}
          <div className="col-span-5 bg-teal-50/50 border border-teal-200 rounded-xl p-3.5 space-y-1.5 text-right">
            <div className="text-[10.5px] font-extrabold text-teal-800 border-b border-teal-200 pb-1">
              بيانات السند
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              رقم السند: <strong className="text-teal-900 num-tabular">{receiptNumber}</strong>
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              التاريخ: <span className="num-tabular">{receiptDate}</span>
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              طريقة الدفع: <span className="font-extrabold text-teal-900">{activePaymentMethod}</span>
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              الفاتورة المرجعية: <span className="num-tabular font-extrabold">#{invoice.invoiceNumber}</span>
            </div>
          </div>
        </div>

        {/* Amount Banner */}
        <div className="bg-slate-100/90 border-r-4 border-[#0D9488] rounded-lg p-3.5 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-slate-500 uppercase">المبلغ المقبوض كتابةً</div>
            <div className="text-[13px] font-extrabold text-slate-900 mt-0.5">{displayedAmountWords}</div>
          </div>
          <div className="text-left bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-xs" dir="ltr">
            <span className="text-xs font-bold text-teal-700 mr-1.5">SAR</span>
            <span className="text-2xl font-black text-slate-900 num-tabular">{formatMoney(voucherAmount)}</span>
          </div>
        </div>

        {/* Account Reconciliation Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
              <tr>
                <th className="py-2 px-3">إجمالي الفاتورة</th>
                <th className="py-2 px-3">المبلغ المقبوض</th>
                <th className="py-2 px-3">المتبقي على الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-extrabold text-slate-800 num-tabular">
              <tr>
                <td className="py-2.5">{formatMoney(totals.finalTotal)} ر.س</td>
                <td className="py-2.5 text-teal-700">{formatMoney(voucherAmount)} ر.س</td>
                <td className="py-2.5 text-amber-700">{formatMoney(remainingBalance)} ر.س</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures + Bottom-Right QR */}
        <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-end">
          <div className="flex gap-10">
            <div className="text-center space-y-2">
              <div className="text-[11px] font-bold text-slate-500">توقيع المستلم</div>
              {receiverName ? <div className="text-xs font-bold">{receiverName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-300 w-28" />
            </div>
            <div className="text-center space-y-2">
              <div className="text-[11px] font-bold text-slate-500">التوقيع المعتمد</div>
              {accountantName ? <div className="text-xs font-bold">{accountantName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-300 w-28" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left text-[9.5px] text-slate-400">
              <div>شركة كيانات للتجارة</div>
              <div>سند قبض الكتروني معتمد</div>
            </div>
            <div className="p-1 border border-slate-200 rounded-lg bg-white">
              <QRCodeSVG value={publicUrl} size={78} level="L" includeMargin={false} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 3: Sharek Al-Daem Contracting (Full-Cell Olive-Green Engineering Grid)
  // Zero rounded corners, strict engineering box, ISO 9001 badge, SNB Bank details
  // =========================================================================
  if (templateId === 3) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-6 border-4 border-[#14532D]"
      >
        {/* Engineering Header */}
        <div className="border-b-2 border-[#14532D] pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CompanyLogoSvg templateId={3} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="md" />
              <div>
                <h1 className="text-lg font-black text-[#14532D]">{seller.arabicName}</h1>
                <div className="text-[11px] font-bold text-amber-700">{seller.englishName}</div>
                <div className="text-[10px] font-semibold text-slate-600">مقاولات عامة - أعمال مدنية وهندسية</div>
              </div>
            </div>

            <div className="text-center border-2 border-[#14532D] p-2 bg-emerald-50/50">
              <div className="text-[15px] font-black text-[#14532D]">سند قبض مالي</div>
              <div className="text-[9px] font-black uppercase text-amber-800 tracking-wider">OFFICIAL RECEIPT</div>
              <div className="text-[8.5px] font-bold text-slate-500 mt-0.5">ISO 9001:2015 CERTIFIED</div>
            </div>

            <div className="text-left text-[10px] font-bold text-slate-700 num-tabular">
              <div>CR: {seller.crNumber}</div>
              <div>VAT: {seller.taxNumber}</div>
              <div>{seller.address}</div>
            </div>
          </div>
        </div>

        {/* Full-Cell Engineering Grid Table */}
        <table className="w-full border-2 border-[#14532D] text-xs border-collapse mb-5">
          <tbody>
            <tr className="border-b border-[#14532D]">
              <td className="bg-emerald-900 text-white font-bold p-2 w-28">رقم السند</td>
              <td className="p-2 font-black num-tabular text-sm text-[#14532D]">{receiptNumber}</td>
              <td className="bg-emerald-900 text-white font-bold p-2 w-24">التاريخ</td>
              <td className="p-2 font-bold num-tabular">{receiptDate}</td>
              <td className="bg-emerald-900 text-white font-bold p-2 w-20">الوقت</td>
              <td className="p-2 font-bold num-tabular">{formattedTime12h}</td>
            </tr>
            <tr className="border-b border-[#14532D]">
              <td className="bg-slate-100 font-bold p-2">استلمنا من</td>
              <td colSpan={5} className="p-2 font-black text-slate-900 text-[13px]">{receivedFrom}</td>
            </tr>
            <tr className="border-b border-[#14532D]">
              <td className="bg-slate-100 font-bold p-2">المبلغ رقماً</td>
              <td colSpan={2} className="p-2 font-black text-base text-[#14532D] num-tabular">
                {formatMoney(voucherAmount)} ر.س
              </td>
              <td className="bg-slate-100 font-bold p-2">طريقة الدفع</td>
              <td colSpan={2} className="p-2 font-bold text-slate-900">{activePaymentMethod}</td>
            </tr>
            <tr className="border-b border-[#14532D]">
              <td className="bg-slate-100 font-bold p-2">المبلغ كتابةً</td>
              <td colSpan={5} className="p-2 font-extrabold text-slate-800 bg-amber-50/40">
                {displayedAmountWords}
              </td>
            </tr>
            <tr className="border-b border-[#14532D]">
              <td className="bg-slate-100 font-bold p-2">وذلك مقابل</td>
              <td colSpan={5} className="p-2 font-bold text-slate-800">{forReason}</td>
            </tr>
            <tr>
              <td className="bg-slate-100 font-bold p-2">الحساب المرجعي</td>
              <td colSpan={5} className="p-2 font-bold num-tabular text-slate-700">
                فاتورة رقم #{invoice.invoiceNumber} | الإجمالي: {formatMoney(totals.finalTotal)} ر.س | المتبقي: {formatMoney(remainingBalance)} ر.س
              </td>
            </tr>
          </tbody>
        </table>

        {/* SNB Bank Details Box */}
        {seller.iban && (
          <div className="border border-[#14532D] bg-emerald-50/40 p-2.5 mb-5 flex justify-between items-center text-[10.5px]">
            <div>
              <span className="font-bold text-[#14532D]">الحساب البنكي المعتمد:</span>{' '}
              <span className="font-extrabold">{seller.bankName || 'البنك الأهلي السعودي (SNB)'}</span>
            </div>
            <div dir="ltr" className="font-black text-[#14532D] num-tabular">
              IBAN: {seller.iban}
            </div>
          </div>
        )}

        {/* 3 Engineering Signature Blocks */}
        <div className="mt-auto pt-4 border-t-2 border-[#14532D]">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3 text-center border border-slate-300 p-2">
              <div className="text-[10px] font-bold text-slate-600 mb-6">المهندس المشرف</div>
              <div className="border-b border-slate-400" />
            </div>

            <div className="col-span-3 text-center border border-slate-300 p-2">
              <div className="text-[10px] font-bold text-slate-600 mb-1">الإدارة المالية</div>
              <div className="text-xs font-bold min-h-[20px]">{accountantName}</div>
              <div className="border-b border-slate-400" />
            </div>

            <div className="col-span-3 text-center border border-slate-300 p-2">
              <div className="text-[10px] font-bold text-slate-600 mb-1">المستلم المعتمد</div>
              <div className="text-xs font-bold min-h-[20px]">{receiverName}</div>
              <div className="border-b border-slate-400" />
            </div>

            <div className="col-span-3 flex justify-center">
              <QRCodeSVG value={publicUrl} size={74} level="L" includeMargin={false} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 4: Al-Muzaini Logistics (Corporate Middle Banner Strip)
  // Corporate blue, horizontal middle strip with Voucher/Date/Amount, boxed breakdown
  // =========================================================================
  if (templateId === 4) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-7 border-t-8 border-[#1E3A8A]"
      >
        {/* Corporate Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <CompanyLogoSvg templateId={4} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="md" />
            <div>
              <h1 className="text-lg font-black text-[#1E3A8A]">{seller.arabicName}</h1>
              <div className="text-xs font-bold text-slate-600">{seller.englishName}</div>
              <div className="text-[10px] text-slate-500">{seller.address}</div>
            </div>
          </div>
          <div className="text-left text-xs font-bold text-slate-700 num-tabular">
            <div>CR: {seller.crNumber}</div>
            <div>VAT: {seller.taxNumber}</div>
          </div>
        </div>

        {/* Horizontal Middle Strip Banner */}
        <div className="bg-[#1E3A8A] text-white py-3 px-5 rounded-lg flex items-center justify-between shadow-md mb-6">
          <div className="text-right">
            <div className="text-xs font-bold text-blue-200">سند قبض | RECEIPT VOUCHER</div>
            <div className="text-lg font-black num-tabular">{receiptNumber}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-blue-200">تاريخ السند</div>
            <div className="text-sm font-black num-tabular">{receiptDate}</div>
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-xs font-bold text-blue-200">AMOUNT</div>
            <div className="text-xl font-black num-tabular">{formatMoney(voucherAmount)} SAR</div>
          </div>
        </div>

        {/* Boxed Tabular Breakdown */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-6">
          <div className="grid grid-cols-12 gap-3 items-center border-b border-slate-200 pb-2">
            <span className="col-span-3 text-xs font-bold text-slate-500">استلمنا من السيد/السادة:</span>
            <span className="col-span-9 text-sm font-black text-slate-900">{receivedFrom}</span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center border-b border-slate-200 pb-2">
            <span className="col-span-3 text-xs font-bold text-slate-500">المبلغ كتابةً:</span>
            <span className="col-span-9 text-xs font-bold text-[#1E3A8A] bg-blue-50/60 p-1.5 rounded">
              {displayedAmountWords}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center border-b border-slate-200 pb-2">
            <span className="col-span-3 text-xs font-bold text-slate-500">طريقة الدفع:</span>
            <span className="col-span-9 text-xs font-extrabold text-slate-800">{activePaymentMethod}</span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center border-b border-slate-200 pb-2">
            <span className="col-span-3 text-xs font-bold text-slate-500">وذلك مقابل:</span>
            <span className="col-span-9 text-xs font-bold text-slate-800">{forReason}</span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
            <span className="col-span-3 text-xs font-bold text-slate-500">الحساب المتبقي:</span>
            <span className="col-span-9 text-xs font-black text-amber-800 num-tabular">
              {formatMoney(remainingBalance)} ر.س (من إجمالي {formatMoney(totals.finalTotal)} ر.س)
            </span>
          </div>
        </div>

        {/* Corporate Signatures & LTR/RTL QR Verification */}
        <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-end">
          <div className="p-1 border border-slate-300 rounded-lg">
            <QRCodeSVG value={publicUrl} size={76} level="L" includeMargin={false} />
          </div>

          <div className="flex gap-8">
            <div className="text-center space-y-2">
              <div className="text-xs font-bold text-slate-500">توقيع المستلم</div>
              {receiverName ? <div className="text-xs font-bold">{receiverName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-400 w-32" />
            </div>
            <div className="text-center space-y-2">
              <div className="text-xs font-bold text-slate-500">المحاسب المعتمد</div>
              {accountantName ? <div className="text-xs font-bold">{accountantName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-400 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 5: Al-Monathem Heavy Equipment (Industrial ATC Dual Comparison)
  // Seller vs Payer side-by-side, red & navy payment table, Alinma IBAN, 3 numbered rules
  // =========================================================================
  if (templateId === 5) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-6 border-t-8 border-[#DC2626]"
      >
        {/* Industrial ATC Header */}
        <div className="flex justify-between items-start pb-4 border-b-2 border-slate-300 mb-4">
          <div className="flex items-center gap-3">
            <CompanyLogoSvg templateId={5} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="md" />
            <div>
              <h1 className="text-lg font-black text-slate-900">{seller.arabicName}</h1>
              <div className="text-[11px] font-bold text-[#DC2626]">{seller.englishName}</div>
              <div className="text-[10px] text-slate-500">معدات ثقيلة ورافعات شوكية ونقليات</div>
            </div>
          </div>

          <div className="bg-[#DC2626] text-white px-4 py-1.5 rounded text-center">
            <div className="text-sm font-black">سند قبض</div>
            <div className="text-[8.5px] font-bold uppercase tracking-widest">ATC RECEIPT</div>
          </div>
        </div>

        {/* Dual Comparison Table: Seller vs Payer */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="border border-slate-300 rounded p-3 bg-slate-50 space-y-1">
            <div className="font-black text-slate-800 border-b border-slate-200 pb-1">الطرف الأول (المستلم):</div>
            <div>{seller.arabicName}</div>
            <div className="num-tabular">س.ت: {seller.crNumber}</div>
            <div className="num-tabular">الرقم الضريبي: {seller.taxNumber}</div>
            {seller.iban && (
              <div className="text-[#DC2626] font-bold num-tabular text-[10px]">
                {seller.bankName || 'مصرف الإنماء'}: {seller.iban}
              </div>
            )}
          </div>

          <div className="border border-slate-300 rounded p-3 bg-red-50/30 space-y-1">
            <div className="font-black text-red-900 border-b border-red-200 pb-1">الطرف الثاني (المسدد):</div>
            <div className="font-bold text-slate-900">{receivedFrom}</div>
            <div className="num-tabular text-slate-600">الرقم الضريبي: {invoice.client.taxNumber || '—'}</div>
            <div className="text-slate-600">العنوان: {invoice.client.address || '—'}</div>
          </div>
        </div>

        {/* Red & Navy Payment Table */}
        <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-[#0F172A] text-white">
              <tr>
                <th className="py-2 px-2">رقم السند</th>
                <th className="py-2 px-2">التاريخ</th>
                <th className="py-2 px-2">طريقة الدفع</th>
                <th className="py-2 px-2">المبلغ المقبوض</th>
                <th className="py-2 px-2">المتبقي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-extrabold num-tabular bg-white">
              <tr>
                <td className="py-2.5 text-[#DC2626] font-black">{receiptNumber}</td>
                <td className="py-2.5">{receiptDate}</td>
                <td className="py-2.5 font-bold">{activePaymentMethod}</td>
                <td className="py-2.5 text-base text-slate-900 font-black">{formatMoney(voucherAmount)} ر.س</td>
                <td className="py-2.5 text-amber-700">{formatMoney(remainingBalance)} ر.س</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-slate-100 p-3 rounded-lg mb-4 space-y-1 text-xs">
          <div><strong className="text-slate-700">المبلغ كتابةً:</strong> {displayedAmountWords}</div>
          <div><strong className="text-slate-700">وذلك عن:</strong> {forReason}</div>
        </div>

        {/* 3 Numbered Terms & Conditions */}
        <div className="border border-slate-200 rounded p-2.5 text-[9.5px] text-slate-600 space-y-0.5 mb-4">
          <div className="font-bold text-slate-800">شروط وأحكام السند:</div>
          <div>1. لا يعتبر السند سارياً إلا بعد تحصيل الشيك أو تأكيد الحوالة البنكية.</div>
          <div>2. المبالغ المدفوعة تخص الفاتورة الموضحة أعلاه فقط ولا تلغي الالتزامات الأخرى.</div>
          <div>3. يخضع هذا السند للأنظمة التجارية والمالية المعمول بها بالمملكة العربية السعودية.</div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-300 flex justify-between items-end">
          <div className="flex gap-8">
            <div className="text-center space-y-1">
              <div className="text-[10px] font-bold text-slate-500">إدارة التشغيل والمستلم</div>
              {receiverName ? <div className="text-xs font-bold">{receiverName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-400 w-28" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-[10px] font-bold text-slate-500">المحاسبة والاعتماد</div>
              {accountantName ? <div className="text-xs font-bold">{accountantName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-400 w-28" />
            </div>
          </div>

          <QRCodeSVG value={publicUrl} size={70} level="L" includeMargin={false} />
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 6: Al-Sindan Industrial & Maritime (Traditional Cheque Style)
  // Ornate double frame, centered Blue Diamond emblem, framed amount pill, 3 signatures
  // =========================================================================
  if (templateId === 6) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-7 border-4 border-double border-[#0369A1]"
      >
        {/* Centered Ornate Maritime Header */}
        <div className="text-center border-b border-[#0369A1] pb-4 mb-4">
          <div className="flex justify-center mb-2">
            <CompanyLogoSvg templateId={6} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="md" />
          </div>
          <h1 className="text-xl font-black text-[#0369A1]">{seller.arabicName}</h1>
          <div className="text-xs font-bold text-slate-600">{seller.englishName}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            س.ت: <span className="num-tabular font-bold">{seller.crNumber}</span> | الرقم الضريبي: <span className="num-tabular font-bold">{seller.taxNumber}</span>
          </div>
        </div>

        {/* Traditional Receipt Title & Metadata Pill */}
        <div className="flex justify-between items-center mb-5 px-2">
          <div className="border border-[#0369A1] rounded-full px-4 py-1 text-xs font-bold text-[#0369A1]">
            سند قبض رقم: <strong className="num-tabular">{receiptNumber}</strong>
          </div>
          <div className="text-xs font-bold text-slate-600 num-tabular">
            التاريخ: {receiptDate}
          </div>
        </div>

        {/* Framed Amount Pill (Cheque Style) */}
        <div className="border-2 border-[#0369A1] bg-sky-50/50 rounded-xl p-3 text-center mb-6">
          <div className="text-xs font-bold text-[#0369A1] mb-1">[ المبلغ المقبوض رقماً وكتابةً ]</div>
          <div className="text-2xl font-black text-slate-900 num-tabular mb-1">
            {formatMoney(voucherAmount)} <span className="text-base font-bold">ريال سعودي فقط لا غير</span>
          </div>
          <div className="text-xs font-bold text-slate-700 italic">
            ({displayedAmountWords})
          </div>
        </div>

        {/* Flowing Traditional Cheque Lines */}
        <div className="space-y-4 px-2 mb-8 text-sm">
          <div className="flex items-baseline">
            <span className="font-bold text-slate-600 w-32 shrink-0">وصلنا من المكرم:</span>
            <span className="font-black text-slate-900 border-b border-dotted border-slate-400 flex-1 pb-1">
              {receivedFrom}
            </span>
          </div>

          <div className="flex items-baseline">
            <span className="font-bold text-slate-600 w-32 shrink-0">طريقة التحصيل:</span>
            <span className="font-bold text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-1">
              {activePaymentMethod}
            </span>
          </div>

          <div className="flex items-baseline">
            <span className="font-bold text-slate-600 w-32 shrink-0">وذلك وفاءً لـ:</span>
            <span className="font-bold text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-1">
              {forReason} (فاتورة #{invoice.invoiceNumber})
            </span>
          </div>

          <div className="flex items-baseline">
            <span className="font-bold text-slate-600 w-32 shrink-0">الرصيد المتبقي:</span>
            <span className="font-bold text-amber-800 border-b border-dotted border-slate-400 flex-1 pb-1 num-tabular">
              {formatMoney(remainingBalance)} ر.س
            </span>
          </div>
        </div>

        {/* 3 Traditional Signature Blocks */}
        <div className="mt-auto pt-4 border-t-2 border-[#0369A1]">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3 text-center">
              <div className="text-xs font-bold text-slate-600 mb-6">أمين الصندوق</div>
              <div className="border-b border-slate-400" />
            </div>

            <div className="col-span-3 text-center">
              <div className="text-xs font-bold text-slate-600 mb-1">المحاسب</div>
              <div className="text-xs font-bold min-h-[20px]">{accountantName}</div>
              <div className="border-b border-slate-400" />
            </div>

            <div className="col-span-3 text-center">
              <div className="text-xs font-bold text-slate-600 mb-1">المستلم</div>
              <div className="text-xs font-bold min-h-[20px]">{receiverName}</div>
              <div className="border-b border-slate-400" />
            </div>

            <div className="col-span-3 flex justify-end">
              <QRCodeSVG value={publicUrl} size={72} level="L" includeMargin={false} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 7: Autad Al-Sarh Commercial (Authentic Typographic Header)
  // Bilingual header with QR code centered directly between Arabic & English titles, dense 6-row grid
  // =========================================================================
  if (templateId === 7) {
    return (
      <div
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-6 border-2 border-slate-900"
      >
        {/* Authentic Typographic Header with Center QR (From 3.pdf Reference) */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-5 text-right">
              <h1 className="text-base font-black text-slate-900 leading-snug">{seller.arabicName}</h1>
              <div className="text-[10px] font-bold text-slate-600 num-tabular">
                س.ت: {seller.crNumber} | الرقم الضريبي: {seller.taxNumber}
              </div>
              <div className="text-[9.5px] text-slate-500">{seller.address}</div>
            </div>

            <div className="col-span-2 flex justify-center">
              <div className="p-1 border border-slate-400 rounded">
                <QRCodeSVG value={publicUrl} size={68} level="L" includeMargin={false} />
              </div>
            </div>

            <div dir="ltr" className="col-span-5 text-left">
              <div className="text-xs font-black text-slate-900 leading-snug">{seller.englishName}</div>
              <div className="text-[9.5px] font-bold text-slate-600">Commercial Invoicing & Accounts</div>
              {seller.iban && (
                <div className="text-[9.5px] font-extrabold text-cyan-900 num-tabular mt-0.5">
                  SNB: {seller.iban}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center font-black text-base text-slate-900 border-b border-slate-300 pb-1 mb-4">
          ســـنـــد قـــبـــض مـــالـــي
        </div>

        {/* Dense 6-Row Bordered Grid Table */}
        <table className="w-full border-2 border-slate-900 text-xs border-collapse mb-5">
          <tbody>
            <tr className="border-b border-slate-900">
              <td className="bg-slate-100 font-black p-2 w-28">رقم السند:</td>
              <td className="p-2 font-black num-tabular text-sm">{receiptNumber}</td>
              <td className="bg-slate-100 font-black p-2 w-24">التاريخ:</td>
              <td className="p-2 font-bold num-tabular">{receiptDate}</td>
            </tr>
            <tr className="border-b border-slate-900">
              <td className="bg-slate-100 font-black p-2">استلمنا من:</td>
              <td colSpan={3} className="p-2 font-black text-slate-900 text-[13px]">{receivedFrom}</td>
            </tr>
            <tr className="border-b border-slate-900">
              <td className="bg-slate-100 font-black p-2">المبلغ رقماً:</td>
              <td className="p-2 font-black text-base num-tabular">{formatMoney(voucherAmount)} ر.س</td>
              <td className="bg-slate-100 font-black p-2">طريقة الدفع:</td>
              <td className="p-2 font-bold">{activePaymentMethod}</td>
            </tr>
            <tr className="border-b border-slate-900">
              <td className="bg-slate-100 font-black p-2">المبلغ كتابةً:</td>
              <td colSpan={3} className="p-2 font-extrabold bg-slate-50">{displayedAmountWords}</td>
            </tr>
            <tr className="border-b border-slate-900">
              <td className="bg-slate-100 font-black p-2">وذلك مقابل:</td>
              <td colSpan={3} className="p-2 font-bold text-slate-800">{forReason}</td>
            </tr>
            <tr>
              <td className="bg-slate-100 font-black p-2">الحساب المرجعي:</td>
              <td colSpan={3} className="p-2 font-bold num-tabular">
                فاتورة رقم #{invoice.invoiceNumber} — الإجمالي: {formatMoney(totals.finalTotal)} ر.س | المتبقي: {formatMoney(remainingBalance)} ر.س
              </td>
            </tr>
          </tbody>
        </table>

        {/* SNB Bank Footer + 2 Clean Signatures */}
        <div className="mt-auto pt-4 border-t-2 border-slate-900">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">المستلم</div>
              {receiverName ? <div className="text-xs font-bold">{receiverName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-400 mx-8" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">المحاسب / الختم</div>
              {accountantName ? <div className="text-xs font-bold">{accountantName}</div> : <div className="h-5" />}
              <div className="border-b border-slate-400 mx-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ARCHITECTURE 8: Saqr Al-Arouba (Royal Navy & Gold Framed Executive Voucher)
  // Executive luxury frame, dark navy & gold metallic styling, premium cards
  // =========================================================================
  return (
    <div
      dir="rtl"
      style={{ fontFamily: templateMeta.fontFamily }}
      className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border p-7 border-4 border-[#0F172A]"
    >
      {/* Royal Navy Header */}
      <div className="bg-[#0F172A] text-white p-4 rounded-xl mb-5 border-b-4 border-[#B45309] shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <CompanyLogoSvg templateId={8} logoDataUrl={seller.logoDataUrl} companyName={seller.arabicName} size="md" />
          <div>
            <h1 className="text-lg font-black text-amber-300">{seller.arabicName}</h1>
            <div className="text-xs font-bold text-slate-300">{seller.englishName}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{seller.address}</div>
          </div>
        </div>

        <div className="text-center bg-amber-500/20 border border-amber-400/50 rounded-lg px-4 py-2">
          <div className="text-base font-black text-amber-200">سند قبض تنفيذي</div>
          <div className="text-[9px] font-black uppercase text-amber-300 tracking-widest">EXECUTIVE RECEIPT</div>
        </div>
      </div>

      {/* Gold & Navy Metadata Pods */}
      <div className="grid grid-cols-12 gap-3 mb-5">
        <div className="col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-right">
          <div className="text-[11px] font-bold text-slate-500">استلمنا من المكرم / السادة:</div>
          <div className="text-base font-black text-[#0F172A]">{receivedFrom}</div>
          <div className="text-xs font-bold text-slate-700">{forReason}</div>
        </div>

        <div className="col-span-4 bg-amber-50/50 border border-amber-300 rounded-xl p-3.5 space-y-1.5 text-right">
          <div className="text-[11px] font-bold text-amber-900">رقم السند: <strong className="num-tabular text-slate-900">{receiptNumber}</strong></div>
          <div className="text-[11px] font-bold text-amber-900">التاريخ: <span className="num-tabular text-slate-900">{receiptDate}</span></div>
          <div className="text-[11px] font-bold text-amber-900">طريقة الدفع: <span className="font-extrabold text-slate-900">{activePaymentMethod}</span></div>
        </div>
      </div>

      {/* Executive Amount Callout */}
      <div className="bg-gradient-to-r from-[#0F172A] to-slate-800 text-white p-4 rounded-xl mb-5 flex items-center justify-between border-r-4 border-amber-500 shadow-sm">
        <div>
          <div className="text-xs font-bold text-amber-300">المبلغ المقبوض بالسند:</div>
          <div className="text-xs font-bold text-slate-200 mt-0.5">{displayedAmountWords}</div>
        </div>
        <div className="text-left font-black text-2xl text-amber-300 num-tabular" dir="ltr">
          {formatMoney(voucherAmount)} <span className="text-base text-white">SAR</span>
        </div>
      </div>

      {/* Financial Account Summary */}
      <div className="border border-slate-200 rounded-xl p-3 mb-6 bg-slate-50/70 text-xs">
        <div className="flex justify-between font-bold text-slate-700 num-tabular">
          <span>فاتورة مرتبطة رقم: #{invoice.invoiceNumber}</span>
          <span>إجمالي الفاتورة: {formatMoney(totals.finalTotal)} ر.س</span>
          <span className="text-amber-800 font-extrabold">المتبقي: {formatMoney(remainingBalance)} ر.س</span>
        </div>
      </div>

      {/* Signatures & Verification */}
      <div className="mt-auto pt-4 border-t-2 border-slate-200 flex justify-between items-end">
        <div className="flex gap-10">
          <div className="text-center space-y-2">
            <div className="text-xs font-bold text-slate-600">المستلم</div>
            {receiverName ? <div className="text-xs font-bold">{receiverName}</div> : <div className="h-5" />}
            <div className="border-b-2 border-slate-400 w-32" />
          </div>
          <div className="text-center space-y-2">
            <div className="text-xs font-bold text-slate-600">المحاسب المعتمد</div>
            {accountantName ? <div className="text-xs font-bold">{accountantName}</div> : <div className="h-5" />}
            <div className="border-b-2 border-slate-400 w-32" />
          </div>
        </div>

        <div className="p-1 border border-amber-400 rounded-lg bg-white">
          <QRCodeSVG value={publicUrl} size={76} level="L" includeMargin={false} />
        </div>
      </div>
    </div>
  );
};
