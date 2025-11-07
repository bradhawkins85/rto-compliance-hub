# Scripts Directory

This directory contains automation scripts for the RTO Compliance Hub project.

## create-issues.js

Automatically creates GitHub issues from the gap analysis documented in `ISSUES_TO_CREATE.md`.

### Prerequisites

- Node.js installed
- GitHub personal access token with `repo` scope

### Usage

#### Dry Run (Preview)

Test the script without creating actual issues:

```bash
DRY_RUN=true GITHUB_TOKEN=your_token node scripts/create-issues.js
```

#### Create Issues

Actually create the issues in GitHub:

```bash
GITHUB_TOKEN=your_token node scripts/create-issues.js
```

#### Using gh CLI

If you have the GitHub CLI installed and authenticated:

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/create-issues.js
```

### What It Does

1. Reads `ISSUES_TO_CREATE.md` and parses all 25 issues
2. Creates necessary labels in the repository if they don't exist
3. Creates each issue with:
   - Numbered title (e.g., "#1: Set up PostgreSQL database with Prisma ORM")
   - Full description with acceptance criteria
   - Appropriate labels (priority, type, area)
   - "gap-analysis" label for tracking

### Features

- **Dry run mode**: Preview what will be created without making changes
- **Label management**: Automatically creates required labels
- **Error handling**: Continues creating issues even if one fails
- **Rate limiting**: Waits 1 second between creations to respect API limits
- **Progress tracking**: Shows detailed progress and summary

### Labels Created

The script creates the following labels if they don't exist:

**Priority Labels**:
- `priority: critical` (red)
- `priority: high` (orange)
- `priority: medium` (yellow)
- `priority: lower` (green)
- `priority: production` (blue)

**Type Labels**:
- `infrastructure`
- `backend`
- `frontend`
- `security`
- `database`
- `api`
- `integration`
- `enhancement`
- `testing`
- `documentation`
- `gap-analysis`

### Troubleshooting

**Error: GITHUB_TOKEN environment variable is required**
- Make sure you've set the GITHUB_TOKEN environment variable
- Get a token from: https://github.com/settings/tokens
- Token needs `repo` scope

**Error: No issues found in document**
- Ensure `ISSUES_TO_CREATE.md` exists in the project root
- Check that the document follows the expected format

**Error creating issues**
- Verify your token has the correct permissions
- Check that you have access to the repository
- Ensure you're not hitting rate limits

### Output Example

```
🚀 GitHub Issue Creator for RTO Compliance Hub
================================================

📖 Reading issues from: /path/to/ISSUES_TO_CREATE.md
📝 Parsing issues from markdown...
✓ Found 25 issues to create

📋 Ensuring labels exist...
  ✓ Label "priority: critical" already exists
  ✓ Created label: gap-analysis

🔨 Creating issues...

  Creating issue 1: #1: Set up PostgreSQL database with Prisma ORM
  ✓ Created: https://github.com/bradhawkins85/rto-compliance-hub/issues/123

  Creating issue 2: #2: Implement JWT authentication and RBAC system
  ✓ Created: https://github.com/bradhawkins85/rto-compliance-hub/issues/124

...

📊 Summary
==========
Total issues in document: 25
Successfully created: 25
Failed: 0

✅ Created Issues:
  #123: #1: Set up PostgreSQL database with Prisma ORM
     https://github.com/bradhawkins85/rto-compliance-hub/issues/123
  #124: #2: Implement JWT authentication and RBAC system
     https://github.com/bradhawkins85/rto-compliance-hub/issues/124
  ...
```

## Future Scripts

Additional scripts that could be added:

- `update-issues.js` - Update existing issues based on changes in the document
- `close-issues.js` - Batch close completed issues
- `generate-project-board.js` - Create a project board from issues
- `sync-documentation.js` - Keep documentation in sync with code changes
