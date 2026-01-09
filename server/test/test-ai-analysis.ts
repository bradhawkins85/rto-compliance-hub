/**
 * Test script for AI sentiment analysis
 * 
 * This script tests the AI analysis functionality with sample feedback data.
 * Run with: npx tsx server/test/test-ai-analysis.ts
 */

import { analyzeFeedback, getCostStats, detectTrends, getEmergingThemes } from '../src/services/aiAnalysis';

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

async function runTests() {
  console.log('🧪 Testing AI Sentiment Analysis\n');
  console.log('='.repeat(60));
  
  let correctCount = 0;
  const results = [];

  for (const sample of sampleFeedback) {
    console.log(`\n📝 Analyzing feedback ${sample.id}:`);
    console.log(`Text: "${sample.text.substring(0, 60)}..."`);
    
    try {
      const analysis = await analyzeFeedback(sample.id, sample.text);
      
      console.log(`\n📊 Results:`);
      console.log(`  Sentiment Score: ${analysis.sentiment.toFixed(2)}`);
      console.log(`  Confidence: ${((analysis.confidence || 0) * 100).toFixed(1)}%`);
      console.log(`  Themes: ${analysis.themes.join(', ')}`);
      
      if (analysis.aspects) {
        console.log(`  Aspect Scores:`);
        if (analysis.aspects.trainer !== undefined) {
          console.log(`    - Trainer: ${analysis.aspects.trainer.toFixed(2)}`);
        }
        if (analysis.aspects.content !== undefined) {
          console.log(`    - Content: ${analysis.aspects.content.toFixed(2)}`);
        }
        if (analysis.aspects.facilities !== undefined) {
          console.log(`    - Facilities: ${analysis.aspects.facilities.toFixed(2)}`);
        }
      }
      
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
      
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      results.push({
        id: sample.id,
        error: String(error),
        correct: false,
      });
    }
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
  
  // Cost stats
  console.log('\n💰 Cost Statistics:');
  const stats = getCostStats();
  console.log(`  Total Tokens: ${stats.totalTokens}`);
  console.log(`  Estimated Cost: $${stats.estimatedCost.toFixed(6)}`);
  console.log(`  Monthly Limit: $${process.env.AI_COST_LIMIT_MONTHLY || '100'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Testing complete!');
  
  return { results, accuracy, stats };
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { runTests };
