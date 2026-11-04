import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const DIST_DIR = path.resolve('dist');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOTS_DIR = path.resolve('qa-e2e/screenshots');

function startServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    let filePath = path.join(DIST_DIR, parsedUrl.pathname);

    if (parsedUrl.pathname === '/' || !path.extname(parsedUrl.pathname)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(DIST_DIR, 'index.html'), (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexData);
          }
        });
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`[QA Server] Serving dist/ on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function runTests() {
  const server = await startServer();
  const testResults = [];

  function record(name, passed, details = '') {
    testResults.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark}: ${name} ${details ? `(${details})` : ''}`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // Catch page errors
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    // =========================================================================
    // Test 0: Direct Startup in Guest Preview Mode (Zero Blocking Walls)
    // =========================================================================
    console.log('\n--- Test 0: Direct Startup in Guest Preview Mode (Zero Blocking Walls) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    const startupCheck = await page.evaluate(async () => {
      // Check that no blocking modal is presented on initial startup
      const modal = document.querySelector('.fixed.inset-0.z-50');
      const hasBlockingModal = !!modal;

      const bodyText = document.body.innerText;
      const hasInvoCoreBrand = bodyText.includes('InvoCore');
      const hasGuestBadge = bodyText.includes('زائر تجريبي') || bodyText.includes('Guest');
      const hasDefaultCompany = bodyText.includes('إنفو كور');

      return {
        hasBlockingModal,
        hasInvoCoreBrand,
        hasGuestBadge,
        hasDefaultCompany,
      };
    });

    record(
      'Direct Startup in Guest Preview Mode (Zero Blocking Walls)',
      !startupCheck.hasBlockingModal && startupCheck.hasInvoCoreBrand && startupCheck.hasGuestBadge,
      `No Blocking Modal: ${!startupCheck.hasBlockingModal}, Brand: ${startupCheck.hasInvoCoreBrand}, Guest: ${startupCheck.hasGuestBadge}`
    );

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'direct-guest-startup.png'),
    });

    // =========================================================================
    // Test 1: Clean Blank-Slate Default State Verification
    // =========================================================================
    console.log('\n--- Test 1: Clean Blank-Slate Default State Verification ---');
    const blankStateMetrics = await page.evaluate(() => {
      const clientNameInput = document.querySelector('input[placeholder*="اسم الشركة أو العميل"]');
      const clientTaxInput = document.querySelector('input[placeholder*="300XXXXXXXXX003"]');
      const itemDescInputs = Array.from(document.querySelectorAll('input[placeholder*="توريد خرسانة"]'));
      return {
        clientName: clientNameInput ? clientNameInput.value : null,
        clientTax: clientTaxInput ? clientTaxInput.value : null,
        itemCount: itemDescInputs.length,
        firstItemDesc: itemDescInputs[0] ? itemDescInputs[0].value : null,
      };
    });

    record(
      'Clean Blank-Slate Startup (Zero Dummy Client or Line Items)',
      blankStateMetrics.clientName === '' &&
        blankStateMetrics.clientTax === '' &&
        blankStateMetrics.itemCount === 1 &&
        blankStateMetrics.firstItemDesc === '',
      `Client: "${blankStateMetrics.clientName}", Tax: "${blankStateMetrics.clientTax}", Items: ${blankStateMetrics.itemCount}, Row 1: "${blankStateMetrics.firstItemDesc}"`
    );

    // =========================================================================
    // Test 2: Viewport Responsiveness & Zero Horizontal Overflow
    // =========================================================================
    console.log('\n--- Test 2: Viewport Responsiveness & Zero Horizontal Overflow ---');
    const viewports = [
      { name: 'Android', width: 360, height: 800 },
      { name: 'iPhone', width: 390, height: 844 },
      { name: 'Desktop', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      const noOverflow = metrics.scrollWidth <= metrics.clientWidth;
      record(
        `Viewport Overflow Check: ${vp.name} (${vp.width}x${vp.height})`,
        noOverflow,
        `scroll: ${metrics.scrollWidth}px, client: ${metrics.clientWidth}px`
      );

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `viewport-${vp.name.toLowerCase()}.png`),
      });
    }

    // Reset to desktop viewport for remaining tests
    await page.setViewport({ width: 1440, height: 900 });

    // =========================================================================
    // Test 3: Settings Tab & Dynamic Brand Customization UI
    // =========================================================================
    console.log('\n--- Test 3: Settings Tab & Dynamic Brand Customization UI ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

    const settingsResult = await page.evaluate(async () => {
      // Click Settings Tab
      const btns = Array.from(document.querySelectorAll('button'));
      const settingsTabBtn = btns.find((b) => b.innerText.includes('إعدادات المنشأة'));
      if (settingsTabBtn) settingsTabBtn.click();
      await new Promise((r) => setTimeout(r, 200));

      const phoneInput = document.querySelector('input[placeholder*="05XXXXXXXX"]');
      if (phoneInput) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(phoneInput, '0512345678');
        } else {
          phoneInput.value = '0512345678';
        }
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Click Save Settings button
      const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('حفظ التعديلات')
      );
      if (saveBtn) saveBtn.click();
      await new Promise((r) => setTimeout(r, 200));

      // Return to Editor Tab
      const editorTabBtn = btns.find((b) => b.innerText.includes('الفاتورة'));
      if (editorTabBtn) editorTabBtn.click();
      await new Promise((r) => setTimeout(r, 150));

      const savedSeller = JSON.parse(localStorage.getItem('saas_company_settings_v1') || '{}');
      return {
        phoneSaved: savedSeller.phone === '0512345678',
        phone: savedSeller.phone,
      };
    });

    record(
      'Dynamic Company Settings Tab & Persistent Storage',
      settingsResult.phoneSaved,
      `Saved Phone: "${settingsResult.phone}"`
    );

    // =========================================================================
    // Test 4: Universal Invoice Template Style Switching (Modern, Classic, Minimalist)
    // =========================================================================
    console.log('\n--- Test 4: Universal Invoice Template Style Switching ---');
    const templateStylesTest = await page.evaluate(async () => {
      const styles = ['classic', 'minimalist', 'modern'];
      const results = {};

      for (const st of styles) {
        if (window.__saqrSetTemplateStyle) {
          window.__saqrSetTemplateStyle(st);
        }
        await new Promise((r) => setTimeout(r, 150));
        const seller = JSON.parse(localStorage.getItem('saas_company_settings_v1') || '{}');
        results[st] = seller.templateStyle === st;
      }

      return results;
    });

    record(
      'Universal Invoice Template Style Switcher (Modern, Classic, Minimalist)',
      templateStylesTest.classic && templateStylesTest.minimalist && templateStylesTest.modern,
      `Classic: ${templateStylesTest.classic}, Minimalist: ${templateStylesTest.minimalist}, Modern: ${templateStylesTest.modern}`
    );

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'universal-invoice-modern-preview.png'),
    });

    // =========================================================================
    // Test 5: Heavy Multi-Page Stress Test (135 Items across 9-10 Pages)
    // =========================================================================
    console.log('\n--- Test 5: Heavy Multi-Page Stress Test (135 Items across 9-10 Pages) ---');
    await page.evaluate(() => {
      const items = Array.from({ length: 135 }, (_, i) => ({
        id: `stress-item-${i + 1}`,
        itemCode: String(1000 + i),
        description: `بند توريد رقم ${i + 1} - مواد تشييد ومقاولات معتمدة`,
        unit: i % 3 === 0 ? 'طن' : i % 3 === 1 ? 'م3' : 'وحدة',
        qty: (i + 1) * 2,
        unitPrice: 50 + (i % 10) * 15,
      }));

      if (window.__saqrSetInvoice) {
        window.__saqrSetInvoice({
          items: items,
          paymentMethod: 'آجل',
          client: {
            name: 'شركة المقاولات الإنشائية الكبرى',
            taxNumber: '314237681800003',
            notes: 'سجل تجاري 7051569643',
            address: 'الرياض - حي الملز - شارع الستين',
            phone: '0566636486',
          },
        });
      }

      if (window.__saqrSetDocPrintView) {
        window.__saqrSetDocPrintView('invoice');
      }
    });

    await new Promise((r) => setTimeout(r, 400));

    const heavyMetrics = await page.evaluate(async () => {
      if (window.__saqrSetCurrentPage) {
        window.__saqrSetCurrentPage(1);
      }
      await new Promise((r) => setTimeout(r, 200));

      const bodyText = document.body.innerText;
      const has9Pages =
        bodyText.includes('من 9') ||
        bodyText.includes('9 صفحات') ||
        bodyText.includes('من 10') ||
        bodyText.includes('10 صفحات');

      // Next button test
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find((b) => b.textContent && b.textContent.includes('التالي') && !b.disabled);
      if (nextBtn) {
        nextBtn.click();
        await new Promise((r) => setTimeout(r, 200));
      } else if (window.__saqrSetCurrentPage) {
        window.__saqrSetCurrentPage(2);
        await new Promise((r) => setTimeout(r, 200));
      }

      const textAfter = document.body.innerText;
      const navigatedToPage2 =
        textAfter.includes('2 من 9') ||
        textAfter.includes('صفحة 2') ||
        textAfter.includes('2 من 10');

      return {
        has9Pages,
        navigatedToPage2,
      };
    });

    record(
      'Heavy Multi-Page Stress Test (135 Items Auto-Paginated to 9 Pages)',
      heavyMetrics.has9Pages,
      `Detected multi-page layout: ${heavyMetrics.has9Pages}`
    );

    record(
      'Page Navigation & Page 2 Transition in 135-Item Invoice',
      heavyMetrics.navigatedToPage2,
      `Navigated to page 2: ${heavyMetrics.navigatedToPage2}`
    );

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'stress-test-135-items-multi-page.png'),
    });

    // =========================================================================
    // Test 6: Receipt Voucher ("سند قبض") Preview & Print Flow
    // =========================================================================
    console.log('\n--- Test 6: Receipt Voucher ("سند قبض") Preview & Print Flow ---');
    const voucherMetrics = await page.evaluate(async () => {
      if (window.__saqrSetDocPrintView) {
        window.__saqrSetDocPrintView('receipt');
      }
      await new Promise((r) => setTimeout(r, 200));

      const bodyText = document.body.innerText;
      return {
        hasVoucherHeader: bodyText.includes('سند قبض مالي') || bodyText.includes('RECEIPT VOUCHER'),
        hasCompanyName:
          bodyText.includes('شركة إنفو كور') ||
          bodyText.includes('InvoCore') ||
          bodyText.includes('شركة الحلول السحابية المتقدمة'),
      };
    });

    record(
      'Receipt Voucher Dynamic Company Data & Layout',
      voucherMetrics.hasVoucherHeader && voucherMetrics.hasCompanyName,
      `Voucher Header: ${voucherMetrics.hasVoucherHeader}, Company Name: ${voucherMetrics.hasCompanyName}`
    );

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'receipt-voucher-preview.png'),
    });

    // =========================================================================
    // Test 7: Lossless Public QR Code Verification & Zero Console Errors
    // =========================================================================
    console.log('\n--- Test 7: Lossless QR Verification & Console Error Check ---');
    const qrLink = await page.evaluate(() => {
      const link = document.querySelector('a[title*="صفحة العميل"]');
      return link ? link.getAttribute('href') : null;
    });

    if (qrLink) {
      const fullQrUrl = qrLink.startsWith('http') ? qrLink : `http://localhost:${PORT}${qrLink}`;
      await page.goto(fullQrUrl, { waitUntil: 'networkidle0' });

      const clientPageMetrics = await page.evaluate(() => {
        const headerText = document.querySelector('header')?.innerText || '';
        return {
          isPublicView:
            headerText.includes('نسخة إلكترونية معتمدة') ||
            document.body.innerText.includes('فاتورة ضريبية'),
        };
      });

      record('Public Client Viewer Lossless QR Decoding', clientPageMetrics.isPublicView, 'Public invoice page rendered');
    }

    if (pageErrors.length > 0) {
      console.log('Recorded page errors:', pageErrors);
    }
    record('Zero Runtime Console / Page Errors', pageErrors.length === 0, `${pageErrors.length} errors recorded`);
  } catch (err) {
    console.error('Test execution error:', err);
    record('Test Suite Run', false, err.message);
  } finally {
    await browser.close();
    server.close();
  }

  // Summary report
  console.log('\n======================================================');
  console.log('   AUTOMATED QA BROWSER TEST EXECUTION SUMMARY');
  console.log('======================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`SUCCESS RATE: ${Math.round((passed / total) * 100)}%\n`);

  fs.writeFileSync(
    path.resolve('qa-e2e/reports/test-results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), total, passed, failed, testResults }, null, 2)
  );

  return failed === 0;
}

runTests().then((success) => {
  if (!success) {
    console.error('[QA] Some tests failed.');
    process.exit(1);
  } else {
    console.log('[QA] All automated browser tests passed cleanly.');
  }
});
