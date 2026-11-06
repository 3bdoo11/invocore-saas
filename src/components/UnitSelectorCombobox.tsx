import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CATEGORIZED_UNITS } from '../constants/defaults';

interface UnitSelectorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export const UnitSelectorCombobox: React.FC<UnitSelectorComboboxProps> = ({
  value,
  onChange,
  placeholder = 'اختر الوحدة...',
  className = '',
  inputClassName = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return CATEGORIZED_UNITS;

    return CATEGORIZED_UNITS.map((cat) => ({
      ...cat,
      units: cat.units.filter((u) => u.toLowerCase().includes(q)),
    })).filter((cat) => cat.units.length > 0);
  }, [filterText]);

  const handleSelectUnit = (unit: string) => {
    onChange(unit);
    setFilterText('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-right ${className}`}
      dir="rtl"
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setFilterText(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setFilterText('');
            setIsOpen(true);
          }}
          className={`w-full rounded-lg border border-slate-300 bg-white pr-2.5 pl-7 py-1.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all ${inputClassName}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            setFilterText('');
            setIsOpen((prev) => !prev);
            if (!isOpen) inputRef.current?.focus();
          }}
          className="absolute left-1.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
          title="عرض قائمة الوحدات القياسية"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-teal-600' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 right-0 left-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl text-xs py-1.5">
          {filteredCategories.length === 0 ? (
            <div className="p-3 text-center text-slate-400 font-semibold">
              لا توجد وحدة مطابقة. يمكنك كتابة وحدتك المخصصة بحرية.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.category} className="mb-2 last:mb-0">
                <div className="px-3 py-1 text-[10px] font-black text-slate-700 bg-slate-100 sticky top-0 border-y border-slate-200 flex items-center justify-between">
                  <span>{cat.category}</span>
                  <span className="text-[9px] text-slate-500 font-normal">
                    {cat.units.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-50 pt-0.5">
                  {cat.units.map((unit) => {
                    const isSelected = value.trim() === unit.trim();
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleSelectUnit(unit)}
                        className={`w-full text-right px-3 py-1.5 flex items-center justify-between font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 text-teal-900 font-black'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{unit}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-teal-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
