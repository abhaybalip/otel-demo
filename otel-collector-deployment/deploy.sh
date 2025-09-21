#!/bin/bash

# OpenTelemetry Collector Deployment Script
# Linux/Mac version

set -e

echo "🚀 OpenTelemetry Collector Deployment Script"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running"
    exit 1
fi

print_status "Prerequisites check passed"

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found, copying from .env.example"
    cp .env.example .env
    print_info "Please edit .env file with your configuration before running the collector"
    read -p "Do you want to continue with default values? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Please edit .env file and run the script again"
        exit 0
    fi
fi

# Parse command line arguments
PROFILE=""
DETACHED=true
PULL_LATEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --local-testing)
            PROFILE="local-testing"
            shift
            ;;
        --foreground)
            DETACHED=false
            shift
            ;;
        --pull)
            PULL_LATEST=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --local-testing   Enable local Prometheus and Jaeger for testing"
            echo "  --foreground      Run in foreground (don't use -d)"
            echo "  --pull           Pull latest images before starting"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Pull latest images if requested
if [ "$PULL_LATEST" = true ]; then
    print_info "Pulling latest Docker images..."
    if [ -n "$PROFILE" ]; then
        COMPOSE_PROFILES=$PROFILE docker-compose pull
    else
        docker-compose pull
    fi
    print_status "Images updated"
fi

# Set profile if specified
if [ -n "$PROFILE" ]; then
    export COMPOSE_PROFILES=$PROFILE
    print_info "Using profile: $PROFILE"
fi

# Start services
print_info "Starting OpenTelemetry Collector..."

if [ "$DETACHED" = true ]; then
    docker-compose up -d
    print_status "Collector started in background"
else
    print_info "Starting in foreground (Ctrl+C to stop)"
    docker-compose up
fi

if [ "$DETACHED" = true ]; then
    # Wait a moment for services to start
    sleep 5
    
    # Check health
    print_info "Checking collector health..."
    
    # Check if collector is running
    if docker-compose ps otel-collector | grep -q "Up"; then
        print_status "Collector container is running"
        
        # Test health endpoint
        if curl -s http://localhost:13133 > /dev/null; then
            print_status "Collector health check passed"
        else
            print_warning "Collector health check failed (may still be starting)"
        fi
        
        # Show access points
        echo
        print_info "Access Points:"
        echo "  📊 Collector Metrics: http://localhost:8888/metrics"
        echo "  📈 Exported Metrics:  http://localhost:8889/metrics"
        echo "  🏥 Health Check:     http://localhost:13133"
        echo "  🔍 Debug Pages:      http://localhost:55679"
        
        if [ "$PROFILE" = "local-testing" ]; then
            echo "  📊 Local Prometheus: http://localhost:9090"
            echo "  🔍 Local Jaeger:     http://localhost:16686"
        fi
        
        echo
        print_info "Collector Configuration:"
        echo "  📁 Config File: ./otel-collector-config.yaml"
        echo "  🌍 Environment: $(grep DEPLOYMENT_ENV .env || echo 'DEPLOYMENT_ENV=production')"
        echo "  🏷️  Instance ID: $(grep COLLECTOR_INSTANCE .env || echo 'COLLECTOR_INSTANCE=collector-01')"
        
        echo
        print_info "Useful Commands:"
        echo "  📋 View logs:      docker-compose logs -f otel-collector"
        echo "  ⏹️  Stop services: docker-compose down"
        echo "  🔄 Restart:       docker-compose restart otel-collector"
        echo "  📊 View metrics:   curl http://localhost:8888/metrics"
        
    else
        print_error "Collector failed to start"
        print_info "Check logs with: docker-compose logs otel-collector"
        exit 1
    fi
fi

print_status "Deployment complete!"