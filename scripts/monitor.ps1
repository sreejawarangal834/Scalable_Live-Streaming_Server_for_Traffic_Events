###############################################################################
# LIVE STREAMING SYSTEM MONITOR
# 
# Real-time dashboard showing:
# - System status
# - Active rooms
# - Broadcaster status
# - Viewer count
# - Docker resource usage
# - Connection statistics
#
# Usage: .\monitor.ps1
# Press Ctrl+C to stop
###############################################################################

# Function to get health data
function Get-HealthData {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -ErrorAction Stop
        return $response
    } catch {
        return $null
    }
}

# Function to get Docker stats
function Get-DockerStats {
    try {
        $stats = docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" 2>$null
        return $stats
    } catch {
        return $null
    }
}

# Function to format bytes
function Format-Bytes {
    param([string]$bytes)
    if ($bytes -match '(\d+\.?\d*)([A-Za-z]+)') {
        return "$($matches[1])$($matches[2])"
    }
    return $bytes
}

# Main monitoring loop
Write-Host "Starting Live Streaming System Monitor..." -ForegroundColor Green
Write-Host "Connecting to http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 1

$iteration = 0

while ($true) {
    $iteration++
    Clear-Host
    
    # Header
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        LIVE STREAMING SYSTEM - REAL-TIME MONITOR          ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Get health data
    $health = Get-HealthData
    
    if ($health) {
        # System Status
        Write-Host "┌─ SYSTEM STATUS ─────────────────────────────────────────┐" -ForegroundColor Yellow
        Write-Host "│ Status: " -NoNewline
        if ($health.status -eq "ok") {
            Write-Host "✓ ONLINE" -ForegroundColor Green -NoNewline
        } else {
            Write-Host "✗ OFFLINE" -ForegroundColor Red -NoNewline
        }
        Write-Host " " * 45 "│"
        
        Write-Host "│ Total Rooms: " -NoNewline
        Write-Host "$($health.totalRooms)" -ForegroundColor Cyan -NoNewline
        Write-Host " " * 43 "│"
        
        Write-Host "│ Timestamp: " -NoNewline
        Write-Host "$($health.timestamp)" -ForegroundColor Gray -NoNewline
        Write-Host " " * 20 "│"
        Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
        Write-Host ""
        
        # Room Information
        if ($health.rooms.Count -gt 0) {
            Write-Host "┌─ ACTIVE ROOMS ──────────────────────────────────────────┐" -ForegroundColor Magenta
            
            foreach ($room in $health.rooms) {
                Write-Host "│" -ForegroundColor Magenta -NoNewline
                Write-Host " Room ID: " -NoNewline
                Write-Host "$($room.roomId)" -ForegroundColor Yellow -NoNewline
                Write-Host " " * 45 "│" -ForegroundColor Magenta
                
                Write-Host "│" -ForegroundColor Magenta -NoNewline
                Write-Host "   Broadcaster: " -NoNewline
                if ($room.hasBroadcaster) {
                    Write-Host "✓ STREAMING" -ForegroundColor Green -NoNewline
                } else {
                    Write-Host "✗ OFFLINE" -ForegroundColor Red -NoNewline
                }
                Write-Host " " * 38 "│" -ForegroundColor Magenta
                
                Write-Host "│" -ForegroundColor Magenta -NoNewline
                Write-Host "   Connected Viewers: " -NoNewline
                
                $viewerCount = $room.viewerCount
                $color = "White"
                if ($viewerCount -eq 0) { $color = "Gray" }
                elseif ($viewerCount -lt 10) { $color = "Green" }
                elseif ($viewerCount -lt 50) { $color = "Cyan" }
                elseif ($viewerCount -lt 100) { $color = "Yellow" }
                else { $color = "Red" }
                
                Write-Host "$viewerCount" -ForegroundColor $color -NoNewline
                
                # Progress bar
                $barLength = 20
                $filled = [Math]::Min([Math]::Floor($viewerCount / 5), $barLength)
                $empty = $barLength - $filled
                
                Write-Host " [" -NoNewline
                Write-Host ("█" * $filled) -ForegroundColor $color -NoNewline
                Write-Host ("░" * $empty) -ForegroundColor DarkGray -NoNewline
                Write-Host "]" -NoNewline
                
                $padding = 56 - 23 - $viewerCount.ToString().Length - 23
                Write-Host (" " * $padding) -NoNewline
                Write-Host "│" -ForegroundColor Magenta
            }
            
            Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Magenta
        } else {
            Write-Host "┌─ ACTIVE ROOMS ──────────────────────────────────────────┐" -ForegroundColor Magenta
            Write-Host "│ No active rooms                                         │" -ForegroundColor Gray
            Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Magenta
        }
        Write-Host ""
        
        # Docker Stats
        Write-Host "┌─ DOCKER CONTAINERS ─────────────────────────────────────┐" -ForegroundColor Blue
        $dockerStats = Get-DockerStats
        
        if ($dockerStats) {
            $statsArray = $dockerStats -split "`n"
            foreach ($stat in $statsArray) {
                if ($stat) {
                    $parts = $stat -split ","
                    if ($parts.Count -ge 3) {
                        $name = $parts[0] -replace "live-stream-system-", ""
                        $cpu = $parts[1]
                        $mem = $parts[2]
                        
                        Write-Host "│" -ForegroundColor Blue -NoNewline
                        Write-Host " $name" -NoNewline
                        
                        $nameLen = $name.Length
                        $padding1 = 25 - $nameLen
                        Write-Host (" " * $padding1) -NoNewline
                        
                        Write-Host "CPU: " -NoNewline
                        $cpuValue = [double]($cpu -replace "%", "")
                        if ($cpuValue -lt 30) {
                            Write-Host $cpu -ForegroundColor Green -NoNewline
                        } elseif ($cpuValue -lt 70) {
                            Write-Host $cpu -ForegroundColor Yellow -NoNewline
                        } else {
                            Write-Host $cpu -ForegroundColor Red -NoNewline
                        }
                        
                        Write-Host "  MEM: " -NoNewline
                        Write-Host $mem -ForegroundColor Cyan -NoNewline
                        
                        $totalLen = 25 + 5 + $cpu.Length + 7 + $mem.Length
                        $padding2 = 58 - $totalLen
                        Write-Host (" " * $padding2) -NoNewline
                        Write-Host "│" -ForegroundColor Blue
                    }
                }
            }
        } else {
            Write-Host "│ Unable to fetch Docker stats                            │" -ForegroundColor Gray
        }
        
        Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Blue
        
    } else {
        # Error state
        Write-Host "┌─ CONNECTION ERROR ──────────────────────────────────────┐" -ForegroundColor Red
        Write-Host "│ ✗ Cannot connect to http://localhost:3001/health       │" -ForegroundColor Red
        Write-Host "│                                                         │" -ForegroundColor Red
        Write-Host "│ Make sure services are running:                         │" -ForegroundColor Yellow
        Write-Host "│   docker-compose up -d                                  │" -ForegroundColor Gray
        Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "Last updated: " -NoNewline -ForegroundColor Gray
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White -NoNewline
    Write-Host " | Refresh: 2s | Iteration: $iteration" -ForegroundColor Gray
    Write-Host "Press Ctrl+C to stop" -ForegroundColor DarkGray
    
    Start-Sleep -Seconds 2
}
