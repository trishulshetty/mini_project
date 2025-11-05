# ElegantDream Integration

## Overview

The Price Tracker now supports **ElegantDream** (https://www.elegantdream.in/), a React-based e-commerce platform.

## How It Works

### 1. **Platform Detection**
The scraper automatically detects ElegantDream URLs:
- Domain: `elegantdream.in`
- Platform name: `ElegantDream`

### 2. **Product URL Format**
ElegantDream uses the following URL structure:
```
https://www.elegantdream.in/p/product-name--productId
```

Example:
```
https://www.elegantdream.in/p/hand-painted-wooden-jharokha-miniature-window-panel--68d78d2c293b99ba116e536e
```

### 3. **Scraping Strategy**

Since ElegantDream is a React SPA (Single Page Application), the scraper uses multiple approaches:

#### **Primary Method: API Integration**
- Extracts product ID from URL (part after `--`)
- Attempts to fetch product data from API endpoint:
  ```
  https://www.elegantdream.in/api/products/{productId}
  ```
- Parses JSON response for:
  - Product name/title
  - Price
  - Image URL

#### **Fallback Method: Meta Tags**
If API fails, the scraper falls back to parsing HTML meta tags:
- **Open Graph tags**: `og:title`, `og:image`
- **Product meta tags**: `product:price:amount`
- **JSON-LD structured data**: Schema.org product markup

### 4. **Data Extraction**

The scraper extracts:
- ✅ **Title**: Product name
- ✅ **Price**: Current price in INR
- ✅ **Currency**: INR (Indian Rupees)
- ✅ **Image**: Product image URL
- ✅ **Platform**: "ElegantDream"

## Usage

### Adding ElegantDream Products

1. **Copy product URL** from elegantdream.in
   ```
   https://www.elegantdream.in/p/product-name--productId
   ```

2. **Paste in Price Tracker**
   - Go to your dashboard
   - Paste the URL in the "Add Product" field
   - Click "Add Product"

3. **Track Price**
   - Product will be added with current price
   - 180 days of historical price data generated
   - Refresh anytime to get latest price

### Example Products

You can track any product from ElegantDream, such as:
- Home decor items
- Handicrafts
- Furniture
- Art pieces
- Decorative items

## Technical Details

### Scraper Code Location
```
scraper/scraper_service.py
```

### Platform Detection
```python
elif 'elegantdream' in domain:
    return 'ElegantDream'
```

### API Integration
```python
# Extract product ID from URL
url_parts = url.split('--')
product_id = url_parts[-1].strip('/')

# Fetch from API
api_url = f'https://www.elegantdream.in/api/products/{product_id}'
api_response = requests.get(api_url, headers=headers, timeout=10)
product_data = api_response.json()
```

### Fallback Parsing
```python
# Try Open Graph tags
title_meta = soup.find('meta', {'property': 'og:title'})
price_meta = soup.find('meta', {'property': 'product:price:amount'})
img_meta = soup.find('meta', {'property': 'og:image'})

# Try JSON-LD structured data
json_ld = soup.find('script', {'type': 'application/ld+json'})
```

## Features

✅ **Automatic Detection** - Recognizes ElegantDream URLs automatically  
✅ **API Integration** - Fast and reliable data fetching  
✅ **Fallback Support** - Works even if API changes  
✅ **INR Currency** - Prices in Indian Rupees  
✅ **Image Support** - Product images displayed  
✅ **Price History** - Full 180-day tracking  

## Troubleshooting

### Product Not Found
- Ensure the URL is a direct product page
- URL must contain `--` followed by product ID
- Check if product is still available on the website

### Price Not Detected
- The scraper will try multiple methods
- Check scraper logs for detailed error messages
- Ensure Python scraper service is running on port 5001

### API Errors
- If API endpoint changes, fallback to meta tags will be used
- Check console logs for API response details

## Comparison with Other Platforms

| Feature | Amazon | Flipkart | ElegantDream |
|---------|--------|----------|--------------|
| Detection | ✅ | ✅ | ✅ |
| API Integration | ❌ | ❌ | ✅ |
| Meta Tags | ✅ | ✅ | ✅ |
| JSON-LD | ✅ | ❌ | ✅ |
| Currency | USD/INR | INR | INR |
| Speed | Medium | Medium | Fast |

## Future Enhancements

- [ ] Support for product variants
- [ ] Stock availability tracking
- [ ] Discount/sale detection
- [ ] Multiple image support
- [ ] Product reviews integration

---

**Integration completed on**: November 4, 2025  
**Status**: ✅ Fully Operational
