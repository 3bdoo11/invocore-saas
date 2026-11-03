import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  LayoutGrid,
  MessageCircle,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  COMPANY_TEMPLATES,
  DEFAULT_CATALOG_ITEMS,
  EMPTY_CLIENT_INFO,
  INITIAL_INVOICE_NUMBER,
  PAYMENT_METHODS,
} from './constants/defaults';
import {
  CatalogItem,
  CompanyTemplateId,
  DocumentPrintView,
  InvoiceData,
  InvoiceLineItem,
  PaymentMethod,
  QrEncodingMode,
  ReceiptVoucherData,
  SavedClient,
  SellerInfo,
} from './types/invoice';
import {
  DEFAULT_APP_TITLE,
  ITEMS_PER_PAGE,
  calculateAutoPageLabel,
  calculateInvoiceTotals,
  formatMoney,
  formatTime12hArabic,
  generateId,
  getCurrentTimeString,
  getTodayDateString,
  isoInputToSlashDate,
  normalizeArabic,
  paginateInvoiceItems,
  sanitizeDocumentTitleForPrint,
  slashDateToIsoInput,
  to24HourTimeInput,
  triggerSafePrint,
  buildWhatsAppInvoiceMessage,
} from './utils/formatters';
import {
  createFreshBlankInvoice,
  loadCatalogFromStorage,
  loadCompaniesFromStorage,
  loadInvoicesFromStorage,
  loadNextInvoiceNumber,
  loadSavedClientsFromStorage,
  loadSellerFromStorage,
  saveCatalogToStorage,
  saveCompaniesToStorage,
  saveInvoicesToStorage,
  saveNextInvoiceNumber,
  saveSavedClientsToStorage,
  saveSelectedCompanyId,
  saveSellerToStorage,
} from './utils/storage';
import { numberToArabicTafqeet } from './utils/tafqeet';
import {
  decodePublicInvoiceParam,
  decodeZatcaQrBase64,
  encodePublicInvoiceUrl,
  generateZatcaQrBase64,
} from './utils/zatcaQr';
import {
  downloadInvoiceItemsTemplate,
  exportCurrentInvoiceItemsToExcel,
  ImportedCatalogItemData,
  parseInvoiceItemsExcelFile,
} from './utils/excelCatalog';
import { InvoiceA4Sheet } from './components/InvoiceA4Sheet';
import { ReceiptVoucherA4Sheet } from './components/ReceiptVoucherA4Sheet';
import { LineItemRow } from './components/LineItemRow';
import { CatalogManagerTab } from './components/CatalogManagerTab';
import { InvoicesHistoryTab } from './components/InvoicesHistoryTab';
import { SellerSettingsModal } from './components/SellerSettingsModal';
import { PublicInvoiceViewer } from './components/PublicInvoiceViewer';
import { ShareInvoiceModal } from './components/ShareInvoiceModal';
import { CompanyGalleryView } from './components/CompanyBrandAssets';

type AdminTab = 'editor' | 'catalog' | 'history';
type MobilePane = 'controls' | 'preview';
type DesktopLayoutMode = 'split' | 'input' | 'preview';

const A4_PIXEL_WIDTH = 794;
const DEFAULT_PANEL_WIDTH = 480;
const MIN_PANEL_WIDTH = 340;

