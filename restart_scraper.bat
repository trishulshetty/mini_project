@echo off
echo Stopping Python Scraper...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Python Scraper*" 2>nul
timeout /t 2 /nobreak >nul

echo Starting Python Scraper with fresh code...
start "Python Scraper" cmd /k "cd scraper && python scraper_service.py"

echo.
echo Python Scraper restarted!
echo Check the window for "Selenium Available: True"
pause
