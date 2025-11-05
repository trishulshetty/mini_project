import requests
from bs4 import BeautifulSoup

url = "https://www.elegantdream.in/product/elegantdream-gheru-polished-artificial-jhumkas-with-mango-and-peacock-design"

print("Checking page with requests...")
response = requests.get(url)
print(f"Status: {response.status_code}")
print(f"Content length: {len(response.text)}")

soup = BeautifulSoup(response.text, 'html.parser')

# Check for any meta tags
print("\n=== Meta Tags ===")
for meta in soup.find_all('meta')[:10]:
    if meta.get('property') or meta.get('name'):
        print(f"{meta.get('property') or meta.get('name')}: {meta.get('content', '')[:100]}")

# Check for scripts
print("\n=== Scripts ===")
scripts = soup.find_all('script')
print(f"Found {len(scripts)} script tags")

# Check if there's any JSON data in the page
import re
json_pattern = r'"price":\s*(\d+\.?\d*)'
matches = re.findall(json_pattern, response.text)
if matches:
    print(f"\nFound prices in page source: {matches}")
