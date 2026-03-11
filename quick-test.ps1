#!/usr/bin/env pwsh
# Quick Analytics Test Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANALYTICS DASHBOARD - QUICK TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "[1/4] Checking services..." -ForegroundColor Yellow
$services = docker compose ps --format json | ConvertFrom-Json
$running = ($services | Where-Object { $_.State -eq "running" }).Count

if ($running -lt 3) {
    Write-Host "Services not running! Starting..." -ForegroundColor Red
    docker compose up -d
    Start-Sleep -Seconds 5
}

Write-Host "All services running!" -ForegroundColor Green
Write-Host ""

# Check health
Write-Host "[2/4] Checking health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "Health: $($health.status)" -ForegroundColor Green
    Write-Host "Viewers: $($health.totalViewers)" -ForegroundColor White
    Write-Host "Broadcasters: $($health.totalBroadcasters)" -ForegroundColor White
} catch {
    Write-Host "Health check failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Open dashboard
Write-Host "[3/4] Opening dashboard..." -ForegroundColor Yellow
Start-Process "http://localhost:8080/dashboard.html"
Start-Sleep -Seconds 2
Write-Host "Dashboard opened!" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "[4/4] Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Dashboard is now open in your browser" -ForegroundColor White
Write-Host "   - You should see all metrics at 0" -ForegroundColor Gray
Write-Host "   - Stream Status: OFFLINE" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Open broadcaster (in new tab):" -ForegroundColor White
Write-Host "   http://localhost:8080/broadcaster.html" -ForegroundColor Cyan
Write-Host "   - Click 'Start Broadcast'" -ForegroundColor Gray
Write-Host "   - Allow camera permissions" -ForegroundColor Gray
Write-Host "   - Dashboard should show 'ONLINE'" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Test with 10 viewers:" -ForegroundColor White
Write-Host "   cd viewer-bots" -ForegroundColor Cyan
Write-Host "   node viewer-bot-simple.js --users 10" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Test with 100 viewers:" -ForegroundColor White
Write-Host "   node viewer-bot-simple.js --users 100" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  READY TO TEST!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press Enter to open broadcaster page..." -ForegroundColor Yellow
Read-Host

Start-Process "http://localhost:8080/broadcaster.html"

Write-Host ""
Write-Host "Broadcaster page opened!" -ForegroundColor Green
Write-Host "Click 'Start Broadcast' and watch the dashboard update!" -ForegroundColor White
Write-Host ""
