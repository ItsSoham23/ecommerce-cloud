# Verify Monitoring Stack Installation

Write-Host "🔍 Verifying Monitoring Stack..." -ForegroundColor Green
Write-Host ""

# Check if monitoring namespace exists
Write-Host "📁 Checking namespace..." -ForegroundColor Yellow
$namespace = kubectl get namespace monitoring --ignore-not-found
if ($namespace) {
    Write-Host "✅ Namespace 'monitoring' exists" -ForegroundColor Green
} else {
    Write-Host "❌ Namespace 'monitoring' not found" -ForegroundColor Red
    exit 1
}

# Check Prometheus
Write-Host ""
Write-Host "📊 Checking Prometheus..." -ForegroundColor Yellow
$promPods = kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --no-headers
if ($promPods) {
    Write-Host "✅ Prometheus pods:" -ForegroundColor Green
    kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
} else {
    Write-Host "❌ Prometheus pods not found" -ForegroundColor Red
}

# Check Grafana
Write-Host ""
Write-Host "📈 Checking Grafana..." -ForegroundColor Yellow
$grafanaPods = kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --no-headers
if ($grafanaPods) {
    Write-Host "✅ Grafana pods:" -ForegroundColor Green
    kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana
} else {
    Write-Host "❌ Grafana pods not found" -ForegroundColor Red
}

# Check Loki
Write-Host ""
Write-Host "📝 Checking Loki..." -ForegroundColor Yellow
$lokiPods = kubectl get pods -n monitoring -l app=loki --no-headers
if ($lokiPods) {
    Write-Host "✅ Loki pods:" -ForegroundColor Green
    kubectl get pods -n monitoring -l app=loki
} else {
    Write-Host "❌ Loki pods not found" -ForegroundColor Red
}

# Check Promtail
Write-Host ""
Write-Host "📋 Checking Promtail (log collector)..." -ForegroundColor Yellow
$promtailPods = kubectl get pods -n monitoring -l app=promtail --no-headers
if ($promtailPods) {
    Write-Host "✅ Promtail DaemonSet running:" -ForegroundColor Green
    kubectl get pods -n monitoring -l app=promtail
} else {
    Write-Host "❌ Promtail pods not found" -ForegroundColor Red
}

# Check ServiceMonitors
Write-Host ""
Write-Host "🎯 Checking ServiceMonitors..." -ForegroundColor Yellow
$serviceMonitors = kubectl get servicemonitors -n default --no-headers 2>$null
if ($serviceMonitors) {
    Write-Host "✅ ServiceMonitors found:" -ForegroundColor Green
    kubectl get servicemonitors -n default
} else {
    Write-Host "⚠️  No ServiceMonitors found in default namespace" -ForegroundColor Yellow
    Write-Host "   Run: kubectl apply -f servicemonitors/" -ForegroundColor White
}

# Summary
Write-Host ""
Write-Host "=" -Repeat 50 -ForegroundColor Cyan
Write-Host "📊 MONITORING STACK STATUS" -ForegroundColor Cyan
Write-Host "=" -Repeat 50 -ForegroundColor Cyan
Write-Host ""

$allPods = kubectl get pods -n monitoring --no-headers
$runningPods = ($allPods | Select-String "Running" | Measure-Object).Count
$totalPods = ($allPods | Measure-Object).Count

Write-Host "Running Pods: $runningPods / $totalPods" -ForegroundColor $(if ($runningPods -eq $totalPods) { "Green" } else { "Yellow" })
Write-Host ""

# Access instructions
Write-Host "🌐 ACCESS DASHBOARDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Grafana:" -ForegroundColor Yellow
Write-Host "  kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80" -ForegroundColor White
Write-Host "  http://localhost:3000 (admin / admin123)" -ForegroundColor White
Write-Host ""
Write-Host "Prometheus:" -ForegroundColor Yellow
Write-Host "  kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090" -ForegroundColor White
Write-Host "  http://localhost:9090" -ForegroundColor White
Write-Host ""

Write-Host "✅ Verification complete!" -ForegroundColor Green