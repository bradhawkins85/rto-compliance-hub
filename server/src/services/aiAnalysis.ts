import { PrismaClient } from '@prisma/client';

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
      };
    }

    // Check if OpenAI API key is configured
    const openAIKey = process.env.OPENAI_API_KEY;

    if (openAIKey && openAIKey !== 'your-api-key-here') {
      // Use OpenAI for advanced analysis
      return await analyzeWithOpenAI(comments, openAIKey);
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
    };
  }
}

/**
 * Analyze feedback using OpenAI API
 */
async function analyzeWithOpenAI(
  comments: string,
  apiKey: string
): Promise<FeedbackAnalysis> {
  try {
    // Try to dynamically import OpenAI
    // This will fail gracefully if the package is not installed
    const openaiModule = await eval('import("openai")').catch(() => null);
    
    if (!openaiModule) {
      console.warn('OpenAI package not installed, falling back to keyword analysis');
      return analyzeWithKeywords(comments);
    }

    const OpenAI = openaiModule.default;
    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes training feedback. Analyze the sentiment (from -1 to 1, where -1 is very negative, 0 is neutral, and 1 is very positive) and extract 3-5 key themes or topics mentioned. Return the response in JSON format: {"sentiment": number, "themes": string[]}`,
        },
        {
          role: 'user',
          content: comments,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      sentiment: Math.max(-1, Math.min(1, result.sentiment || 0)),
      themes: Array.isArray(result.themes) ? result.themes.slice(0, 5) : [],
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
  
  return {
    sentiment,
    themes: themes.slice(0, 5),
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
      take: 100, // Process in batches
    });
    
    console.log(`Found ${pendingFeedback.length} feedback items to analyze`);
    
    let processed = 0;
    let failed = 0;
    
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
        console.log(`✓ Analyzed feedback ${feedback.id}`);
      } catch (error) {
        console.error(`✗ Failed to analyze feedback ${feedback.id}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ AI analysis complete: ${processed} processed, ${failed} failed`);
    
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
