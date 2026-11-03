# Comprehensive QA Test Execution & Self-Healing Report

**Project:** منصة صقر للفوترة الإلكترونية الموحدة (Saqr E-Invoicing Hub)  
**Target Environment:** Production (`https://saqr-invoice.vercel.app`) & Local Headless Engine  
**Execution Date:** 2026-11-02  
**Test Frameworks:** Puppeteer Headless Engine + Java 17 / Selenium WebDriver 4.x / TestNG  

---

## 📋 Executive Summary

| Category | Total Tests | Passed | Failed | Success Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Clean Blank-Slate Startup State** | 1 | 1 | 0 | **100%** |
| **Saved Clients Directory & Auto-Fill** | 1 | 1 | 0 | **100%** |
| **Viewport & Mobile Responsiveness** | 3 | 3 | 0 | **100%** |
| **Calculation & Boundary Edge Cases** | 2 | 2 | 0 | **100%** |
| **Heavy Stress Test (135 Items / 9 Pages)** | 3 | 3 | 0 | **100%** |
| **Company-Specific Receipt Vouchers & Bank IBANs** | 1 | 1 | 0 | **100%** |
| **QR Code Lossless Round-Trip** | 1 | 1 | 0 | **100%** |
| **Console & Runtime Diagnostics** | 1 | 1 | 0 | **100%** |
| **OVERALL TOTAL** | **13** | **13** | **0** | **100%** |

---

## 🔍 Detailed Test Cases & Execution Results

### 1. Clean Blank-Slate Default State Verification
- **App Load Behavior:** When the user opens the platform or clears storage, all client fields (`clientName`, `clientTaxNumber`, `clientPhone`, `clientAddress`, `clientNotes`) strictly default to empty strings `""`.
- **Line Items:** Starts with **1 clean blank item row** (`description: ""`, `unit: "وحدة"`, `qty: 1`, `unitPrice: 0`) rather than dummy sample items.
- **Template Sanitation:** Verified across all 8 company templates that hardcoded sample strings (e.g. `'Engr : Muquair Ali'`, `'3190'`, `'23524'`, `'EISSA ABDULLAH'`) have been removed; templates cleanly display `'—'` or dynamic data.  
  *Result:* **PASS** (Zero dummy client data or leftover sample items).

### 2. Saved Clients Directory ("دفتر العملاء المحفوظين")
- **Pre-seeded Directory (`saqr_clients`):** Pre-seeded with 4 recognized corporate contracting clients:
  1. `شركة إنترناشونال بيلدينجز للمقاولات` (Tax: `314237681800003`, Jeddah)
  2. `شركة برافو للمقاولات - ذات مسؤولية محدودة` (Tax: `311234567800003`, Riyadh)
  3. `شركة زاد الكريم للمقاولات` (Tax: `312071841900003`, Yanbu)
  4. `مؤسسة الدولي الراقية للمقاولات` (Tax: `310456789000003`, Jeddah)
- **1-Click Auto-Fill:** Selecting any client from the directory instantly populates name, tax ID, phone, address, and notes.
- **Directory Actions:** Tested `+ حفظ في الدفتر` (saves or updates current client in localStorage), `تفريغ` (resets all client fields to empty), and `حذف من الدفتر`.  
  *Result:* **PASS**

### 3. Viewport & Mobile Responsiveness (Zero Overflow Guarantee)
- **Android Viewport (`360x800`):** `clientWidth = 360`, `scrollWidth = 360`. Verified **ZERO** horizontal overflow.  
  *Result:* **PASS**
- **iPhone Viewport (`390x844`):** `clientWidth = 390`, `scrollWidth = 390`. Verified **ZERO** horizontal overflow.  
  *Result:* **PASS**
- **Desktop Viewport (`1440x900`):** Split-view control panel and live A4 preview side-by-side with scalable zoom controls.  
  *Result:* **PASS**

