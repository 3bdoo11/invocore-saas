package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.InvoiceWorkspacePage;
import pages.PublicClientViewPage;

public class QrCodeAndReceiptVoucherTest extends BaseTest {

    @Test(description = "Verify Receipt Voucher button is hidden for cash payments and visible only for deferred ('آجل') payments")
    public void testDeferredPaymentReceiptVoucherCondition() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        // 1. When payment is نقدي, receipt voucher button must be hidden in the top switcher
        workspace.selectPaymentMethod("نقدي");
        boolean visibleOnCash = workspace.isReceiptVoucherButtonVisibleInHeader();
        Assert.assertFalse(visibleOnCash, "Receipt voucher tab should be HIDDEN when payment method is Cash (نقدي)!");

        // 2. When payment is آجل, receipt voucher button must appear immediately
        workspace.selectPaymentMethod("آجل");
        boolean visibleOnDeferred = workspace.isReceiptVoucherButtonVisibleInHeader();
        Assert.assertTrue(visibleOnDeferred, "Receipt voucher tab must APPEAR immediately when payment method is Deferred (آجل)!");

        captureScreenshot("deferred_receipt_voucher_conditional_visibility");
    }

    @Test(description = "Verify Public Client View renders successfully from encoded QR URL")
    public void testPublicClientViewerRoundTrip() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        String href = workspace.getClientPageHref();
        Assert.assertNotNull(href, "Client page URL must be present");
        Assert.assertTrue(href.contains("invoice="), "URL must contain ?invoice= parameter");

        PublicClientViewPage clientView = new PublicClientViewPage(driver);
        clientView.open(href);

        boolean certifiedHeader = clientView.isCertifiedHeaderDisplayed();
        Assert.assertTrue(certifiedHeader, "Public client viewer must show certified e-invoice header");

        boolean printBtn = clientView.isPrintButtonDisplayed();
        Assert.assertTrue(printBtn, "Public client viewer must offer PDF print/download action");

        captureScreenshot("public_client_view_verified");
    }
}
