import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckSquare,
  Download,
  Edit3,
  FileDown,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Search,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CatalogItem } from '../types/invoice';
import { UnitSelectorCombobox } from './UnitSelectorCombobox';
import {
  downloadEmptyCatalogTemplate,
  exportCatalogToExcel,
  ImportedCatalogItemData,
  parseExcelCatalogFile,
} from '../utils/excelCatalog';
import { formatMoney, formatQty, normalizeArabic } from '../utils/formatters';

interface CatalogManagerTabProps {
  catalog: CatalogItem[];
  onAddCatalogItem: (
    name: string,
    unitPrice: number,
    unit?: string,
    defaultQuantity?: number
  ) => void;
  onUpdateCatalogItem: (
    id: string,
    name: string,
    unitPrice: number,
    unit?: string,
    defaultQuantity?: number
  ) => void;
  onDeleteCatalogItem: (id: string) => void;
  onMergeImportedItems: (
    items: ImportedCatalogItemData[]
  ) => { added: number; updated: number };
  onResetDefaultCatalog: () => void;
  onInsertItemIntoInvoice: (item: CatalogItem) => void;
  onInsertMultipleItemsIntoInvoice?: (items: CatalogItem[]) => void;
}

export const CatalogManagerTab: React.FC<CatalogManagerTabProps> = ({
  catalog,
  onAddCatalogItem,
  onUpdateCatalogItem,
  onDeleteCatalogItem,
  onMergeImportedItems,
  onResetDefaultCatalog,
  onInsertItemIntoInvoice,
  onInsertMultipleItemsIntoInvoice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual 6-Column Add Form State
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('وحدة');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('');

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('وحدة');
  const [editQty, setEditQty] = useState('1');
  const [editPrice, setEditPrice] = useState('');

  // Selection State (Checkboxes for selective export & bulk insert)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const filteredCatalog = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        normalizeArabic(item.name).includes(q) ||
        normalizeArabic(item.unit || '').includes(q)
    );
  }, [catalog, searchQuery]);

  const selectedItems = useMemo(
    () => catalog.filter((item) => selectedIds.includes(item.id)),
    [catalog, selectedIds]
  );

  const isAllFilteredSelected =
    filteredCatalog.length > 0 &&
    filteredCatalog.every((item) => selectedIds.includes(item.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredCatalog.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([
        ...selectedIds,
        ...filteredCatalog.map((i) => i.id),
      ]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) {
      showNotice('error', 'يرجى إدخال اسم الصنف أو البيان أولاً.');
      return;
    }
    const unit = newUnit.trim() || 'وحدة';
    const qty = Math.max(0.001, parseFloat(newQty) || 1);
    const price = Math.max(0, parseFloat(newPrice) || 0);

    onAddCatalogItem(cleanName, price, unit, qty);
    setNewName('');
    setNewUnit('وحدة');
    setNewQty('1');
    setNewPrice('');
    showNotice('success', `تمت إضافة "${cleanName}" (${qty} ${unit}) إلى قاعدة الأصناف.`);
  };

  const handleExcelFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseExcelCatalogFile(file);
      if (result.items.length === 0) {
        showNotice(
          'error',
          'لم يتم العثور على أصناف صالحة في الملف. تأكد من وجود عمود البيان والسعر.'
        );
      } else {
        const stats = onMergeImportedItems(result.items);
        showNotice(
          'success',
          `تم استيراد ${stats.added} صنف جديد وتحديث ${stats.updated} صنف بنجاح (مع الوحدات والكميات)`
        );
      }
    } catch {
      showNotice(
        'error',
        'تعذر قراءة ملف الإكسل. يرجى التأكد من أن الصيغة .xlsx أو .csv صحيحة.'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startEditing = (item: CatalogItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditUnit(item.unit || 'وحدة');
    setEditQty(String(item.defaultQuantity || 1));
    setEditPrice(String(item.unitPrice));
  };

  const saveEdit = (id: string) => {
    const clean = editName.trim();
    if (!clean) return;
    onUpdateCatalogItem(
      id,
      clean,
      Math.max(0, parseFloat(editPrice) || 0),
      editUnit.trim() || 'وحدة',
      Math.max(0.001, parseFloat(editQty) || 1)
    );
    setEditingId(null);
    showNotice('success', 'تم تحديث بيانات الصنف بنجاح.');
  };

  const handleExportSelected = () => {
    if (selectedItems.length === 0) {
      showNotice('error', 'يرجى تحديد صنف واحد على الأقل لتصديره.');
      return;
    }
    exportCatalogToExcel(selectedItems, true);
    showNotice(
      'success',
      `تم تصدير ${selectedItems.length} صنف محدد إلى إكسل (6 أعمدة).`
    );
  };

  const handleBulkInsertIntoInvoice = () => {
    if (selectedItems.length === 0) return;
    if (onInsertMultipleItemsIntoInvoice) {
      onInsertMultipleItemsIntoInvoice(selectedItems);
    } else {
      selectedItems.forEach((it) => onInsertItemIntoInvoice(it));
    }
    showNotice(
      'success',
      `تم إدراج ${selectedItems.length} صنف محدد في الفاتورة الحالية بنجاح.`
    );
  };

  const previewNewLineTotal =
    (parseFloat(newQty) || 0) * (parseFloat(newPrice) || 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#0F172A] to-slate-800 text-white rounded-xl p-4 shadow-sm border-r-4 border-r-[#B45309]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-extrabold">
              قاعدة بيانات الأصناف والوحدات والأسعار (6 أعمدة - Excel)
            </h3>
          </div>
          <span className="num-tabular text-xs font-bold bg-white/10 px-2.5 py-0.5 rounded-full text-amber-300">
            {catalog.length} صنف محفوظ
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          تُحفظ الأصناف بـ 6 أعمدة قياسية: (المسلسل، اسم الصنف، الوحدة، الكمية،
          السعر الفردي قبل الضريبة، الإجمالي قبل الضريبة) مع إمكانية التحديد
          والتصدير المخصص.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-0.5 hover:opacity-70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Excel Import / Export / Template Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700">
            استيراد وتصدير قاعدة الأصناف (6 أعمدة إكسل)
          </span>
          <button
            type="button"
            onClick={downloadEmptyCatalogTemplate}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] hover:underline cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>تحميل قالب فارغ (6 أعمدة)</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelFileUpload}
          className="hidden"
        />

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>استيراد شيت أصناف إكسل (.xlsx / .csv)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => exportCatalogToExcel(catalog, false)}
              className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>تصدير كل قاعدة البيانات ({catalog.length})</span>
            </button>

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handleExportSelected}
              className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-[#92400E] border border-amber-300/80 disabled:opacity-40 disabled:pointer-events-none font-extrabold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير المحدد فقط ({selectedItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Item Form (6-Column Contracting Spec) */}
      <form
        onSubmit={handleManualAdd}
        className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700">
            إضافة صنف جديد لقاعدة البيانات
          </span>
          <span className="text-[11px] font-bold text-slate-500 num-tabular">
            الإجمالي قبل الضريبة:{' '}
            <strong className="text-[#0F172A]">
              {formatMoney(previewNewLineTotal)} ر.س
            </strong>
          </span>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم الصنف أو البيان (مثال: تطوير وربط البنية السحابية / Cloud Infrastructure & API...)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#B45309] focus:ring-2 focus:ring-amber-500/20 outline-none"
          />

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <label className="block text-[10.5px] font-bold text-slate-500 mb-0.5">
                الوحدة
              </label>
              <UnitSelectorCombobox
                value={newUnit}
                onChange={setNewUnit}
                placeholder="طن / م3 / حبة"
                className="w-full"
                inputClassName="py-1.5"
              />
            </div>

            <div className="col-span-3">
              <label className="block text-[10.5px] font-bold text-slate-500 mb-0.5">
                الكمية
              </label>
              <input
                type="number"
                min="0"
                step="any"
                dir="ltr"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="1"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-center num-tabular focus:border-[#B45309] outline-none"
              />
            </div>

            <div className="col-span-5">
              <label className="block text-[10.5px] font-bold text-slate-500 mb-0.5">
                السعر قبل الضريبة
              </label>
              <input
                type="number"
                min="0"
                step="any"
                dir="ltr"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 bg-[#B45309] hover:bg-[#92400E] text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>حفظ الصنف في قاعدة البيانات</span>
          </button>
        </div>
      </form>

      {/* Catalog Search, Selection Bar & 6-Column Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأصناف أو الوحدات..."
                className="w-full rounded-lg border border-slate-300 bg-white pr-3 pl-8 py-1.5 text-xs font-semibold focus:border-[#B45309] outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={onResetDefaultCatalog}
              title="استعادة الأصناف الافتراضية"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>افتراضي</span>
            </button>
          </div>

          {/* Selection & Bulk Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 hover:text-[#0F172A] cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-[#B45309]" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {isAllFilteredSelected
                  ? 'إلغاء تحديد الكل'
                  : `تحديد الكل (${filteredCatalog.length})`}
              </span>
            </button>

            {selectedItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBulkInsertIntoInvoice}
                  className="inline-flex items-center gap-1 bg-[#0F172A] hover:bg-slate-800 text-amber-300 text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    إضافة المحدد للفاتورة ({selectedItems.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 6-Column Header Bar */}
        <div className="grid grid-cols-12 gap-1 bg-slate-900 text-white px-2.5 py-2 text-[10.5px] font-extrabold items-center">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4 text-right">اسم الصنف أو البيان</div>
          <div className="col-span-1 text-center">الوحدة</div>
          <div className="col-span-1 text-center">الكمية</div>
          <div className="col-span-2 text-center">السعر الفردي</div>
          <div className="col-span-2 text-center">الإجمالي</div>
          <div className="col-span-1 text-center">إجراء</div>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {filteredCatalog.length === 0 ? (
            <div className="p-6 text-center text-xs font-semibold text-slate-400">
              لا توجد أصناف مطابقة للبحث الحالي.
            </div>
          ) : (
            filteredCatalog.map((item, idx) => {
              const isEditing = editingId === item.id;
              const isSelected = selectedIds.includes(item.id);
              const qty =
                Number(item.defaultQuantity) > 0
                  ? Number(item.defaultQuantity)
                  : 1;
              const lineTotal = qty * (Number(item.unitPrice) || 0);

              return (
                <div
                  key={item.id}
                  className={`p-2.5 transition-colors ${
                    isSelected
                      ? 'bg-amber-50/70'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2 bg-white p-2 rounded-lg border border-amber-300">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="اسم الصنف أو البيان"
                        className="w-full rounded-lg border border-amber-400 px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <UnitSelectorCombobox
                          value={editUnit}
                          onChange={setEditUnit}
                          placeholder="الوحدة"
                          inputClassName="py-1 border-amber-400"
                        />
                        <input
                          type="number"
                          step="any"
                          dir="ltr"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          placeholder="الكمية"
                          className="rounded-lg border border-amber-400 px-2 py-1 text-xs font-bold text-center num-tabular outline-none"
                        />
                        <input
                          type="number"
                          step="any"
                          dir="ltr"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="السعر"
                          className="rounded-lg border border-amber-400 px-2 py-1 text-xs font-bold text-right num-tabular outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>حفظ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-12 gap-1 items-center text-xs">
                      {/* Col 1: Checkbox + Serial */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.id)}
                          className="w-3.5 h-3.5 accent-[#B45309] rounded cursor-pointer"
                        />
                        <span className="num-tabular text-[10.5px] font-extrabold text-slate-500">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Col 2: Description */}
                      <div
                        className="col-span-4 font-bold text-slate-900 truncate pr-1"
                        title={item.name}
                      >
                        {item.name}
                      </div>

                      {/* Col 3: Unit */}
                      <div className="col-span-1 text-center">
                        <span className="inline-block bg-slate-100 text-slate-700 text-[10.5px] font-bold px-1.5 py-0.5 rounded">
                          {item.unit || 'وحدة'}
                        </span>
                      </div>

                      {/* Col 4: Default Quantity */}
                      <div className="col-span-1 text-center num-tabular font-bold text-slate-700">
                        {formatQty(qty)}
                      </div>

                      {/* Col 5: Unit Price */}
                      <div className="col-span-2 text-center num-tabular font-bold text-slate-800">
                        {formatMoney(item.unitPrice)}
                      </div>

                      {/* Col 6: Line Total before VAT */}
                      <div className="col-span-2 text-center num-tabular font-extrabold text-[#B45309]">
                        {formatMoney(lineTotal)}
                      </div>

                      {/* Col 7: Quick Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => onInsertItemIntoInvoice(item)}
                          className="p-1 rounded bg-[#0F172A] hover:bg-slate-800 text-amber-300 transition-colors cursor-pointer"
                          title="إدراج هذا الصنف في الفاتورة الحالية"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCatalogItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
