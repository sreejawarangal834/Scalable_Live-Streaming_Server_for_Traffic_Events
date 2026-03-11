# Load Testing Tools

Tools to simulate hundreds or thousands of viewers connecting to your live stream.

## Prerequisites

```bash
cd load-testing
npm install
```

## Method 1: WebSocket Simulator (Lightweight)

Simulates viewers at the signaling level only. Very lightweight, can test thousands of connections.

### Usage

```bash
# Test with 10 viewers
npm run test:10

# Test with 50 viewers
npm run test:50

# Test with 100 viewers
npm run test:100

# Test with 500 viewers
npm run test:500

# Test with 1000 viewers
npm run test:1000

# Test with 5000 viewers
npm run test:5000

# Custom number
node viewer-simulator.js 2000 1234
```

### What it tests
- WebSocket connection capacity
- Signaling server performance
- Message routing efficiency
- Connection stability

### Limitations
- Does NOT create actual WebRTC connections
- Does NOT consume bandwidth
- Does NOT test video streaming

### Output Example
```
==========================================================
VIEWER LOAD SIMULATOR
==========================================================
Target: ws://localhost:3000
Room ID: 1234
Simulating: 100 viewers
Spawn delay: 100ms
==========================================================

Spawned: 100/100 | Connected: 98 | Failed: 2

All viewers spawned in 10234ms
Waiting for connections to stabilize...

==========================================================
STATISTICS
==========================================================
Total viewers spawned:    100
Successfully connected:   98 (98.0%)
Failed to connect:        2 (2.0%)
Disconnected:             0
Received offers:          98
Sent answers:             98
==========================================================
```

## Method 2: Browser Simulator (Realistic)

Uses Puppeteer to launch real browser instances with actual WebRTC connections.

### Usage

```bash
# Test with 5 browsers (default)
npm run browser-test

# Test with 10 browsers
node browser-load-test.js 10

# Test with 20 browsers
node browser-load-test.js 20
```

### What it tests
- Full WebRTC connection
- Actual video streaming
- Real bandwidth consumption
- Browser resource usage

### Limitations
- Resource intensive (each browser uses ~100-200MB RAM)
- Limited to ~50-100 browsers per machine
- Slower to spawn

### Output Example
```
==========================================================
BROWSER-BASED LOAD TEST
==========================================================
Opening 10 browser instances
Target URL: http://localhost:8080/viewer.html
Room ID: 1234
==========================================================

[1] Launching browser...
[1] Joined stream
[1] ✓ Receiving stream!
Progress: 1/10

[2] Launching browser...
[2] Joined stream
[2] ✓ Receiving stream!
Progress: 2/10

...

==========================================================
TEST COMPLETE
==========================================================
Total time: 45.2s
Browsers launched: 10/10
Joined stream: 10/10
Receiving stream: 9/10
Failed: 0
==========================================================
```

## Method 3: Apache JMeter (Advanced)

For HTTP/WebSocket load testing with detailed metrics.

### Setup

1. Download JMeter: https://jmeter.apache.org/download_jmeter.cgi
2. Extract and run: `bin/jmeter.bat` (Windows) or `bin/jmeter.sh` (Linux/Mac)

### Create Test Plan

1. Add Thread Group
   - Number of Threads: 100
   - Ramp-up Period: 10 seconds
   - Loop Count: 1

2. Add WebSocket Sampler
   - Server: localhost
   - Port: 3000
   - Implementation: RFC6455
   - Request Data: `{"type":"join","viewerId":"test-${__threadNum}","roomId":1234}`

3. Add Listeners
   - View Results Tree
   - Summary Report
   - Graph Results

4. Run Test

## Method 4: Locust (Python-based)

For distributed load testing.

### Setup

```bash
pip install locust websocket-client
```

### Create locustfile.py

