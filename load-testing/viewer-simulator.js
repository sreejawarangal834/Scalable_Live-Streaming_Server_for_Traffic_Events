#!/usr/bin/env node

/**
 * Viewer Simulator - Simulates multiple viewers connecting to the stream
 * Usage: node viewer-simulator.js [number-of-viewers] [room-id]
 * Example: node viewer-simulator.js 100 1234
 */

const WebSocket = require('ws');

// Configuration
const SIGNALING_SERVER = 'ws://localhost:3000';
const DEFAULT_VIEWERS = 10;
const DEFAULT_ROOM_ID = 1234;
const SPAWN_DELAY = 100; // ms between spawning viewers

// Parse command line arguments
const numViewers = parseInt(process.argv[2]) || DEFAULT_VIEWERS;
const roomId = parseInt(process.argv[3]) || DEFAULT_ROOM_ID;

console.log('='.repeat(60));
console.log('VIEWER LOAD SIMULATOR');
console.log('='.repeat(60));
console.log(`Target: ${SIGNALING_SERVER}`);
console.log(`Room ID: ${roomId}`);
console.log(`Simulating: ${numViewers} viewers`);
console.log(`Spawn delay: ${SPAWN_DELAY}ms`);
console.log('='.repeat(60));
console.log('');

// Statistics
const stats = {
    connected: 0,
    failed: 0,
    disconnected: 0,
    receivedOffer: 0,
    sentAnswer: 0,
    errors: []
};

// Store viewer connections
const viewers = [];

// Simulated Viewer Class
class SimulatedViewer {
    constructor(id, roomId) {
        this.id = id;
        this.roomId = roomId;
        this.viewerId = `sim-viewer-${id}`;
        this.ws = null;
        this.connected = false;
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(SIGNALING_SERVER);
                
                this.ws.on('open', () => {
                    this.connected = true;
                    stats.connected++;
                    
                    // Send join message
                    this.ws.send(JSON.stringify({
                        type: 'join',
                        viewerId: this.viewerId,
                        roomId: this.roomId
                    }));
                    
                    resolve();
                });
                
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        
                        if (message.type === 'offer') {
                            stats.receivedOffer++;
                            
                            // Simulate sending answer
                            this.ws.send(JSON.stringify({
                                type: 'answer',
                                answer: { type: 'answer', sdp: 'simulated-sdp' },
                                viewerId: this.viewerId,
                                roomId: this.roomId
                            }));
                            
                            stats.sentAnswer++;
                        }
                    } catch (err) {
                        // Ignore parse errors
                    }
                });
                
                this.ws.on('error', (error) => {
                    stats.failed++;
                    stats.errors.push(`Viewer ${this.id}: ${error.message}`);
                    reject(error);
                });
                
                this.ws.on('close', () => {
                    if (this.connected) {
                        stats.disconnected++;
                        this.connected = false;
                    }
                });
                
            } catch (error) {
                stats.failed++;
                reject(error);
            }
        });
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Spawn viewers gradually
async function spawnViewers() {
    console.log('Starting to spawn viewers...\n');
    
    const startTime = Date.now();
    
    for (let i = 1; i <= numViewers; i++) {
        const viewer = new SimulatedViewer(i, roomId);
        viewers.push(viewer);
        
        viewer.connect().catch(err => {
            // Error already logged in stats
        });
        
        // Progress indicator
        if (i % 10 === 0 || i === numViewers) {
            process.stdout.write(`\rSpawned: ${i}/${numViewers} | Connected: ${stats.connected} | Failed: ${stats.failed}`);
        }
        
        // Delay between spawns
        if (i < numViewers) {
            await new Promise(resolve => setTimeout(resolve, SPAWN_DELAY));
        }
    }
    
    const spawnTime = Date.now() - startTime;
    console.log(`\n\nAll viewers spawned in ${spawnTime}ms`);
    console.log('Waiting for connections to stabilize...\n');
    
    // Wait for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    printStats();
}

// Print statistics
function printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total viewers spawned:    ${numViewers}`);
    console.log(`Successfully connected:   ${stats.connected} (${(stats.connected/numViewers*100).toFixed(1)}%)`);
    console.log(`Failed to connect:        ${stats.failed} (${(stats.failed/numViewers*100).toFixed(1)}%)`);
    console.log(`Disconnected:             ${stats.disconnected}`);
    console.log(`Received offers:          ${stats.receivedOffer}`);
    console.log(`Sent answers:             ${stats.sentAnswer}`);
    console.log('='.repeat(60));
    
    if (stats.errors.length > 0 && stats.errors.length <= 10) {
        console.log('\nERRORS:');
        stats.errors.forEach(err => console.log(`  - ${err}`));
    } else if (stats.errors.length > 10) {
        console.log(`\nERRORS: ${stats.errors.length} errors occurred (showing first 10):`);
        stats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('');
}

// Monitor stats periodically
function startMonitoring() {
    setInterval(() => {
        process.stdout.write(`\rConnected: ${stats.connected} | Offers: ${stats.receivedOffer} | Answers: ${stats.sentAnswer} | Failed: ${stats.failed}`);
    }, 1000);
}

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    viewers.forEach(viewer => viewer.disconnect());
    printStats();
    process.exit(0);
});

// Main execution
(async () => {
    try {
        startMonitoring();
        await spawnViewers();
        
        console.log('\nSimulation running. Press Ctrl+C to stop and see final stats.\n');
        
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
