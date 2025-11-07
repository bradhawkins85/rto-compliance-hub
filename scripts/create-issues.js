#!/usr/bin/env node

/**
 * Script to create GitHub issues from the gap analysis
 * 
 * This script reads ISSUES_TO_CREATE.md and creates GitHub issues
 * for each task identified in the gap analysis.
 * 
 * Usage:
 *   GITHUB_TOKEN=your_token node scripts/create-issues.js
 * 
 * Or with gh CLI:
 *   GITHUB_TOKEN=$(gh auth token) node scripts/create-issues.js
 */

import { Octokit } from 'octokit';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration from environment or defaults
const OWNER = process.env.GITHUB_OWNER || 'bradhawkins85';
const REPO = process.env.GITHUB_REPO || 'rto-compliance-hub';
const DRY_RUN = process.env.DRY_RUN === 'true';

// GitHub token from environment
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  console.error('Usage: GITHUB_TOKEN=your_token node scripts/create-issues.js');
  console.error('Or: GITHUB_TOKEN=$(gh auth token) node scripts/create-issues.js');
  console.error('\nOptional: Set GITHUB_OWNER and GITHUB_REPO to use with different repositories');
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

// Priority emoji to label mapping
const PRIORITY_MAP = {
  '🔴': { label: 'priority: critical', color: 'b60205' },
  '🟠': { label: 'priority: high', color: 'd93f0b' },
  '🟡': { label: 'priority: medium', color: 'fbca04' },
  '🟢': { label: 'priority: lower', color: '0e8a16' },
  '🔵': { label: 'priority: production', color: '1d76db' }
};

