from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

print("Testing Selenium directly...")

# Setup Chrome options
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--disable-gpu')

try:
    print("Initializing Chrome driver...")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    url = "https://www.elegantdream.in/product/elegantdream-gheru-polished-artificial-jhumkas-with-mango-and-peacock-design"
    print(f"Loading: {url}")
    
    driver.get(url)
    time.sleep(5)
    
    print("\nPage loaded. Looking for elements...")
    
    # Try to find h1
    try:
        h1 = driver.find_element(By.TAG_NAME, "h1")
        print(f"Title (h1): {h1.text}")
    except Exception as e:
        print(f"No h1 found: {e}")
    
    # Try to find price
    try:
        price_elems = driver.find_elements(By.CSS_SELECTOR, "[class*='price']")
        print(f"\nFound {len(price_elems)} price elements:")
        for i, elem in enumerate(price_elems[:5]):
            print(f"  {i+1}. {elem.text}")
    except Exception as e:
        print(f"No price found: {e}")
    
    # Get page source snippet
    print(f"\nPage title: {driver.title}")
    print(f"Page source length: {len(driver.page_source)} chars")
    
    driver.quit()
    print("\n✓ Selenium test completed")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
