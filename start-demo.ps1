# Node.js OpenTelemetry + Prometheus Demo Startup Script
# PowerShell version

Write-Host "🚀 Starting Node.js OpenTelemetry + Prometheus Demo" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    node --version | Out-Null
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "🐳 Starting development monitoring services (optional)..." -ForegroundColor Yellow
$env:COMPOSE_PROFILES = "dev-tools"
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Development services failed to start (this is optional)" -ForegroundColor Yellow
    Write-Host "   You can still run the Node.js app without them" -ForegroundColor Cyan
}

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🎯 Starting Node.js application..." -ForegroundColor Green
Write-Host "   The app will start in the foreground so you can see the logs" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Access points:" -ForegroundColor Magenta
Write-Host "   Application:     http://localhost:3000" -ForegroundColor White
Write-Host "   Metrics:         http://localhost:3000/metrics" -ForegroundColor White
Write-Host "   Dev Prometheus:  http://localhost:9090 (if enabled)" -ForegroundColor Gray
Write-Host "   Dev Jaeger:      http://localhost:16686 (if enabled)" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Note: For production monitoring, deploy the collector from:" -ForegroundColor Yellow
Write-Host "   ./otel-collector-deployment/" -ForegroundColor Cyan
Write-Host ""

# Function to handle cleanup on Ctrl+C
$cleanup = {
    Write-Host "`n🛑 Stopping services..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "✅ Services stopped" -ForegroundColor Green
    exit 0
}

# Register cleanup function for Ctrl+C
Register-EngineEvent PowerShell.Exiting -Action $cleanup

# Start the application
Write-Host "🟢 Application starting..." -ForegroundColor Green
npm start