// Extract issue data from markdown
function parseIssuesFromMarkdown(content) {
  const issues = [];
  
  // Split content by issue headers
  const sections = content.split(/(?=## Issue #\d+:)/);
  
  for (const section of sections) {
    if (!section.trim() || !section.startsWith('## Issue #')) continue;
    
    try {
      const lines = section.split('\n');
      const titleLine = lines.find(l => l.startsWith('## Issue #'));
      const priorityLine = lines.find(l => l.startsWith('**Priority**:'));
      const effortLine = lines.find(l => l.startsWith('**Estimated Effort**:'));
      const labelsLine = lines.find(l => l.startsWith('**Labels**:'));
      
      if (!titleLine || !priorityLine || !effortLine || !labelsLine) continue;
      
      // Extract issue number and title
      const titleMatch = titleLine.match(/## Issue #(\d+): (.+)/);
      if (!titleMatch) continue;
      const [, number, title] = titleMatch;
      
      // Extract priority
      const priorityMatch = priorityLine.match(/\*\*Priority\*\*: (🔴|🟠|🟡|🟢|🔵) (.+)/);
      if (!priorityMatch) continue;
      const [, priorityEmoji, priorityText] = priorityMatch;
      
      // Extract effort
      const effortMatch = effortLine.match(/\*\*Estimated Effort\*\*: (.+)/);
      const effort = effortMatch ? effortMatch[1].trim() : '';
      
      // Extract labels
      const labelsMatch = labelsLine.match(/\*\*Labels\*\*: `(.+)`/);
      const labelString = labelsMatch ? labelsMatch[1] : '';
      const labels = labelString.split('`, `').map(l => l.replace(/`/g, '').trim());
      
      // Extract body (everything after the first section header up to next issue or end)
      const bodyStartIndex = section.indexOf('### Description');
      if (bodyStartIndex === -1) {
        console.warn(`Warning: Could not find '### Description' in issue ${number}`);
        continue;
      }
      
      const bodyEndIndex = section.indexOf('---\n\n## Issue #', bodyStartIndex);
      let body = bodyEndIndex > 0 
        ? section.substring(bodyStartIndex, bodyEndIndex)
        : section.substring(bodyStartIndex);
      
      // Clean up body
      body = body.replace('### Description\n\n', '').trim();
      
      // Add effort to body
      body = `**Estimated Effort**: ${effort}\n\n${body}`;
      
      // Add priority label
      const priorityLabel = PRIORITY_MAP[priorityEmoji].label;
      if (!labels.includes(priorityLabel)) {
        labels.push(priorityLabel);
      }
      
      issues.push({
        number: parseInt(number),
        title: `#${number}: ${title}`,
        body,
        labels,
        priorityEmoji,
        priorityText
      });
    } catch (error) {
      console.error(`Error parsing issue from section:`, error.message);
      console.error('Section preview:', section.substring(0, 200));
    }
  }
  
  return issues.sort((a, b) => a.number - b.number);
}

// Ensure all required labels exist in the repository
async function ensureLabelsExist() {
  console.log('\n📋 Ensuring labels exist...');
  
  const labelsToCreate = [
    ...Object.values(PRIORITY_MAP).map(p => ({ name: p.label, color: p.color, description: '' })),
    { name: 'infrastructure', color: '0052cc', description: 'Infrastructure and DevOps' },
    { name: 'backend', color: '5319e7', description: 'Backend development' },
    { name: 'frontend', color: 'c5def5', description: 'Frontend development' },
    { name: 'security', color: 'b60205', description: 'Security related' },
    { name: 'database', color: '1d76db', description: 'Database related' },
    { name: 'api', color: '84b6eb', description: 'API development' },
    { name: 'integration', color: 'c2e0c6', description: 'Third-party integration' },
    { name: 'enhancement', color: 'a2eeef', description: 'New feature or enhancement' },
    { name: 'testing', color: 'd4c5f9', description: 'Testing related' },
    { name: 'documentation', color: 'fef2c0', description: 'Documentation' },
    { name: 'gap-analysis', color: 'ededed', description: 'From gap analysis' }
  ];
  
  for (const label of labelsToCreate) {
    try {
      await octokit.rest.issues.getLabel({
        owner: OWNER,
        repo: REPO,
        name: label.name
      });
      console.log(`  ✓ Label "${label.name}" already exists`);
    } catch (error) {
      if (error.status === 404) {
        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would create label: ${label.name}`);
        } else {
          await octokit.rest.issues.createLabel({
            owner: OWNER,
            repo: REPO,
            name: label.name,
            color: label.color,
            description: label.description
          });
          console.log(`  ✓ Created label: ${label.name}`);
        }
      } else {
        console.error(`  ✗ Error checking label "${label.name}":`, error.message);
      }
    }
  }
}

// Create a single issue
async function createIssue(issueData) {
  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would create issue:`);
    console.log(`  Title: ${issueData.title}`);
    console.log(`  Labels: ${issueData.labels.join(', ')}`);
    console.log(`  Body length: ${issueData.body.length} characters`);
    return { data: { number: 0, html_url: 'dry-run' } };
  }
  
  try {
    // Add the gap-analysis label to all issues
    const labels = [...new Set([...issueData.labels, 'gap-analysis'])];
    
    const response = await octokit.rest.issues.create({
      owner: OWNER,
      repo: REPO,
      title: issueData.title,
      body: issueData.body,
      labels: labels
    });
    
    return response;
  } catch (error) {
    console.error(`Error creating issue: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 GitHub Issue Creator for RTO Compliance Hub');
  console.log('================================================\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No issues will be created\n');
  }
  
  // Read the issues document
  const issuesPath = join(__dirname, '..', 'ISSUES_TO_CREATE.md');
  console.log(`📖 Reading issues from: ${issuesPath}`);
  
  let content;
  try {
    content = readFileSync(issuesPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
  
  // Parse issues from markdown
  console.log('📝 Parsing issues from markdown...');
  const issues = parseIssuesFromMarkdown(content);
  console.log(`✓ Found ${issues.length} issues to create\n`);
  
  if (issues.length === 0) {
    console.error('Error: No issues found in document');
    process.exit(1);
  }
  
  // Ensure labels exist
  await ensureLabelsExist();
  
  // Create issues
  console.log('\n🔨 Creating issues...');
  const created = [];
  
  for (const issue of issues) {
    try {
      console.log(`\n  Creating issue ${issue.number}: ${issue.title}`);
      const response = await createIssue(issue);
      
      if (!DRY_RUN) {
        console.log(`  ✓ Created: ${response.data.html_url}`);
        created.push({
          number: issue.number,
          githubNumber: response.data.number,
          url: response.data.html_url,
          title: issue.title
        });
        
        // Rate limiting: wait 1 second between creations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ✗ Failed to create issue ${issue.number}: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n\n📊 Summary');
  console.log('==========');
  console.log(`Total issues in document: ${issues.length}`);
  console.log(`Successfully created: ${created.length}`);
  console.log(`Failed: ${issues.length - created.length}`);
  
  if (created.length > 0 && !DRY_RUN) {
    console.log('\n✅ Created Issues:');
    for (const issue of created) {
      console.log(`  #${issue.githubNumber}: ${issue.title}`);
      console.log(`     ${issue.url}`);
    }
  }
  
  if (DRY_RUN) {
    console.log('\n💡 To actually create the issues, run without DRY_RUN:');
    console.log('   GITHUB_TOKEN=your_token node scripts/create-issues.js');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
