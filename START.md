# Quick Start Guide

## First Time Setup

### 1. Install Node.js Dependencies
```bash
npm run install-all
```

### 2. Install Python Dependencies
```bash
cd scraper
pip install -r requirements.txt
cd ..
```

### 3. Create Environment File
Create `server/.env` file with:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/price-tracker
JWT_SECRET=change_this_to_a_secure_random_string
NODE_ENV=development
```

### 4. Start MongoDB
```bash
# Windows
net start MongoDB

# Or manually
mongod
```

## Running the Application

### Open 2 Terminal Windows:

**Terminal 1 - Python Scraper:**
```bash
cd scraper
python scraper_service.py
```
Wait for: "Starting Python Scraper Service on port 5001..."

**Terminal 2 - Node.js + React:**
```bash
npm run dev
```
Wait for both servers to start.

### Access the Application
Open your browser and go to: **http://localhost:3000**

## Architecture

```
┌─────────────────┐
│  React Frontend │  (Port 3000)
│   (Client UI)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Express API    │  (Port 5000)
│  (Node.js)      │
└────┬───────┬────┘
     │       │
     ↓       ↓
┌─────────┐ ┌──────────────┐
│ MongoDB │ │ Python Flask │  (Port 5001)
│   DB    │ │   Scraper    │
└─────────┘ └──────────────┘
```

## Test URLs

Try these product URLs to test the scraper:

**Amazon:**
- https://www.amazon.com/dp/B08N5WRWNW (Example product)

**eBay:**
- https://www.ebay.com/itm/[any-product-id]

**Walmart:**
- https://www.walmart.com/ip/[any-product-id]

## Troubleshooting

**"Cannot connect to MongoDB"**
- Start MongoDB: `net start MongoDB`

**"Python scraper not responding"**
- Make sure Terminal 1 is running the Python service
- Check Chrome browser is installed

**"Port already in use"**
- Close other applications using ports 3000, 5000, or 5001
- Or change ports in configuration files

## Features to Try

1. **Register** - Create a new account
2. **Login** - Sign in with your credentials
3. **Add Product** - Paste any e-commerce product URL
4. **View Dashboard** - See all tracked products
5. **Refresh Price** - Update current price manually
6. **Delete Product** - Remove products from tracking
7. **Logout** - Sign out securely

Enjoy tracking prices! 🎉
