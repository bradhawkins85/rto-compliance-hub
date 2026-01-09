# AI Sentiment Analysis for Feedback - Implementation Guide

## Overview

The AI Sentiment Analysis feature provides automated analysis of feedback using OpenAI's GPT models, with a keyword-based fallback when the API is unavailable or cost limits are reached. It analyzes sentiment, extracts themes, tracks trends, and monitors API costs.

## Features

### ✅ Implemented Features

1. **Automated Sentiment Analysis**
   - Overall sentiment scoring (-1 to +1 scale)
   - Aspect-based sentiment (trainer, content, facilities)
   - Confidence scores for analysis accuracy
   - Automatic analysis on feedback creation
   - Daily batch processing of pending feedback

2. **Theme Extraction**
   - Identifies top 5 themes from feedback
   - Tracks theme frequency
   - Detects emerging themes over time
   - Compares theme trends across periods

3. **Trend Detection**
   - 30-day vs 60-day comparison
   - Automatic alerts for declining sentiment
   - Percentage change calculations
   - Trend direction indicators

4. **Cost Monitoring**
   - Tracks API token usage
   - Calculates estimated costs
   - Monthly cost limits with alerts
   - Automatic fallback when limits reached

5. **Fallback Analysis**
   - Keyword-based sentiment analysis
   - 80% accuracy on test cases
   - No API key required
   - Zero cost operation

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=""                    # Get from https://platform.openai.com/
OPENAI_MODEL="gpt-4o-mini"           # Model to use (gpt-4o-mini recommended for cost)
OPENAI_MAX_TOKENS=500                # Maximum tokens per request
OPENAI_TEMPERATURE=0.3               # Temperature for generation (0.0-1.0)

# AI Analysis Cost Monitoring
AI_COST_LIMIT_MONTHLY=100            # Monthly cost limit in USD
AI_COST_ALERT_THRESHOLD=80           # Alert threshold percentage (80% of limit)
```

### Getting an OpenAI API Key

1. Go to https://platform.openai.com/
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file
6. Set up billing limits in OpenAI dashboard (recommended)

### Cost Estimates

Using GPT-4o-mini model (as of 2024):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Average feedback analysis: ~500-800 tokens
- Estimated cost per feedback: $0.0003 - $0.0005
- 1000 feedback analyses: ~$0.40

## API Endpoints

### GET /api/v1/feedback/insights
Get comprehensive feedback insights including sentiment, themes, and trends.

**Query Parameters:**
- `type` - Filter by feedback type (learner, employer, industry)
- `trainingProductId` - Filter by training product
- `trainerId` - Filter by trainer
- `dateFrom` - Start date (ISO 8601)
- `dateTo` - End date (ISO 8601)

**Response:**
```json
{
  "summary": {
    "totalCount": 150,
    "averageRating": 4.2,
    "averageSentiment": 0.65,
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-03-31T23:59:59Z"
    }
  },
  "trend": {
    "direction": "improving",
    "percentage": 12.5,
    "recent": { "count": 75, "averageRating": 4.5 },
    "previous": { "count": 75, "averageRating": 4.0 }
  },
  "topThemes": [
    { "theme": "Trainer Quality", "count": 45 },
    { "theme": "Course Content", "count": 38 },
    { "theme": "Practical Skills", "count": 32 }
  ],
  "recommendations": [
    "Excellent feedback! Document and share successful practices.",
    "Positive trend detected. Continue current initiatives."
  ]
}
```

### GET /api/v1/feedback/trends
Get detailed trend analysis comparing recent and previous periods.

**Query Parameters:**
- `type` - Filter by feedback type
- `trainingProductId` - Filter by training product
- `trainerId` - Filter by trainer

**Response:**
```json
{
  "current": {
    "average": 0.72,
    "count": 45,
    "period": "Last 30 days"
  },
  "previous": {
    "average": 0.64,
    "count": 38,
    "period": "30-60 days ago"
  },
  "change": 12.5,
  "direction": "improving",
  "alert": null
}
```

### GET /api/v1/feedback/emerging-themes
Get themes that are becoming more common over time.

**Query Parameters:**
- `days` - Number of days to analyze (default: 30)

**Response:**
```json
{
  "period": "30 days",
  "themes": [
    { "theme": "Online Learning", "count": 15, "change": 150.0 },
    { "theme": "Practical Skills", "count": 28, "change": 75.0 },
    { "theme": "Support", "count": 12, "change": 50.0 }
  ]
}
```

### GET /api/v1/feedback/ai-cost
Get current AI cost statistics and usage.

**Response:**
```json
{
  "totalTokens": 125000,
  "estimatedCost": 0.0875,
  "timestamp": "2024-03-31T10:00:00Z",
  "monthlyLimit": 100,
  "percentUsed": 0.09,
  "status": "ok"
}
```

## Scheduled Jobs

### Daily Feedback Analysis
- **Schedule:** 1:00 AM daily (Australia/Sydney timezone)
- **Function:** `processAllPendingFeedback()`
- **Batch Size:** 100 feedback items per run
- **Rate Limiting:** 100ms delay between API calls (max 10 requests/second)

The job:
1. Finds all feedback without sentiment analysis
2. Processes newest feedback first
3. Respects cost limits
4. Falls back to keyword analysis if needed
5. Logs progress and costs

## Frontend Components

### SentimentVisualization
Displays overall sentiment with visual indicators, confidence scores, and aspect breakdown.

```tsx
import { SentimentVisualization } from '@/components/feedback';

