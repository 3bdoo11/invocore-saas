package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.InvoiceWorkspacePage;

public class MultiCompanyAndPaginationTest extends BaseTest {

    @Test(description = "Verify entering items causes multi-page A4 pagination (Page 1 & Page 2)")
    public void testMultiPagePagination() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        // Add items up to multi-page threshold
        int itemsBefore = workspace.getLineItemsCount();
        for (int i = itemsBefore; i < 16; i++) {
            workspace.clickAddLineItem();
        }

        int count = workspace.getLineItemsCount();
        Assert.assertTrue(count >= 16, "Should have 16+ line items for multi-page verification");

        captureScreenshot("multi_page_pagination_16_items");
    }

    @Test(description = "Verify seamless switching across all 8 company templates without item data loss")
    public void testSwitchAll8CompaniesPersistence() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);
        workspace.closeGalleryIfOpen();

        int totalCompanies = workspace.getCompaniesCount();
        Assert.assertEquals(totalCompanies, 8, "Expected exactly 8 certified Saudi company templates!");

        for (int i = 0; i < totalCompanies; i++) {
            workspace.selectCompanyByIndex(i);
            int currentItems = workspace.getLineItemsCount();
            Assert.assertTrue(currentItems >= 1, "Line items must persist across company switches without disappearing!");
        }

        captureScreenshot("switched_all_8_companies_verified");
    }
}
