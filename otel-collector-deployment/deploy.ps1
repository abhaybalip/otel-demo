# OpenTelemetry Collector Deployment Script
# PowerShell version

param(
    [switch]$LocalTesting,
    [switch]$Foreground,
    [switch]$Pull,
    [switch]$Help
)

# Display help
if ($Help) {
    Write-Host "OpenTelemetry Collector Deployment Script" -ForegroundColor Green
    Write-Host "Usage: .\deploy.ps1 [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -LocalTesting   Enable local Prometheus and Jaeger for testing" -ForegroundColor White
    Write-Host "  -Foreground     Run in foreground (don't use -d)" -ForegroundColor White
    Write-Host "  -Pull          Pull latest images before starting" -ForegroundColor White
    Write-Host "  -Help          Show this help message" -ForegroundColor White
    exit 0
}

Write-Host "🚀 OpenTelemetry Collector Deployment Script" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Function to print colored output
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Check prerequisites
Write-Info "Checking prerequisites..."

try {
    docker --version | Out-Null
} catch {
    Write-Error "Docker is not installed or not in PATH"
    exit 1
}

try {
    docker-compose --version | Out-Null
} catch {
    Write-Error "Docker Compose is not installed or not in PATH"
    exit 1
}

try {
    docker info | Out-Null
} catch {
    Write-Error "Docker is not running"
    exit 1
}

Write-Success "Prerequisites check passed"

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Warning ".env file not found, copying from .env.example"
    Copy-Item ".env.example" ".env"
    Write-Info "Please edit .env file with your configuration before running the collector"
    $response = Read-Host "Do you want to continue with default values? (y/n)"
    if ($response -notmatch "^[Yy]$") {
        Write-Info "Please edit .env file and run the script again"
        exit 0
    }
}

# Pull latest images if requested
if ($Pull) {
    Write-Info "Pulling latest Docker images..."
    if ($LocalTesting) {
        $env:COMPOSE_PROFILES = "local-testing"
        docker-compose pull
    } else {
        docker-compose pull
    }
    Write-Success "Images updated"
}

# Set profile if specified
if ($LocalTesting) {
    $env:COMPOSE_PROFILES = "local-testing"
    Write-Info "Using profile: local-testing"
}

# Start services
Write-Info "Starting OpenTelemetry Collector..."

if ($Foreground) {
    Write-Info "Starting in foreground (Ctrl+C to stop)"
    docker-compose up
} else {
    docker-compose up -d
    Write-Success "Collector started in background"
    
    # Wait a moment for services to start
    Start-Sleep -Seconds 5
    
    # Check health
    Write-Info "Checking collector health..."
    
    # Check if collector is running
    $containerStatus = docker-compose ps otel-collector
    if ($containerStatus -match "Up") {
        Write-Success "Collector container is running"
        
        # Test health endpoint
        try {
            Invoke-WebRequest -Uri "http://localhost:13133" -TimeoutSec 5 | Out-Null
            Write-Success "Collector health check passed"
        } catch {
            Write-Warning "Collector health check failed (may still be starting)"
        }
        
        # Show access points
        Write-Host ""
        Write-Info "Access Points:"
        Write-Host "  📊 Collector Metrics: http://localhost:8888/metrics" -ForegroundColor White
        Write-Host "  📈 Exported Metrics:  http://localhost:8889/metrics" -ForegroundColor White
        Write-Host "  🏥 Health Check:     http://localhost:13133" -ForegroundColor White
        Write-Host "  🔍 Debug Pages:      http://localhost:55679" -ForegroundColor White
        
        if ($LocalTesting) {
            Write-Host "  📊 Local Prometheus: http://localhost:9090" -ForegroundColor White
            Write-Host "  🔍 Local Jaeger:     http://localhost:16686" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Info "Collector Configuration:"
        Write-Host "  📁 Config File: .\otel-collector-config.yaml" -ForegroundColor White
        
        $envFile = Get-Content ".env" -ErrorAction SilentlyContinue
        $deploymentEnv = ($envFile | Where-Object { $_ -match "DEPLOYMENT_ENV=" }) -replace "DEPLOYMENT_ENV=", ""
        $collectorInstance = ($envFile | Where-Object { $_ -match "COLLECTOR_INSTANCE=" }) -replace "COLLECTOR_INSTANCE=", ""
        
        if ($deploymentEnv) {
            Write-Host "  🌍 Environment: $deploymentEnv" -ForegroundColor White
        } else {
            Write-Host "  🌍 Environment: production (default)" -ForegroundColor White
        }
        
        if ($collectorInstance) {
            Write-Host "  🏷️  Instance ID: $collectorInstance" -ForegroundColor White
        } else {
            Write-Host "  🏷️  Instance ID: collector-01 (default)" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Info "Useful Commands:"
        Write-Host "  📋 View logs:      docker-compose logs -f otel-collector" -ForegroundColor White
        Write-Host "  ⏹️  Stop services: docker-compose down" -ForegroundColor White
        Write-Host "  🔄 Restart:       docker-compose restart otel-collector" -ForegroundColor White
        Write-Host "  📊 View metrics:   curl http://localhost:8888/metrics" -ForegroundColor White
        
    } else {
        Write-Error "Collector failed to start"
        Write-Info "Check logs with: docker-compose logs otel-collector"
        exit 1
    }
}

Write-Success "Deployment complete!"