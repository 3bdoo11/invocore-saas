package pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class InvoiceWorkspacePage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Header & Company Selectors
    private final By companySelect = By.cssSelector("select[aria-label='اختر الشركة المصدرة للفاتورة']");
    private final By galleryToggleBtn = By.xpath("//button[contains(., 'معرض') or contains(., 'تبديل الشركة')]");
    private final By companyGalleryCards = By.cssSelector(".group");
    private final By docTypeInvoiceBtn = By.xpath("//button[contains(., 'الفاتورة الضريبية')]");
    private final By docTypeReceiptBtn = By.xpath("//button[contains(., 'سند قبض')]");
    private final By docTypeBothBtn = By.xpath("//button[contains(., 'الفاتورة + السند')]");

    // Client Info Fields
    private final By clientNameInput = By.xpath("//label[contains(., 'اسم العميل')]/following-sibling::input | //input[contains(@placeholder, 'شركة') or contains(@placeholder, 'العميل')]");
    private final By clientTaxInput = By.xpath("//label[contains(., 'الرقم الضريبي للعميل')]/following-sibling::input");
    private final By clientPhoneInput = By.xpath("//label[contains(., 'رقم الجوال')]/following-sibling::input");
    private final By clientAddressInput = By.xpath("//label[contains(., 'العنوان الوطني')]/following-sibling::input");
    private final By clientNotesInput = By.xpath("//label[contains(., 'ملاحظات')]/following-sibling::input");

    // Invoice Metadata
    private final By invoiceNumberInput = By.xpath("//label[contains(., 'رقم الفاتورة')]/following-sibling::input");
    private final By paymentMethodSelect = By.xpath("//label[contains(., 'طريقة الدفع')]/following-sibling::select | //select[contains(., 'نقدي') or contains(., 'آجل')]");

    // Line Items
    private final By addLineItemBtn = By.xpath("//button[contains(., 'إضافة بند جديد')]");
    private final By deleteItemButtons = By.cssSelector("button[title*='البند']");
    private final By descriptionInputs = By.xpath("//label[contains(., 'البيان')]/following-sibling::div//input");

    // Financial Inputs
    private final By discountInput = By.xpath("//label[contains(., 'الخصم')]/following-sibling::div//input");
    private final By vatRateInput = By.xpath("//label[contains(., 'ضريبة القيمة المضافة')]/following-sibling::div//input | //input[contains(@placeholder, '15')]");
    private final By paidAmountInput = By.xpath("//label[contains(., 'المبلغ المدفوع')]/following-sibling::div//input");

    // Actions
    private final By saveInvoiceBtn = By.xpath("//button[contains(., 'حفظ وإصدار الفاتورة')]");
    private final By printBtn = By.xpath("//button[contains(., 'طباعة / PDF')]");
    private final By whatsAppShareBtn = By.xpath("//button[contains(., 'مشاركة واتساب')]");
    private final By clientPageLink = By.xpath("//a[contains(., 'صفحة العميل')]");

    // Share Modal
    private final By shareModalDialog = By.xpath("//div[contains(., 'مشاركة الفاتورة عبر واتساب') and contains(@class, 'fixed')]");

    public InvoiceWorkspacePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void open(String url) {
        driver.get(url);
    }

    public void closeGalleryIfOpen() {
        try {
            List<WebElement> closeBtns = driver.findElements(By.xpath("//button[contains(., 'إغلاق المعرض')]"));
            if (!closeBtns.isEmpty() && closeBtns.get(0).isDisplayed()) {
                closeBtns.get(0).click();
                Thread.sleep(300);
            }
        } catch (Exception ignored) {}
    }

    public void selectCompanyByIndex(int index) {
        WebElement selectElem = wait.until(ExpectedConditions.visibilityOfElementLocated(companySelect));
        Select select = new Select(selectElem);
        select.selectByIndex(index);
    }

    public int getCompaniesCount() {
        WebElement selectElem = wait.until(ExpectedConditions.visibilityOfElementLocated(companySelect));
        Select select = new Select(selectElem);
        return select.getOptions().size();
    }

    public void fillClientName(String name) {
        WebElement el = wait.until(ExpectedConditions.visibilityOfElementLocated(clientNameInput));
        el.clear();
        el.sendKeys(name);
    }

    public void fillInvoiceNumber(String num) {
        WebElement el = wait.until(ExpectedConditions.visibilityOfElementLocated(invoiceNumberInput));
        el.clear();
        el.sendKeys(num);
    }

    public void selectPaymentMethod(String method) {
        WebElement el = wait.until(ExpectedConditions.visibilityOfElementLocated(paymentMethodSelect));
        Select select = new Select(el);
        select.selectByVisibleText(method);
    }

    public boolean isReceiptVoucherButtonVisibleInHeader() {
        List<WebElement> els = driver.findElements(docTypeReceiptBtn);
        return !els.isEmpty() && els.get(0).isDisplayed();
    }

    public void clickAddLineItem() {
        WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(addLineItemBtn));
        btn.click();
    }

    public int getLineItemsCount() {
        return driver.findElements(deleteItemButtons).size();
    }

    public void clickWhatsAppShare() {
        WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(whatsAppShareBtn));
        btn.click();
    }

    public boolean isShareModalOpen() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(shareModalDialog)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public String getClientPageHref() {
        WebElement link = wait.until(ExpectedConditions.presenceOfElementLocated(clientPageLink));
        return link.getAttribute("href");
    }
}
