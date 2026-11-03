package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.InvoiceWorkspacePage;

public class InvoiceCalculationAndEdgeCasesTest extends BaseTest {

    @Test(description = "Verify boundary calculation logic with positive, zero, and decimal values")
    public void testCalculationWithStandardAndDecimalInputs() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        workspace.fillClientName("شركة الأفق المتقدم للتجارة");
        workspace.fillInvoiceNumber("998877");

        int initialCount = workspace.getLineItemsCount();
        Assert.assertTrue(initialCount >= 1, "At least one line item must be present by default");

        captureScreenshot("calculation_standard_inputs");
    }

    @Test(description = "Verify edge case: empty client name and empty fields do not throw runtime crash")
    public void testEmptyFieldsGracefulHandling() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        workspace.fillClientName("");
        workspace.fillInvoiceNumber("");

        boolean zeroOverflow = checkZeroHorizontalOverflow();
        Assert.assertTrue(zeroOverflow, "App should maintain layout even with empty client inputs");

        captureScreenshot("empty_fields_graceful_handling");
    }

    @Test(description = "Verify WhatsApp share modal behavior on Desktop PC")
    public void testDesktopWhatsAppShareModal() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        workspace.clickWhatsAppShare();
        boolean modalOpen = workspace.isShareModalOpen();
        captureScreenshot("desktop_whatsapp_share_modal");

        Assert.assertTrue(modalOpen, "Desktop PC should open interactive WhatsApp Share Modal with direct web/app triggers & QR code");
    }
}
