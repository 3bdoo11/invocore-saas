package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class CatalogAndHistoryPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By catalogTabBtn = By.xpath("//button[contains(., 'قاعدة الأصناف')]");
    private final By historyTabBtn = By.xpath("//button[contains(., 'سجل الفواتير')]");
    private final By exportCatalogExcelBtn = By.xpath("//button[contains(., 'تصدير قاعدة البيانات')]");
    private final By exportHistoryExcelBtn = By.xpath("//button[contains(., 'تصدير سجل الفواتير')]");
    private final By searchInput = By.cssSelector("input[placeholder*='ابحث']");
    private final By historyCards = By.xpath("//div[contains(@class, 'rounded-xl') and contains(., 'ر.س')]");

    public CatalogAndHistoryPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void openCatalogTab() {
        WebElement tab = wait.until(ExpectedConditions.elementToBeClickable(catalogTabBtn));
        tab.click();
    }

    public void openHistoryTab() {
        WebElement tab = wait.until(ExpectedConditions.elementToBeClickable(historyTabBtn));
        tab.click();
    }

    public boolean isExportCatalogButtonVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(exportCatalogExcelBtn)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isExportHistoryButtonVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(exportHistoryExcelBtn)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void search(String text) {
        WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(searchInput));
        input.clear();
        input.sendKeys(text);
    }
}
