#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * 
 * This script tests the core API endpoints for Users, Policies, and Standards.
 * 
 * Usage:
 *   npm run db:seed  # First seed the database
 *   npm run dev:server  # Start the server in another terminal
 *   node scripts/test-api.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rto-compliance-hub.local';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('❌ ERROR: DEFAULT_ADMIN_PASSWORD environment variable is required');
  console.error('   Set it before running tests: export DEFAULT_ADMIN_PASSWORD=your_password');
  process.exit(1);
}

let accessToken = '';
let createdUserId = '';
let createdPolicyId = '';
let standardId = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n📋 Testing Health Check...');
  const res = await makeRequest('GET', '/health');
  console.log(`   Status: ${res.status}`);
  console.log(`   Response:`, res.data);
  if (res.status === 200 && res.data.status === 'healthy') {
    console.log('   ✅ Health check passed');
    return true;
  }
  console.log('   ❌ Health check failed');
  return false;
}

async function testLogin() {
  console.log('\n🔐 Testing Login...');
  const res = await makeRequest('POST', '/api/v1/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.access_token) {
    accessToken = res.data.access_token;
    console.log(`   ✅ Login successful`);
    console.log(`   User: ${res.data.user.name} (${res.data.user.email})`);
    console.log(`   Roles: ${res.data.user.roles.join(', ')}`);
    return true;
  }
  console.log('   ❌ Login failed');
  console.log(`   Response:`, res.data);
  return false;
}

async function testListUsers() {
  console.log('\n👥 Testing List Users...');
  const res = await makeRequest('GET', '/api/v1/users?perPage=5', null, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.data) {
    console.log(`   ✅ Listed users successfully`);
    console.log(`   Total: ${res.data.meta.total} users`);
    console.log(`   Page: ${res.data.meta.page}/${res.data.meta.totalPages}`);
    return true;
  }
  console.log('   ❌ List users failed');
  return false;
}

async function testCreateUser() {
  console.log('\n➕ Testing Create User...');
  const res = await makeRequest('POST', '/api/v1/users', {
    email: `test.trainer.${Date.now()}@example.com`,
    name: 'Test Trainer',
    password: 'TestPass123!',
    department: 'Training',
    roles: ['Trainer'],
  }, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 201 && res.data.id) {
    createdUserId = res.data.id;
    console.log(`   ✅ User created successfully`);
    console.log(`   ID: ${res.data.id}`);
    console.log(`   Name: ${res.data.name}`);
    console.log(`   Email: ${res.data.email}`);
    return true;
  }
  console.log('   ❌ Create user failed');
  console.log(`   Response:`, res.data);
  return false;
}

async function testGetUser() {
  if (!createdUserId) {
    console.log('\n⏭️  Skipping Get User (no user created)');
    return false;
  }
  
  console.log('\n🔍 Testing Get User...');
  const res = await makeRequest('GET', `/api/v1/users/${createdUserId}`, null, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.id === createdUserId) {
    console.log(`   ✅ Get user successful`);
    console.log(`   Name: ${res.data.name}`);
    console.log(`   Department: ${res.data.department}`);
    console.log(`   Roles: ${res.data.roles.map(r => r.name).join(', ')}`);
    return true;
  }
  console.log('   ❌ Get user failed');
  return false;
}

async function testUpdateUser() {
  if (!createdUserId) {
    console.log('\n⏭️  Skipping Update User (no user created)');
    return false;
  }
  
  console.log('\n✏️  Testing Update User...');
  const res = await makeRequest('PATCH', `/api/v1/users/${createdUserId}`, {
    name: 'Test Trainer Updated',
    department: 'Admin',
  }, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.name === 'Test Trainer Updated') {
    console.log(`   ✅ Update user successful`);
    console.log(`   New name: ${res.data.name}`);
    console.log(`   New department: ${res.data.department}`);
    return true;
  }
  console.log('   ❌ Update user failed');
  return false;
}

async function testListStandards() {
  console.log('\n📚 Testing List Standards...');
  const res = await makeRequest('GET', '/api/v1/standards?perPage=5', null, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.data) {
    console.log(`   ✅ Listed standards successfully`);
    console.log(`   Total: ${res.data.meta.total} standards`);
    if (res.data.data.length > 0) {
      standardId = res.data.data[0].id;
      console.log(`   First standard: ${res.data.data[0].code} - ${res.data.data[0].title}`);
    }
    return true;
  }
  console.log('   ❌ List standards failed');
  return false;
}

