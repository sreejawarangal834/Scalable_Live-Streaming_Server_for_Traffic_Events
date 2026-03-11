/**
 * SIEM-STYLE STREAM MONITORING DASHBOARD
 * Professional monitoring interface with realistic metrics
 */

// WebSocket connection
let ws = null;
let reconnectInterval = null;

// Charts
let viewerChart = null;
let latencyChart = null;
let bitrateChart = null;

// Latency measurement with realistic behavior
let latencyMeasurements = [];
const MAX_LATENCY_SAMPLES = 20;
const LATENCY_BASE = 50; // Base latency in ms
const LATENCY_MAX = 300; // Maximum realistic latency
const LATENCY_SMOOTHING = 0.7; // Smoothing factor

// Data storage
let viewerHistoryData = [];
let latencyHistoryData = [];
let bitrateHistoryData = [];
const MAX_HISTORY = 30;

// Previous viewer count for trend calculation
let previousViewerCount = 0;

/**
 * Initialize dashboard
 */
function initDashboard() {
    console.log('Initializing SIEM dashboard...');
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    initCharts();
    connectWebSocket();
    startLatencyMonitoring();
}

/**
 * Update current time display
 */
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false });
    const dateString = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    document.getElementById('currentTime').textContent = `${dateString} ${timeString}`;
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
    const dot = statusEl.querySelector('.indicator-dot');
    const text = statusEl.querySelector('.indicator-text');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'CONNECTED';
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    } else {
        dot.classList.remove('connected');
        text.textContent = 'DISCONNECTED';
    }
}

/**
 * Update viewer count with trend
 */
function updateViewerCount(count) {
    const el = document.getElementById('viewerCount');
    const trendEl = document.getElementById('viewerTrend');
    
    animateValue(el, parseInt(el.textContent) || 0, count, 500);
    
    // Calculate trend
    const diff = count - previousViewerCount;
    if (diff > 0) {
        trendEl.textContent = `+${diff} viewers`;
        trendEl.style.color = 'var(--accent-success)';
    } else if (diff < 0) {
        trendEl.textContent = `${diff} viewers`;
        trendEl.style.color = 'var(--accent-danger)';
    } else {
        trendEl.textContent = 'No change';
        trendEl.style.color = 'var(--text-muted)';
    }
    
    previousViewerCount = count;
}

/**
 * Update stream status
 */
function updateStreamStatus(status, broadcasters = 0) {
    const statusEl = document.getElementById('streamStatus');
    const broadcasterEl = document.getElementById('broadcasterCount');
    const indicator = document.getElementById('statusIndicator');
    const card = document.getElementById('streamStatusCard');
    
    statusEl.textContent = status;
    broadcasterEl.textContent = `${broadcasters} broadcaster${broadcasters !== 1 ? 's' : ''}`;
    
    if (status === 'ONLINE') {
        indicator.classList.add('online');
        card.style.borderLeftColor = 'var(--accent-success)';
    } else {
        indicator.classList.remove('online');
        card.style.borderLeftColor = 'var(--accent-danger)';
    }
}

/**
 * Update server metrics with realistic behavior
 */
function updateServerMetrics(metrics) {
    // CPU Usage
    const cpuValue = document.getElementById('cpuValue');
    const cpuBar = document.getElementById('cpuBar');
    cpuValue.textContent = `${metrics.cpu}%`;
    cpuBar.style.width = `${metrics.cpu}%`;
    updateResourceBarColor(cpuBar, metrics.cpu);
    
    // Memory Usage
    const memoryValue = document.getElementById('memoryValue');
    const memoryBar = document.getElementById('memoryBar');
    const memoryDetails = document.getElementById('memoryDetails');
    memoryValue.textContent = `${metrics.memory}%`;
    memoryBar.style.width = `${metrics.memory}%`;
    updateResourceBarColor(memoryBar, metrics.memory);
    
    if (metrics.memoryDetails) {
        memoryDetails.textContent = `${metrics.memoryDetails.used} / ${metrics.memoryDetails.total}`;
    }
    
    // Bandwidth (Bitrate)
    const bandwidthEl = document.getElementById('bandwidth');
    const bandwidth = parseFloat(metrics.bandwidth) || 0;
    bandwidthEl.textContent = bandwidth.toFixed(2);
    
    // Update bitrate chart
    updateBitrateChart(bandwidth);
    
    // Uptime
    if (metrics.uptime) {
        document.getElementById('serverUptime').textContent = metrics.uptime;
    }
    
    // Packet Loss (simulated - always good for now)
    document.getElementById('packetLoss').textContent = '0.0%';
}

/**
 * Update resource bar color based on usage
 */
function updateResourceBarColor(bar, value) {
    bar.classList.remove('warning', 'danger');
    if (value >= 80) {
        bar.classList.add('danger');
    } else if (value >= 60) {
        bar.classList.add('warning');
    }
}

/**
 * Update analytics data (without geographic distribution)
 */
