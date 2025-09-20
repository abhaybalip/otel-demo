// OpenTelemetry Demo Dashboard JavaScript

class DashboardApp {
    constructor() {
        this.baseUrl = window.location.origin;
        this.socket = null;
        this.metrics = {
            totalRequests: 0,
            avgResponseTime: 0,
            errorRate: 0,
            requestsPerMin: 0
        };
        this.traces = [];
        this.responseTimeData = [];
        this.requestVolumeData = [];
        this.charts = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initCharts();
        this.loadServiceInfo();
        this.initWebSocket();
        this.startMetricsUpdater();
        this.updateConnectionStatus(true);
    }

    initWebSocket() {
        // Load Socket.IO client
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = () => {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket');
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket');
                this.updateConnectionStatus(false);
            });

            this.socket.on('metrics', (data) => {
                this.updateMetricsFromWebSocket(data);
            });

            this.socket.on('traces', (traces) => {
                this.updateTracesFromWebSocket(traces);
            });
        };
        document.head.appendChild(script);
    }

    updateMetricsFromWebSocket(data) {
        // Update metrics display
        document.getElementById('total-requests').textContent = data.totalRequests;
        document.getElementById('avg-response-time').textContent = `${data.avgResponseTime}ms`;
        document.getElementById('error-rate').textContent = `${data.errorRate.toFixed(1)}%`;
        document.getElementById('requests-per-min').textContent = data.requestsPerMin;
        
        // Store the current metrics
        this.metrics = {
            totalRequests: data.totalRequests,
            avgResponseTime: data.avgResponseTime,
            errorRate: data.errorRate,
            requestsPerMin: data.requestsPerMin
        };
        
        // Update charts with WebSocket data
        this.updateChartsWithWebSocketData(data);
    }

    updateChartsWithWebSocketData(data) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();
        
        // Update response time chart
        const responseChart = this.charts.responseTime;
        if (responseChart) {
            responseChart.data.labels.push(timeLabel);
            responseChart.data.datasets[0].data.push(data.avgResponseTime);
            
            // Keep only last 20 data points
            if (responseChart.data.labels.length > 20) {
                responseChart.data.labels.shift();
                responseChart.data.datasets[0].data.shift();
            }
            
            responseChart.update('none');
        }
        
        // Update request volume chart (group by minute)
        const minuteLabel = now.toLocaleTimeString().substring(0, 5); // HH:MM
        const volumeChart = this.charts.requestVolume;
        
        if (volumeChart) {
            const lastLabel = volumeChart.data.labels[volumeChart.data.labels.length - 1];
            if (lastLabel === minuteLabel) {
                // Update current minute with new request count
                volumeChart.data.datasets[0].data[volumeChart.data.datasets[0].data.length - 1] = data.requestsPerMin;
            } else {
                // New minute
                volumeChart.data.labels.push(minuteLabel);
                volumeChart.data.datasets[0].data.push(data.requestsPerMin);
            }
            
            // Keep only last 10 minutes
            if (volumeChart.data.labels.length > 10) {
                volumeChart.data.labels.shift();
                volumeChart.data.datasets[0].data.shift();
            }
            
            volumeChart.update('none');
        }
    }

    updateTracesFromWebSocket(traces) {
        this.traces = traces;
        this.updateTracesDisplay();
    }

    setupEventListeners() {
        // Test endpoint button
        document.getElementById('test-btn').addEventListener('click', () => {
            this.testEndpoint();
        });

        // Load test button
        document.getElementById('load-test-btn').addEventListener('click', () => {
            this.runLoadTest();
        });

        // Endpoint selection change
        document.getElementById('endpoint-select').addEventListener('change', () => {
            this.updateDelayInputVisibility();
        });

        this.updateDelayInputVisibility();
    }

    updateDelayInputVisibility() {
        const endpoint = document.getElementById('endpoint-select').value;
        const delayInput = document.getElementById('delay-input');
        const delayGroup = delayInput.parentElement;
        
        if (endpoint === '/slow') {
            delayGroup.style.display = 'flex';
        } else {
            delayGroup.style.display = 'none';
        }
    }

    async loadServiceInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/`);
            const data = await response.json();
            
            document.getElementById('service-name').textContent = data.service.name;
            document.getElementById('service-version').textContent = data.service.version;
            document.getElementById('service-env').textContent = data.service.environment;
            
            this.updateConnectionStatus(true);
        } catch (error) {
            console.error('Failed to load service info:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (connected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    }

    async testEndpoint() {
        const endpoint = document.getElementById('endpoint-select').value;
        const delay = document.getElementById('delay-input').value;
        const testBtn = document.getElementById('test-btn');
        
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        
        const startTime = Date.now();
        
        try {
            let url = `${this.baseUrl}${endpoint}`;
            if (endpoint === '/slow' && delay) {
                url += `?delay=${delay}`;
            }
            
            const response = await fetch(url);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const data = await response.text();
            
            this.addTestResult({
                method: 'GET',
                endpoint: endpoint,
                status: response.status,
                responseTime: responseTime,
                success: response.ok,
                timestamp: new Date().toISOString(),
                data: data
            });
            
            this.updateMetrics(response.ok, responseTime);
            this.addTrace(endpoint, responseTime, response.status);
            
        } catch (error) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            this.addTestResult({
                method: 'GET',
                endpoint: endpoint,
                status: 'Error',
                responseTime: responseTime,
                success: false,
                timestamp: new Date().toISOString(),
                error: error.message
            });
            
            this.updateMetrics(false, responseTime);
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-play"></i> Test Endpoint';
        }
    }

    async runLoadTest() {
        const endpoint = document.getElementById('endpoint-select').value;
        const loadTestBtn = document.getElementById('load-test-btn');
        
        loadTestBtn.disabled = true;
        loadTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Load Test...';
        
        const promises = [];
        const testCount = 10;
        
        for (let i = 0; i < testCount; i++) {
            promises.push(this.performSingleRequest(endpoint, i + 1));
        }
        
        try {
            await Promise.all(promises);
            this.addTestResult({
                method: 'LOAD TEST',
                endpoint: endpoint,
                status: 'Completed',
                responseTime: null,
                success: true,
                timestamp: new Date().toISOString(),
                data: `Completed ${testCount} requests`
            });
        } catch (error) {
            console.error('Load test failed:', error);
        } finally {
            loadTestBtn.disabled = false;
            loadTestBtn.innerHTML = '<i class="fas fa-bolt"></i> Load Test (10 requests)';
        }
    }

    async performSingleRequest(endpoint, requestNumber) {
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            this.updateMetrics(response.ok, responseTime);
            this.addTrace(`${endpoint} #${requestNumber}`, responseTime, response.status);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            this.updateMetrics(false, responseTime);
        }
    }

    addTestResult(result) {
        const resultsContainer = document.getElementById('test-results');
        
        // Remove "no results" message if it exists
        const noResults = resultsContainer.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
        
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';
        resultElement.innerHTML = `
            <div class="result-header">
                <span class="result-method">${result.method} ${result.endpoint}</span>
                <span class="result-status ${result.success ? 'status-success' : 'status-error'}">
                    ${result.status}
                </span>
            </div>
            <div class="result-time">
                ${result.responseTime !== null ? `${result.responseTime}ms` : ''} • ${new Date(result.timestamp).toLocaleTimeString()}
            </div>
        `;
        
        resultsContainer.insertBefore(resultElement, resultsContainer.firstChild);
        
        // Keep only last 10 results
        const results = resultsContainer.querySelectorAll('.result-item');
        if (results.length > 10) {
            results[results.length - 1].remove();
        }
    }

    updateMetrics(success, responseTime) {
        this.metrics.totalRequests++;
        
        // Update average response time
        if (this.responseTimeData.length === 0) {
            this.metrics.avgResponseTime = responseTime;
        } else {
            const totalTime = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + responseTime;
            this.metrics.avgResponseTime = Math.round(totalTime / this.metrics.totalRequests);
        }
        
        // Update error rate
        const errorCount = this.traces.filter(trace => trace.status >= 400).length;
        this.metrics.errorRate = Math.round((errorCount / this.metrics.totalRequests) * 100);
        
        // Update requests per minute (simplified calculation)
        this.metrics.requestsPerMin = Math.min(this.metrics.totalRequests, 60);
        
        // Update display
        document.getElementById('total-requests').textContent = this.metrics.totalRequests;
        document.getElementById('avg-response-time').textContent = `${this.metrics.avgResponseTime}ms`;
        document.getElementById('error-rate').textContent = `${this.metrics.errorRate}%`;
        document.getElementById('requests-per-min').textContent = this.metrics.requestsPerMin;
        
        // Update charts
        this.updateCharts(responseTime);
    }

    addTrace(operation, duration, status) {
        const trace = {
            operation: operation,
            duration: duration,
            status: status,
            timestamp: new Date().toISOString(),
            traceId: this.generateTraceId()
        };
        
        this.traces.unshift(trace);
        
        // Keep only last 20 traces
        if (this.traces.length > 20) {
            this.traces = this.traces.slice(0, 20);
        }
        
        this.updateTracesDisplay();
    }

    updateTracesDisplay() {
        const tracesContainer = document.getElementById('traces-container');
        
        // Remove "no traces" message if it exists
        const noTraces = tracesContainer.querySelector('.no-traces');
        if (noTraces) {
            noTraces.remove();
        }
        
        tracesContainer.innerHTML = '';
        
        this.traces.forEach(trace => {
            const traceElement = document.createElement('div');
            traceElement.className = 'trace-item';
            traceElement.innerHTML = `
                <div class="trace-header">
                    <span class="trace-operation">${trace.operation}</span>
                    <span class="trace-duration">${trace.duration}ms</span>
                </div>
                <div class="trace-details">
                    <span>Status: ${trace.status}</span>
                    <span>Trace ID: ${trace.traceId}</span>
                    <span>${new Date(trace.timestamp).toLocaleTimeString()}</span>
                </div>
            `;
            tracesContainer.appendChild(traceElement);
        });
    }

    generateTraceId() {
        return Math.random().toString(16).substr(2, 8) + '-' + 
               Math.random().toString(16).substr(2, 4) + '-' + 
               Math.random().toString(16).substr(2, 4);
    }

    initCharts() {
        // Response Time Chart
        const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
        this.charts.responseTime = new Chart(responseTimeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Request Volume Chart
        const requestVolumeCtx = document.getElementById('requestVolumeChart').getContext('2d');
        this.charts.requestVolume = new Chart(requestVolumeCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Requests',
                    data: [],
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Requests'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time Window'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Initialize charts with some historical data
        this.populateChartsWithInitialData();
    }

    populateChartsWithInitialData() {
        // Add some initial data points to make the charts look more realistic
        const now = new Date();
        
        // Add 10 historical data points for response time
        for (let i = 9; i >= 0; i--) {
            const timePoint = new Date(now.getTime() - (i * 30000)); // 30 seconds apart
            const responseTime = Math.floor(Math.random() * 300) + 50; // 50-350ms
            
            this.charts.responseTime.data.labels.push(timePoint.toLocaleTimeString());
            this.charts.responseTime.data.datasets[0].data.push(responseTime);
        }
        
        // Add 10 historical data points for request volume
        for (let i = 9; i >= 0; i--) {
            const timePoint = new Date(now.getTime() - (i * 60000)); // 1 minute apart
            const requestCount = Math.floor(Math.random() * 50) + 10; // 10-60 requests
            
            this.charts.requestVolume.data.labels.push(timePoint.toLocaleTimeString().substring(0, 5));
            this.charts.requestVolume.data.datasets[0].data.push(requestCount);
        }
        
        // Update both charts
        this.charts.responseTime.update();
        this.charts.requestVolume.update();
    }

    updateCharts(responseTime) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();
        
        // Update response time chart
        const responseChart = this.charts.responseTime;
        responseChart.data.labels.push(timeLabel);
        responseChart.data.datasets[0].data.push(responseTime);
        
        // Keep only last 20 data points
        if (responseChart.data.labels.length > 20) {
            responseChart.data.labels.shift();
            responseChart.data.datasets[0].data.shift();
        }
        
        responseChart.update('none');
        
        // Update request volume chart (group by minute)
        const minuteLabel = now.toLocaleTimeString().substring(0, 5); // HH:MM
        const volumeChart = this.charts.requestVolume;
        
        const lastLabel = volumeChart.data.labels[volumeChart.data.labels.length - 1];
        if (lastLabel === minuteLabel) {
            // Increment current minute
            volumeChart.data.datasets[0].data[volumeChart.data.datasets[0].data.length - 1]++;
        } else {
            // New minute
            volumeChart.data.labels.push(minuteLabel);
            volumeChart.data.datasets[0].data.push(1);
        }
        
        // Keep only last 10 minutes
        if (volumeChart.data.labels.length > 10) {
            volumeChart.data.labels.shift();
            volumeChart.data.datasets[0].data.shift();
        }
        
        volumeChart.update('none');
    }

    startMetricsUpdater() {
        // Update uptime every second
        setInterval(() => {
            this.updateUptime();
            this.updateLastUpdated();
        }, 1000);
        
        // Try to reconnect if disconnected
        setInterval(async () => {
            try {
                await fetch(`${this.baseUrl}/health`);
                this.updateConnectionStatus(true);
            } catch (error) {
                this.updateConnectionStatus(false);
            }
        }, 30000); // Check every 30 seconds
    }

    updateUptime() {
        // This is a simplified uptime calculation
        // In a real app, you'd get this from the server
        const startTime = sessionStorage.getItem('dashboardStartTime');
        if (!startTime) {
            sessionStorage.setItem('dashboardStartTime', Date.now().toString());
            return;
        }
        
        const uptimeMs = Date.now() - parseInt(startTime);
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        const uptimeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('service-uptime').textContent = uptimeString;
    }

    updateLastUpdated() {
        document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});