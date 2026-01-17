/**
 * k6 Spike Testing Script - BotFlow API
 * Phase 2 Week 6 Day 4: Test sudden traffic spikes
 *
 * This test simulates sudden spikes in traffic (like viral social media posts)
 *
 * Usage:
 *   k6 run spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const recoveryRate = new Rate('recovery');
const spikeRequests = new Counter('spike_requests');

// Spike test configuration
export let options = {
  stages: [
    { duration: '1m', target: 50 },    // Normal load
    { duration: '10s', target: 500 },  // SPIKE! 10x increase in 10 seconds
    { duration: '3m', target: 500 },   // Hold spike
    { duration: '1m', target: 50 },    // Back to normal
    { duration: '1m', target: 50 },    // Recovery period
    { duration: '10s', target: 800 },  // BIGGER SPIKE!
    { duration: '2m', target: 800 },   // Hold bigger spike
    { duration: '2m', target: 50 },    // Back to normal
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.1'],   // Allow 10% error rate during spikes
    'http_req_duration': ['p(99)<5000'], // Very relaxed during spikes
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

export default function() {
  spikeRequests.add(1);

  // Test multiple endpoints during spike
  const endpoints = [
    '/health',
    '/api/bots',
    '/api/conversations',
    '/api/analytics/realtime',
    '/api/templates'
  ];

  // Random endpoint selection
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(`${BASE_URL}${endpoint}`, {
    headers: endpoint.startsWith('/api/') ? headers : undefined,
    timeout: '10s'
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response received': (r) => r.body.length > 0,
  });

  errorRate.add(!success);

  // Track recovery after spike
  if (__VU < 100 && success) {
    recoveryRate.add(1);
  }

  // Shorter sleep during spike
  sleep(Math.random() * 2); // 0-2 seconds
}

export function handleSummary(data) {
  const totalReqs = data.metrics.http_reqs.values.count;
  const failedReqs = data.metrics.errors.values.rate * totalReqs;
  const maxVUs = data.metrics.vus_max.values.max;

  console.log('\n========================================');
  console.log('SPIKE TEST RESULTS');
  console.log('========================================');
  console.log(`Max Concurrent Users (Spike Peak): ${maxVUs}`);
  console.log(`Total Requests: ${totalReqs}`);
  console.log(`Failed Requests: ${failedReqs.toFixed(0)} (${(data.metrics.errors.values.rate * 100).toFixed(2)}%)`);
  console.log(`Response Time p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`Response Time p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);

  if (data.metrics.errors.values.rate < 0.05) {
    console.log('\n✅ System handled spikes well (< 5% error rate)');
  } else if (data.metrics.errors.values.rate < 0.1) {
    console.log('\n⚠️  System handled spikes acceptably (< 10% error rate)');
  } else {
    console.log('\n❌ System struggled with spikes (> 10% error rate)');
  }

  console.log('========================================\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
    'spike-test-results.json': JSON.stringify(data, null, 2),
  };
}
