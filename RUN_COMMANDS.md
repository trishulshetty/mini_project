# 🚀 Price Tracker - Run Commands

## Quick Start (Easiest)

### Windows Command Prompt / PowerShell
```bash
# Double-click one of these files:
start.bat          # For Command Prompt
start.ps1          # For PowerShell
```

## Individual Service Commands

### Backend Server (Port 5000)
```bash
cd server
node index.js
```

### Python Scraper (Port 5001)
```bash
cd scraper
python scraper_service.py
```

### React Frontend (Port 3000)
```bash
cd client
npm start
```

## NPM Scripts (From Root Directory)

### Run All Services Together
```bash
npm run dev
```

### Run Individual Services
```bash
npm run server    # Backend only
npm run client    # Frontend only
npm run scraper   # Python scraper only
```

## Installation Commands

### Install All Dependencies at Once
```bash
npm run install-all
```

### Or Install Manually
```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install
cd ..

# Client dependencies
cd client
npm install
cd ..

# Python dependencies
cd scraper
pip install -r requirements.txt
cd ..
```

## Single Line Commands

### Start Backend
```bash
cd server && node index.js
```

### Start Scraper
```bash
cd scraper && python scraper_service.py
```

### Start Frontend
```bash
cd client && npm start
```

### Start All (Windows - 3 separate terminals)
```bash
start cmd /k "cd server && node index.js" && start cmd /k "cd scraper && python scraper_service.py" && start cmd /k "cd client && npm start"
```

### Start All (PowerShell - 3 separate windows)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node index.js"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd scraper; python scraper_service.py"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm start"
```

## Environment Setup

### Create .env file (if not exists)
```bash
cd server
copy .env.example .env
cd ..
```

## Stopping Services

### Kill All Node Processes
```bash
taskkill /F /IM node.exe
```

### Kill Python Processes
```bash
taskkill /F /IM python.exe
```

### Kill Specific Ports
```bash
# Kill port 5000 (Backend)
netstat -ano | findstr :5000
taskkill /F /PID <PID>

# Kill port 5001 (Scraper)
netstat -ano | findstr :5001
taskkill /F /PID <PID>

# Kill port 3000 (Frontend)
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Python Scraper**: http://localhost:5001
- **Backend Health**: http://localhost:5000/api/auth
- **Scraper Health**: http://localhost:5001/health

## Recommended Workflow

1. **First Time Setup**:
   ```bash
   install.bat
   ```

2. **Daily Development**:
   ```bash
   start.bat
   ```

3. **Access Application**:
   - Open browser: http://localhost:3000
   - Register/Login
   - Add products and track prices!

## Troubleshooting

### Port Already in Use
```bash
# Find and kill the process
netstat -ano | findstr :5000
taskkill /F /PID <PID>
```

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
# Default connection: mongodb://localhost:27017/price-tracker
```

### Python Dependencies Error
```bash
cd scraper
pip install --upgrade pip
pip install -r requirements.txt
```

### React Build Error
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```