async function testGetStandard() {
  if (!standardId) {
    console.log('\n⏭️  Skipping Get Standard (no standard ID)');
    return false;
  }
  
  console.log('\n🔍 Testing Get Standard...');
  const res = await makeRequest('GET', `/api/v1/standards/${standardId}`, null, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.id === standardId) {
    console.log(`   ✅ Get standard successful`);
    console.log(`   Code: ${res.data.code}`);
    console.log(`   Title: ${res.data.title}`);
    return true;
  }
  console.log('   ❌ Get standard failed');
  return false;
}

async function testCreatePolicy() {
  console.log('\n📝 Testing Create Policy...');
  const res = await makeRequest('POST', '/api/v1/policies', {
    title: `Test Policy ${Date.now()}`,
    reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    version: '1.0',
    content: 'This is a test policy content.',
  }, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 201 && res.data.id) {
    createdPolicyId = res.data.id;
    console.log(`   ✅ Policy created successfully`);
    console.log(`   ID: ${res.data.id}`);
    console.log(`   Title: ${res.data.title}`);
    console.log(`   Status: ${res.data.status}`);
    return true;
  }
  console.log('   ❌ Create policy failed');
  console.log(`   Response:`, res.data);
  return false;
}

async function testListPolicies() {
  console.log('\n📋 Testing List Policies...');
  const res = await makeRequest('GET', '/api/v1/policies?perPage=5', null, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.data !== undefined) {
    console.log(`   ✅ Listed policies successfully`);
    console.log(`   Total: ${res.data.meta.total} policies`);
    return true;
  }
  console.log('   ❌ List policies failed');
  return false;
}

async function testPublishPolicy() {
  if (!createdPolicyId) {
    console.log('\n⏭️  Skipping Publish Policy (no policy created)');
    return false;
  }
  
  console.log('\n🚀 Testing Publish Policy...');
  const res = await makeRequest('POST', `/api/v1/policies/${createdPolicyId}/publish`, {
    version: '1.0',
    content: 'Published version of test policy.',
  }, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 201 && res.data.version === '1.0') {
    console.log(`   ✅ Policy published successfully`);
    console.log(`   Version: ${res.data.version}`);
    console.log(`   Is Current: ${res.data.isCurrent}`);
    return true;
  }
  console.log('   ❌ Publish policy failed');
  return false;
}

async function testMapPolicyToStandards() {
  if (!createdPolicyId || !standardId) {
    console.log('\n⏭️  Skipping Map Policy to Standards (missing IDs)');
    return false;
  }
  
  console.log('\n🔗 Testing Map Policy to Standards...');
  const res = await makeRequest('POST', `/api/v1/policies/${createdPolicyId}/map`, {
    standardIds: [standardId],
  }, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 200 && res.data.standards) {
    console.log(`   ✅ Policy mapped to standards successfully`);
    console.log(`   Mapped ${res.data.standards.length} standard(s)`);
    return true;
  }
  console.log('   ❌ Map policy to standards failed');
  return false;
}

async function testDeleteUser() {
  if (!createdUserId) {
    console.log('\n⏭️  Skipping Delete User (no user created)');
    return false;
  }
  
  console.log('\n🗑️  Testing Delete User (Soft Delete)...');
  const res = await makeRequest('DELETE', `/api/v1/users/${createdUserId}`, null, accessToken);
  console.log(`   Status: ${res.status}`);
  
  if (res.status === 204) {
    console.log(`   ✅ User soft deleted successfully`);
    return true;
  }
  console.log('   ❌ Delete user failed');
  return false;
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting API Endpoint Tests');
  console.log('================================\n');
  
  const results = [];
  
  results.push(await testHealthCheck());
  results.push(await testLogin());
  
  if (!accessToken) {
    console.log('\n❌ Cannot proceed without authentication token');
    return;
  }
  
  // User endpoints
  results.push(await testListUsers());
  results.push(await testCreateUser());
  results.push(await testGetUser());
  results.push(await testUpdateUser());
  
  // Standards endpoints
  results.push(await testListStandards());
  results.push(await testGetStandard());
  
  // Policy endpoints
  results.push(await testCreatePolicy());
  results.push(await testListPolicies());
  results.push(await testPublishPolicy());
  results.push(await testMapPolicyToStandards());
  
  // Cleanup
  results.push(await testDeleteUser());
  
  // Summary
  console.log('\n================================');
  console.log('📊 Test Summary');
  console.log('================================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed');
  }
}

// Run the tests
runTests().catch(err => {
  console.error('\n💥 Error running tests:', err);
  process.exit(1);
});
