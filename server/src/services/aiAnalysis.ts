import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

/**
 * AI Service for analyzing feedback
 * 
 * This service provides sentiment analysis and theme extraction.
 * It can work with or without OpenAI API - falls back to basic analysis if API key not configured.
 */

interface FeedbackAnalysis {
  sentiment: number; // -1 to 1
  themes: string[];
  confidence?: number; // 0 to 1
  aspects?: {
    trainer?: number;
    content?: number;
    facilities?: number;
  };
}

interface CostTracking {
  totalTokens: number;
  estimatedCost: number;
  timestamp: Date;
}

// Cost tracking state
let monthlyCost = 0;
let monthlyTokens = 0;
let lastResetDate = new Date();

// Cost per 1M tokens for GPT-4o-mini (as of 2024)
const COST_PER_MILLION_INPUT_TOKENS = 0.15;
const COST_PER_MILLION_OUTPUT_TOKENS = 0.60;

/**
 * Get OpenAI client instance
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'your-api-key-here' || apiKey === '') {
    return null;
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Check if we've exceeded cost limits
 */
function checkCostLimits(): boolean {
  resetIfNewMonth();
  
  const monthlyLimit = parseFloat(process.env.AI_COST_LIMIT_MONTHLY || '100');
  const alertThreshold = parseFloat(process.env.AI_COST_ALERT_THRESHOLD || '80');
  
  if (monthlyCost >= monthlyLimit) {
    console.error(`❌ Monthly AI cost limit reached: $${monthlyCost.toFixed(2)} / $${monthlyLimit}`);
    return false;
  }
  
  if (monthlyCost >= monthlyLimit * (alertThreshold / 100)) {
    console.warn(`⚠️  AI cost alert: $${monthlyCost.toFixed(2)} / $${monthlyLimit} (${alertThreshold}% threshold)`);
  }
  
  return true;
}

/**
 * Reset cost tracking if new month
 */
function resetIfNewMonth(): void {
  const now = new Date();
  if (now.getMonth() !== lastResetDate.getMonth() || now.getFullYear() !== lastResetDate.getFullYear()) {
    console.log(`🔄 Resetting monthly AI cost tracking. Previous: $${monthlyCost.toFixed(4)} (${monthlyTokens} tokens)`);
    monthlyCost = 0;
    monthlyTokens = 0;
    lastResetDate = now;
  }
}

/**
 * Track API usage cost
 */
function trackCost(inputTokens: number, outputTokens: number): void {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_MILLION_INPUT_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_MILLION_OUTPUT_TOKENS;
  const totalCost = inputCost + outputCost;
  
  monthlyCost += totalCost;
  monthlyTokens += inputTokens + outputTokens;
  
  console.log(`💰 API cost: $${totalCost.toFixed(6)} (${inputTokens + outputTokens} tokens) | Monthly total: $${monthlyCost.toFixed(4)}`);
}

/**
 * Get current cost tracking statistics
 */
export function getCostStats(): CostTracking {
  resetIfNewMonth();
  return {
    totalTokens: monthlyTokens,
    estimatedCost: monthlyCost,
    timestamp: new Date(),
  };
}
/**
 * Analyze feedback sentiment and extract themes
 */
export async function analyzeFeedback(
  feedbackId: string,
  comments: string | null
): Promise<FeedbackAnalysis> {
  try {
    // If no comments, return neutral sentiment and no themes
    if (!comments || comments.trim().length === 0) {
      return {
        sentiment: 0,
        themes: [],
        confidence: 0,
      };
    }

    // Check cost limits before proceeding
    if (!checkCostLimits()) {
      console.warn('Cost limit reached, falling back to keyword analysis');
      return analyzeWithKeywords(comments);
    }

    // Check if OpenAI API key is configured
    const openai = getOpenAIClient();

    if (openai) {
      // Use OpenAI for advanced analysis
      return await analyzeWithOpenAI(comments, openai);
    } else {
      // Use basic keyword-based analysis as fallback
      return analyzeWithKeywords(comments);
    }
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    // Return neutral values on error
    return {
      sentiment: 0,
      themes: [],
      confidence: 0,
    };
  }
}

/**
 * Analyze feedback using OpenAI API
 */
