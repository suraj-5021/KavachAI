@echo off
REM KavachAI - Backend Startup Script (Windows)

echo ========================================
echo   KavachAI Backend - Starting Server
echo ========================================
echo.

cd /d "%~dp0"

echo ✓ Python version:
python --version
echo.

echo ✓ Checking dependencies...
python -c "import fastapi, onnxruntime, transformers, optimum; print('All core packages installed')"
if errorlevel 1 (
    echo ✗ Missing dependencies. Run: pip install -r requirements.txt
    pause
    exit /b 1
)
echo.

echo ✓ Running tests...
python -m pytest tests/test_risk_engine.py -v --tb=short
if errorlevel 1 (
    echo ✗ Tests failed. Fix errors before starting server.
    pause
    exit /b 1
)
echo.

echo ✓ All tests passed
echo.
echo Starting FastAPI server on http://127.0.0.1:8000
echo Press Ctrl+C to stop
echo.
python main.py
