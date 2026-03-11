// FIXED VERSION - Proper mesh WebRTC implementation
// This version properly handles multiple viewers

// WebRTC Configuration
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Signaling Server WebSocket URL
const WS_URL = 'ws://localhost:3000';

// Broadcaster Class - Fixed to handle multiple viewers
class Broadcaster {
    constructor(stream, roomId) {
        this.stream = stream;
        this.roomId = roomId;
        this.peerConnections = new Map(); // Store multiple peer connections
        this.ws = null;
    }
    
    async start() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WS_URL);
            
            this.ws.onopen = () => {
                console.log('Broadcaster connected to signaling server');
                
                // Announce broadcaster is ready
                this.ws.send(JSON.stringify({
                    type: 'broadcaster-ready',
                    roomId: this.roomId
                }));
                
                resolve();
            };
            
            this.ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log('Broadcaster received:', message.type);
                
                if (message.type === 'viewer-joined') {
                    // New viewer joined, create offer for them
                    await this.createOfferForViewer(message.viewerId);
                } else if (message.type === 'answer') {
                    // Viewer sent answer
                    const pc = this.peerConnections.get(message.viewerId);
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
                        console.log('Set remote description for viewer:', message.viewerId);
                    }
                } else if (message.type === 'ice-candidate' && message.viewerId) {
                    // ICE candidate from viewer
                    const pc = this.peerConnections.get(message.viewerId);
                    if (pc && message.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                    }
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }
    
    async createOfferForViewer(viewerId) {
        console.log('Creating offer for viewer:', viewerId);
        
        // Create new peer connection for this viewer
        const pc = new RTCPeerConnection(config);
        this.peerConnections.set(viewerId, pc);
        
        // Add local stream tracks
        this.stream.getTracks().forEach(track => {
            pc.addTrack(track, this.stream);
            console.log('Added track to peer connection:', track.kind);
        });
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    role: 'broadcaster',
                    viewerId: viewerId,
                    roomId: this.roomId
                }));
            }
        };
        
        // Monitor connection state
        pc.onconnectionstatechange = () => {
            console.log(`Viewer ${viewerId} connection state:`, pc.connectionState);
        };
        
        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.ws.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            viewerId: viewerId,
            roomId: this.roomId
        }));
        
        console.log('Sent offer to viewer:', viewerId);
    }
    
    stop() {
        // Close all peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Viewer Class - Fixed to properly receive stream
class Viewer {
    constructor(roomId) {
        this.roomId = roomId;
        this.viewerId = 'viewer-' + Math.random().toString(36).substr(2, 9);
        this.pc = null;
        this.ws = null;
        this.onConnectionStateChange = null; // Callback for connection state changes
    }
    
    async start() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WS_URL);
            
            this.ws.onopen = () => {
                console.log('Viewer connected to signaling server');
                
                // Create peer connection
                this.pc = new RTCPeerConnection(config);
                
                // Handle incoming stream
                this.pc.ontrack = (event) => {
                    console.log('Received remote track:', event.track.kind);
                    if (event.streams && event.streams[0]) {
                        console.log('Received remote stream');
                        resolve(event.streams[0]);
                    }
                };
                
                // Handle ICE candidates
                this.pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        this.ws.send(JSON.stringify({
                            type: 'ice-candidate',
                            candidate: event.candidate,
                            role: 'viewer',
                            viewerId: this.viewerId,
                            roomId: this.roomId
                        }));
                    }
                };
                
                // Monitor connection state
                this.pc.onconnectionstatechange = () => {
                    console.log('Connection state:', this.pc.connectionState);
                    if (this.onConnectionStateChange) {
                        this.onConnectionStateChange(this.pc.connectionState);
                    }
                };
                
                this.pc.oniceconnectionstatechange = () => {
                    console.log('ICE connection state:', this.pc.iceConnectionState);
                };
                
                // Request to join room
                this.ws.send(JSON.stringify({
                    type: 'join',
                    viewerId: this.viewerId,
                    roomId: this.roomId
                }));
                
                console.log('Sent join request with ID:', this.viewerId);
            };
            
            this.ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log('Viewer received:', message.type);
                
                if (message.type === 'offer' && message.viewerId === this.viewerId) {
                    console.log('Received offer from broadcaster');
                    
                    await this.pc.setRemoteDescription(new RTCSessionDescription(message.offer));
                    const answer = await this.pc.createAnswer();
                    await this.pc.setLocalDescription(answer);
                    
                    this.ws.send(JSON.stringify({
                        type: 'answer',
                        answer: answer,
                        viewerId: this.viewerId,
                        roomId: this.roomId
                    }));
                    
                    console.log('Sent answer to broadcaster');
                } else if (message.type === 'ice-candidate' && message.role === 'broadcaster') {
                    if (message.candidate) {
                        await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                    }
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            // Extended timeout - give more time for broadcaster to start
            setTimeout(() => {
                if (this.pc && this.pc.connectionState !== 'connected') {
                    // Don't reject immediately, just warn
                    console.warn('Still waiting for stream...');
                    // Optionally reject after extended time
                    setTimeout(() => {
                        if (this.pc && this.pc.connectionState !== 'connected') {
                            reject(new Error('Connection timeout - no stream received. Broadcaster may not be online.'));
                        }
                    }, 15000);
                }
            }, 10000);
        });
    }
    
    stop() {
        if (this.pc) {
            this.pc.close();
        }
        if (this.ws) {
            this.ws.close();
        }
    }
}
