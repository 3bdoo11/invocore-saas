package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class PublicClientViewPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By headerTitle = By.xpath("//header//div[contains(., 'نسخة إلكترونية معتمدة')]");
    private final By printBtn = By.xpath("//button[contains(., 'تحميل الفاتورة PDF') or contains(., 'طباعة')]");
    private final By whatsappBtn = By.xpath("//button[contains(., 'مشاركة واتساب')]");
    private final By qrCodeSvg = By.cssSelector("svg[width='128'], svg[height='128'], .bg-white svg");
    private final By a4Sheet = By.cssSelector(".invoice-a4-page");

    public PublicClientViewPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void open(String fullUrl) {
        driver.get(fullUrl);
    }

    public boolean isCertifiedHeaderDisplayed() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(headerTitle)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isPrintButtonDisplayed() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(printBtn)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isWhatsAppButtonDisplayed() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(whatsappBtn)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public int getRenderedPagesCount() {
        return driver.findElements(a4Sheet).size();
    }
}
