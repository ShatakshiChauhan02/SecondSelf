# SecondSelf Backend Start Script for Windows PowerShell
Write-Host "Starting SecondSelf Backend..." -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\backend"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Activating virtual environment & installing dependencies..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt

Write-Host "Launching FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Green
uvicorn app.main:app --reload --port 8000
