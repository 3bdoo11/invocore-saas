package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.InvoiceWorkspacePage;

public class ResponsiveLayoutTest extends BaseTest {

    @Test(description = "Verify zero horizontal overflow on Android mobile viewport (360x800)")
    public void testAndroidMobileZeroHorizontalOverflow() {
        setViewport(360, 800);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);

        boolean zeroOverflow = checkZeroHorizontalOverflow();
        captureScreenshot("android_viewport_360x800");

        Assert.assertTrue(zeroOverflow, "Android 360x800 must have ZERO horizontal overflow (scrollWidth <= clientWidth)!");
    }

    @Test(description = "Verify zero horizontal overflow on iPhone mobile viewport (390x844)")
    public void testIPhoneMobileZeroHorizontalOverflow() {
        setViewport(390, 844);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);

        boolean zeroOverflow = checkZeroHorizontalOverflow();
        captureScreenshot("iphone_viewport_390x844");

        Assert.assertTrue(zeroOverflow, "iPhone 390x844 must have ZERO horizontal overflow (scrollWidth <= clientWidth)!");
    }

    @Test(description = "Verify desktop layout rendering on 1440x900 viewport")
    public void testDesktopLayoutIntegrity() {
        setViewport(1440, 900);
        InvoiceWorkspacePage workspace = new InvoiceWorkspacePage(driver);
        workspace.open(baseUrl);

        boolean zeroOverflow = checkZeroHorizontalOverflow();
        captureScreenshot("desktop_viewport_1440x900");

        Assert.assertTrue(zeroOverflow, "Desktop 1440x900 should render without horizontal page overflow!");
    }
}
