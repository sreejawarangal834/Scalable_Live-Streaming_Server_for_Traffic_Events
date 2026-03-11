/**
 * LIVE STREAM ANALYTICS DASHBOARD
 * Real-time monitoring and analytics
 */

// WebSocket connection
let ws = null;
let reconnectInterval = null;

// Charts
let viewerChart = null;
let resourceChart = null;

// Latency measurement
let latencyMeasurements = [];
const MAX_LATENCY_SAMPLES = 10;

// Data storage
let viewerHistoryData = [];
let resourceHistoryData = {
    cpu: [],
    memory: []
};
const MAX_RESOURCE_HISTORY = 30;

/**
 * Initialize dashboard
 */
function initDashboard() {
    console.log('Initializing dashboard...');
    initCharts();
    connectWebSocket();
    startLatencyMonitoring();
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
    const WS_URL = 'ws://localhost:3000';
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('Connected to signaling server');
            updateConnectionStatus(true);
            
            // Identify as dashboard client
            ws.send(JSON.stringify({
                type: 'dashboard-connect'
            }));
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus(false);
        };
        
        ws.onclose = () => {
            console.log('Disconnected from server');
            updateConnectionStatus(false);
            
            // Attempt to reconnect
            if (!reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    console.log('Attempting to reconnect...');
                    connectWebSocket();
                }, 5000);
            }
        };
        
    } catch (error) {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
    }
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(data) {
    switch (data.type) {
        case 'initial_data':
            handleInitialData(data);
            break;
        case 'viewer_count':
            updateViewerCount(data.viewers);
            break;
        case 'stream_status':
            updateStreamStatus(data.status, data.broadcasters);
            break;
        case 'server_metrics':
            updateServerMetrics(data);
            break;
        case 'analytics_update':
            updateAnalytics(data);
            break;
        case 'viewer_history':
            updateViewerHistory(data.history);
            break;
        case 'pong':
            handlePong(data.timestamp);
            break;
    }
    
    updateLastUpdateTime();
}

/**
 * Handle initial data
 */
