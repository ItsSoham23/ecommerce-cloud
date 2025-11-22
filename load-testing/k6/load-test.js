/**
 * Load Test - Gradual Ramp Up
 * 
 * This test gradually increases load to validate:
 * - System handles increasing traffic
 * - HPA scales out services
 * - Response times remain acceptable
 * - Error rate stays low
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const orderCreationTime = new Trend('order_creation_duration');
const successfulOrders = new Counter('successful_orders');
const successfulProducts = new Counter('successful_products');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },    // Warm up: 0 → 10 users
    { duration: '5m', target: 50 },    // Ramp up: 10 → 50 users
    { duration: '10m', target: 100 },  // Sustained: 50 → 100 users
    { duration: '5m', target: 200 },   // Peak load: 100 → 200 users
    { duration: '5m', target: 100 },   // Scale down: 200 → 100 users
    { duration: '2m', target: 0 },     // Cool down: 100 → 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'errors': ['rate<0.05'],                           // Error rate < 5%
    'http_req_failed': ['rate<0.05'],                  // Failed requests < 5%
  },
};

// Base URL - will be set via environment variable or default to localhost
const BASE_URL = __ENV.BASE_URL || 'http://localhost';

// Generate random data helpers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEmail() {
  return `user${randomInt(1000, 9999)}@example.com`;
}

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Main test scenario
 * Simulates realistic e-commerce user behavior
 */
export default function () {
  const userId = __VU; // Virtual User ID
  const sessionId = `session-${__VU}-${__ITER}`;
  
  // ========================================
  // Scenario 1: Health Check
  // ========================================
  let response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health check is 200': (r) => r.status === 200,
  });
  sleep(0.5);
  
  // ========================================
  // Scenario 2: Browse Products (Read-heavy)
  // ========================================
  response = http.get(`${BASE_URL}/api/products?page=0&size=20`);
  const productsCheck = check(response, {
    'products list status is 200': (r) => r.status === 200,
    'products list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || (body.products && Array.isArray(body.products));
      } catch (e) {
        return false;
      }
    },
  });
  
  if (productsCheck) {
    successfulProducts.add(1);
  }
  errorRate.add(!productsCheck);
  sleep(randomInt(1, 3));
  
  // ========================================
  // Scenario 3: View Product Details
  // ========================================
  const productId = randomInt(1, 100);
  response = http.get(`${BASE_URL}/api/products/${productId}`);
  check(response, {
    'product detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  sleep(randomInt(1, 2));
  
  // ========================================
  // Scenario 4: Search Products
  // ========================================
  const searchTerm = randomString(5);
  response = http.get(`${BASE_URL}/api/products/search?q=${searchTerm}`);
  check(response, {
    'search status is 200': (r) => r.status === 200,
  });
  sleep(1);
  
  // ========================================
  // Scenario 5: Add Items to Cart
  // ========================================
  const cartPayload = JSON.stringify({
    session_id: sessionId,
    user_id: userId,
    items: [
      {
        product_id: randomInt(1, 100),
        quantity: randomInt(1, 3),
      },
      {
        product_id: randomInt(1, 100),
        quantity: randomInt(1, 2),
      }
    ]
  });

  response = http.post(
    `${BASE_URL}/api/cart`,
    cartPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(response, {
    'add to cart status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(response.status !== 200 && response.status !== 201);
  sleep(randomInt(2, 4));
  
  // ========================================
  // Scenario 6: View Cart
  // ========================================
  response = http.get(`${BASE_URL}/api/cart/${sessionId}`);
  check(response, {
    'view cart status is 200': (r) => r.status === 200,
  });
  sleep(1);
  
  // ========================================
  // Scenario 7: Create Order (Write-heavy, Critical Path)
  // ========================================
  const orderPayload = JSON.stringify({
    user_id: userId,
    items: [
      {
        product_id: randomInt(1, 100),
        quantity: randomInt(1, 3),
        price: randomInt(10, 100),
      }
    ],
    shipping_address: `${randomInt(1, 999)} Test St, City, State 12345`,
    payment_method: 'credit_card'
  });

  const orderStart = Date.now();
  response = http.post(
    `${BASE_URL}/api/orders`,
    orderPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const orderSuccess = check(response, {
    'create order status is 201': (r) => r.status === 201,
    'create order returns order_id': (r) => {
      if (r.status === 201) {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined || body.order_id !== undefined;
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  });

  if (orderSuccess) {
    successfulOrders.add(1);
    orderCreationTime.add(Date.now() - orderStart);
  }
  errorRate.add(!orderSuccess);
  sleep(randomInt(2, 4));
  
  // ========================================
  // Scenario 8: View User Orders
  // ========================================
  response = http.get(`${BASE_URL}/api/orders/user/${userId}?limit=10`);
  check(response, {
    'user orders status is 200': (r) => r.status === 200,
  });
  sleep(1);
  
  // ========================================
  // Scenario 9: View User Profile
  // ========================================
  response = http.get(`${BASE_URL}/api/users/${userId}`);
  check(response, {
    'user profile status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  sleep(1);
  
  // Random think time between actions
  sleep(randomInt(1, 3));
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('='.repeat(60));
  console.log('Starting Load Test');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Duration: 29 minutes (warm up → peak → cool down)`);
  console.log(`Max VUs: 200`);
  console.log('='.repeat(60));
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('='.repeat(60));
  console.log('Load Test Complete');
  console.log('Check results above for:');
  console.log('  - Response times (p95, p99)');
  console.log('  - Error rates');
  console.log('  - Successful orders');
  console.log('  - HPA scaling events (check kubectl)');
  console.log('='.repeat(60));
}