import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendUp, 
  TrendDown, 
  ChartBar,
  Sparkle,
} from '@phosphor-icons/react';

interface SentimentVisualizationProps {
  sentiment: number; // -1 to 1
  confidence?: number; // 0 to 1
  aspects?: {
    trainer?: number;
    content?: number;
    facilities?: number;
  };
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    percentage: number | null;
  };
}

export function SentimentVisualization({
  sentiment,
  confidence,
  aspects,
  trend,
}: SentimentVisualizationProps) {
  // Convert sentiment to percentage for display
  const sentimentPercent = ((sentiment + 1) / 2) * 100;
  
  // Determine sentiment category
  let sentimentCategory = 'Neutral';
  let sentimentColor = 'text-gray-600';
  let bgColor = 'bg-gray-200';
  
  if (sentiment > 0.3) {
    sentimentCategory = 'Positive';
    sentimentColor = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-200 dark:bg-green-900';
  } else if (sentiment < -0.3) {
    sentimentCategory = 'Negative';
    sentimentColor = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-200 dark:bg-red-900';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkle className="w-4 h-4" />
          AI Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Sentiment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Sentiment</span>
            <Badge variant="outline" className={sentimentColor}>
              {sentimentCategory}
            </Badge>
          </div>
          
          {/* Sentiment Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${bgColor} transition-all duration-500`}
              style={{ width: `${sentimentPercent}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Negative (-1.0)</span>
            <span className="font-medium">{sentiment.toFixed(2)}</span>
            <span>Positive (+1.0)</span>
          </div>
        </div>

        {/* Confidence Score */}
        {confidence !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <span className="text-sm text-muted-foreground">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="relative h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Trend Indicator */}
        {trend && trend.direction && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              {trend.direction === 'improving' ? (
                <TrendUp className="w-4 h-4 text-green-500" />
              ) : trend.direction === 'declining' ? (
                <TrendDown className="w-4 h-4 text-red-500" />
              ) : (
                <ChartBar className="w-4 h-4 text-gray-500" />
              )}
              <span className="text-sm capitalize">
                Trend: {trend.direction}
                {trend.percentage !== null && (
                  <span className="ml-1 text-muted-foreground">
                    ({trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Aspect-based Sentiment */}
        {aspects && Object.keys(aspects).length > 0 && (
          <div className="pt-2 border-t space-y-3">
            <span className="text-sm font-medium">Aspect Breakdown</span>
            
            {aspects.trainer !== undefined && (
              <AspectBar
                label="Trainer"
                value={aspects.trainer}
              />
            )}
            
            {aspects.content !== undefined && (
              <AspectBar
                label="Content"
                value={aspects.content}
              />
            )}
            
            {aspects.facilities !== undefined && (
              <AspectBar
                label="Facilities"
                value={aspects.facilities}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AspectBarProps {
  label: string;
  value: number; // -1 to 1
}

function AspectBar({ label, value }: AspectBarProps) {
  const percent = ((value + 1) / 2) * 100;
  
  let color = 'bg-gray-400';
  if (value > 0.3) {
    color = 'bg-green-500';
  } else if (value < -0.3) {
    color = 'bg-red-500';
  }
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{value.toFixed(2)}</span>
      </div>
      <div className="relative h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
