#!/bin/bash

###############################################################################
# START TEST SCRIPT
#
# Quick start script for running load tests
#
# Usage:
#   ./start-test.sh viewer-bots 50
#   ./start-test.sh locust 100
#   ./start-test.sh browser 10
###############################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           LOAD TESTING QUICK START                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if services are running
check_services() {
    echo "Checking if services are running..."
    
    # Check signaling server
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Signaling server is running${NC}"
    else
        echo -e "${YELLOW}⚠ Signaling server not responding${NC}"
        echo "  Start with: docker-compose up -d"
        exit 1
    fi
    
    echo ""
}

# Viewer bots test
test_viewer_bots() {
    USERS=${1:-10}
    
    echo -e "${BLUE}Starting viewer bots test with ${USERS} users...${NC}"
    echo ""
    
    cd ../viewer-bots
    
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    node viewer-bot.js --users $USERS --metrics
}

# Locust test
test_locust() {
    USERS=${1:-10}
    
    echo -e "${BLUE}Starting Locust test with ${USERS} users...${NC}"
    echo ""
    
    cd ../locust-tests
    
    if ! command -v locust &> /dev/null; then
        echo "Installing Locust..."
        pip install -r requirements.txt
    fi
    
    echo "Starting Locust web interface..."
    echo "Open http://localhost:8089 in your browser"
    echo ""
    
    locust -f locustfile.py --host=http://localhost:8080
}

# Browser test
test_browser() {
    BROWSERS=${1:-5}
    
    echo -e "${BLUE}Starting browser test with ${BROWSERS} browsers...${NC}"
    echo ""
    
    cd ../load-testing
    
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    node browser-load-test.js $BROWSERS
}

# Main
check_services

if [ $# -eq 0 ]; then
    echo "Usage: $0 <test-type> [num-users]"
    echo ""
    echo "Test types:"
    echo "  viewer-bots  - Automated viewer bots (Node.js + WebRTC)"
    echo "  locust       - Locust load testing (Python)"
    echo "  browser      - Browser-based testing (Puppeteer)"
    echo ""
    echo "Examples:"
    echo "  $0 viewer-bots 50"
    echo "  $0 locust 100"
    echo "  $0 browser 10"
    exit 1
fi

TEST_TYPE=$1
NUM_USERS=${2:-10}

case $TEST_TYPE in
    viewer-bots|bots)
        test_viewer_bots $NUM_USERS
        ;;
    locust)
        test_locust $NUM_USERS
        ;;
    browser)
        test_browser $NUM_USERS
        ;;
    *)
        echo "Unknown test type: $TEST_TYPE"
        echo "Use: viewer-bots, locust, or browser"
        exit 1
        ;;
esac
