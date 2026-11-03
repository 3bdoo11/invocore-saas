import React from 'react';
import { X } from 'lucide-react';
import { SellerInfo } from '../types/invoice';
import { CompanySettingsTab } from './CompanySettingsTab';

interface SellerSettingsModalProps {
  seller: SellerInfo;
  onUpdateSeller: (updated: SellerInfo) => void;
  onSave: () => void;
  onClose: () => void;
}

export const SellerSettingsModal: React.FC<SellerSettingsModalProps> = ({
  seller,
  onUpdateSeller,
  onSave,
  onClose,
}) => {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-4xl bg-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-black">إعدادات المنشأة والهوية المعتمدة</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <CompanySettingsTab
            seller={seller}
            onUpdateSeller={onUpdateSeller}
            onSave={() => {
              onSave();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
