package base;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.ITestResult;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public abstract class BaseTest {

    protected WebDriver driver;
    protected WebDriverWait wait;
    protected String baseUrl;

    @BeforeMethod
    public void setUp() {
        baseUrl = System.getProperty("app.url", "https://saqr-invoice.vercel.app");
        boolean isHeadless = Boolean.parseBoolean(System.getProperty("headless", "true"));

        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        if (isHeadless) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments("--window-size=1440,900");

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @AfterMethod
    public void tearDown(ITestResult result) {
        if (driver != null) {
            captureScreenshot(result.getMethod().getMethodName() + "_" + (result.isSuccess() ? "PASS" : "FAIL"));
            driver.quit();
        }
    }

    public void setViewport(int width, int height) {
        driver.manage().window().setSize(new Dimension(width, height));
    }

    public void setMobileEmulation(int width, int height, String userAgent) {
        if (driver instanceof ChromeDriver) {
            Map<String, Object> deviceMetrics = new HashMap<>();
            deviceMetrics.put("width", width);
            deviceMetrics.put("height", height);
            deviceMetrics.put("pixelRatio", 3.0);
            deviceMetrics.put("mobile", true);

            Map<String, Object> mobileEmulation = new HashMap<>();
            mobileEmulation.put("deviceMetrics", deviceMetrics);
            if (userAgent != null) {
                mobileEmulation.put("userAgent", userAgent);
            }
        }
        driver.manage().window().setSize(new Dimension(width, height));
    }

    public String captureScreenshot(String testName) {
        try {
            TakesScreenshot ts = (TakesScreenshot) driver;
            File src = ts.getScreenshotAs(OutputType.FILE);
            Path destDir = Paths.get("screenshots");
            if (!Files.exists(destDir)) {
                Files.createDirectories(destDir);
            }
            Path dest = destDir.resolve(testName + "_" + System.currentTimeMillis() + ".png");
            Files.copy(src.toPath(), dest, StandardCopyOption.REPLACE_EXISTING);
            return dest.toAbsolutePath().toString();
        } catch (Exception e) {
            System.err.println("Failed to capture screenshot: " + e.getMessage());
            return null;
        }
    }

    public boolean checkZeroHorizontalOverflow() {
        JavascriptExecutor js = (JavascriptExecutor) driver;
        Number scrollWidth = (Number) js.executeScript("return document.documentElement.scrollWidth;");
        Number clientWidth = (Number) js.executeScript("return document.documentElement.clientWidth;");
        return scrollWidth.intValue() <= clientWidth.intValue() + 1;
    }
}
