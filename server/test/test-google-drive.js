#!/usr/bin/env node

/**
 * Manual test script for Google Drive integration
 * Usage: node server/test/test-google-drive.js [action]
 * 
 * Actions:
 *   status - Check connection status
 *   auth - Get authorization URL
 *   test - Test connection
 *   upload - Test file upload (requires connection)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const TOKEN = process.env.TEST_TOKEN || '';

async function checkStatus() {
  console.log('📊 Checking Google Drive connection status...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/files/google-drive/auth/status`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Status retrieved successfully:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Failed to get status:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getAuthUrl() {
  console.log('🔗 Getting authorization URL...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/files/google-drive/auth/initiate`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Authorization URL:');
      console.log(data.authUrl);
      console.log('\n📝 Visit this URL in your browser to authorize access');
    } else {
      console.log('❌ Failed to get auth URL:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testConnection() {
  console.log('🔌 Testing Google Drive connection...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/files/google-drive/auth/test`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Connection test successful:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Connection test failed:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testUpload() {
  console.log('📤 Testing file upload...\n');
  
  // Create a simple test file (base64 encoded)
  const testContent = 'This is a test file for Google Drive integration';
  const fileData = Buffer.from(testContent).toString('base64');
  
  const payload = {
    fileName: 'test-file.txt',
    mimeType: 'text/plain',
    entityType: 'Evidence',
    entityId: 'test-entity-123',
    fileData: fileData,
  };
  
  try {
    const response = await fetch(`${BASE_URL}/files/google-drive/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ File uploaded successfully:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Upload failed:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main execution
const action = process.argv[2] || 'status';

console.log('🚀 Google Drive Integration Test\n');
console.log(`📍 API URL: ${BASE_URL}`);
console.log(`🔑 Token: ${TOKEN ? '***' : 'NOT SET'}\n`);

if (!TOKEN) {
  console.log('⚠️  Warning: No TEST_TOKEN provided. Some actions may fail.\n');
}

switch (action) {
  case 'status':
    checkStatus();
    break;
  case 'auth':
    getAuthUrl();
    break;
  case 'test':
    testConnection();
    break;
  case 'upload':
    testUpload();
    break;
  default:
    console.log('❌ Unknown action:', action);
    console.log('\nAvailable actions:');
    console.log('  - status: Check connection status');
    console.log('  - auth: Get authorization URL');
    console.log('  - test: Test connection');
    console.log('  - upload: Test file upload');
    process.exit(1);
}
