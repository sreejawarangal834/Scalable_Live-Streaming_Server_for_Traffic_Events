# Start Live Stream Analytics System
# This script starts all services and opens the dashboard

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     LIVE STREAM ANALYTICS SYSTEM - QUICK START            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Step 1: Stopping existing services..." -ForegroundColor Yellow
docker-compose down 2>$null

Write-Host "Step 2: Rebuilding signaling server with analytics..." -ForegroundColor Yellow
docker-compose build --no-cache signaling-server

Write-Host "Step 3: Starting all services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Step 4: Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "Step 5: Checking service status..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  SERVICES STARTED!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Opening dashboard and broadcaster..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

# Open dashboard
Write-Host "  → Dashboard: http://localhost:8080/dashboard.html" -ForegroundColor White
Start-Process "http://localhost:8080/dashboard.html"

Start-Sleep -Seconds 1

# Open broadcaster
Write-Host "  → Broadcaster: http://localhost:8080/broadcaster.html" -ForegroundColor White
Start-Process "http://localhost:8080/broadcaster.html"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. In BROADCASTER tab:" -ForegroundColor White
Write-Host "   → Click 'Start Broadcast'" -ForegroundColor Gray
Write-Host "   → Allow camera permissions" -ForegroundColor Gray
Write-Host ""
Write-Host "2. In DASHBOARD tab:" -ForegroundColor White
Write-Host "   → Watch real-time metrics" -ForegroundColor Gray
Write-Host "   → Stream status should show ONLINE" -ForegroundColor Gray
Write-Host ""
Write-Host "3. To simulate 100 viewers:" -ForegroundColor White
Write-Host "   → Open new PowerShell window" -ForegroundColor Gray
Write-Host "   → cd viewer-bots" -ForegroundColor Gray
Write-Host "   → node viewer-bot-simple.js --users 100" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Watch the dashboard update in real-time!" -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "MONITORING COMMANDS:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  View logs:        docker logs -f live-stream-system-signaling-server-1" -ForegroundColor Gray
Write-Host "  Check health:     curl http://localhost:3001/health" -ForegroundColor Gray
Write-Host "  Monitor resources: docker stats" -ForegroundColor Gray
Write-Host "  Stop services:    docker-compose down" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
