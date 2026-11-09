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
  Crown,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  Layers,
  Link2,
  LogIn,
  LogOut,
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
  User as UserIcon,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DEFAULT_CATALOG_ITEMS,
  EMPTY_CLIENT_INFO,
  INITIAL_INVOICE_NUMBER,
  PAYMENT_METHODS,
  TEMPLATE_STYLES,
} from './constants/defaults';
import {
  CatalogItem,
  DocumentPrintView,
  InvoiceData,
  InvoiceLineItem,
  PaymentMethod,
  ReceiptVoucherData,
  SavedClient,
  SellerInfo,
  TemplateStyle,
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
  clearActiveDraftFromStorage,
  createFreshBlankInvoice,
  loadActiveDraftFromStorage,
  loadCatalogFromStorage,
  loadInvoicesFromStorage,
  loadNextInvoiceNumber,
  loadSavedClientsFromStorage,
  loadSellerFromStorage,
  saveActiveDraftToStorage,
  saveCatalogToStorage,
  saveInvoicesToStorage,
  saveNextInvoiceNumber,
  saveSavedClientsToStorage,
  saveSellerToStorage,
  setOnboardingCompleted,
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
  exportInvoicesHistoryToExcel,
  ImportedCatalogItemData,
  parseInvoiceItemsExcelFile,
} from './utils/excelCatalog';
import { UniversalInvoice } from './components/UniversalInvoice';
import { ReceiptVoucherA4Sheet } from './components/ReceiptVoucherA4Sheet';
import { LineItemRow } from './components/LineItemRow';
import { CatalogManagerTab } from './components/CatalogManagerTab';
import { InvoicesHistoryTab } from './components/InvoicesHistoryTab';
import { CompanySettingsTab } from './components/CompanySettingsTab';
import { SellerSettingsModal } from './components/SellerSettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PublicInvoiceViewer } from './components/PublicInvoiceViewer';
import { ShareInvoiceModal } from './components/ShareInvoiceModal';
import { User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  UserProfile,
  fetchUserProfile,
  incrementInvoiceCounter,
  logActivity,
} from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { TrialLimitModal } from './components/TrialLimitModal';
import { ProspectLinkGenerator } from './components/ProspectLinkGenerator';
import { InvoCoreLogo } from './components/InvoCoreLogo';
import {
  getMarketConfig,
  TaxJurisdiction,
} from './constants/jurisdictions';
import { getTranslation, Language } from './utils/i18n';
import {
  loadCatalogItemsFromCloud,
  loadDocumentsFromCloud,
  loadTenantSettingsFromCloud,
  subscribeToTenantSync,
  syncCatalogItemToCloud,
  syncDocumentToCloud,
  syncTenantSettingsToCloud,
} from './lib/supabaseSync';

type AdminTab = 'editor' | 'catalog' | 'history' | 'settings';
type MobilePane = 'controls' | 'preview';
type DesktopLayoutMode = 'split' | 'input' | 'preview';

const A4_PIXEL_WIDTH = 794;
const DEFAULT_PANEL_WIDTH = 540;
const MIN_PANEL_WIDTH = 380;

