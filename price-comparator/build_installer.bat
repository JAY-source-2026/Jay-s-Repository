@echo off
title Build - Price Comparator

echo.
echo  ============================================================
echo   Building Price Comparator EXE...
echo  ============================================================
echo.

echo  [1/3] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found. Install from https://www.python.org
    pause
    exit /b 1
)
echo  [OK] Python found.
echo.

echo  [2/3] Installing libraries...
python -m pip install pyinstaller pandas openpyxl pdfplumber python-docx tkinterdnd2 Pillow
if %errorlevel% neq 0 (
    echo  [ERROR] Library installation failed.
    pause
    exit /b 1
)
echo  [OK] Done.
echo.

echo  [3/3] Building EXE (3-5 min, do NOT close)...
if exist dist  rmdir /s /q dist
if exist build rmdir /s /q build

python -m PyInstaller --onefile --windowed --name "PriceComparator" --clean --add-data "doenc_logo.png;." main.py

if %errorlevel% neq 0 (
    echo  [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   SUCCESS!
echo   File: dist\PriceComparator.exe
echo  ============================================================
echo.
pause
