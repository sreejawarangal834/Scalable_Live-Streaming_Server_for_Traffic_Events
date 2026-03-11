const WebSocket = require('ws');
const express = require('express');
const SystemMonitor = require('./system-monitor');

const app = express();
const PORT = 3000;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

// Initialize system monitor
const systemMonitor = new SystemMonitor();

// Store rooms and connections
const rooms = new Map();

// Store dashboard clients
const dashboardClients = new Set();

// Analytics data
const analytics = {
    totalConnections: 0,
    totalDisconnections: 0,
    failedConnections: 0,
    connectionTimes: []
};

// Viewer history for graphs (last 60 data points)
const viewerHistory = [];
const MAX_HISTORY = 60;

console.log(`Signaling server with analytics running on ws://localhost:${PORT}`);

/**
 * Broadcast message to all dashboard clients
 */
function broadcastToDashboard(message) {
    const data = JSON.stringify(message);
    dashboardClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
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
 * Update viewer history for graphs
 */
function updateViewerHistory() {
    const viewerCount = getTotalViewers();
    viewerHistory.push({
        timestamp: Date.now(),
        viewers: viewerCount
    });
    
    // Keep only last MAX_HISTORY points
    if (viewerHistory.length > MAX_HISTORY) {
        viewerHistory.shift();
    }
}

// Geographic distribution removed for cleaner dashboard

/**
 * Broadcast viewer count update
 */
function broadcastViewerCount() {
    const viewerCount = getTotalViewers();
    broadcastToDashboard({
        type: 'viewer_count',
        viewers: viewerCount,
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
        timestamp: Date.now()
    });
}

// Periodic updates
setInterval(() => {
    updateViewerHistory();
    broadcastServerMetrics();
    broadcastAnalytics();
    broadcastViewerHistory();
}, 2000);

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    let currentRoom = null;
    let clientRole = null;
    let clientId = null;
    let connectionStartTime = Date.now();
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Handle dashboard connection
            if (data.type === 'dashboard-connect') {
                clientRole = 'dashboard';
                dashboardClients.add(ws);
                console.log('Dashboard client connected');
                
                // Send initial data
                ws.send(JSON.stringify({
                    type: 'initial_data',
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
            
            console.log('Received:', data.type, 'for room:', data.roomId);
            
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
                    console.log(`Broadcaster ready in room ${data.roomId}`);
                    
                    // Broadcast stream status
                    broadcastStreamStatus('ONLINE');
                    
                    // Notify all existing viewers
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
                    
                    const connectionTime = Date.now() - connectionStartTime;
                    analytics.connectionTimes.push(connectionTime);
                    
                    // Keep only last 100 connection times
                    if (analytics.connectionTimes.length > 100) {
                        analytics.connectionTimes.shift();
                    }
                    
                    console.log(`Viewer ${data.viewerId} joined room ${data.roomId}`);
                    console.log(`Room ${data.roomId} now has ${room.viewers.size} viewers`);
                    
                    // Broadcast viewer count update
                    broadcastViewerCount();
                    
                    // Notify broadcaster
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
            
            // Update network stats
            systemMonitor.updateNetworkStats(message.length, 0);
            
        } catch (error) {
            console.error('Error processing message:', error);
            analytics.failedConnections++;
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        
        if (clientRole === 'dashboard') {
            dashboardClients.delete(ws);
            console.log('Dashboard client disconnected');
            return;
        }
        
        if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            
            if (clientRole === 'broadcaster' && room.broadcaster === ws) {
                room.broadcaster = null;
                console.log(`Broadcaster left room ${currentRoom}`);
                
                // Broadcast stream status
                broadcastStreamStatus('OFFLINE');
                
                // Notify all viewers
                room.viewers.forEach((viewerWs) => {
                    if (viewerWs.readyState === WebSocket.OPEN) {
                        viewerWs.send(JSON.stringify({ type: 'broadcast-ended' }));
                    }
                });
            } else if (clientRole === 'viewer' && clientId) {
                room.viewers.delete(clientId);
                analytics.totalDisconnections++;
                
                console.log(`Viewer ${clientId} left room ${currentRoom}`);
                console.log(`Room ${currentRoom} now has ${room.viewers.size} viewers`);
                
                // Broadcast viewer count update
                broadcastViewerCount();
            }
            
            // Clean up empty rooms
            if (!room.broadcaster && room.viewers.size === 0) {
                rooms.delete(currentRoom);
                console.log(`Room ${currentRoom} deleted`);
            }
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        analytics.failedConnections++;
    });
});

// Health check endpoint with analytics
app.get('/health', (req, res) => {
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

app.listen(3001, () => {
    console.log('HTTP health check on http://localhost:3001/health');
});
