#!/bin/bash

# Production Load Test Script
# Tests system with 5000 concurrent viewers

set -e

echo "========================================="
echo "  PRODUCTION LOAD TEST - 5K VIEWERS"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

NAMESPACE="streaming-system"
TARGET_VIEWERS=5000
DURATION=300  # 5 minutes

# Get service endpoint
echo -e "${YELLOW}Getting service endpoint...${NC}"
EXTERNAL_IP=$(kubectl get svc signaling-server-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)

if [ -z "$EXTERNAL_IP" ] || [ "$EXTERNAL_IP" == "null" ]; then
    echo -e "${YELLOW}Using port-forward instead of LoadBalancer...${NC}"
    kubectl port-forward -n $NAMESPACE svc/signaling-server 3000:3000 3001:3001 &
    PORT_FORWARD_PID=$!
    sleep 3
    EXTERNAL_IP="localhost"
fi

echo -e "${GREEN}Target: ws://$EXTERNAL_IP:3000${NC}"
echo ""

# Pre-test health check
echo -e "${YELLOW}Pre-test health check...${NC}"
HEALTH=$(curl -s http://$EXTERNAL_IP:3001/health)
echo "$HEALTH" | jq '.'
echo ""

# Get initial metrics
echo -e "${YELLOW}Initial metrics:${NC}"
INITIAL_VIEWERS=$(echo "$HEALTH" | jq -r '.totalViewers')
echo "  Current viewers: $INITIAL_VIEWERS"
echo ""

# Run load test
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  STARTING LOAD TEST${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo "  Target viewers: $TARGET_VIEWERS"
echo "  Duration: $DURATION seconds"
echo "  Ramp-up: 10ms delay between spawns"
echo ""

cd viewer-bots

echo -e "${YELLOW}Spawning $TARGET_VIEWERS viewer bots...${NC}"
node viewer-bot-simple.js --users $TARGET_VIEWERS --duration $DURATION --delay 10 &
BOT_PID=$!

# Monitor during test
echo ""
echo -e "${YELLOW}Monitoring system (press Ctrl+C to stop)...${NC}"
echo ""

for i in {1..30}; do
    sleep 10
    STATUS=$(curl -s http://$EXTERNAL_IP:3001/status)
    VIEWERS=$(echo "$STATUS" | jq -r '.totalViewers')
    PODS=$(kubectl get pods -n $NAMESPACE -l app=signaling-server --no-headers | wc -l)
    CPU=$(echo "$STATUS" | jq -r '.metrics.cpu')
    MEMORY=$(echo "$STATUS" | jq -r '.metrics.memory')
    SUCCESS_RATE=$(echo "$STATUS" | jq -r '.analytics.successRate // 100')
    
    echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} Viewers: $VIEWERS | Pods: $PODS | CPU: ${CPU}% | Memory: ${MEMORY}% | Success: ${SUCCESS_RATE}%"
    
    # Check if we've reached target
    if [ "$VIEWERS" -ge "$TARGET_VIEWERS" ]; then
        echo -e "${GREEN}✅ Target viewer count reached!${NC}"
        break
    fi
done

# Wait for test to complete
wait $BOT_PID

cd ..

# Post-test analysis
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  TEST RESULTS${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

FINAL_STATUS=$(curl -s http://$EXTERNAL_IP:3001/status)
echo "$FINAL_STATUS" | jq '.'
echo ""

# Extract metrics
FINAL_VIEWERS=$(echo "$FINAL_STATUS" | jq -r '.totalViewers')
TOTAL_CONNECTIONS=$(echo "$FINAL_STATUS" | jq -r '.analytics.totalConnections')
FAILED_CONNECTIONS=$(echo "$FINAL_STATUS" | jq -r '.analytics.failedConnections')
SUCCESS_RATE=$(echo "$FINAL_STATUS" | jq -r '.analytics.successRate // 100')
AVG_CONNECTION_TIME=$(echo "$FINAL_STATUS" | jq -r '.analytics.avgConnectionTime')

echo -e "${YELLOW}Performance Summary:${NC}"
echo "  Peak viewers: $FINAL_VIEWERS"
echo "  Total connections: $TOTAL_CONNECTIONS"
echo "  Failed connections: $FAILED_CONNECTIONS"
echo "  Success rate: ${SUCCESS_RATE}%"
echo "  Avg connection time: ${AVG_CONNECTION_TIME}ms"
echo ""

# Check HPA scaling
echo -e "${YELLOW}HPA Scaling Events:${NC}"
kubectl get hpa -n $NAMESPACE
echo ""

echo -e "${YELLOW}Pod Distribution:${NC}"
kubectl get pods -n $NAMESPACE -l app=signaling-server -o wide
echo ""

# Verify success criteria
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  SUCCESS CRITERIA${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

SUCCESS=true

# Check 1: Success rate >= 95%
if (( $(echo "$SUCCESS_RATE >= 95" | bc -l) )); then
    echo -e "${GREEN}✅ Success rate: ${SUCCESS_RATE}% (>= 95%)${NC}"
else
    echo -e "${RED}❌ Success rate: ${SUCCESS_RATE}% (< 95%)${NC}"
    SUCCESS=false
fi

# Check 2: At least 3 pods scaled
FINAL_PODS=$(kubectl get pods -n $NAMESPACE -l app=signaling-server --no-headers | wc -l)
if [ "$FINAL_PODS" -ge 3 ]; then
    echo -e "${GREEN}✅ Pod count: $FINAL_PODS (>= 3)${NC}"
else
    echo -e "${RED}❌ Pod count: $FINAL_PODS (< 3)${NC}"
    SUCCESS=false
fi

# Check 3: Reached target viewers
if [ "$FINAL_VIEWERS" -ge "$TARGET_VIEWERS" ]; then
    echo -e "${GREEN}✅ Peak viewers: $FINAL_VIEWERS (>= $TARGET_VIEWERS)${NC}"
else
    echo -e "${YELLOW}⚠️  Peak viewers: $FINAL_VIEWERS (< $TARGET_VIEWERS)${NC}"
fi

echo ""

# Cleanup
if [ ! -z "$PORT_FORWARD_PID" ]; then
    kill $PORT_FORWARD_PID 2>/dev/null || true
fi

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  ✅ LOAD TEST PASSED!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    exit 0
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  ❌ LOAD TEST FAILED${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi
