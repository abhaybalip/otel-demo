# OpenTelemetry Collector Deployment Guide

This directory contains all the necessary files to deploy the OpenTelemetry Collector on a separate server for collecting telemetry data from your Node.js applications.

## 📁 Directory Structure

```
otel-collector-deployment/
├── otel-collector-config.yaml    # Main collector configuration
├── docker-compose.yml            # Docker deployment
├── .env.example                  # Environment variables template
├── prometheus-local.yml          # Local Prometheus config for testing
├── logs/                         # Log directory
├── README.md                     # This file
├── deploy.sh                     # Deployment script (Linux/Mac)
├── deploy.ps1                    # Deployment script (Windows)
└── monitoring/
    ├── grafana-dashboards/       # Collector monitoring dashboards
    └── prometheus-rules/         # Alerting rules
```

## 🚀 Quick Deployment

### Prerequisites
- Docker and Docker Compose installed
- Network connectivity to Node.js applications
- Access to Prometheus and Jaeger backends

### Step 1: Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

### Step 2: Deploy Collector
```bash
# Production deployment
docker-compose up -d

# With local testing services
COMPOSE_PROFILES=local-testing docker-compose up -d
```

### Step 3: Verify Deployment
```bash
# Check collector health
curl http://localhost:13133

# View collector metrics
curl http://localhost:8888/metrics

# Check exported metrics
curl http://localhost:8889/metrics
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_APP_HOST` | Primary Node.js app host | 10.0.0.100 |
| `NODE_APP_PORT` | Primary Node.js app port | 3000 |
| `PROMETHEUS_ENDPOINT` | Prometheus server URL | http://10.0.0.200:9090 |
| `JAEGER_ENDPOINT` | Jaeger collector endpoint | 10.0.0.201:14250 |
| `DEPLOYMENT_ENV` | Environment name | production |
| `COLLECTOR_INSTANCE` | Collector instance ID | collector-01 |
| `LOG_LEVEL` | Logging level | info |

### Network Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Node.js App   │───▶│ OTel Collector   │───▶│   Prometheus    │
│  (10.0.0.100)   │    │  (10.0.0.150)    │    │  (10.0.0.200)   │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
┌─────────────────┐    │                  │───▶│     Jaeger      │
│   Node.js App   │───▶│                  │    │  (10.0.0.201)   │
│  (10.0.0.101)   │    └──────────────────┘    └─────────────────┘
└─────────────────┘
```

## 🔧 Collector Endpoints

| Port | Service | Description |
|------|---------|-------------|
| 4317 | OTLP gRPC | Receive traces/metrics from apps |
| 4318 | OTLP HTTP | Receive traces/metrics from apps |
| 8888 | Internal | Collector internal metrics |
| 8889 | Prometheus | Exported application metrics |
| 13133 | Health | Health check endpoint |
| 1777 | pprof | Performance profiling |
| 55679 | zpages | Debug information |

## 📊 Monitoring the Collector

### Health Checks
```bash
# Basic health
curl http://collector-server:13133

# Detailed status via zpages
curl http://collector-server:55679/debug/tracez
curl http://collector-server:55679/debug/pipelinez
```

### Internal Metrics
The collector exposes its own metrics at `:8888/metrics` including:
- Pipeline throughput
- Receiver statistics  
- Exporter success/failure rates
- Memory and CPU usage

### Log Analysis
```bash
# View collector logs
docker-compose logs -f otel-collector

# Check for errors
docker-compose logs otel-collector | grep ERROR
```

## 🔒 Security Considerations

### Firewall Rules
```bash
# Allow Node.js apps to send data
iptables -A INPUT -p tcp --dport 4317 -s 10.0.0.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 4318 -s 10.0.0.0/24 -j ACCEPT

# Allow monitoring access
iptables -A INPUT -p tcp --dport 13133 -s monitoring-subnet -j ACCEPT
```

### TLS Configuration
For production, enable TLS in the collector config:
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          cert_file: /etc/ssl/certs/collector.crt
          key_file: /etc/ssl/private/collector.key
```

## 📈 Scaling

### Horizontal Scaling
Deploy multiple collector instances behind a load balancer:
```yaml
# docker-compose.override.yml
services:
  otel-collector:
    scale: 3
```

### Vertical Scaling
Adjust resource limits in docker-compose.yml:
```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check firewall rules
   - Verify collector is listening on correct interfaces
   - Test connectivity: `telnet collector-server 4318`

2. **High Memory Usage**
   - Reduce batch sizes in configuration
   - Increase memory limits
   - Check for memory leaks in exporters

3. **Missing Metrics**
   - Verify scrape targets are reachable
   - Check Prometheus receiver configuration
   - Review collector logs for errors

### Debug Commands
```bash
# Check network connectivity
docker exec otel-collector wget -qO- http://node-app:3000/metrics

# Test OTLP endpoint
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'

# View configuration
docker exec otel-collector cat /etc/otel-collector-config.yaml
```

## 📋 Production Checklist

- [ ] Configure proper resource limits
- [ ] Set up TLS encryption
- [ ] Configure authentication for backends  
- [ ] Set up monitoring and alerting for collector
- [ ] Configure log rotation
- [ ] Set up backup for configuration
- [ ] Test failover scenarios
- [ ] Document network topology
- [ ] Configure firewall rules
- [ ] Set up service discovery (if using)

## 🔄 Updates and Maintenance

### Updating Collector
```bash
# Pull latest image
docker-compose pull otel-collector

# Restart with new image
docker-compose up -d otel-collector
```

### Configuration Changes
```bash
# Test configuration
docker run --rm -v $(pwd):/etc/config \
  otel/opentelemetry-collector-contrib:0.89.0 \
  --config=/etc/config/otel-collector-config.yaml \
  --dry-run

# Apply changes
docker-compose restart otel-collector
```