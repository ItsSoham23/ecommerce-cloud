/**
 * Stress Test - Find Breaking Point
 * 
 * This test gradually increases load beyond normal capacity to:
 * - Find system limits
 * - Identify bottlenecks
 * - Test HPA maximum scaling
 * - Observe degradation patterns
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Baseline
    { duration: '5m', target: 100 },   // Normal load
    { duration: '5m', target: 200 },   // Above normal
    { duration: '5m', target: 300 },   // Heavy load
    { duration: '5m', target: 400 },   // Extreme load
    { duration: '10m', target: 400 },  // Sustained extreme
    { duration: '5m', target: 0 },     // Recovery
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // Relaxed thresholds
    'errors': ['rate<0.15'],             // Up to 15% errors acceptable
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  const startTime = Date.now();
  
  // Mix of operations
  const operations = [
    () => http.get(`${BASE_URL}/api/products`),
    () => http.get(`${BASE_URL}/api/users/${randomInt(1, 1000)}`),
    () => http.get(`${BASE_URL}/api/orders/user/${randomInt(1, 1000)}`),
  ];
  
  const operation = operations[randomInt(0, operations.length - 1)];
  const response = operation();
  
  const duration = Date.now() - startTime;
  responseTime.add(duration);
  
  const success = check(response, {
    'status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
  });
  
  errorRate.add(!success);
  
  sleep(0.1);
}

export function setup() {
  console.log('💪 Starting Stress Test - Finding breaking point!');
  console.log(`Target: ${BASE_URL}`);
  console.log('Watch for:');
  console.log('  - When error rate increases');
  console.log('  - When response times degrade');
  console.log('  - HPA maximum replicas reached');
}

export function teardown() {
  console.log('✅ Stress Test Complete');
  console.log('Analyze results to find:');
  console.log('  - Maximum sustainable load');
  console.log('  - Bottleneck services');
  console.log('  - HPA effectiveness');
}