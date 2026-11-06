import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Database,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { CatalogItem, InvoiceLineItem } from '../types/invoice';
import { formatMoney, normalizeArabic } from '../utils/formatters';
import { UnitSelectorCombobox } from './UnitSelectorCombobox';

interface LineItemRowProps {
  index: number;
  item: InvoiceLineItem;
  catalog: CatalogItem[];
  canDelete: boolean;
  onChange: (id: string, patch: Partial<InvoiceLineItem>) => void;
  onRemove: (id: string) => void;
  onSaveNewCatalogItem: (
    name: string,
    unitPrice: number,
    unit?: string,
    defaultQuantity?: number
  ) => void;
}

export const LineItemRow: React.FC<LineItemRowProps> = ({
  index,
  item,
  catalog,
  canDelete,
  onChange,
  onRemove,
  onSaveNewCatalogItem,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = useMemo(
    () => normalizeArabic(item.description),
    [item.description]
  );

  const matchingCatalogItems = useMemo(() => {
    if (!normalizedQuery) return catalog.slice(0, 8);
    return catalog
      .filter((c) => normalizeArabic(c.name).includes(normalizedQuery))
      .slice(0, 8);
  }, [catalog, normalizedQuery]);

  const exactCatalogMatch = useMemo(() => {
    if (!normalizedQuery) return true;
    return catalog.some((c) => normalizeArabic(c.name) === normalizedQuery);
  }, [catalog, normalizedQuery]);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [normalizedQuery]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectCatalogItem = (selected: CatalogItem) => {
    onChange(item.id, {
      description: selected.name,
      unit: selected.unit || item.unit || 'وحدة',
      qty:
        Number(selected.defaultQuantity) > 0
          ? Number(selected.defaultQuantity)
          : item.qty || 1,
      unitPrice: selected.unitPrice,
    });
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || matchingCatalogItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % matchingCatalogItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        prev - 1 < 0 ? matchingCatalogItems.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = matchingCatalogItems[highlightedIdx];
      if (target) {
        handleSelectCatalogItem(target);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleSaveToCatalogClick = () => {
    const cleanName = item.description.trim();
    if (!cleanName) return;
    onSaveNewCatalogItem(
      cleanName,
      Number(item.unitPrice) || 0,
      item.unit || 'وحدة',
      Number(item.qty) > 0 ? Number(item.qty) : 1
    );
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const rowTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-3 transition-all space-y-2.5 shadow-2xs">
      {/* Top Row Header + Delete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-900 text-white text-xs font-bold num-tabular flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-700">
            بند الفاتورة #{index + 1}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            الإجمالي:{' '}
            <strong className="num-tabular text-slate-900 font-bold">
              {formatMoney(rowTotal)} ر.س
            </strong>
          </span>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={!canDelete}
            title={canDelete ? 'حذف البند' : 'يجب بقاء بند واحد على الأقل'}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description Input with Floating Smart Autocomplete */}
      <div ref={wrapperRef} className="relative">
        <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
          البيان (ابحث في قاعدة الأصناف أو اكتب بياناً جديداً)
        </label>
        <div className="relative">
          <input
            type="text"
            value={item.description}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              onChange(item.id, { description: e.target.value });
              setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="مثال: تطوير وربط البنية السحابية / Cloud Infrastructure & API..."
            className="w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Floating Autocomplete Dropdown */}
        {isDropdownOpen && matchingCatalogItems.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-600" />
                <span>أصناف مقترحة من قاعدة البيانات</span>
              </span>
              <span>الوحدة / الكمية / السعر</span>
            </div>
            <ul className="max-h-52 overflow-y-auto divide-y divide-slate-100">
              {matchingCatalogItems.map((catItem, i) => (
                <li
                  key={catItem.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectCatalogItem(catItem);
                  }}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors ${
                    i === highlightedIdx
                      ? 'bg-teal-50/60 text-slate-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold truncate">{catItem.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10.5px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {catItem.defaultQuantity || 1} {catItem.unit || 'وحدة'}
                    </span>
                    <span className="num-tabular font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50">
                      {formatMoney(catItem.unitPrice)} ر.س
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* One-Click Save New Item Badge */}
        {item.description.trim().length > 1 && !exactCatalogMatch && (
          <div className="mt-1.5 flex items-center">
            <button
              type="button"
              onClick={handleSaveToCatalogClick}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ حفظ كصنف جديد في قاعدة البيانات</span>
            </button>
          </div>
        )}

        {justSaved && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
            <Check className="w-3.5 h-3.5" />
            <span>تم حفظ الصنف وسعره في قاعدة البيانات بنجاح</span>
          </div>
        )}
      </div>

      {/* Unit, Quantity & Unit Price Inputs */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            الوحدة
          </label>
          <UnitSelectorCombobox
            value={item.unit ?? 'وحدة'}
            onChange={(newUnit) => onChange(item.id, { unit: newUnit })}
            placeholder="وحدة / طن / م3"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            الكمية
          </label>
          <input
            type="number"
            min="0"
            step="any"
            dir="ltr"
            value={item.qty}
            onChange={(e) =>
              onChange(item.id, {
                qty: e.target.value === '' ? 0 : parseFloat(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-right num-tabular text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            السعر قبل الضريبة
          </label>
          <input
            type="number"
            min="0"
            step="any"
            dir="ltr"
            value={item.unitPrice}
            onChange={(e) =>
              onChange(item.id, {
                unitPrice:
                  e.target.value === '' ? 0 : parseFloat(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-right num-tabular text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none"
          />
        </div>
      </div>
    </div>
  );
};
