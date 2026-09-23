#!/bin/bash
# KavachAI — Backend Startup Script

echo "========================================"
echo "  KavachAI Backend — Starting Server"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "✓ Python version:"
python --version
echo ""

echo "✓ Checking dependencies..."
python -c "import fastapi, onnxruntime, transformers, optimum; print('All core packages installed')"
echo ""

echo "✓ Running tests..."
python -m pytest tests/test_risk_engine.py -v --tb=short
echo ""

if [ $? -eq 0 ]; then
    echo "✓ All tests passed"
    echo ""
    echo "Starting FastAPI server on http://127.0.0.1:8000"
    echo "Press Ctrl+C to stop"
    echo ""
    python main.py
else
    echo "✗ Tests failed. Fix errors before starting server."
    exit 1
fi
