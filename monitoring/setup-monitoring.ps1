# Monitoring Stack Setup Script for Windows
# Deploys Prometheus, Grafana, and Loki to Kubernetes

Write-Host "Setting up Monitoring Stack..." -ForegroundColor Green

# Add Helm repos
Write-Host "Adding Helm repositories..." -ForegroundColor Yellow
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to add Helm repositories" -ForegroundColor Red
    exit 1
}

# Create monitoring namespace
Write-Host "Creating monitoring namespace..." -ForegroundColor Yellow
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Install Prometheus Stack
Write-Host "Installing Prometheus Stack - this may take 5-10 minutes..." -ForegroundColor Yellow
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack --namespace monitoring --values prometheus-values.yaml --wait

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Prometheus Stack" -ForegroundColor Red
    exit 1
}

# Install Loki Stack
Write-Host "Installing Loki Stack for logging..." -ForegroundColor Yellow
helm upgrade --install loki grafana/loki-stack --namespace monitoring --values loki-values.yaml --wait

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Loki Stack" -ForegroundColor Red
    exit 1
}

# Deploy ServiceMonitors
Write-Host "Deploying ServiceMonitors..." -ForegroundColor Yellow
if (Test-Path "servicemonitors") {
    kubectl apply -f servicemonitors/
}

Write-Host ""
Write-Host "Monitoring Stack installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Grafana:" -ForegroundColor Cyan
Write-Host "   kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80" -ForegroundColor White
Write-Host "   URL: http://localhost:3000" -ForegroundColor White
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Access Prometheus:" -ForegroundColor Cyan
Write-Host "   kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090" -ForegroundColor White
Write-Host "   URL: http://localhost:9090" -ForegroundColor White
Write-Host ""
Write-Host "Logs are available in Grafana via Loki datasource" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check status:" -ForegroundColor Yellow
Write-Host "   kubectl get pods -n monitoring" -ForegroundColor White