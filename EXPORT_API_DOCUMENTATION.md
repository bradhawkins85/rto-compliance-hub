# Data Export and Reports API Documentation

This document describes the data export and PDF report generation endpoints available in the RTO Compliance Hub API.

## Table of Contents

1. [CSV Export Endpoints](#csv-export-endpoints)
2. [PDF Report Endpoints](#pdf-report-endpoints)
3. [Response Formats](#response-formats)
4. [Examples](#examples)

---

## CSV Export Endpoints

All CSV export endpoints require authentication and appropriate permissions. CSV files are downloaded directly with proper headers set for file download.

### Export Policies

**Endpoint:** `GET /api/v1/policies/export`

**Description:** Export all policies with metadata, owner information, and mapped standards as CSV.

**Authentication:** Required (Bearer token)

**Permission:** `policies:read`

**Query Parameters:**
- `status` (optional): Filter by policy status (`Draft`, `Published`, `Archived`)
- `ownerId` (optional): Filter by owner user ID
- `standardId` (optional): Filter by mapped standard ID
- `q` (optional): Search query for policy title

**Response:** CSV file download

**CSV Columns:**
- ID
- Title
- Status
- Owner Name
- Owner Email
- Current Version
- Published At
- Review Date
- File URL
- Mapped Standards
- Created At
- Updated At

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/policies/export?status=Published" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o policies-export.csv
```

---

### Export Standards Mappings

**Endpoint:** `GET /api/v1/standards/export/mappings`

**Description:** Export all standards with their policy and SOP mappings as CSV.

**Authentication:** Required (Bearer token)

**Permission:** `standards:read`

**Query Parameters:** None

**Response:** CSV file download

**CSV Columns:**
- Standard Code
- Standard Title
- Standard Clause
- Category
- Policy ID
- Policy Title
- Policy Status
- SOP ID
- SOP Title
- SOP Version

**Note:** Each row represents a single mapping. Standards with multiple mappings will have multiple rows.

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/standards/export/mappings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o standards-mappings-export.csv
```

---

### Export Credentials

**Endpoint:** `GET /api/v1/credentials/export`

**Description:** Export all staff credentials with expiry information as CSV.

**Authentication:** Required (Bearer token)

**Permission:** `credentials:read`

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `status` (optional): Filter by credential status (`Active`, `Expired`, `Revoked`)
- `type` (optional): Filter by credential type
- `expiresBefore` (optional): Filter by expiry date (ISO 8601 format)

**Response:** CSV file download

**CSV Columns:**
- ID
- Staff Name
- Staff Email
- Department
- Credential Name
- Type
- Status
- Issued At
- Expires At
- Days Until Expiry
- Expiring Soon (Yes/No)
- Evidence URL
- Created At

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/credentials/export?status=Active" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o credentials-export.csv
```

---

### Export Assets

**Endpoint:** `GET /api/v1/assets/export`

**Description:** Export all assets with service history as CSV.

**Authentication:** Required (Bearer token)

**Permission:** `assets:read`

**Query Parameters:**
- `type` (optional): Filter by asset type
- `status` (optional): Filter by asset status (`Available`, `Assigned`, `Servicing`, `Retired`)
- `location` (optional): Filter by location
- `serviceDueBefore` (optional): Filter by next service date (ISO 8601 format)

**Response:** CSV file download

**CSV Columns:**
- ID
- Type
- Name
- Serial Number
- Location
- Status
- Purchase Date
- Purchase Cost
- Last Service Date
- Next Service Date
- Latest Service Date
- Latest Service Notes
- Latest Service Cost
- Latest Serviced By
- Created At
- Updated At

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/assets/export?status=Available" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o assets-export.csv
```

---

### Export Feedback

**Endpoint:** `GET /api/v1/feedback/export`

**Description:** Export all feedback responses as CSV.

**Authentication:** Required (Bearer token)

**Permission:** `feedback:read`

**Query Parameters:**
- `type` (optional): Filter by feedback type (`learner`, `employer`, `industry`)
- `trainingProductId` (optional): Filter by training product ID
- `trainerId` (optional): Filter by trainer ID
- `dateFrom` (optional): Filter by start date (ISO 8601 format)
- `dateTo` (optional): Filter by end date (ISO 8601 format)

**Response:** CSV file download

**CSV Columns:**
- ID
- Type
- Training Product
- Course ID
- Trainer ID
- Rating
- Sentiment
- Comments
- Themes
- Anonymous (Yes/No)
- Submitted At

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/feedback/export?type=learner&dateFrom=2024-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o feedback-export.csv
```

---

## PDF Report Endpoints

All PDF report endpoints require authentication and appropriate permissions. PDF files are generated dynamically and downloaded directly.

### Compliance Gap Analysis Report

**Endpoint:** `GET /api/v1/reports/compliance-gaps`

**Description:** Generate a PDF report showing RTO standards compliance coverage and gaps.

**Authentication:** Required (Bearer token)

**Permission:** `standards:read`

**Query Parameters:** None

**Response:** PDF file download

**Report Contents:**
- Coverage Summary (total standards, fully mapped, partially mapped, gaps, coverage rate)
- Standards with No Mappings (critical gaps)
- Standards with Partial Mappings
- Recommendations

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/reports/compliance-gaps" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o compliance-gaps-report.pdf
```

---

### Audit Readiness Report

**Endpoint:** `GET /api/v1/reports/audit-readiness`

**Description:** Generate a PDF report showing overall compliance status and audit readiness.

**Authentication:** Required (Bearer token)

**Permission:** `policies:read`

**Query Parameters:** None

**Response:** PDF file download

**Report Contents:**
- Readiness Summary (published policies, total standards, active credentials, compliance rates)
- Compliance Areas (policies, standards, credentials, PD)
- Areas Requiring Attention
- Recommendations for Audit Preparation

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/reports/audit-readiness" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit-readiness-report.pdf
```

---

### PD Completion Report

**Endpoint:** `GET /api/v1/reports/pd-completion`

**Description:** Generate a PDF report showing staff Professional Development completion status.

**Authentication:** Required (Bearer token)

**Permission:** `pd:read`

**Query Parameters:** None

**Response:** PDF file download

**Report Contents:**
- PD Summary (total items, completed, overdue, due within 30 days, completion rate)
- Overdue PD Items
- PD Items Due Within 30 Days
- Recommendations

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/reports/pd-completion" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o pd-completion-report.pdf
```

---

### Feedback Summary Report

**Endpoint:** `GET /api/v1/reports/feedback-summary`

**Description:** Generate a PDF report summarizing feedback data and insights.

**Authentication:** Required (Bearer token)

**Permission:** `feedback:read`

**Query Parameters:**
- `dateFrom` (optional): Start date for report period (ISO 8601 format)
- `dateTo` (optional): End date for report period (ISO 8601 format)

**Default Period:** Last 90 days

**Response:** PDF file download

**Report Contents:**
- Feedback Summary (total count, by type, average rating, average sentiment)
- Top Themes
- Key Insights and Recommendations

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/reports/feedback-summary?dateFrom=2024-01-01&dateTo=2024-03-31" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o feedback-summary-report.pdf
```

---

## Response Formats

### CSV Export Response

**Status Code:** `200 OK`

**Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="[resource]-export-[date].csv"
Cache-Control: no-cache
Pragma: no-cache
```

**Body:** CSV file content

### PDF Report Response

**Status Code:** `200 OK`

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="[report-type]-report-[date].pdf"
Cache-Control: no-cache
Pragma: no-cache
```

**Body:** PDF file content

### Error Response

**Status Code:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, or `500 Internal Server Error`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid query parameters",
  "instance": "/api/v1/policies/export"
}
```

---

## Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');
const fs = require('fs');

async function exportPolicies() {
  try {
    const response = await axios({
      method: 'get',
      url: 'https://api.example.com/api/v1/policies/export',
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      responseType: 'stream'
    });

    const writer = fs.createWriteStream('policies-export.csv');
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Export failed:', error.response.data);
  }
}

exportPolicies();
```

### Python Example

```python
import requests

def export_credentials():
    url = 'https://api.example.com/api/v1/credentials/export'
    headers = {'Authorization': 'Bearer YOUR_TOKEN'}
    params = {'status': 'Active'}
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code == 200:
        with open('credentials-export.csv', 'wb') as f:
            f.write(response.content)
        print('Export successful')
    else:
        print('Export failed:', response.json())

export_credentials()
```

### Frontend JavaScript Example

```javascript
async function downloadReport(reportType) {
  try {
    const response = await fetch(`/api/v1/reports/${reportType}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Report generation failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Usage
downloadReport('compliance-gaps');
```

---

## Notes

- All export and report endpoints respect the user's permissions and only return data they have access to
- Export operations are synchronous and complete immediately for typical data volumes
- CSV exports include UTF-8 BOM for proper Excel compatibility
- PDF reports use A4 page size with professional formatting
- Date/time values in exports use ISO 8601 format (UTC) or Australian locale where appropriate
- Large exports may take several seconds to generate - implement appropriate loading indicators in your UI
- Exported filenames include the current date for easy organization
- All exports can be filtered using query parameters to reduce data size and improve performance
