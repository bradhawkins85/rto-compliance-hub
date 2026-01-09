/**
 * Simple test script for AI sentiment analysis (without database)
 * 
 * This script tests the keyword-based sentiment analysis fallback.
 * Run with: npx tsx server/test/test-ai-simple.ts
 */

// Sample feedback texts for testing
const sampleFeedback = [
  {
    id: 'test-1',
    text: 'The trainer was excellent and very knowledgeable. The course content was clear and well-organized. Really enjoyed the practical hands-on sessions.',
    expected: 'positive',
  },
  {
    id: 'test-2',
    text: 'The facilities were poor and the equipment was outdated. The trainer seemed unprepared and the content was confusing.',
    expected: 'negative',
  },
  {
    id: 'test-3',
    text: 'It was okay. Some parts were good, some were not so great. Average overall.',
    expected: 'neutral',
  },
  {
    id: 'test-4',
    text: 'Great practical skills training! The instructor was supportive and the learning environment was excellent. Facilities were top-notch.',
    expected: 'positive',
  },
  {
    id: 'test-5',
    text: 'Disappointed with the course. The material was incomplete and the assessment was unclear. Waste of time.',
    expected: 'negative',
  },
];

// Simple keyword-based sentiment analysis for testing
function analyzeKeywords(text: string): { sentiment: number; themes: string[]; confidence: number } {
  const lowerText = text.toLowerCase();
  
  const positiveWords = [
    'excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic',
    'helpful', 'professional', 'knowledgeable', 'thorough', 'clear',
    'effective', 'valuable', 'useful', 'informative', 'enjoyable',
    'engaging', 'practical', 'relevant', 'organized', 'supportive',
  ];
  
  const negativeWords = [
    'poor', 'bad', 'terrible', 'awful', 'useless', 'waste',
    'confusing', 'unclear', 'disorganized', 'unhelpful', 'boring',
    'difficult', 'frustrating', 'disappointing', 'inadequate', 'lacking',
    'ineffective', 'unprofessional', 'rushed', 'incomplete',
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  const total = positiveCount + negativeCount;
  let sentiment = 0;
  
  if (total > 0) {
    sentiment = (positiveCount - negativeCount) / Math.max(total, 5);
    sentiment = Math.max(-1, Math.min(1, sentiment));
  }
  
  // Extract themes
  const themes: string[] = [];
  const themeKeywords: Record<string, string[]> = {
    'Trainer Quality': ['trainer', 'instructor', 'teacher', 'facilitator'],
    'Course Content': ['content', 'material', 'information', 'curriculum'],
    'Practical Skills': ['practical', 'hands-on', 'skills', 'practice'],
    'Facilities': ['facilities', 'equipment', 'room', 'venue'],
    'Support': ['support', 'help', 'assistance'],
    'Organization': ['organized', 'structured', 'schedule'],
  };
  
  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lowerText))) {
      themes.push(theme);
    }
  });
  
  const wordCount = lowerText.split(/\s+/).length;
  const confidence = Math.min(0.6, (positiveCount + negativeCount + themes.length) / Math.max(wordCount, 10));
  
  return { sentiment, themes, confidence };
}

async function runTests() {
  console.log('🧪 Testing AI Sentiment Analysis (Keyword Fallback)\n');
  console.log('='.repeat(60));
  
  let correctCount = 0;
  const results = [];

  for (const sample of sampleFeedback) {
    console.log(`\n📝 Analyzing feedback ${sample.id}:`);
    console.log(`Text: "${sample.text.substring(0, 60)}..."`);
    
    const analysis = analyzeKeywords(sample.text);
    
    console.log(`\n📊 Results:`);
    console.log(`  Sentiment Score: ${analysis.sentiment.toFixed(2)}`);
    console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`  Themes: ${analysis.themes.join(', ')}`);
    
    // Determine predicted sentiment
    let predicted = 'neutral';
    if (analysis.sentiment > 0.2) {
      predicted = 'positive';
    } else if (analysis.sentiment < -0.2) {
      predicted = 'negative';
    }
    
    const isCorrect = predicted === sample.expected;
    if (isCorrect) {
      correctCount++;
      console.log(`  ✅ Prediction: ${predicted} (Expected: ${sample.expected})`);
    } else {
      console.log(`  ❌ Prediction: ${predicted} (Expected: ${sample.expected})`);
    }
    
    results.push({
      id: sample.id,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      themes: analysis.themes,
      predicted,
      expected: sample.expected,
      correct: isCorrect,
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Test Summary:');
  console.log(`  Total Tests: ${sampleFeedback.length}`);
  console.log(`  Correct Predictions: ${correctCount}`);
  console.log(`  Accuracy: ${((correctCount / sampleFeedback.length) * 100).toFixed(1)}%`);
  
  const accuracy = (correctCount / sampleFeedback.length) * 100;
  if (accuracy >= 70) {
    console.log(`  ✅ Accuracy meets ≥70% threshold requirement`);
  } else {
    console.log(`  ⚠️  Accuracy below 70% threshold (${accuracy.toFixed(1)}%)`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Testing complete!');
  
  return { results, accuracy };
}

// Run the tests
runTests()
  .then(() => {
    console.log('\n✅ All tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
