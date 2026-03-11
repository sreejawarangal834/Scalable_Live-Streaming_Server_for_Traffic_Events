#!/bin/bash

###############################################################################
# STRESS TEST SCENARIOS
#
# This script runs predefined stress test scenarios to measure system
# performance under different load conditions.
#
# Scenarios:
# 1. Simultaneous Join (10 viewers join at once)
# 2. Gradual Ramp-up (50 viewers join gradually)
# 3. Rapid Spike (100 viewers join rapidly)
# 4. Sustained Load (500 viewers for extended period)
# 5. Peak Load (1000 viewers stress test)
#
# Usage:
#   ./stress-test-scenarios.sh [scenario-number]
#   ./stress-test-scenarios.sh all
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           STRESS TEST SCENARIOS                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Scenario 1: Simultaneous Join
# 10 viewers join simultaneously to test initial connection handling
###############################################################################
scenario_1() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}SCENARIO 1: Simultaneous Join (10 viewers)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo "Description: 10 viewers join at the same time"
    echo "Purpose: Test initial connection handling and concurrency"
    echo ""
    
    OUTPUT_FILE="$RESULTS_DIR/scenario1_${TIMESTAMP}.json"
    
    cd ../viewer-bots
    node viewer-bot.js \
        --users 10 \
        --delay 0 \
        --metrics \
        --output "$OUTPUT_FILE"
    
    echo -e "${GREEN}✓ Scenario 1 completed${NC}"
    echo "Results saved to: $OUTPUT_FILE"
    echo ""
}

###############################################################################
# Scenario 2: Gradual Ramp-up
# 50 viewers join gradually over 10 seconds
###############################################################################
scenario_2() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}SCENARIO 2: Gradual Ramp-up (50 viewers)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo "Description: 50 viewers join gradually (200ms delay)"
    echo "Purpose: Test sustained connection rate"
    echo ""
    
    OUTPUT_FILE="$RESULTS_DIR/scenario2_${TIMESTAMP}.json"
    
    cd ../viewer-bots
    node viewer-bot.js \
        --users 50 \
        --delay 200 \
        --metrics \
        --output "$OUTPUT_FILE"
    
    echo -e "${GREEN}✓ Scenario 2 completed${NC}"
    echo "Results saved to: $OUTPUT_FILE"
    echo ""
}

###############################################################################
# Scenario 3: Rapid Spike
# 100 viewers join rapidly (50ms delay)
###############################################################################
scenario_3() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}SCENARIO 3: Rapid Spike (100 viewers)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo "Description: 100 viewers join rapidly (50ms delay)"
    echo "Purpose: Test system under sudden load spike"
    echo ""
    
    OUTPUT_FILE="$RESULTS_DIR/scenario3_${TIMESTAMP}.json"
    
    cd ../viewer-bots
    node viewer-bot.js \
        --users 100 \
        --delay 50 \
        --metrics \
        --output "$OUTPUT_FILE"
    
    echo -e "${GREEN}✓ Scenario 3 completed${NC}"
    echo "Results saved to: $OUTPUT_FILE"
    echo ""
}

###############################################################################
# Scenario 4: Sustained Load
# 500 viewers for extended period
###############################################################################
scenario_4() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}SCENARIO 4: Sustained Load (500 viewers)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo "Description: 500 viewers maintained for extended period"
    echo "Purpose: Test system stability under sustained load"
    echo ""
    
    OUTPUT_FILE="$RESULTS_DIR/scenario4_${TIMESTAMP}.json"
    
    cd ../viewer-bots
    node viewer-bot.js \
        --users 500 \
        --delay 20 \
        --metrics \
        --output "$OUTPUT_FILE"
    
    echo -e "${GREEN}✓ Scenario 4 completed${NC}"
    echo "Results saved to: $OUTPUT_FILE"
    echo ""
}

###############################################################################
# Scenario 5: Peak Load
# 1000 viewers stress test
###############################################################################
scenario_5() {
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}SCENARIO 5: Peak Load (1000 viewers)${NC}"
    echo -e "${YELLOW}WARNING: This is a stress test and may overwhelm the system${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo "Description: 1000 viewers to test maximum capacity"
    echo "Purpose: Find system breaking point"
    echo ""
    
    read -p "Continue with stress test? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Scenario 5 skipped"
        return
    fi
    
    OUTPUT_FILE="$RESULTS_DIR/scenario5_${TIMESTAMP}.json"
    
    cd ../viewer-bots
    node viewer-bot.js \
        --users 1000 \
        --delay 10 \
        --metrics \
        --output "$OUTPUT_FILE"
    
    echo -e "${GREEN}✓ Scenario 5 completed${NC}"
    echo "Results saved to: $OUTPUT_FILE"
    echo ""
}

###############################################################################
# Run all scenarios
###############################################################################
run_all() {
    echo "Running all stress test scenarios..."
    echo "This will take approximately 15-20 minutes"
    echo ""
    
    scenario_1
    sleep 5
    
    scenario_2
    sleep 5
    
    scenario_3
    sleep 5
    
    scenario_4
    sleep 5
    
    scenario_5
    
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ALL SCENARIOS COMPLETED                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo "Results saved in: $RESULTS_DIR"
}

###############################################################################
# Main menu
###############################################################################
show_menu() {
    echo "Select a scenario to run:"
    echo ""
    echo "  1) Simultaneous Join (10 viewers)"
    echo "  2) Gradual Ramp-up (50 viewers)"
    echo "  3) Rapid Spike (100 viewers)"
    echo "  4) Sustained Load (500 viewers)"
    echo "  5) Peak Load (1000 viewers)"
    echo "  6) Run all scenarios"
    echo "  0) Exit"
    echo ""
    read -p "Enter choice [0-6]: " choice
    
    case $choice in
        1) scenario_1 ;;
        2) scenario_2 ;;
        3) scenario_3 ;;
        4) scenario_4 ;;
        5) scenario_5 ;;
        6) run_all ;;
        0) exit 0 ;;
        *) echo "Invalid choice" ;;
    esac
}

###############################################################################
# Main execution
###############################################################################
if [ $# -eq 0 ]; then
    show_menu
elif [ "$1" == "all" ]; then
    run_all
elif [ "$1" -ge 1 ] && [ "$1" -le 5 ]; then
    scenario_$1
else
    echo "Usage: $0 [1-5|all]"
    exit 1
fi
