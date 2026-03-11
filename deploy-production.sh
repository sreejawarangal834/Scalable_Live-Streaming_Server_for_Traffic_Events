#!/bin/bash

# Production Deployment Script for Streaming System
# JPMC-Caliber Zero-Downtime Deployment

set -e

echo "========================================="
echo "  PRODUCTION DEPLOYMENT - STREAMING SYSTEM"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="streaming-system"
IMAGE_TAG="${1:-latest}"
CLUSTER_NAME="${CLUSTER_NAME:-production}"

echo -e "${CYAN}Configuration:${NC}"
echo "  Namespace: $NAMESPACE"
echo "  Image Tag: $IMAGE_TAG"
echo "  Cluster: $CLUSTER_NAME"
echo ""

# Step 1: Verify kubectl connection
echo -e "${YELLOW}[1/10] Verifying cluster connection...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Connected to cluster${NC}"
echo ""

# Step 2: Create namespace
echo -e "${YELLOW}[2/10] Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml
echo -e "${GREEN}✅ Namespace ready${NC}"
echo ""

# Step 3: Deploy Redis
echo -e "${YELLOW}[3/10] Deploying Redis...${NC}"
kubectl apply -f k8s/redis-deployment.yaml
kubectl rollout status deployment/redis -n $NAMESPACE --timeout=5m
echo -e "${GREEN}✅ Redis deployed${NC}"
echo ""

# Step 4: Build and push Docker image
echo -e "${YELLOW}[4/10] Building Docker image...${NC}"
cd signaling-server
docker build -f Dockerfile.production -t signaling-server:$IMAGE_TAG .
echo -e "${GREEN}✅ Image built${NC}"
cd ..
echo ""

# Step 5: Deploy signaling server
echo -e "${YELLOW}[5/10] Deploying signaling server...${NC}"
kubectl apply -f k8s/signaling-server-deployment.yaml
echo -e "${GREEN}✅ Deployment created${NC}"
echo ""

# Step 6: Deploy HPA
echo -e "${YELLOW}[6/10] Configuring autoscaling...${NC}"
kubectl apply -f k8s/hpa.yaml
echo -e "${GREEN}✅ HPA configured${NC}"
echo ""

# Step 7: Deploy Prometheus
echo -e "${YELLOW}[7/10] Deploying Prometheus...${NC}"
kubectl apply -f k8s/prometheus-config.yaml
kubectl rollout status deployment/prometheus -n $NAMESPACE --timeout=5m
echo -e "${GREEN}✅ Prometheus deployed${NC}"
echo ""

# Step 8: Deploy Alertmanager
echo -e "${YELLOW}[8/10] Deploying Alertmanager...${NC}"
kubectl apply -f k8s/alertmanager-config.yaml
kubectl rollout status deployment/alertmanager -n $NAMESPACE --timeout=3m
echo -e "${GREEN}✅ Alertmanager deployed${NC}"
echo ""

# Step 9: Deploy Grafana
echo -e "${YELLOW}[9/10] Deploying Grafana...${NC}"
kubectl apply -f k8s/grafana-deployment.yaml
kubectl rollout status deployment/grafana -n $NAMESPACE --timeout=5m
echo -e "${GREEN}✅ Grafana deployed${NC}"
echo ""

# Step 10: Wait for rollout
echo -e "${YELLOW}[10/10] Waiting for signaling server rollout...${NC}"
kubectl rollout status deployment/signaling-server -n $NAMESPACE --timeout=10m
echo -e "${GREEN}✅ Rollout complete${NC}"
echo ""

# Display status
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  DEPLOYMENT STATUS${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

echo -e "${YELLOW}Pods:${NC}"
kubectl get pods -n $NAMESPACE -l app=signaling-server
echo ""

echo -e "${YELLOW}Services:${NC}"
kubectl get svc -n $NAMESPACE
echo ""

echo -e "${YELLOW}HPA Status:${NC}"
kubectl get hpa -n $NAMESPACE
echo ""

# Get external IPs
SIGNALING_IP=$(kubectl get svc signaling-server-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
PROMETHEUS_IP=$(kubectl get svc prometheus -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
GRAFANA_IP=$(kubectl get svc grafana -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  ACCESS ENDPOINTS${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${GREEN}Signaling Server:${NC}"
echo "  WebSocket: ws://$SIGNALING_IP:3000"
echo "  HTTP: http://$SIGNALING_IP:3001"
echo "  Health: http://$SIGNALING_IP:3001/health"
echo "  Metrics: http://$SIGNALING_IP:3001/metrics"
echo ""
echo -e "${GREEN}Prometheus:${NC}"
echo "  URL: http://$PROMETHEUS_IP:9090"
echo ""
echo -e "${GREEN}Grafana:${NC}"
echo "  URL: http://$GRAFANA_IP:3000"
echo "  Username: admin"
echo "  Password: admin"
echo ""

# Run smoke tests
echo -e "${YELLOW}Running smoke tests...${NC}"
if [ "$SIGNALING_IP" != "pending" ]; then
    if curl -sf http://$SIGNALING_IP:3001/health > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
    fi
    
    if curl -sf http://$SIGNALING_IP:3001/metrics > /dev/null; then
        echo -e "${GREEN}✅ Metrics endpoint accessible${NC}"
    else
        echo -e "${RED}❌ Metrics endpoint failed${NC}"
    fi
else
    echo -e "${YELLOW}⏳ Waiting for LoadBalancer IP assignment...${NC}"
fi
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Access Grafana dashboard"
echo "  2. Run load test: ./test-production-load.sh"
echo "  3. Monitor metrics in Prometheus"
echo "  4. Check alerts in Alertmanager"
echo ""
