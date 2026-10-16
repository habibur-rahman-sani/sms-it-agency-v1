@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js ইনস্টল করা নেই। খোলা পেজ থেকে LTS ভার্সন নামিয়ে ইনস্টল করে আবার এই ফাইলে ডাবল ক্লিক করুন।
  start https://nodejs.org
  pause
  exit /b
)
set ADMIN_PASSWORD=admin123
set PORT=3000
echo সাইট: http://localhost:3000
echo অ্যাডমিন: http://localhost:3000/admin   পাসওয়ার্ড: admin123
echo বন্ধ করতে এই উইন্ডোটি বন্ধ করুন।
start "" /min cmd /c "timeout /t 2 >nul && start http://localhost:3000"
node server.js
pause
