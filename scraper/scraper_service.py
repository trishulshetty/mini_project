from flask import Flask, request, jsonify
try:
    from flask_cors import CORS
except ImportError:
    print("Warning: flask-cors not installed. Run: pip install flask-cors")
    CORS = None
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse
import time

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    print("Warning: Selenium not installed. React SPAs won't be scraped.")
    SELENIUM_AVAILABLE = False

app = Flask(__name__)
if CORS:
    CORS(app)

def detect_platform(url):
    """Detect e-commerce platform from URL"""
    domain = urlparse(url).netloc.lower()
    
    if 'amazon' in domain:
        return 'Amazon'
    elif 'ebay' in domain:
        return 'eBay'
    elif 'walmart' in domain:
        return 'Walmart'
    elif 'bestbuy' in domain:
        return 'Best Buy'
    elif 'target' in domain:
        return 'Target'
    elif 'flipkart' in domain:
        return 'Flipkart'
    elif 'alibaba' in domain:
        return 'Alibaba'
    elif 'etsy' in domain:
        return 'Etsy'
    elif 'elegantdream' in domain:
        return 'ElegantDream'
    elif 'jharkhand-ecom' in domain:
        return 'JharkhandEcom'
    else:
        return 'Unknown'

def extract_price(text):
    """Extract price from text string"""
    if not text:
        return None
    
    # Remove currency symbols and extract number
    # Matches patterns like: $123.45, 123.45, 1,234.56, etc.
    price_pattern = r'[\d,]+\.?\d*'
    matches = re.findall(price_pattern, text.replace(',', ''))
    
    if matches:
        try:
            return float(matches[0])
        except ValueError:
            return None
    return None

