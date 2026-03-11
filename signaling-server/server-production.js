/**
 * PRODUCTION-GRADE SIGNALING SERVER
 * JPMC-Caliber Features:
 * - Redis Pub/Sub for distributed signaling
 * - Prometheus metrics export
 * - Health checks for K8s
 * - Graceful shutdown
 * - Connection pooling
 */

const WebSocket = require('ws');
const express = require('express');
const redis = require('redis');
const promClient = require('prom-client');
const SystemMonitor = require('./system-monitor');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const POD_NAME = process.env.POD_NAME || 'signaling-server-local';

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const activeConnections = new promClient.Gauge({
    name: 'streaming_active_connections',
    help: 'Number of active WebSocket connections',
    labelNames: ['pod', 'type'],
    registers: [register]
});

const totalViewers = new promClient.Gauge({
    name: 'streaming_total_viewers',
    help: 'Total number of viewers across all rooms',
    labelNames: ['pod'],
    registers: [register]
});

const connectionDuration = new promClient.Histogram({
    name: 'streaming_connection_duration_seconds',
    help: 'Duration of viewer connections',
    labelNames: ['pod'],
    buckets: [1, 5, 15, 30, 60, 120, 300, 600],
    registers: [register]
});

const messageCounter = new promClient.Counter({
    name: 'streaming_messages_total',
    help: 'Total number of messages processed',
    labelNames: ['pod', 'type'],
    registers: [register]
});

const errorCounter = new promClient.Counter({
    name: 'streaming_errors_total',
    help: 'Total number of errors',
    labelNames: ['pod', 'error_type'],
    registers: [register]
});

// Redis clients
let redisPublisher, redisSubscriber;
let isRedisConnected = false;

// Initialize Redis with retry logic
async function initRedis() {
    try {
        redisPublisher = redis.createClient({ url: REDIS_URL });
        redisSubscriber = redisPublisher.duplicate();

        redisPublisher.on('error', (err) => {
            console.error('Redis Publisher Error:', err);
            isRedisConnected = false;
            errorCounter.inc({ pod: POD_NAME, error_type: 'redis_publisher' });
        });

        redisSubscriber.on('error', (err) => {
            console.error('Redis Subscriber Error:', err);
            isRedisConnected = false;
            errorCounter.inc({ pod: POD_NAME, error_type: 'redis_subscriber' });
        });

        await redisPublisher.connect();
        await redisSubscriber.connect();
        
        isRedisConnected = true;
        console.log('✅ Redis connected successfully');

        // Subscribe to channels
        await redisSubscriber.subscribe('viewer-count', (message) => {
            try {
                const data = JSON.parse(message);
                console.log(`[Redis] Viewer count update from ${data.pod}: ${data.count}`);
                broadcastToDashboard({
                    type: 'viewer_count',
                    viewers: data.count,
                    pod: data.pod,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error processing Redis message:', error);
                errorCounter.inc({ pod: POD_NAME, error_type: 'redis_message' });
            }
        });

        await redisSubscriber.subscribe('stream-status', (message) => {
            try {
                const data = JSON.parse(message);
                broadcastToDashboard({
                    type: 'stream_status',
                    status: data.status,
                    broadcasters: data.broadcasters,
                    pod: data.pod,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error processing stream status:', error);
                errorCounter.inc({ pod: POD_NAME, error_type: 'redis_message' });
            }
        });

        console.log('✅ Subscribed to Redis channels: viewer-count, stream-status');

    } catch (error) {
        console.error('❌ Redis connection failed:', error);
        isRedisConnected = false;
        errorCounter.inc({ pod: POD_NAME, error_type: 'redis_connection' });
        
        // Retry after 5 seconds
        setTimeout(initRedis, 5000);
    }
}

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

// Initialize system monitor
const systemMonitor = new SystemMonitor();

// Store rooms and connections
const rooms = new Map();
const dashboardClients = new Set();

// Analytics data
const analytics = {
    totalConnections: 0,
    totalDisconnections: 0,
    failedConnections: 0,
    connectionTimes: [],
    connectionStartTimes: new Map()
};

// Viewer history for graphs
const viewerHistory = [];
const MAX_HISTORY = 60;

console.log(`🚀 Production Signaling Server starting...`);
console.log(`   Pod: ${POD_NAME}`);
console.log(`   WebSocket: ws://localhost:${PORT}`);
console.log(`   HTTP: http://localhost:${HTTP_PORT}`);

/**
 * Broadcast message to all dashboard clients
 */
function broadcastToDashboard(message) {
    const data = JSON.stringify(message);
    dashboardClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(data);
            } catch (error) {
                console.error('Error broadcasting to dashboard:', error);
                errorCounter.inc({ pod: POD_NAME, error_type: 'broadcast' });
            }
        }
    });
}

