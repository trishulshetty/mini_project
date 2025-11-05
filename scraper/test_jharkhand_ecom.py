import requests
import json

# Test the scraper endpoint for JharkhandEcom
url = "https://jharkhand-ecom.onrender.com/p/miniature-wooden-charpai-manji-tray-curio-68d78f36293b99ba116e539f"

payload = {
    "url": url
}

print("Testing JharkhandEcom scraper...")
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
