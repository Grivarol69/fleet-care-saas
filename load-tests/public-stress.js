import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Wrap up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
  },
};

// Base URL
const BASE_URL = 'http://localhost:3000';

export default function () {
  // 1. Visit Homepage
  let res = http.get(`${BASE_URL}/`);

  check(res, {
    'homepage status is 200/307': (r) => r.status === 200 || r.status === 307,
  });

  // 2. Visit Sign In (Public)
  res = http.get(`${BASE_URL}/sign-in`);
  check(res, {
    'sign-in status is 200': (r) => r.status === 200,
  });

  // 3. API Health Check (if exists, or just public asset)
  // Testing a static asset to verify server throughput without auth
  res = http.get(`${BASE_URL}/favicon.ico`);
  check(res, {
    'favicon status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
