from flask import Flask, request, jsonify
from flask_cors import CORS
import requests, random, re, time
from bs4 import BeautifulSoup
from urllib.parse import urlparse

# Optional Selenium
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, WebDriverException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

# Threading for timeout control
import threading

app = Flask(__name__)
CORS(app)

# ================= CONFIG ================= #
# Add your own proxies here if needed (optional)
PROXIES = [
    # Example: "http://username:password@host:port"
    # Leave empty to use direct connection with Selenium
]

SCRAPERAPI_KEY = None  # Set to your API key if you have one
# ========================================== #

def detect_platform(url):
    d = urlparse(url).netloc.lower()
    if 'amazon' in d: return 'Amazon'
    if 'flipkart' in d: return 'Flipkart'
    if 'jharkhand-ecom' in d: return 'JharkhandEcom'
    if 'elegantdream' in d: return 'ElegantDream'
    return 'Generic'

def extract_price(text):
    if not text: return None
    match = re.search(r'[\d,]+\.?\d*', text.replace(',', ''))
    if match:
        try: return float(match.group())
        except: return None
    return None

# =================== REQUEST SCRAPER =================== #
def scrape_with_requests(url, platform):
    """Scrape using requests with optional proxy rotation."""
    headers = {
        "User-Agent": random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ]),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    }

    # Try with proxies if available
    if PROXIES:
        for attempt in range(min(3, len(PROXIES))):
            proxy = random.choice(PROXIES)
            try:
                print(f"[Attempt {attempt+1}] Using proxy: {proxy}")
                resp = requests.get(url, headers=headers, proxies={"http": proxy, "https": proxy}, timeout=120)
                if "captcha" in resp.text.lower() or "access denied" in resp.text.lower():
                    print("Blocked by CAPTCHA, rotating proxy...")
                    continue
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    return parse_html(soup, platform)
            except Exception as e:
                print(f"Proxy {proxy} failed: {e}")
                continue
    
    # Try direct connection (no proxy)
    try:
        print("Trying direct connection...")
        resp = requests.get(url, headers=headers, timeout=120)
        if resp.status_code == 200:
            if "captcha" in resp.text.lower() or "access denied" in resp.text.lower():
                print("Direct connection blocked, will use Selenium...")
                return None
            soup = BeautifulSoup(resp.text, "html.parser")
            return parse_html(soup, platform)
    except Exception as e:
        print(f"Direct connection failed: {e}")

    # Fallback to ScraperAPI if configured
    if SCRAPERAPI_KEY:
        try:
            print("Using ScraperAPI fallback...")
            api_url = f"http://api.scraperapi.com/?api_key={SCRAPERAPI_KEY}&url={url}&render=true"
            resp = requests.get(api_url, timeout=120)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                return parse_html(soup, platform)
        except Exception as e:
            print(f"ScraperAPI fallback failed: {e}")

    return None

# =================== HTML PARSERS =================== #
def parse_html(soup, platform):
    title, price, image = None, None, None

    if platform == "Amazon":
        title = (soup.find("span", id="productTitle") or soup.find("h1")).get_text(strip=True) if soup.find("span", id="productTitle") or soup.find("h1") else None
        price_tag = soup.find("span", class_="a-price-whole") or soup.find("span", id="priceblock_ourprice")
        if price_tag: price = extract_price(price_tag.get_text())
        img = soup.find("img", id="landingImage") or soup.find("img", class_="a-dynamic-image")
        image = img.get("src") if img else None

    elif platform == "Flipkart":
        title_tag = soup.find("span", class_="B_NuCI") or soup.find("h1")
        if title_tag: title = title_tag.get_text(strip=True)
        price_tag = soup.find("div", class_="_30jeq3") or soup.find("div", class_="_16Jk6d")
        if price_tag: price = extract_price(price_tag.get_text())
        img = soup.find("img", class_="_396cs4")
        image = img.get("src") if img else None

    elif platform in ["JharkhandEcom", "ElegantDream", "Generic"]:
        title = soup.find("h1").get_text(strip=True) if soup.find("h1") else None
        text = soup.get_text()
        match = re.search(r"₹\s*(\d+(?:,\d+)*(?:\.\d+)?)", text)
        if match: price = extract_price(match.group(1))
        img = soup.find("img")
        image = img.get("src") if img else None

    if title and price:
        return {
            "success": True,
            "title": title[:200],
            "price": price,
            "currency": "INR",
            "imageUrl": image or "",
            "platform": platform
        }

    return None

# =================== SELENIUM SCRAPER =================== #
def scrape_with_selenium_simple(url, platform):
    """Simplified fast Selenium scraper"""
    if not SELENIUM_AVAILABLE:
        return None
    
    driver = None
    try:
        print(f"[Selenium] Starting Chrome...")
        chrome_opts = ChromeOptions()
        chrome_opts.add_argument("--headless")
        chrome_opts.add_argument("--no-sandbox")
        chrome_opts.add_argument("--disable-dev-shm-usage")
        chrome_opts.add_argument("--disable-gpu")
        chrome_opts.add_argument("--disable-extensions")
        chrome_opts.page_load_strategy = 'eager'
        
        driver = webdriver.Chrome(options=chrome_opts)
        driver.set_page_load_timeout(25)
        
        print(f"[Selenium] Loading URL...")
        driver.get(url)
        
        # Wait for content (10s for Jharkhand)
        wait_time = 10 if platform == "JharkhandEcom" else 5
        print(f"[Selenium] Waiting {wait_time}s...")
        time.sleep(wait_time)
        
        html = driver.page_source
        soup = BeautifulSoup(html, "html.parser")
        result = parse_html(soup, platform)
        
        if result:
            print("[Selenium] ✓ Success")
        return result
        
    except Exception as e:
        print(f"[Selenium] Error: {str(e)[:80]}")
        return None
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

def scrape_with_selenium(url, platform):
    """Wrapper with single retry"""
    result = scrape_with_selenium_simple(url, platform)
    if not result:
        print("[Selenium] Retrying once...")
        time.sleep(2)
        result = scrape_with_selenium_simple(url, platform)
    return result

# =================== ROUTES =================== #
@app.route("/scrape", methods=["POST"])
def scrape():
    try:
        data = request.get_json()
        url = data.get("url")
        if not url:
            return jsonify({"error": "URL required"}), 400

        platform = detect_platform(url)
        print(f"Scraping {url} (platform: {platform})")

        # React SPAs use Selenium with fallback, others use requests first
        if platform in ["ElegantDream", "JharkhandEcom"]:
            print(f"Using Selenium for {platform}...")
            result = scrape_with_selenium(url, platform)
            if not result:
                print("Selenium failed, trying requests fallback...")
                result = scrape_with_requests(url, platform)
        else:
            result = scrape_with_requests(url, platform)
            if not result and SELENIUM_AVAILABLE:
                print("Requests failed, trying Selenium fallback...")
                result = scrape_with_selenium(url, platform)

        if result:
            return jsonify(result), 200
        
        print("All scraping methods failed")
        return jsonify({"error": "Could not extract data after multiple attempts"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "selenium": SELENIUM_AVAILABLE,
        "proxy_rotation": bool(PROXIES),
        "scraperapi": bool(SCRAPERAPI_KEY)
    }), 200

if __name__ == "__main__":
    print("="*60)
    print("Proxy-enabled Scraper running on port 5001")
    print(f"Selenium available: {SELENIUM_AVAILABLE}")
    print("="*60)
    app.run(host="0.0.0.0", port=5001, debug=True)