function handleInitialData(data) {
    console.log('Received initial data:', data);
    
    updateViewerCount(data.viewers);
    updateStreamStatus(data.broadcasters > 0 ? 'ONLINE' : 'OFFLINE', data.broadcasters);
    
    if (data.history) {
        updateViewerHistory(data.history);
    }
    
    if (data.analytics) {
        updateAnalytics(data.analytics);
    }
    
    if (data.metrics) {
        updateServerMetrics(data.metrics);
    }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('span:last-child');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'Connected';
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

/**
 * Update viewer count
 */
function updateViewerCount(count) {
    const el = document.getElementById('viewerCount');
    animateValue(el, parseInt(el.textContent) || 0, count, 500);
}

/**
 * Update stream status
 */
function updateStreamStatus(status, broadcasters = 0) {
    const statusEl = document.getElementById('streamStatus');
    const broadcasterEl = document.getElementById('broadcasterCount');
    const card = document.querySelector('.status-card');
    
    statusEl.textContent = status;
    broadcasterEl.textContent = `${broadcasters} broadcaster${broadcasters !== 1 ? 's' : ''}`;
    
    if (status === 'ONLINE') {
        card.classList.add('online');
        card.classList.remove('offline');
    } else {
        card.classList.add('offline');
        card.classList.remove('online');
    }
}

/**
 * Update server metrics
 */
function updateServerMetrics(metrics) {
    // CPU
    const cpuEl = document.getElementById('cpuUsage');
    cpuEl.textContent = `${metrics.cpu}%`;
    updateCardColor(document.querySelector('.cpu-card'), metrics.cpu, 70, 90);
    
    // Memory
    const memoryEl = document.getElementById('memoryUsage');
    const memoryDetailsEl = document.getElementById('memoryDetails');
    memoryEl.textContent = `${metrics.memory}%`;
    if (metrics.memoryDetails) {
        memoryDetailsEl.textContent = `${metrics.memoryDetails.used} used`;
    }
    updateCardColor(document.querySelector('.memory-card'), metrics.memory, 70, 90);
    
    // Bandwidth
    const bandwidthEl = document.getElementById('bandwidth');
    bandwidthEl.textContent = `${metrics.bandwidth} Mbps`;
    
    // Uptime
    if (metrics.uptime) {
        document.getElementById('serverUptime').textContent = metrics.uptime;
    }
    
    // Update resource chart
    updateResourceChart(metrics.cpu, metrics.memory);
}

/**
 * Update analytics data
 */
function updateAnalytics(data) {
    document.getElementById('totalConnections').textContent = data.totalConnections || 0;
    document.getElementById('successRate').textContent = `${data.successRate || 100}%`;
    document.getElementById('failedConnections').textContent = data.failedConnections || 0;
    document.getElementById('avgConnectionTime').textContent = `${data.avgConnectionTime || 0} ms`;
    document.getElementById('totalDisconnections').textContent = data.totalDisconnections || 0;
    
    // Update geographic distribution
    if (data.viewersByRegion) {
        updateGeographicDistribution(data.viewersByRegion);
    }
}

/**
 * Update viewer history chart
 */
function updateViewerHistory(history) {
    if (!history || history.length === 0) return;
    
    viewerHistoryData = history;
    
    const labels = history.map((_, index) => `${index}s`);
    const data = history.map(item => item.viewers);
    
    viewerChart.data.labels = labels;
    viewerChart.data.datasets[0].data = data;
    viewerChart.update('none'); // Update without animation for smooth real-time
}

/**
 * Update resource chart
 */
function updateResourceChart(cpu, memory) {
    resourceHistoryData.cpu.push(cpu);
    resourceHistoryData.memory.push(memory);
    
    // Keep only last MAX_RESOURCE_HISTORY points
    if (resourceHistoryData.cpu.length > MAX_RESOURCE_HISTORY) {
        resourceHistoryData.cpu.shift();
        resourceHistoryData.memory.shift();
    }
    
    const labels = resourceHistoryData.cpu.map((_, index) => `${index * 2}s`);
    
    resourceChart.data.labels = labels;
    resourceChart.data.datasets[0].data = resourceHistoryData.cpu;
    resourceChart.data.datasets[1].data = resourceHistoryData.memory;
    resourceChart.update('none');
}

/**
 * Update geographic distribution table
 */
function updateGeographicDistribution(regions) {
    const tbody = document.getElementById('regionTable');
    const totalViewers = Object.values(regions).reduce((a, b) => a + b, 0);
    
    let html = '';
    for (const [region, count] of Object.entries(regions)) {
        const percentage = totalViewers > 0 ? (count / totalViewers * 100).toFixed(1) : 0;
        const barWidth = percentage;
        
        html += `
            <tr>
                <td>${region}</td>
                <td><strong>${count}</strong></td>
                <td>${percentage}%</td>
                <td>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${barWidth}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
}

/**
 * Initialize charts
 */
function initCharts() {
    // Viewer Activity Chart
    const viewerCtx = document.getElementById('viewerChart').getContext('2d');
    viewerChart = new Chart(viewerCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Active Viewers',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Resource Chart
    const resourceCtx = document.getElementById('resourceChart').getContext('2d');
    resourceChart = new Chart(resourceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU Usage (%)',
                    data: [],
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245, 101, 101, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Memory Usage (%)',
                    data: [],
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Start latency monitoring
 */
function startLatencyMonitoring() {
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
        }
    }, 3000);
}

/**
 * Handle pong response for latency
 */
function handlePong(sentTimestamp) {
    const latency = Date.now() - sentTimestamp;
    latencyMeasurements.push(latency);
    
    if (latencyMeasurements.length > MAX_LATENCY_SAMPLES) {
        latencyMeasurements.shift();
    }
    
    const avgLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
    document.getElementById('latency').textContent = `${Math.round(avgLatency)} ms`;
    
    const card = document.querySelector('.latency-card');
    updateCardColor(card, avgLatency, 100, 200);
}

/**
 * Update card color based on value thresholds
 */
function updateCardColor(card, value, warningThreshold, dangerThreshold) {
    card.classList.remove('warning', 'danger');
    
    if (value >= dangerThreshold) {
        card.classList.add('danger');
    } else if (value >= warningThreshold) {
        card.classList.add('warning');
    }
}

/**
 * Animate number value
 */
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

/**
 * Update last update time
 */
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('lastUpdate').textContent = timeString;
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);
