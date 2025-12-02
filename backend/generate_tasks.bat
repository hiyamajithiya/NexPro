@echo off
REM Automated Task Generation Script for NexCA
REM This script generates upcoming work instances for all active clients

echo ========================================
echo NexCA - Automated Task Generation
echo ========================================
echo.

python manage.py generate_work_instances --lookforward-months=6

echo.
echo ========================================
echo Task generation completed!
echo ========================================
pause