<SentimentVisualization
  sentiment={0.65}
  confidence={0.85}
  aspects={{
    trainer: 0.75,
    content: 0.60,
    facilities: 0.50
  }}
  trend={{
    direction: 'improving',
    percentage: 12.5
  }}
/>
```

### ThemesVisualization
Shows top themes with horizontal bar charts.

```tsx
import { ThemesVisualization } from '@/components/feedback';

<ThemesVisualization
  themes={[
    { theme: "Trainer Quality", count: 45 },
    { theme: "Course Content", count: 38 },
    { theme: "Practical Skills", count: 32 }
  ]}
  maxDisplay={5}
/>
```

### AICostMonitor
Tracks API usage and costs with visual indicators.

```tsx
import { AICostMonitor } from '@/components/feedback';

<AICostMonitor
  totalTokens={125000}
  estimatedCost={0.0875}
  monthlyLimit={100}
  percentUsed={0.09}
  status="ok"
/>
```

## Testing

### Running Tests

```bash
# Simple keyword-based test (no database required)
npx tsx server/test/test-ai-simple.ts

# Full test with database integration
npx tsx server/test/test-ai-analysis.ts
```

### Test Results

The keyword fallback analysis achieves **80% accuracy**, exceeding the 70% requirement:
- Positive sentiment: 100% accuracy (2/2 correct)
- Negative sentiment: 100% accuracy (2/2 correct)
- Neutral sentiment: 0% accuracy (0/1 correct)

## Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution:** Add `OPENAI_API_KEY` to your `.env` file. The system will use keyword fallback until configured.

### Issue: "Monthly cost limit reached"
**Solution:** 
1. Check costs with `GET /api/v1/feedback/ai-cost`
2. Increase `AI_COST_LIMIT_MONTHLY` in `.env`
3. Wait for next month (costs reset automatically)

### Issue: Low sentiment accuracy
**Solution:** 
1. Ensure OpenAI API key is configured
2. Check that model is `gpt-4o-mini` or better
3. Review feedback quality (short or vague feedback is harder to analyze)

### Issue: Slow processing
**Solution:**
1. Reduce batch size in `processAllPendingFeedback()`
2. Increase rate limiting delay (currently 100ms)
3. Check OpenAI API status

## Best Practices

1. **Cost Management**
   - Monitor costs regularly
   - Set appropriate monthly limits
   - Use gpt-4o-mini for cost efficiency
   - Enable cost alerts

2. **Data Quality**
   - Encourage detailed feedback comments
   - Review low-confidence analyses
   - Manually verify edge cases

3. **Performance**
   - Run batch processing during off-peak hours
   - Don't reprocess already analyzed feedback
   - Use appropriate rate limiting

4. **Security**
   - Keep API keys secure
   - Use environment variables
   - Rotate keys periodically
   - Monitor unauthorized usage

## Architecture Decisions

### Why GPT-4o-mini?
- 80% cheaper than GPT-4
- Sufficient accuracy for sentiment analysis
- Fast response times
- Good balance of cost and performance

### Why Keyword Fallback?
- Zero cost operation
- No API dependency
- 80% accuracy sufficient for basic needs
- Graceful degradation

### Why Aspect-Based Analysis?
- More actionable insights
- Identifies specific improvement areas
- Better than overall sentiment alone
- Aligns with RTO improvement processes

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom theme categories
- [ ] Predictive analytics
- [ ] Sentiment anomaly detection
- [ ] Integration with email alerts
- [ ] Custom reporting templates
- [ ] Historical trend visualization
- [ ] Comparative analysis across RTOs

## Support

For issues or questions:
1. Check this documentation
2. Review test cases in `server/test/`
3. Check logs for error messages
4. Verify environment configuration
5. Create an issue on GitHub

## License

See main project LICENSE file.
