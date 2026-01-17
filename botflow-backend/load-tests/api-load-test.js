/**
 * k6 Load Testing Script - BotFlow API
 * Phase 2 Week 6 Day 4: Performance and stress testing
 *
 * Usage:
 *   k6 run api-load-test.js
 *   k6 run --vus 100 --duration 30s api-load-test.js
 *   k6 cloud api-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const cacheHitRate = new Rate('cache_hits');
const apiCalls = new Counter('api_calls');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Warm up: ramp up to 50 users
    { duration: '5m', target: 50 },   // Steady state: 50 users
    { duration: '2m', target: 100 },  // Ramp up: increase to 100 users
    { duration: '5m', target: 100 },  // Steady state: 100 users
    { duration: '2m', target: 200 },  // Stress test: increase to 200 users
    { duration: '5m', target: 200 },  // Steady state: 200 users
    { duration: '2m', target: 0 },    // Cool down: ramp down to 0 users
  ],
  thresholds: {
    // Performance targets
    'http_req_duration': ['p(50)<100', 'p(95)<500', 'p(99)<1000'],  // Response times
    'http_req_failed': ['rate<0.01'],   // Error rate < 1%
    'errors': ['rate<0.01'],            // Custom error rate < 1%
    'api_duration': ['p(95)<500'],      // API response time p95 < 500ms

    // Specific endpoint thresholds
    'http_req_duration{endpoint:health}': ['p(95)<50'],       // Health check < 50ms
    'http_req_duration{endpoint:bots}': ['p(95)<200'],        // Bot list < 200ms
    'http_req_duration{endpoint:conversations}': ['p(95)<300'], // Conversations < 300ms
    'http_req_duration{endpoint:analytics}': ['p(95)<500'],   // Analytics < 500ms
  },
  ext: {
    loadimpact: {
      projectID: 3000000, // Replace with your k6 Cloud project ID
      name: 'BotFlow API Load Test'
    }
  }
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token'; // Replace with real token

// Request headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

/**
 * Setup: Run once before all tests
 */
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);

  // Test basic connectivity
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`Health check failed: ${res.status}`);
  }

  console.log('Health check passed - starting load test');

  return {
    baseUrl: BASE_URL,
    headers: headers
  };
}

/**
 * Main test scenario
 */
export default function(data) {
  // Track API call
  apiCalls.add(1);

  // Test 1: Health Check
  group('Health Check', () => {
    const res = http.get(`${data.baseUrl}/health`, {
      tags: { endpoint: 'health' }
    });

    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 50ms': (r) => r.timings.duration < 50,
      'health check returns status': (r) => JSON.parse(r.body).status === 'healthy' || JSON.parse(r.body).status === 'ok',
    });

    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
  });

  sleep(1);

  // Test 2: Get Bot List
  group('Bot List', () => {
    const res = http.get(`${data.baseUrl}/api/bots`, {
      headers: data.headers,
      tags: { endpoint: 'bots' }
    });

    check(res, {
      'bot list status is 200': (r) => r.status === 200,
      'bot list response time < 200ms': (r) => r.timings.duration < 200,
      'bot list returns array': (r) => Array.isArray(JSON.parse(r.body)),
    });

    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);

    // Check if response came from cache
    const cacheHeader = res.headers['X-Cache'];
    if (cacheHeader) {
      cacheHitRate.add(cacheHeader === 'HIT');
    }
  });

  sleep(1);

  // Test 3: Get Conversations
  group('Conversations List', () => {
    const res = http.get(`${data.baseUrl}/api/conversations?limit=20`, {
      headers: data.headers,
      tags: { endpoint: 'conversations' }
    });

    check(res, {
      'conversations status is 200': (r) => r.status === 200,
      'conversations response time < 300ms': (r) => r.timings.duration < 300,
      'conversations returns array': (r) => Array.isArray(JSON.parse(r.body)),
    });

    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
  });

  sleep(1);

  // Test 4: Get Real-time Analytics
  group('Real-time Analytics', () => {
    const res = http.get(`${data.baseUrl}/api/analytics/realtime`, {
      headers: data.headers,
      tags: { endpoint: 'analytics' }
    });

    check(res, {
      'analytics status is 200': (r) => r.status === 200,
      'analytics response time < 500ms': (r) => r.timings.duration < 500,
      'analytics returns data': (r) => JSON.parse(r.body) !== null,
    });

    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
  });

  sleep(1);

  // Test 5: Get Templates (should be heavily cached)
  group('Templates List', () => {
    const res = http.get(`${data.baseUrl}/api/templates`, {
      tags: { endpoint: 'templates' }
    });

    check(res, {
      'templates status is 200': (r) => r.status === 200,
      'templates response time < 100ms': (r) => r.timings.duration < 100, // Should be cached
      'templates returns array': (r) => Array.isArray(JSON.parse(r.body)),
    });

    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);

    // Check cache hit
    const cacheHeader = res.headers['X-Cache'];
    if (cacheHeader) {
      cacheHitRate.add(cacheHeader === 'HIT');
    }
  });

  sleep(2);
}

/**
 * Teardown: Run once after all tests
 */
export function teardown(data) {
  console.log('Load test completed');
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}================\n\n`;

  // Requests
  summary += `${indent}Requests:\n`;
  summary += `${indent}  Total: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed: ${data.metrics.http_req_failed.values.passes} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)\n\n`;

  // Response times
  summary += `${indent}Response Times:\n`;
  summary += `${indent}  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += `${indent}  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  // Virtual users
  summary += `${indent}Virtual Users:\n`;
  summary += `${indent}  Max: ${data.metrics.vus_max.values.max}\n\n`;

  return summary;
}