function parseUrlProspectParams(): {
  prospect: string | null;
  market: TaxJurisdiction | null;
  lang: Language | null;
  template: TemplateStyle | null;
  color: string | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawProspect = params.get('prospect')?.trim() || null;
    const rawMarket = params.get('market')?.trim().toUpperCase() || null;
    const rawLang = params.get('lang')?.trim().toLowerCase() || null;
    const rawTemplate = params.get('template')?.trim().toLowerCase() || null;
    const rawColor = params.get('color')?.trim() || null;

    const validMarkets: TaxJurisdiction[] = ['KSA', 'EGY', 'USA', 'EU'];
    const market =
      rawMarket && validMarkets.includes(rawMarket as TaxJurisdiction)
        ? (rawMarket as TaxJurisdiction)
        : null;

    const lang: Language | null =
      rawLang === 'ar' || rawLang === 'en'
        ? rawLang
        : market
        ? market === 'USA' || market === 'EU'
          ? 'en'
          : 'ar'
        : null;

    const template: TemplateStyle | null =
      rawTemplate === 'classic'
        ? 'classic'
        : rawTemplate === 'minimal' || rawTemplate === 'minimalist'
        ? 'minimalist'
        : rawTemplate === 'modern'
        ? 'modern'
        : null;

    let color: string | null = null;
    if (rawColor) {
      const cleanedHex = rawColor.replace(/^#/, '');
      if (/^[0-9A-Fa-f]{3,6}$/.test(cleanedHex)) {
        color = `#${cleanedHex}`;
      }
    }

    return { prospect: rawProspect, market, lang, template, color };
  } catch {
    return { prospect: null, market: null, lang: null, template: null, color: null };
  }
}

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

  const initialProspectParams = useMemo(() => parseUrlProspectParams(), []);
  const [prospectCompanyName, setProspectCompanyName] = useState<string | null>(
    () => initialProspectParams.prospect
  );
  const [isProspectBannerDismissed, setIsProspectBannerDismissed] =
    useState<boolean>(false);
  const [isProspectGeneratorOpen, setIsProspectGeneratorOpen] =
    useState<boolean>(false);

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

  const [seller, setSeller] = useState<SellerInfo>(() => {
    const loaded = loadSellerFromStorage();
    const p = parseUrlProspectParams();
    return {
      ...loaded,
      ...(p.prospect ? { arabicName: p.prospect, englishName: p.prospect } : {}),
      ...(p.market ? { jurisdiction: p.market } : {}),
      ...(p.template ? { templateStyle: p.template } : {}),
      ...(p.color ? { primaryColor: p.color } : {}),
    };
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const existingDraft = loadActiveDraftFromStorage();
    const existing = loadInvoicesFromStorage();
    const startNo =
      existing.length === 0 ? INITIAL_INVOICE_NUMBER : loadNextInvoiceNumber();
    const baseInvoice = existingDraft
      ? existingDraft.invoice
      : createFreshBlankInvoice(startNo);
    const p = parseUrlProspectParams();
    if (p.market) {
      const mCfg = getMarketConfig(p.market);
      return {
        ...baseInvoice,
        jurisdiction: p.market,
        vatRate: mCfg.defaultVatRate,
      };
    }
    return baseInvoice;
  });

  // Saved Clients Directory ("دفتر العملاء المحفوظين")
  const [savedClients, setSavedClients] = useState<SavedClient[]>(() =>
    loadSavedClientsFromStorage()
  );
  const [selectedSavedClientId, setSelectedSavedClientId] = useState<string>('');

  // Document View / Print Mode ('invoice' | 'receipt' | 'both')
  const [docPrintView, setDocPrintView] = useState<DocumentPrintView>(() => {
    const existingDraft = loadActiveDraftFromStorage();
    return existingDraft?.docPrintView || 'invoice';
  });

  // Auto-Save Active Draft to localStorage ('invocore_active_draft') on every change
  useEffect(() => {
    if (publicInvoiceParam !== null) return;
    saveActiveDraftToStorage(invoice, docPrintView);
  }, [invoice, docPrintView, publicInvoiceParam]);

  // --- 100% Arabic & English Bidirectional Localization Engine ---
  const [lang, setLang] = useState<Language>(() => {
    const p = parseUrlProspectParams();
    if (p.lang) return p.lang;
    try {
      const saved = localStorage.getItem('invocore_lang') as Language;
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {}
    return 'ar';
  });

  const t = useMemo(() => getTranslation(lang), [lang]);

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    try {
      localStorage.setItem('invocore_lang', nextLang);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Keyboard Shortcut (Shift + Alt + D) for Founder Outreach Link Generator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && (e.code === 'KeyD' || e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsProspectGeneratorOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Supabase Authentication, Profile & Usage Tracking ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);
  const [guestUsageCount, setGuestUsageCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('invocore_guest_usage') || '0');
    } catch {
      return 0;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isTrialLimitModalOpen, setIsTrialLimitModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (publicInvoiceParam !== null) {
      return;
    }

    let isMounted = true;

    async function checkSession() {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (data?.session?.user) {
            setCurrentUser(data.session.user);
            const prof = await fetchUserProfile(data.session.user);
            if (isMounted) setUserProfile(prof);
          }
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      }
    }

    checkSession();

    if (isSupabaseConfigured) {
      const { data: authSub } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!isMounted) return;
          if (session?.user) {
            setCurrentUser(session.user);
            const prof = await fetchUserProfile(session.user);
            if (isMounted) setUserProfile(prof);
            setIsGuestMode(false);
            try {
              localStorage.removeItem('invocore_guest_session');
            } catch {}
          } else {
            setCurrentUser(null);
            setUserProfile(null);
          }
        }
      );

      return () => {
        isMounted = false;
        authSub.subscription.unsubscribe();
      };
    }
  }, [publicInvoiceParam]);

  const currentPlanTier: 'free_trial' | 'pro' = userProfile?.plan_tier || 'free_trial';
  const invoicesGenerated: number =
    userProfile?.invoices_generated ?? (isGuestMode ? guestUsageCount : 0);
  const maxTrialInvoices: number = userProfile?.max_trial_invoices ?? 3;
  const isWatermarked: boolean = currentPlanTier !== 'pro';

  const handleAuthAction = async () => {
    if (currentUser) {
      if (isSupabaseConfigured) {
        await logActivity('LOGOUT', {}, currentUser.id, currentUser.email);
        await supabase.auth.signOut();
      }
      setCurrentUser(null);
      setUserProfile(null);
      setIsGuestMode(true);
      showToast('تم تسجيل الخروج بنجاح. أنت الآن في وضع المعاينة السريعة.');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleContinueAsGuest = () => {
    setIsGuestMode(true);
    try {
      localStorage.setItem('invocore_guest_session', 'true');
    } catch {}
    setIsAuthModalOpen(false);
    showToast('مرحبًا بك في وضع المعاينة السريعة (علامة مائية تجريبية)');
  };

  const handleAuthSuccess = (profile: UserProfile, isGuest?: boolean) => {
    if (isGuest) {
      handleContinueAsGuest();
    } else {
      setUserProfile(profile);
      setIsGuestMode(false);
      try {
        localStorage.removeItem('invocore_guest_session');
      } catch {}
      setIsAuthModalOpen(false);
      showToast(`أهلاً بك ${profile.full_name || profile.email}! تم تسجيل الدخول بنجاح`);
    }
  };

  // --- Multi-Device Cloud Sync Engine Hook ---
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    // 1. Initial Load from Supabase Cloud
    async function loadCloudData() {
      try {
        const [cloudSettings, cloudCatalog, cloudDocs] = await Promise.all([
          loadTenantSettingsFromCloud(currentUser!.id),
          loadCatalogItemsFromCloud(currentUser!.id),
          loadDocumentsFromCloud(currentUser!.id),
        ]);

        if (!isMounted) return;

        if (cloudSettings) {
          setSeller((prev) => ({ ...prev, ...cloudSettings }));
          saveSellerToStorage(cloudSettings);
        }
        if (cloudCatalog && cloudCatalog.length > 0) {
          setCatalog(cloudCatalog);
          saveCatalogToStorage(cloudCatalog);
        }
        if (cloudDocs && cloudDocs.length > 0) {
          setSavedInvoices(cloudDocs);
          saveInvoicesToStorage(cloudDocs);
        }
      } catch (err) {
        console.warn('Initial cloud sync load failed:', err);
      }
    }

    loadCloudData();

    // 2. Real-Time Channel Subscription
    const channel = subscribeToTenantSync(currentUser.id, {
      onSettingsChange: (newSeller) => {
        if (!isMounted) return;
        setSeller(newSeller);
        saveSellerToStorage(newSeller);
      },
      onCatalogChange: async () => {
        if (!isMounted) return;
        const freshCatalog = await loadCatalogItemsFromCloud(currentUser!.id);
        if (freshCatalog.length > 0) {
          setCatalog(freshCatalog);
          saveCatalogToStorage(freshCatalog);
        }
      },
      onDocumentsChange: async () => {
        if (!isMounted) return;
        const freshDocs = await loadDocumentsFromCloud(currentUser!.id);
        if (freshDocs.length > 0) {
          setSavedInvoices(freshDocs);
          saveInvoicesToStorage(freshDocs);
        }
      },
    });

    return () => {
      isMounted = false;
      channel?.unsubscribe();
    };
  }, [currentUser?.id]);

  // Expose test helper methods on window for automated QA verification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const setInv = (newInv: Partial<InvoiceData>) => {
        setInvoice((prev) => ({ ...prev, ...newInv }));
      };
      const setSel = (newSeller: Partial<SellerInfo>) => {
        setSeller((prev) => ({ ...prev, ...newSeller }));
      };
      const setTemp = (s: TemplateStyle) => {
        handleQuickTemplateChange(s);
      };

      const w = window as unknown as Record<string, unknown>;
      w.__invocoreSetInvoice = setInv;
      w.__invocoreSetSeller = setSel;
      w.__invocoreSetDocPrintView = setDocPrintView;
      w.__invocoreSetCurrentPage = setCurrentPage;
      w.__invocoreSetTemplateStyle = setTemp;

      // Legacy aliases for backward compatibility with automated test runners
      w.__saqrSetInvoice = setInv;
      w.__saqrSetSeller = setSel;
      w.__saqrSetDocPrintView = setDocPrintView;
      w.__saqrSetCurrentPage = setCurrentPage;
      w.__saqrSetTemplateStyle = setTemp;
    }
  }, []);

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
        const saved =
          localStorage.getItem('invocore_desktop_layout_mode') ||
          localStorage.getItem('saqr_desktop_layout_mode');
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
      const saved = Number(
        localStorage.getItem('invocore_panel_width') ||
          localStorage.getItem('saqr_panel_width')
      );
      if (Number.isFinite(saved) && saved >= 440 && saved <= 1400) {
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
    if (currentUser?.id) {
      syncTenantSettingsToCloud(currentUser.id, seller).catch((err) =>
        console.warn('Auto cloud sync seller failed:', err)
      );
    }
  }, [seller, currentUser?.id]);

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
      localStorage.setItem('invocore_desktop_layout_mode', desktopLayoutMode);
      localStorage.setItem('saqr_desktop_layout_mode', desktopLayoutMode);
    } catch {
      // ignore
    }
  }, [desktopLayoutMode]);

  useEffect(() => {
    try {
      localStorage.setItem('invocore_panel_width', String(Math.round(panelWidth)));
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
  }, [publicInvoiceParam, desktopLayoutMode, panelWidth, mobilePane]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNavigateToTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (desktopLayoutMode === 'preview') {
      setDesktopLayoutMode('split');
    }
    if (mobilePane === 'preview') {
      setMobilePane('controls');
    }
  };

  const handleBrandLogoClick = () => {
    saveActiveDraftToStorage(invoice, 'invoice');
    saveSellerToStorage(seller);
    try {
      localStorage.setItem('invocore_desktop_layout_mode', 'split');
      localStorage.setItem('saqr_desktop_layout_mode', 'split');
    } catch {}
    setActiveTab('editor');
    setDocPrintView('invoice');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Active Jurisdiction and Market Config
  const currentJurisdiction: TaxJurisdiction =
    invoice.jurisdiction || seller.jurisdiction || 'KSA';
  const marketConfig = useMemo(
    () => getMarketConfig(currentJurisdiction),
    [currentJurisdiction]
  );
  const currencySymbol =
    lang === 'ar' ? marketConfig.currencySymbolAr : marketConfig.currencySymbolEn;

  // Financial Calculations & Auto Tafqeet
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);
  const autoTafqeet = useMemo(
    () => numberToArabicTafqeet(totals.finalTotal, currentJurisdiction),
    [totals.finalTotal, currentJurisdiction]
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
    () => encodePublicInvoiceUrl(invoice, seller, lang),
    [invoice, seller, lang]
  );

  // If URL is in Public Client PDF View Mode (?invoice=...), render ONLY the Client PDF Viewer
  if (publicInvoiceParam !== null) {
    return <PublicInvoiceViewer decodedData={decodedPublicData} />;
  }

  // --- Safe Print Helper & Usage Enforcement ---
  const handlePrintCurrentDocument = async () => {
    // If free trial or guest, check limit
    if (currentPlanTier === 'free_trial') {
      if (invoicesGenerated >= maxTrialInvoices) {
        logActivity('LIMIT_REACHED', {
          action: 'print_blocked',
          invoicesGenerated,
          maxTrialInvoices,
        }, currentUser?.id, currentUser?.email);
        setIsTrialLimitModalOpen(true);
        return;
      }

      // Increment in database / storage
      const res = await incrementInvoiceCounter(currentUser);
      if (currentUser && userProfile) {
        setUserProfile((prev) =>
          prev ? { ...prev, invoices_generated: res.invoices_generated } : null
        );
      } else {
        setGuestUsageCount(res.invoices_generated);
      }
    } else {
      logActivity('PRINT_INVOICE', {
        plan_tier: currentPlanTier,
        invoiceNumber: invoice.invoiceNumber,
      }, currentUser?.id, currentUser?.email);
    }

    const prefix = docPrintView === 'receipt' ? 'Receipt' : 'Invoice';
    triggerSafePrint(invoice.invoiceNumber, prefix);
  };

  // --- Safe Excel Export & Usage Enforcement ---
  const handleExportInvoicesHistory = () => {
    if (currentPlanTier === 'free_trial' && invoicesGenerated >= maxTrialInvoices) {
      logActivity('LIMIT_REACHED', {
        action: 'excel_export_blocked',
        invoicesGenerated,
        maxTrialInvoices,
      }, currentUser?.id, currentUser?.email);
      setIsTrialLimitModalOpen(true);
      return;
    }

    logActivity('EXPORT_EXCEL', {
      count: savedInvoices.length,
      plan_tier: currentPlanTier,
    }, currentUser?.id, currentUser?.email);

    exportInvoicesHistoryToExcel(savedInvoices);
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
  const handleQuickTemplateChange = (style: TemplateStyle) => {
    const updatedSeller: SellerInfo = {
      ...seller,
      templateStyle: style,
    };
    setSeller(updatedSeller);
    saveSellerToStorage(updatedSeller);
    const tplObj = TEMPLATE_STYLES.find((t) => t.id === style);
    showToast(`تم تغيير نمط الفاتورة إلى: ${tplObj?.name || style}`);
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

    if (currentUser?.id) {
      syncCatalogItemToCloud(
        currentUser.id,
        {
          id: generateId('cat'),
          name: cleanName,
          unitPrice,
          unit: unit || 'وحدة',
          isTaxable: true,
        },
        currentPlanTier === 'pro'
      ).catch((err) => console.warn('Cloud catalog sync failed:', err));
    }
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
   * Core helper to persist an invoice into `saas_invoices` in localStorage without overwriting previous invoices.
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

    if (currentUser?.id) {
      syncDocumentToCloud(
        currentUser.id,
        'invoice',
        issuedInvoice.invoiceNumber,
        issuedInvoice,
        currentPlanTier === 'pro'
      ).catch((err) => console.warn('Cloud doc sync failed:', err));
    }

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

    const freshBase = createFreshBlankInvoice(suggestedNext, invoice.qrMode);
    const activeJur = seller.jurisdiction || invoice.jurisdiction || 'KSA';
    const mCfg = getMarketConfig(activeJur);
    const fresh: InvoiceData = {
      ...freshBase,
      jurisdiction: activeJur,
      vatRate: mCfg.defaultVatRate,
    };
    clearActiveDraftFromStorage();
    saveActiveDraftToStorage(fresh, 'invoice');
    setInvoice(fresh);
    setDocPrintView('invoice');
    setCurrentPage(1);
    setJustIssuedBanner(false);
    handleNavigateToTab('editor');
    showToast(
      lang === 'ar'
        ? `تم فتح فاتورة جديدة فارغة (يمكنك كتابة رقم الفاتورة يدوياً بحرية)`
        : `Opened a fresh blank invoice (#${suggestedNext})`
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

  const isDeferredInvoice = invoice.paymentMethod === 'آجل';
  const effectiveDocPrintView: DocumentPrintView =
    isDeferredInvoice || docPrintView !== 'invoice'
      ? docPrintView
      : 'invoice';

  return (
    <>
      {/* Main Admin Application Shell (Hidden when Printing) */}
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="no-print min-h-screen w-full max-w-[100vw] overflow-x-hidden lg:h-screen lg:overflow-hidden flex flex-col bg-slate-100 text-slate-900"
      >
        {/* Personalized Executive Prospect Welcome Banner (Active when ?prospect=... is in URL) */}
        {prospectCompanyName && !isProspectBannerDismissed && (
          <div className="bg-gradient-to-r from-teal-950 via-[#0F172A] to-teal-950 border-b border-teal-500/40 px-3 sm:px-5 py-2.5 text-xs text-white flex flex-wrap items-center justify-between gap-3 z-40 shrink-0 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-300 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <p className="font-semibold text-slate-100 leading-relaxed">
                {lang === 'ar' ? (
                  <>
                    نسخة عرض مخصصة لـ{' '}
                    <strong className="font-black text-teal-300 underline decoration-teal-500/50 underline-offset-4">
                      {prospectCompanyName}
                    </strong>{' '}
                    — جرب إصدار الفواتير الضريبية وسندات القبض فوراً، أو اطلب تفعيل النظام الكامل بهويتكم الخاصة.
                  </>
                ) : (
                  <>
                    Custom Live Preview prepared for{' '}
                    <strong className="font-black text-teal-300 underline decoration-teal-500/50 underline-offset-4">
                      {prospectCompanyName}
                    </strong>{' '}
                    — Test tax invoicing &amp; vouchers live, or request full White-Label deployment for your team.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTrialLimitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-sm transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>
                  {lang === 'ar'
                    ? 'طلب تفعيل النسخة الكاملة للمنشأة'
                    : 'Get Full Company License'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsProspectBannerDismissed(true)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={lang === 'ar' ? 'إخفاء الشريط' : 'Dismiss banner'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Row 0: Commercial License & User Status Bar */}
        <div className="bg-[#090D16] border-b border-slate-800/80 px-3 sm:px-5 py-2 text-xs flex flex-wrap items-center justify-between gap-2.5 z-40 shrink-0 text-slate-300">
          {/* User Profile & Plan Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <UserIcon className="w-3.5 h-3.5 text-teal-400" />
              <span>
                {currentUser?.email || (lang === 'ar' ? 'زائر تجريبي (معاينة سريعة)' : 'Guest Preview')}
              </span>
            </div>

            <span className="text-slate-700 hidden sm:inline">•</span>

            {currentPlanTier === 'pro' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Crown className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ar' ? 'حساب مرخص (PRO Licensed)' : 'PRO Licensed'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>
                  {lang === 'ar'
                    ? `رصيد الفواتير التجريبية: ${Math.max(0, maxTrialInvoices - invoicesGenerated)} / ${maxTrialInvoices} متبقية (Free Trial)`
                    : `Trial Balance: ${Math.max(0, maxTrialInvoices - invoicesGenerated)} / ${maxTrialInvoices} remaining (Free Trial)`}
                </span>
              </span>
            )}
          </div>

          {/* Action Pod */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Tax Jurisdiction Badge / Switcher (Opens Settings in Any View Mode) */}
            <button
              type="button"
              onClick={() => handleNavigateToTab('settings')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer group"
              title={lang === 'ar' ? 'تعديل سوق العمل والامتثال الضريبي في إعدادات المنشأة' : 'Edit tax jurisdiction in Company Settings'}
            >
              <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="font-mono font-bold text-white">{marketConfig.code}</span>
              <span className="text-slate-500 text-[10px]">•</span>
              <span className="text-slate-300 text-[11px] font-medium">{marketConfig.currencyCode}</span>
              <span className="text-slate-400 text-[11px]">{totals.vatRate}%</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
            </button>

            {/* Prominent Top Navbar Prospect Link Builder Button */}
            <button
              type="button"
              onClick={() => setIsProspectGeneratorOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-teal-300 border border-teal-500/30 transition-colors cursor-pointer"
              title={lang === 'ar' ? 'مولد روابط العروض المخصصة للعملاء (Shift + Alt + D)' : 'Prospect Demo Link Builder (Shift + Alt + D)'}
            >
              <Link2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{lang === 'ar' ? 'مولد روابط العملاء' : 'Prospect Link'}</span>
            </button>

            {/* Global Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
              title={lang === 'ar' ? 'Switch interface to English' : 'التحويل إلى اللغة العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.langSwitchBtn}</span>
            </button>

            {currentPlanTier !== 'pro' && (
              <button
                type="button"
                onClick={() => setIsTrialLimitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-2xs transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-white" />
                <span>{t.upgradeToPro}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAuthAction}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
              title={currentUser ? (lang === 'ar' ? 'تسجيل الخروج من الحساب' : 'Sign Out') : (lang === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register')}
            >
              {currentUser ? (
                <>
                  <LogOut className="w-3.5 h-3.5 text-teal-400" />
                  <span>{t.signOut}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-teal-400" />
                  <span>{t.signInOrCreate}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 1: Main Navigation & Action Bar - Dark Navy #0F172A with Clean Enterprise Styling */}
        <header className="bg-[#0F172A] text-white border-b border-slate-800 px-3 sm:px-5 py-2.5 shrink-0 shadow-sm z-30 w-full max-w-full min-w-0">
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between w-full min-w-0 gap-2.5">
            {/* RIGHT POD: Clickable Platform Brand & Active Company Identity Pill */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto min-w-0">
              {/* Interactive InvoCore Logo Button (Saves Draft & Reloads Workspace) */}
              <button
                type="button"
                onClick={handleBrandLogoClick}
                className="flex items-center gap-3 text-right min-w-0 w-full lg:w-auto cursor-pointer group text-left transition-opacity hover:opacity-95 focus:outline-none"
                title={lang === 'ar' ? 'حفظ المسودة الحالية وتحديث مساحة العمل الرئيسية' : 'Save active draft & reload main Invoice Workspace'}
              >
                <div className="transition-transform group-hover:scale-105">
                  <InvoCoreLogo size={36} variant="light" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                      Invo<span className="text-teal-400">Core</span>
                    </h1>
                    <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      إنفو كور
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-medium truncate max-w-[230px] sm:max-w-[300px] mt-0.5">
                    {(lang === 'ar' ? seller.arabicName : (seller.englishName || seller.arabicName)) || 'InvoCore Platform'} • {lang === 'ar' ? 'ضريبي:' : 'VAT:'}{' '}
                    <span className="num-tabular text-slate-300">
                      {seller.taxNumber || (lang === 'ar' ? 'غير محدد' : 'N/A')}
                    </span>
                  </p>
                </div>
              </button>

              {/* Active Company Pill & Settings Button */}
              <div className="w-full lg:w-auto min-w-0 flex items-center justify-between gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-inner">
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: seller.primaryColor || '#0F172A' }}
                  />
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">
                    {(lang === 'ar' ? seller.arabicName : (seller.englishName || seller.arabicName)) || 'InvoCore'}
                  </span>
                  <span className="text-[9.5px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-medium">
                    {seller.templateStyle === 'classic'
                      ? (lang === 'ar' ? 'كلاسيكي' : 'Classic')
                      : seller.templateStyle === 'minimalist'
                        ? (lang === 'ar' ? 'مبسط' : 'Minimal')
                        : (lang === 'ar' ? 'عصري' : 'Modern')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateToTab('settings')}
                  className="text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  title={lang === 'ar' ? 'تخصيص بيانات المنشأة والشعار والألوان' : 'Customize company branding & logo'}
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>{t.tabSettings}</span>
                </button>
              </div>
            </div>

            {/* CENTER POD: Document & Workspace Mode Group */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 w-full lg:w-auto min-w-0 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
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
                  onClick={() => setDocPrintView('invoice')}
                  className={`justify-center px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    effectiveDocPrintView === 'invoice'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'الفاتورة الضريبية' : 'Tax Invoice'}</span>
                </button>

                {(isDeferredInvoice || docPrintView !== 'invoice') && (
                  <>
                    <button
                      type="button"
                      onClick={() => setDocPrintView('receipt')}
                      className={`justify-center px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        effectiveDocPrintView === 'receipt'
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      title={lang === 'ar' ? 'عرض وإصدار سند قبض (للفواتير الآجلة)' : 'View & issue receipt voucher'}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{t.tabReceiptVoucher}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDocPrintView('both')}
                      className={`justify-center px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        effectiveDocPrintView === 'both'
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      title={lang === 'ar' ? 'عرض وطباعة الفاتورة الضريبية يليها سند القبض' : 'Print Invoice & Receipt voucher together'}
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{lang === 'ar' ? 'الفاتورة + السند' : 'Invoice + Receipt'}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Divider + Desktop 3-Mode View Switcher */}
              <div className="hidden lg:block w-[1px] h-5 bg-slate-800 mx-0.5" />
              <div className="hidden lg:inline-flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('split')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    desktopLayoutMode === 'split'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={lang === 'ar' ? 'عرض متزامن لنموذج الإدخال ومعاينة الفاتورة' : 'Split View: Form & Live Preview'}
                >
                  {lang === 'ar' ? 'تقسيم الشاشة' : 'Split View'}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('input')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    desktopLayoutMode === 'input'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={lang === 'ar' ? 'عرض نموذج البيانات فقط بملء الشاشة' : 'Data Entry View'}
                >
                  {lang === 'ar' ? 'البيانات' : 'Data Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('preview')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    desktopLayoutMode === 'preview'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={lang === 'ar' ? 'معاينة الفاتورة فقط بالمنتصف' : 'Preview Only View'}
                >
                  {lang === 'ar' ? 'الفاتورة' : 'Preview Only'}
                </button>
              </div>
            </div>

            {/* LEFT POD: Primary Action Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center w-full lg:w-auto min-w-0 gap-2">
              <button
                type="button"
                onClick={handlePrintCurrentDocument}
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                title={lang === 'ar' ? 'مشاركة رابط وتفاصيل الفاتورة مباشرة عبر واتساب' : 'Share invoice details directly via WhatsApp'}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
              </button>

              <a
                href={publicShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                title={lang === 'ar' ? 'معاينة صفحة العميل العامة كما تظهر عند مسح الرابط بالكاميرا' : 'Preview public client page as opened via QR scan'}
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'ar' ? 'صفحة العميل' : 'Client View'}</span>
              </a>

              <button
                type="button"
                onClick={handleStartNewSequentialInvoice}
                className="inline-flex justify-center items-center min-w-0 whitespace-nowrap gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'فاتورة جديدة' : '+ New Invoice'}</span>
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
            <span>{lang === 'ar' ? 'لوحة الإدخال والتحكم' : 'Editor & Controls'}</span>
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
              {lang === 'ar'
                ? `معاينة ${docPrintView === 'receipt' ? 'سند القبض' : `الفاتورة (${totalPages})`}`
                : `Preview ${docPrintView === 'receipt' ? 'Receipt' : `Invoice (${totalPages})`}`}
            </span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 left-5 z-50 bg-[#0F172A] text-white border-r-4 border-r-teal-600 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
            {/* Clean 3-Mode View Switcher Bar (Zero Redundant 50% Preset) */}
            <div className="hidden lg:flex items-center justify-between px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                <span>{lang === 'ar' ? 'وضع العرض النشط:' : 'Active View Mode:'}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('split')}
                  className={`px-2.5 py-0.5 rounded font-extrabold transition-colors cursor-pointer ${
                    desktopLayoutMode === 'split'
                      ? 'bg-slate-900 text-teal-400'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {lang === 'ar' ? 'تقسيم الشاشة' : 'Split View'}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('input')}
                  className={`px-2.5 py-0.5 rounded font-extrabold transition-colors cursor-pointer ${
                    desktopLayoutMode === 'input'
                      ? 'bg-slate-900 text-teal-400'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {lang === 'ar' ? 'البيانات' : 'Data Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopLayoutMode('preview')}
                  className={`px-2.5 py-0.5 rounded font-extrabold transition-colors cursor-pointer ${
                    desktopLayoutMode === 'preview'
                      ? 'bg-slate-900 text-teal-400'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {lang === 'ar' ? 'الفاتورة' : 'Preview Only'}
                </button>
              </div>
            </div>

            {/* 4-Tab Navigation Header */}
            <div className="p-2 lg:p-2.5 bg-slate-50 border-b border-slate-200 shrink-0 w-full max-w-full">
              <div
                className={`grid grid-cols-4 w-full gap-1.5 ${
                  desktopLayoutMode === 'input' ? 'max-w-5xl mx-auto' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleNavigateToTab('editor')}
                  className={`min-w-0 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'editor'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${activeTab === 'editor' ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span className="truncate">{lang === 'ar' ? 'الفاتورة' : 'Invoice'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateToTab('catalog')}
                  className={`min-w-0 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'catalog'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'catalog' ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span className="truncate">{lang === 'ar' ? 'الأصناف' : 'Catalog'}</span>
                  <span className={`num-tabular text-[10px] px-1.5 py-0.2 rounded-md font-mono ${activeTab === 'catalog' ? 'bg-slate-800 text-teal-300' : 'bg-slate-200/80 text-slate-600'}`}>
                    {catalog.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateToTab('history')}
                  className={`min-w-0 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <History className={`w-3.5 h-3.5 ${activeTab === 'history' ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span className="truncate">{lang === 'ar' ? 'السجل' : 'History'}</span>
                  <span className={`num-tabular text-[10px] px-1.5 py-0.2 rounded-md font-mono ${activeTab === 'history' ? 'bg-slate-800 text-teal-300' : 'bg-slate-200/80 text-slate-600'}`}>
                    {savedInvoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateToTab('settings')}
                  className={`min-w-0 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span className="truncate">{lang === 'ar' ? 'إعدادات المنشأة' : 'Settings'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content */}
            <div className={`flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-3 lg:p-4 ${
              desktopLayoutMode === 'input' ? 'bg-slate-100/70' : ''
            }`}>
              <div
                className={`space-y-5 ${
                  desktopLayoutMode === 'input'
                    ? 'max-w-5xl w-full mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90'
                    : ''
                }`}
              >
                {activeTab === 'settings' && (
                  <CompanySettingsTab
                    seller={seller}
                    onUpdateSeller={(updated) => {
                      setSeller(updated);
                    }}
                    onSave={() => {
                      saveSellerToStorage(seller);
                      showToast(lang === 'ar' ? 'تم حفظ بيانات المنشأة والشعار والنمط بنجاح' : 'Company settings, logo and style saved successfully');
                    }}
                    lang={lang}
                  />
                )}
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
                    onExportExcel={handleExportInvoicesHistory}
                  />
                )}

                {activeTab === 'editor' && (
                  <>
                    {/* Just Issued Celebration & Next Invoice Card */}
                    {justIssuedBanner && invoice.status === 'issued' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            تم حفظ الفاتورة #{invoice.invoiceNumber} في السجل بنجاح (إجمالي المحفوظات: {savedInvoices.length})!
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handlePrintCurrentDocument}
                            className="flex items-center justify-center gap-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs py-1.5 px-3 rounded-md transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-teal-400" />
                            <span>طباعة / تحميل PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartNewSequentialInvoice}
                            className="flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1.5 px-3 rounded-md transition-colors num-tabular"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>فتح فاتورة جديدة</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 2-Column Grid Wrapper when in Full Input Mode or Wide Split Panel */}
                    <div
                      className={
                        desktopLayoutMode === 'input' || panelWidth >= 680
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-5 items-start'
                          : 'space-y-5'
                      }
                    >
                      {/* Section B: Basic Invoice Details (Immediate Entry at Top) */}
                      <section className="space-y-3.5 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <span>{lang === 'ar' ? 'بيانات الفاتورة الأساسية' : 'Basic Invoice Details'}</span>
                          </h2>
                          <button
                            type="button"
                            onClick={() =>
                              updateInvoice({
                                date: getTodayDateString(),
                                time: getCurrentTimeString(),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-teal-700 transition-colors"
                            title={lang === 'ar' ? 'تحديث التاريخ والوقت للحظة الحالية' : 'Update date and time to now'}
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{lang === 'ar' ? 'تحديث الوقت الآن' : 'Update time'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Manual Invoice Number */}
                          <div>
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                              {lang === 'ar' ? 'رقم الفاتورة (إدخال حر)' : 'Invoice Number'}
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="e.g. INV-2026-001"
                              value={invoice.invoiceNumber}
                              onChange={(e) =>
                                updateInvoice({ invoiceNumber: e.target.value })
                              }
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-right num-tabular text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all"
                            />
                          </div>

                          {/* Payment Method */}
                          <div>
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                              {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
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
                                } else {
                                  setDocPrintView('invoice');
                                }
                              }}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all"
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
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                              {lang === 'ar' ? 'التاريخ (YYYY/MM/DD)' : 'Date'}
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
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-right num-tabular text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all"
                            />
                          </div>

                          {/* Time (12-Hour Format Display + Picker) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11.5px] font-semibold text-slate-700">
                                {lang === 'ar' ? 'الوقت' : 'Time'}
                              </label>
                              <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 num-tabular">
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
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-right num-tabular text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all"
                            />
                          </div>

                          {/* Items Count (Auto + Manual Override) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11.5px] font-semibold text-slate-700">
                                {lang === 'ar' ? 'عدد الأصناف' : 'Items Count'}
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
                                className="text-[10.5px] font-semibold text-teal-700 hover:underline"
                              >
                                {invoice.itemsCountManual === null
                                  ? (lang === 'ar' ? 'تعديل يدوي' : 'Manual')
                                  : (lang === 'ar' ? 'تلقائي' : 'Auto')}
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
                              className={`w-full rounded-md border px-3 py-2 text-xs font-bold num-tabular outline-none ${
                                invoice.itemsCountManual === null
                                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                                  : 'bg-white border-teal-500 text-slate-900'
                              }`}
                            />
                          </div>

                          {/* Page Number (Auto + Manual Override - 15 items/page) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11.5px] font-semibold text-slate-700">
                                {lang === 'ar' ? 'الصفحات (15 بند/صفحة)' : 'Pages'}
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
                                className="text-[10.5px] font-semibold text-teal-700 hover:underline"
                              >
                                {invoice.pageNumberManual === null
                                  ? (lang === 'ar' ? 'تعديل يدوي' : 'Manual')
                                  : (lang === 'ar' ? 'تلقائي' : 'Auto')}
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
                              className={`w-full rounded-md border px-3 py-2 text-xs font-bold num-tabular outline-none ${
                                invoice.pageNumberManual === null
                                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                                  : 'bg-white border-teal-500 text-slate-900'
                              }`}
                            />
                          </div>

                          {/* Compact QR Code Selector inside Section B */}
                          <div className="col-span-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11.5px] font-semibold text-slate-700 flex items-center gap-1.5">
                                <QrCode className="w-3.5 h-3.5 text-teal-600" />
                                <span>{lang === 'ar' ? 'معيار رمز الاستجابة (QR Standard)' : 'QR Code Standard'}</span>
                              </label>
                              {invoice.qrMode === 'zatca' ? (
                                <button
                                  type="button"
                                  onClick={() => setShowZatcaInspector((prev) => !prev)}
                                  className="text-[10.5px] font-semibold text-teal-700 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <span>{lang === 'ar' ? 'فحص وسوم TLV' : 'Inspect TLV'}</span>
                                  {showZatcaInspector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleCopyShareUrl}
                                  className="text-[10.5px] font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                                >
                                  {copiedClientLink ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700">{lang === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>{lang === 'ar' ? 'نسخ رابط الفاتورة للعميل' : 'Copy link'}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() => updateInvoice({ qrMode: 'web' })}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  invoice.qrMode !== 'zatca'
                                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                                <span>{lang === 'ar' ? 'رابط PDF للعميل (الافتراضي)' : 'Web Viewer Link'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => updateInvoice({ qrMode: 'zatca' })}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  invoice.qrMode === 'zatca'
                                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{lang === 'ar' ? 'تشفير ZATCA TLV Base64' : 'ZATCA TLV Base64'}</span>
                              </button>
                            </div>

                            {showZatcaInspector && invoice.qrMode === 'zatca' && (
                              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1 text-[11px]">
                                <div className="font-bold text-slate-700 border-b border-slate-200 pb-1 flex items-center justify-between">
                                  <span>وسوم ZATCA الحية (UTF-8 TLV):</span>
                                  <span dir="ltr" className="num-tabular text-[10px] text-slate-400">
                                    {zatcaBase64.length} chars Base64
                                  </span>
                                </div>
                                {decodedZatcaTags.map((t) => (
                                  <div
                                    key={t.tag}
                                    className="flex items-center justify-between gap-2 text-[10.5px] py-0.5 border-b border-slate-100 last:border-none"
                                  >
                                    <span className="text-slate-500 font-medium shrink-0">
                                      [{t.tag}] {t.label} ({t.byteLength}B)
                                    </span>
                                    <span dir="auto" className="font-bold text-slate-900 num-tabular truncate max-w-[190px]">
                                      {t.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Section C: Client Details & Saved Directory */}
                      <section className="space-y-3 bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-teal-600" />
                            <span>بيانات العميل ودفتر العملاء</span>
                          </h2>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={handleSaveCurrentClient}
                              className="font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shadow-2xs"
                              title="حفظ بيانات العميل الحالية في دفتر العملاء للاستخدام لاحقاً"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              <span>حفظ في الدفتر</span>
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={handleClearClient}
                              className="font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                              title="تفريغ جميع خانات العميل"
                            >
                              تفريغ
                            </button>
                          </div>
                        </div>

                        {/* Quick Select Saved Client Dropdown */}
                        <div className="bg-slate-50/80 rounded-lg border border-slate-200 p-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-teal-600" />
                              <span>دفتر العملاء المحفوظين ({savedClients.length}):</span>
                            </span>
                            {selectedSavedClientId && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSavedClient(selectedSavedClientId)
                                }
                                className="text-rose-500 hover:text-rose-700 text-[10.5px] flex items-center gap-0.5 cursor-pointer font-semibold"
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
                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-2 py-1.5 outline-none cursor-pointer focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none"
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
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-right num-tabular focus:border-teal-600 outline-none"
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
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-right num-tabular focus:border-teal-600 outline-none"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-teal-600 outline-none"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-teal-600 outline-none"
                            />
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Section D: Dynamic Line Items + Full Invoice Excel Export + Append/Replace Excel Import */}
                    <section className="space-y-3">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Database className="w-4 h-4 text-teal-600" />
                            <span>
                              بنود الفاتورة ({invoice.items.length} بند —{' '}
                              {totalPages} {totalPages === 1 ? 'صفحة' : 'صفحات'})
                            </span>
                          </h2>

                          <button
                            type="button"
                            onClick={() => downloadInvoiceItemsTemplate()}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
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
                          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          title="يصدّر كافة الأصناف الموجودة في الفاتورة الحالية عبر جميع الصفحات (6 أعمدة + ملخص الضريبة والإجمالي)"
                        >
                          <Download className="w-4 h-4 text-teal-400" />
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
                            className="flex items-center justify-center gap-1.5 text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
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
                            className="flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                            title="استبدال البنود الحالية ببنود شيت الإكسل الجديد"
                          >
                            <Upload className="w-3.5 h-3.5 text-teal-600" />
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
                        className="w-full py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-teal-600 hover:bg-teal-50/20 text-xs font-bold text-slate-700 hover:text-teal-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-teal-600" />
                        <span>إضافة بند جديد إلى الفاتورة</span>
                      </button>
                    </section>

                    {/* Section E: Financial Summary, Editable VAT %, Flexible Discount, Paid Amount & Tafqeet */}
                    <section className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-2xs">
                      <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <span>
                          الحسابات الختامية ونسبة الضريبة والخصم المرن
                        </span>
                      </h2>

                      {/* Flexible Discount & Editable VAT % Controls */}
                      <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-2.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11.5px] font-bold text-slate-700 flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5 text-teal-600" />
                            <span>الخصم ونسبة الضريبة المضافة</span>
                          </label>
                          <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                updateInvoice({ discountType: 'amount' })
                              }
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                invoice.discountType !== 'percentage'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              خصم مبلغ (ر.س)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateInvoice({ discountType: 'percentage' })
                              }
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                invoice.discountType === 'percentage'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-teal-600 outline-none"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-teal-600 outline-none"
                            />
                          </div>

                          {/* Editable VAT Rate (%) */}
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular text-slate-900 focus:border-teal-600 outline-none"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-right num-tabular focus:border-teal-600 outline-none"
                            />
                          </div>
                        </div>

                        {totals.totalDiscount > 0 && (
                          <div className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200/80 rounded-lg px-2.5 py-1 flex items-center justify-between num-tabular">
                            <span>{lang === 'ar' ? 'إجمالي الخصم المقتطع قبل الضريبة:' : 'Total Discount before Tax:'}</span>
                            <span>{formatMoney(totals.totalDiscount)} {currencySymbol}</span>
                          </div>
                        )}
                      </div>

                      {/* Calculated Live Summary Box */}
                      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-slate-600 font-semibold">
                            {lang === 'ar' ? 'الإجمالي قبل الضريبة:' : 'Subtotal before Tax:'}
                          </span>
                          <span className="num-tabular font-bold text-slate-900">
                            {formatMoney(totals.subtotal)} {currencySymbol}
                          </span>
                        </div>
                        {totals.totalDiscount > 0 && (
                          <div className="px-3 py-2 flex justify-between bg-slate-50">
                            <span className="text-slate-700 font-semibold">
                              {lang === 'ar' ? 'الصافي الخاضع للضريبة (بعد الخصم):' : 'Taxable Net (after Discount):'}
                            </span>
                            <span className="num-tabular font-bold text-slate-900">
                              {formatMoney(totals.taxableAmount)} {currencySymbol}
                            </span>
                          </div>
                        )}
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-slate-600 font-semibold">
                            {lang === 'ar' ? marketConfig.taxShortLabelAr : marketConfig.taxShortLabelEn} ({totals.vatRate}%):
                          </span>
                          <span className="num-tabular font-bold text-slate-900">
                            {formatMoney(totals.vatAmount)} {currencySymbol}
                          </span>
                        </div>
                        {totals.withholdingTaxAmount !== undefined && totals.withholdingTaxAmount > 0 && (
                          <div className="px-3 py-2 flex justify-between bg-rose-50/60 text-rose-700">
                            <span className="font-semibold">
                              {lang === 'ar' ? `خصم أرباح تجارية (خصم من المنبع ${totals.withholdingTaxRate}%):` : `Withholding Tax Deduction (${totals.withholdingTaxRate}%):`}
                            </span>
                            <span className="num-tabular font-bold">
                              - {formatMoney(totals.withholdingTaxAmount)} {currencySymbol}
                            </span>
                          </div>
                        )}
                        {totals.isReverseCharge && (
                          <div className="px-3 py-1.5 bg-sky-50 text-sky-800 text-[10.5px] font-bold border-t border-sky-100 flex items-center justify-between">
                            <span>{lang === 'ar' ? 'تكليف عكسي (EU Reverse Charge - Art. 196)' : 'B2B Reverse Charge - Art. 196'}</span>
                            <span className="bg-sky-200/80 text-sky-900 px-1.5 py-0.5 rounded font-mono">0% VAT</span>
                          </div>
                        )}
                        <div className="px-3 py-2.5 flex justify-between bg-slate-900 text-white rounded-b-lg">
                          <span className="font-bold">
                            {lang === 'ar' ? 'صافي مبلغ الفاتورة:' : 'Total Invoice Amount:'}
                          </span>
                          <span className="num-tabular font-black text-emerald-400 text-sm">
                            {formatMoney(totals.finalTotal)} {currencySymbol}
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
                            className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                          >
                            {invoice.tafqeetManual === null
                              ? 'تعديل المبلغ بالحروف يدوياً'
                              : 'إعادة للوضع التلقائي'}
                          </button>
                        </div>

                        {invoice.tafqeetManual === null ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 leading-relaxed">
                            {autoTafqeet}
                          </div>
                        ) : (
                          <textarea
                            rows={2}
                            value={invoice.tafqeetManual}
                            onChange={(e) =>
                              updateInvoice({ tafqeetManual: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-teal-600"
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
                        className="w-full py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4 text-white" />
                        <span>حفظ وإصدار الفاتورة في السجل ({seller.arabicName})</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handlePrintCurrentDocument}
                          className="py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-teal-400" />
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
                          className="py-2.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors num-tabular cursor-pointer shadow-2xs"
                        >
                          <FilePlus2 className="w-3.5 h-3.5 text-teal-600" />
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
                  ? 'bg-teal-600'
                  : 'bg-slate-300/70 hover:bg-teal-600/50 active:bg-teal-600'
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
            {/* Row 2: Sub-Header above the Preview Pane (Right: SaaS Brand & Style Switcher | Left/Center: Pagination + Zoom) */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Right: SaaS Organization & Template Style Badges + Company Settings Button */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  <div
                    className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                    style={{ backgroundColor: seller.primaryColor || '#0F172A' }}
                  />
                  <span className="text-[11px] font-black text-slate-800 truncate max-w-[150px]">
                    {seller.arabicName || 'منصة InvoCore'}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {TEMPLATE_STYLES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleQuickTemplateChange(t.id)}
                      className={`px-2 py-1 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                        (seller.templateStyle || 'modern') === t.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateToTab('settings')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
                  title={lang === 'ar' ? 'تعديل الهوية وإعدادات المنشأة' : 'Company & Tax Settings'}
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>{lang === 'ar' ? 'إعدادات المنشأة والضريبة' : 'Company & Tax Settings'}</span>
                </button>

                {desktopLayoutMode === 'preview' && (
                  <button
                    type="button"
                    onClick={() => setDesktopLayoutMode('split')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs transition-all cursor-pointer shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span>{lang === 'ar' ? 'إظهار لوحة الإدخال' : 'Show Data Panel'}</span>
                  </button>
                )}
              </div>

              {/* Left/Center: Page Navigation (السابق | صفحة X من Y | التالي) + Zoom Controls (100% | ملائمة) */}
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
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:pointer-events-none shadow-2xs transition-colors cursor-pointer"
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
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:pointer-events-none shadow-2xs transition-colors cursor-pointer"
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
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-800 hover:bg-slate-100 shadow-2xs'
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
            </div>

            {/* Main Scrollable Content: Live A4 Preview */}
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
                    <UniversalInvoice
                      invoice={invoice}
                      seller={seller}
                      activePage={currentPage}
                      viewMode={previewViewMode}
                      renderAllPages={false}
                      isWatermarked={isWatermarked}
                      lang={lang}
                    />
                  )}

                  {(effectiveDocPrintView === 'receipt' ||
                    effectiveDocPrintView === 'both') && (
                    <ReceiptVoucherA4Sheet
                      invoice={invoice}
                      seller={seller}
                      isWatermarked={isWatermarked}
                      lang={lang}
                    />
                  )}
                </div>
              </div>

              {/* Floating Bottom Pagination Bar when invoice has multiple pages */}
              {effectiveDocPrintView !== 'receipt' && totalPages > 1 && (
                <div className="mt-6 sticky bottom-3 z-20 bg-slate-900/95 text-white border border-slate-700 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-3 backdrop-blur-md">
                  <button
                    type="button"
                    disabled={previewViewMode === 'all' || currentPage <= 1}
                    onClick={() => {
                      setPreviewViewMode('single');
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
                    <span>السابق</span>
                  </button>

                  <span className="text-xs font-bold text-slate-200 num-tabular">
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
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-teal-400" />
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>

        {shareModal && (
          <ShareInvoiceModal
            message={shareModal.message}
            url={shareModal.url}
            onClose={() => setShareModal(null)}
          />
        )}

        {/* Multi-Tenant SaaS Company Settings Modal */}
        {isSellerModalOpen && (
          <SellerSettingsModal
            seller={seller}
            onUpdateSeller={(updated: SellerInfo) => setSeller(updated)}
            onSave={() => {
              saveSellerToStorage(seller);
              showToast(lang === 'ar' ? 'تم حفظ إعدادات وهوية المنشأة بنجاح' : 'Company settings saved successfully');
            }}
            onClose={() => setIsSellerModalOpen(false)}
            lang={lang}
          />
        )}

        {/* First-Time Setup & Onboarding Wizard */}
        {isOnboardingOpen && (
          <OnboardingModal
            initialSeller={seller}
            onClose={() => setIsOnboardingOpen(false)}
            onComplete={(configured) => {
              setSeller(configured);
              saveSellerToStorage(configured);
              setOnboardingCompleted(true);
              setIsOnboardingOpen(false);
              showToast(`مرحبًا بك! تم حفظ هوية "${configured.arabicName}" بنجاح`);
            }}
          />
        )}

        {/* Supabase Authentication Portal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          onContinueAsGuest={handleContinueAsGuest}
        />

        {/* Commercial Trial Limit & White-Label Showcase Modal */}
        <TrialLimitModal
          isOpen={isTrialLimitModalOpen}
          onClose={() => setIsTrialLimitModalOpen(false)}
          invoicesGenerated={invoicesGenerated}
          maxInvoices={maxTrialInvoices}
          userEmail={currentUser?.email || undefined}
          lang={lang}
          prospectName={prospectCompanyName}
        />

        {/* Founder 1-Click Prospect Demo Link Generator Modal */}
        <ProspectLinkGenerator
          isOpen={isProspectGeneratorOpen}
          onClose={() => setIsProspectGeneratorOpen(false)}
          lang={lang}
          onApplyLocally={(cfg) => {
            setProspectCompanyName(cfg.prospect);
            setIsProspectBannerDismissed(false);
            setLang(cfg.lang);
            setSeller((prev) => ({
              ...prev,
              arabicName: cfg.prospect,
              englishName: cfg.prospect,
              jurisdiction: cfg.market,
              templateStyle: cfg.template,
              primaryColor: cfg.color,
            }));
            const mCfg = getMarketConfig(cfg.market);
            setInvoice((prev) => ({
              ...prev,
              jurisdiction: cfg.market,
              vatRate: mCfg.defaultVatRate,
            }));
            showToast(
              cfg.lang === 'ar'
                ? `تم تفعيل المعاينة المخصصة لـ "${cfg.prospect}"`
                : `Activated live custom preview for "${cfg.prospect}"`
            );
          }}
        />

        {/* Global SaaS Platform Footer */}
        <footer className="no-print bg-[#0F172A] border-t border-slate-800 text-slate-400 text-xs py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 z-20">
          <div className="flex items-center gap-2 font-medium flex-wrap">
            <span className="font-extrabold text-white">InvoCore</span>
            <span className="text-slate-600">|</span>
            <span>
              {lang === 'ar'
                ? 'منصة الفوترة الإلكترونية الذكية للمنشآت (B2B)'
                : 'Smart B2B E-Invoicing & Receipt Voucher Platform'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsProspectGeneratorOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-teal-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              title="Outreach Link Builder (Shift + Alt + D)"
            >
              <Link2 className="w-3 h-3 text-teal-400" />
              <span>
                {lang === 'ar'
                  ? 'مولد روابط العملاء'
                  : 'Outreach Link Builder'}
              </span>
            </button>

            <div className="text-slate-400 font-mono text-[11px]" dir="ltr">
              © 2026 InvoCore. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* Dedicated Top-Level Print Mount (Renders Selected Document(s) Sequentially on Print) */}
      <div className="hidden print:block">
        {(effectiveDocPrintView === 'invoice' ||
          effectiveDocPrintView === 'both') && (
          <UniversalInvoice
            invoice={invoice}
            seller={seller}
            renderAllPages={true}
            isWatermarked={isWatermarked}
            lang={lang}
          />
        )}
        {(effectiveDocPrintView === 'receipt' ||
          effectiveDocPrintView === 'both') && (
          <ReceiptVoucherA4Sheet
            invoice={invoice}
            seller={seller}
            isWatermarked={isWatermarked}
            lang={lang}
          />
        )}
      </div>
    </>
  );
}

export default App;
