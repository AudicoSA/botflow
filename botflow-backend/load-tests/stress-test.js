/**
 * k6 Stress Testing Script - BotFlow API
 * Phase 2 Week 6 Day 4: Find breaking point
 *
 * This test gradually increases load to find the system's breaking point
 *
 * Usage:
 *   k6 run stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const totalRequests = new Counter('total_requests');

// Stress test configuration - gradually increase load
export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Hold at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '3m', target: 200 },   // Hold at 200 users
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '3m', target: 300 },   // Hold at 300 users
    { duration: '2m', target: 400 },   // Ramp up to 400 users
    { duration: '3m', target: 400 },   // Hold at 400 users - find breaking point
    { duration: '5m', target: 0 },     // Gradual ramp down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.05'],  // Allow 5% error rate in stress test
    'http_req_duration': ['p(95)<2000'], // Relaxed threshold for stress test
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

export default function() {
  totalRequests.add(1);

  // Heavy endpoint test
  const res = http.get(`${BASE_URL}/api/conversations?limit=50`, {
    headers: headers,
    timeout: '10s'
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 2000,
  });

  successRate.add(success);
  errorRate.add(!success);

  // Log when errors start occurring
  if (!success) {
    console.log(`Error at VU ${__VU}: Status ${res.status}, Duration ${res.timings.duration}ms`);
  }

  sleep(1);
}

export function handleSummary(data) {
  const errorCount = data.metrics.errors.values.rate * data.metrics.http_reqs.values.count;
  const maxVUs = data.metrics.vus_max.values.max;

  console.log('\n========================================');
  console.log('STRESS TEST RESULTS');
  console.log('========================================');
  console.log(`Max Virtual Users: ${maxVUs}`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${errorCount} (${(data.metrics.errors.values.rate * 100).toFixed(2)}%)`);
  console.log(`Response Time p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`Response Time p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
  console.log('========================================\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
    'stress-test-results.json': JSON.stringify(data, null, 2),
  };
}
