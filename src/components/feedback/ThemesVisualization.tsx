import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartBarHorizontal } from '@phosphor-icons/react';

interface ThemesVisualizationProps {
  themes: Array<{ theme: string; count: number }>;
  maxDisplay?: number;
}

export function ThemesVisualization({
  themes,
  maxDisplay = 5,
}: ThemesVisualizationProps) {
  // Get top themes
  const topThemes = themes.slice(0, maxDisplay);
  const maxCount = topThemes[0]?.count || 1;

  if (topThemes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ChartBarHorizontal className="w-4 h-4" />
            Top Themes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No themes detected yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ChartBarHorizontal className="w-4 h-4" />
          Top Themes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topThemes.map((item, index) => {
          const percentage = (item.count / maxCount) * 100;
          
          // Color scheme based on position
          let barColor = 'bg-blue-500';
          if (index === 0) {
            barColor = 'bg-purple-500';
          } else if (index === 1) {
            barColor = 'bg-indigo-500';
          }

          return (
            <div key={item.theme} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <span className="text-sm font-medium">{item.theme}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.count} {item.count === 1 ? 'mention' : 'mentions'}
                </span>
              </div>
              
              <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
