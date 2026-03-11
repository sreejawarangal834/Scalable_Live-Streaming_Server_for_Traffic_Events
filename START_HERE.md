# 🚀 START HERE - Analytics Dashboard Quick Test

## What You're About to See

A professional live streaming analytics dashboard similar to YouTube Live or Twitch, showing:
- Real-time viewer count
- Live graphs
- Stream status (ONLINE/OFFLINE)
- Server metrics (CPU, Memory, Bandwidth)
- Latency measurements
- Geographic distribution
- Performance statistics

---

## Quick Start (3 Steps)

### Step 1: Rebuild and Start System

Open PowerShell in the `live-stream-system` directory and run:

```powershell
.\test-analytics.ps1
```

This script will:
- Stop old containers
- Rebuild with analytics
- Start all services
- Check health
- Open the dashboard

**Expected time:** 2-3 minutes

---

### Step 2: Start Broadcasting

1. The dashboard will open automatically
2. Open a new tab: `http://localhost:8080/broadcaster.html`
3. Click "Start Broadcast"
4. Allow camera permissions
5. Switch back to dashboard tab
6. **Verify:** Stream Status shows "ONLINE" (green)

---

### Step 3: Simulate Viewers

Open a new PowerShell window:

```powershell
cd D:\Scalable_Live_Event_Streaming_System\live-stream-system\viewer-bots
node viewer-bot-simple.js --users 100
```

Watch the dashboard:
- Viewer count increases from 0 → 100
- Graphs animate in real-time
- CPU/Memory metrics update
- Geographic distribution populates
- Performance stats update

**Expected time:** 30 seconds to connect 100 viewers

---

## What to Look For

### Dashboard Features (All should work):

✅ **Stream Status Card** - Shows ONLINE (green) when broadcaster connected  
✅ **Active Viewers** - Shows real-time count (0 → 100)  
✅ **Average Latency** - Shows ~50-150ms  
✅ **CPU Usage** - Shows 20-40% with 100 viewers  
✅ **Memory Usage** - Shows 50-70%  
✅ **Bandwidth** - Shows 1-3 Mbps  

✅ **Viewer Activity Graph** - Line chart showing viewer count over time  
✅ **System Resources Graph** - CPU and Memory over time  

✅ **Performance Panel** - Shows:
- Total Connections: 100
- Success Rate: 95-100%
- Failed Connections: 0-5
- Avg Connection Time: ~100ms
- Total Disconnections: 0
- Server Uptime: X minutes

✅ **Geographic Distribution** - Shows viewers across 6 regions:
- North America
- Europe
- Asia
- South America
- Africa
- Oceania

---

## Troubleshooting

### Dashboard shows "Disconnected"

```powershell
# Check if signaling server is running
docker ps

# View logs
docker logs live-stream-system-signaling-server-1

# Restart
docker-compose restart signaling-server
```

### No viewers connecting

```powershell
# Make sure you're in the viewer-bots directory
cd viewer-bots

# Check if node_modules exist
dir node_modules

# If not, install dependencies
npm install ws
```

### Broadcaster not showing as ONLINE

1. Make sure you clicked "Start Broadcast"
2. Check browser console (F12) for errors
3. Allow camera permissions
4. Try refreshing the broadcaster page

---

## Testing Different Scenarios

### Test 1: Small Load (10 viewers)
```powershell
node viewer-bot-simple.js --users 10
```
Expected: Smooth connection, 100% success rate

### Test 2: Medium Load (50 viewers)
```powershell
node viewer-bot-simple.js --users 50
```
Expected: CPU ~20%, Memory ~60%

### Test 3: High Load (100 viewers)
```powershell
node viewer-bot-simple.js --users 100
```
Expected: CPU ~40%, Memory ~70%, Success rate >95%

### Test 4: Stress Test (500 viewers)
```powershell
node viewer-bot-simple.js --users 500
```
Expected: CPU ~70%, Memory ~80%, Success rate >85%

---

## Monitoring Commands

### View real-time logs:
```powershell
docker logs -f live-stream-system-signaling-server-1
```

### Monitor Docker resources:
```powershell
docker stats
```

### Check container status:
```powershell
docker-compose ps
```

### Stop everything:
```powershell
docker-compose down
```

---

## Expected Output

### Bot Terminal:
```
Starting viewer bot simulation...
Target: 100 viewers

Spawning viewers: ████████████████████ 100/100

Spawned: 100/100 | Connected: 98 | Offers: 97 | Failed: 2

✓ Successfully Connected: 98 (98.0%)
✓ Avg Connection Time: 125ms

Viewers are now connected. Press Ctrl+C to disconnect.
```

### Dashboard Display:
```
LIVE STREAM ANALYTICS DASHBOARD

Stream Status: ONLINE
Active Viewers: 98
Avg Latency: 87 ms
CPU Usage: 38%
Memory Usage: 65%
Bandwidth: 2.3 Mbps

[Viewer Activity Graph - showing increase from 0 to 98]
[System Resources Graph - showing CPU and Memory usage]

PERFORMANCE METRICS
Total Connections: 98
Success Rate: 98.0%
Failed Connections: 2
Avg Connection Time: 125 ms
Total Disconnections: 0
Server Uptime: 5m 23s

GEOGRAPHIC DISTRIBUTION
Asia: 32 viewers (32.7%)
North America: 28 viewers (28.6%)
Europe: 21 viewers (21.4%)
South America: 10 viewers (10.2%)
Africa: 4 viewers (4.1%)
Oceania: 3 viewers (3.1%)
```

---

## Success Criteria

Your system is working correctly if:

✅ Dashboard connects (green "Connected" indicator)  
✅ Stream status changes to ONLINE when broadcaster starts  
✅ Viewer count updates in real-time  
✅ Graphs animate smoothly  
✅ All 6 stat cards show data  
✅ Performance panel updates  
✅ Geographic distribution shows data  
✅ 100 viewers connect with >95% success rate  
✅ No errors in browser console  
✅ Dashboard updates every 2 seconds  

---

## Next Steps

Once everything is working:

1. Try different viewer counts (10, 50, 100, 500)
2. Test broadcaster disconnect/reconnect
3. Open multiple dashboard tabs (all should sync)
4. Monitor for 5-10 minutes to verify stability
5. Check the detailed testing guide: `ANALYTICS_TESTING_GUIDE.md`

---

## Need Help?

### Check these files:
- `ANALYTICS_TESTING_GUIDE.md` - Complete testing procedures
- `ANALYTICS_UPGRADE_GUIDE.md` - Feature documentation
- `TROUBLESHOOTING.md` - Common issues

### Common Issues:

**"Cannot find module 'wrtc'"**
- Use `viewer-bot-simple.js` instead of `viewer-bot.js`
- The simple version works on Windows

**"Port already in use"**
- Stop existing containers: `docker-compose down`
- Check for other processes: `netstat -ano | findstr :3000`

**"Dashboard not loading"**
- Check if web server is running: `docker ps`
- Try: `http://localhost:8080/dashboard.html`

---

## 🎉 You're Ready!

Run `.\test-analytics.ps1` and watch your analytics dashboard come to life!

The system will show you real-time metrics as viewers connect, just like YouTube Live or Twitch.

**Estimated total time:** 5 minutes from start to 100 viewers connected.

---

**Good luck! 🚀**
