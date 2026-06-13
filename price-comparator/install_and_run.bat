이ㄹㄷㅏㄴ@echo off
title Price Comparator - Install

echo.
echo  ====================================
echo   Installing required libraries...
echo  ====================================
echo.

python -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo  [ERROR] Installation failed. Check your internet connection.
    pause
    exit /b 1
)

echo  Installation complete. Starting program...
echo.
python main.py