async function analyzeWithOpenAI(
  comments: string,
  openai: OpenAI
): Promise<FeedbackAnalysis> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10);
    const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.3');

    const systemPrompt = `You are an expert AI that analyzes training feedback for Registered Training Organizations (RTOs). 

Your task is to analyze feedback and provide:
1. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, and 1 is very positive)
2. Aspect-based sentiment for:
   - trainer: quality of instruction and trainer performance
   - content: course material, curriculum, and learning resources
   - facilities: physical environment, equipment, and infrastructure
3. 3-5 key themes or topics mentioned
4. Confidence score (0 to 1) indicating how certain you are about the analysis

Return ONLY valid JSON in this exact format:
{
  "sentiment": number,
  "aspects": {
    "trainer": number or null,
    "content": number or null,
    "facilities": number or null
  },
  "themes": string[],
  "confidence": number
}

If an aspect is not mentioned in the feedback, set it to null.`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: comments,
        },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });

    // Track usage and cost
    const usage = response.usage;
    if (usage) {
      trackCost(usage.prompt_tokens, usage.completion_tokens);
    }

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      sentiment: Math.max(-1, Math.min(1, result.sentiment || 0)),
      themes: Array.isArray(result.themes) ? result.themes.slice(0, 5) : [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      aspects: result.aspects ? {
        trainer: result.aspects.trainer !== null ? Math.max(-1, Math.min(1, result.aspects.trainer)) : undefined,
        content: result.aspects.content !== null ? Math.max(-1, Math.min(1, result.aspects.content)) : undefined,
        facilities: result.aspects.facilities !== null ? Math.max(-1, Math.min(1, result.aspects.facilities)) : undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to keyword analysis
    return analyzeWithKeywords(comments);
  }
}

/**
 * Basic keyword-based sentiment analysis (fallback)
 */
function analyzeWithKeywords(comments: string): FeedbackAnalysis {
  const text = comments.toLowerCase();
  
  // Positive keywords
  const positiveWords = [
    'excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic',
    'helpful', 'professional', 'knowledgeable', 'thorough', 'clear',
    'effective', 'valuable', 'useful', 'informative', 'enjoyable',
    'engaging', 'practical', 'relevant', 'organized', 'supportive',
  ];
  
  // Negative keywords
  const negativeWords = [
    'poor', 'bad', 'terrible', 'awful', 'useless', 'waste',
    'confusing', 'unclear', 'disorganized', 'unhelpful', 'boring',
    'difficult', 'frustrating', 'disappointing', 'inadequate', 'lacking',
    'ineffective', 'unprofessional', 'rushed', 'incomplete',
  ];
  
  // Count positive and negative words
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  // Calculate sentiment score
  const total = positiveCount + negativeCount;
  let sentiment = 0;
  
  if (total > 0) {
    sentiment = (positiveCount - negativeCount) / Math.max(total, 5);
    sentiment = Math.max(-1, Math.min(1, sentiment));
  }
  
  // Extract basic themes based on keywords
  const themes: string[] = [];
  
  const themeKeywords: Record<string, string[]> = {
    'Trainer Quality': ['trainer', 'instructor', 'teacher', 'facilitator'],
    'Course Content': ['content', 'material', 'information', 'curriculum'],
    'Practical Skills': ['practical', 'hands-on', 'skills', 'practice', 'application'],
    'Facilities': ['facilities', 'equipment', 'room', 'venue', 'location'],
    'Support': ['support', 'help', 'assistance', 'guidance'],
    'Organization': ['organized', 'structured', 'schedule', 'timing'],
    'Assessment': ['assessment', 'exam', 'test', 'evaluation'],
    'Communication': ['communication', 'feedback', 'contact', 'response'],
  };
  
  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    const found = keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      return regex.test(text);
    });
    if (found) {
      themes.push(theme);
    }
  });
  
  // Calculate confidence based on keyword matches
  const totalWords = text.split(/\s+/).length;
  const keywordMatches = positiveCount + negativeCount + themes.length;
  const confidence = Math.min(0.6, keywordMatches / Math.max(totalWords, 10));
  
  return {
    sentiment,
    themes: themes.slice(0, 5),
    confidence,
  };
}

/**
 * Process all pending feedback for AI analysis
 * This should be run as a scheduled job (e.g., daily)
 */
export async function processAllPendingFeedback(): Promise<{
  processed: number;
  failed: number;
}> {
  try {
    console.log('🤖 Starting AI analysis of pending feedback...');
    
    // Get all feedback without sentiment analysis
    const pendingFeedback = await prisma.feedback.findMany({
      where: {
        comments: {
          not: null,
        },
        sentiment: null,
      },
      take: 100, // Process in batches to avoid overwhelming the API
      orderBy: {
        submittedAt: 'desc', // Process newest first
      },
    });
    
    console.log(`Found ${pendingFeedback.length} feedback items to analyze`);
    
    if (pendingFeedback.length === 0) {
      console.log('✅ No pending feedback to process');
      return { processed: 0, failed: 0 };
    }
    
    let processed = 0;
    let failed = 0;
    
    // Rate limiting: add delay between API calls
    const delayMs = 100; // 100ms delay between calls = max 10 requests/second
    
    for (const feedback of pendingFeedback) {
      try {
        const analysis = await analyzeFeedback(feedback.id, feedback.comments);
        
        await prisma.feedback.update({
          where: { id: feedback.id },
          data: {
            sentiment: analysis.sentiment,
            themes: analysis.themes,
          },
        });
        
        processed++;
        console.log(`✓ Analyzed feedback ${feedback.id} (${processed}/${pendingFeedback.length})`);
        
        // Rate limiting delay
        if (processed < pendingFeedback.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`✗ Failed to analyze feedback ${feedback.id}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ AI analysis complete: ${processed} processed, ${failed} failed`);
    console.log(`💰 Monthly cost so far: $${monthlyCost.toFixed(4)}`);
    
    return { processed, failed };
  } catch (error) {
    console.error('Error processing pending feedback:', error);
    return { processed: 0, failed: 0 };
  }
}

/**
 * Analyze a single feedback item immediately (e.g., when created)
 */
export async function analyzeSingleFeedback(feedbackId: string): Promise<void> {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });
    
    if (!feedback) {
      console.error('Feedback not found:', feedbackId);
      return;
    }
    
    const analysis = await analyzeFeedback(feedbackId, feedback.comments);
    
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        sentiment: analysis.sentiment,
        themes: analysis.themes,
      },
    });
    
    console.log(`✓ Analyzed feedback ${feedbackId} immediately`);
  } catch (error) {
    console.error(`Error analyzing feedback ${feedbackId}:`, error);
  }
}