```python
from locust import User, task, between
import websocket
import json
import time

class ViewerUser(User):
    wait_time = between(1, 3)
    
    def on_start(self):
        self.ws = websocket.WebSocket()
        self.ws.connect("ws://localhost:3000")
        
        # Join room
        self.ws.send(json.dumps({
            "type": "join",
            "viewerId": f"locust-{id(self)}",
            "roomId": 1234
        }))
    
    @task
    def receive_messages(self):
        try:
            message = self.ws.recv()
            # Process message
        except:
            pass
    
    def on_stop(self):
        self.ws.close()
```

### Run Locust

```bash
locust -f locustfile.py --host=http://localhost:8080
```

Open http://localhost:8089 and configure:
- Number of users: 1000
- Spawn rate: 10 users/second

## Monitoring During Tests

### Monitor Docker Resources

```bash
# Real-time stats
docker stats

# Watch specific container
docker stats signaling-server
```

### Monitor System Resources

```bash
# Linux
htop
iftop

# Windows
# Use Task Manager or Resource Monitor
```

### Check Health Endpoint

```bash
# Watch health status
watch -n 1 curl http://localhost:3001/health

# Or manually
curl http://localhost:3001/health
```

### Monitor Signaling Server Logs

```bash
docker logs -f signaling-server
```

## Performance Benchmarks

### WebSocket Simulator

| Viewers | CPU Usage | Memory | Time to Connect |
|---------|-----------|--------|-----------------|
| 100     | 5%        | 50MB   | 10s             |
| 500     | 15%       | 100MB  | 50s             |
| 1000    | 25%       | 150MB  | 100s            |
| 5000    | 60%       | 400MB  | 500s            |

### Browser Simulator

| Browsers | CPU Usage | Memory | Time to Launch |
|----------|-----------|--------|----------------|
| 5        | 20%       | 1GB    | 15s            |
| 10       | 40%       | 2GB    | 30s            |
| 20       | 70%       | 4GB    | 60s            |
| 50       | 95%       | 8GB    | 150s           |

## Troubleshooting

### "Too many open files" error

Increase file descriptor limit:

```bash
# Linux/Mac
ulimit -n 10000

# Permanent (add to ~/.bashrc)
echo "ulimit -n 10000" >> ~/.bashrc
```

### High CPU usage

- Reduce spawn rate
- Add delay between connections
- Use WebSocket simulator instead of browser simulator

### Connection timeouts

- Check signaling server is running
- Verify broadcaster is streaming
- Check firewall settings
- Increase timeout values

### Memory issues

- Close other applications
- Use WebSocket simulator for high numbers
- Limit browser simulator to <50 instances

## Best Practices

1. **Start small**: Test with 10 viewers first
2. **Gradual increase**: Double the number each test
3. **Monitor resources**: Watch CPU, memory, bandwidth
4. **Use appropriate tool**: 
   - WebSocket simulator for capacity testing
   - Browser simulator for realistic testing
5. **Clean up**: Stop tests properly to free resources
6. **Document results**: Record metrics for comparison

## Expected Results

### Signaling Server Capacity
- Should handle 1000+ WebSocket connections
- CPU usage should stay under 50% for 1000 viewers
- Memory usage should be under 500MB for 1000 viewers

### Broadcaster Capacity (Mesh Architecture)
- Limited to ~10-20 viewers per broadcaster
- Each viewer requires separate peer connection
- Bandwidth scales linearly (N viewers = N × bitrate)

### SFU Architecture (with Janus)
- Can handle 100+ viewers per server
- Broadcaster sends only one stream
- Bandwidth on broadcaster side is constant

## Interpreting Results

### Good Performance
- ✅ >95% connection success rate
- ✅ <2 second connection time
- ✅ <50% CPU usage
- ✅ Stable connections (no disconnects)

### Poor Performance
- ❌ <80% connection success rate
- ❌ >5 second connection time
- ❌ >80% CPU usage
- ❌ Frequent disconnections

## Next Steps

After load testing:
1. Identify bottlenecks
2. Optimize code
3. Scale horizontally (add more servers)
4. Implement caching
5. Use CDN for static assets
6. Deploy to production environment
