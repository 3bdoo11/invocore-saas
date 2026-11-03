import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { COMPANY_TEMPLATES } from '../constants/defaults';
import { CompanyTemplateId, InvoiceData, SellerInfo } from '../types/invoice';
import {
  calculateInvoiceTotals,
  formatMoney,
  formatQty,
  formatTime12hArabic,
  paginateInvoiceItems,
  round2,
} from '../utils/formatters';
import {
  numberToArabicTafqeet,
  numberToEnglishTafqeet,
} from '../utils/tafqeet';
import {
  encodePublicInvoiceUrl,
  generateZatcaQrBase64,
} from '../utils/zatcaQr';
import { CompanyLogoSvg } from './CompanyBrandAssets';

interface InvoiceA4SheetProps {
  invoice: InvoiceData;
  seller: SellerInfo;
  activePage?: number;
  viewMode?: 'single' | 'all';
  renderAllPages?: boolean;
}

export const InvoiceA4Sheet: React.FC<InvoiceA4SheetProps> = ({
  invoice,
  seller,
  activePage = 1,
  viewMode = 'single',
  renderAllPages = false,
}) => {
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);

  const pages = useMemo(
    () => paginateInvoiceItems(invoice.items),
    [invoice.items]
  );

  const autoTafqeet = useMemo(
    () => numberToArabicTafqeet(totals.finalTotal),
    [totals.finalTotal]
  );

  const englishTafqeet = useMemo(
    () => numberToEnglishTafqeet(totals.finalTotal),
    [totals.finalTotal]
  );

  const displayedTafqeet =
    invoice.tafqeetManual !== null && invoice.tafqeetManual.trim() !== ''
      ? invoice.tafqeetManual
      : autoTafqeet;

  const displayedItemsCount =
    invoice.itemsCountManual !== null && invoice.itemsCountManual.trim() !== ''
      ? invoice.itemsCountManual
      : String(invoice.items.length);

  const formattedTime12h = useMemo(
    () => formatTime12hArabic(invoice.time),
    [invoice.time]
  );

  const zatcaQrValue = useMemo(
    () =>
      generateZatcaQrBase64({
        sellerName: seller.arabicName,
        vatNumber: seller.taxNumber,
        date: invoice.date,
        time: invoice.time,
        totalWithVat: totals.finalTotal,
        vatTotal: totals.vatAmount,
      }),
    [
      seller.arabicName,
      seller.taxNumber,
      invoice.date,
      invoice.time,
      totals.finalTotal,
      totals.vatAmount,
    ]
  );

  const publicInvoiceUrl = useMemo(
    () => encodePublicInvoiceUrl(invoice, seller),
    [invoice, seller]
  );

  // Single default QR code: Web PDF URL QR (unless user explicitly switched to ZATCA-only)
  const singleQrValue =
    invoice.qrMode === 'zatca' ? zatcaQrValue : publicInvoiceUrl;

  const templateId: CompanyTemplateId =
    (seller.templateId as CompanyTemplateId) || 1;
  const templateMeta =
    COMPANY_TEMPLATES.find((t) => t.id === templateId) || COMPANY_TEMPLATES[0];

  const renderSingleQrBox = (size = 128, borderClass = 'border border-slate-300') => (
    <div
      className={`bg-white p-1.5 rounded ${borderClass} inline-flex items-center justify-center shrink-0`}
    >
      <QRCodeSVG
        value={singleQrValue}
        size={Math.max(128, size)}
        level="L"
        includeMargin={true}
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );

  const pagesToDisplay =
    renderAllPages || viewMode === 'all'
      ? pages
      : [pages[Math.min(Math.max(1, activePage), pages.length) - 1]];

  const renderContinuationFooter = (pageNumber: number, totalPages: number) => (
    <footer className="mt-auto pt-3 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-[11px] font-extrabold text-slate-600">
      <span>
        يتبع في الصفحة التالية ({pageNumber + 1} من {totalPages}) — الإجماليات
        الضريبية في الصفحة الأخيرة
      </span>
      <span className="num-tabular font-black text-slate-900">
        صفحة {pageNumber} من {totalPages}
      </span>
    </footer>
  );

  // ============================================================================
  // TEMPLATE 1: شركة وجد كوم المحدودة (Wjdcom Co. Ltd - Exact Match to Attached Image)
  // ============================================================================
  const renderWjdcomPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;
    const displayBalance =
      totals.remainingBalance > 0 ? totals.remainingBalance : totals.finalTotal;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div className="flex-1 flex flex-col">
          {/* Top 3-Column Header Matching Wjdcom Image */}
          <header className="grid grid-cols-12 gap-4 items-start mb-6">
            {/* Top Right: Giant فاتورة ضريبية Tax Invoice + Customer */}
            <div className="col-span-5 text-right space-y-6">
              <div>
                <h1 className="text-[28px] font-black text-slate-950 leading-tight">
                  فاتورة ضريبية
                </h1>
                <div className="text-[20px] font-semibold text-slate-900 leading-tight">
                  Tax Invoice
                </div>
              </div>

              <div className="space-y-0.5 text-[11.5px] pt-2">
                <div className="font-black text-slate-900 text-[12px]">
                  العميل
                </div>
                <div className="font-bold text-slate-800 text-[11.5px] mb-1">
                  Customer
                </div>
                <div className="font-bold text-slate-800 text-[12px]">
                  {invoice.client.name || '—'}
                </div>
                {invoice.client.address && (
                  <div className="text-slate-600 font-medium leading-snug">
                    {invoice.client.address}
                  </div>
                )}
                {invoice.client.name && (
                  <div className="text-slate-600 font-medium">
                    المملكة العربية السعودية
                  </div>
                )}
                {invoice.client.taxNumber && (
                  <div className="text-slate-800 font-semibold num-tabular pt-0.5">
                    رقم التسجيل الضريبي {invoice.client.taxNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Top Center: Stacked Invoice Number, Date, Due Date */}
            <div className="col-span-3 text-right space-y-4 pt-14 pr-2">
              <div>
                <div className="text-[11.5px] font-extrabold text-slate-900 leading-tight">
                  رقم الفاتورة
                </div>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                  Invoice number
                </div>
                <div className="text-[12px] font-semibold text-slate-800 num-tabular mt-0.5">
                  {String(invoice.invoiceNumber).startsWith('INV-')
                    ? invoice.invoiceNumber
                    : `INV-${invoice.invoiceNumber}`}
                </div>
              </div>

              <div>
                <div className="text-[11.5px] font-extrabold text-slate-900 leading-tight">
                  التاريخ
                </div>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                  Date
                </div>
                <div className="text-[12px] font-semibold text-slate-800 num-tabular mt-0.5">
                  {invoice.date}
                </div>
              </div>

              <div>
                <div className="text-[11.5px] font-extrabold text-slate-900 leading-tight">
                  تاريخ الاستحقاق
                </div>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                  Due date
                </div>
                <div className="text-[12px] font-semibold text-slate-800 num-tabular mt-0.5">
                  {invoice.date}
                </div>
              </div>
            </div>

            {/* Top Left: Circular Wjdcom Logo + Seller Info + Giant Balance */}
            <div className="col-span-4 flex flex-col items-end text-right">
              <div className="w-full flex justify-end mb-2">
                <CompanyLogoSvg
                  templateId={1}
                  logoDataUrl={seller.logoDataUrl}
                  companyName={seller.arabicName}
                  size="lg"
                />
              </div>

              <div className="w-full text-right space-y-0.5 text-[11px] text-slate-800">
                <div className="font-black text-slate-950 text-[12px]">
                  {seller.arabicName}
                </div>
                <div className="font-extrabold text-slate-900 text-[11.5px]">
                  {seller.englishName || 'Wjdcom Co. Ltd'}
                </div>
                <div className="font-medium text-slate-700 leading-snug">
                  {seller.address}
                </div>
                <div className="font-medium text-slate-700">
                  المملكة العربية السعودية
                </div>
                {seller.email && (
                  <div dir="ltr" className="font-medium text-slate-700 text-right">
                    {seller.email}
                  </div>
                )}
                {seller.phone && (
                  <div className="font-medium text-slate-700 num-tabular">
                    {seller.phone}
                  </div>
                )}
                <div className="font-semibold text-slate-900 num-tabular pt-1">
                  رقم التسجيل الضريبي {seller.taxNumber}
                </div>
                <div className="font-semibold text-slate-900 num-tabular">
                  رقم السجل التجاري {seller.crNumber}
                </div>
              </div>

              {/* Giant Balance Display Above Left of Table */}
              <div className="w-full text-right mt-4 pt-2">
                <div className="text-[11.5px] font-extrabold text-slate-900 leading-tight">
                  الرصيد المتبقي
                </div>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                  Balance
                </div>
                <div
                  dir="ltr"
                  className="text-[22px] font-bold text-slate-950 num-tabular mt-1 flex items-center justify-end gap-1.5"
                >
                  <span className="text-[19px] font-black">﷼</span>
                  <span>{formatMoney(displayBalance)}</span>
                </div>
              </div>
            </div>
          </header>

          {/* 7-Column Clean Open Items Table Matching Wjdcom */}
          <section className="mb-6">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="border-b border-slate-300 text-slate-900 text-[11px] font-bold">
                  <th className="py-2.5 px-1.5 w-[5%] text-right align-top">#</th>
                  <th className="py-2.5 px-2 w-[31%] text-right align-top">
                    <div>الوصف</div>
                    <div className="font-semibold text-slate-700">
                      Description
                    </div>
                  </th>
                  <th className="py-2.5 px-1.5 w-[10%] text-center align-top">
                    <div>الكمية</div>
                    <div className="font-semibold text-slate-700">Qty</div>
                  </th>
                  <th className="py-2.5 px-1.5 w-[11%] text-center align-top">
                    <div>السعر</div>
                    <div className="font-semibold text-slate-700">Price</div>
                  </th>
                  <th className="py-2.5 px-1.5 w-[16%] text-center align-top">
                    <div>المبلغ الخاضع للضريبة</div>
                    <div className="font-semibold text-slate-700">
                      Taxable amount
                    </div>
                  </th>
                  <th className="py-2.5 px-1.5 w-[14%] text-center align-top">
                    <div>القيمة المضافة</div>
                    <div className="font-semibold text-slate-700">
                      VAT amount
                    </div>
                  </th>
                  <th className="py-2.5 px-1.5 w-[13%] text-left align-top">
                    <div>المجموع</div>
                    <div className="font-semibold text-slate-700">
                      Line amount
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-[11.5px]">
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const taxable = round2(qty * price);
                  const lineVat = round2(taxable * (vatRate / 100));
                  const lineTotal = round2(taxable + lineVat);
                  return (
                    <tr key={item.id}>
                      <td className="py-3 px-1.5 text-right font-semibold text-slate-800 num-tabular align-top">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3 px-2 font-semibold text-slate-900 align-top">
                        {item.description || '—'}
                      </td>
                      <td className="py-3 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top">
                        {formatQty(qty)}
                      </td>
                      <td className="py-3 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(price)}
                      </td>
                      <td className="py-3 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(taxable)}
                      </td>
                      <td className="py-3 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top leading-snug">
                        <div>{formatMoney(lineVat)}</div>
                        <div className="text-[10.5px] text-slate-600">
                          {vatRate}%
                        </div>
                      </td>
                      <td className="py-3 px-1.5 text-left font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-4">
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Right QR Code + Exact Bilingual ZATCA Caption from Wjdcom Image */}
              <div className="col-span-5 flex flex-col items-start text-right">
                {renderSingleQrBox(108, 'border border-slate-200')}
                <div className="text-[8.5px] font-semibold text-slate-700 mt-2 leading-snug">
                  <div>
                    تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة
                    والجمارك للفوترة الإلكترونية
                  </div>
                  <div dir="ltr" className="text-right">
                    This QR code is encoded as per ZATCA e-invoicing
                    requirements
                  </div>
                </div>
              </div>

              {/* Left Totals Rows with Saudi Riyal Symbol */}
              <div className="col-span-7 space-y-2.5 text-[12px] pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    المجموع الفرعي Subtotal
                  </span>
                  <div
                    dir="ltr"
                    className="font-bold text-slate-950 num-tabular flex items-center gap-3"
                  >
                    <span>﷼</span>
                    <span className="min-w-[90px] text-right">
                      {formatMoney(totals.subtotal)}
                    </span>
                  </div>
                </div>

                {totals.totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="font-bold">الخصم Discount</span>
                    <div
                      dir="ltr"
                      className="font-bold num-tabular flex items-center gap-3"
                    >
                      <span>﷼</span>
                      <span className="min-w-[90px] text-right">
                        -{formatMoney(totals.totalDiscount)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    إجمالي ضريبة القيمة المضافة Total VAT
                  </span>
                  <div
                    dir="ltr"
                    className="font-bold text-slate-950 num-tabular flex items-center gap-3"
                  >
                    <span>﷼</span>
                    <span className="min-w-[90px] text-right">
                      {formatMoney(totals.vatAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[13px] font-black text-slate-950">
                  <span>المجموع شامل القيمة المضافة Total</span>
                  <div
                    dir="ltr"
                    className="font-black text-slate-950 num-tabular flex items-center gap-3"
                  >
                    <span>﷼</span>
                    <span className="min-w-[90px] text-right">
                      {formatMoney(totals.finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 2: شركة كيانات للتجارة (KAYANAT - Exact Match to Attached Image)
  // ============================================================================
  const renderKayanatPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div className="flex-1 flex flex-col">
          {/* Top Header: Right Kayanat Logo, Left Tax Invoice + Seller Info */}
          <header className="grid grid-cols-12 gap-4 items-start mb-6">
            {/* Top Right: Kayanat Emblem */}
            <div className="col-span-5 flex justify-start items-start pt-1">
              <CompanyLogoSvg
                templateId={2}
                logoDataUrl={seller.logoDataUrl}
                companyName={seller.arabicName}
                size="lg"
              />
            </div>

            {/* Top Left: فاتورة ضريبية Tax Invoice + Seller Details */}
            <div className="col-span-7 flex flex-col items-end text-left">
              <div className="w-64 text-right space-y-4">
                <div>
                  <h1 className="text-[24px] font-bold text-slate-900 leading-tight">
                    فاتورة ضريبية
                  </h1>
                  <div className="text-[10px] font-semibold text-slate-600">
                    Tax Invoice
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-700 pt-2">
                  <div className="font-bold text-slate-900 text-[12.5px]">
                    {seller.arabicName}
                  </div>
                  <div className="font-medium leading-snug">
                    {seller.address}
                  </div>
                  <div className="font-medium">السعودية</div>
                  <div className="font-semibold text-slate-800 num-tabular pt-0.5">
                    الرقم الضريبي : {seller.taxNumber}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Middle Section: Right Customer Details, Left Invoice Reference */}
          <section className="grid grid-cols-12 gap-4 mb-6 text-[11px] items-end">
            {/* Right: تفاصيل بيانات العميل */}
            <div className="col-span-6 text-right space-y-1">
              <div className="text-[10.5px] font-semibold text-slate-600">
                تفاصيل بيانات العميل:
              </div>
              <div className="font-bold text-slate-900 text-[14px]">
                {invoice.client.name || '—'}
              </div>
              {invoice.client.name && (
                <div className="text-slate-700 font-medium">
                  المملكة العربية السعودية
                </div>
              )}
              {invoice.client.address && (
                <div className="text-slate-700 font-medium leading-snug">
                  {invoice.client.address}
                </div>
              )}
              {invoice.client.taxNumber && (
                <>
                  <div className="text-slate-700 font-medium pt-0.5">
                    الرقم الضريبي
                  </div>
                  <div className="text-slate-800 font-semibold num-tabular">
                    {invoice.client.taxNumber}
                  </div>
                </>
              )}
            </div>

            {/* Left: Clean Key-Value Reference Grid */}
            <div className="col-span-6 flex justify-end">
              <div className="w-72 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    رقم المرجع :
                  </span>
                  <span className="font-semibold text-slate-900 num-tabular">
                    {String(invoice.invoiceNumber).startsWith('INV-')
                      ? invoice.invoiceNumber
                      : `INV-2026-${invoice.invoiceNumber}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    تاريخ الإصدار :
                  </span>
                  <span className="font-semibold text-slate-900 num-tabular">
                    {invoice.date}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    تاريخ الاستحقاق :
                  </span>
                  <span className="font-semibold text-slate-900 num-tabular">
                    {invoice.date}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    نوع الفاتورة :
                  </span>
                  <span className="font-medium text-slate-800">
                    فاتورة ضريبية
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 8-Column Open Minimalist Table Matching Kayanat Image */}
          <section className="mb-6">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="text-slate-800 text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-1 w-[4%] text-right">#</th>
                  <th className="py-2.5 px-2 w-[30%] text-right">المنتج</th>
                  <th className="py-2.5 px-1.5 w-[10%] text-center">الكمية</th>
                  <th className="py-2.5 px-1.5 w-[11%] text-center">
                    سعر الوحدة
                  </th>
                  <th className="py-2.5 px-1.5 w-[14%] text-center">
                    الإجمالي قبل الضريبة
                  </th>
                  <th className="py-2.5 px-1 w-[9%] text-center">الضريبة %</th>
                  <th className="py-2.5 px-1.5 w-[10%] text-center">الضريبة</th>
                  <th className="py-2.5 px-1.5 w-[12%] text-left">الاجمالي</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const beforeVat = round2(qty * price);
                  const vatVal = round2(beforeVat * (vatRate / 100));
                  const afterVat = round2(beforeVat + vatVal);
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3.5 px-1 text-right font-semibold text-slate-800 num-tabular align-top">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-2 font-semibold text-slate-900 align-top leading-relaxed">
                        {item.description || '—'}
                      </td>
                      <td className="py-3.5 px-1.5 text-center align-top leading-snug">
                        <div className="font-semibold text-slate-900 num-tabular">
                          {formatMoney(qty)}
                        </div>
                        <div className="text-[9.5px] text-slate-600 mt-0.5">
                          {item.unit || 'وحدة'}
                        </div>
                      </td>
                      <td className="py-3.5 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(price)}
                      </td>
                      <td className="py-3.5 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(beforeVat)}
                      </td>
                      <td className="py-3.5 px-1 text-center font-semibold text-slate-800 num-tabular align-top">
                        {formatMoney(vatRate)}
                      </td>
                      <td className="py-3.5 px-1.5 text-center font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(vatVal)}
                      </td>
                      <td className="py-3.5 px-1.5 text-left font-semibold text-slate-900 num-tabular align-top">
                        {formatMoney(afterVat)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-4 space-y-6">
            {/* Left-Aligned Summary Block Matching Kayanat Image */}
            <div className="flex justify-end">
              <div className="w-80 space-y-2 text-[11px]">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="font-bold text-slate-800">
                    الإجمالي قبل الضريبة
                  </span>
                  <span className="font-semibold text-slate-900 num-tabular">
                    {formatMoney(totals.subtotal)}
                  </span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex items-center justify-between px-3 py-1 text-amber-800">
                    <span className="font-bold">الخصم</span>
                    <span className="font-semibold num-tabular">
                      -{formatMoney(totals.totalDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="font-bold text-slate-800">
                    اجمالي الضريبة ({vatRate}%)
                  </span>
                  <span className="font-semibold text-slate-900 num-tabular">
                    {formatMoney(totals.vatAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#F5F2F5] px-3.5 py-2.5 text-[11.5px] font-black text-slate-950">
                  <span>المجموع</span>
                  <span dir="ltr" className="num-tabular">
                    SAR{formatMoney(totals.finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Right QR Code + English ZATCA Caption to its Left */}
            <div className="flex items-start justify-start gap-4 pt-2">
              {renderSingleQrBox(112, 'border border-slate-200')}
              <div
                dir="ltr"
                className="text-[10px] font-medium text-slate-400 pt-2"
              >
                .This QR code has been generated as per ZATCA&apos;s regulations
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-400 num-tabular pt-2">
              {pageNumber}
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 3: مؤسسة الشريك الدائم للمقاولات (Al Sharek Al Daem Est. - PDF 1)
  // ============================================================================
  const renderSharekAlDaemPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="ltr"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div>
          {/* Top 3-Column Header matching PDF 1 */}
          <header className="grid grid-cols-12 items-start gap-2 mb-3">
            {/* Left English Info */}
            <div className="col-span-4 text-left space-y-1 text-[11.5px] font-extrabold text-slate-900">
              <div className="text-[15px] font-black">{seller.englishName}</div>
              <div className="num-tabular">C . R : {seller.crNumber}</div>
              <div className="num-tabular">VAT No : {seller.taxNumber}</div>
              <div className="font-mono text-[13px] tracking-widest text-slate-800 pt-0.5">
                ISO 9001 : 2015
              </div>
            </div>

            {/* Center Orange Circle House Logo */}
            <div className="col-span-4 flex flex-col items-center justify-center">
              <CompanyLogoSvg
                templateId={3}
                logoDataUrl={seller.logoDataUrl}
                companyName={seller.arabicName}
                size="lg"
              />
            </div>

            {/* Right Arabic Info */}
            <div
              dir="rtl"
              className="col-span-4 text-right space-y-1 text-[12px] font-extrabold text-slate-900"
            >
              <div className="text-[15.5px] font-black">{seller.arabicName}</div>
              <div className="num-tabular">سجل تجاري : {seller.crNumber}</div>
              <div className="num-tabular">الرقم الضريبي : {seller.taxNumber}</div>
              <div
                dir="ltr"
                className="text-right font-bold underline text-[12px] pt-0.5"
              >
                SECO Vendor ID: {seller.secoVendorId || '2008972'}
              </div>
            </div>
          </header>

          {/* Centered Title */}
          <div className="text-center my-2">
            <h2 className="text-[18px] font-bold tracking-wide text-slate-900">
              TAX INVOICE/فاتورة ضريبية
            </h2>
          </div>

          {/* Dual Boxed Customer Data (Left) & Invoice Details (Right) */}
          <section className="grid grid-cols-12 border border-slate-500 text-[11px] mb-2">
            {/* Left: Customer Data */}
            <div className="col-span-6 border-r border-slate-500">
              <div className="bg-[#9CA3AF] text-slate-950 font-black text-center py-1 border-b border-slate-500">
                Customer Data بيانات العميل
              </div>
              <div className="divide-y divide-slate-300 bg-slate-200/70">
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-3 font-extrabold">Name : الإسم:</span>
                  <span
                    dir="rtl"
                    className="col-span-9 font-black text-slate-900 text-center"
                  >
                    {invoice.client.name || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-3 font-extrabold">
                    Address: العنوان:
                  </span>
                  <span
                    dir="rtl"
                    className="col-span-9 font-bold text-slate-800 text-center"
                  >
                    {invoice.client.address || 'الرياض'}
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-4 font-extrabold">
                    Vat No. : الرقم الضريبي:
                  </span>
                  <span className="col-span-8 font-black num-tabular text-center">
                    {invoice.client.taxNumber || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-3 font-extrabold">phone :</span>
                  <span className="col-span-9 font-bold num-tabular text-center">
                    {invoice.client.phone || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-3 font-extrabold">
                    Project : المشروع:
                  </span>
                  <span
                    dir="auto"
                    className="col-span-9 font-bold text-slate-900 truncate"
                  >
                    {invoice.client.notes || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Invoice Details */}
            <div className="col-span-6">
              <div className="bg-[#9CA3AF] text-slate-950 font-black text-center py-1 border-b border-slate-500">
                Invoice Details تفاصيل الفاتورة
              </div>
              <div className="divide-y divide-slate-300 bg-slate-200/70">
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-4 font-extrabold">Invoice No.</span>
                  <span className="col-span-4 font-black text-center num-tabular">
                    {invoice.invoiceNumber}
                  </span>
                  <span dir="rtl" className="col-span-4 font-extrabold text-right">
                    رقم الفاتورة:
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-4 font-extrabold">Date :</span>
                  <span className="col-span-4 font-black text-center num-tabular">
                    {invoice.date.replace(/\//g, '-')}
                  </span>
                  <span dir="rtl" className="col-span-4 font-extrabold text-right">
                    التاريخ:
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-4 font-extrabold">Payment Type :</span>
                  <span
                    dir="rtl"
                    className="col-span-4 font-black text-center underline"
                  >
                    {invoice.paymentMethod}
                  </span>
                  <span dir="rtl" className="col-span-4 font-extrabold text-right">
                    طريقة الدفع:
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-4 font-extrabold">P.O.No. :</span>
                  <span className="col-span-4 font-bold text-center num-tabular text-[10px]">
                    {invoice.itemsCountManual || `${invoice.items.length} Items`}
                  </span>
                  <span dir="rtl" className="col-span-4 font-extrabold text-right">
                    رقم أمر الشراء:
                  </span>
                </div>
                <div className="grid grid-cols-12 px-2 py-1 items-center">
                  <span className="col-span-3 font-extrabold">From :</span>
                  <span className="col-span-5 font-bold text-center text-[10.5px]">
                    {seller.salesperson || '—'}
                  </span>
                  <span dir="rtl" className="col-span-4 font-extrabold text-right">
                    صادره من:
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 7-Column Navy-Blue Table matching PDF 1 */}
          <section className="mb-2">
            <table className="w-full border-collapse border border-slate-800 text-[11px]">
              <thead>
                <tr className="bg-[#0F296B] text-white font-extrabold text-center">
                  <th className="border border-slate-700 py-1 px-1 w-[6%]">
                    <div>صنف</div>
                    <div>Item</div>
                  </th>
                  <th className="border border-slate-700 py-1 px-2 w-[42%]">
                    <div>البيان</div>
                    <div>Description</div>
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-[9%]">
                    <div>الوحدة</div>
                    <div>unit</div>
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-[10%]">
                    <div>الكمية</div>
                    <div>Qty</div>
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-[11%]">
                    <div>السعر</div>
                    <div>Unit Price</div>
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-[9%]">
                    <div>الخصم</div>
                    <div>Discount</div>
                  </th>
                  <th className="border border-slate-700 py-1 px-1.5 w-[13%]">
                    <div>الاجمالى</div>
                    <div>Line Total</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const lineTotal = round2(qty * price);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-300 text-slate-900"
                    >
                      <td className="border-x border-slate-700 py-1.5 px-1 text-center font-bold num-tabular">
                        {startIndex + idx + 1}
                      </td>
                      <td
                        dir="auto"
                        className="border-x border-slate-700 py-1.5 px-2 font-bold"
                      >
                        {item.description || '—'}
                      </td>
                      <td className="border-x border-slate-700 py-1.5 px-1 text-center font-semibold">
                        {item.unit || 'LS'}
                      </td>
                      <td className="border-x border-slate-700 py-1.5 px-1 text-center font-bold num-tabular">
                        {formatQty(qty)}
                      </td>
                      <td className="border-x border-slate-700 py-1.5 px-1 text-center font-bold num-tabular">
                        {formatMoney(price)}
                      </td>
                      <td className="border-x border-slate-700 py-1.5 px-1 text-center font-bold num-tabular">
                        0
                      </td>
                      <td className="border-x border-slate-700 py-1.5 px-1.5 text-center font-extrabold num-tabular">
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Right-Aligned Blue Totals Box + English Amount in Words Bar */}
          {isLastPage && (
            <section className="mb-3">
              <div className="flex justify-end">
                <div className="w-[54%] border border-slate-800 text-[12px] font-bold">
                  <div className="grid grid-cols-2 border-b border-slate-800 bg-[#7CC0F7]">
                    <div className="py-1 px-2 text-center border-r border-slate-800">
                      Subtotal
                    </div>
                    <div className="py-1 px-2 text-center font-extrabold num-tabular">
                      {formatMoney(totals.subtotal)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-b border-slate-800 bg-[#7CC0F7]">
                    <div className="py-1 px-2 text-center border-r border-slate-800">
                      Total Discount
                    </div>
                    <div className="py-1 px-2 text-center font-extrabold num-tabular bg-yellow-300">
                      {formatMoney(totals.totalDiscount)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-b border-slate-800 bg-[#7CC0F7]">
                    <div className="py-1 px-2 text-center border-r border-slate-800">
                      VAT Tax {vatRate}%
                    </div>
                    <div className="py-1 px-2 text-center font-extrabold num-tabular">
                      {formatMoney(totals.vatAmount)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 bg-[#7CC0F7]">
                    <div className="py-1 px-2 text-center border-r border-slate-800 font-black">
                      Total
                    </div>
                    <div className="py-1 px-2 text-center font-black num-tabular">
                      {formatMoney(totals.finalTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-300/80 py-1 px-3 text-right text-[11.5px] font-bold text-slate-900 mt-1">
                {englishTafqeet}
              </div>
              <div
                dir="rtl"
                className="border border-t-0 border-slate-800 bg-slate-100 py-1 px-3 text-right text-[11px] font-bold text-slate-800"
              >
                المبلغ بالحروف: {displayedTafqeet}
              </div>
            </section>
          )}
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-3">
            <div className="flex items-end justify-between gap-4 mb-2">
              {/* Left Bank Details Box */}
              <div className="w-[46%] border border-slate-700 text-center text-[11.5px] font-black divide-y divide-slate-700">
                <div className="py-0.5 bg-slate-50">Bank Details:</div>
                <div className="py-0.5">{seller.englishName}</div>
                <div className="py-0.5">{seller.bankName || 'SNB BANK'}</div>
                <div className="py-0.5 num-tabular">
                  {seller.accountNumber || '01400006214209'}
                </div>
                <div className="py-0.5 num-tabular">
                  {seller.iban || 'SA59 1000 0001 4000 0621 4209'}
                </div>
              </div>

              {/* Right Single QR Code */}
              <div className="pr-4">
                {renderSingleQrBox(96, 'border border-slate-800')}
              </div>
            </div>

            <div className="text-center text-[10.5px] font-black text-slate-900 space-y-1">
              <div>
                ***This is an electronically generated document and does not
                require physical signature or company stamp***
              </div>
              <div className="underline text-[10.5px]">
                {seller.address}
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 4: مؤسسة المزيني للمقاولات العامة (AL-MUZAINI EST. - PDF 2)
  // ============================================================================
  const renderAlMuzainiPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items } = page;
    const vatRate = totals.vatRate;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="ltr"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div>
          {/* Top Header: Left Logo & Seller Info, Right Tax Invoice + QR Code */}
          <header className="grid grid-cols-12 items-start gap-4 mb-4">
            <div className="col-span-7 text-left space-y-1.5">
              <div className="pl-2">
                <CompanyLogoSvg
                  templateId={4}
                  logoDataUrl={seller.logoDataUrl}
                  companyName={seller.arabicName}
                  size="lg"
                />
              </div>
              <div className="text-[12.5px] font-bold text-slate-900 space-y-0.5 pt-1">
                <div>{seller.arabicName}</div>
                <div>{seller.streetName || 'العزيزية البلدية'}</div>
                <div>{seller.city || 'جدة'}</div>
                <div>المملكة العربية السعودية</div>
              </div>
              <div className="text-[11.5px] font-semibold text-slate-800 space-y-0.5 pt-1 num-tabular">
                <div>Email: {seller.email || 'almuzainiest7@gmail.com'}</div>
                <div>VAT Number: {seller.taxNumber}</div>
                <div>Other Seller ID: {seller.crNumber}</div>
              </div>
            </div>

            <div className="col-span-5 flex flex-col items-end text-right">
              <h1 className="text-[19px] font-bold text-slate-900 mb-2 num-tabular">
                Tax Invoice INV-{invoice.invoiceNumber}
              </h1>
              {renderSingleQrBox(112, 'border border-slate-400')}
            </div>
          </header>

          {/* Bill To Box + Blue Invoice Date / Amount Due Box */}
          <section className="grid grid-cols-12 border border-slate-800 mb-5 text-[11.5px]">
            <div className="col-span-9 p-2.5 space-y-0.5 text-left">
              <div className="font-bold underline text-slate-900">Bill To:</div>
              <div className="font-bold text-[12.5px] text-slate-900">
                {invoice.client.name || '—'}
              </div>
              <div className="text-slate-700">
                {invoice.client.address || '—'}
              </div>
              {invoice.client.notes && (
                <div className="text-slate-600">{invoice.client.notes}</div>
              )}
              <div className="font-semibold text-slate-900 pt-1 num-tabular">
                TIN/VAT ID: {invoice.client.taxNumber || '—'}
              </div>
            </div>

            <div className="col-span-3 bg-[#2581C4] text-white border-l border-slate-800 p-2.5 flex flex-col justify-center space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sky-100">Invoice Date</span>
                <span className="font-bold num-tabular">{invoice.date}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sky-100">Amount Due</span>
                <span className="font-extrabold num-tabular">
                  {formatMoney(totals.remainingBalance)} SAR
                </span>
              </div>
            </div>
          </section>

          {/* 7-Column LTR Table with Solid Blue Header */}
          <section className="mb-4">
            <table className="w-full border-collapse border border-slate-800 text-[11px]">
              <thead>
                <tr className="bg-[#2581C4] text-white font-semibold">
                  <th className="border border-slate-800 py-2 px-2 text-left w-[30%]">
                    Goods or Services
                  </th>
                  <th className="border border-slate-800 py-2 px-1.5 text-center w-[8%]">
                    Qty
                  </th>
                  <th className="border border-slate-800 py-2 px-1.5 text-right w-[13%]">
                    Unit Price
                  </th>
                  <th className="border border-slate-800 py-2 px-1.5 text-right w-[15%]">
                    Taxable Amount
                  </th>
                  <th className="border border-slate-800 py-2 px-1 text-center w-[8%]">
                    VAT Rate
                  </th>
                  <th className="border border-slate-800 py-2 px-1.5 text-right w-[12%]">
                    VAT Amount
                  </th>
                  <th className="border border-slate-800 py-2 px-2 text-right w-[14%]">
                    <div>Subtotal</div>
                    <div className="text-[8.5px] font-normal text-sky-100">
                      (Including VAT)
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const taxable = round2(qty * price);
                  const vatVal = round2(taxable * (vatRate / 100));
                  const subIncVat = round2(taxable + vatVal);
                  return (
                    <tr key={item.id} className="align-top text-slate-900">
                      <td
                        dir="auto"
                        className="border-x border-slate-800 py-2 px-2 font-medium text-left"
                      >
                        {item.description || '—'}
                      </td>
                      <td className="border-x border-slate-800 py-2 px-1.5 text-center num-tabular">
                        {formatQty(qty)}
                      </td>
                      <td className="border-x border-slate-800 py-2 px-1.5 text-right num-tabular">
                        {formatMoney(price)} SAR
                      </td>
                      <td className="border-x border-slate-800 py-2 px-1.5 text-right num-tabular">
                        {formatMoney(taxable)} SAR
                      </td>
                      <td className="border-x border-slate-800 py-2 px-1 text-center num-tabular">
                        {vatRate}%
                      </td>
                      <td className="border-x border-slate-800 py-2 px-1.5 text-right num-tabular">
                        {formatMoney(vatVal)} SAR
                      </td>
                      <td className="border-x border-slate-800 py-2 px-2 text-right font-semibold num-tabular">
                        {formatMoney(subIncVat)} SAR
                      </td>
                    </tr>
                  );
                })}
                {/* Filler row to give tall classic bordered look when few items */}
                {items.length < 6 && (
                  <tr className="h-36">
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-3">
            <div className="grid grid-cols-12 gap-6 items-start">
              {/* Left Amount in Words */}
              <div className="col-span-7 text-left space-y-1.5 pt-2">
                <div className="text-[12px] font-bold text-slate-900">
                  Total amount in words
                </div>
                <div className="text-[12.5px] font-medium text-slate-900">
                  {englishTafqeet}
                </div>
                <div
                  dir="rtl"
                  className="text-[11px] font-bold text-slate-600 pt-1 text-left"
                >
                  المبلغ بالحروف: {displayedTafqeet}
                </div>
              </div>

              {/* Right Stacked Totals */}
              <div className="col-span-5 text-[11.5px] space-y-1.5">
                <div className="flex justify-between py-1">
                  <span className="text-slate-700">Total (Excluding VAT):</span>
                  <span className="font-semibold num-tabular">
                    {formatMoney(totals.taxableAmount)} SAR
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-700">Total VAT:</span>
                  <span className="font-semibold num-tabular">
                    {formatMoney(totals.vatAmount)} SAR
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 font-bold text-slate-900">
                  <span>Total (Including VAT):</span>
                  <span className="num-tabular">
                    {formatMoney(totals.finalTotal)} SAR
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-700">Invoice Paid:</span>
                  <span className="num-tabular">
                    {formatMoney(totals.paidAmount)} SAR
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-[13px] font-bold text-slate-900">
                  <span>Balance Due:</span>
                  <span className="num-tabular">
                    {formatMoney(totals.remainingBalance)} SAR
                  </span>
                </div>
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 5: شركة المنظم التجارية (Al Monathem Trading Co. - ATC - PDF 3)
  // ============================================================================
  const renderAlMonathemPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="ltr"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-between box-border overflow-hidden"
      >
        <div>
          {/* Top Header with Teal Corner Triangles + Center Company Name + Left ATC Logo */}
          <header className="relative flex items-center justify-between px-6 pt-2 pb-3 mb-2">
            {/* Left ATC Logo */}
            <div className="z-10">
              <CompanyLogoSvg
                templateId={5}
                logoDataUrl={seller.logoDataUrl}
                companyName={seller.arabicName}
                size="lg"
              />
            </div>

            {/* Center Bilingual Name */}
            <div className="text-center z-10 pr-8">
              <h1 className="text-[22px] font-black text-[#0F766E] border-b-2 border-[#0F766E] pb-0.5">
                {seller.arabicName}
              </h1>
              <div className="text-[16px] font-black text-[#1E3A8A] tracking-wide">
                {seller.englishName}
              </div>
            </div>

            <div className="w-12" />
          </header>

          {/* Centered Tax Invoice Box */}
          <div className="flex justify-center mb-1.5">
            <div className="border border-slate-800 px-10 py-0.5 text-[13px] font-black text-[#1E3A8A] flex items-center gap-6">
              <span>Tax Invoice</span>
              <span>فاتورة ضريبية</span>
            </div>
          </div>

          {/* 3-Column Metadata Table */}
          <section className="grid grid-cols-12 border border-slate-800 text-[10.5px] font-bold mb-2">
            {/* Left Column: Invoice Type, Delivery No, P.O.No */}
            <div className="col-span-5 divide-y divide-slate-800 border-r border-slate-800">
              <div className="grid grid-cols-3 px-2 py-0.5">
                <span className="text-[#1E3A8A]">Invoice Type</span>
                <span className="text-center font-black">
                  {invoice.paymentMethod}
                </span>
                <span dir="rtl" className="text-right text-[#1E3A8A]">
                  نوع الفاتورة
                </span>
              </div>
              <div className="grid grid-cols-2 px-2 py-0.5">
                <span className="text-[#1E3A8A]">Deleivery No</span>
                <span dir="rtl" className="text-right text-[#1E3A8A]">
                  رقم اذن التسليم
                </span>
              </div>
              <div className="grid grid-cols-2 px-2 py-0.5">
                <span className="text-[#1E3A8A]">P.o.No</span>
                <span dir="rtl" className="text-right text-[#1E3A8A]">
                  رقم امر الشراء
                </span>
              </div>
            </div>

            {/* Center Page X of Y */}
            <div className="col-span-2 flex items-center justify-center font-black text-red-800 text-[12px] border-r border-slate-800">
              Page {pageNumber} of {totalPages}
            </div>

            {/* Right Column: Invoice No, Invoice Date, Creation Date */}
            <div className="col-span-5 divide-y divide-slate-800">
              <div className="grid grid-cols-3 px-2 py-0.5">
                <span className="text-[#1E3A8A]">Invoice No</span>
                <span className="text-center font-black num-tabular">
                  {invoice.invoiceNumber}
                </span>
                <span dir="rtl" className="text-right text-[#1E3A8A]">
                  رقم الفاتورة
                </span>
              </div>
              <div className="grid grid-cols-3 px-2 py-0.5">
                <span className="text-[#1E3A8A]">Invoice Date</span>
                <span className="text-center font-black num-tabular">
                  {invoice.date}
                </span>
                <span dir="rtl" className="text-right text-[#1E3A8A]">
                  تاريخ الفاتورة
                </span>
              </div>
              <div className="grid grid-cols-3 px-2 py-0.5">
                <span className="text-[#1E3A8A]">Creation Date</span>
                <span className="text-center font-black num-tabular text-[9.5px]">
                  {invoice.date} {formattedTime12h}
                </span>
                <span dir="rtl" className="text-right text-[#1E3A8A]">
                  موعد الانشاء
                </span>
              </div>
            </div>
          </section>

          {/* 7-Row Unified Seller (المورد) vs Buyer (العميل) Comparison Table */}
          <section className="mb-2">
            <table className="w-full border-collapse border border-slate-800 text-[10.5px] font-bold">
              <thead>
                <tr className="bg-slate-100 text-[#1E3A8A]">
                  <th className="border border-slate-800 py-0.5 px-2 text-left w-[14%]">
                    Seller
                  </th>
                  <th className="border border-slate-800 py-0.5 px-2 text-right w-[34%]">
                    المورد
                  </th>
                  <th className="border border-slate-800 py-0.5 px-2 text-left w-[38%]">
                    Buyer
                  </th>
                  <th className="border border-slate-800 py-0.5 px-2 text-right w-[14%]">
                    العميل
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    Name
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center font-extrabold">
                    {seller.arabicName}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center font-extrabold">
                    {invoice.client.name || '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    الاسم
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    VAT ID
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center num-tabular">
                    {seller.taxNumber}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center num-tabular">
                    {invoice.client.taxNumber || '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    الرقم الضريبى
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    Building NO.
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center num-tabular">
                    {seller.buildingNo || '3212'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center num-tabular">
                    {invoice.client.buildingNo || '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    رقم المبني
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    Street Name
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center">
                    {seller.streetName || 'شارع البلدية - حي العزيزية'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center">
                    {invoice.client.streetName || invoice.client.address || '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    اسم الشارع
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    City
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center">
                    {seller.city || 'جدة'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center">
                    {invoice.client.city || '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    المدينه
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    Country
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center">
                    المملكة العربية السعودية
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center">
                    {invoice.client.name ? 'المملكة العربية السعودية' : '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    البلد
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 py-0.5 px-2 text-[#1E3A8A]">
                    Postal Code
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center num-tabular">
                    {seller.postalCode || '23334'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-center num-tabular">
                    {invoice.client.postalCode || '—'}
                  </td>
                  <td className="border border-slate-800 py-0.5 px-2 text-right text-[#1E3A8A]">
                    الرمز البريدى
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 8-Column Items Table matching PDF 3 */}
          <section className="mb-2">
            <table className="w-full border-collapse border border-slate-800 text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-800 text-[#1E3A8A] font-extrabold text-center">
                  <th className="border border-slate-800 py-1 px-1 w-[5%]">
                    <div>م</div>
                    <div>S</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[12%]">
                    <div>كود الصنف</div>
                    <div>Item Code</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-2 w-[37%]">
                    <div>اسم الصنف</div>
                    <div>Item Name</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[9%]">
                    <div>الوحدة</div>
                    <div>Unit</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[9%]">
                    <div>الكمية</div>
                    <div>Qty</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[9%]">
                    <div>السعر</div>
                    <div>Price</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[8%]">
                    <div>الخصم</div>
                    <div>Discount</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1.5 w-[11%]">
                    <div>الاجمالى</div>
                    <div>Total</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const lineTotal = round2(qty * price);
                  return (
                    <tr key={item.id} className="text-center font-bold">
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {startIndex + idx + 1}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {item.itemCode || `981${idx + 10}`}
                      </td>
                      <td
                        dir="auto"
                        className="border-x border-slate-800 py-1 px-2 text-center font-bold"
                      >
                        {item.description || '—'}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1">
                        {item.unit || 'حبة'}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular text-red-900">
                        {qty.toFixed(2)}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {formatMoney(price)}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        0.00
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1.5 num-tabular text-[#1E3A8A]">
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
                {items.length < 5 && (
                  <tr className="h-20">
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                    <td className="border-x border-b border-slate-800" />
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-3 space-y-1.5 text-[10px]">
            {/* Bottom 3-Column Section: Left Specialty + IBAN, Center QR, Right Totals */}
            <div className="grid grid-cols-12 gap-2 items-stretch">
              {/* Left Specialty + Alinma Bank Box */}
              <div className="col-span-5 flex flex-col justify-between space-y-1">
                <div className="border border-slate-800 p-1.5 text-[9.5px] leading-snug">
                  <div
                    dir="rtl"
                    className="font-extrabold text-slate-900 text-center mb-1"
                  >
                    متخصصون في تصنيع وبيع مستلزمات البناء الخاصة بالمباني الجاهزة
                    ومسبقة الصب المتعلقة بالرفع والتثبيت
                  </div>
                  <div className="font-black text-slate-900 text-center">
                    Quality Building Accessories for Construction Industry
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[8.5px] text-slate-700 pt-0.5">
                    <div>- Transport Anchors</div>
                    <div>- Lifting Stud &amp; Accessories</div>
                    <div>- Plate Anchors</div>
                    <div>- Fixing Anchors &amp; Channels</div>
                  </div>
                </div>

                <div className="border border-slate-800 py-1 px-2 text-center font-black text-[#1E3A8A] text-[10.5px] num-tabular">
                  {seller.iban || 'SA 6005000068204939809000'} : حساب مصرف الانماء
                </div>
              </div>

              {/* Center Single QR Code */}
              <div className="col-span-3 flex items-center justify-center">
                {renderSingleQrBox(100, 'border border-slate-800')}
              </div>

              {/* Right Totals Box */}
              <div className="col-span-4 flex flex-col justify-between">
                <div className="border border-slate-800 divide-y divide-slate-800 text-[10.5px] font-black">
                  <div className="grid grid-cols-12 py-1 px-1.5">
                    <span className="col-span-8">Gross Amount : القيمة :</span>
                    <span className="col-span-4 text-center num-tabular text-red-900">
                      {formatMoney(totals.subtotal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 py-1 px-1.5">
                    <span className="col-span-8">Discount : الخصم :</span>
                    <span className="col-span-4 text-center num-tabular text-red-900">
                      {formatMoney(totals.totalDiscount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 py-1 px-1.5">
                    <span className="col-span-8">
                      Amount : القيمة الاجمالية :
                    </span>
                    <span className="col-span-4 text-center num-tabular text-red-900">
                      {formatMoney(totals.taxableAmount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 py-1 px-1.5">
                    <span className="col-span-8">
                      VAT : % {vatRate} الضريبة المضافة
                    </span>
                    <span className="col-span-4 text-center num-tabular text-red-900">
                      {formatMoney(totals.vatAmount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 py-1 px-1.5 bg-slate-50">
                    <span className="col-span-8">
                      Net Total : اجمالى الفاتورة
                    </span>
                    <span className="col-span-4 text-center num-tabular text-red-900">
                      {formatMoney(totals.finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tafqeet Bar */}
            <div
              dir="rtl"
              className="border border-slate-800 py-1 px-3 text-center font-black text-red-900 text-[11px]"
            >
              {displayedTafqeet}
            </div>

            {/* Return Policy & Signatures */}
            <div
              dir="rtl"
              className="text-center font-black text-red-800 text-[10px]"
            >
              1- مدة الاستبدال والاسترجاع ثلاثة أيام من الشراء 2- يجب احضار اصل
              الفاتورة في حالة الاستبدال أو الاسترجاع 3- لا يتم إرجاع القطع بعد
              استخدامها
            </div>

            <div className="flex justify-around py-1 font-black text-[#1E3A8A] text-[12px]">
              <span>المستلم</span>
              <span>المبيعات</span>
            </div>

            {/* Bottom Address Footer */}
            <div className="border-t-2 border-[#0F766E] pt-1 text-center text-[9.5px] font-bold text-[#1E3A8A]">
              <div>
                المملكة العربية السعودية - جدة - هاتف :{' '}
                {seller.phone || '012 6688733'} - جوال :{' '}
                {seller.mobile || '0530390072'} - س.ت : {seller.crNumber} -{' '}
                {seller.email || 'sales@aitsaudi.com'}
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 6: شركة السندان الماسي التجارية (AL SINDAN AL MASI - PDF 4)
  // ============================================================================
  const renderAlSindanPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="ltr"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div>
          {/* Top 3-Column Header matching PDF 4 */}
          <header className="grid grid-cols-12 items-center gap-2 border-b-2 border-slate-900 pb-2.5 mb-2">
            {/* Left English Info */}
            <div className="col-span-5 text-left space-y-0.5 text-[11px] font-black text-slate-900">
              <div className="text-[14.5px] text-red-900 font-black">
                {seller.englishName}
              </div>
              <div className="text-[11px]">MARINE - INDUSTRIAL - SAFETY</div>
              <div className="text-[10px] font-bold">
                Address / Jeddah - Al Thagher District - Muhammad Fida St.
              </div>
              <div className="num-tabular text-[11.5px]">
                Vat No : {seller.taxNumber}
              </div>
              <div className="num-tabular text-[11.5px]">
                C.R. {seller.crNumber}
              </div>
            </div>

            {/* Center Blue Gear/Anchor/Diamond Emblem */}
            <div className="col-span-2 flex justify-center">
              <CompanyLogoSvg
                templateId={6}
                logoDataUrl={seller.logoDataUrl}
                companyName={seller.arabicName}
                size="lg"
              />
            </div>

            {/* Right Arabic Info */}
            <div
              dir="rtl"
              className="col-span-5 text-right space-y-0.5 text-[11.5px] font-black text-slate-900"
            >
              <div className="text-[16px] text-red-900 font-black">
                {seller.arabicName}
              </div>
              <div className="text-[11.5px]">بحري - صناعي - سلامة</div>
              <div className="text-[10.5px] font-bold">{seller.address}</div>
              <div className="num-tabular text-[11.5px]">
                الرقم الضريبي : {seller.taxNumber}
              </div>
              <div className="num-tabular text-[11.5px]">
                رقم السجل التجاري / {seller.crNumber}
              </div>
            </div>
          </header>

          {/* Payment Method + Gray Boxed فاتورة ضريبية Badge */}
          <div className="grid grid-cols-12 items-center mb-2 text-[12px] font-black">
            <div dir="rtl" className="col-span-4 text-right underline">
              طريقة السداد : فاتورة {invoice.paymentMethod}
            </div>
            <div className="col-span-4 bg-slate-300 border border-slate-800 py-1 text-center text-[15px] font-black">
              فاتورة ضريبية
            </div>
            <div dir="rtl" className="col-span-4 text-right pr-2">
              رقم مرجع العميل : —
            </div>
          </div>

          {/* 4 Stacked Gray-Filled Customer & Invoice Bars */}
          <section className="space-y-1 mb-2.5 text-[11.5px] font-black">
            <div className="grid grid-cols-12 bg-slate-300/85 border border-slate-800 py-1 px-2 items-center">
              <span className="col-span-3 text-left">Invoice No:</span>
              <span className="col-span-3 text-center num-tabular">
                رقم الفاتورة : {invoice.invoiceNumber}
              </span>
              <span className="col-span-2 text-center">Date:</span>
              <span className="col-span-4 text-right num-tabular">
                تاريخ الفاتورة : {invoice.date}
              </span>
            </div>

            <div className="grid grid-cols-12 bg-slate-300/85 border border-slate-800 py-1 px-2 items-center">
              <span className="col-span-4 text-left">Customer Name:</span>
              <span dir="rtl" className="col-span-8 text-right">
                أسم العميل : {invoice.client.name || '—'}
              </span>
            </div>

            <div className="grid grid-cols-12 bg-slate-300/85 border border-slate-800 py-1 px-2 items-center">
              <span className="col-span-4 text-left">Customer Address:</span>
              <span dir="rtl" className="col-span-8 text-right">
                عنوان العميل : {invoice.client.address || '—'}
              </span>
            </div>

            <div className="grid grid-cols-12 bg-slate-300/85 border border-slate-800 py-1 px-2 items-center">
              <span className="col-span-4 text-left">Customer Vat No:</span>
              <span
                dir="rtl"
                className="col-span-8 text-right num-tabular"
              >
                الرقم الضريبي للعميل : {invoice.client.taxNumber || '—'}
              </span>
            </div>
          </section>

          {/* 6-Column LTR Table matching PDF 4 */}
          <section className="mb-4">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-slate-300 border border-slate-800 font-black text-center">
                  <th className="border border-slate-800 py-1 px-2 w-[15%]">
                    <div>الاجمالي</div>
                    <div>Total</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-2 w-[13%]">
                    <div>السعر</div>
                    <div>Price</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1.5 w-[10%]">
                    <div>الوحدة</div>
                    <div>Unit</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1.5 w-[12%]">
                    <div>الكمية</div>
                    <div>Qty</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-2 w-[42%]">
                    <div>أسم الصنف</div>
                    <div>Item Name</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[8%]">
                    <div>الرقم</div>
                    <div>No</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const lineTotal = round2(qty * price);
                  return (
                    <tr key={item.id} className="text-center font-bold">
                      <td className="py-1.5 px-2 num-tabular">
                        {formatMoney(lineTotal)}
                      </td>
                      <td className="py-1.5 px-2 num-tabular">
                        {formatMoney(price)}
                      </td>
                      <td className="py-1.5 px-1.5">{item.unit || 'حبة'}</td>
                      <td className="py-1.5 px-1.5 num-tabular">
                        {qty.toFixed(2)}
                      </td>
                      <td dir="rtl" className="py-1.5 px-2 font-extrabold">
                        {item.description || '—'}
                      </td>
                      <td className="py-1.5 px-1 num-tabular">
                        {startIndex + idx + 1}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-3 space-y-2">
            {/* Bottom 3-Column Block: Left Totals, Center QR, Right Notes Box */}
            <div className="grid grid-cols-12 gap-2 items-stretch">
              {/* Left Totals */}
              <div className="col-span-5 space-y-1 text-[11.5px] font-black">
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-5 border border-slate-800 py-1 px-2 text-right num-tabular">
                    {formatMoney(totals.subtotal)}
                  </div>
                  <div className="col-span-7 bg-slate-300 border border-slate-800 py-1 px-2 flex justify-between">
                    <span>Total</span>
                    <span>الأجمالي</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-5 border border-slate-800 py-1 px-2 text-right num-tabular">
                    {formatMoney(totals.totalDiscount)}
                  </div>
                  <div className="col-span-7 bg-slate-300 border border-slate-800 py-1 px-2 flex justify-between">
                    <span>Discount</span>
                    <span>الخصم</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-5 border border-slate-800 py-1 px-2 text-right num-tabular">
                    {formatMoney(totals.vatAmount)}
                  </div>
                  <div className="col-span-7 bg-slate-300 border border-slate-800 py-1 px-2 flex justify-between text-[10.5px]">
                    <span>Vat {vatRate}%</span>
                    <span>ضريبة القيمة المضافة</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-5 border border-slate-800 py-1 px-2 text-right num-tabular">
                    {formatMoney(totals.finalTotal)}
                  </div>
                  <div className="col-span-7 bg-slate-300 border border-slate-800 py-1 px-2 flex justify-between">
                    <span>Net Total</span>
                    <span>القيمة الإجمالية</span>
                  </div>
                </div>
              </div>

              {/* Center Single QR Code */}
              <div className="col-span-3 flex items-center justify-center">
                {renderSingleQrBox(98, 'border border-slate-800')}
              </div>

              {/* Right Notes Box */}
              <div className="col-span-4 border border-slate-800 p-2 flex flex-col justify-between text-[10.5px] font-bold">
                <div className="flex justify-between">
                  <span>Notes:</span>
                  <span dir="rtl">ملاحظات :</span>
                </div>
                <div dir="rtl" className="text-right text-slate-700">
                  {invoice.client.notes || ''}
                </div>
                <div />
              </div>
            </div>

            {/* Full-Width Gray Tafqeet Bar */}
            <div
              dir="rtl"
              className="bg-slate-300 border border-slate-800 py-1.5 px-3 text-right font-black text-[12px]"
            >
              {displayedTafqeet}
            </div>

            {/* Bottom Signatures */}
            <div className="flex justify-between px-12 pt-2 text-[11.5px] font-black text-center">
              <div>
                <div>توقيع البائع</div>
                <div>Sel Sig</div>
              </div>
              <div>
                <div>توقيع العميل</div>
                <div>Clt Sig</div>
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 7: مؤسسة أوتاد الصرح التجارية (AUTAD AL-ALSARH - PDF 3.pdf)
  // ============================================================================
  const renderAutadAlsarhPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="ltr"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div>
          {/* Top Header: Authentic Clean Bilingual Typographic Header from 3.pdf + Cyan/Red Bars */}
          <header className="mb-2">
            <div className="flex items-end justify-between gap-4 pb-1.5">
              <div className="text-left">
                <div className="text-[16px] font-black text-slate-950 tracking-tight leading-tight">
                  {seller.englishName ||
                    'Establishment AUTAD AL-ALSARH Commercial'}
                </div>
                <div className="text-[11px] font-bold text-slate-600 num-tabular">
                  C.R: {seller.crNumber} | VAT: {seller.taxNumber}
                </div>
              </div>
              <div className="text-right" dir="rtl">
                <h1 className="text-[22px] font-black text-slate-950 leading-tight">
                  {seller.arabicName}
                </h1>
                <div className="text-[11px] font-bold text-slate-600">
                  لتجارة مواد البناء والمقاولات العامة
                </div>
              </div>
            </div>
            <div className="h-1.5 bg-sky-500 w-full mb-0.5 rounded-full" />
            <div className="h-1 bg-red-600 w-[94%] mx-auto rounded-full" />
          </header>

          {/* 3 Rounded Top Metadata Bars */}
          <section className="space-y-1 mb-2 text-[11px] font-extrabold">
            <div className="border border-slate-800 rounded-lg py-0.5 px-3 flex items-center justify-between">
              <span>
                نوع السداد / Payment Type : مبيعات {invoice.paymentMethod}
              </span>
              <span className="text-[13px] font-black">فاتورة ضريبية</span>
              <span className="num-tabular">
                {invoice.date} : Date / التاريخ
              </span>
            </div>

            <div className="border border-slate-800 rounded-lg py-0.5 px-3 flex items-center justify-between num-tabular">
              <span>{invoice.invoiceNumber} : Invoice No / رقم الفاتورة</span>
              <span>: Client No / رقم العميل</span>
              <span>{formattedTime12h} : Time / الوقت</span>
            </div>

            <div className="border border-slate-800 rounded-lg py-0.5 px-3 flex items-center justify-between">
              <span>Client Name :</span>
              <span dir="rtl" className="font-black text-[12px]">
                {invoice.client.name || '—'}
              </span>
              <span dir="rtl">إسم العميل :</span>
            </div>
          </section>

          {/* 3-Column Middle Block: Left Seller Info Box, Center QR Code (128x128px), Right Client Info Box */}
          <section className="grid grid-cols-12 gap-2 items-center mb-2 text-[10px] font-bold">
            {/* Left: Seller Info */}
            <div className="col-span-4 border border-slate-800 rounded-xl p-2 space-y-0.5">
              <div className="text-center font-black text-[11px] border-b border-slate-300 pb-0.5 mb-0.5">
                Seller info / بيانات الشركة
              </div>
              <div className="flex justify-between">
                <span>Building No:</span>
                <span className="num-tabular">{seller.buildingNo || '2979'}</span>
                <span dir="rtl">رقم المبنى :</span>
              </div>
              <div className="flex justify-between">
                <span>Street Name :</span>
                <span dir="rtl">{seller.streetName || 'البلديه'}</span>
                <span dir="rtl">اسم الشارع :</span>
              </div>
              <div className="flex justify-between">
                <span>District :</span>
                <span dir="rtl">{seller.district || 'حي العزيزية'}</span>
                <span dir="rtl">الحي :</span>
              </div>
              <div className="flex justify-between">
                <span>City :</span>
                <span dir="rtl">{seller.city || 'جدة'}</span>
                <span dir="rtl">المدينة :</span>
              </div>
              <div className="flex justify-between">
                <span>Country :</span>
                <span dir="rtl">المملكة العربية السعودية</span>
                <span dir="rtl">البلد :</span>
              </div>
              <div className="flex justify-between">
                <span>Zip Code :</span>
                <span className="num-tabular">{seller.postalCode || '23334'}</span>
                <span dir="rtl">الرمز البريدي :</span>
              </div>
              <div className="flex justify-between">
                <span>Additional No :</span>
                <span className="num-tabular">
                  {seller.additionalNo || '8401'}
                </span>
                <span dir="rtl">الرقم الإضافي :</span>
              </div>
              <div className="flex justify-between">
                <span>VAT No:</span>
                <span className="num-tabular">{seller.taxNumber}</span>
                <span dir="rtl">الرقم الضريبي :</span>
              </div>
              <div className="flex justify-between">
                <span>C.R No :</span>
                <span className="num-tabular">{seller.crNumber}</span>
                <span dir="rtl">السجل التجاري :</span>
              </div>
            </div>

            {/* Center: Single QR Code (128x128px) */}
            <div className="col-span-4 flex items-center justify-center">
              {renderSingleQrBox(128, 'border border-slate-800')}
            </div>

            {/* Right: Client Info */}
            <div className="col-span-4 border border-slate-800 rounded-xl p-2 space-y-0.5">
              <div className="text-center font-black text-[11.5px] border-b border-slate-300 pb-0.5 mb-0.5">
                Client info / بيانات العميل
              </div>
              <div className="flex justify-between">
                <span>Building No:</span>
                <span className="num-tabular">{invoice.client.buildingNo || '—'}</span>
                <span dir="rtl">رقم المبنى :</span>
              </div>
              <div className="flex justify-between">
                <span>Street Name :</span>
                <span dir="rtl">{invoice.client.streetName || invoice.client.address || '—'}</span>
                <span dir="rtl">اسم الشارع :</span>
              </div>
              <div className="flex justify-between">
                <span>District :</span>
                <span dir="rtl">{invoice.client.district || '—'}</span>
                <span dir="rtl">الحي :</span>
              </div>
              <div className="flex justify-between">
                <span>City :</span>
                <span dir="rtl">{invoice.client.city || '—'}</span>
                <span dir="rtl">المدينة :</span>
              </div>
              <div className="flex justify-between">
                <span>Country :</span>
                <span dir="rtl">{invoice.client.name ? 'المملكة العربية السعودية' : '—'}</span>
                <span dir="rtl">البلد :</span>
              </div>
              <div className="flex justify-between">
                <span>Zip Code :</span>
                <span className="num-tabular">{invoice.client.postalCode || '—'}</span>
                <span dir="rtl">الرمز البريدي :</span>
              </div>
              <div className="flex justify-between">
                <span>Additional No :</span>
                <span className="num-tabular">{invoice.client.additionalNo || '—'}</span>
                <span dir="rtl">الرقم الإضافي للعنوان :</span>
              </div>
              <div className="flex justify-between">
                <span>VAT No:</span>
                <span className="num-tabular">
                  {invoice.client.taxNumber || '—'}
                </span>
                <span dir="rtl">الرقم الضريبي :</span>
              </div>
              <div className="flex justify-between">
                <span>C.R No:</span>
                <span className="num-tabular">
                  {invoice.client.crNumber || (invoice.client.notes ? invoice.client.notes.replace(/\D/g, '') : '') || '—'}
                </span>
                <span dir="rtl">السجل التجاري :</span>
              </div>
            </div>
          </section>

          {/* 8-Column LTR Grid Table matching PDF 3.pdf */}
          <section className="mb-2">
            <table className="w-full border-collapse border border-slate-800 text-[10.5px]">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-extrabold text-center">
                  <th className="border border-slate-800 py-1 px-1 w-[13%]">
                    <div>Total after VAT</div>
                    <div>الإجمالي بعد الضريبة</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[11%]">
                    <div>VAT Amount</div>
                    <div>قيمة الضريبة</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[8%]">
                    <div>%VAT</div>
                    <div>نسبة الضريبة</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[10%]">
                    <div>Price</div>
                    <div>سعر البيع</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[8%]">
                    <div>Qty</div>
                    <div>الكمية</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-2 w-[34%]">
                    <div>Item name</div>
                    <div>إسم الصنف</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[11%]">
                    <div>.Item no</div>
                    <div>رقم الصنف</div>
                  </th>
                  <th className="border border-slate-800 py-1 px-1 w-[5%]">
                    <div>##</div>
                    <div>##</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const beforeVat = round2(qty * price);
                  const vatVal = round2(beforeVat * (vatRate / 100));
                  const afterVat = round2(beforeVat + vatVal);
                  return (
                    <tr key={item.id} className="text-center font-bold">
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {formatMoney(afterVat)}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {formatMoney(vatVal)}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {vatRate}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {formatMoney(price)}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {formatQty(qty)}
                      </td>
                      <td
                        dir="rtl"
                        className="border-x border-slate-800 py-1 px-2 text-right font-bold"
                      >
                        {item.description || '—'}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {item.itemCode || `00${startIndex + idx + 101}`}
                      </td>
                      <td className="border-x border-slate-800 py-1 px-1 num-tabular">
                        {startIndex + idx + 1}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-3 space-y-1.5">
            {/* Rounded Summary & Tafqeet Box */}
            <div className="border border-slate-800 rounded-xl p-2.5 text-[11.5px] font-black space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="num-tabular">
                  {formatMoney(totals.subtotal)} : Total / الإجمالي
                </span>
                <span>
                  {seller.salesperson ? `${seller.salesperson} : اسم البائع` : ''}
                </span>
              </div>
              <div className="num-tabular">
                {formatMoney(totals.totalDiscount)} : Discount / الخصم
              </div>
              <div className="num-tabular">
                {formatMoney(totals.taxableAmount)} : Taxable Amount / المبلغ
                الخاضع للضريبة
              </div>
              <div className="num-tabular">
                {formatMoney(totals.vatAmount)} : VAT {vatRate}% / الضريبة
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <span className="num-tabular text-[12.5px]">
                  {formatMoney(totals.finalTotal)} : Total including VAT /
                  الإجمالي شامل ضريبة
                </span>
                <span dir="rtl" className="text-[11px] font-bold">
                  فقط / Only : {displayedTafqeet}
                </span>
              </div>
            </div>

            {/* Rounded Return Policy + SNB Bank Banner + Bilingual Footer */}
            <div className="border-2 border-slate-800 rounded-xl overflow-hidden text-[10px] font-black">
              <div
                dir="rtl"
                className="text-center text-red-800 py-0.5 px-2 bg-slate-50 border-b border-slate-300"
              >
                ١- مدة الإستبدال والإسترجاع ثلاثة أيام من الشراء / ٢- يجب إحضار أصل
                الفاتورة في حالة الإستبدال أو الإسترجاع / ٣- لا يتم إرجاع القطع
                بعد إستخدامها
              </div>

              <div className="grid grid-cols-12 items-center bg-slate-100 border-b border-slate-800">
                <div className="col-span-3 text-center text-[13px] font-black text-slate-900 py-1">
                  المستلم
                </div>
                <div className="col-span-3 text-center text-[13px] font-black text-slate-900 py-1">
                  المبيعات
                </div>
                <div className="col-span-6 bg-[#2B547E] text-white py-1 px-3 text-center">
                  <div className="text-[12px] font-black">
                    {seller.bankName || 'الأهلي SNB'}
                  </div>
                  <div className="text-[12px] font-black tracking-wider num-tabular">
                    {seller.iban || 'SA 64100000 01400031337701'}
                  </div>
                </div>
              </div>

              <div className="p-1.5 text-center space-y-0.5 bg-white text-slate-900 text-[9.5px]">
                <div dir="rtl">{seller.address}</div>
                <div>
                  Kingdom of Saudi Arabia - Jeddah - Al-Baladiyah Street - P.O.
                  Box : 8401 - P.C. 23334 - Mobile :{' '}
                  {seller.phone || '0508734766'}
                </div>
                <div className="flex justify-between px-4 text-[#1E3A8A]">
                  <span>CR : {seller.crNumber} - JCC : 605763</span>
                  <span>{seller.email || 'info@astsaudi.net'}</span>
                  <span dir="rtl">س.ت : {seller.crNumber}</span>
                </div>
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  // ============================================================================
  // TEMPLATE 8: شركة واحة صقر العروبة للتجارة والمقاولات (Saqr Al-Arouba)
  // ============================================================================
  const renderSaqrClassicPage = (page: (typeof pages)[number]) => {
    const { pageNumber, totalPages, isLastPage, items, startIndex } = page;
    const vatRate = totals.vatRate;
    const pageLabel =
      invoice.pageNumberManual !== null &&
      invoice.pageNumberManual.trim() !== ''
        ? invoice.pageNumberManual
        : `${pageNumber} من ${totalPages}`;

    return (
      <div
        key={`page-${pageNumber}`}
        dir="rtl"
        style={{ fontFamily: templateMeta.fontFamily }}
        className="invoice-a4-page bg-white text-slate-900 shadow-2xl print:shadow-none mx-auto relative flex flex-col justify-start box-border"
      >
        <div>
          <header className="border-b-[3px] border-[#0F172A] pb-3 mb-3">
            <div className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-5 text-right space-y-0.5">
                <div className="flex items-center gap-2">
                  <CompanyLogoSvg
                    templateId={8}
                    logoDataUrl={seller.logoDataUrl}
                    companyName={seller.arabicName}
                    size="sm"
                  />
                  <div>
                    <h1 className="text-[15px] font-black text-[#0F172A] leading-snug">
                      {seller.arabicName}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-700">
                      شركة {seller.legalType}
                    </p>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-800 space-y-0.5 pt-0.5">
                  <div>
                    السجل التجاري:{' '}
                    <span className="num-tabular font-extrabold">
                      {seller.crNumber}
                    </span>
                  </div>
                  <div>
                    الرقم الضريبي:{' '}
                    <span className="num-tabular font-extrabold text-[#0F172A]">
                      {seller.taxNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-span-3 flex flex-col items-center justify-center text-center">
                <div className="bg-[#0F172A] text-white px-4 py-1.5 rounded-lg border-b-[3px] border-[#B45309] shadow-sm w-full mb-1.5">
                  <div className="text-[14px] font-black tracking-wide">
                    فاتورة ضريبية
                  </div>
                  <div className="text-[9px] font-semibold text-amber-300 tracking-widest uppercase">
                    TAX INVOICE
                  </div>
                </div>
              </div>

              <div
                dir="ltr"
                className="col-span-4 text-left space-y-0.5 border-r border-slate-200 pl-1 flex flex-col justify-center"
              >
                <div className="text-[11px] font-extrabold text-[#0F172A] leading-snug tracking-tight">
                  {seller.englishName}
                </div>
                <div className="text-[10.5px] font-bold text-slate-700 num-tabular">
                  CR No.:{' '}
                  <span className="font-extrabold">{seller.crNumber}</span>
                </div>
                <div className="text-[10.5px] font-bold text-slate-700 num-tabular">
                  VAT No.:{' '}
                  <span className="font-extrabold text-[#0F172A]">
                    {seller.taxNumber}
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-slate-600 leading-tight pt-0.5">
                  {seller.address}
                </div>
              </div>
            </div>
          </header>

          {/* Metadata & Client Box */}
          <section className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-5 border border-slate-300 rounded-lg overflow-hidden bg-slate-50/70">
              <div className="bg-[#0F172A] text-white text-[11px] font-extrabold py-1 px-3 flex items-center justify-between">
                <span>بيانات الفاتورة</span>
                <span className="text-amber-300 text-[9.5px] font-semibold">
                  INVOICE INFO
                </span>
              </div>
              <div className="p-2 text-[11px] space-y-1 divide-y divide-slate-200/80">
                <div className="flex justify-between items-center pb-0.5">
                  <span className="font-bold text-slate-600">رقم الفاتورة:</span>
                  <span
                    dir="ltr"
                    className="num-tabular font-black text-[12.5px] text-[#0F172A] bg-amber-100/80 px-2 py-0.2 rounded border border-amber-300"
                  >
                    {invoice.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5 pb-0.5">
                  <span className="font-bold text-slate-600">
                    التاريخ والوقت:
                  </span>
                  <span className="num-tabular font-bold text-slate-900">
                    {invoice.date} — {formattedTime12h}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5 pb-0.5">
                  <span className="font-bold text-slate-600">طريقة الدفع:</span>
                  <span className="font-extrabold text-[#B45309] bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                    {invoice.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="font-bold text-slate-600">
                    الأصناف / الصفحة:
                  </span>
                  <span className="num-tabular font-bold text-slate-800">
                    {displayedItemsCount} صنف ({pageLabel})
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-7 border border-slate-300 rounded-lg overflow-hidden bg-slate-50/70 flex flex-col">
              <div className="bg-[#0F172A] text-white text-[11px] font-extrabold py-1 px-3 flex items-center justify-between">
                <span>بيانات العميل</span>
                <span className="text-amber-300 text-[9.5px] font-semibold">
                  CUSTOMER DETAILS
                </span>
              </div>
              <div className="p-2 text-[11px] space-y-1 divide-y divide-slate-200/80 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-12 items-center pb-0.5">
                  <span className="col-span-3 font-bold text-slate-600">
                    العميل:
                  </span>
                  <span className="col-span-9 font-black text-slate-900 text-[12px]">
                    {invoice.client.name || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-12 items-center pt-0.5 pb-0.5">
                  <span className="col-span-3 font-bold text-slate-600">
                    الرقم الضريبي:
                  </span>
                  <span
                    dir="ltr"
                    className="col-span-9 text-right num-tabular font-extrabold text-[#0F172A]"
                  >
                    {invoice.client.taxNumber || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-12 items-center pt-0.5 pb-0.5">
                  <span className="col-span-3 font-bold text-slate-600">
                    العنوان:
                  </span>
                  <span className="col-span-9 font-semibold text-slate-800">
                    {invoice.client.address || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-12 items-center pt-0.5">
                  <span className="col-span-3 font-bold text-slate-600">
                    ملاحظات:
                  </span>
                  <span className="col-span-9 font-bold text-slate-800">
                    {invoice.client.notes || '—'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 6-Column RTL Table */}
          <section className="mb-3">
            <table className="w-full border-collapse border border-slate-400 text-right">
              <thead>
                <tr className="bg-[#0F172A] text-white text-[11px] font-extrabold">
                  <th className="border border-slate-500 py-1.5 px-1.5 text-center w-[6%]">
                    م
                  </th>
                  <th className="border border-slate-500 py-1.5 px-2.5 text-right w-[42%]">
                    البيان
                  </th>
                  <th className="border border-slate-500 py-1.5 px-1.5 text-center w-[11%]">
                    الوحدة
                  </th>
                  <th className="border border-slate-500 py-1.5 px-1.5 text-center w-[11%]">
                    الكمية
                  </th>
                  <th className="border border-slate-500 py-1.5 px-2 text-center w-[15%]">
                    السعر قبل الضريبة
                  </th>
                  <th className="border border-slate-500 py-1.5 px-2 text-center w-[15%]">
                    الإجمالي قبل الضريبة
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const lineTotal = round2(qty * price);
                  return (
                    <tr
                      key={item.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'}
                    >
                      <td className="border border-slate-300 py-1 px-1.5 text-center text-[11px] font-extrabold text-slate-700 num-tabular">
                        {startIndex + idx + 1}
                      </td>
                      <td className="border border-slate-300 py-1 px-2.5 text-[11.5px] font-bold text-slate-900">
                        {item.description || '—'}
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center text-[11px] font-semibold text-slate-700">
                        {item.unit || 'وحدة'}
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center text-[11.5px] font-bold text-slate-900 num-tabular">
                        {formatQty(qty)}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center text-[11.5px] font-bold text-slate-900 num-tabular">
                        {formatMoney(price)}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center text-[11.5px] font-extrabold text-[#0F172A] num-tabular bg-amber-50/30">
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        {isLastPage ? (
          <footer className="mt-auto pt-3 border-t-2 border-[#0F172A]">
            <div className="grid grid-cols-12 gap-3 items-stretch">
              <div className="col-span-6 flex flex-col justify-between space-y-2">
                <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-2.5">
                  <div className="text-[10.5px] font-extrabold text-[#B45309] mb-0.5">
                    المبلغ بالحروف:
                  </div>
                  <div className="text-[12px] font-black text-[#0F172A] leading-relaxed">
                    {displayedTafqeet}
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3 pt-1">
                  <div className="border border-slate-300 rounded-lg p-2 bg-slate-50/60 flex-1 flex flex-col justify-between min-h-[68px]">
                    <div className="text-[10.5px] font-extrabold text-slate-700">
                      التوقيع:
                    </div>
                    <div className="border-b border-dotted border-slate-400 mt-6 mb-1" />
                  </div>
                  {renderSingleQrBox(90, 'border border-slate-300')}
                </div>
              </div>

              <div className="col-span-6">
                <div className="border border-slate-400 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-[11px]">
                    <tbody className="divide-y divide-slate-300">
                      <tr className="bg-white">
                        <td className="py-1 px-2.5 font-bold text-slate-700">
                          الإجمالي قبل الضريبة
                        </td>
                        <td className="py-1 px-2.5 text-left font-extrabold text-slate-900 num-tabular">
                          {formatMoney(totals.subtotal)} ر.س
                        </td>
                      </tr>
                      {totals.totalDiscount > 0 && (
                        <tr className="bg-slate-50">
                          <td className="py-1 px-2.5 font-bold text-slate-700">
                            الخصم
                          </td>
                          <td className="py-1 px-2.5 text-left font-bold text-amber-800 num-tabular">
                            {formatMoney(totals.totalDiscount)} ر.س
                          </td>
                        </tr>
                      )}
                      <tr className="bg-white">
                        <td className="py-1 px-2.5 font-extrabold text-[#0F172A]">
                          ضريبة القيمة المضافة ({vatRate}%)
                        </td>
                        <td className="py-1 px-2.5 text-left font-extrabold text-[#B45309] num-tabular">
                          {formatMoney(totals.vatAmount)} ر.س
                        </td>
                      </tr>
                      <tr className="bg-[#0F172A] text-white">
                        <td className="py-1.5 px-2.5 font-black text-[12px]">
                          صافي مبلغ الفاتورة
                        </td>
                        <td className="py-1.5 px-2.5 text-left font-black text-[13px] text-amber-300 num-tabular">
                          {formatMoney(totals.finalTotal)} ر.س
                        </td>
                      </tr>
                      <tr className="bg-slate-100">
                        <td className="py-1 px-2.5 font-extrabold text-slate-900">
                          المتبقي
                        </td>
                        <td className="py-1 px-2.5 text-left font-black text-[12px] text-[#0F172A] num-tabular">
                          {formatMoney(totals.remainingBalance)} ر.س
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </footer>
        ) : (
          renderContinuationFooter(pageNumber, totalPages)
        )}
      </div>
    );
  };

  return (
    <div className="invoice-pages-wrapper space-y-8 print:space-y-0">
      {pagesToDisplay.map((page) => {
        switch (templateId) {
          case 1:
            return renderWjdcomPage(page);
          case 2:
            return renderKayanatPage(page);
          case 3:
            return renderSharekAlDaemPage(page);
          case 4:
            return renderAlMuzainiPage(page);
          case 5:
            return renderAlMonathemPage(page);
          case 6:
            return renderAlSindanPage(page);
          case 7:
            return renderAutadAlsarhPage(page);
          default:
            return renderSaqrClassicPage(page);
        }
      })}
    </div>
  );
};
