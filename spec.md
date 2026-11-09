# InvoCore B2B SaaS — Interactive UX, Draft Persistence & Conversion Engine Specification (`spec.md`)

## 1. Problem Statement & Core Motivation
During live user testing of the **InvoCore** B2B E-Invoicing & Receipt Voucher SaaS platform, five critical UX and state-management issues were identified:
1. **Data Loss on Page Reload & Logo Click Behavior:** Typing invoice/voucher data and refreshing the browser (or clicking the brand logo) resets the invoice form to a blank template because active draft state is not continuously persisted to `localStorage` (`invocore_active_draft`).
2. **View Mode Layout Flashing & Unresponsive Navigation Tabs:**
   - The redundant `"واسع 50% / 50% Preview"` width preset conflicts with `"تقسيم الشاشة / Split View"`, causing jarring width jumps.
   - When the user is in `"الفاتورة / Preview Only"` mode (or when switching between view modes), clicking `"إعدادات المنشأة / Company Settings"` or the `"KSA • SAR 15%"` jurisdiction badge in the top navbar updates `activeTab` in state while leaving the sidebar hidden (`desktopLayoutMode === 'preview'`), making the buttons appear completely dead.
3. **Hidden Prospect Outreach Link Builder:** The `"مولد روابط العملاء / Outreach Link Builder"` button is tucked away in the bottom footer instead of being prominently accessible in the Top Navigation Bar.
4. **Silent/Dead Action Buttons in the Upgrade & White-Label Showcase Modal:**
   - Relying solely on `mailto:` or programmatic `window.open` without inline interactive feedback causes buttons (`Request White-Label Quote`, `Activate Pro Cloud Account`, `Official Email`) to fail silently when a desktop mail client is unconfigured or when popup policies intervene.
5. **Undersized QR Codes on Printable A4 Documents:** The verification QR codes across the 3 templates (`Modern`, `Classic`, `Minimalist`) for both Invoices and Receipt Vouchers are currently `48px–64px`, which is too small for fast optical scanning on printed A4 paper or desktop screens.

---

## 2. Non-Goals & Boundaries
- **No Breaking Changes to Public Share URLs (`/v/Z...`):** Existing compressed public invoice URLs and ZATCA TLV Base64 payloads remain 100% backward-compatible.
- **No Removal of Automated QA Hooks:** Window test helpers (`__invocoreSetInvoice`, `__invocoreSetSeller`, etc.) and clean blank-slate startup behavior when no draft has been modified must remain intact for E2E test suites.
- **Zero Credential Exposure:** No private keys or personal access tokens (`sbp_`) may ever be stored in client code or `spec.md`.

---

## 3. Proposed Architecture & Data Flow

### 3.1 Active Draft Auto-Save & Logo Click Reload (`invocore_active_draft`)
- **Storage Key:** `invocore_active_draft` in `localStorage`.
- **Payload Schema (`ActiveDraftData`):**
  ```ts
  interface ActiveDraftData {
    invoice: InvoiceData;
    docPrintView: DocumentPrintView;
    activeTab: AdminTab;
    updatedAt: number;
  }
  ```
- **Auto-Save Hook:** On every change to `invoice` or `docPrintView`, serialize and save to `localStorage.setItem('invocore_active_draft', JSON.stringify(...))` wrapped in a safe `try / catch`. Seller settings (`seller`) and language (`lang`) continue to auto-save to `STORAGE_KEYS.SELLER_INFO` and `invocore_lang` on every change.
- **Restore on Initial Load:**
  - When initializing `invoice`, `docPrintView`, and `activeTab` in `App.tsx`, check `loadActiveDraftFromStorage()`.
  - If a valid saved draft exists, restore it automatically.
  - If URL Prospect Personalization query parameters (`?prospect=...&market=...&lang=...&template=...&color=...`) are present in `window.location.search`, overlay those parameters onto both `seller` and the restored `invoice` (`jurisdiction`, `vatRate`) so prospect demo links always take immediate visual effect.
- **Clear Only on Explicit "New Invoice":**
  - Clicking `"فاتورة جديدة / + New Invoice"` creates a fresh sequential invoice (`createFreshBlankInvoice`) and overwrites `invocore_active_draft` with the clean blank state.
- **Navbar Brand Logo Click (`handleBrandLogoClick`):**
  - Synchronously saves the current draft (`saveActiveDraftToStorage(invoice, 'invoice', 'editor')`) and seller state (`saveSellerToStorage(seller)`), sets `invocore_desktop_layout_mode` to `'split'`, and calls `window.location.reload()`.

### 3.2 Unified View Mode Switcher & Guaranteed Tab Navigation
- **Three Canonical Desktop View Modes (`DesktopLayoutMode`):**
  1. `'split'` (`تقسيم الشاشة / Split View` — `540px` sidebar + live A4 preview).
  2. `'input'` (`البيانات / Data Entry` — full-width centered container `max-w-5xl mx-auto` supporting all 4 tabs: `الفاتورة`, `الأصناف`, `السجل`, `إعدادات المنشأة`).
  3. `'preview'` (`الفاتورة / Preview Only` — full-width centered A4 document preview).
- **Eliminate Redundant `50%` Preset Bar:** Remove the secondary width-preset bar (`قياسي 540px | واسع 50% | ملء الشاشة`) that caused layout flashing and conflicted with the primary 3-mode switcher.
- **Universal Tab Navigation Helper (`handleNavigateToTab(tab: AdminTab)`):**
  - Any click on `"الفاتورة / Invoice"`, `"الأصناف / Catalog"`, `"السجل / History"`, `"إعدادات المنشأة / Settings"`, or the top navbar `"KSA • SAR 15%"` jurisdiction button calls `handleNavigateToTab(tab)`.
  - `handleNavigateToTab(tab)` sets `setActiveTab(tab)` AND:
    - If `desktopLayoutMode === 'preview'`, transitions `setDesktopLayoutMode('split')` so the requested tab is immediately visible.
    - If `mobilePane === 'preview'`, transitions `setMobilePane('controls')`.
  - In addition, add a 4-tab quick bar in the Preview Sub-Header so even while in `"الفاتورة / Preview Only"` mode, clicking any tab smoothly opens it.

