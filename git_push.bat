@echo off
cd /d "D:\ADMIN\Documents\HMC AI\NexCA"
git init
git add .
git commit -m "Initial commit - NexPro Practice Management System"
git branch -M main
git remote add origin https://github.com/hiyamajithiya/NexPro.git
git push -u origin main
pause
