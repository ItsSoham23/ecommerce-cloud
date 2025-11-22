/**
 * HPA Validation Test
 * 
 * Specifically designed to trigger and validate Horizontal Pod Autoscaler
 * 
 * Expected behavior:
 * - Start: 3 replicas (min)
 * - During load: Scale up to 6-10 replicas
 * - After load: Scale down to 3 replicas
 * 
 * Run alongside: kubectl get hpa -n ecommerce --watch
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const requests = new Counter('http_reqs');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    // Phase 1: Baseline (should stay at min replicas)
    { duration: '2m', target: 20 },
    
    // Phase 2: Trigger HPA (increase CPU/Memory usage)
    { duration: '3m', target: 80 },   // Should trigger scale-up
    
    // Phase 3: Sustained load (observe scaling)
    { duration: '5m', target: 100 },  // HPA should stabilize
    
    // Phase 4: Peak (test max scaling)
    { duration: '3m', target: 150 },  // Should reach max replicas
    
    // Phase 5: Scale down (trigger scale-down)
    { duration: '2m', target: 20 },   // Should start scaling down
    
    // Phase 6: Observe scale-down
    { duration: '5m', target: 10 },   // Should return to min
  ],
  thresholds: {
    'http_req_duration': ['p(95)<800'],
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  // Target services with HPA: User Service and Product Service
  
  // 70% of requests to Product Service (HPA: Memory 80%)
  if (Math.random() < 0.7) {
    const response = http.get(`${BASE_URL}/api/products?page=${randomInt(0, 10)}&size=20`);
    
    check(response, {
      'product service responding': (r) => r.status === 200,
    }) || errorRate.add(1);
  }
  // 30% to User Service (HPA: CPU 70%)
  else {
    const response = http.get(`${BASE_URL}/api/users?page=${randomInt(0, 10)}&size=10`);
    
    check(response, {
      'user service responding': (r) => r.status === 200,
    }) || errorRate.add(1);
  }
  
  requests.add(1);
  sleep(0.5);
}

export function setup() {
  console.log('🎯 HPA Validation Test');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log('\n📊 Expected HPA Behavior:');
  console.log('  Minute 0-2:   ~3 replicas (baseline)');
  console.log('  Minute 2-5:   Scaling up (3 → 6)');
  console.log('  Minute 5-10:  Stabilized (6-8 replicas)');
  console.log('  Minute 10-13: Peak (8-10 replicas)');
  console.log('  Minute 13-15: Start scaling down');
  console.log('  Minute 15-20: Return to minimum (3 replicas)');
  console.log('\n🔍 Monitor with:');
  console.log('  kubectl get hpa -n ecommerce --watch');
  console.log('  kubectl get pods -n ecommerce --watch');
  console.log('='.repeat(60));
}

export function teardown() {
  console.log('\n✅ HPA Validation Test Complete');
  console.log('\n📋 Verify:');
  console.log('  ✓ Pods scaled UP when load increased');
  console.log('  ✓ Pods scaled DOWN after load decreased');
  console.log('  ✓ Response times remained acceptable');
  console.log('  ✓ No service disruption during scaling');
}