@echo off
title Build EXE

echo.
echo  ====================================
echo   Building standalone EXE...
echo  ====================================
echo.

echo  [1/3] Installing PyInstaller...
python -m pip install pyinstaller --quiet
if %errorlevel% neq 0 (
    echo  [ERROR] PyInstaller installation failed.
    pause
    exit /b 1
)

echo  [2/3] Installing required libraries...
python -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo  [ERROR] Library installation failed.
    pause
    exit /b 1
)

echo  [3/3] Building EXE file... (this may take a few minutes)
echo.
pyinstaller --onefile --windowed --name "단가비교프로그램" --clean --add-data "doenc_logo.png;." main.py

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo  ====================================
echo   Build complete!
echo   File location: dist\단가비교프로그램.exe
echo  ====================================
echo.
pause