/**
 * Get total viewer count across all rooms
 */
function getTotalViewers() {
    let total = 0;
    rooms.forEach(room => {
        total += room.viewers.size;
    });
    return total;
}

/**
 * Get total broadcasters
 */
function getTotalBroadcasters() {
    let total = 0;
    rooms.forEach(room => {
        if (room.broadcaster) total++;
    });
    return total;
}

/**
 * Publish viewer count to Redis
 */
async function publishViewerCount() {
    if (!isRedisConnected) return;
    
    try {
        const count = getTotalViewers();
        await redisPublisher.publish('viewer-count', JSON.stringify({
            pod: POD_NAME,
            count: count,
            timestamp: Date.now()
        }));
        
        // Update Prometheus metric
        totalViewers.set({ pod: POD_NAME }, count);
    } catch (error) {
        console.error('Error publishing viewer count:', error);
        errorCounter.inc({ pod: POD_NAME, error_type: 'redis_publish' });
    }
}

/**
 * Publish stream status to Redis
 */
async function publishStreamStatus(status) {
    if (!isRedisConnected) return;
    
    try {
        await redisPublisher.publish('stream-status', JSON.stringify({
            pod: POD_NAME,
            status: status,
            broadcasters: getTotalBroadcasters(),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error publishing stream status:', error);
        errorCounter.inc({ pod: POD_NAME, error_type: 'redis_publish' });
    }
}

/**
 * Update viewer history for graphs
 */
function updateViewerHistory() {
    const viewerCount = getTotalViewers();
    viewerHistory.push({
        timestamp: Date.now(),
        viewers: viewerCount
    });
    
    if (viewerHistory.length > MAX_HISTORY) {
        viewerHistory.shift();
    }
}

/**
 * Broadcast viewer count update
 */
function broadcastViewerCount() {
    const viewerCount = getTotalViewers();
    broadcastToDashboard({
        type: 'viewer_count',
        viewers: viewerCount,
        pod: POD_NAME,
        timestamp: Date.now()
    });
}

/**
 * Broadcast stream status
 */
function broadcastStreamStatus(status) {
    broadcastToDashboard({
        type: 'stream_status',
        status: status,
        broadcasters: getTotalBroadcasters(),
        pod: POD_NAME,
        timestamp: Date.now()
    });
}

/**
 * Broadcast server metrics
 */
function broadcastServerMetrics() {
    const metrics = systemMonitor.getAllMetrics();
    broadcastToDashboard({
        type: 'server_metrics',
        pod: POD_NAME,
        ...metrics
    });
}

/**
 * Broadcast analytics data
 */
function broadcastAnalytics() {
    const avgConnectionTime = analytics.connectionTimes.length > 0
        ? analytics.connectionTimes.reduce((a, b) => a + b, 0) / analytics.connectionTimes.length
        : 0;
    
    const successRate = analytics.totalConnections > 0
        ? ((analytics.totalConnections - analytics.failedConnections) / analytics.totalConnections * 100)
        : 100;
    
    broadcastToDashboard({
        type: 'analytics_update',
        pod: POD_NAME,
        totalConnections: analytics.totalConnections,
        totalDisconnections: analytics.totalDisconnections,
        failedConnections: analytics.failedConnections,
        successRate: successRate.toFixed(1),
        avgConnectionTime: Math.round(avgConnectionTime),
        timestamp: Date.now()
    });
}

/**
 * Broadcast viewer history for graph
 */
function broadcastViewerHistory() {
    broadcastToDashboard({
        type: 'viewer_history',
        history: viewerHistory,
        pod: POD_NAME,
        timestamp: Date.now()
    });
}

// Periodic updates
setInterval(() => {
    updateViewerHistory();
    broadcastServerMetrics();
    broadcastAnalytics();
    broadcastViewerHistory();
    publishViewerCount();
}, 2000);

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    activeConnections.inc({ pod: POD_NAME, type: 'total' });
    
    let currentRoom = null;
    let clientRole = null;
    let clientId = null;
    let connectionStartTime = Date.now();
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            messageCounter.inc({ pod: POD_NAME, type: data.type });
            
            // Handle dashboard connection
            if (data.type === 'dashboard-connect') {
                clientRole = 'dashboard';
                dashboardClients.add(ws);
                activeConnections.inc({ pod: POD_NAME, type: 'dashboard' });
                console.log('Dashboard client connected');
                
                ws.send(JSON.stringify({
                    type: 'initial_data',
                    pod: POD_NAME,
                    viewers: getTotalViewers(),
                    broadcasters: getTotalBroadcasters(),
                    history: viewerHistory,
                    analytics: {
                        totalConnections: analytics.totalConnections,
                        failedConnections: analytics.failedConnections
                    },
                    metrics: systemMonitor.getAllMetrics()
                }));
                return;
            }
            
            // Handle ping for latency measurement
            if (data.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: data.timestamp
                }));
                return;
            }
            
            // Initialize room if it doesn't exist
            if (!rooms.has(data.roomId)) {
                rooms.set(data.roomId, {
                    broadcaster: null,
                    viewers: new Map()
                });
            }
            
            const room = rooms.get(data.roomId);
            currentRoom = data.roomId;
            
            switch (data.type) {
                case 'broadcaster-ready':
                    clientRole = 'broadcaster';
                    room.broadcaster = ws;
                    activeConnections.inc({ pod: POD_NAME, type: 'broadcaster' });
                    console.log(`Broadcaster ready in room ${data.roomId}`);
                    
                    broadcastStreamStatus('ONLINE');
                    publishStreamStatus('ONLINE');
                    
                    room.viewers.forEach((viewerWs, viewerId) => {
                        if (viewerWs.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'viewer-joined',
                                viewerId: viewerId
                            }));
                        }
                    });
                    break;
                
                case 'offer':
                    if (data.viewerId && room.viewers.has(data.viewerId)) {
                        const viewerWs = room.viewers.get(data.viewerId);
                        if (viewerWs.readyState === WebSocket.OPEN) {
                            viewerWs.send(JSON.stringify({
                                type: 'offer',
                                offer: data.offer,
                                viewerId: data.viewerId
                            }));
                        }
                    }
                    break;
                
                case 'answer':
                    if (room.broadcaster && room.broadcaster.readyState === WebSocket.OPEN) {
                        room.broadcaster.send(JSON.stringify({
                            type: 'answer',
                            answer: data.answer,
                            viewerId: data.viewerId
                        }));
                    }
                    break;
                
                case 'join':
                    clientRole = 'viewer';
                    clientId = data.viewerId;
                    
                    room.viewers.set(data.viewerId, ws);
                    analytics.totalConnections++;
                    analytics.connectionStartTimes.set(data.viewerId, Date.now());
                    activeConnections.inc({ pod: POD_NAME, type: 'viewer' });
                    
                    const connectionTime = Date.now() - connectionStartTime;
                    analytics.connectionTimes.push(connectionTime);
                    
                    if (analytics.connectionTimes.length > 100) {
                        analytics.connectionTimes.shift();
                    }
                    
                    console.log(`Viewer ${data.viewerId} joined room ${data.roomId}`);
                    
                    broadcastViewerCount();
                    publishViewerCount();
                    
                    if (room.broadcaster && room.broadcaster.readyState === WebSocket.OPEN) {
                        room.broadcaster.send(JSON.stringify({
                            type: 'viewer-joined',
                            viewerId: data.viewerId
                        }));
                    }
                    break;
                
                case 'ice-candidate':
                    if (data.role === 'broadcaster' && data.viewerId) {
                        const viewerWs = room.viewers.get(data.viewerId);
                        if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
                            viewerWs.send(JSON.stringify({
                                type: 'ice-candidate',
                                candidate: data.candidate,
                                role: 'broadcaster'
                            }));
                        }
                    } else if (data.role === 'viewer') {
                        if (room.broadcaster && room.broadcaster.readyState === WebSocket.OPEN) {
                            room.broadcaster.send(JSON.stringify({
                                type: 'ice-candidate',
                                candidate: data.candidate,
                                role: 'viewer',
                                viewerId: data.viewerId
                            }));
                        }
                    }
                    break;
            }
            
            systemMonitor.updateNetworkStats(message.length, 0);
            
        } catch (error) {
            console.error('Error processing message:', error);
            analytics.failedConnections++;
            errorCounter.inc({ pod: POD_NAME, error_type: 'message_processing' });
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        activeConnections.dec({ pod: POD_NAME, type: 'total' });
        
        if (clientRole === 'dashboard') {
            dashboardClients.delete(ws);
            activeConnections.dec({ pod: POD_NAME, type: 'dashboard' });
            return;
        }
        
        if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            
            if (clientRole === 'broadcaster' && room.broadcaster === ws) {
                room.broadcaster = null;
                activeConnections.dec({ pod: POD_NAME, type: 'broadcaster' });
                
                broadcastStreamStatus('OFFLINE');
                publishStreamStatus('OFFLINE');
                
                room.viewers.forEach((viewerWs) => {
                    if (viewerWs.readyState === WebSocket.OPEN) {
                        viewerWs.send(JSON.stringify({ type: 'broadcast-ended' }));
                    }
                });
            } else if (clientRole === 'viewer' && clientId) {
                room.viewers.delete(clientId);
                analytics.totalDisconnections++;
                activeConnections.dec({ pod: POD_NAME, type: 'viewer' });
                
                // Record connection duration
                if (analytics.connectionStartTimes.has(clientId)) {
                    const duration = (Date.now() - analytics.connectionStartTimes.get(clientId)) / 1000;
                    connectionDuration.observe({ pod: POD_NAME }, duration);
                    analytics.connectionStartTimes.delete(clientId);
                }
                
                broadcastViewerCount();
                publishViewerCount();
            }
            
            if (!room.broadcaster && room.viewers.size === 0) {
                rooms.delete(currentRoom);
            }
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        analytics.failedConnections++;
        errorCounter.inc({ pod: POD_NAME, error_type: 'websocket' });
    });
});

