# Simple Live Streaming System Monitor
# Usage: .\simple-monitor.ps1

Write-Host "Starting monitor..." -ForegroundColor Green
Write-Host ""

$iteration = 0

while ($true) {
    $iteration++
    Clear-Host
    
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "       LIVE STREAMING SYSTEM - REAL-TIME MONITOR" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -ErrorAction Stop
        
        Write-Host "SYSTEM STATUS" -ForegroundColor Yellow
        Write-Host "  Status: " -NoNewline
        Write-Host $health.status -ForegroundColor Green
        Write-Host "  Total Rooms: $($health.totalRooms)"
        Write-Host ""
        
        if ($health.rooms.Count -gt 0) {
            Write-Host "ACTIVE ROOMS" -ForegroundColor Magenta
            foreach ($room in $health.rooms) {
                Write-Host "  Room ID: " -NoNewline
                Write-Host $room.roomId -ForegroundColor Yellow
                Write-Host "    Broadcaster: " -NoNewline
                if ($room.hasBroadcaster) {
                    Write-Host "ONLINE" -ForegroundColor Green
                } else {
                    Write-Host "OFFLINE" -ForegroundColor Red
                }
                Write-Host "    Viewers: " -NoNewline
                
                $count = $room.viewerCount
                if ($count -eq 0) { $color = "Gray" }
                elseif ($count -lt 10) { $color = "Green" }
                elseif ($count -lt 50) { $color = "Cyan" }
                elseif ($count -lt 100) { $color = "Yellow" }
                else { $color = "Red" }
                
                Write-Host $count -ForegroundColor $color
                
                # Simple progress bar
                $bar = ""
                $filled = [Math]::Min([Math]::Floor($count / 5), 20)
                for ($i = 0; $i -lt $filled; $i++) { $bar += "█" }
                for ($i = $filled; $i -lt 20; $i++) { $bar += "░" }
                Write-Host "    [$bar]" -ForegroundColor $color
            }
        } else {
            Write-Host "ACTIVE ROOMS" -ForegroundColor Magenta
            Write-Host "  No active rooms" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "DOCKER CONTAINERS" -ForegroundColor Blue
        
        $stats = docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" 2>$null
        if ($stats) {
            foreach ($line in $stats -split "`n") {
                if ($line) {
                    $parts = $line -split ","
                    if ($parts.Count -ge 3) {
                        $name = $parts[0] -replace "live-stream-system-", ""
                        $cpu = $parts[1]
                        $mem = $parts[2]
                        Write-Host "  $name" -NoNewline
                        Write-Host " - CPU: $cpu, MEM: $mem" -ForegroundColor Cyan
                    }
                }
            }
        }
        
    } catch {
        Write-Host "ERROR: Cannot connect to health endpoint" -ForegroundColor Red
        Write-Host "Make sure services are running: docker-compose up -d" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor DarkGray
    Write-Host "Updated: $(Get-Date -Format 'HH:mm:ss') | Iteration: $iteration | Press Ctrl+C to stop" -ForegroundColor Gray
    
    Start-Sleep -Seconds 2
}
