import sys
sys.path.insert(0, '.')

# Import the scraper function directly
from scraper_service import scrape_with_selenium, detect_platform

url = "https://www.elegantdream.in/product/elegantdream-gheru-polished-artificial-jhumkas-with-mango-and-peacock-design"

print("Testing scraper function directly...")
platform = detect_platform(url)
print(f"Platform: {platform}")

result = scrape_with_selenium(url, platform)
print(f"\nResult: {result}")