// Express middleware
app.use(express.json());

// Kubernetes health checks
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        pod: POD_NAME,
        redis: isRedisConnected,
        timestamp: new Date().toISOString()
    });
});

app.get('/ready', (req, res) => {
    if (isRedisConnected) {
        res.json({ status: 'ready', pod: POD_NAME });
    } else {
        res.status(503).json({ status: 'not ready', reason: 'redis disconnected' });
    }
});

app.get('/live', (req, res) => {
    res.json({ status: 'alive', pod: POD_NAME });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Detailed status endpoint
app.get('/status', (req, res) => {
    const roomStats = [];
    rooms.forEach((room, roomId) => {
        roomStats.push({
            roomId: roomId,
            hasBroadcaster: !!room.broadcaster,
            viewerCount: room.viewers.size
        });
    });
    
    const avgConnectionTime = analytics.connectionTimes.length > 0
        ? analytics.connectionTimes.reduce((a, b) => a + b, 0) / analytics.connectionTimes.length
        : 0;
    
    res.json({
        status: 'ok',
        pod: POD_NAME,
        redis: isRedisConnected,
        totalRooms: rooms.size,
        totalViewers: getTotalViewers(),
        totalBroadcasters: getTotalBroadcasters(),
        rooms: roomStats,
        analytics: {
            totalConnections: analytics.totalConnections,
            totalDisconnections: analytics.totalDisconnections,
            failedConnections: analytics.failedConnections,
            avgConnectionTime: Math.round(avgConnectionTime)
        },
        metrics: systemMonitor.getAllMetrics(),
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    wss.close(() => {
        console.log('WebSocket server closed');
    });
    
    if (redisPublisher) await redisPublisher.quit();
    if (redisSubscriber) await redisSubscriber.quit();
    
    process.exit(0);
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
    console.log(`✅ HTTP server running on port ${HTTP_PORT}`);
    console.log(`   Health: http://localhost:${HTTP_PORT}/health`);
    console.log(`   Metrics: http://localhost:${HTTP_PORT}/metrics`);
    console.log(`   Status: http://localhost:${HTTP_PORT}/status`);
});

// Initialize Redis
initRedis();

console.log('✅ Production server initialized');
