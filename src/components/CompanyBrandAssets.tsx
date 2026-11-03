import React from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  MapPin,
  Settings,
  Sparkles,
} from 'lucide-react';
import { COMPANY_TEMPLATES } from '../constants/defaults';
import { CompanyTemplateId, SellerInfo } from '../types/invoice';

interface CompanyLogoProps {
  templateId: CompanyTemplateId;
  logoDataUrl?: string;
  companyName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CompanyLogoSvg: React.FC<CompanyLogoProps> = ({
  templateId,
  logoDataUrl,
  companyName = '',
  size = 'md',
}) => {
  if (logoDataUrl) {
    const dim =
      size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
    return (
      <img
        src={logoDataUrl}
        alt={companyName}
        className={`${dim} object-contain rounded-lg bg-white p-0.5 shrink-0`}
      />
    );
  }

  // 1. Wjdcom Co. Ltd (Authentic Circular Silver/White Disc + Stylized Embossed "W" + Brushed Blue/Black Bottom Arc)
  if (templateId === 1) {
    return (
      <div className="inline-flex items-center justify-center shrink-0 select-none">
        <svg
          viewBox="0 0 120 120"
          className={
            size === 'sm'
              ? 'w-11 h-11'
              : size === 'lg'
                ? 'w-28 h-28'
                : 'w-20 h-20'
          }
        >
          <defs>
            <radialGradient id="wjdDisc" cx="42%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="68%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
            <linearGradient id="wjdBlueArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="55%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>
          {/* Soft Pearl/Silver Circular Disc */}
          <circle
            cx="58"
            cy="56"
            r="46"
            fill="url(#wjdDisc)"
            stroke="#E2E8F0"
            strokeWidth="1.2"
          />
          {/* Brushed Royal Blue Bottom-Left Crescent Arc */}
          <path
            d="M 19 74 A 47 47 0 0 0 96 82 A 43 43 0 0 1 25 66 Z"
            fill="url(#wjdBlueArc)"
          />
          <path
            d="M 24 83 A 48 48 0 0 0 92 88"
            fill="none"
            stroke="#0F172A"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M 21 76 A 46 46 0 0 0 85 90"
            fill="none"
            stroke="#1D4ED8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Embossed Stylized Calligraphic "W" */}
          <path
            d="M33 43 C35 62, 42 73, 47 73 C52 73, 56 57, 58 49 C60 57, 64 73, 69 73 C74 73, 81 62, 83 43"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="9.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 41 C34 60, 41 71, 46 71 C51 71, 55 55, 57 47 C59 55, 63 71, 68 71 C73 71, 80 60, 82 41"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  // 2. KAYANAT Trading Co. (Authentic Teal/Turquoise 3D Ribbon Emblem + "كيانات للتجارة" + Gray "KAYANAT" Bar)
  if (templateId === 2) {
    return (
      <div className="inline-flex flex-col items-center justify-center shrink-0 select-none">
        <svg
          viewBox="0 0 110 78"
          className={
            size === 'sm'
              ? 'w-11 h-9'
              : size === 'lg'
                ? 'w-24 h-18'
                : 'w-20 h-14'
          }
        >
          {/* Left Vertical Teal Pillar + Top Dot */}
          <circle cx="38" cy="18" r="4" fill="#1496A0" />
          <path
            d="M27 12 L33 18 V58 L27 52 Z"
            fill="#0F766E"
          />
          <path
            d="M35 25 L41 25 V62 L35 57 Z"
            fill="#1496A0"
          />
          {/* Upper Sweeping Turquoise Ribbon */}
          <path
            d="M35 30 C48 39, 68 37, 84 20 L84 31 C68 47, 48 49, 35 40 Z"
            fill="#2DD4BF"
          />
          {/* Lower Sweeping Teal Ribbon */}
          <path
            d="M35 46 C50 54, 67 51, 84 35 L84 48 C70 61, 52 64, 35 57 Z"
            fill="#0D9488"
          />
          {/* Bottom Right 3-Dots & Accent Bar */}
          <path d="M50 67 H69 L79 59 V64 L70 71 H50 Z" fill="#1496A0" />
          <circle cx="72" cy="70" r="1.6" fill="#0F766E" />
          <circle cx="76" cy="70" r="1.6" fill="#0F766E" />
          <circle cx="80" cy="70" r="1.6" fill="#0F766E" />
        </svg>
        {size !== 'sm' && (
          <div className="flex flex-col items-center -mt-1">
            <div className="text-[16px] font-black text-[#6B7280] tracking-tight leading-snug">
              كيانات للتجارة
            </div>
            <div className="bg-[#788288] text-[#67E8F9] font-black text-[11px] tracking-[0.28em] px-2.5 py-0.5 leading-none uppercase rounded-[1px]">
              KAYANAT
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Al Sharek Al Daem Est. (AL SHAREK / Orange Circle House / AL DAEM EST)
  if (templateId === 3) {
    return (
      <div className="inline-flex flex-col items-center justify-center text-center shrink-0 select-none">
        <div className="text-[11px] font-black tracking-widest text-[#15803D] uppercase leading-none mb-0.5">
          AL SHAREK
        </div>
        <svg
          viewBox="0 0 110 72"
          className={
            size === 'sm' ? 'w-14 h-9' : size === 'lg' ? 'w-28 h-18' : 'w-24 h-15'
          }
        >
          <ellipse
            cx="55"
            cy="36"
            rx="48"
            ry="31"
            fill="none"
            stroke="#EA580C"
            strokeWidth="3.5"
          />
          <ellipse
            cx="55"
            cy="36"
            rx="42"
            ry="26"
            fill="none"
            stroke="#EA580C"
            strokeWidth="1.8"
          />
          {/* Orange House Outline */}
          <path
            d="M32 35 L55 17 L78 35"
            fill="none"
            stroke="#EA580C"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M38 33 V50 H72 V33"
            fill="none"
            stroke="#EA580C"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-[11px] font-black tracking-widest text-[#15803D] uppercase leading-none mt-0.5">
          AL DAEM EST
        </div>
      </div>
    );
  }

  // 4. AL-MUZAINI EST. (Red/Blue 3D Triangle M Logo)
  if (templateId === 4) {
    return (
      <div className="inline-flex flex-col items-center text-center shrink-0 select-none">
        <svg
          viewBox="0 0 120 70"
          className={
            size === 'sm' ? 'w-14 h-9' : size === 'lg' ? 'w-28 h-16' : 'w-24 h-14'
          }
        >
          {/* Left & Right Red/Navy M Peaks */}
          <polygon points="18,58 44,12 58,38 48,58" fill="#B91C1C" />
          <polygon points="62,38 76,12 102,58 90,58 76,32 62,58" fill="#DC2626" />
          <polygon points="44,12 60,42 76,12 68,12 60,28 52,12" fill="#1E3A8A" />
          {/* Center Crane/Building Grid Accent */}
          <rect x="54" y="42" width="5" height="5" fill="#EA580C" />
          <rect x="61" y="42" width="5" height="5" fill="#EA580C" />
          <rect x="54" y="49" width="5" height="5" fill="#EA580C" />
          <rect x="61" y="49" width="5" height="5" fill="#EA580C" />
        </svg>
        {size !== 'sm' && (
          <>
            <div className="text-[11px] font-black text-red-700 tracking-wide leading-tight">
              AL-MUZAINI EST.
            </div>
            <div className="text-[7.5px] font-bold text-sky-800 tracking-widest uppercase">
              FOR GENERAL CONTRACTING
            </div>
          </>
        )}
      </div>
    );
  }

  // 5. Al Monathem Trading Co. (ATC Red/Navy Chevron Roof Emblem)
  if (templateId === 5) {
    return (
      <div className="inline-flex flex-col items-center text-center shrink-0 select-none">
        <svg
          viewBox="0 0 110 78"
          className={
            size === 'sm' ? 'w-12 h-9' : size === 'lg' ? 'w-24 h-17' : 'w-20 h-14'
          }
        >
          {/* Red Outer Roof */}
          <path
            d="M15 48 L55 10 L95 48 L83 48 L55 21 L27 48 Z"
            fill="#EF4444"
          />
          {/* Dark Red Inner Roof */}
          <path
            d="M29 52 L55 27 L81 52 L71 52 L55 36 L39 52 Z"
            fill="#991B1B"
          />
          {/* Blue Diamond Core */}
          <polygon points="55,40 64,49 55,58 46,49" fill="#0284C7" />
          {/* ATC Typography */}
          <text
            x="55"
            y="74"
            textAnchor="middle"
            fill="#0F766E"
            fontSize="20"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            letterSpacing="2"
          >
            ATC
          </text>
        </svg>
      </div>
    );
  }

  // 6. AL SINDAN AL MASI (DIAMOND ANVIL Blue Gear + Anchor + Diamond Logo)
  if (templateId === 6) {
    return (
      <div className="inline-flex flex-col items-center justify-center shrink-0 select-none">
        <svg
          viewBox="0 0 110 110"
          className={
            size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-24 h-24' : 'w-20 h-20'
          }
        >
          {/* Outer Text Ring */}
          <circle
            cx="55"
            cy="58"
            r="36"
            fill="#1E1B4B"
            stroke="#312E81"
            strokeWidth="3"
          />
          {/* Gear Teeth */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <rect
              key={deg}
              x="51"
              y="16"
              width="8"
              height="8"
              rx="1.5"
              fill="#1E1B4B"
              transform={`rotate(${deg} 55 58)`}
            />
          ))}
          <circle cx="55" cy="58" r="26" fill="#FFFFFF" />
          {/* Inner Diamond & Anchor */}
          <polygon points="55,34 75,58 55,82 35,58" fill="#312E81" />
          <path
            d="M55 43 V71 M47 51 H63 M44 64 C44 72 66 72 66 64"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <text
            x="55"
            y="13"
            textAnchor="middle"
            fill="#1E1B4B"
            fontSize="9.5"
            fontWeight="900"
            letterSpacing="0.8"
          >
            DIAMOND ANVIL
          </text>
        </svg>
      </div>
    );
  }

  // 7. AUTAD AL-ALSARH Commercial (Clean Bilingual Typographic Mark + Cyan/Red Bars from 3.pdf)
  if (templateId === 7) {
    return (
      <div className="inline-flex flex-col items-center justify-center text-center shrink-0 select-none px-1.5 py-1">
        <div className="text-[10px] font-black text-slate-900 leading-tight whitespace-nowrap">
          أوتاد الصرح
        </div>
        <div
          dir="ltr"
          className="text-[8.5px] font-extrabold text-slate-700 tracking-tight leading-tight whitespace-nowrap"
        >
          AUTAD AL-ALSARH
        </div>
        <div className="w-full h-1 bg-sky-500 rounded-full mt-1" />
        <div className="w-10/12 h-0.5 bg-red-600 rounded-full mt-0.5" />
      </div>
    );
  }

  // 8. Default / Oasis Falcon of Arabia (Saqr Al-Arouba)
  return (
    <div className="inline-flex items-center justify-center shrink-0">
      <svg
        viewBox="0 0 72 72"
        className={
          size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-13 h-13'
        }
      >
        <rect
          x="4"
          y="4"
          width="64"
          height="64"
          rx="14"
          fill="#0F172A"
          stroke="#B45309"
          strokeWidth="3"
        />
        <path
          d="M20 48 L36 18 L52 48 L36 40 Z"
          fill="#F59E0B"
        />
      </svg>
    </div>
  );
};

interface CompanyGalleryViewProps {
  companies: SellerInfo[];
  activeCompanyId?: string;
  itemsCount: number;
  clientName: string;
  onSelectCompany: (company: SellerInfo) => void;
  onOpenCompanySettings: () => void;
}

export const CompanyGalleryView: React.FC<CompanyGalleryViewProps> = ({
  companies,
  activeCompanyId,
  itemsCount,
  clientName,
  onSelectCompany,
  onOpenCompanySettings,
}) => {
  const renderMiniThumbnail = (templateId: CompanyTemplateId) => {
    switch (templateId) {
      case 1: // Wjdcom
        return (
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs">
            <div className="flex items-start justify-between border-b border-slate-200 pb-1.5">
              <div className="font-black text-slate-900 text-[9px]">
                فاتورة ضريبية
                <div className="text-[7px] text-slate-400 font-normal">
                  Tax Invoice
                </div>
              </div>
              <div className="text-center text-[7px] text-slate-500">
                <div>رقم الفاتورة #1</div>
                <div>التاريخ</div>
              </div>
              <div className="flex items-center gap-1">
                <div className="text-left">
                  <div className="font-bold text-blue-700 text-[7.5px]">
                    الرصيد المتبقي
                  </div>
                  <div className="font-black text-slate-900">﷼ ١٠,٨٨١</div>
                </div>
                <div className="w-4 h-4 rounded-full bg-blue-700 text-white flex items-center justify-center font-black text-[7px]">
                  W
                </div>
              </div>
            </div>
            <div className="space-y-1 my-1">
              <div className="h-2 bg-slate-100 border-y border-slate-300 w-full" />
              <div className="h-1.5 bg-slate-50 w-5/6" />
              <div className="h-1.5 bg-slate-50 w-4/6" />
            </div>
            <div className="flex items-end justify-between pt-1 border-t border-slate-100">
              <div className="w-6 h-6 border border-slate-400 bg-slate-100 rounded-xs" />
              <div className="w-20 h-4 bg-blue-50 border border-blue-200 rounded-xs" />
            </div>
          </div>
        );

      case 2: // Kayanat
        return (
          <div className="bg-white border border-teal-200/80 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-teal-600 text-white flex items-center justify-center font-black text-[7px]">
                  K
                </div>
                <span className="font-black text-teal-800">كيانات KAYANAT</span>
              </div>
              <div className="text-left font-black text-slate-800">
                فاتورة ضريبية <span className="text-slate-400">Tax Invoice</span>
              </div>
            </div>
            <div className="space-y-1 my-1">
              <div className="h-2 bg-teal-50 border-b border-teal-300 w-full" />
              <div className="h-1.5 bg-slate-50 w-full" />
              <div className="h-1.5 bg-slate-50 w-3/4" />
            </div>
            <div className="flex items-end justify-between">
              <div className="w-6 h-6 border border-slate-400 bg-slate-100 rounded-xs" />
              <div className="w-24 h-5 bg-slate-100 border border-slate-300 rounded-xs px-1 flex items-center justify-between">
                <span>المجموع</span>
                <span className="font-black text-teal-700">SAR</span>
              </div>
            </div>
          </div>
        );

      case 3: // Sharek Al Daem
        return (
          <div className="bg-white border border-orange-200 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs">
            <div className="grid grid-cols-3 items-center border-b border-slate-200 pb-1">
              <div className="text-[7px] font-bold text-slate-700 truncate">
                مؤسسة الشريك الدائم
              </div>
              <div className="mx-auto w-6 h-4 rounded-full border-2 border-orange-600 flex items-center justify-center text-[6px] font-black text-green-700">
                ⌂
              </div>
              <div
                dir="ltr"
                className="text-[6.5px] font-bold text-slate-600 truncate"
              >
                Al Sharek Al Daem
              </div>
            </div>
            <div className="h-2.5 bg-[#1E3A8A] text-white text-[6.5px] font-bold flex items-center justify-between px-1.5 rounded-2xs">
              <span>Item صنف</span>
              <span>Description البيان</span>
              <span>Line Total</span>
            </div>
            <div className="flex items-end justify-between pt-1">
              <div className="w-20 h-6 bg-sky-200/70 border border-sky-400 rounded-2xs p-0.5 text-[6px] font-bold text-slate-800">
                Total: 81,199.20
              </div>
              <div className="w-6 h-6 border border-slate-400 bg-slate-100 rounded-xs" />
            </div>
          </div>
        );

      case 4: // Al-Muzaini
        return (
          <div
            dir="ltr"
            className="bg-white border border-sky-200 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[7.5px] font-black text-red-700">
                  ▲ AL-MUZAINI EST.
                </div>
                <div className="text-[6.5px] text-slate-600">
                  مؤسسة المزيني للمقاولات
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-800">
                  Tax Invoice INV
                </span>
                <div className="w-5 h-5 border border-slate-400 bg-slate-100 mt-0.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 border border-slate-400 h-6 text-[6.5px]">
              <div className="col-span-2 px-1 flex items-center">Bill To:</div>
              <div className="bg-[#2581C4] text-white px-1 flex items-center font-bold">
                Amount Due
              </div>
            </div>
            <div className="h-3 bg-[#2581C4] text-white text-[6px] font-bold flex items-center justify-between px-1.5">
              <span>Goods or Services</span>
              <span>Qty</span>
              <span>Subtotal (Inc VAT)</span>
            </div>
          </div>
        );

      case 5: // Al Monathem ATC
        return (
          <div className="bg-white border border-teal-300 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-teal-700 pb-1">
              <div className="font-black text-teal-800 text-[8px]">
                شركة المنظم التجارية
              </div>
              <div className="text-[7.5px] font-black text-red-600">
                ▲ ATC
              </div>
            </div>
            <div className="grid grid-cols-2 border border-slate-400 text-[6px] bg-slate-50 px-1 py-0.5">
              <div>Seller المورد</div>
              <div className="border-r border-slate-300 pr-1">Buyer العميل</div>
            </div>
            <div className="flex items-end justify-between pt-0.5">
              <div className="text-[6px] font-bold text-slate-600">
                حساب مصرف الإنماء
              </div>
              <div className="w-5 h-5 border border-slate-400 bg-slate-100" />
              <div className="w-16 h-5 border border-slate-400 bg-slate-50 text-[6px] font-bold px-1 flex items-center">
                Net Total
              </div>
            </div>
          </div>
        );

      case 6: // Al Sindan Al Masi
        return (
          <div className="bg-white border border-indigo-200 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs">
            <div className="grid grid-cols-3 items-center border-b border-slate-300 pb-1">
              <div className="text-[6.5px] font-black text-red-800 truncate">
                السندان الماسي
              </div>
              <div className="mx-auto w-5 h-5 rounded-full bg-indigo-950 text-white flex items-center justify-center text-[6px]">
                ⚓
              </div>
              <div
                dir="ltr"
                className="text-[6px] font-black text-red-800 truncate"
              >
                AL SINDAN
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="h-2 bg-slate-300/80 border border-slate-500 rounded-2xs" />
              <div className="h-2.5 bg-slate-400/70 border border-slate-600 text-[6px] font-bold flex items-center justify-between px-1">
                <span>Total الاجمالي</span>
                <span>Item Name أسم الصنف</span>
                <span>No</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <div className="w-14 h-5 bg-slate-200 border border-slate-400" />
              <div className="w-5 h-5 border border-slate-400 bg-slate-100" />
              <div className="w-16 h-5 border border-slate-400 bg-slate-50" />
            </div>
          </div>
        );

      case 7: // Autad Al-Alsarh
        return (
          <div className="bg-white border border-blue-200 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs">
            <div className="flex items-center justify-between border-b-2 border-red-600 pb-1">
              <div className="font-black text-slate-900 text-[7.5px]">
                مؤسسة أوتاد الصرح التجارية
              </div>
              <div className="font-black text-blue-700 text-[8px]">AUTAD</div>
            </div>
            <div className="grid grid-cols-3 gap-1 items-center my-0.5">
              <div className="border border-slate-400 rounded-xs h-7 p-0.5 text-[5.5px]">
                بيانات العميل
              </div>
              <div className="mx-auto w-7 h-7 border border-slate-500 bg-slate-100 flex items-center justify-center text-[5px] font-bold">
                QR
              </div>
              <div className="border border-slate-400 rounded-xs h-7 p-0.5 text-[5.5px]">
                بيانات الشركة
              </div>
            </div>
            <div className="h-3 bg-[#1E3A8A] text-white text-[5.5px] font-bold flex items-center justify-between px-1.5 rounded-2xs">
              <span>الأهلي SNB</span>
              <span>Total including VAT</span>
            </div>
          </div>
        );

      default: // 8: Saqr Al-Arouba
        return (
          <div className="bg-white border border-amber-300 rounded-lg p-2.5 h-28 flex flex-col justify-between text-[8px] shadow-2xs">
            <div className="grid grid-cols-3 items-center border-b-2 border-[#0F172A] pb-1">
              <div className="font-black text-[#0F172A] text-[7px] truncate">
                واحة صقر العروبة
              </div>
              <div className="bg-[#0F172A] text-amber-400 text-[6px] font-black text-center py-0.5 rounded-xs border-b border-amber-500">
                فاتورة ضريبية
              </div>
              <div
                dir="ltr"
                className="text-[6px] font-bold text-slate-600 truncate"
              >
                Oasis Falcon
              </div>
            </div>
            <div className="h-2.5 bg-[#0F172A] text-white text-[6px] font-bold flex items-center justify-between px-1">
              <span>م</span>
              <span>البيان</span>
              <span>الإجمالي</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-16 h-4 bg-amber-50 border border-amber-300 rounded-2xs" />
              <div className="w-5 h-5 border border-slate-400 bg-slate-100" />
            </div>
          </div>
        );
    }
  };

  return (
    <div dir="rtl" className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-l from-[#0F172A] via-slate-900 to-[#0F172A] text-white rounded-2xl p-5 sm:p-6 border-b-4 border-[#B45309] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>منصة صقر للفوترة الإلكترونية الموحدة — 8 شركات وقوالب معتمدة</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
            اختر الشركة المصدرة للفاتورة لعرض قالبها الرسمي فوراً
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-semibold max-w-2xl leading-relaxed">
            يمكنك إدخال أو استيراد بنود الفاتورة من شيت إكسل مرة واحدة، والتنقل بين
            الشركات بحرية تامة دون فقدان أي بند أو سعر. كل شركة تمتلك ترويسة
            وجدولاً مطابقاً لفاتورتها الأصلية مع رمز QR موحد لنسخة PDF.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <div className="text-xs font-bold flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
              <span>البنود الحالية المحفوظة بالذاكرة:</span>
              <strong className="num-tabular text-white font-black">
                {itemsCount} بند
              </strong>
            </div>
            {clientName && (
              <div className="hidden sm:block text-slate-300 border-r border-slate-700 pr-3">
                العميل: <strong className="text-amber-300">{clientName}</strong>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenCompanySettings}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>إضافة شركة جديدة أو تعديل بيانات الشركات</span>
          </button>
        </div>
      </div>

      {/* Responsive Grid of Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {companies.map((comp, idx) => {
          const tplId = (comp.templateId || ((idx % 8) + 1)) as CompanyTemplateId;
          const tplMeta =
            COMPANY_TEMPLATES.find((t) => t.id === tplId) || COMPANY_TEMPLATES[0];
          const isSelected = comp.id === activeCompanyId;

          return (
            <div
              key={comp.id || idx}
              onClick={() => onSelectCompany(comp)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCompany(comp);
                }
              }}
              className={`group text-right rounded-2xl bg-white border-2 transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1 hover:shadow-2xl ${
                isSelected
                  ? 'border-[#B45309] ring-4 ring-amber-500/20 shadow-xl'
                  : 'border-slate-200/90 hover:border-slate-400 shadow-md'
              }`}
            >
              <div>
                {/* Card Top Brand Bar */}
                <div
                  style={{ backgroundColor: tplMeta.primaryColor }}
                  className="px-4 py-2.5 text-white flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] font-extrabold bg-white/15 px-2.5 py-0.5 rounded-full">
                    {tplMeta.accentBadge}
                  </span>
                  <span className="text-[10.5px] font-bold opacity-85 num-tabular">
                    قالب #{tplId} • خط {tplMeta.fontLabel}
                  </span>
                </div>

                {/* Company Identity & Authentic SVG Logo */}
                <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm sm:text-[15px] font-black text-slate-900 group-hover:text-[#B45309] transition-colors leading-snug">
                      {comp.arabicName}
                    </h3>
                    <p
                      dir="ltr"
                      className="text-[11px] font-bold text-slate-500 truncate text-right"
                    >
                      {comp.englishName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10.5px] font-bold text-slate-600 num-tabular">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        س.ت: {comp.crNumber}
                      </span>
                      <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                        ضريبي: {comp.taxNumber}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex items-center justify-center">
                    <CompanyLogoSvg
                      templateId={tplId}
                      logoDataUrl={comp.logoDataUrl}
                      companyName={comp.arabicName}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Miniature Structural Invoice Thumbnail */}
                <div className="px-4 py-3 bg-slate-50/70">
                  <div className="text-[10px] font-extrabold text-slate-500 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>معاينة هيكل الفاتورة المعتمد:</span>
                    </span>
                    <span className="text-[9.5px] text-slate-400" dir="ltr">
                      {tplMeta.englishLabel.split('•')[0]}
                    </span>
                  </div>
                  {renderMiniThumbnail(tplId)}
                  <p className="text-[11px] font-semibold text-slate-600 mt-2 leading-relaxed line-clamp-2">
                    {tplMeta.description}
                  </p>
                </div>
              </div>

              {/* Card Footer CTA */}
              <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{comp.city || comp.address}</span>
                </div>

                <span
                  style={{
                    backgroundColor: isSelected
                      ? '#B45309'
                      : tplMeta.primaryColor,
                  }}
                  className="inline-flex items-center gap-1.5 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs group-hover:opacity-95 transition-all shrink-0"
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>الشركة المختارة — عرض الفاتورة</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>اختيار وإصدار فاتورة</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
