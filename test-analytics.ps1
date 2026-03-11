# Analytics Dashboard Testing Script
# This script rebuilds the Docker containers and guides you through testing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANALYTICS DASHBOARD TEST SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop existing containers
Write-Host "[1/6] Stopping existing containers..." -ForegroundColor Yellow
docker compose down
Write-Host "Containers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Rebuild signaling server
Write-Host "[2/6] Rebuilding signaling server with analytics..." -ForegroundColor Yellow
docker compose build --no-cache signaling-server

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build complete" -ForegroundColor Green
Write-Host ""

# Step 3: Start all services
Write-Host "[3/6] Starting all services..." -ForegroundColor Yellow
docker compose up -d
Start-Sleep -Seconds 5
Write-Host " Services started" -ForegroundColor Green
Write-Host ""

# Step 4: Check health
# Step 4: Check health
Write-Host "[4/6] Checking service health..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest "http://localhost:3001/health"
    Write-Host ("Health check passed: " + $response.Content) -ForegroundColor Green
}
catch {
    Write-Host "Health check failed!" -ForegroundColor Red
    Write-Host "Showing logs:" -ForegroundColor Yellow
    docker logs live-stream-system-signaling-server-1 --tail 20
    exit 1
}

Write-Host ""

# Step 5: Show container status
Write-Host "[5/6] Container status:" -ForegroundColor Yellow
docker compose ps
Write-Host ""

# Step 6: Instructions
Write-Host "[6/6] READY TO TEST!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTING INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Open Dashboard:" -ForegroundColor Yellow
Write-Host "   http://localhost:8080/dashboard.html" -ForegroundColor White
Write-Host ""

Write-Host "2. Open Broadcaster (in new tab):" -ForegroundColor Yellow
Write-Host "   http://localhost:8080/broadcaster.html" -ForegroundColor White
Write-Host "   - Click 'Start Broadcast'" -ForegroundColor Gray
Write-Host "   - Allow camera permissions" -ForegroundColor Gray
Write-Host "   - Check dashboard shows 'ONLINE'" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Test with 10 viewers:" -ForegroundColor Yellow
Write-Host "   cd viewer-bots" -ForegroundColor White
Write-Host "   node viewer-bot-simple.js --users 10" -ForegroundColor White
Write-Host ""

Write-Host "4. Test with 100 viewers:" -ForegroundColor Yellow
Write-Host "   node viewer-bot-simple.js --users 100" -ForegroundColor White
Write-Host ""

Write-Host "5. Watch the dashboard update in real-time!" -ForegroundColor Yellow
Write-Host "   - Viewer count should increase" -ForegroundColor Gray
Write-Host "   - Graphs should animate" -ForegroundColor Gray
Write-Host "   - CPU/Memory metrics should update" -ForegroundColor Gray
Write-Host "   - Geographic distribution should populate" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MONITORING COMMANDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  docker logs -f live-stream-system-signaling-server-1" -ForegroundColor White
Write-Host ""

Write-Host "Monitor resources:" -ForegroundColor Yellow
Write-Host "  docker stats" -ForegroundColor White
Write-Host ""

Write-Host "Stop system:" -ForegroundColor Yellow
Write-Host "  docker compose down" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to open the dashboard in your browser..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open dashboard in default browser
Start-Process "http://localhost:8080/dashboard.html"

Write-Host ""
Write-Host "Dashboard opened! Follow the testing instructions above." -ForegroundColor Green
Write-Host ""