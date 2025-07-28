import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const loginDuration = new Trend('login_duration');
const statusPageDuration = new Trend('status_page_duration');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest'
    },
    
    // Load test - simulate normal traffic
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 }, // Ramp up to 100 users
        { duration: '10m', target: 100 }, // Stay at 100 users
        { duration: '5m', target: 0 }, // Ramp down to 0 users
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '2m' // Start after smoke test
    },
    
    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '25m' // Start after load test
    },
    
    // Spike test - sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 }, // Spike to 1000 users
        { duration: '3m', target: 1000 }, // Stay at 1000
        { duration: '10s', target: 0 }, // Scale down
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '60m' // Start after stress test
    },
    
    // Soak test - sustained load
    soak_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2h',
      tags: { test_type: 'soak' },
      exec: 'soakTest',
      startTime: '65m' // Start after spike test
    }
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.1'], // Custom error rate under 10%
    api_duration: ['p(95)<300'], // API calls 95% under 300ms
    login_duration: ['p(95)<1000'], // Login 95% under 1s
    status_page_duration: ['p(95)<200'] // Status page 95% under 200ms
  }
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const PUBLIC_URL = __ENV.PUBLIC_URL || 'http://localhost:4001';

// Test data
const testNests = [];
const testUsers = [];

// Smoke test - basic functionality
export function smokeTest() {
  group('Smoke Test - Basic Functionality', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
      'health check response is healthy': (r) => JSON.parse(r.body).status === 'healthy'
    });
    
    // Register nest
    const nestData = {
      subdomain: `smoke-${randomString(8)}`,
      email: `smoke-${randomString(8)}@example.com`,
      password: 'Test123!@#'
    };
    
    const registerRes = http.post(`${BASE_URL}/api/nests/register`, JSON.stringify(nestData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    check(registerRes, {
      'registration successful': (r) => r.status === 201,
      'returns auth token': (r) => JSON.parse(r.body).token !== undefined
    });
    
    if (registerRes.status === 201) {
      const { token, nest } = JSON.parse(registerRes.body);
      
      // Create service
      const serviceRes = http.post(`${BASE_URL}/api/services`, JSON.stringify({
        name: 'Smoke Test Service',
        url: 'https://example.com',
        type: 'web',
        checkInterval: 60
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      check(serviceRes, {
        'service creation successful': (r) => r.status === 201
      });
      
      // Check public status page
      const statusRes = http.get(`${PUBLIC_URL}/api/status`, {
        headers: { 'X-Nest-Subdomain': nest.subdomain }
      });
      
      check(statusRes, {
        'public status page accessible': (r) => r.status === 200
      });
    }
  });
  
  sleep(1);
}

// Load test - normal traffic patterns
export function loadTest() {
  group('Load Test - Normal Traffic', () => {
    // 40% - View public status pages
    if (Math.random() < 0.4) {
      viewStatusPage();
    }
    // 30% - Admin dashboard activities
    else if (Math.random() < 0.7) {
      adminDashboardFlow();
    }
    // 20% - Service management
    else if (Math.random() < 0.9) {
      serviceManagementFlow();
    }
    // 10% - New registrations
    else {
      newRegistrationFlow();
    }
  });
  
  sleep(randomIntBetween(1, 5));
}

// Stress test - increased load
export function stressTest() {
  // Similar to load test but with more aggressive patterns
  const choice = Math.random();
  
  if (choice < 0.5) {
    // 50% - Heavy API usage
    for (let i = 0; i < 5; i++) {
      viewStatusPage();
    }
  } else if (choice < 0.8) {
    // 30% - Complex queries
    complexDashboardQueries();
  } else {
    // 20% - Concurrent operations
    concurrentOperations();
  }
  
  sleep(randomIntBetween(0.5, 2));
}

// Spike test - sudden burst
export function spikeTest() {
  // All users hit the same endpoints simultaneously
  const start = Date.now();
  
  // Everyone views status page
  const statusRes = http.get(`${PUBLIC_URL}/api/status`, {
    headers: { 'X-Nest-Subdomain': 'demo' }
  });
  
  statusPageDuration.add(Date.now() - start);
  
  check(statusRes, {
    'handles spike load': (r) => r.status === 200 || r.status === 429 // Accept rate limiting
  });
}

// Soak test - sustained load
export function soakTest() {
  // Rotate through different operations
  const operations = [
    viewStatusPage,
    adminDashboardFlow,
    serviceManagementFlow,
    apiHealthChecks
  ];
  
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
  
  sleep(randomIntBetween(5, 10));
}

// Helper functions
function viewStatusPage() {
  const subdomain = testNests.length > 0 
    ? testNests[Math.floor(Math.random() * testNests.length)].subdomain 
    : 'demo';
    
  const start = Date.now();
  const res = http.get(`${PUBLIC_URL}/api/status`, {
    headers: { 'X-Nest-Subdomain': subdomain }
  });
  
  statusPageDuration.add(Date.now() - start);
  
  check(res, {
    'status page loads': (r) => r.status === 200
  });
  
  errorRate.add(res.status !== 200);
}

function adminDashboardFlow() {
  if (testUsers.length === 0) return;
  
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const start = Date.now();
  
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  loginDuration.add(Date.now() - start);
  
  if (loginRes.status === 200) {
    const { token } = JSON.parse(loginRes.body);
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Get services
    const servicesRes = http.get(`${BASE_URL}/api/services`, { headers: authHeaders });
    apiDuration.add(servicesRes.timings.duration);
    
    // Get dashboard stats
    const statsRes = http.get(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
    apiDuration.add(statsRes.timings.duration);
    
    check(servicesRes, {
      'can fetch services': (r) => r.status === 200
    });
  }
}

function serviceManagementFlow() {
  if (testUsers.length === 0) return;
  
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Quick login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (loginRes.status === 200) {
    const { token } = JSON.parse(loginRes.body);
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Create or update service
    if (Math.random() < 0.3) {
      // Create new service
      const serviceData = {
        name: `Load Test Service ${randomString(8)}`,
        url: `https://example-${randomString(8)}.com`,
        type: 'web',
        checkInterval: 60
      };
      
      const createRes = http.post(`${BASE_URL}/api/services`, JSON.stringify(serviceData), {
        headers: authHeaders
      });
      
      apiDuration.add(createRes.timings.duration);
      errorRate.add(createRes.status !== 201);
    } else {
      // Update existing service
      const servicesRes = http.get(`${BASE_URL}/api/services`, { headers: authHeaders });
      
      if (servicesRes.status === 200) {
        const services = JSON.parse(servicesRes.body).services;
        if (services.length > 0) {
          const service = services[Math.floor(Math.random() * services.length)];
          
          const updateRes = http.put(`${BASE_URL}/api/services/${service.id}`, JSON.stringify({
            checkInterval: [30, 60, 300][Math.floor(Math.random() * 3)]
          }), {
            headers: authHeaders
          });
          
          apiDuration.add(updateRes.timings.duration);
        }
      }
    }
  }
}

function newRegistrationFlow() {
  const nestData = {
    subdomain: `load-${randomString(8)}`,
    email: `load-${randomString(8)}@example.com`,
    password: 'LoadTest123!@#'
  };
  
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/nests/register`, JSON.stringify(nestData), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  apiDuration.add(Date.now() - start);
  
  if (res.status === 201) {
    const data = JSON.parse(res.body);
    testNests.push(data.nest);
    testUsers.push({
      email: nestData.email,
      password: nestData.password,
      nestId: data.nest.id
    });
  }
  
  errorRate.add(res.status !== 201);
}

function complexDashboardQueries() {
  if (testUsers.length === 0) return;
  
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (loginRes.status === 200) {
    const { token } = JSON.parse(loginRes.body);
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Parallel requests
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/services`, null, { headers: authHeaders }],
      ['GET', `${BASE_URL}/api/dashboard/stats`, null, { headers: authHeaders }],
      ['GET', `${BASE_URL}/api/monitoring/history?days=7`, null, { headers: authHeaders }],
      ['GET', `${BASE_URL}/api/incidents`, null, { headers: authHeaders }]
    ]);
    
    responses.forEach(res => {
      apiDuration.add(res.timings.duration);
      errorRate.add(res.status !== 200);
    });
  }
}

function concurrentOperations() {
  if (testUsers.length < 5) return;
  
  // Select 5 random users
  const users = [];
  for (let i = 0; i < 5; i++) {
    users.push(testUsers[Math.floor(Math.random() * testUsers.length)]);
  }
  
  // Each user performs different operation simultaneously
  const batch = users.map(user => {
    return http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  // Process results
  batch.forEach(res => {
    if (res.status === 200) {
      const { token } = JSON.parse(res.body);
      
      // Each user creates a service
      http.post(`${BASE_URL}/api/services`, JSON.stringify({
        name: `Concurrent Service ${randomString(8)}`,
        url: 'https://example.com',
        type: 'web',
        checkInterval: 60
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    }
  });
}

function apiHealthChecks() {
  const endpoints = [
    `${BASE_URL}/health`,
    `${PUBLIC_URL}/health`,
    `${BASE_URL}/metrics`,
    `${PUBLIC_URL}/metrics`
  ];
  
  endpoints.forEach(endpoint => {
    const res = http.get(endpoint);
    check(res, {
      [`${endpoint} is healthy`]: (r) => r.status === 200
    });
  });
}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}