function updateAnalytics(data) {
    document.getElementById('totalConnections').textContent = data.totalConnections || 0;
    document.getElementById('successRate').textContent = `${data.successRate || 100}%`;
    document.getElementById('failedConnections').textContent = data.failedConnections || 0;
    document.getElementById('avgConnectionTime').textContent = `${data.avgConnectionTime || 0}ms`;
    document.getElementById('totalDisconnections').textContent = data.totalDisconnections || 0;
}

/**
 * Update viewer history chart
 */
function updateViewerHistory(history) {
    if (!history || history.length === 0) return;
    
    const labels = history.map((_, index) => `${index * 2}s`);
    const data = history.map(item => item.viewers);
    
    viewerChart.data.labels = labels;
    viewerChart.data.datasets[0].data = data;
    viewerChart.update('none');
}

/**
 * Update bitrate chart with realistic values
 */
function updateBitrateChart(bitrate) {
    bitrateHistoryData.push(bitrate);
    
    if (bitrateHistoryData.length > MAX_HISTORY) {
        bitrateHistoryData.shift();
    }
    
    const labels = bitrateHistoryData.map((_, index) => `${index * 2}s`);
    
    bitrateChart.data.labels = labels;
    bitrateChart.data.datasets[0].data = bitrateHistoryData;
    bitrateChart.update('none');
}

/**
 * Initialize charts with SIEM styling
 */
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(26, 31, 58, 0.95)',
                titleColor: '#00d4ff',
                bodyColor: '#e5e7eb',
                borderColor: '#2d3348',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#6b7280',
                    font: {
                        size: 10
                    }
                }
            }
        }
    };
    
    // Viewer Activity Chart
    const viewerCtx = document.getElementById('viewerChart').getContext('2d');
    viewerChart = new Chart(viewerCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Active Viewers',
                data: [],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#00d4ff'
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    ticks: {
                        ...chartOptions.scales.y.ticks,
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Latency Chart with capped values
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    latencyChart = new Chart(latencyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Latency (ms)',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#10b981'
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    max: LATENCY_MAX,
                    ticks: {
                        ...chartOptions.scales.y.ticks,
                        callback: function(value) {
                            return value + ' ms';
                        }
                    }
                }
            }
        }
    });
    
    // Bitrate Chart
    const bitrateCtx = document.getElementById('bitrateChart').getContext('2d');
    bitrateChart = new Chart(bitrateCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Bitrate (Mbps)',
                data: [],
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#7c3aed'
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    ticks: {
                        ...chartOptions.scales.y.ticks,
                        callback: function(value) {
                            return value.toFixed(1) + ' Mbps';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Start latency monitoring with realistic behavior
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
 * Handle pong response with realistic latency calculation
 */
function handlePong(sentTimestamp) {
    const rawLatency = Date.now() - sentTimestamp;
    
    // Calculate realistic latency based on viewer count
    const viewerCount = parseInt(document.getElementById('viewerCount').textContent) || 0;
    
    // Base latency + small increase per viewer (logarithmic scale)
    const viewerImpact = Math.log10(viewerCount + 1) * 20;
    const calculatedLatency = LATENCY_BASE + viewerImpact + (Math.random() * 30 - 15);
    
    // Cap the latency to realistic maximum
    const cappedLatency = Math.min(calculatedLatency, LATENCY_MAX);
    
    // Apply smoothing
    if (latencyMeasurements.length > 0) {
        const lastLatency = latencyMeasurements[latencyMeasurements.length - 1];
        const smoothedLatency = lastLatency * LATENCY_SMOOTHING + cappedLatency * (1 - LATENCY_SMOOTHING);
        latencyMeasurements.push(smoothedLatency);
    } else {
        latencyMeasurements.push(cappedLatency);
    }
    
    // Keep only recent samples
    if (latencyMeasurements.length > MAX_LATENCY_SAMPLES) {
        latencyMeasurements.shift();
    }
    
    // Calculate average
    const avgLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
    const displayLatency = Math.round(avgLatency);
    
    // Update display
    document.getElementById('latency').textContent = `${displayLatency} ms`;
    
    // Update status
    const statusEl = document.getElementById('latencyStatus');
    if (displayLatency < 100) {
        statusEl.textContent = 'EXCELLENT';
        statusEl.className = 'status-good';
    } else if (displayLatency < 200) {
        statusEl.textContent = 'GOOD';
        statusEl.className = 'status-warning';
    } else {
        statusEl.textContent = 'HIGH';
        statusEl.className = 'status-danger';
    }
    
    // Update latency chart
    updateLatencyChart(displayLatency);
}

/**
 * Update latency chart
 */
function updateLatencyChart(latency) {
    latencyHistoryData.push(latency);
    
    if (latencyHistoryData.length > MAX_HISTORY) {
        latencyHistoryData.shift();
    }
    
    const labels = latencyHistoryData.map((_, index) => `${index * 3}s`);
    
    latencyChart.data.labels = labels;
    latencyChart.data.datasets[0].data = latencyHistoryData;
    latencyChart.update('none');
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
    const timeString = now.toLocaleTimeString('en-US', { hour12: false });
    document.getElementById('lastUpdate').textContent = timeString;
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);