def scrape_with_selenium(url, platform):
    """Scrape using Selenium for React SPAs like ElegantDream"""
    if not SELENIUM_AVAILABLE:
        print("Selenium not available")
        return None
    
    driver = None
    try:
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Initialize driver (Selenium 4.26+ auto-manages ChromeDriver)
        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(30)
        
        print(f"Loading URL with Selenium: {url}")
        driver.get(url)
        
        # Wait for page to load
        time.sleep(5)
        
        title = None
        price = None
        image_url = None
        currency = 'INR'
        
        if platform == 'Amazon':
            try:
                # Wait for product title
                title_elem = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "productTitle"))
                )
                title = title_elem.text.strip()
                print(f"Found title: {title}")
            except:
                try:
                    title_elem = driver.find_element(By.CSS_SELECTOR, "h1#title, span#productTitle")
                    title = title_elem.text.strip()
                except:
                    pass
            
            # Find price
            try:
                all_text = driver.find_element(By.TAG_NAME, "body").text
                
                price_patterns = [
                    r'₹\s*(\d+(?:,\d+)*(?:\.\d+)?)',
                    r'Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)',
                    r'\$\s*(\d+(?:,\d+)*(?:\.\d+)?)',
                ]
                
                for pattern in price_patterns:
                    matches = re.findall(pattern, all_text)
                    if matches:
                        for match in matches:
                            extracted = extract_price(match)
                            if extracted and extracted > 10:  # Amazon prices are usually > 10
                                price = extracted
                                print(f"Found price: {price}")
                                break
                    if price:
                        break
                
                # Try specific Amazon price selectors
                if not price:
                    price_selectors = [
                        ".a-price-whole",
                        "#priceblock_ourprice",
                        "#priceblock_dealprice",
                        ".a-offscreen"
                    ]
                    for selector in price_selectors:
                        try:
                            elem = driver.find_element(By.CSS_SELECTOR, selector)
                            extracted = extract_price(elem.text)
                            if extracted and extracted > 10:
                                price = extracted
                                print(f"Found price from selector: {price}")
                                break
                        except:
                            continue
            except Exception as e:
                print(f"Amazon price extraction error: {e}")
            
            # Find image
            try:
                img_selectors = [
                    "#landingImage",
                    ".a-dynamic-image",
                    "#imgBlkFront"
                ]
                for selector in img_selectors:
                    try:
                        img_elem = driver.find_element(By.CSS_SELECTOR, selector)
                        image_url = img_elem.get_attribute('src')
                        if image_url and image_url.startswith('http'):
                            print(f"Found image")
                            break
                    except:
                        continue
            except:
                pass
        
        elif platform == 'JharkhandEcom':
            try:
                # Wait for product title (MERN stack typically uses h1 or specific class)
                title_elem = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "h1"))
                )
                title = title_elem.text.strip()
                print(f"Found title: {title}")
            except Exception as e:
                print(f"Title not found: {e}")
                # Try alternative selectors for MERN apps
                try:
                    title_elem = driver.find_element(By.CSS_SELECTOR, "[class*='product'][class*='title'], [class*='Product'][class*='Title'], [class*='product'][class*='name'], h2, h3")
                    title = title_elem.text.strip()
                except:
                    pass
            
            # Find price - MERN apps often use specific price components
            try:
                # Get all text elements and search for price patterns
                all_text = driver.find_element(By.TAG_NAME, "body").text
                
                # Look for price patterns in the text
                price_patterns = [
                    r'₹\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # ₹1,234.56
                    r'Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # Rs.1234 or Rs 1234
                    r'INR\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # INR 1234
                    r'Price[:\s]+₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # Price: 1234
                ]
                
                for pattern in price_patterns:
                    matches = re.findall(pattern, all_text, re.IGNORECASE)
                    if matches:
                        for match in matches:
                            extracted = extract_price(match)
                            if extracted and extracted > 0:
                                price = extracted
                                print(f"Found price from pattern: {price}")
                                break
                    if price:
                        break
                
                # If still no price, try CSS selectors
                if not price:
                    price_selectors = [
                        "[class*='price']",
                        "[class*='Price']",
                        "span[class*='amount']",
                        "div[class*='price']",
                        "p[class*='price']",
                        "*[class*='cost']",
                        "*[class*='Cost']",
                        "[data-price]",
                        "[class*='product-price']"
                    ]
                    
                    for selector in price_selectors:
                        try:
                            price_elems = driver.find_elements(By.CSS_SELECTOR, selector)
                            for elem in price_elems:
                                text = elem.text.strip()
                                if text and ('₹' in text or 'Rs' in text or text.replace(',', '').replace('.', '').isdigit()):
                                    extracted = extract_price(text)
                                    if extracted and extracted > 0:
                                        price = extracted
                                        print(f"Found price from selector: {price}")
                                        break
                            if price:
                                break
                        except:
                            continue
            except Exception as e:
                print(f"Price extraction error: {e}")
            
            # Find image
            try:
                img_selectors = [
                    "img[class*='product']",
                    "img[class*='Product']",
                    "img[alt*='product']",
                    "img[alt*='Product']",
                    ".product-image img",
                    "[class*='image'] img",
                    "img[class*='main']",
                    "img[class*='featured']"
                ]
                
                for selector in img_selectors:
                    try:
                        img_elem = driver.find_element(By.CSS_SELECTOR, selector)
                        image_url = img_elem.get_attribute('src')
                        if image_url and image_url.startswith('http'):
                            print(f"Found image: {image_url[:50]}...")
                            break
                    except:
                        continue
            except Exception as e:
                print(f"Image extraction error: {e}")
        
        elif platform == 'ElegantDream':
            try:
                # Wait for product title
                title_elem = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "h1"))
                )
                title = title_elem.text.strip()
                print(f"Found title: {title}")
            except Exception as e:
                print(f"Title not found: {e}")
                # Try alternative selectors
                try:
                    title_elem = driver.find_element(By.CSS_SELECTOR, "[class*='product'][class*='title'], [class*='Product'][class*='Title']")
                    title = title_elem.text.strip()
                except:
                    pass
            
            # Find price - try multiple approaches
            try:
                # Get all text elements and search for price patterns
                all_text = driver.find_element(By.TAG_NAME, "body").text
                
                # Look for price patterns in the text
                price_patterns = [
                    r'₹\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # ₹1,234.56
                    r'Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # Rs.1234 or Rs 1234
                    r'INR\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # INR 1234
                    r'Price[:\s]+₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # Price: 1234
                ]
                
                for pattern in price_patterns:
                    matches = re.findall(pattern, all_text, re.IGNORECASE)
                    if matches:
                        for match in matches:
                            extracted = extract_price(match)
                            if extracted and extracted > 0:
                                price = extracted
                                print(f"Found price from pattern: {price}")
                                break
                    if price:
                        break
                
                # If still no price, try CSS selectors
                if not price:
                    price_selectors = [
                        "[class*='price']",
                        "[class*='Price']",
                        "span[class*='amount']",
                        "div[class*='price']",
                        "p[class*='price']",
                        "*[class*='cost']",
                        "*[class*='Cost']"
                    ]
                    
                    for selector in price_selectors:
                        try:
                            price_elems = driver.find_elements(By.CSS_SELECTOR, selector)
                            for elem in price_elems:
                                text = elem.text.strip()
                                if text and ('₹' in text or 'Rs' in text or text.replace(',', '').replace('.', '').isdigit()):
                                    extracted = extract_price(text)
                                    if extracted and extracted > 0:
                                        price = extracted
                                        print(f"Found price from selector: {price}")
                                        break
                            if price:
                                break
                        except:
                            continue
            except Exception as e:
                print(f"Price extraction error: {e}")
            
            # Find image
            try:
                img_selectors = [
                    "img[class*='product']",
                    "img[class*='Product']",
                    "img[alt*='product']",
                    "img[alt*='Product']",
                    ".product-image img",
                    "[class*='image'] img"
                ]
                
                for selector in img_selectors:
                    try:
                        img_elem = driver.find_element(By.CSS_SELECTOR, selector)
                        image_url = img_elem.get_attribute('src')
                        if image_url and image_url.startswith('http'):
                            print(f"Found image: {image_url[:50]}...")
                            break
                    except:
                        continue
            except Exception as e:
                print(f"Image extraction error: {e}")
        
        if title and price:
            return {
                'success': True,
                'title': title[:200],
                'price': price,
                'currency': currency,
                'imageUrl': image_url or '',
                'platform': platform
            }
        
        return None
        
    except Exception as e:
        print(f"Selenium scraping error: {str(e)}")
        return None
    finally:
        if driver:
            driver.quit()

