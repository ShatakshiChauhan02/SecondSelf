# SecondSelf Frontend Start Script for Windows PowerShell
Write-Host "Starting SecondSelf Frontend..." -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend node_modules..." -ForegroundColor Yellow
    npm install
}

Write-Host "Launching Vite dev server on http://127.0.0.1:5173..." -ForegroundColor Green
npm run dev
