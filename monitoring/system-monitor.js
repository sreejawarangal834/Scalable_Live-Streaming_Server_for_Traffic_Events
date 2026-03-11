/**
 * SYSTEM RESOURCE MONITOR
 * 
 * Monitors server resources and broadcasts metrics:
 * - CPU usage
 * - Memory usage
 * - Network bandwidth
 * - Active connections
 */

const os = require('os');

class SystemMonitor {
    constructor() {
        this.previousNetworkStats = null;
        this.startTime = Date.now();
        this.totalBytesReceived = 0;
        this.totalBytesSent = 0;
    }
    
    /**
     * Get CPU usage percentage
     */
    getCPUUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - ~~(100 * idle / total);
        
        return Math.max(0, Math.min(100, usage));
    }
    
    /**
     * Get memory usage
     */
    getMemoryUsage() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const usagePercent = (usedMem / totalMem) * 100;
        
        return {
            total: this.formatBytes(totalMem),
            used: this.formatBytes(usedMem),
            free: this.formatBytes(freeMem),
            percentage: Math.round(usagePercent)
        };
    }
    
    /**
     * Get network statistics
     */
    getNetworkStats() {
        const networkInterfaces = os.networkInterfaces();
        let totalReceived = 0;
        let totalSent = 0;
        
        // Note: Node.js os module doesn't provide network I/O stats
        // We'll simulate based on connection activity
        return {
            received: this.formatBytes(this.totalBytesReceived),
            sent: this.formatBytes(this.totalBytesSent),
            bandwidth: this.calculateBandwidth()
        };
    }
    
    /**
     * Calculate bandwidth usage in Mbps
     */
    calculateBandwidth() {
        const uptime = (Date.now() - this.startTime) / 1000;
        const totalBytes = this.totalBytesReceived + this.totalBytesSent;
        const bytesPerSecond = totalBytes / uptime;
        const mbps = (bytesPerSecond * 8) / (1024 * 1024);
        return mbps.toFixed(2);
    }
    
    /**
     * Update network statistics
     */
    updateNetworkStats(bytesReceived, bytesSent) {
        this.totalBytesReceived += bytesReceived;
        this.totalBytesSent += bytesSent;
    }
    
    /**
     * Get system uptime
     */
    getUptime() {
        const uptime = os.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    /**
     * Get all metrics
     */
    getAllMetrics() {
        const memory = this.getMemoryUsage();
        const network = this.getNetworkStats();
        
        return {
            cpu: this.getCPUUsage(),
            memory: memory.percentage,
            memoryDetails: memory,
            bandwidth: network.bandwidth,
            networkDetails: network,
            uptime: this.getUptime(),
            timestamp: Date.now()
        };
    }
    
    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = SystemMonitor;
