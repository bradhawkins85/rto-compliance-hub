#!/usr/bin/env node

/**
 * Manual test script for JotForm webhook endpoint
 * Usage: node server/test/test-webhook.js [fixture-name]
 * 
 * Examples:
 *   node server/test/test-webhook.js learner
 *   node server/test/test-webhook.js employer
 *   node server/test/test-webhook.js anonymous
 *   node server/test/test-webhook.js sop
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/v1/webhooks/jotform';
const WEBHOOK_SECRET = process.env.JOTFORM_WEBHOOK_SECRET || '';

// Available test fixtures
const FIXTURES = {
  learner: 'jotform-learner-feedback.json',
  employer: 'jotform-employer-feedback.json',
  anonymous: 'jotform-anonymous-feedback.json',
  sop: 'jotform-sop-completion.json',
};

function loadFixture(fixtureName) {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const filename = FIXTURES[fixtureName];
  
  if (!filename) {
    console.error(`❌ Unknown fixture: ${fixtureName}`);
    console.log('\nAvailable fixtures:');
    Object.keys(FIXTURES).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  const filePath = path.join(fixturesDir, filename);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading fixture ${filename}:`, error.message);
    process.exit(1);
  }
}

function generateSignature(payload, secret) {
  if (!secret) {
    return '';
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

async function sendWebhook(payload, signature) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'JotForm-Test-Client/1.0',
  };

  if (signature) {
    headers['x-jotform-signature'] = signature;
  }

  console.log('\n🚀 Sending webhook to:', WEBHOOK_URL);
  console.log('📦 Payload:', JSON.stringify(payload, null, 2).substring(0, 200) + '...');
  console.log('🔐 Signature:', signature || '(none - validation disabled)');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);
    
    const responseData = await response.json();
    console.log('📄 Response Body:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook sent successfully!');
      
      // If we got a submission ID, try to check its status
      if (responseData.submissionId) {
        console.log('\n⏳ Waiting 2 seconds before checking status...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await checkStatus(responseData.submissionId);
      }
    } else {
      console.log('\n❌ Webhook failed!');
    }

    return response.ok;
  } catch (error) {
    console.error('\n❌ Error sending webhook:', error.message);
    return false;
  }
}

async function checkStatus(submissionId) {
  const statusUrl = `${WEBHOOK_URL}/status/${submissionId}`;
  console.log('\n🔍 Checking submission status:', statusUrl);

  try {
    const response = await fetch(statusUrl);
    const data = await response.json();
    
    console.log('📊 Status:', data.status);
    console.log('📄 Full Status Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

// Main execution
const fixtureName = process.argv[2] || 'learner';
const payload = loadFixture(fixtureName);
const signature = generateSignature(payload, WEBHOOK_SECRET);

console.log('🧪 Testing JotForm Webhook Integration');
console.log('=' .repeat(50));
console.log('Fixture:', fixtureName);
console.log('Form ID:', payload.formID);
console.log('Submission ID:', payload.submissionID);
console.log('Form Type:', payload.form_title);

sendWebhook(payload, signature)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
