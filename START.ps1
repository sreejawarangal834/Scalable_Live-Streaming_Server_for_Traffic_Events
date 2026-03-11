#!/usr/bin/env pwsh
# Quick Start Script for SIEM Dashboard

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║     STARTING SIEM DASHBOARD SYSTEM                         ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start services
Write-Host "[1/4] Starting Docker services..." -ForegroundColor Yellow
docker compose up -d
Start-Sleep -Seconds 5
Write-Host "Services started!" -ForegroundColor Green
Write-Host ""

# Step 2: Check health
Write-Host "[2/4] Checking health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health"
    Write-Host "Health: $($health.status)" -ForegroundColor Green
    Write-Host "Viewers: $($health.totalViewers)" -ForegroundColor White
    Write-Host "Broadcasters: $($health.totalBroadcasters)" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "Health check failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run this to check logs:" -ForegroundColor Yellow
    Write-Host "docker logs live-stream-system-signaling-server-1 --tail 20" -ForegroundColor Cyan
    exit 1
}

# Step 3: Open dashboard
Write-Host "[3/4] Opening SIEM Dashboard..." -ForegroundColor Yellow
Start-Process "http://localhost:8080/dashboard-siem.html"
Start-Sleep -Seconds 2
Write-Host "Dashboard opened!" -ForegroundColor Green
Write-Host ""

# Step 4: Open broadcaster
Write-Host "[4/4] Opening Broadcaster..." -ForegroundColor Yellow
Start-Process "http://localhost:8080/broadcaster.html"
Write-Host "Broadcaster opened!" -ForegroundColor Green
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║     SYSTEM READY                                           ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. In the Broadcaster page:" -ForegroundColor White
Write-Host "   - Click Start Broadcast" -ForegroundColor Gray
Write-Host "   - Allow camera and microphone permissions" -ForegroundColor Gray
Write-Host "   - Wait for Broadcasting message" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Test with viewer bots:" -ForegroundColor White
Write-Host "   cd viewer-bots" -ForegroundColor Cyan
Write-Host "   node viewer-bot-simple.js --users 100" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Watch the SIEM dashboard update in real time!" -ForegroundColor White
Write-Host ""

Write-Host "URLS:" -ForegroundColor Yellow
Write-Host "   SIEM Dashboard:  http://localhost:8080/dashboard-siem.html" -ForegroundColor Cyan
Write-Host "   Broadcaster:     http://localhost:8080/broadcaster.html" -ForegroundColor Cyan
Write-Host "   Improved Viewer: http://localhost:8080/viewer-fixed.html" -ForegroundColor Cyan
Write-Host ""

Write-Host "WHAT TO VERIFY:" -ForegroundColor Yellow
Write-Host "   - Dark theme with neon cyan accents" -ForegroundColor White
Write-Host "   - No geographic distribution section" -ForegroundColor White
Write-Host "   - Professional SVG icons" -ForegroundColor White
Write-Host "   - Latency stays around 50-300ms" -ForegroundColor White
Write-Host "   - Smooth metric transitions" -ForegroundColor White
Write-Host ""

Write-Host "USEFUL COMMANDS:" -ForegroundColor Yellow
Write-Host "   Stop:    docker compose down" -ForegroundColor Cyan
Write-Host "   Logs:    docker logs -f live-stream-system-signaling-server-1" -ForegroundColor Cyan
Write-Host "   Restart: docker compose restart" -ForegroundColor Cyan
Write-Host ""