# Monitoring & Observability Stack

Complete monitoring solution with Prometheus, Grafana, and Loki for the e-commerce microservices platform.

## 📦 Components

### Metrics (Prometheus + Grafana)
- **Prometheus**: Time-series database for metrics
- **Grafana**: Visualization dashboards
- **AlertManager**: Alert routing and management
- **Node Exporter**: Hardware and OS metrics
- **Kube State Metrics**: Kubernetes object metrics

### Logging (Loki + Promtail)
- **Loki**: Log aggregation system
- **Promtail**: Log collector (runs on every node)

## 🚀 Quick Start

### Prerequisites
- EKS cluster running
- kubectl configured
- Helm 3 installed

### Installation

**Option 1: Automated Script (Windows)**
```powershell
cd monitoring
.\setup-monitoring.ps1
```

**Option 2: Manual Installation**
```powershell
# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace monitoring

# Install Prometheus Stack
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack `
  --namespace monitoring `
  --values prometheus-values.yaml

# Install Loki
helm upgrade --install loki grafana/loki-stack `
  --namespace monitoring `
  --values loki-values.yaml

# Deploy ServiceMonitors
kubectl apply -f servicemonitors/
```

## 📊 Accessing Dashboards

### Grafana
```powershell
# Port forward
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Access at: http://localhost:3000
# Credentials: admin / admin123
```

### Prometheus
```powershell
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# Access at: http://localhost:9090
```

### AlertManager
```powershell
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
# Access at: http://localhost:9093
```

## 📈 Pre-configured Dashboards

Grafana comes with these dashboards:
1. **Kubernetes Cluster** (ID: 7249) - Overall cluster health
2. **Node Exporter** (ID: 1860) - Node-level metrics
3. **Kubernetes Pods** (ID: 6417) - Pod-level metrics
4. **Microservices Dashboard** - Custom dashboard for your services

## 🔍 Key Metrics to Monitor

### Service-Level Metrics
- **RPS (Requests Per Second)**: `rate(http_requests_total[5m])`
- **Error Rate**: `rate(http_requests_total{status=~"5.."}[5m])`
- **Latency (p95)**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`

### Infrastructure Metrics
- **CPU Usage**: `rate(container_cpu_usage_seconds_total[5m])`
- **Memory Usage**: `container_memory_usage_bytes`
- **Pod Count**: `kube_pod_status_phase`
- **HPA Replicas**: `kube_horizontalpodautoscaler_status_current_replicas`

### Business Metrics (Custom)
- **Orders per minute**
- **Cart conversions**
- **Payment success rate**

## 📝 Logging with Loki

### Query Logs in Grafana
1. Go to Explore in Grafana
2. Select "Loki" as data source
3. Use LogQL queries:

```logql
# All logs from user-service
{app="user-service"}

# Errors only
{app="user-service"} |= "ERROR"

# Logs with specific pattern
{namespace="default"} |~ "database connection"

# Last 5 minutes
{app="product-service"} [5m]
```

## 🚨 Alerting

### Pre-configured Alerts
- High CPU usage (>80%)
- High memory usage (>90%)
- Pod crash looping
- High error rate (>5%)
- Service down

### Custom Alerts
Edit `prometheus-values.yaml` to add custom alerts:

```yaml
additionalPrometheusRules:
  - name: custom-alerts
    groups:
      - name: ecommerce
        rules:
          - alert: HighErrorRate
            expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
            annotations:
              summary: "High error rate on {{ $labels.service }}"
```

## 🔧 Configuration

### prometheus-values.yaml
Main configuration for Prometheus stack:
- Retention: 15 days
- Storage: 20Gi
- Scrape interval: 30s
- ServiceMonitor discovery enabled

### loki-values.yaml
Configuration for Loki logging:
- Retention: No limit (configure as needed)
- Storage: 20Gi
- Log formats: JSON and plaintext

## 📦 ServiceMonitors

ServiceMonitors tell Prometheus which services to scrape:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: user-service-monitor
spec:
  selector:
    matchLabels:
      app: user-service
  endpoints:
    - port: http
      path: /metrics
```

## 🎯 Service Requirements

For services to be monitored, they need:

### Metrics Endpoint
Expose metrics at `/metrics` or `/actuator/prometheus`

**Spring Boot (Java)**:
```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
```

**Node.js (Express)**:
```javascript
const promClient = require('prom-client');
promClient.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### Pod Annotations (Alternative)
Add annotations to pod spec:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/metrics"
```

## 🔍 Troubleshooting

### Pods not starting
```powershell
kubectl get pods -n monitoring
kubectl logs -n monitoring <pod-name>
kubectl describe pod -n monitoring <pod-name>
```

### Prometheus not scraping services
```powershell
# Check ServiceMonitors
kubectl get servicemonitors -n monitoring

# Check Prometheus targets
# Port-forward and go to http://localhost:9090/targets
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

### Grafana can't connect to Prometheus
Check datasources in Grafana UI or:
```powershell
kubectl get configmap -n monitoring kube-prometheus-stack-grafana -o yaml
```

### Loki not receiving logs
```powershell
# Check Promtail pods
kubectl get pods -n monitoring -l app=promtail

# Check Promtail logs
kubectl logs -n monitoring -l app=promtail
```

## 📚 Resources

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Loki Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Prometheus Operator](https://prometheus-operator.dev/)

## 🗑️ Uninstall

```powershell
helm uninstall kube-prometheus-stack -n monitoring
helm uninstall loki -n monitoring
kubectl delete namespace monitoring
```

## 📊 Next Steps

1. ✅ Install monitoring stack
2. ✅ Configure ServiceMonitors
3. ✅ Import custom dashboards
4. Set up alert notifications (Slack, email, PagerDuty)
5. Create custom business metrics
6. Set up log retention policies
7. Configure backup for Grafana dashboards