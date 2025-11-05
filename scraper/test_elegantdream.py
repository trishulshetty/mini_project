import requests
import json

# Test the scraper endpoint
url = "https://www.elegantdream.in/product/elegantdream-gheru-polished-artificial-jhumkas-with-mango-and-peacock-design"

payload = {
    "url": url
}

print("Testing ElegantDream scraper...")
print(f"URL: {url}\n")

try:
    response = requests.post(
        "http://localhost:5001/scrape",
        json=payload,
        timeout=60
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
except Exception as e:
    print(f"Error: {e}")
