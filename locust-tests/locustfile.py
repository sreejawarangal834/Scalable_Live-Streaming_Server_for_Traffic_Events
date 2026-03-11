"""
LOCUST LOAD TESTING FOR LIVE STREAMING SYSTEM

This script simulates multiple viewers connecting to the live stream
using Locust, a Python-based load testing framework.

Architecture:
- Each Locust user = 1 simulated viewer
- Connects via WebSocket to signaling server
- Simulates WebRTC signaling (offer/answer/ICE)
- Maintains connection for duration of test

Usage:
    locust -f locustfile.py --host=http://localhost:8080
    
    Then open http://localhost:8089 and configure:
    - Number of users: 100
    - Spawn rate: 10 users/second
    
Advanced usage:
    # Headless mode
    locust -f locustfile.py --headless --users 100 --spawn-rate 10 --run-time 5m
    
    # With specific host
    locust -f locustfile.py --host=http://localhost:8080 --users 50 --spawn-rate 5
"""

from locust import User, task, between, events
import websocket
import json
import time
import logging
from datetime import datetime

# Configuration
SIGNALING_SERVER = "ws://localhost:3000"
ROOM_ID = 1234

# Statistics
stats = {
    'connected': 0,
    'failed': 0,
    'offers_received': 0,
    'answers_sent': 0,
    'ice_candidates': 0,
    'disconnected': 0,
    'total_bytes': 0
}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ViewerUser(User):
    """
    Simulates a viewer connecting to the live stream.
    
    Each ViewerUser instance represents one viewer bot that:
    1. Connects to signaling server via WebSocket
    2. Joins the streaming room
    3. Exchanges WebRTC signaling messages
    4. Maintains connection
    """
    
    # Wait time between tasks (simulates user behavior)
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ws = None
        self.viewer_id = f"locust-{id(self)}-{int(time.time())}"
        self.connected = False
        self.streaming = False
        self.connection_start = None
        self.bytes_received = 0
    
    def on_start(self):
        """
        Called when a user starts.
        Establishes WebSocket connection and joins room.
        """
        self.connection_start = time.time()
        
        try:
            # Connect to signaling server
            self.ws = websocket.WebSocket()
            self.ws.settimeout(10)
            
            start_time = time.time()
            self.ws.connect(SIGNALING_SERVER)
            connection_time = (time.time() - start_time) * 1000
            
            self.connected = True
            stats['connected'] += 1
            
            # Report connection time to Locust
            events.request.fire(
                request_type="WebSocket",
                name="Connect",
                response_time=connection_time,
                response_length=0,
                exception=None,
                context={}
            )
            
            logger.info(f"[{self.viewer_id}] Connected in {connection_time:.0f}ms")
            
            # Join the streaming room
            self.join_room()
            
        except Exception as e:
            stats['failed'] += 1
            logger.error(f"[{self.viewer_id}] Connection failed: {e}")
            
            events.request.fire(
                request_type="WebSocket",
                name="Connect",
                response_time=0,
                response_length=0,
                exception=e,
                context={}
            )
    
    def join_room(self):
        """
        Send join request to signaling server.
        """
        try:
            start_time = time.time()
            
            join_message = json.dumps({
                "type": "join",
                "viewerId": self.viewer_id,
                "roomId": ROOM_ID
            })
            
            self.ws.send(join_message)
            response_time = (time.time() - start_time) * 1000
            
            events.request.fire(
                request_type="WebSocket",
                name="Join Room",
                response_time=response_time,
                response_length=len(join_message),
                exception=None,
                context={}
            )
            
            logger.info(f"[{self.viewer_id}] Joined room {ROOM_ID}")
            
        except Exception as e:
            logger.error(f"[{self.viewer_id}] Join failed: {e}")
            
            events.request.fire(
                request_type="WebSocket",
                name="Join Room",
                response_time=0,
                response_length=0,
                exception=e,
                context={}
            )
    
    @task(10)
    def receive_messages(self):
        """
        Receive and process messages from signaling server.
        This is the main task that runs repeatedly.
        """
        if not self.ws or not self.connected:
            return
        
        try:
            # Set short timeout to avoid blocking
            self.ws.settimeout(0.1)
            
            start_time = time.time()
            message = self.ws.recv()
            response_time = (time.time() - start_time) * 1000
            
            if message:
                data = json.loads(message)
                self.handle_message(data)
                
                events.request.fire(
                    request_type="WebSocket",
                    name="Receive Message",
                    response_time=response_time,
                    response_length=len(message),
                    exception=None,
                    context={}
                )
                
                # Simulate receiving data
                self.bytes_received += len(message)
                stats['total_bytes'] += len(message)
                
        except websocket.WebSocketTimeoutException:
            # Timeout is expected, not an error
            pass
        except Exception as e:
            if "Connection is already closed" not in str(e):
                logger.error(f"[{self.viewer_id}] Receive error: {e}")
    
    def handle_message(self, message):
        """
        Handle different types of signaling messages.
        """
        msg_type = message.get('type')
        
        if msg_type == 'offer':
            stats['offers_received'] += 1
            logger.debug(f"[{self.viewer_id}] Received offer")
            
            # Send answer back
            self.send_answer()
            
        elif msg_type == 'ice-candidate':
            stats['ice_candidates'] += 1
            logger.debug(f"[{self.viewer_id}] Received ICE candidate")
            
        elif msg_type == 'broadcast-ended':
            logger.info(f"[{self.viewer_id}] Broadcast ended")
            self.on_stop()
    
    def send_answer(self):
        """
        Send WebRTC answer to broadcaster.
        """
        try:
            start_time = time.time()
            
            answer_message = json.dumps({
                "type": "answer",
                "answer": {
                    "type": "answer",
                    "sdp": "simulated-sdp-answer"
                },
                "viewerId": self.viewer_id,
                "roomId": ROOM_ID
            })
            
            self.ws.send(answer_message)
            response_time = (time.time() - start_time) * 1000
            
            stats['answers_sent'] += 1
            
            events.request.fire(
                request_type="WebSocket",
                name="Send Answer",
                response_time=response_time,
                response_length=len(answer_message),
                exception=None,
                context={}
            )
            
            logger.debug(f"[{self.viewer_id}] Sent answer")
            
        except Exception as e:
            logger.error(f"[{self.viewer_id}] Send answer failed: {e}")
    
    @task(1)
    def send_heartbeat(self):
        """
        Periodically send heartbeat to keep connection alive.
        """
        if not self.ws or not self.connected:
            return
        
        try:
            heartbeat = json.dumps({
                "type": "heartbeat",
                "viewerId": self.viewer_id,
                "timestamp": time.time()
            })
            
            self.ws.send(heartbeat)
            
        except Exception as e:
            logger.error(f"[{self.viewer_id}] Heartbeat failed: {e}")
    
    def on_stop(self):
        """
        Called when a user stops.
        Cleanup and close connections.
        """
        if self.ws:
            try:
                self.ws.close()
                stats['disconnected'] += 1
                
                uptime = time.time() - self.connection_start if self.connection_start else 0
                logger.info(f"[{self.viewer_id}] Disconnected after {uptime:.1f}s")
                
            except Exception as e:
                logger.error(f"[{self.viewer_id}] Disconnect error: {e}")
        
        self.connected = False


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Called when the test starts.
    """
    logger.info("=" * 60)
    logger.info("LOCUST LOAD TEST STARTED")
    logger.info("=" * 60)
    logger.info(f"Target: {SIGNALING_SERVER}")
    logger.info(f"Room ID: {ROOM_ID}")
    logger.info("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """
    Called when the test stops.
    Print final statistics.
    """
    logger.info("\n" + "=" * 60)
    logger.info("LOCUST LOAD TEST COMPLETED")
    logger.info("=" * 60)
    logger.info(f"Total Connected:      {stats['connected']}")
    logger.info(f"Total Failed:         {stats['failed']}")
    logger.info(f"Offers Received:      {stats['offers_received']}")
    logger.info(f"Answers Sent:         {stats['answers_sent']}")
    logger.info(f"ICE Candidates:       {stats['ice_candidates']}")
    logger.info(f"Disconnected:         {stats['disconnected']}")
    logger.info(f"Total Data:           {stats['total_bytes'] / 1024:.2f} KB")
    logger.info("=" * 60)


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """
    Called for each request.
    Can be used for custom metrics.
    """
    if exception:
        logger.warning(f"Request failed: {name} - {exception}")


# Custom shape for load testing (optional)
from locust import LoadTestShape

class StepLoadShape(LoadTestShape):
    """
    A step load shape that gradually increases load.
    
    Steps:
    - 0-60s: 10 users
    - 60-120s: 50 users
    - 120-180s: 100 users
    - 180-240s: 200 users
    """
    
    step_time = 60
    step_load = 10
    spawn_rate = 5
    time_limit = 240
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time > self.time_limit:
            return None
        
        current_step = run_time // self.step_time
        user_count = (current_step + 1) * self.step_load
        
        return (user_count, self.spawn_rate)


# To use the custom shape, run:
# locust -f locustfile.py --host=http://localhost:8080 --shape=StepLoadShape
