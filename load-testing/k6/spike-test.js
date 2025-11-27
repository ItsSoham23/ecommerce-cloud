/**
 * Spike Test - Sudden Traffic Surge
 * 
 * This test simulates a sudden spike in traffic (e.g., flash sale, viral post)
 * to validate:
 * - System handles sudden load increase
 * - HPA responds quickly
 * - Services remain stable under shock
 * - Recovery after spike
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 },     // Normal load
    { duration: '30s', target: 500 },   //  SUDDEN SPIKE
    { duration: '2m', target: 500 },    // Sustained spike
    { duration: '1m', target: 10 },     // Recovery
    { duration: '2m', target: 10 },     // Observe stability
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // More lenient during spike
    'errors': ['rate<0.1'],              // Up to 10% errors acceptable during spike
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  // Quick read operations during spike
  let response = http.get(`${BASE_URL}/api/products?page=0&size=10`);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  sleep(0.5); // Short sleep - high pressure!
}

export function setup() {
  console.log('🚀 Starting Spike Test - Sudden traffic surge!');
  console.log(`Target: ${BASE_URL}`);
}

export function teardown() {
  console.log('✅ Spike Test Complete');
  console.log('Check if HPA scaled quickly enough!');
}