### 3.3 Top Navbar "Prospect Link Builder" Button
- Place a prominent button right inside the Top Bar (Row 0 Action Pod) and Main Header:
  - Label: `"مولد روابط العملاء"` (`lang === 'ar'`) / `"Prospect Link"` (`lang === 'en'`).
  - Icon: `Link2` / `Sparkles`.
  - Action: `onClick={() => setIsProspectGeneratorOpen(true)}`.

### 3.4 Fail-Safe Interactive Actions in `TrialLimitModal.tsx`
- **Inline Quick Order / Activation Drawer (`selectedPlanForOrder: 'pro_cloud' | 'white_label' | null`):**
  - Clicking `"طلب تفعيل حساب Pro Cloud / Activate Pro Cloud Account"` or `"اطلب عرض سعر النسخة الخاصة (White-Label) / Request White-Label Quote"` immediately opens an inline interactive **Order & Activation Confirmation Panel** inside the modal (with pre-filled Company Name, Contact Phone/Email input, 1-click WhatsApp launch, and 1-click Copy Order Summary) AND opens the pre-filled WhatsApp chat in a new tab.
- **Fail-Safe Official Email Button (`handleContactEmail`):**
  - Copies `abdallahmohamedama12@gmail.com` to `navigator.clipboard` immediately.
  - Displays a prominent green confirmation banner/toast inside the modal (`"تم نسخ البريد الإلكتروني الرسمي: abdallahmohamedama12@gmail.com"` / `"Copied official email: abdallahmohamedama12@gmail.com"`).
  - Provides a direct `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=abdallahmohamedama12@gmail.com&su=..." target="_blank">` fallback alongside `mailto:` so desktop users without Outlook/Mail.app never experience a dead button.
- **Semantic Anchor Tags (`<a target="_blank" rel="noopener noreferrer">`) for External Links:**
  - Wrap Direct WhatsApp (`https://wa.me/201062075574?text=...`) and Developer Portfolio (`https://abdallah-portfolio-the.vercel.app`) in real `<a target="_blank" rel="noopener noreferrer">` elements so browser popup blockers never intercept them.

### 3.5 Enlarged `105px × 105px` QR Codes Across All 6 Document Views
- Update `<SafeQRCode />` in both `src/components/UniversalInvoice.tsx` and `src/components/ReceiptVoucherA4Sheet.tsx` across all 3 templates (`modern`, `classic`, `minimalist`):
  - Set `size={105}` (`105px × 105px`).
  - Wrap inside a crisp container: `p-2 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0`.
  - In Template B (`classic`), adjust the 3-column signature & seal footer height from `h-24` (`96px`) to `min-h-[124px]` so the `105px` QR code fits comfortably inside the bordered box with zero overflow or clipping.

---

## 4. Edge Cases & Failure Modes
1. **Corrupted `invocore_active_draft` JSON in `localStorage`:** `loadActiveDraftFromStorage()` validates that `invoice` and `invoice.items` (non-empty array) exist; otherwise falls back cleanly to `createFreshBlankInvoice()`.
2. **Clipboard API Permission Denied:** If `navigator.clipboard.writeText` fails in an insecure context, fall back to a hidden `<textarea>` `document.execCommand('copy')` and always display the email address selectable on screen.
3. **Classic Template Footer Height with 105px QR Code:** Expanding the QR code from `56px` to `105px` inside a fixed `h-24` (`96px`) container would clip the QR code. Changing the 3 signature boxes in `classic` template to `min-h-[128px] p-2.5` prevents any vertical overflow.

---

## 5. Security & Permission Model
- Draft persistence is scoped strictly to browser `localStorage` (`invocore_active_draft`) and existing authenticated Supabase RLS policies.
- External links strictly enforce `rel="noopener noreferrer"`.

---

## 6. Implementation & Verification Plan
1. **Step 1 (`src/utils/storage.ts`):** Add `loadActiveDraftFromStorage`, `saveActiveDraftToStorage`, and `clearActiveDraftFromStorage`.
2. **Step 2 (`src/App.tsx`):**
   - Wire `invocore_active_draft` restoration and auto-save on change, plus URL `?prospect=` override.
   - Update `handleBrandLogoClick` to save draft, reset tab to `'editor'`, and call `window.location.reload()`.
   - Remove the redundant `50%` width preset bar, add `handleNavigateToTab(tab)` across all navbar/toolbar buttons, and add the prominent `"مولد روابط العملاء / Prospect Link"` button in the top navbar.
3. **Step 3 (`src/components/TrialLimitModal.tsx`):**
   - Add inline interactive Quick Order / Activation view, clipboard copy + toast feedback for Official Email, and native `<a target="_blank" rel="noopener noreferrer">` links for WhatsApp, Email, and Portfolio.
4. **Step 4 (`src/components/UniversalInvoice.tsx` & `src/components/ReceiptVoucherA4Sheet.tsx`):**
   - Enlarge all QR codes to `size={105}` inside `p-2 bg-white border border-slate-200 rounded-lg` and adjust the Classic footer container height.
5. **Step 5 (Automated Browser Verification & Build):**
   - Run `npm run build` and execute Puppeteer E2E browser checks verifying every button, view mode switch, draft reload persistence, prospect URL personalization, and `105px` QR rendering.
