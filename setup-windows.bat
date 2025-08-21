@echo off
REM Windows Setup Script for Tag Manager V2
REM This script sets up the Windows development environment

echo ========================================
echo  Tag Manager V2 - Windows Setup
echo ========================================
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Python found:
python --version
echo.

REM Check if virtual environment exists
if exist ".venv" (
    echo Virtual environment already exists.
    set /p recreate="Do you want to recreate it? (y/n): "
    if /i "%recreate%"=="y" (
        echo Removing existing virtual environment...
        rmdir /s /q .venv
        goto create_venv
    )
) else (
    :create_venv
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
)

echo.
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo.
echo Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo WARNING: Failed to upgrade pip, continuing anyway...
)

echo.
echo Installing requirements...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install requirements
    echo Please check requirements.txt and try again
    pause
    exit /b 1
)

echo.
echo Setup completed successfully!
echo.
echo To activate the virtual environment in the future:
echo   call .venv\Scripts\activate.bat
echo.
echo To run the FastAPI application:
echo   python -m uvicorn app_fastapi:app --host 0.0.0.0 --port 8000 --reload
echo.
echo To run tests:
echo   python test_fastapi.py
echo.
echo API Documentation will be available at:
echo   http://localhost:8000/docs
echo.

pause