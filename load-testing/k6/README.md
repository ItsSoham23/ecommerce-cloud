# Load Testing with k6

This directory contains k6 load testing scripts to validate system performance, scalability, and HPA (Horizontal Pod Autoscaler) behavior.

## 📋 Test Scripts

### 1. `load-test.js` - Comprehensive Load Test
**Purpose:** Simulate realistic e-commerce traffic patterns

**Duration:** 29 minutes

**Stages:**
- Warm up: 0 → 10 users (2 min)
- Ramp up: 10 → 50 users (5 min)
- Sustained: 50 → 100 users (10 min)
- Peak: 100 → 200 users (5 min)
- Scale down: 200 → 100 users (5 min)
- Cool down: 100 → 0 users (2 min)

**What it tests:**
- Product browsing
- Cart operations
- Order creation
- User profiles
- Search functionality

---

### 2. `spike-test.js` - Sudden Traffic Surge
**Purpose:** Test system resilience to sudden load spikes

**Duration:** 6.5 minutes

**Pattern:**
- Normal: 10 users (1 min)
- **SPIKE:** 10 → 500 users (30 sec)
- Sustained spike: 500 users (2 min)
- Recovery: 500 → 10 users (1 min)
- Stability check: 10 users (2 min)

**What it tests:**
- HPA response speed
- Service stability under shock
- Recovery behavior

---

### 3. `stress-test.js` - Find Breaking Point
**Purpose:** Determine system limits and bottlenecks

**Duration:** 37 minutes

**Pattern:**
- Gradually increase from 50 → 400 users
- Sustain at 400 users for 10 minutes
- Monitor degradation

**What it tests:**
- Maximum sustainable load
- Bottleneck identification
- HPA maximum scaling
- Degradation patterns

---

### 4. `hpa-validation.js` - HPA Validation Test ⭐
**Purpose:** Specifically validate Horizontal Pod Autoscaler

**Duration:** 20 minutes

**Pattern:**
- Baseline → Trigger scale-up → Peak → Trigger scale-down → Baseline

**What it validates:**
- ✓ Pods scale UP when load increases
- ✓ Pods scale DOWN when load decreases
- ✓ Response times remain acceptable
- ✓ No service disruption

---

## 🚀 Installation

### Install k6

**macOS:**
```bash
brew install k6
```

**Windows:**
```powershell
choco install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

---

## 🧪 Running Tests

### Basic Usage

```bash
# Set your application URL
export BASE_URL="http://your-loadbalancer-url"

# Run load test
k6 run load-test.js

# Run spike test
k6 run spike-test.js

# Run stress test
k6 run stress-test.js

# Run HPA validation
k6 run hpa-validation.js
```

### With Custom URL

```bash
k6 run -e BASE_URL=http://a1b2c3d4.us-east-1.elb.amazonaws.com load-test.js
```

### Save Results

```bash
# Save as JSON
k6 run --out json=results.json load-test.js

# Save as CSV
k6 run --out csv=results.csv load-test.js

# Send to InfluxDB (for Grafana visualization)
k6 run --out influxdb=http://localhost:8086/k6 load-test.js
```

---

## 📊 Monitoring During Tests

### Watch HPA Scaling

In a separate terminal:

```bash
# Watch HPA status
kubectl get hpa -n ecommerce --watch

# Watch pod count
kubectl get pods -n ecommerce --watch

# Describe HPA for details
kubectl describe hpa user-service-hpa -n ecommerce
kubectl describe hpa product-service-hpa -n ecommerce
```

### Watch Metrics in Grafana

1. Open Grafana: `http://your-grafana-url`
2. Go to service dashboards
3. Watch in real-time:
   - Request rate (RPS)
   - Error rate
   - Response time (p95, p99)
   - CPU/Memory usage
   - Pod count

---

## 📈 Interpreting Results

### Success Criteria

**Load Test:**
- ✅ p95 latency < 500ms
- ✅ p99 latency < 1000ms
- ✅ Error rate < 5%
- ✅ HPA scaled services appropriately

**Spike Test:**
- ✅ p95 latency < 1000ms during spike
- ✅ Error rate < 10% during spike
- ✅ System recovered after spike
- ✅ HPA responded quickly (< 2 minutes)

**Stress Test:**
- ✅ Identified maximum sustainable load
- ✅ Found bottleneck services
- ✅ HPA reached maximum replicas
- ✅ Graceful degradation (no crashes)

**HPA Validation:**
- ✅ Pods scaled from 3 → 10 replicas
- ✅ Pods scaled back to 3 replicas
- ✅ Latency remained acceptable
- ✅ No failed requests during scaling

### Sample Output

```
     ✓ products list status is 200
     ✓ add to cart status is 200 or 201
     ✓ create order status is 201

     checks.........................: 95.23% ✓ 28569 ✗ 1431
     data_received..................: 45 MB  150 kB/s
     data_sent......................: 12 MB  40 kB/s
     http_req_duration..............: avg=234ms min=12ms med=189ms max=1.2s p(95)=456ms p(99)=892ms
     http_reqs......................: 30000  100/s
     iteration_duration.............: avg=9.8s  min=1.2s med=9.1s  max=28s
     iterations.....................: 3000   10/s
     vus............................: 100    min=10   max=200
```

---

## 🎯 Testing Strategy for Assignment

### Step 1: Baseline Test
```bash
k6 run load-test.js
```
Verify system works under normal load.

### Step 2: HPA Validation (REQUIRED for assignment)
```bash
k6 run hpa-validation.js
```
Run while watching: `kubectl get hpa -n ecommerce --watch`

**Take screenshots showing:**
1. HPA scaling UP (3 → 10 replicas)
2. HPA scaling DOWN (10 → 3 replicas)
3. k6 test results

### Step 3: Stress Test (Optional)
```bash
k6 run stress-test.js
```
Find system limits and demonstrate understanding.

---

## 🐛 Troubleshooting

**Issue: Connection refused**
- Check BASE_URL is correct
- Verify services are running: `kubectl get svc -n ecommerce`

**Issue: High error rates**
- Check service logs: `kubectl logs -n ecommerce <pod-name>`
- Verify database connections
- Check resource limits

**Issue: HPA not scaling**
- Verify metrics-server is running: `kubectl get pods -n kube-system | grep metrics`
- Check HPA configuration: `kubectl describe hpa -n ecommerce`
- Ensure resource requests are set in deployments

---

## 📝 Notes

- Always start with a small test to verify connectivity
- Monitor system resources during tests
- Allow cooldown between tests
- Save test results for documentation
- Tests are designed for a 5-minute final deployment test window