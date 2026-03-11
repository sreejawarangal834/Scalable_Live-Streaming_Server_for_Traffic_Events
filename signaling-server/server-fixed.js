const WebSocket = require('ws');
const express = require('express');

const app = express();
const PORT = 3000;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

// Store rooms and connections
const rooms = new Map();

console.log(`Signaling server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    let currentRoom = null;
    let clientRole = null;
    let clientId = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data.type, 'for room:', data.roomId);
            
            // Initialize room if it doesn't exist
            if (!rooms.has(data.roomId)) {
                rooms.set(data.roomId, {
                    broadcaster: null,
                    viewers: new Map() // viewerId -> WebSocket
                });
            }
            
            const room = rooms.get(data.roomId);
            currentRoom = data.roomId;
            
            switch (data.type) {
                case 'broadcaster-ready':
                    // Broadcaster is ready to stream
                    clientRole = 'broadcaster';
                    room.broadcaster = ws;
                    console.log(`Broadcaster ready in room ${data.roomId}`);
                    
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
                    // Broadcaster sending offer to specific viewer
                    if (data.viewerId && room.viewers.has(data.viewerId)) {
                        const viewerWs = room.viewers.get(data.viewerId);
                        if (viewerWs.readyState === WebSocket.OPEN) {
                            viewerWs.send(JSON.stringify({
                                type: 'offer',
                                offer: data.offer,
                                viewerId: data.viewerId
                            }));
                            console.log(`Forwarded offer to viewer ${data.viewerId}`);
                        }
                    }
                    break;
                
                case 'answer':
                    // Viewer sending answer to broadcaster
                    if (room.broadcaster && room.broadcaster.readyState === WebSocket.OPEN) {
                        room.broadcaster.send(JSON.stringify({
                            type: 'answer',
                            answer: data.answer,
                            viewerId: data.viewerId
                        }));
                        console.log(`Forwarded answer from viewer ${data.viewerId}`);
                    }
                    break;
                
                case 'join':
                    // Viewer wants to join
                    clientRole = 'viewer';
                    clientId = data.viewerId;
                    room.viewers.set(data.viewerId, ws);
                    
                    console.log(`Viewer ${data.viewerId} joined room ${data.roomId}`);
                    console.log(`Room ${data.roomId} now has ${room.viewers.size} viewers`);
                    
                    // Notify broadcaster about new viewer
                    if (room.broadcaster && room.broadcaster.readyState === WebSocket.OPEN) {
                        room.broadcaster.send(JSON.stringify({
                            type: 'viewer-joined',
                            viewerId: data.viewerId
                        }));
                    } else {
                        // No broadcaster yet
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'No broadcaster in this room yet'
                        }));
                    }
                    break;
                
                case 'ice-candidate':
                    // Forward ICE candidates
                    if (data.role === 'broadcaster' && data.viewerId) {
                        // Broadcaster -> Viewer
                        const viewerWs = room.viewers.get(data.viewerId);
                        if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
                            viewerWs.send(JSON.stringify({
                                type: 'ice-candidate',
                                candidate: data.candidate,
                                role: 'broadcaster'
                            }));
                        }
                    } else if (data.role === 'viewer') {
                        // Viewer -> Broadcaster
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
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        
        if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            
            if (clientRole === 'broadcaster' && room.broadcaster === ws) {
                room.broadcaster = null;
                console.log(`Broadcaster left room ${currentRoom}`);
                
                // Notify all viewers that broadcast ended
                room.viewers.forEach((viewerWs) => {
                    if (viewerWs.readyState === WebSocket.OPEN) {
                        viewerWs.send(JSON.stringify({ type: 'broadcast-ended' }));
                    }
                });
            } else if (clientRole === 'viewer' && clientId) {
                room.viewers.delete(clientId);
                console.log(`Viewer ${clientId} left room ${currentRoom}`);
                console.log(`Room ${currentRoom} now has ${room.viewers.size} viewers`);
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
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const roomStats = [];
    rooms.forEach((room, roomId) => {
        roomStats.push({
            roomId: roomId,
            hasBroadcaster: !!room.broadcaster,
            viewerCount: room.viewers.size
        });
    });
    
    res.json({
        status: 'ok',
        totalRooms: rooms.size,
        rooms: roomStats,
        timestamp: new Date().toISOString()
    });
});

app.listen(3001, () => {
    console.log('HTTP health check on http://localhost:3001/health');
});
