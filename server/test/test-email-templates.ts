/**
 * Email Service Test Script
 * 
 * This script tests the email notification system without requiring database access.
 * It validates:
 * - Email template rendering
 * - Template data population
 * - HTML and text email generation
 */

import { emailTemplates } from '../src/services/email';

console.log('🧪 Testing Email Service\n');

// Test data for each template
const testData = {
  'policy-review-reminder': {
    userName: 'John Smith',
    policyTitle: 'Code of Conduct Policy',
    reviewDueDate: '15/12/2025',
    daysRemaining: 10,
    policyUrl: 'http://localhost:5173/policies/123',
    unsubscribeUrl: 'http://localhost:3000/api/v1/email/unsubscribe?userId=user123',
  },
  'credential-expiry-alert': {
    userName: 'Jane Doe',
    credentialName: 'First Aid Certificate',
    credentialType: 'Certificate',
    expiryDate: '20/12/2025',
    daysRemaining: 15,
    credentialUrl: 'http://localhost:5173/credentials/456',
    unsubscribeUrl: 'http://localhost:3000/api/v1/email/unsubscribe?userId=user456',
  },
  'pd-due-reminder': {
    userName: 'Alice Johnson',
    pdTitle: 'Advanced Training Techniques Workshop',
    pdCategory: 'Pedagogical',
    pdHours: 8,
    dueDate: '25/11/2025',
    daysRemaining: 5,
    pdUrl: 'http://localhost:5173/pd/789',
    unsubscribeUrl: 'http://localhost:3000/api/v1/email/unsubscribe?userId=user789',
  },
  'complaint-notification': {
    userName: 'Bob Manager',
    complaintId: 'CMP-2025-001',
    complaintSource: 'Student',
    complaintStatus: 'New',
    receivedDate: '11/11/2025',
    slaDeadline: '13/11/2025',
    complaintUrl: 'http://localhost:5173/complaints/complaint123',
    unsubscribeUrl: 'http://localhost:3000/api/v1/email/unsubscribe?userId=manager123',
  },
  'welcome-onboarding': {
    userName: 'Sarah New',
    userEmail: 'sarah.new@example.com',
    userDepartment: 'Training',
    userRole: 'Trainer',
    dashboardUrl: 'http://localhost:5173/dashboard',
    unsubscribeUrl: 'http://localhost:3000/api/v1/email/unsubscribe?userId=new123',
  },
  'digest-summary': {
    userName: 'Tom Admin',
    digestDate: 'Monday, 11 November 2025',
    dashboardUrl: 'http://localhost:5173/dashboard',
    unsubscribeUrl: 'http://localhost:3000/api/v1/email/unsubscribe?userId=admin123',
    policyReviews: [
      { title: 'Privacy Policy', dueDate: '15/11/2025' },
      { title: 'Health & Safety Policy', dueDate: '20/11/2025' },
    ],
    credentialsExpiring: [
      { name: 'Training Certificate', expiryDate: '25/11/2025' },
    ],
    pdActivities: [
      { title: 'Industry Update Workshop', dueDate: '18/11/2025' },
    ],
    complaints: [
      { id: 'CMP-001', status: 'New' },
    ],
  },
};

let passedTests = 0;
let failedTests = 0;

// Test each template
for (const [templateName, template] of Object.entries(emailTemplates)) {
  console.log(`\n📧 Testing template: ${templateName}`);
  console.log('─'.repeat(60));
  
  try {
    const data = testData[templateName as keyof typeof testData];
    
    // Test subject
    console.log(`Subject: ${template.subject}`);
    if (!template.subject || template.subject.length === 0) {
      throw new Error('Subject is empty');
    }
    
    // Test HTML generation
    const html = template.html(data);
    if (!html || html.length === 0) {
      throw new Error('HTML content is empty');
    }
    console.log(`✓ HTML generated (${html.length} characters)`);
    
    // Validate HTML structure
    if (!html.includes('<!DOCTYPE html>')) {
      throw new Error('HTML missing DOCTYPE');
    }
    if (!html.includes('<html>') || !html.includes('</html>')) {
      throw new Error('HTML missing html tags');
    }
    if (!html.includes(data.userName)) {
      throw new Error('HTML missing personalization (userName)');
    }
    console.log('✓ HTML structure valid');
    
    // Test text generation
    const text = template.text(data);
    if (!text || text.length === 0) {
      throw new Error('Text content is empty');
    }
    console.log(`✓ Text generated (${text.length} characters)`);
    
    // Validate text content
    if (!text.includes(data.userName)) {
      throw new Error('Text missing personalization (userName)');
    }
    if (!text.includes(data.unsubscribeUrl)) {
      throw new Error('Text missing unsubscribe link');
    }
    console.log('✓ Text content valid');
    
    console.log(`✅ Template ${templateName} PASSED`);
    passedTests++;
  } catch (error) {
    console.error(`❌ Template ${templateName} FAILED:`, (error as Error).message);
    failedTests++;
  }
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('📊 Test Summary');
console.log('═'.repeat(60));
console.log(`Total Templates: ${Object.keys(emailTemplates).length}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / Object.keys(emailTemplates).length) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All email templates are working correctly!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some email templates have issues that need to be fixed.');
  process.exit(1);
}
