import React, { useState } from 'react';
import {
  Building2,
  Check,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMPANY_TEMPLATES,
  DEFAULT_COMPANIES,
} from '../constants/defaults';
import { CompanyTemplateId, SellerInfo } from '../types/invoice';
import { generateId } from '../utils/formatters';

interface SellerSettingsModalProps {
  companies: SellerInfo[];
  activeSeller: SellerInfo;
  onSelectCompany: (company: SellerInfo) => void;
  onSaveCompanies: (
    updatedCompanies: SellerInfo[],
    selectedCompany: SellerInfo
  ) => void;
  onClose: () => void;
}

export const SellerSettingsModal: React.FC<SellerSettingsModalProps> = ({
  companies,
  activeSeller,
  onSelectCompany,
  onSaveCompanies,
  onClose,
}) => {
  const [list, setList] = useState<SellerInfo[]>(() =>
    companies.length > 0 ? companies : DEFAULT_COMPANIES
  );
  const [editingCompany, setEditingCompany] = useState<SellerInfo>(() => ({
    ...activeSeller,
    id: activeSeller.id || list[0]?.id || generateId('comp'),
    templateId: activeSeller.templateId || 1,
  }));

  const handleSelectFromList = (comp: SellerInfo) => {
    setEditingCompany({
      ...comp,
      templateId: comp.templateId || 1,
    });
  };

  const handleAddNewCompany = () => {
    const nextTemplate = (((list.length % 8) + 1) as CompanyTemplateId) || 1;
    const newComp: SellerInfo = {
      id: generateId('comp'),
      arabicName: `شركة جديدة رقم ${list.length + 1} للتجارة والمقاولات`,
      legalType: 'ذات مسؤولية محدودة',
      crNumber: '1010000000',
      taxNumber: '300000000000003',
      englishName: `New Trading & Contracting Company ${list.length + 1} - LLC`,
      address: 'المملكة العربية السعودية - الرياض',
      templateId: nextTemplate,
    };
    const nextList = [...list, newComp];
    setList(nextList);
    setEditingCompany(newComp);
  };

  const handleDeleteCompany = (id?: string) => {
    if (!id || list.length <= 1) return;
    const nextList = list.filter((c) => c.id !== id);
    setList(nextList);
    if (editingCompany.id === id) {
      setEditingCompany(nextList[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exists = list.some((c) => c.id === editingCompany.id);
    const updatedList = exists
      ? list.map((c) => (c.id === editingCompany.id ? editingCompany : c))
      : [...list, editingCompany];

    onSaveCompanies(updatedList, editingCompany);
    onSelectCompany(editingCompany);
    onClose();
  };

  const handleQuickApplyCompany = (comp: SellerInfo) => {
    const exists = list.some((c) => c.id === editingCompany.id);
    const updatedList = exists
      ? list.map((c) => (c.id === editingCompany.id ? editingCompany : c))
      : list;
    const target = comp.id === editingCompany.id ? editingCompany : comp;
    onSaveCompanies(updatedList, target);
    onSelectCompany(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#B45309] shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold">
                إدارة واختيار الشركة المصدرة للفاتورة (5 إلى 10 شركات وقوالب)
              </h2>
              <p className="text-[11px] text-slate-300 font-semibold">
                اختر الشركة لتطبيق بياناتها وشعارها وتصميم الفاتورة وسند القبض الخاص بها فوراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Split (Companies List + Active Company & Template Editor) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200">
          {/* Right Column: Companies List */}
          <div className="lg:col-span-5 bg-slate-50 p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#0F172A]">
                  الشركات المسجلة ({list.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewCompany}
                  className="inline-flex items-center gap-1 text-xs font-extrabold bg-[#B45309] hover:bg-[#92400E] text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة شركة جديدة</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-0.5">
                {list.map((comp, idx) => {
                  const isSelected = comp.id === editingCompany.id;
                  const tpl =
                    COMPANY_TEMPLATES.find(
                      (t) => t.id === (comp.templateId || 1)
                    ) || COMPANY_TEMPLATES[0];

                  return (
                    <div
                      key={comp.id || idx}
                      onClick={() => handleSelectFromList(comp)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-2 border-[#B45309] shadow-md'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {comp.logoDataUrl ? (
                            <img
                              src={comp.logoDataUrl}
                              alt=""
                              className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-amber-400 font-extrabold text-xs flex items-center justify-center shrink-0 num-tabular">
                              {idx + 1}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-[#0F172A] truncate">
                              {comp.arabicName}
                            </div>
                            <div className="text-[10.5px] font-semibold text-slate-500 num-tabular">
                              ضريبي: {comp.taxNumber} • س.ت: {comp.crNumber}
                            </div>
                          </div>
                        </div>

                        {list.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompany(comp.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="حذف الشركة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold bg-amber-50 text-[#B45309] border border-amber-200 px-2 py-0.5 rounded-full">
                          {tpl.accentBadge}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickApplyCompany(comp);
                          }}
                          className="text-[11px] font-extrabold bg-[#0F172A] hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg transition-colors"
                        >
                          اعتماد وإصدار بها ←
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setList(DEFAULT_COMPANIES);
                setEditingCompany(DEFAULT_COMPANIES[0]);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الشركات الـ 8 المعتمدة الافتراضية</span>
            </button>
          </div>

          {/* Left Column: Selected Company Details & 8 Template Selector */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 p-5 space-y-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-extrabold text-[#0F172A]">
                تعديل بيانات الشركة المحددة والقالب المعتمد
              </h3>
              <span className="text-[11px] font-bold text-[#B45309]">
                قالب رقم #{editingCompany.templateId || 1}
              </span>
            </div>

            {/* Template Selector (1 to 8) */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <LayoutTemplate className="w-4 h-4 text-[#B45309]" />
                <span>اختر هيكل وتصميم الفاتورة وسند القبض (8 قوالب معتمدة):</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPANY_TEMPLATES.map((tpl) => {
                  const active = (editingCompany.templateId || 1) === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() =>
                        setEditingCompany({
                          ...editingCompany,
                          templateId: tpl.id,
                        })
                      }
                      style={{ fontFamily: tpl.fontFamily }}
                      className={`text-right p-2.5 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-50/90 border-2 border-[#B45309] shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-[#0F172A]">
                          {tpl.name}
                        </span>
                        {active && (
                          <Check className="w-4 h-4 text-[#B45309] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Company Arabic Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الشركة بالعربية (يظهر في الترويسة ورمز ZATCA)
              </label>
              <input
                type="text"
                required
                value={editingCompany.arabicName}
                onChange={(e) =>
                  setEditingCompany({
                    ...editingCompany,
                    arabicName: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold focus:border-[#B45309] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكيان القانوني
                </label>
                <input
                  type="text"
                  value={editingCompany.legalType}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      legalType: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#B45309] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم السجل التجاري
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingCompany.crNumber}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      crNumber: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم الضريبي (15 رقماً)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={editingCompany.taxNumber}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      taxNumber: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم والتفاصيل بالإنجليزية (English Corporate Header)
              </label>
              <input
                type="text"
                dir="ltr"
                value={editingCompany.englishName}
                onChange={(e) =>
                  setEditingCompany({
                    ...editingCompany,
                    englishName: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#B45309] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العنوان الوطني (يظهر في الترويسة والتذييل)
              </label>
              <input
                type="text"
                dir="auto"
                value={editingCompany.address}
                onChange={(e) =>
                  setEditingCompany({
                    ...editingCompany,
                    address: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#B45309] outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-[#0F172A] hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors"
              >
                <Check className="w-4 h-4 text-amber-400" />
                <span>حفظ واعتماد الشركة والقالب</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
