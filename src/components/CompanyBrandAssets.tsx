import React from 'react';
import { Building2 } from 'lucide-react';
import { SellerInfo } from '../types/invoice';

interface CompanyLogoProps {
  logoDataUrl?: string;
  companyName?: string;
  primaryColor?: string;
  size?: 'sm' | 'md' | 'lg';
  templateId?: number;
}

export const CompanyLogoSvg: React.FC<CompanyLogoProps> = ({
  logoDataUrl,
  companyName = '',
  primaryColor = '#0F172A',
  size = 'md',
}) => {
  const dim =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';

  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt={companyName}
        className={`${dim} object-contain rounded-lg bg-white p-0.5 shrink-0`}
      />
    );
  }

  const initials = companyName ? companyName.trim().slice(0, 2) : 'IC';

  return (
    <div
      style={{
        backgroundColor: `${primaryColor}15`,
        color: primaryColor,
        borderColor: primaryColor,
      }}
      className={`${dim} rounded-xl border-2 flex items-center justify-center font-black text-sm shrink-0 shadow-xs`}
    >
      {initials}
    </div>
  );
};

export const CompanyGalleryView: React.FC<{
  currentSeller: SellerInfo;
  onSelectCompany: (seller: SellerInfo) => void;
  onOpenSettings?: () => void;
}> = ({ currentSeller, onOpenSettings }) => {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto">
        <Building2 className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-black text-slate-900">
        المنشأة الحالية: {currentSeller.arabicName || 'غير محددة'}
      </h3>
      <p className="text-xs text-slate-500">
        يمكنك تعديل بيانات المنشأة والشعار والنمط من تبويب "إعدادات المنشأة".
      </p>
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-[#0F172A] text-white text-xs font-bold px-4 py-2 rounded-xl"
        >
          فتح إعدادات المنشأة
        </button>
      )}
    </div>
  );
};
