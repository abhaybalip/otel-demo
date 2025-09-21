#!/bin/bash

echo "🚀 Starting Node.js OpenTelemetry + Prometheus Demo"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo "🐳 Starting monitoring stack with Docker..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🎯 Starting Node.js application..."
echo "   The app will start in the foreground so you can see the logs"
echo "   Press Ctrl+C to stop"
echo ""
echo "🌐 Access points:"
echo "   Application:     http://localhost:3000"
echo "   Metrics:         http://localhost:3000/metrics" 
echo "   Prometheus:      http://localhost:9090"
echo "   Jaeger:          http://localhost:16686"
echo "   Grafana:         http://localhost:3001 (admin/admin)"
echo ""

# Start the application
npm start