### 4. Boundary, Empty & Negative Calculation Edge Cases
- **Empty Client & Item Fields:** Form handles completely empty fields gracefully without runtime errors or blank white screen crashes.
- **Negative & Zero Values:** Clamped with `Math.max(0, val)` to guarantee quantities, unit prices, and discounts cannot corrupt financial totals.
- **Excess Discount Clamping:** When discount exceeds subtotal, total discount clamps to subtotal, leaving taxable amount and VAT at `0.00 SAR` (never negative).  
  *Result:* **PASS**

### 5. Heavy Multi-Page Stress Test (135 Items across 9 Pages)
- **135 Real Items Injected:** Automatically partitioned into **9 discrete A4 pages** (15 items per page).
- **Continuation Footers & Headers:** Pages 1 through 8 display the continuation footer:  
  `"يتبع في الصفحة التالية (X من 9) — الإجماليات الضريبية في الصفحة الأخيرة"`  
  Page 9 cleanly renders items 121–135 followed by the full financial summary, VAT breakdown, Tafqeet in Arabic words, and ZATCA QR code.
- **Page Navigation:** Tested navigation from `صفحة 1 من 9` to `صفحة 2 من 9` via both the top toolbar and bottom floating pagination bar.
- **8-Company Template Switch Under Heavy Load:** Sequentially switched across all 8 company templates with 135 items loaded:
  1. `wjdcom` (Template 1)
  2. `kayanat` (Template 2)
  3. `sharek-aldaem` (Template 3)
  4. `al-muzaini` (Template 4)
  5. `al-monathem` (Template 5)
  6. `al-sindan` (Template 6)
  7. `autad-alsarh` (Template 7)
  8. `saqr-alarouba` (Template 8)  
  *Result:* **PASS** (Zero item drops, zero DOM crashes, memory usage remained stable).

### 6. Company-Specific Receipt Vouchers ("سند قبض") & Bank IBANs
- **Tailored Branding for All 8 Companies:** Each company features its authentic `CompanyLogoSvg`, brand palette, borders, and typography.
- **Bank Account & IBAN Details:**
  - `sharek-aldaem`: SNB BANK / IBAN `SA59 1000 0001 4000 0621 4209`
  - `al-monathem`: مصرف الإنماء / IBAN `SA 6005000068204939809000`
  - `autad-alsarh`: الأهلي SNB / IBAN `SA 64100000 01400031337701`
- **Visibility Condition:** Strictly displayed only when payment method is `آجل` (deferred).  
  *Result:* **PASS**

### 7. Lossless QR Code Round-Trip Decoding
- Generated compressed URL payload for multi-page invoices with corporate client metadata.
- Decoded and rendered directly on the public client viewer without truncation or data collapse.  
  *Result:* **PASS**

### 8. Zero Console / Runtime Errors
- Monitored browser console and page error streams across all 13 test suites: **0 errors recorded**.  
  *Result:* **PASS**

---

## 📸 Captured Visual Evidence Artifacts

The following high-resolution screenshots were generated during the live headless browser run:
- `qa-e2e/screenshots/stress-test-135-items-10-pages.png` (9-page stress test preview)
- `qa-e2e/screenshots/receipt-voucher-wjdcom.png` (Wjdcom Co. Ltd receipt voucher)
- `qa-e2e/screenshots/receipt-voucher-sharek.png` (Sharek Al-Daem receipt voucher with SNB Bank IBAN)
- `qa-e2e/screenshots/receipt-voucher-autad.png` (Autad Al-Sarh receipt voucher with SNB Bank IBAN)
- `qa-e2e/screenshots/viewport-android.png` (Android 360x800 zero overflow)
- `qa-e2e/screenshots/viewport-iphone.png` (iPhone 390x844 zero overflow)
- `qa-e2e/screenshots/viewport-desktop.png` (Desktop 1440x900 full layout)
- `qa-e2e/screenshots/public-client-view-scanned.png` (Lossless QR client viewer)