export function App() {
  // 1. Check URL Query Parameter or Route Path for Public Client PDF View Mode (/v/... or ?invoice=...)
  const publicInvoiceParam = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryVal = params.get('invoice') || params.get('v');
      if (queryVal) return queryVal;
      const pathname = window.location.pathname || '';
      if (pathname.startsWith('/v/')) {
        const code = pathname.slice(3);
        if (code) return decodeURIComponent(code);
      }
    } catch {
      // Fallback
    }
    return null;
  }, []);

  const decodedPublicData = useMemo(() => {
    if (!publicInvoiceParam) return null;
    return decodePublicInvoiceParam(publicInvoiceParam);
  }, [publicInvoiceParam]);

  // 2. Persistent Admin Workspace State
  const [catalog, setCatalog] = useState<CatalogItem[]>(() =>
    loadCatalogFromStorage()
  );
  const [savedInvoices, setSavedInvoices] = useState<InvoiceData[]>(() =>
    loadInvoicesFromStorage()
  );
  const [nextInvoiceNo, setNextInvoiceNo] = useState<number>(() => {
    const existing = loadInvoicesFromStorage();
    if (existing.length === 0) {
      saveNextInvoiceNumber(INITIAL_INVOICE_NUMBER);
      return INITIAL_INVOICE_NUMBER;
    }
    return loadNextInvoiceNumber();
  });

  const [companies, setCompanies] = useState<SellerInfo[]>(() =>
    loadCompaniesFromStorage()
  );
  const [seller, setSeller] = useState<SellerInfo>(() =>
    loadSellerFromStorage()
  );

  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const existing = loadInvoicesFromStorage();
    const startNo =
      existing.length === 0 ? INITIAL_INVOICE_NUMBER : loadNextInvoiceNumber();
    return createFreshBlankInvoice(startNo);
  });

  // Saved Clients Directory ("دفتر العملاء المحفوظين")
  const [savedClients, setSavedClients] = useState<SavedClient[]>(() =>
    loadSavedClientsFromStorage()
  );
  const [selectedSavedClientId, setSelectedSavedClientId] = useState<string>('');

  // Document View / Print Mode ('invoice' | 'receipt' | 'both')
  const [docPrintView, setDocPrintView] =
    useState<DocumentPrintView>('invoice');

  // Expose test helper methods on window for automated QA verification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __saqrSetInvoice?: (inv: Partial<InvoiceData>) => void }).__saqrSetInvoice = (newInv) => {
        setInvoice((prev) => ({ ...prev, ...newInv }));
      };
      (window as unknown as { __saqrSetDocPrintView?: (v: DocumentPrintView) => void }).__saqrSetDocPrintView = setDocPrintView;
      (window as unknown as { __saqrSetCurrentPage?: (p: number) => void }).__saqrSetCurrentPage = setCurrentPage;
      (window as unknown as { __saqrSetIsGalleryOpen?: (open: boolean) => void }).__saqrSetIsGalleryOpen = setIsGalleryOpen;
    }
  }, []);

  // Default Startup View: Interactive Company Cards Gallery in the Preview Pane
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(true);

  // Direct Invoice Excel File Input Ref
  const directInvoiceExcelInputRef = useRef<HTMLInputElement>(null);
  const invoiceExcelImportModeRef = useRef<'replace' | 'append'>('append');
  const [isImportingInvoiceExcel, setIsImportingInvoiceExcel] = useState(false);

  // Tracks the invoiceNumber & companyId that were last saved for the current invoice.id
  // so changing company or invoiceNumber creates a new distinct history record without overwriting
  const lastSavedNumberForIdRef = useRef<Record<string, string>>({});
  const lastSavedCompanyForIdRef = useRef<Record<string, string>>({});

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<AdminTab>('editor');
  const [mobilePane, setMobilePane] = useState<MobilePane>('controls');
  const [desktopLayoutMode, setDesktopLayoutMode] = useState<DesktopLayoutMode>(
    () => {
      try {
        const saved = localStorage.getItem('saqr_desktop_layout_mode');
        if (saved === 'split' || saved === 'input' || saved === 'preview') {
          return saved;
        }
      } catch {
        // ignore
      }
      return 'split';
    }
  );
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('saqr_panel_width'));
      if (Number.isFinite(saved) && saved >= MIN_PANEL_WIDTH && saved <= 1400) {
        return saved;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PANEL_WIDTH;
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [shareModal, setShareModal] = useState<{
    message: string;
    url: string;
  } | null>(null);
  const [showZatcaInspector, setShowZatcaInspector] = useState(false);
  const [justIssuedBanner, setJustIssuedBanner] = useState(false);
  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-Page A4 Preview Navigation State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [previewViewMode, setPreviewViewMode] = useState<'single' | 'all'>(
    'single'
  );

  // Preview Zoom State ('fit' or explicit scale)
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [autoFitScale, setAutoFitScale] = useState(0.85);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(
    () => paginateInvoiceItems(invoice.items),
    [invoice.items]
  );
  const totalPages = pages.length;
  const prevTotalPagesRef = useRef<number>(totalPages);

  // Auto-advance to last page when adding items overflows onto a new page, or clamp when deleting
  useEffect(() => {
    if (totalPages > prevTotalPagesRef.current) {
      setCurrentPage(totalPages);
    } else if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
    prevTotalPagesRef.current = totalPages;
  }, [totalPages, currentPage]);

  useEffect(() => {
    saveCatalogToStorage(catalog);
  }, [catalog]);

  useEffect(() => {
    saveNextInvoiceNumber(nextInvoiceNo);
  }, [nextInvoiceNo]);

  useEffect(() => {
    saveSellerToStorage(seller);
    if (seller.id) {
      saveSelectedCompanyId(seller.id);
    }
  }, [seller]);

  useEffect(() => {
    saveCompaniesToStorage(companies);
  }, [companies]);

  // Keep document.title set to Official Platform Title; only switch temporarily during print for iOS PDF filename
  useEffect(() => {
    if (publicInvoiceParam) return;
    document.title = DEFAULT_APP_TITLE;

    const prefix = docPrintView === 'receipt' ? 'Receipt' : 'Invoice';
    const handleBeforePrint = () => {
      document.title = sanitizeDocumentTitleForPrint(
        invoice.invoiceNumber,
        prefix
      );
    };
    const handleAfterPrint = () => {
      document.title = DEFAULT_APP_TITLE;
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.title = DEFAULT_APP_TITLE;
    };
  }, [publicInvoiceParam, invoice.invoiceNumber, docPrintView]);

  useEffect(() => {
    try {
      localStorage.setItem('saqr_desktop_layout_mode', desktopLayoutMode);
    } catch {
      // ignore
    }
  }, [desktopLayoutMode]);

  useEffect(() => {
    try {
      localStorage.setItem('saqr_panel_width', String(Math.round(panelWidth)));
    } catch {
      // ignore
    }
  }, [panelWidth]);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxAllowed = Math.floor(window.innerWidth * 0.75);
      // In RTL layout, the Input Control Panel is anchored to the right edge of the viewport
      const rawWidth = window.innerWidth - e.clientX;
      const clamped = Math.max(
        MIN_PANEL_WIDTH,
        Math.min(maxAllowed, rawWidth)
      );
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  useEffect(() => {
    if (publicInvoiceParam) return;
    const container = previewPaneRef.current;
    if (!container) return;

    const computeScale = () => {
      const isMobile = window.innerWidth < 1024;
      const availableWidth = isMobile
        ? Math.min(container.clientWidth, window.innerWidth) - 24
        : container.clientWidth - 48;
      if (availableWidth <= 0) return;
      const fitted = Math.min(
        1,
        Math.max(isMobile ? 0.25 : 0.42, availableWidth / A4_PIXEL_WIDTH)
      );
      setAutoFitScale(Number(fitted.toFixed(3)));
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [publicInvoiceParam, desktopLayoutMode, panelWidth, mobilePane, isGalleryOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Financial Calculations & Auto Tafqeet
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);
  const autoTafqeet = useMemo(
    () => numberToArabicTafqeet(totals.finalTotal),
    [totals.finalTotal]
  );

  // Live ZATCA TLV Inspector tags
  const zatcaBase64 = useMemo(
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

  const decodedZatcaTags = useMemo(
    () => decodeZatcaQrBase64(zatcaBase64),
    [zatcaBase64]
  );

  const publicShareUrl = useMemo(
    () => encodePublicInvoiceUrl(invoice, seller),
    [invoice, seller]
  );

  // If URL is in Public Client PDF View Mode (?invoice=...), render ONLY the Client PDF Viewer
  if (publicInvoiceParam !== null) {
    return <PublicInvoiceViewer decodedData={decodedPublicData} />;
  }

  // --- Safe Print Helper ---
  const handlePrintCurrentDocument = () => {
    const prefix = docPrintView === 'receipt' ? 'Receipt' : 'Invoice';
    triggerSafePrint(invoice.invoiceNumber, prefix);
  };

  // --- WhatsApp Share (synchronous popup-safe; copies message + opens WhatsApp + desktop share modal) ---
  const handleWhatsAppShare = () => {
    const { messageText, whatsappUrl } = buildWhatsAppInvoiceMessage(
      invoice,
      seller.arabicName,
      publicShareUrl
    );
    // Must run synchronously inside the click handler so popup blockers allow it
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    try {
      void navigator.clipboard
        ?.writeText(messageText)
        .then(() => showToast('تم نسخ رابط الفاتورة وجاري فتح واتساب...'))
        .catch(() => showToast('جاري فتح واتساب...'));
    } catch {
      showToast('جاري فتح واتساب...');
    }
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setShareModal({ message: messageText, url: publicShareUrl });
    }
  };

  // --- Handlers for Company Switching ---
  const handleSwitchCompany = (selectedCompany: SellerInfo) => {
    setSeller(selectedCompany);
    setIsGalleryOpen(false);
    setJustIssuedBanner(false);
    if (selectedCompany.id) {
      saveSelectedCompanyId(selectedCompany.id);
    }
    saveSellerToStorage(selectedCompany);
    showToast(
      `تم اختيار "${selectedCompany.arabicName}" — جميع بنود الفاتورة (${invoice.items.length}) محفوظة وجاهزة`
    );
  };

  const handleQuickTemplateChange = (templateId: CompanyTemplateId) => {
    const matchingCompany = companies.find((c) => c.templateId === templateId);
    if (matchingCompany) {
      handleSwitchCompany(matchingCompany);
      return;
    }
    const updatedSeller: SellerInfo = {
      ...seller,
      templateId,
    };
    setSeller(updatedSeller);
    setIsGalleryOpen(false);
    setCompanies((prev) =>
      prev.map((c) => (c.id === updatedSeller.id ? updatedSeller : c))
    );
    const tplName =
      COMPANY_TEMPLATES.find((t) => t.id === templateId)?.name ||
      `قالب ${templateId}`;
    showToast(`تم تغيير تصميم الفاتورة وسند القبض إلى: ${tplName}`);
  };

  // --- Handlers for Invoice Editing ---
  const updateInvoice = (patch: Partial<InvoiceData>) => {
    setInvoice((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const updateClient = (patch: Partial<InvoiceData['client']>) => {
    setInvoice((prev) => ({
      ...prev,
      client: {
        ...prev.client,
        ...patch,
      },
    }));
  };

  const handleSelectSavedClient = (clientId: string) => {
    setSelectedSavedClientId(clientId);
    if (!clientId) return;
    const client = savedClients.find((c) => c.id === clientId);
    if (client) {
      updateInvoice({
        client: {
          name: client.name,
          taxNumber: client.taxNumber,
          notes: client.notes,
          address: client.address,
          phone: client.phone,
          buildingNo: client.buildingNo || '',
          streetName: client.streetName || '',
          district: client.district || '',
          city: client.city || '',
          postalCode: client.postalCode || '',
          additionalNo: client.additionalNo || '',
          crNumber: client.crNumber || '',
        },
      });
    }
  };

  const handleSaveCurrentClient = () => {
    const trimmedName = invoice.client.name.trim();
    if (!trimmedName) {
      alert('يرجى إدخال اسم العميل أولاً لحفظه في الدفتر');
      return;
    }
    const existingIdx = savedClients.findIndex(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    let updated: SavedClient[];
    if (existingIdx >= 0) {
      updated = [...savedClients];
      updated[existingIdx] = {
        ...updated[existingIdx],
        ...invoice.client,
      };
      setSelectedSavedClientId(updated[existingIdx].id);
    } else {
      const newClient: SavedClient = {
        id: `client-${Date.now()}`,
        ...invoice.client,
      };
      updated = [newClient, ...savedClients];
      setSelectedSavedClientId(newClient.id);
    }
    setSavedClients(updated);
    saveSavedClientsToStorage(updated);
  };

  const handleDeleteSavedClient = (clientId: string) => {
    if (!clientId) return;
    const client = savedClients.find((c) => c.id === clientId);
    if (!client) return;
    if (!confirm(`هل أنت متأكد من حذف "${client.name}" من دفتر العملاء؟`)) return;
    const updated = savedClients.filter((c) => c.id !== clientId);
    setSavedClients(updated);
    saveSavedClientsToStorage(updated);
    if (selectedSavedClientId === clientId) {
      setSelectedSavedClientId('');
    }
  };

  const handleClearClient = () => {
    updateInvoice({
      client: { ...EMPTY_CLIENT_INFO },
    });
    setSelectedSavedClientId('');
  };

  const updateReceiptVoucher = (patch: Partial<ReceiptVoucherData>) => {
    setInvoice((prev) => ({
      ...prev,
      receiptVoucher: {
        ...(prev.receiptVoucher || {}),
        ...patch,
      },
    }));
  };

  const handleLineItemChange = (
    id: string,
    patch: Partial<InvoiceLineItem>
  ) => {
    const editedIdx = invoice.items.findIndex((row) => row.id === id);
    if (editedIdx !== -1) {
      setCurrentPage(Math.floor(editedIdx / ITEMS_PER_PAGE) + 1);
    }
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const handleAddLineItem = () => {
    const nextIdx = invoice.items.length;
    setCurrentPage(Math.floor(nextIdx / ITEMS_PER_PAGE) + 1);
    setInvoice((prev) => {
      const nextItems = [
        ...prev.items,
        {
          id: generateId('row'),
          description: '',
          unit: 'وحدة',
          qty: 1,
          unitPrice: 0,
        },
      ];
      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const handleRemoveLineItem = (id: string) => {
    if (invoice.items.length <= 1) return;
    const nextCount = invoice.items.length - 1;
    const maxPage = Math.max(1, Math.ceil(nextCount / ITEMS_PER_PAGE));
    setCurrentPage((prevPage) => Math.min(prevPage, maxPage));
    setInvoice((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((row) => row.id !== id),
      };
    });
  };

  // --- Direct Invoice Items Excel Import (6-Column Standard: Append vs Replace) ---
  const triggerInvoiceExcelUpload = (mode: 'replace' | 'append') => {
    invoiceExcelImportModeRef.current = mode;
    directInvoiceExcelInputRef.current?.click();
  };

  const handleDirectInvoiceExcelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mode = invoiceExcelImportModeRef.current;
    setIsImportingInvoiceExcel(true);
    try {
      const parsedItems = await parseInvoiceItemsExcelFile(file);
      if (parsedItems.length === 0) {
        showToast(
          'لم يتم العثور على بنود صالحة في ملف الإكسل. تأكد من وجود عمود البيان والكمية والسعر.'
        );
      } else {
        const newInvoiceLines: InvoiceLineItem[] = parsedItems.map((row) => ({
          id: generateId('row'),
          description: row.description,
          unit: row.unit || 'وحدة',
          qty: row.qty,
          unitPrice: row.unitPrice,
        }));

        let finalTotalItemsCount = newInvoiceLines.length;

        setInvoice((prev) => {
          if (mode === 'append') {
            const nonBlankExisting = prev.items.filter(
              (it) =>
                it.description.trim() !== '' ||
                (Number(it.unitPrice) || 0) > 0
            );
            const combined = [...nonBlankExisting, ...newInvoiceLines];
            finalTotalItemsCount = combined.length;
            return {
              ...prev,
              items: combined,
            };
          } else {
            finalTotalItemsCount = newInvoiceLines.length;
            return {
              ...prev,
              items: newInvoiceLines,
            };
          }
        });

        if (mode === 'replace') {
          setCurrentPage(1);
        }

        // Also sync imported items into 6-column catalog for future autocomplete
        setCatalog((prevCat) => {
          const nextCat = [...prevCat];
          for (const item of parsedItems) {
            const norm = normalizeArabic(item.description);
            const idx = nextCat.findIndex(
              (c) => normalizeArabic(c.name) === norm
            );
            if (idx !== -1) {
              nextCat[idx] = {
                ...nextCat[idx],
                unit: item.unit || nextCat[idx].unit || 'وحدة',
                defaultQuantity: item.qty || nextCat[idx].defaultQuantity || 1,
                unitPrice: item.unitPrice,
              };
            } else {
              nextCat.push({
                id: generateId('cat'),
                name: item.description,
                unit: item.unit || 'وحدة',
                defaultQuantity: item.qty || 1,
                unitPrice: item.unitPrice,
              });
            }
          }
          return nextCat;
        });

        if (mode === 'append') {
          showToast(
            `تمت إضافة ${newInvoiceLines.length} بند من إكسل على الفاتورة الحالية (الإجمالي الآن: ${finalTotalItemsCount} بند)!`
          );
        } else {
          showToast(
            `تم استيراد واستبدال بنود الفاتورة بـ ${newInvoiceLines.length} بند من إكسل بنجاح!`
          );
        }
      }
    } catch {
      showToast('حدث خطأ أثناء قراءة ملف إكسل لبنود الفاتورة.');
    } finally {
      setIsImportingInvoiceExcel(false);
      if (directInvoiceExcelInputRef.current) {
        directInvoiceExcelInputRef.current.value = '';
      }
    }
  };

  // --- Handlers for 6-Column Catalog Database ---
  const handleAddCatalogItem = (
    name: string,
    unitPrice: number,
    unit = 'وحدة',
    defaultQuantity = 1
  ) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const norm = normalizeArabic(cleanName);

    setCatalog((prev) => {
      const existingIdx = prev.findIndex(
        (c) => normalizeArabic(c.name) === norm
      );
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          name: cleanName,
          unit: unit || updated[existingIdx].unit || 'وحدة',
          defaultQuantity:
            defaultQuantity > 0
              ? defaultQuantity
              : updated[existingIdx].defaultQuantity || 1,
          unitPrice,
        };
        return updated;
      }
      return [
        {
          id: generateId('cat'),
          name: cleanName,
          unit: unit || 'وحدة',
          defaultQuantity: defaultQuantity > 0 ? defaultQuantity : 1,
          unitPrice,
        },
        ...prev,
      ];
    });
  };

  const handleUpdateCatalogItem = (
    id: string,
    name: string,
    unitPrice: number,
    unit = 'وحدة',
    defaultQuantity = 1
  ) => {
    setCatalog((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              name,
              unit: unit || c.unit || 'وحدة',
              defaultQuantity:
                defaultQuantity > 0 ? defaultQuantity : c.defaultQuantity || 1,
              unitPrice,
            }
          : c
      )
    );
  };

  const handleDeleteCatalogItem = (id: string) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMergeImportedItems = (
    imported: ImportedCatalogItemData[]
  ): { added: number; updated: number } => {
    let added = 0;
    let updated = 0;

    const next = catalog.filter(
      (c) =>
        typeof c.name === 'string' &&
        /[\u0600-\u06FFa-zA-Z]/.test(c.name.trim()) &&
        c.name.trim() !== 'م'
    );

    for (const entry of imported) {
      const clean = entry.name.trim();
      if (!clean || !/[\u0600-\u06FFa-zA-Z]/.test(clean)) continue;
      const norm = normalizeArabic(clean);
      const idx = next.findIndex((c) => normalizeArabic(c.name) === norm);
      if (idx !== -1) {
        next[idx] = {
          ...next[idx],
          name: clean,
          unit: entry.unit || next[idx].unit || 'وحدة',
          defaultQuantity:
            entry.defaultQuantity > 0
              ? entry.defaultQuantity
              : next[idx].defaultQuantity || 1,
          unitPrice: entry.unitPrice,
        };
        updated++;
      } else {
        next.push({
          id: generateId('cat'),
          name: clean,
          unit: entry.unit || 'وحدة',
          defaultQuantity:
            entry.defaultQuantity > 0 ? entry.defaultQuantity : 1,
          unitPrice: entry.unitPrice,
        });
        added++;
      }
    }

    setCatalog(next);
    saveCatalogToStorage(next);
    showToast(`تم استيراد ${added} صنف جديد وتحديث ${updated} صنف بنجاح`);

    return { added, updated };
  };

  const handleInsertCatalogItemIntoInvoice = (catItem: CatalogItem) => {
    const defaultQty =
      Number(catItem.defaultQuantity) > 0 ? Number(catItem.defaultQuantity) : 1;

    setInvoice((prev) => {
      const firstOnlyEmpty =
        prev.items.length === 1 &&
        prev.items[0].description.trim() === '' &&
        prev.items[0].unitPrice === 0;

      const nextItems = firstOnlyEmpty
        ? [
            {
              id: prev.items[0].id,
              description: catItem.name,
              unit: catItem.unit || 'وحدة',
              qty: defaultQty,
              unitPrice: catItem.unitPrice,
            },
          ]
        : [
            ...prev.items,
            {
              id: generateId('row'),
              description: catItem.name,
              unit: catItem.unit || 'وحدة',
              qty: defaultQty,
              unitPrice: catItem.unitPrice,
            },
          ];

      const targetIdx = nextItems.length - 1;
      setCurrentPage(Math.floor(targetIdx / ITEMS_PER_PAGE) + 1);

      return {
        ...prev,
        items: nextItems,
      };
    });
    setActiveTab('editor');
    showToast(
      `تم إدراج "${catItem.name}" (${defaultQty} ${catItem.unit || 'وحدة'}) في الفاتورة الحالية.`
    );
  };

  const handleInsertMultipleCatalogItemsIntoInvoice = (
    catItems: CatalogItem[]
  ) => {
    if (catItems.length === 0) return;

    setInvoice((prev) => {
      const nonBlankExisting = prev.items.filter(
        (it) =>
          it.description.trim() !== '' || (Number(it.unitPrice) || 0) > 0
      );

      const newRows: InvoiceLineItem[] = catItems.map((catItem) => ({
        id: generateId('row'),
        description: catItem.name,
        unit: catItem.unit || 'وحدة',
        qty:
          Number(catItem.defaultQuantity) > 0
            ? Number(catItem.defaultQuantity)
            : 1,
        unitPrice: catItem.unitPrice,
      }));

      const nextItems = [...nonBlankExisting, ...newRows];
      const targetIdx = nextItems.length - 1;
      setCurrentPage(Math.floor(targetIdx / ITEMS_PER_PAGE) + 1);

      return {
        ...prev,
        items: nextItems,
      };
    });
    setActiveTab('editor');
    showToast(`تم إدراج ${catItems.length} صنف محدد في الفاتورة الحالية!`);
  };

  /**
   * Core helper to persist an invoice into `saqr_invoices` in localStorage without overwriting previous invoices.
   */
  const persistInvoiceToHistory = (
    targetInvoice: InvoiceData
  ): {
    savedInvoice: InvoiceData;
    updatedList: InvoiceData[];
    isUpdate: boolean;
  } => {
    const currentList = loadInvoicesFromStorage();
    const existingByIdIdx = currentList.findIndex(
      (inv) => inv.id === targetInvoice.id
    );

    const previouslySavedNo = lastSavedNumberForIdRef.current[targetInvoice.id];
    const previouslySavedComp =
      lastSavedCompanyForIdRef.current[targetInvoice.id];
    const currentCompKey = seller.id || seller.arabicName;

    const numberOrCompanyChangedSinceSave =
      (previouslySavedNo !== undefined &&
        previouslySavedNo !== targetInvoice.invoiceNumber) ||
      (previouslySavedComp !== undefined &&
        previouslySavedComp !== currentCompKey);

    let finalId = targetInvoice.id;
    let isUpdate = false;

    if (existingByIdIdx !== -1 && !numberOrCompanyChangedSinceSave) {
      isUpdate = true;
    } else if (existingByIdIdx !== -1 && numberOrCompanyChangedSinceSave) {
      finalId = generateId('inv');
      isUpdate = false;
    }

    const issuedInvoice: InvoiceData = {
      ...targetInvoice,
      id: finalId,
      status: 'issued',
      issuedAt: new Date().toISOString(),
      companyId: seller.id,
      sellerSnapshot: { ...seller },
    };

    lastSavedNumberForIdRef.current[finalId] = issuedInvoice.invoiceNumber;
    lastSavedCompanyForIdRef.current[finalId] = currentCompKey;

    let updatedList: InvoiceData[];
    if (isUpdate) {
      updatedList = [...currentList];
      updatedList[existingByIdIdx] = issuedInvoice;
    } else {
      updatedList = [issuedInvoice, ...currentList];
    }

    saveInvoicesToStorage(updatedList);
    setSavedInvoices(updatedList);

    return { savedInvoice: issuedInvoice, updatedList, isUpdate };
  };

  // --- Save & Issue Invoice Workflow (Does NOT force auto-increment of the active invoice number) ---
  const handleSaveAndIssueInvoice = () => {
    const { savedInvoice } = persistInvoiceToHistory(invoice);
    setInvoice(savedInvoice);
    setJustIssuedBanner(true);
    showToast('تم حفظ الفاتورة في السجل بنجاح');
  };

  const handleStartNewSequentialInvoice = () => {
    const hasMeaningfulData =
      invoice.client.name.trim() !== '' ||
      invoice.items.some(
        (item) => item.description.trim() !== '' || Number(item.unitPrice) > 0
      );

    if (hasMeaningfulData) {
      persistInvoiceToHistory(invoice);
    }

    const currentNumeric = parseInt(invoice.invoiceNumber, 10);
    const suggestedNext = Number.isFinite(currentNumeric)
      ? currentNumeric + 1
      : nextInvoiceNo;

    setNextInvoiceNo(suggestedNext);
    saveNextInvoiceNumber(suggestedNext);

    const fresh = createFreshBlankInvoice(suggestedNext, invoice.qrMode);
    setInvoice(fresh);
    setCurrentPage(1);
    setJustIssuedBanner(false);
    setActiveTab('editor');
    showToast(
      `تم فتح فاتورة جديدة فارغة (يمكنك كتابة رقم الفاتورة يدوياً بحرية)`
    );
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopiedClientLink(true);
      setTimeout(() => setCopiedClientLink(false), 2400);
      showToast('تم نسخ رابط عرض الفاتورة للعميل بنجاح.');
    } catch {
      showToast('تعذر النسخ التلقائي — يمكنك فتح الرابط مباشرة.');
    }
  };

  const effectiveScale = zoomMode === 'fit' ? autoFitScale : zoomMode;
  const displayedPagesCount =
    docPrintView === 'receipt'
      ? 1
      : docPrintView === 'both'
        ? (previewViewMode === 'all' ? totalPages : 1) + 1
        : previewViewMode === 'all'
          ? totalPages
          : 1;

  const activeTemplateMeta =
    COMPANY_TEMPLATES.find((t) => t.id === (seller.templateId || 1)) ||
    COMPANY_TEMPLATES[0];

  const isDeferredInvoice = invoice.paymentMethod === 'آجل';
  const effectiveDocPrintView: DocumentPrintView =
    isDeferredInvoice || docPrintView !== 'invoice'
      ? docPrintView
      : 'invoice';

  return (
    <>
      {/* Main Admin Application Shell (Hidden when Printing) */}
      <div
        dir="rtl"
        className="no-print min-h-screen w-full max-w-[100vw] overflow-x-hidden lg:h-screen lg:overflow-hidden flex flex-col bg-slate-100 text-slate-900"
      >
        {/* Row 1: Main Navigation & Action Bar - Dark Navy #0F172A with 3 Clean Grouped Control Pods */}
        <header className="bg-[#0F172A] text-white border-b-2 border-[#B45309] px-3 sm:px-5 py-3 lg:py-2.5 shrink-0 shadow-lg z-30 w-full max-w-full min-w-0">
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between w-full min-w-0 gap-2.5">
            {/* RIGHT POD: Platform Brand & Interactive Active Company Selector Pill */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsGalleryOpen(true);
                  setMobilePane('preview');
                }}
                className="flex items-center gap-2.5 text-right group cursor-pointer rounded-xl px-1 py-1 hover:bg-white/5 transition-colors min-w-0 w-full lg:w-auto"
                title="فتح معرض اختيار الشركة والقالب المعتمد"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-700/20 border border-amber-400/40 group-hover:border-amber-400 flex items-center justify-center shrink-0 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-[15px] font-black tracking-tight text-white group-hover:text-amber-300 transition-colors leading-tight">
                    منصة صقر للفوترة الإلكترونية
                  </h1>
                  <p className="text-[10.5px] text-slate-300 font-semibold truncate max-w-[230px] sm:max-w-[300px]">
                    {seller.arabicName} • ضريبي:{' '}
                    <span className="num-tabular text-amber-300">
                      {seller.taxNumber}
                    </span>
                  </p>
                </div>
              </button>

              {/* Interactive Active Company Selector Pill + Gallery Trigger + Settings Trigger */}
              <div className="w-full lg:w-auto min-w-0 flex flex-wrap items-center justify-between gap-1.5 bg-slate-900/95 border border-amber-500/40 rounded-xl p-1 shadow-inner">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <select
                    aria-label="اختر الشركة المصدرة للفاتورة"
                    value={seller.id || ''}
                    onChange={(e) => {
                      const found = companies.find(
                        (c) => c.id === e.target.value
                      );
                      if (found) handleSwitchCompany(found);
                    }}
                    className="bg-transparent text-xs font-extrabold text-amber-300 focus:outline-none cursor-pointer max-w-[155px] sm:max-w-[195px] truncate"
                  >
                    {companies.map((comp, idx) => (
                      <option
                        key={comp.id || idx}
                        value={comp.id}
                        className="bg-[#0F172A] text-white"
                      >
                        {idx + 1}. {comp.arabicName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsGalleryOpen((prev) => !prev);
                    setMobilePane('preview');
                  }}
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    isGalleryOpen
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-400/30'
                  }`}
                  title="فتح معرض بطاقات الشركات والقوالب"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>تبديل الشركة / معرض القوالب ({companies.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSellerModalOpen(true)}
                  className="text-[11px] font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="إضافة أو تعديل بيانات الشركات والقوالب"
                >
                  إدارة
                </button>
              </div>
            </div>

            {/* CENTER POD: Document & Workspace Mode Group inside a bordered glass container */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 w-full lg:w-auto min-w-0 bg-white/5 backdrop-blur-md border border-white/15 rounded-xl p-1">
              {/* Document Type Switcher */}
              <div
                className={`w-full lg:w-auto gap-1.5 ${
                  isDeferredInvoice || docPrintView !== 'invoice'
                    ? 'grid grid-cols-3 lg:inline-flex lg:items-center'
                    : 'flex items-center'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDocPrintView('invoice');
                    setIsGalleryOpen(false);
                  }}
                  className={`justify-center px-2.5 py-2 lg:py-1.5 rounded-lg text-xs lg:text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                    effectiveDocPrintView === 'invoice' && !isGalleryOpen
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>الفاتورة الضريبية</span>
                </button>

                {(isDeferredInvoice || docPrintView !== 'invoice') && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDocPrintView('receipt');
                        setIsGalleryOpen(false);
                      }}
                      className={`justify-center px-2.5 py-2 lg:py-1.5 rounded-lg text-xs lg:text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                        effectiveDocPrintView === 'receipt' && !isGalleryOpen
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                      title="عرض وإصدار سند قبض (للفواتير الآجلة)"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>سند قبض</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDocPrintView('both');
                        setIsGalleryOpen(false);
                      }}
                      className={`justify-center px-2.5 py-2 lg:py-1.5 rounded-lg text-xs lg:text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                        effectiveDocPrintView === 'both' && !isGalleryOpen
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                      title="عرض وطباعة الفاتورة الضريبية يليها سند القبض في صفحة مستقلة"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">الفاتورة + السند</span>
                    </button>
                  </>
                )}
              </div>

              {/* Divider + Desktop View Mode Switcher */}
              <div className="hidden xl:block w-[1px] h-5 bg-white/15 mx-0.5" />
              <div className="hidden xl:inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('split')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    desktopLayoutMode === 'split'
                      ? 'bg-[#B45309] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  تقسيم الشاشة
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('input')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    desktopLayoutMode === 'input'
                      ? 'bg-[#B45309] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  تركيز الإدخال
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('preview')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    desktopLayoutMode === 'preview'
                      ? 'bg-[#B45309] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  المعاينة فقط
                </button>
              </div>
            </div>

            {/* LEFT POD: Primary Action Buttons (1. طباعة / PDF, 2. مشاركة واتساب, 3. صفحة العميل, 4. + فاتورة جديدة) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center w-full lg:w-auto min-w-0 gap-2">
              <button
                type="button"
                onClick={handlePrintCurrentDocument}
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1.5 text-xs font-extrabold bg-[#B45309] hover:bg-[#D97706] text-white px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1.5 text-xs font-extrabold bg-[#25D366] hover:bg-[#1DA851] text-slate-950 px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                title="مشاركة رابط وتفاصيل الفاتورة مباشرة عبر واتساب"
              >
                <MessageCircle className="w-4 h-4" />
                <span>مشاركة واتساب</span>
              </button>

              <a
                href={publicShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                title="معاينة صفحة العميل العامة كما تظهر عند مسح الرابط بالكاميرا"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>صفحة العميل</span>
              </a>

              <button
                type="button"
                onClick={handleStartNewSequentialInvoice}
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1 text-xs font-extrabold bg-transparent hover:bg-amber-500/15 text-amber-300 border border-amber-400/50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فاتورة جديدة</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile View Switcher (Controls vs Live Preview) */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 grid grid-cols-2 w-full gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobilePane('controls')}
            className={`min-w-0 py-2 px-1 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors truncate ${
              mobilePane === 'controls'
                ? 'bg-[#0F172A] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>لوحة الإدخال والتحكم</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('preview')}
            className={`min-w-0 py-2 px-1 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors truncate ${
              mobilePane === 'preview'
                ? 'bg-[#0F172A] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>
              معاينة{' '}
              {docPrintView === 'receipt'
                ? 'سند القبض'
                : `الفاتورة (${totalPages})`}
            </span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 left-5 z-50 bg-[#0F172A] text-white border-r-4 border-r-[#B45309] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Split Workspace */}
        <div className="flex-1 min-w-0 w-full max-w-full flex flex-col lg:flex-row lg:overflow-hidden">
          {/* Resizable & Mode-Aware Control Panel */}
          <aside
            style={
              desktopLayoutMode === 'split'
                ? ({ '--panel-w': `${panelWidth}px` } as React.CSSProperties)
                : undefined
            }
            className={`w-full max-w-full min-w-0 shrink-0 bg-white border-l border-slate-200 flex flex-col lg:h-full lg:overflow-hidden ${
              mobilePane === 'preview' ? 'hidden' : 'flex'
            } ${
              desktopLayoutMode === 'preview'
                ? 'lg:hidden'
                : desktopLayoutMode === 'input'
                  ? 'lg:flex lg:flex-1 lg:w-full lg:bg-slate-100 lg:border-l-0'
                  : 'lg:flex lg:w-[var(--panel-w)]'
            }`}
          >
            {/* Desktop Quick Width Presets & Mode Bar */}
            <div className="hidden lg:flex items-center justify-between px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                <span>حجم لوحة الإدخال:</span>
                {desktopLayoutMode === 'split' && (
                  <span className="num-tabular text-[10.5px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {Math.round(panelWidth)}px
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDesktopLayoutMode('split');
                    setPanelWidth(DEFAULT_PANEL_WIDTH);
                  }}
                  className={`px-2 py-0.5 rounded font-extrabold transition-colors ${
                    desktopLayoutMode === 'split' &&
                    Math.abs(panelWidth - DEFAULT_PANEL_WIDTH) < 40
                      ? 'bg-[#0F172A] text-amber-400'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  عادي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDesktopLayoutMode('split');
                    setPanelWidth(
                      Math.max(
                        MIN_PANEL_WIDTH,
                        Math.round(window.innerWidth * 0.5)
                      )
                    );
                  }}
                  className={`px-2 py-0.5 rounded font-extrabold transition-colors ${
                    desktopLayoutMode === 'split' &&
                    Math.abs(panelWidth - window.innerWidth * 0.5) <= 40
                      ? 'bg-[#0F172A] text-amber-400'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  واسع 50%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDesktopLayoutMode((prev) =>
                      prev === 'input' ? 'split' : 'input'
                    )
                  }
                  className={`px-2 py-0.5 rounded font-extrabold transition-colors ${
                    desktopLayoutMode === 'input'
                      ? 'bg-[#B45309] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {desktopLayoutMode === 'input'
                    ? 'العودة لتقسيم الشاشة'
                    : 'ملء الشاشة'}
                </button>
              </div>
            </div>

            {/* 3-Tab Navigation Header */}
            <div className="p-2 lg:p-2.5 bg-slate-50 border-b border-slate-200 shrink-0 w-full max-w-full">
              <div
                className={`grid grid-cols-3 w-full gap-1 ${
                  desktopLayoutMode === 'input' ? 'max-w-4xl mx-auto' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`min-w-0 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'editor'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">بيانات الفاتورة والسند</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className={`min-w-0 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'catalog'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">قاعدة الأصناف</span>
                  <span className="num-tabular text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full">
                    {catalog.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`min-w-0 py-2 px-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'history'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">سجل الفواتير</span>
                  <span className="num-tabular text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full">
                    {savedInvoices.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-3 lg:p-4">
              <div
                className={`space-y-5 ${
                  desktopLayoutMode === 'input'
                    ? 'max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90'
                    : ''
                }`}
              >
                {activeTab === 'catalog' && (
                  <CatalogManagerTab
                    catalog={catalog}
                    onAddCatalogItem={handleAddCatalogItem}
                    onUpdateCatalogItem={handleUpdateCatalogItem}
                    onDeleteCatalogItem={handleDeleteCatalogItem}
                    onMergeImportedItems={handleMergeImportedItems}
                    onResetDefaultCatalog={() => {
                      setCatalog(DEFAULT_CATALOG_ITEMS);
                      showToast('تمت استعادة قائمة الأصناف الافتراضية.');
                    }}
                    onInsertItemIntoInvoice={handleInsertCatalogItemIntoInvoice}
                    onInsertMultipleItemsIntoInvoice={
                      handleInsertMultipleCatalogItemsIntoInvoice
                    }
                  />
                )}

                {activeTab === 'history' && (
                  <InvoicesHistoryTab
                    invoices={savedInvoices}
                    activeInvoiceId={invoice.id}
                    seller={seller}
                    onSelectInvoice={(selected) => {
                      lastSavedNumberForIdRef.current[selected.id] =
                        selected.invoiceNumber;
                      setInvoice({
                        ...selected,
                        discountType: selected.discountType || 'amount',
                        vatRate: selected.vatRate ?? 15,
                      });
                      if (selected.sellerSnapshot) {
                        setSeller(selected.sellerSnapshot);
                      }
                      setCurrentPage(1);
                      setJustIssuedBanner(false);
                      setActiveTab('editor');
                      showToast(
                        `تم تحميل الفاتورة رقم #${selected.invoiceNumber}`
                      );
                    }}
                    onPrintInvoice={(selected) => {
                      lastSavedNumberForIdRef.current[selected.id] =
                        selected.invoiceNumber;
                      setInvoice({
                        ...selected,
                        discountType: selected.discountType || 'amount',
                        vatRate: selected.vatRate ?? 15,
                      });
                      if (selected.sellerSnapshot) {
                        setSeller(selected.sellerSnapshot);
                      }
                      setTimeout(
                        () =>
                          triggerSafePrint(selected.invoiceNumber, 'Invoice'),
                        120
                      );
                    }}
                    onDeleteInvoice={(id) => {
                      const nextList = savedInvoices.filter(
                        (inv) => inv.id !== id
                      );
                      setSavedInvoices(nextList);
                      saveInvoicesToStorage(nextList);
                      showToast('تم حذف الفاتورة من السجل.');
                    }}
                  />
                )}

                {activeTab === 'editor' && (
                  <>
                    {/* Just Issued Celebration & Next Invoice Card */}
                    {justIssuedBanner && invoice.status === 'issued' && (
                      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            تم حفظ الفاتورة #{invoice.invoiceNumber} في السجل
                            بنجاح (إجمالي المحفوظات: {savedInvoices.length})!
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handlePrintCurrentDocument}
                            className="flex items-center justify-center gap-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                            <span>طباعة / تحميل PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartNewSequentialInvoice}
                            className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors num-tabular"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>فتح فاتورة جديدة</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section 0: Active Company & 8-Template Quick Switcher Card */}
                    <section className="bg-gradient-to-l from-slate-900 to-[#0F172A] text-white rounded-xl p-3.5 space-y-2.5 border border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <h2 className="text-xs font-extrabold">
                            الشركة المصدرة للفاتورة والقالب المعتمد
                          </h2>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsGalleryOpen(true);
                              setMobilePane('preview');
                            }}
                            className="text-[11px] font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>معرض البطاقات ({companies.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsSellerModalOpen(true)}
                            className="text-[11px] font-extrabold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            إدارة الشركات ←
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                            اختر الشركة ({companies.length} شركات مسجلة — جميع البنود تنتقل تلقائياً):
                          </label>
                          <select
                            value={seller.id || ''}
                            onChange={(e) => {
                              const found = companies.find(
                                (c) => c.id === e.target.value
                              );
                              if (found) handleSwitchCompany(found);
                            }}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-2.5 py-1.5 text-xs font-bold focus:border-amber-400 outline-none"
                          >
                            {companies.map((comp, idx) => (
                              <option key={comp.id || idx} value={comp.id}>
                                {idx + 1}. {comp.arabicName} — ({comp.englishName})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                            تبديل سريع بين القوالب الـ 8 ({activeTemplateMeta.shortName}):
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {COMPANY_TEMPLATES.map((tpl) => {
                              const isSelected =
                                (seller.templateId || 1) === tpl.id && !isGalleryOpen;
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() =>
                                    handleQuickTemplateChange(tpl.id)
                                  }
                                  className={`py-1.5 px-1 rounded-lg text-[10.5px] font-extrabold transition-all truncate cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                  title={`${tpl.name} — ${tpl.description}`}
                                >
                                  {tpl.id}. {tpl.shortName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Section A: Single Default Web PDF QR Selector */}
                    <section className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-[#B45309]" />
                          <h2 className="text-xs font-extrabold text-[#0F172A]">
                            رمز الاستجابة السريعة الموحد (QR Code)
                          </h2>
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          رمز واحد نظيف في كل فاتورة
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl">
                        {(
                          [
                            {
                              id: 'web',
                              label: 'رابط PDF للعميل (الافتراضي)',
                              icon: Smartphone,
                            },
                            {
                              id: 'zatca',
                              label: 'تشفير ZATCA TLV Base64',
                              icon: ShieldCheck,
                            },
                          ] as Array<{
                            id: QrEncodingMode;
                            label: string;
                            icon: React.FC<{ className?: string }>;
                          }>
                        ).map((opt) => {
                          const Icon = opt.icon;
                          const active =
                            (opt.id === 'web' && invoice.qrMode !== 'zatca') ||
                            (opt.id === 'zatca' && invoice.qrMode === 'zatca');
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => updateInvoice({ qrMode: opt.id })}
                              className={`py-2 px-2 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#0F172A] text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Icon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  active ? 'text-amber-400' : 'text-slate-500'
                                }`}
                              />
                              <span className="truncate">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {invoice.qrMode === 'both' && (
                        <div className="space-y-2 pt-0.5">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                            <span>
                              رمز <strong>ZATCA</strong> في الترويسة + رمز{' '}
                              <strong>PDF</strong> في الأسفل بحجم مدمج أنيق.
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setShowZatcaInspector((prev) => !prev)
                              }
                              className="shrink-0 inline-flex items-center gap-1 font-bold text-[#B45309] hover:underline"
                            >
                              <span>فحص TLV</span>
                              {showZatcaInspector ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyShareUrl}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-white hover:bg-amber-50 text-[#0F172A] border border-slate-300 py-1.5 px-3 rounded-lg transition-colors"
                            >
                              {copiedClientLink ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">
                                    تم نسخ الرابط!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#B45309]" />
                                  <span>نسخ رابط الفاتورة للعميل</span>
                                </>
                              )}
                            </button>
                            <a
                              href={publicShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#0F172A] text-white py-1.5 px-3 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                              <span>تجربة</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {invoice.qrMode === 'zatca' && (
                        <div className="text-[11px] text-slate-600 leading-relaxed flex items-center justify-between gap-2 pt-0.5">
                          <span>
                            تشفير TLV Base64 معتمد للمرحلة الأولى متوافق مع تطبيق
                            هيئة الزكاة والضريبة والجمارك.
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShowZatcaInspector((prev) => !prev)
                            }
                            className="shrink-0 inline-flex items-center gap-1 font-bold text-[#B45309] hover:underline"
                          >
                            <span>فحص TLV</span>
                            {showZatcaInspector ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {invoice.qrMode === 'web' && (
                        <div className="space-y-2 pt-0.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyShareUrl}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-white hover:bg-amber-50 text-[#0F172A] border border-slate-300 py-1.5 px-3 rounded-lg transition-colors"
                            >
                              {copiedClientLink ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">
                                    تم نسخ الرابط!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#B45309]" />
                                  <span>نسخ رابط الفاتورة للعميل</span>
                                </>
                              )}
                            </button>
                            <a
                              href={publicShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#0F172A] text-white py-1.5 px-3 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                              <span>تجربة</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {showZatcaInspector && (
                        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                          <div className="font-extrabold text-slate-700 border-b border-slate-100 pb-1 flex items-center justify-between">
                            <span>فك تشفير وسوم ZATCA الحية (UTF-8 TLV):</span>
                            <span
                              dir="ltr"
                              className="num-tabular text-[10px] text-slate-400"
                            >
                              {zatcaBase64.length} chars Base64
                            </span>
                          </div>
                          {decodedZatcaTags.map((t) => (
                            <div
                              key={t.tag}
                              className="flex items-center justify-between gap-2 text-[10.5px] py-0.5 border-b border-slate-50 last:border-none"
                            >
                              <span className="text-slate-500 font-semibold shrink-0">
                                [{t.tag}] {t.label}{' '}
                                <span className="num-tabular text-slate-400">
                                  ({t.byteLength}B)
                                </span>
                              </span>
                              <span
                                dir="auto"
                                className="font-bold text-[#0F172A] num-tabular truncate max-w-[190px]"
                              >
                                {t.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* 2-Column Grid Wrapper when in Full Input Mode or Wide Split Panel */}
                    <div
                      className={
                        desktopLayoutMode === 'input' || panelWidth >= 680
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-5 items-start'
                          : 'space-y-5'
                      }
                    >
                      {/* Section B: Invoice Metadata (Manual Invoice Number + 12h Time) */}
                      <section className="space-y-3 bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <h2 className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-[#B45309]" />
                            <span>بيانات الفاتورة الأساسية</span>
                          </h2>
                          <button
                            type="button"
                            onClick={() =>
                              updateInvoice({
                                date: getTodayDateString(),
                                time: getCurrentTimeString(),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#B45309] transition-colors"
                            title="تحديث التاريخ والوقت للحظة الحالية"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>تحديث الوقت الآن</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Manual Invoice Number */}
                          <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                              رقم الفاتورة (إدخال يدوي حر)
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="اكتب رقم الفاتورة..."
                              value={invoice.invoiceNumber}
                              onChange={(e) =>
                                updateInvoice({ invoiceNumber: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-extrabold text-right num-tabular text-[#0F172A] focus:border-[#B45309] focus:ring-2 focus:ring-amber-500/20 outline-none"
                            />
                          </div>

                          {/* Payment Method */}
                          <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                              طريقة الدفع
                            </label>
                            <select
                              value={invoice.paymentMethod}
                              onChange={(e) => {
                                const newPm = e.target.value as PaymentMethod;
                                updateInvoice({
                                  paymentMethod: newPm,
                                });
                                if (newPm === 'آجل') {
                                  setDocPrintView('both');
                                  setIsGalleryOpen(false);
                                } else {
                                  setDocPrintView('invoice');
                                }
                              }}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-[#B45309] focus:ring-2 focus:ring-amber-500/20 outline-none"
                            >
                              {PAYMENT_METHODS.map((pm) => (
                                <option key={pm} value={pm}>
                                  {pm}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Date (YYYY/MM/DD) */}
                          <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                              التاريخ (YYYY/MM/DD)
                            </label>
                            <input
                              type="date"
                              dir="ltr"
                              value={slashDateToIsoInput(invoice.date)}
                              onChange={(e) =>
                                updateInvoice({
                                  date: isoInputToSlashDate(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-right num-tabular text-slate-900 focus:border-[#B45309] outline-none"
                            />
                          </div>

                          {/* Time (12-Hour Format Display + Picker) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11.5px] font-bold text-slate-700">
                                الوقت (نظام 12 ساعة)
                              </label>
                              <span className="text-[10.5px] font-extrabold text-[#B45309] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 num-tabular">
                                {formatTime12hArabic(invoice.time)}
                              </span>
                            </div>
                            <input
                              type="time"
                              dir="ltr"
                              value={to24HourTimeInput(invoice.time)}
                              onChange={(e) =>
                                updateInvoice({ time: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-right num-tabular text-slate-900 focus:border-[#B45309] outline-none"
                            />
                          </div>

                          {/* Items Count (Auto + Manual Override) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11.5px] font-bold text-slate-700">
                                عدد الأصناف
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateInvoice({
                                    itemsCountManual:
                                      invoice.itemsCountManual === null
                                        ? String(invoice.items.length)
                                        : null,
                                  })
                                }
                                className="text-[10.5px] font-bold text-[#B45309] hover:underline"
                              >
                                {invoice.itemsCountManual === null
                                  ? 'تعديل يدوي'
                                  : 'تلقائي'}
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly={invoice.itemsCountManual === null}
                              value={
                                invoice.itemsCountManual !== null
                                  ? invoice.itemsCountManual
                                  : String(invoice.items.length)
                              }
                              onChange={(e) =>
                                updateInvoice({
                                  itemsCountManual: e.target.value,
                                })
                              }
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs font-bold num-tabular outline-none ${
                                invoice.itemsCountManual === null
                                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-white border-amber-400 text-slate-900'
                              }`}
                            />
                          </div>

                          {/* Page Number (Auto + Manual Override - 15 items/page) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11.5px] font-bold text-slate-700">
                                الصفحات (15 بند/صفحة)
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateInvoice({
                                    pageNumberManual:
                                      invoice.pageNumberManual === null
                                        ? calculateAutoPageLabel(
                                            invoice.items.length
                                          )
                                        : null,
                                  })
                                }
                                className="text-[10.5px] font-bold text-[#B45309] hover:underline"
                              >
                                {invoice.pageNumberManual === null
                                  ? 'تعديل يدوي'
                                  : 'تلقائي'}
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly={invoice.pageNumberManual === null}
                              value={
                                invoice.pageNumberManual !== null
                                  ? invoice.pageNumberManual
                                  : `${currentPage} من ${totalPages}`
                              }
                              onChange={(e) =>
                                updateInvoice({
                                  pageNumberManual: e.target.value,
                                })
                              }
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs font-bold num-tabular outline-none ${
                                invoice.pageNumberManual === null
                                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-white border-amber-400 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>
                      </section>

                      {/* Section C: Client Details & Saved Directory */}
                      <section className="space-y-3 bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h2 className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-[#B45309]" />
                            <span>بيانات العميل ودفتر العملاء</span>
                          </h2>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={handleSaveCurrentClient}
                              className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-xs"
                              title="حفظ بيانات العميل الحالية في دفتر العملاء للاستخدام لاحقاً"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              <span>حفظ في الدفتر</span>
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={handleClearClient}
                              className="font-bold text-red-600 hover:text-red-800 cursor-pointer"
                              title="تفريغ جميع خانات العميل"
                            >
                              تفريغ
                            </button>
                          </div>
                        </div>

                        {/* Quick Select Saved Client Dropdown */}
                        <div className="bg-white rounded-lg border border-amber-300/80 p-2 shadow-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#B45309]" />
                              <span>دفتر العملاء المحفوظين ({savedClients.length}):</span>
                            </span>
                            {selectedSavedClientId && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSavedClient(selectedSavedClientId)
                                }
                                className="text-red-500 hover:text-red-700 text-[10.5px] flex items-center gap-0.5 cursor-pointer font-bold"
                                title="حذف العميل المحدد من الدفتر"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف من الدفتر</span>
                              </button>
                            )}
                          </div>
                          <select
                            value={selectedSavedClientId}
                            onChange={(e) =>
                              handleSelectSavedClient(e.target.value)
                            }
                            className="w-full text-xs font-bold text-slate-800 bg-amber-50/50 border border-amber-200 rounded-md px-2 py-1.5 outline-none cursor-pointer focus:border-[#B45309]"
                          >
                            <option value="">
                              -- اختر عميلاً للملء التلقائي بنقرة واحدة ({savedClients.length} عملاء) --
                            </option>
                            {savedClients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.city ? `(${c.city})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                              اسم العميل / المنشأة
                            </label>
                            <input
                              type="text"
                              value={invoice.client.name}
                              onChange={(e) =>
                                updateClient({ name: e.target.value })
                              }
                              placeholder="اسم الشركة أو العميل..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-[#B45309] focus:ring-2 focus:ring-amber-500/20 outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                                رقم العميل الضريبي
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={invoice.client.taxNumber}
                                onChange={(e) =>
                                  updateClient({ taxNumber: e.target.value })
                                }
                                placeholder="300XXXXXXXXX003"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                                رقم الجوال (اختياري)
                              </label>
                              <input
                                type="tel"
                                dir="ltr"
                                value={invoice.client.phone}
                                onChange={(e) =>
                                  updateClient({ phone: e.target.value })
                                }
                                placeholder="05XXXXXXXX"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                              العنوان
                            </label>
                            <input
                              type="text"
                              value={invoice.client.address}
                              onChange={(e) =>
                                updateClient({ address: e.target.value })
                              }
                              placeholder="المدينة - الحي - الرمز البريدي..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-[#B45309] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                              ملاحظات (مثل السجل التجاري أو رقم العقد)
                            </label>
                            <input
                              type="text"
                              value={invoice.client.notes}
                              onChange={(e) =>
                                updateClient({ notes: e.target.value })
                              }
                              placeholder="سجل تجاري / رقم التعميد..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-[#B45309] outline-none"
                            />
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Section D: Dynamic Line Items + Full Invoice Excel Export + Append/Replace Excel Import */}
                    <section className="space-y-3">
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                            <Database className="w-4 h-4 text-[#B45309]" />
                            <span>
                              بنود الفاتورة ({invoice.items.length} بند —{' '}
                              {totalPages} {totalPages === 1 ? 'صفحة' : 'صفحات'})
                            </span>
                          </h2>

                          <button
                            type="button"
                            onClick={() => downloadInvoiceItemsTemplate()}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] hover:underline cursor-pointer"
                            title="تحميل قالب فارغ للتعبئة (6 أعمدة: المسلسل، البيان، الوحدة، الكمية، السعر قبل الضريبة، الإجمالي)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تحميل قالب فارغ للتعبئة</span>
                          </button>
                        </div>

                        <input
                          ref={directInvoiceExcelInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleDirectInvoiceExcelUpload}
                          className="hidden"
                        />

                        {/* Primary Button: Export ALL Current Invoice Items across ALL Pages */}
                        <button
                          type="button"
                          onClick={() => {
                            exportCurrentInvoiceItemsToExcel(invoice, seller);
                            showToast(
                              `تم تصدير جميع بنود الفاتورة الحالية (${invoice.items.length} بند عبر ${totalPages} ${
                                totalPages === 1 ? 'صفحة' : 'صفحات'
                              }) إلى إكسل بنجاح!`
                            );
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-amber-300 font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                          title="يصدّر كافة الأصناف الموجودة في الفاتورة الحالية عبر جميع الصفحات (6 أعمدة + ملخص الضريبة والإجمالي)"
                        >
                          <Download className="w-4 h-4 text-amber-400" />
                          <span>
                            تصدير بنود الفاتورة الحالية إلى إكسل (.xlsx) — (
                            {invoice.items.length} بند)
                          </span>
                        </button>

                        {/* Two Clear Excel Import Buttons: Append (+ دمج) vs Replace (استبدال) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isImportingInvoiceExcel}
                            onClick={() => triggerInvoiceExcelUpload('append')}
                            className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
                            title="إضافة البنود المستوردة من إكسل على البنود الموجودة حالياً في الفاتورة دون مسحها"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              + إضافة بنود من إكسل على الفاتورة (دمج)
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isImportingInvoiceExcel}
                            onClick={() => triggerInvoiceExcelUpload('replace')}
                            className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-white hover:bg-amber-50 text-slate-800 border border-slate-300 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                            title="استبدال البنود الحالية ببنود شيت الإكسل الجديد"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#B45309]" />
                            <span>استيراد واستبدال بنود الفاتورة</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {invoice.items.map((item, idx) => (
                          <LineItemRow
                            key={item.id}
                            index={idx}
                            item={item}
                            catalog={catalog}
                            canDelete={invoice.items.length > 1}
                            onChange={handleLineItemChange}
                            onRemove={handleRemoveLineItem}
                            onSaveNewCatalogItem={handleAddCatalogItem}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#B45309] hover:bg-amber-50/40 text-xs font-extrabold text-slate-700 hover:text-[#B45309] flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus className="w-4 h-4 text-[#B45309]" />
                        <span>إضافة بند جديد إلى الفاتورة</span>
                      </button>
                    </section>

                    {/* Section E: Financial Summary, Editable VAT %, Flexible Discount, Paid Amount & Tafqeet */}
                    <section className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <h2 className="text-xs font-extrabold text-[#0F172A] border-b border-slate-200 pb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#B45309]" />
                        <span>
                          الحسابات الختامية ونسبة الضريبة والخصم المرن
                        </span>
                      </h2>

                      {/* Flexible Discount & Editable VAT % Controls */}
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11.5px] font-extrabold text-slate-700 flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5 text-[#B45309]" />
                            <span>الخصم ونسبة الضريبة المضافة</span>
                          </label>
                          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                updateInvoice({ discountType: 'amount' })
                              }
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold transition-all ${
                                invoice.discountType !== 'percentage'
                                  ? 'bg-[#0F172A] text-white'
                                  : 'text-slate-600'
                              }`}
                            >
                              خصم مبلغ (ر.س)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateInvoice({ discountType: 'percentage' })
                              }
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold transition-all ${
                                invoice.discountType === 'percentage'
                                  ? 'bg-[#B45309] text-white'
                                  : 'text-slate-600'
                              }`}
                            >
                              خصم نسبة (%)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                              {invoice.discountType === 'percentage'
                                ? 'نسبة الخصم (%)'
                                : 'قيمة الخصم (ر.س)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={
                                invoice.discountType === 'percentage'
                                  ? '100'
                                  : undefined
                              }
                              step="any"
                              dir="ltr"
                              value={invoice.discount}
                              onChange={(e) =>
                                updateInvoice({
                                  discount:
                                    e.target.value === ''
                                      ? 0
                                      : parseFloat(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                              خصم إضافي (ر.س)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              dir="ltr"
                              value={invoice.invoiceDiscount}
                              onChange={(e) =>
                                updateInvoice({
                                  invoiceDiscount:
                                    e.target.value === ''
                                      ? 0
                                      : parseFloat(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                            />
                          </div>

                          {/* Editable VAT Rate (%) */}
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-[#B45309] mb-1">
                              نسبة الضريبة (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              dir="ltr"
                              value={invoice.vatRate ?? 15}
                              onChange={(e) =>
                                updateInvoice({
                                  vatRate:
                                    e.target.value === ''
                                      ? 0
                                      : parseFloat(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 text-xs font-extrabold text-right num-tabular text-[#0F172A] focus:border-[#B45309] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                              المبلغ المدفوع
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              dir="ltr"
                              value={invoice.paidAmount}
                              onChange={(e) =>
                                updateInvoice({
                                  paidAmount:
                                    e.target.value === ''
                                      ? 0
                                      : parseFloat(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-[#B45309] outline-none"
                            />
                          </div>
                        </div>

                        {totals.totalDiscount > 0 && (
                          <div className="text-[11px] font-bold text-[#B45309] bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 flex items-center justify-between num-tabular">
                            <span>إجمالي الخصم المقتطع قبل الضريبة:</span>
                            <span>{formatMoney(totals.totalDiscount)} ر.س</span>
                          </div>
                        )}
                      </div>

                      {/* Calculated Live Summary Box */}
                      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-slate-600 font-semibold">
                            الإجمالي قبل الضريبة:
                          </span>
                          <span className="num-tabular font-bold text-slate-900">
                            {formatMoney(totals.subtotal)} ر.س
                          </span>
                        </div>
                        {totals.totalDiscount > 0 && (
                          <div className="px-3 py-2 flex justify-between bg-amber-50/40">
                            <span className="text-slate-700 font-bold">
                              الصافي الخاضع للضريبة (بعد الخصم):
                            </span>
                            <span className="num-tabular font-bold text-[#92400E]">
                              {formatMoney(totals.taxableAmount)} ر.س
                            </span>
                          </div>
                        )}
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-slate-600 font-semibold">
                            ضريبة القيمة المضافة ({totals.vatRate}%):
                          </span>
                          <span className="num-tabular font-bold text-[#B45309]">
                            {formatMoney(totals.vatAmount)} ر.س
                          </span>
                        </div>
                        <div className="px-3 py-2.5 flex justify-between bg-[#0F172A] text-white rounded-b-lg">
                          <span className="font-extrabold">
                            صافي مبلغ الفاتورة:
                          </span>
                          <span className="num-tabular font-black text-amber-400 text-sm">
                            {formatMoney(totals.finalTotal)} ر.س
                          </span>
                        </div>
                      </div>

                      {/* Arabic Amount in Words Control (Without the word التفقيط) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11.5px] font-bold text-slate-700">
                            المبلغ بالحروف
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateInvoice({
                                tafqeetManual:
                                  invoice.tafqeetManual === null
                                    ? autoTafqeet
                                    : null,
                              })
                            }
                            className="text-[11px] font-bold text-[#B45309] hover:underline"
                          >
                            {invoice.tafqeetManual === null
                              ? 'تعديل المبلغ بالحروف يدوياً'
                              : 'إعادة للوضع التلقائي'}
                          </button>
                        </div>

                        {invoice.tafqeetManual === null ? (
                          <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 text-xs font-bold text-[#0F172A] leading-relaxed">
                            {autoTafqeet}
                          </div>
                        ) : (
                          <textarea
                            rows={2}
                            value={invoice.tafqeetManual}
                            onChange={(e) =>
                              updateInvoice({ tafqeetManual: e.target.value })
                            }
                            className="w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-[#0F172A] outline-none"
                          />
                        )}
                      </div>
                    </section>

                    {/* Section F: Standalone Receipt Voucher ("سند قبض") Customization */}
                    {(isDeferredInvoice || docPrintView === 'both' || docPrintView === 'receipt') ? (
                      <section className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                          <h2 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-emerald-700" />
                            <span>إعدادات صفحة سند القبض (خاص بالفواتير الآجلة)</span>
                          </h2>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDocPrintView('receipt');
                                setIsGalleryOpen(false);
                              }}
                              className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-lg transition-colors ${
                                effectiveDocPrintView === 'receipt'
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-white text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              معاينة السند فقط
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDocPrintView('both');
                                setIsGalleryOpen(false);
                              }}
                              className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-lg transition-colors ${
                                effectiveDocPrintView === 'both'
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-white text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              الفاتورة + السند معاً
                            </button>
                          </div>
                        </div>

                        {/* Explicit Manual Toggle Checkbox */}
                        <label className="flex items-center gap-2.5 bg-white border border-emerald-300/80 rounded-lg p-2.5 cursor-pointer hover:bg-emerald-100/40 transition-colors">
                          <input
                            type="checkbox"
                            checked={effectiveDocPrintView === 'both' || effectiveDocPrintView === 'receipt'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDocPrintView('both');
                                setIsGalleryOpen(false);
                              } else {
                                setDocPrintView('invoice');
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-extrabold text-emerald-950">
                              إرفاق سند القبض في المعاينة والطباعة
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {isDeferredInvoice
                                ? 'مُفعّل تلقائياً لاختيارك الدفع "آجل" - يمكنك إلغاء التحديد لطباعة الفاتورة وحدها'
                                : 'مُلحق يدوياً بسند القبض مع الفاتورة'}
                            </span>
                          </div>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              رقم سند القبض
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder={`RV-${invoice.invoiceNumber}`}
                              value={invoice.receiptVoucher?.receiptNumber || ''}
                              onChange={(e) =>
                                updateReceiptVoucher({
                                  receiptNumber: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular outline-none focus:border-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              المبلغ المقبوض بالسند (ر.س)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              dir="ltr"
                              placeholder={String(
                                invoice.paidAmount > 0
                                  ? invoice.paidAmount
                                  : totals.finalTotal
                              )}
                              value={
                                invoice.receiptVoucher?.amount !== undefined &&
                                invoice.receiptVoucher?.amount !== null
                                  ? invoice.receiptVoucher.amount
                                  : ''
                              }
                              onChange={(e) =>
                                updateReceiptVoucher({
                                  amount:
                                    e.target.value === ''
                                      ? null
                                      : parseFloat(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular outline-none focus:border-emerald-600"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              استلمنا من المكرم / السادة (يتزامن تلقائياً مع اسم العميل)
                            </label>
                            <input
                              type="text"
                              placeholder={invoice.client.name}
                              value={invoice.receiptVoucher?.receivedFrom || ''}
                              onChange={(e) =>
                                updateReceiptVoucher({
                                  receivedFrom: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-emerald-600"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              وذلك مقابل (البيان في سند القبض)
                            </label>
                            <input
                              type="text"
                              placeholder={`دفعة من فاتورة رقم (${invoice.invoiceNumber}) بتاريخ ${invoice.date}`}
                              value={invoice.receiptVoucher?.forReason || ''}
                              onChange={(e) =>
                                updateReceiptVoucher({
                                  forReason: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              اسم المستلم (اختياري)
                            </label>
                            <input
                              type="text"
                              placeholder="اسم أمين الصندوق / المستلم..."
                              value={invoice.receiptVoucher?.receiverName || ''}
                              onChange={(e) =>
                                updateReceiptVoucher({
                                  receiverName: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              اسم المحاسب المعتمد (اختياري)
                            </label>
                            <input
                              type="text"
                              placeholder="اسم المحاسب..."
                              value={invoice.receiptVoucher?.accountantName || ''}
                              onChange={(e) =>
                                updateReceiptVoucher({
                                  accountantName: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-emerald-600"
                            />
                          </div>
                        </div>
                      </section>
                    ) : (
                      <section className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                          <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            سند القبض المستقل متاح فقط عند اختيار طريقة الدفع{' '}
                            <strong className="text-slate-900">«آجل»</strong>.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateInvoice({ paymentMethod: 'آجل' })}
                          className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors shrink-0 cursor-pointer"
                        >
                          تحويل إلى آجل + تفعيل السند
                        </button>
                      </section>
                    )}

                    {/* Primary Save & Issue Action Area */}
                    <section className="pt-1 pb-4 space-y-2.5">
                      <button
                        type="button"
                        onClick={handleSaveAndIssueInvoice}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-l from-[#0F172A] via-slate-900 to-[#0F172A] hover:from-slate-800 hover:to-slate-800 text-white font-extrabold text-sm shadow-lg border-b-[3px] border-b-[#B45309] flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4 text-amber-400" />
                        <span>حفظ وإصدار الفاتورة في السجل ({seller.arabicName})</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handlePrintCurrentDocument}
                          className="py-2.5 px-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>
                            طباعة / PDF (
                            {effectiveDocPrintView === 'invoice'
                              ? 'الفاتورة'
                              : effectiveDocPrintView === 'receipt'
                                ? 'سند القبض'
                                : 'الفاتورة والسند'}
                            )
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleStartNewSequentialInvoice}
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors num-tabular cursor-pointer"
                        >
                          <FilePlus2 className="w-3.5 h-3.5 text-[#B45309]" />
                          <span>فاتورة جديدة فارغة</span>
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* Interactive Drag-to-Resize Splitter Handle (Desktop Split View) */}
          {desktopLayoutMode === 'split' && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="اسحب لتغيير عرض لوحة الإدخال"
              title="اسحب يميناً أو يساراً لتوسيع أو تصغير لوحة الإدخال"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingSplitter(true);
              }}
              className={`hidden lg:flex w-2 cursor-col-resize transition flex-col items-center justify-center shrink-0 select-none z-20 ${
                isDraggingSplitter
                  ? 'bg-amber-500'
                  : 'bg-slate-300/70 hover:bg-amber-500/50 active:bg-amber-500'
              }`}
            >
              <div className="flex flex-col gap-1 py-2">
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="w-1 h-1 rounded-full bg-slate-600" />
              </div>
            </div>
          )}

          {/* Live Interactive A4 Invoice & Company Cards Gallery Preview Pane */}
          <main
            ref={previewPaneRef}
            className={`flex-1 min-w-0 w-full max-w-full flex flex-col bg-slate-200/75 lg:h-full lg:overflow-hidden ${
              mobilePane === 'controls' ? 'hidden' : 'flex'
            } ${desktopLayoutMode === 'input' ? 'lg:hidden' : 'lg:flex'}`}
          >
            {/* Row 2: Clean Sub-Header above the Preview Pane (Right: Company Quick-Switch Strip | Left/Center: Pagination + Zoom) */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Right: Clean Horizontal Scrollable Strip of Company Quick-Switch Cards */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer ${
                    isGalleryOpen
                      ? 'bg-[#0F172A] text-amber-300 shadow-xs'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>
                    {isGalleryOpen ? 'إغلاق المعرض' : 'معرض البطاقات'}
                  </span>
                </button>

                <div className="w-[1px] h-4 bg-slate-300 shrink-0 mx-0.5" />

                {companies.map((comp) => {
                  const isActive = !isGalleryOpen && comp.id === seller.id;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSwitchCompany(comp)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0F172A] text-amber-400 shadow-xs border border-[#0F172A]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="truncate max-w-[145px]">
                        {comp.arabicName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Left/Center: Page Navigation (السابق | صفحة X من Y | التالي) + Zoom Controls (100% | ملائمة) */}
              {!isGalleryOpen && (
                <div className="flex items-center gap-2 flex-wrap mr-auto">
                  {effectiveDocPrintView !== 'receipt' && (
                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/90 p-1 rounded-xl">
                      {previewViewMode === 'single' && (
                        <>
                          <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none shadow-2xs transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span>السابق</span>
                          </button>

                          <span className="text-[11px] font-extrabold text-slate-800 px-2 num-tabular">
                            صفحة {currentPage} من {totalPages}
                          </span>

                          <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>التالي</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setPreviewViewMode((prev) =>
                            prev === 'single' ? 'all' : 'single'
                          )
                        }
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          previewViewMode === 'all'
                            ? 'bg-[#B45309] text-white shadow-2xs'
                            : 'bg-white text-[#0F172A] hover:bg-amber-50 shadow-2xs'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {previewViewMode === 'single'
                            ? `كل الصفحات (${totalPages})`
                            : 'صفحة بصفحة'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Zoom Controls (100% | ملائمة) */}
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/90 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomMode((prev) => {
                          const cur = prev === 'fit' ? autoFitScale : prev;
                          return Math.max(0.5, Number((cur - 0.1).toFixed(2)));
                        })
                      }
                      className="p-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="تصغير المعاينة"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setZoomMode(1)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-extrabold num-tabular transition-colors cursor-pointer ${
                        zoomMode === 1
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      100%
                    </button>

                    <button
                      type="button"
                      onClick={() => setZoomMode('fit')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-extrabold num-tabular transition-colors cursor-pointer ${
                        zoomMode === 'fit'
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ملائمة ({Math.round(effectiveScale * 100)}%)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setZoomMode((prev) => {
                          const cur = prev === 'fit' ? autoFitScale : prev;
                          return Math.min(1.25, Number((cur + 0.1).toFixed(2)));
                        })
                      }
                      className="p-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="تكبير المعاينة"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Scrollable Content: either Interactive Company Gallery OR Live A4 Preview */}
            {isGalleryOpen ? (
              <div className="flex-1 overflow-y-auto">
                <CompanyGalleryView
                  companies={companies}
                  activeCompanyId={seller.id}
                  itemsCount={invoice.items.length}
                  clientName={invoice.client.name}
                  onSelectCompany={handleSwitchCompany}
                  onOpenCompanySettings={() => setIsSellerModalOpen(true)}
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0 w-full max-w-full overflow-auto py-4 lg:py-6 px-2 lg:px-4 flex flex-col items-center">
               <div
                 className="shrink-0 max-w-full"
                 style={{ width: `${A4_PIXEL_WIDTH * effectiveScale}px`, overflowX: 'clip' }}
               >
                <div
                  className="origin-top-right transition-transform duration-150 space-y-8"
                  style={
                    effectiveScale !== 1
                      ? {
                          width: `${A4_PIXEL_WIDTH}px`,
                          transform: `scale(${effectiveScale})`,
                          marginBottom:
                            effectiveScale < 1
                              ? `${
                                  -(1 - effectiveScale) *
                                  1122 *
                                  displayedPagesCount
                                }px`
                              : `${
                                  (effectiveScale - 1) *
                                  1122 *
                                  displayedPagesCount
                                }px`,
                        }
                      : { width: `${A4_PIXEL_WIDTH}px` }
                  }
                >
                  {(effectiveDocPrintView === 'invoice' ||
                    effectiveDocPrintView === 'both') && (
                    <InvoiceA4Sheet
                      invoice={invoice}
                      seller={seller}
                      activePage={currentPage}
                      viewMode={previewViewMode}
                      renderAllPages={false}
                    />
                  )}

                  {(effectiveDocPrintView === 'receipt' ||
                    effectiveDocPrintView === 'both') && (
                    <ReceiptVoucherA4Sheet invoice={invoice} seller={seller} />
                  )}
                </div>
               </div>

                {/* Floating Bottom Pagination Bar when invoice has multiple pages */}
                {effectiveDocPrintView !== 'receipt' && totalPages > 1 && (
                  <div className="mt-6 sticky bottom-3 z-20 bg-[#0F172A]/95 text-white border border-[#B45309] rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3">
                    <button
                      type="button"
                      disabled={previewViewMode === 'all' || currentPage <= 1}
                      onClick={() => {
                        setPreviewViewMode('single');
                        setCurrentPage((prev) => Math.max(1, prev - 1));
                      }}
                      className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>السابق</span>
                    </button>

                    <span className="text-xs font-extrabold text-amber-300 num-tabular">
                      {previewViewMode === 'single'
                        ? `صفحة ${currentPage} من ${totalPages}`
                        : `معاينة متصلة (${totalPages} صفحات)`}
                    </span>

                    <button
                      type="button"
                      disabled={
                        previewViewMode === 'all' || currentPage >= totalPages
                      }
                      onClick={() => {
                        setPreviewViewMode('single');
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                      }}
                      className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <span>التالي</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {shareModal && (
          <ShareInvoiceModal
            message={shareModal.message}
            url={shareModal.url}
            onClose={() => setShareModal(null)}
          />
        )}

        {/* Multi-Company & 8-Template Manager Modal */}
        {isSellerModalOpen && (
          <SellerSettingsModal
            companies={companies}
            activeSeller={seller}
            onSelectCompany={(selected) => {
              handleSwitchCompany(selected);
            }}
            onSaveCompanies={(updatedList, selectedComp) => {
              setCompanies(updatedList);
              saveCompaniesToStorage(updatedList);
              handleSwitchCompany(selectedComp);
            }}
            onClose={() => setIsSellerModalOpen(false)}
          />
        )}
      </div>

      {/* Dedicated Top-Level Print Mount (Renders Selected Document(s) Sequentially on Print) */}
      <div className="hidden print:block">
        {(effectiveDocPrintView === 'invoice' ||
          effectiveDocPrintView === 'both') && (
          <InvoiceA4Sheet
            invoice={invoice}
            seller={seller}
            renderAllPages={true}
          />
        )}
        {(effectiveDocPrintView === 'receipt' ||
          effectiveDocPrintView === 'both') && (
          <ReceiptVoucherA4Sheet invoice={invoice} seller={seller} />
        )}
      </div>
    </>
  );
}

export default App;