/**
 * Detect sentiment trends over time periods
 */
export async function detectTrends(
  filters?: {
    type?: string;
    trainingProductId?: string;
    trainerId?: string;
  }
): Promise<{
  current: { average: number; count: number; period: string };
  previous: { average: number; count: number; period: string };
  change: number;
  direction: 'improving' | 'declining' | 'stable';
  alert?: string;
}> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const where: any = {
      sentiment: { not: null },
    };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.trainingProductId) {
      where.trainingProductId = filters.trainingProductId;
    }
    if (filters?.trainerId) {
      where.trainerId = filters.trainerId;
    }

    // Get recent period (last 30 days)
    const recentFeedback = await prisma.feedback.findMany({
      where: {
        ...where,
        submittedAt: { gte: thirtyDaysAgo },
      },
      select: { sentiment: true },
    });

    // Get previous period (30-60 days ago)
    const previousFeedback = await prisma.feedback.findMany({
      where: {
        ...where,
        submittedAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
      select: { sentiment: true },
    });

    const recentAvg = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.sentiment || 0), 0) / recentFeedback.length
      : 0;

    const previousAvg = previousFeedback.length > 0
      ? previousFeedback.reduce((sum, f) => sum + (f.sentiment || 0), 0) / previousFeedback.length
      : 0;

    const change = previousAvg !== 0 ? ((recentAvg - previousAvg) / Math.abs(previousAvg)) * 100 : 0;

    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    let alert: string | undefined;

    if (change > 10) {
      direction = 'improving';
    } else if (change < -10) {
      direction = 'declining';
      alert = `⚠️ Sentiment declining by ${Math.abs(change).toFixed(1)}% - immediate review recommended`;
    }

    // Additional alert for very negative sentiment
    if (recentAvg < -0.3) {
      alert = `🚨 Critical: Average sentiment is ${recentAvg.toFixed(2)} (very negative)`;
    }

    return {
      current: {
        average: Math.round(recentAvg * 100) / 100,
        count: recentFeedback.length,
        period: 'Last 30 days',
      },
      previous: {
        average: Math.round(previousAvg * 100) / 100,
        count: previousFeedback.length,
        period: '30-60 days ago',
      },
      change: Math.round(change * 10) / 10,
      direction,
      alert,
    };
  } catch (error) {
    console.error('Error detecting trends:', error);
    throw error;
  }
}

/**
 * Get emerging themes (themes that are becoming more common)
 */
export async function getEmergingThemes(days: number = 30): Promise<
  Array<{ theme: string; count: number; change: number }>
> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    // Get recent feedback
    const recentFeedback = await prisma.feedback.findMany({
      where: {
        submittedAt: { gte: periodStart },
        themes: { isEmpty: false },
      },
      select: { themes: true },
    });

    // Get previous period feedback
    const previousFeedback = await prisma.feedback.findMany({
      where: {
        submittedAt: {
          gte: previousPeriodStart,
          lt: periodStart,
        },
        themes: { isEmpty: false },
      },
      select: { themes: true },
    });

    // Count themes in each period
    const recentThemeCounts: Record<string, number> = {};
    const previousThemeCounts: Record<string, number> = {};

    recentFeedback.forEach((f) => {
      f.themes.forEach((theme) => {
        recentThemeCounts[theme] = (recentThemeCounts[theme] || 0) + 1;
      });
    });

    previousFeedback.forEach((f) => {
      f.themes.forEach((theme) => {
        previousThemeCounts[theme] = (previousThemeCounts[theme] || 0) + 1;
      });
    });

    // Calculate changes
    const themes = Object.entries(recentThemeCounts).map(([theme, recentCount]) => {
      const previousCount = previousThemeCounts[theme] || 0;
      const change = previousCount > 0
        ? ((recentCount - previousCount) / previousCount) * 100
        : recentCount > 0 ? 100 : 0;

      return {
        theme,
        count: recentCount,
        change: Math.round(change * 10) / 10,
      };
    });

    // Sort by change descending (most emerging first)
    return themes.sort((a, b) => b.change - a.change).slice(0, 10);
  } catch (error) {
    console.error('Error getting emerging themes:', error);
    return [];
  }
}
