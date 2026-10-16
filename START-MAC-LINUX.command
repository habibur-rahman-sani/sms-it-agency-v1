#!/bin/sh
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js ইনস্টল করুন: https://nodejs.org (LTS)"; exit 1; }
export ADMIN_PASSWORD=admin123 PORT=3000
echo "সাইট: http://localhost:3000"
echo "অ্যাডমিন: http://localhost:3000/admin   পাসওয়ার্ড: admin123"
(sleep 2; (open http://localhost:3000 || xdg-open http://localhost:3000) >/dev/null 2>&1) &
node server.js
