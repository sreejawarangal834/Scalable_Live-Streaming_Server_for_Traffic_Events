#!/usr/bin/env pwsh
# SIEM Dashboard Test Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIEM DASHBOARD - TEST SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "[1/5] Checking services..." -ForegroundColor Yellow
$services = docker compose ps --format json 2>$null | ConvertFrom-Json
if ($services) {
    $running = ($services | Where-Object { $_.State -eq "running" }).Count
    if ($running -lt 3) {
        Write-Host "Services not fully running. Starting..." -ForegroundColor Yellow
        docker compose up -d
        Start-Sleep -Seconds 5
    }
    Write-Host "All services running!" -ForegroundColor Green
} else {
    Write-Host "Starting services..." -ForegroundColor Yellow
    docker compose up -d
    Start-Sleep -Seconds 5
}
Write-Host ""

# Rebuild signaling server with updated code
Write-Host "[2/5] Rebuilding signaling server..." -ForegroundColor Yellow
docker compose build --no-cache signaling-server
docker compose up -d signaling-server
Start-Sleep -Seconds 3
Write-Host "Server rebuilt!" -ForegroundColor Green
Write-Host ""

# Check health
Write-Host "[3/5] Checking health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "Health: $($health.status)" -ForegroundColor Green
    Write-Host "Viewers: $($health.totalViewers)" -ForegroundColor White
    Write-Host "Broadcasters: $($health.totalBroadcasters)" -ForegroundColor White
} catch {
    Write-Host "Health check failed! Check logs:" -ForegroundColor Red
    Write-Host "docker logs live-stream-system-signaling-server-1 --tail 20" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Open SIEM dashboard
Write-Host "[4/5] Opening SIEM dashboard..." -ForegroundColor Yellow
Start-Process "http://localhost:8080/dashboard-siem.html"
Start-Sleep -Seconds 2
Write-Host "Dashboard opened!" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "[5/5] Testing Instructions:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ SIEM Dashboard Features to Verify:" -ForegroundColor Cyan
Write-Host "   1. Dark theme with neon accents" -ForegroundColor White
Write-Host "   2. No geographic distribution section" -ForegroundColor White
Write-Host "   3. Professional SVG icons (no emojis)" -ForegroundColor White
Write-Host "   4. Grid overlay effect" -ForegroundColor White
Write-Host "   5. 5 metric cards at top" -ForegroundColor White
Write-Host "   6. 3 graphs in middle" -ForegroundColor White
Write-Host "   7. 3 panels at bottom" -ForegroundColor White
Write-Host ""

Write-Host "✅ Test Latency Behavior (Fixed):" -ForegroundColor Cyan
Write-Host "   1. Open broadcaster:" -ForegroundColor White
Write-Host "      http://localhost:8080/broadcaster.html" -ForegroundColor Gray
Write-Host "   2. Start broadcast" -ForegroundColor White
Write-Host "   3. Run viewer bots:" -ForegroundColor White
Write-Host "      cd viewer-bots" -ForegroundColor Gray
Write-Host "      node viewer-bot-simple.js --users 100" -ForegroundColor Gray
Write-Host "   4. Watch latency graph - should stay 50-300ms" -ForegroundColor White
Write-Host ""

Write-Host "✅ Test Viewer Interface (Fixed):" -ForegroundColor Cyan
Write-Host "   1. Open viewer BEFORE broadcaster:" -ForegroundColor White
Write-Host "      http://localhost:8080/viewer-fixed.html" -ForegroundColor Gray
Write-Host "   2. Click 'Join Stream'" -ForegroundColor White
Write-Host "   3. Should show: 'Waiting for broadcaster...'" -ForegroundColor White
Write-Host "   4. Now start broadcaster" -ForegroundColor White
Write-Host "   5. Viewer should connect automatically" -ForegroundColor White
Write-Host ""

Write-Host "✅ Test Realistic Metrics:" -ForegroundColor Cyan
Write-Host "   Run different loads and verify smooth scaling:" -ForegroundColor White
Write-Host "   - 10 viewers:  CPU ~10%, Latency ~60ms" -ForegroundColor Gray
Write-Host "   - 100 viewers: CPU ~40%, Latency ~100ms" -ForegroundColor Gray
Write-Host "   - 500 viewers: CPU ~70%, Latency ~150ms" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QUICK COMMANDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open SIEM Dashboard:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080/dashboard-siem.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open Improved Viewer:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080/viewer-fixed.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open Broadcaster:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080/broadcaster.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test with 100 viewers:" -ForegroundColor Yellow
Write-Host "  cd viewer-bots" -ForegroundColor White
Write-Host "  node viewer-bot-simple.js --users 100" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  docker logs -f live-stream-system-signaling-server-1" -ForegroundColor White
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
Write-Host "Start broadcast and watch the SIEM dashboard update!" -ForegroundColor White
Write-Host ""
