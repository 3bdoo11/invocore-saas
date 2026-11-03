# Saqr E-Invoicing Hub — Automated QA Selenium Suite

Enterprise-grade Test Automation Suite built with **Java 17+**, **Selenium WebDriver 4.x**, **TestNG**, **WebDriverManager**, and **Apache POI**.

This suite validates the live production platform ([https://saqr-invoice.vercel.app](https://saqr-invoice.vercel.app)) across desktop and mobile viewports, multi-company templates, financial edge cases, and QR code round-trip decoding.

---

## 🏛 Framework Architecture (Page Object Model)

```
qa-automation-selenium/
├── pom.xml                                 # Maven dependencies (Selenium 4, TestNG, WDM, POI)
├── src/test/java/
│   ├── base/
│   │   └── BaseTest.java                   # Lifecycle setup/teardown, screenshots, viewports, overflow
│   ├── pages/
│   │   ├── InvoiceWorkspacePage.java       # POM: Company switching, Line Items, Discounts, WhatsApp
│   │   ├── CatalogAndHistoryPage.java      # POM: Catalog Excel Import/Export, History verification
│   │   └── PublicClientViewPage.java       # POM: Scanned QR client landing page verification
│   └── tests/
│       ├── ResponsiveLayoutTest.java       # Mobile (360x800, 390x844) & Desktop (1440x900) overflow
│       ├── InvoiceCalculationAndEdgeCasesTest.java # Boundary values, empty inputs, Tafqeet
│       ├── MultiCompanyAndPaginationTest.java      # 19 items across 2 pages & 8 companies
│       └── QrCodeAndReceiptVoucherTest.java        # آجل Receipt voucher toggle & QR URL verification
├── src/test/resources/
│   └── testng.xml                          # TestNG suite runner configuration
├── screenshots/                            # Auto-captured screenshots on pass and fail
└── README.md
```

---

## 🚀 Prerequisites

1. **Java JDK 17+** (JDK 17, 21, or 25 installed)
2. **Apache Maven 3.8+**
3. **Google Chrome** installed on the test machine

---

## 🛠 Running the Tests

### 1. Run Complete Test Suite (Headless Mode - Default)
```bash
cd qa-automation-selenium
mvn clean test
```

### 2. Run in Headed Mode (Visual Browser Execution)
```bash
mvn clean test -Dheadless=false
```

### 3. Run Against a Specific URL (e.g., Local Preview or Staging)
```bash
mvn clean test -Dapp.url="http://localhost:4173"
```

### 4. Run a Specific Test Class
```bash
# Run only Mobile Responsiveness Tests
mvn test -Dtest=ResponsiveLayoutTest

# Run only Calculation & Edge Case Tests
mvn test -Dtest=InvoiceCalculationAndEdgeCasesTest

# Run only 8-Company Switching & Multi-Page Pagination Tests
mvn test -Dtest=MultiCompanyAndPaginationTest

# Run only Receipt Voucher & QR Round-Trip Tests
mvn test -Dtest=QrCodeAndReceiptVoucherTest
```

---

## 📊 Test Reports & Screenshots

- **TestNG HTML Report:** `target/surefire-reports/index.html`
- **Emailable Report:** `target/surefire-reports/emailable-report.html`
- **Screenshots:** Automatically stored in `qa-automation-selenium/screenshots/` with timestamped filenames for pass/fail audits.
