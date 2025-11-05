@echo off
echo ========================================
echo   Installing Price Tracker Dependencies
echo ========================================
echo.

echo [1/4] Installing root dependencies...
call npm install
echo.

echo [2/4] Installing server dependencies...
cd server
call npm install
cd ..
echo.

echo [3/4] Installing client dependencies...
cd client
call npm install
cd ..
echo.

echo [4/4] Installing Python dependencies...
cd scraper
pip install -r requirements.txt
cd ..
echo.

echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo To start the application, run:
echo   start.bat  (or)  start.ps1
echo.
pause
