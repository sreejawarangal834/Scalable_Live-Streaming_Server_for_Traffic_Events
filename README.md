# Scalable Live Event Streaming System

A complete WebRTC-based live streaming platform demonstrating distributed systems concepts.

## Architecture

```
Broadcaster (Camera)
    │
    ▼
Frontend Web App
    │
    ▼
Signaling Server (Node.js + WebSocket)
    │
    ▼
Media Server (Janus WebRTC Gateway)
    │
    ▼
Viewers (Browsers)
```

## System Components

1. **Broadcaster Module**: Captures webcam and publishes stream
2. **Viewer Module**: Subscribes to and displays live stream
3. **Signaling Server**: Coordinates WebRTC connections via WebSocket
4. **Media Server**: Janus Gateway with VideoRoom plugin (SFU architecture)
5. **Load Balancer**: Nginx for horizontal scaling (optional)

## Prerequisites

- Docker and Docker Compose
- Modern web browser (Chrome/Firefox)
- Node.js 18+ (for local development)

## Quick Start

### 1. Start All Services

```bash
cd live-stream-system
docker-compose up -d
```

### 2. Access the Application

- **Broadcaster**: http://localhost:8080/broadcaster.html
- **Viewer**: http://localhost:8080/viewer.html
- **Signaling Server**: ws://localhost:3000

### 3. Test the System

1. Open broadcaster page, click "Start Broadcast"
2. Allow camera permissions
3. Open viewer page in multiple tabs/windows
4. Click "Join Stream" on each viewer
5. All viewers should see the live stream

## Architecture Explanation

### SFU (Selective Forwarding Unit)
Janus acts as an SFU, receiving one stream from the broadcaster and forwarding it to multiple viewers without transcoding. This is more scalable than MCU (Multipoint Control Unit).

### WebRTC Flow
1. Broadcaster creates offer → sends to Janus via signaling
2. Janus responds with answer
3. ICE candidates exchanged for NAT traversal
4. Media flows directly: Broadcaster → Janus → Viewers

### Scalability Principles
- **Horizontal Scaling**: Multiple Janus instances behind Nginx
- **Concurrency**: Signaling server handles multiple WebSocket connections
- **Process Isolation**: Each service runs in separate Docker container
- **Load Distribution**: Nginx balances viewer connections

## Operating System Concepts Demonstrated

1. **Concurrency**: Multiple viewers handled simultaneously
2. **Network I/O**: Non-blocking WebSocket and WebRTC connections
3. **Process Management**: Docker containers as isolated processes
4. **Inter-Process Communication**: WebSocket for signaling, RTP for media
5. **Resource Scheduling**: OS schedules CPU time for encoding/decoding
6. **Distributed Systems**: Multiple services coordinating via network

## Performance Testing

### Simulate Multiple Viewers

Open multiple browser tabs (10-50) and join the stream.

### Monitor Resources

```bash
docker stats
```

### Expected Performance
- 10 viewers: ~5-10 Mbps bandwidth, <500ms latency
- 50 viewers: ~25-50 Mbps bandwidth, <1s latency
- 100 viewers: Requires multiple Janus instances

## Troubleshooting

### Camera not working
- Check browser permissions
- Use HTTPS or localhost only

### Viewers not connecting
- Check Janus logs: `docker logs janus-gateway`
- Verify signaling server: `docker logs signaling-server`

### High latency
- Check network bandwidth
- Reduce video quality in broadcaster

## Documentation

This project includes comprehensive documentation:

- **[INDEX.md](INDEX.md)** - Complete documentation index
- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical deep dive
- **[TESTING.md](TESTING.md)** - Testing and validation guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Problem solving
- **[STUDENT_GUIDE.md](STUDENT_GUIDE.md)** - Learning path for students
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - High-level overview

## Project Structure

```
live-stream-system/
├── frontend/           # Web interfaces
├── signaling-server/   # WebSocket server
├── janus-config/       # Janus configuration
├── nginx/              # Load balancer config
├── docker-compose.yml  # Container orchestration
├── setup.sh / .bat     # Quick setup scripts
└── *.md                # Documentation files
```

## Stopping the System

```bash
docker-compose down
```

## Advanced: Load Balancing

To enable multiple Janus instances, uncomment the nginx and additional Janus services in docker-compose.yml.