def scrape_with_requests(url, platform):
    """Scrape using requests and BeautifulSoup (faster, but may not work for JS-heavy sites)"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = None
        price = None
        image_url = None
        currency = 'INR'
        
        # Amazon selectors
        if platform == 'Amazon':
            title_elem = soup.find('span', {'id': 'productTitle'}) or soup.find('h1', {'id': 'title'})
            title = title_elem.get_text(strip=True) if title_elem else None
            
            # Try multiple price selectors
            price_elem = (
                soup.find('span', {'class': 'a-price-whole'}) or
                soup.find('span', {'id': 'priceblock_ourprice'}) or
                soup.find('span', {'id': 'priceblock_dealprice'}) or
                soup.find('span', {'class': 'a-offscreen'})
            )
            
            if price_elem:
                price = extract_price(price_elem.get_text())
            
            img_elem = soup.find('img', {'id': 'landingImage'}) or soup.find('img', {'class': 'a-dynamic-image'})
            image_url = img_elem.get('src') if img_elem else None
        
        # eBay selectors
        elif platform == 'eBay':
            title_elem = soup.find('h1', {'class': 'x-item-title__mainTitle'}) or soup.find('h1', {'class': 'it-ttl'})
            title = title_elem.get_text(strip=True) if title_elem else None
            
            price_elem = (
                soup.find('div', {'class': 'x-price-primary'}) or
                soup.find('span', {'id': 'prcIsum'}) or
                soup.find('span', {'class': 'display-price'})
            )
            
            if price_elem:
                price = extract_price(price_elem.get_text())
            
            img_elem = soup.find('img', {'id': 'icImg'}) or soup.find('img', {'class': 'ux-image-carousel-item'})
            image_url = img_elem.get('src') if img_elem else None
        
        # Walmart selectors
        elif platform == 'Walmart':
            title_elem = soup.find('h1', {'itemprop': 'name'}) or soup.find('h1', {'class': 'prod-ProductTitle'})
            title = title_elem.get_text(strip=True) if title_elem else None
            
            price_elem = soup.find('span', {'itemprop': 'price'}) or soup.find('span', {'class': 'price-characteristic'})
            
            if price_elem:
                price_text = price_elem.get('content') or price_elem.get_text()
                price = extract_price(price_text)
            
            img_elem = soup.find('img', {'class': 'hover-zoom-hero-image'})
            image_url = img_elem.get('src') if img_elem else None
        
        # Flipkart selectors
        elif platform == 'Flipkart':
            title_elem = soup.find('span', {'class': 'B_NuCI'}) or soup.find('h1', {'class': 'yhB1nd'})
            title = title_elem.get_text(strip=True) if title_elem else None
            
            price_elem = soup.find('div', {'class': '_30jeq3'}) or soup.find('div', {'class': '_16Jk6d'})
            
            if price_elem:
                price = extract_price(price_elem.get_text())
            
            img_elem = soup.find('img', {'class': '_396cs4'})
            image_url = img_elem.get('src') if img_elem else None
            currency = 'INR'
        
        # Generic fallback
        else:
            # Try common selectors
            title_elem = (
                soup.find('h1', {'itemprop': 'name'}) or
                soup.find('h1', {'class': re.compile(r'product.*title', re.I)}) or
                soup.find('h1')
            )
            title = title_elem.get_text(strip=True) if title_elem else None
            
            # Try meta tags for price
            price_meta = soup.find('meta', {'property': 'product:price:amount'})
            if price_meta:
                price = extract_price(price_meta.get('content', ''))
            else:
                price_elem = (
                    soup.find('span', {'itemprop': 'price'}) or
                    soup.find('span', {'class': re.compile(r'price', re.I)}) or
                    soup.find('div', {'class': re.compile(r'price', re.I)})
                )
                if price_elem:
                    price = extract_price(price_elem.get_text())
            
            # Try meta tags for image
            img_meta = soup.find('meta', {'property': 'og:image'})
            if img_meta:
                image_url = img_meta.get('content')
            else:
                img_elem = soup.find('img', {'itemprop': 'image'}) or soup.find('img', {'class': re.compile(r'product.*image', re.I)})
                image_url = img_elem.get('src') if img_elem else None
        
        if title and price:
            return {
                'success': True,
                'title': title[:200],
                'price': price,
                'currency': currency,
                'imageUrl': image_url or '',
                'platform': platform
            }
        
        return None
        
    except Exception as e:
        print(f"Requests scraping error: {str(e)}")
        return None


@app.route('/scrape', methods=['POST'])
def scrape_product():
    """Main endpoint to scrape product data"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        print(f"\n{'='*60}")
        print(f"Scraping request received for: {url}")
        
        # Detect platform
        platform = detect_platform(url)
        print(f"Detected platform: {platform}")
        
        # Use Selenium for React SPAs (ElegantDream, JharkhandEcom)
        if platform in ['ElegantDream', 'JharkhandEcom']:
            if not SELENIUM_AVAILABLE:
                print("ERROR: Selenium not available! Install with: pip install selenium")
                return jsonify({'error': 'Selenium not installed. Cannot scrape React SPAs.'}), 500
            
            print(f"Using Selenium for {platform} (React SPA/MERN)...")
            result = scrape_with_selenium(url, platform)
        else:
            # Try requests first for other platforms
            print(f"Using requests for {platform}...")
            result = scrape_with_requests(url, platform)
            
            # If requests failed and Selenium is available, try Selenium as fallback
            if not result and SELENIUM_AVAILABLE and platform == 'Amazon':
                print(f"Requests failed for {platform}, trying Selenium fallback...")
                result = scrape_with_selenium(url, platform)
        
        if result:
            print(f"✓ Successfully scraped: {result.get('title', 'N/A')[:50]}...")
            print(f"  Price: {result.get('currency', '')} {result.get('price', 'N/A')}")
            print(f"{'='*60}\n")
            return jsonify(result), 200
        else:
            print(f"✗ Failed to scrape product data")
            print(f"{'='*60}\n")
            return jsonify({'error': 'Could not extract product data from URL'}), 400
            
    except Exception as e:
        print(f"✗ Error in scrape_product: {str(e)}")
        print(f"{'='*60}\n")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'service': 'Python Scraper',
        'selenium_available': SELENIUM_AVAILABLE,
        'version': '2.0-selenium'
    }), 200

if __name__ == '__main__':
    print("="*60)
    print("Starting Python Scraper Service on port 5001...")
    print(f"Selenium Available: {SELENIUM_AVAILABLE}")
    if SELENIUM_AVAILABLE:
        print("✓ React SPA scraping enabled (ElegantDream, JharkhandEcom)")
    else:
        print("✗ Selenium not installed - React SPAs won't work")
        print("  Install with: pip install selenium webdriver-manager")
    print("="*60)
    app.run(host='0.0.0.0', port=5001, debug=True)
