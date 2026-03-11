#!/usr/bin/env node

/**
 * Browser-based Load Test using Puppeteer
 * Simulates real browser viewers with actual WebRTC connections
 * Usage: node browser-load-test.js [number-of-browsers]
 * Example: node browser-load-test.js 10
 */

const puppeteer = require('puppeteer');

const NUM_BROWSERS = parseInt(process.argv[2]) || 5;
const VIEWER_URL = 'http://localhost:8080/viewer.html';
const ROOM_ID = 1234;

console.log('='.repeat(60));
console.log('BROWSER-BASED LOAD TEST');
console.log('='.repeat(60));
console.log(`Opening ${NUM_BROWSERS} browser instances`);
console.log(`Target URL: ${VIEWER_URL}`);
console.log(`Room ID: ${ROOM_ID}`);
console.log('='.repeat(60));
console.log('');

const browsers = [];
const stats = {
    launched: 0,
    joined: 0,
    streaming: 0,
    failed: 0
};

async function launchViewer(id) {
    try {
        console.log(`[${id}] Launching browser...`);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        });
        
        stats.launched++;
        browsers.push(browser);
        
        const page = await browser.newPage();
        
        // Listen to console logs
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Received remote stream')) {
                stats.streaming++;
                console.log(`[${id}] ✓ Receiving stream!`);
            }
        });
        
        // Navigate to viewer page
        await page.goto(VIEWER_URL, { waitUntil: 'networkidle0' });
        
        // Set room ID
        await page.evaluate((roomId) => {
            document.getElementById('roomInput').value = roomId;
        }, ROOM_ID);
        
        // Click join button
        await page.click('#joinBtn');
        stats.joined++;
        
        console.log(`[${id}] Joined stream`);
        
        return browser;
        
    } catch (error) {
        stats.failed++;
        console.error(`[${id}] Error:`, error.message);
        return null;
    }
}

async function runTest() {
    console.log('Starting browser load test...\n');
    
    const startTime = Date.now();
    
    // Launch browsers sequentially with delay
    for (let i = 1; i <= NUM_BROWSERS; i++) {
        await launchViewer(i);
        
        // Small delay between launches
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`Progress: ${i}/${NUM_BROWSERS}\n`);
    }
    
    const launchTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total time: ${(launchTime/1000).toFixed(1)}s`);
    console.log(`Browsers launched: ${stats.launched}/${NUM_BROWSERS}`);
    console.log(`Joined stream: ${stats.joined}/${NUM_BROWSERS}`);
    console.log(`Receiving stream: ${stats.streaming}/${NUM_BROWSERS}`);
    console.log(`Failed: ${stats.failed}`);
    console.log('='.repeat(60));
    console.log('\nBrowsers will remain open. Press Ctrl+C to close all.\n');
}

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n\nClosing all browsers...');
    
    for (const browser of browsers) {
        try {
            await browser.close();
        } catch (err) {
            // Ignore
        }
    }
    
    console.log('Done.');
    process.exit(0);
});

// Run the test
runTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
