import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CurrencyCircleDollar, Warning, CheckCircle } from '@phosphor-icons/react';

interface AICostMonitorProps {
  totalTokens: number;
  estimatedCost: number;
  monthlyLimit: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'limit_reached';
}

export function AICostMonitor({
  totalTokens,
  estimatedCost,
  monthlyLimit,
  percentUsed,
  status,
}: AICostMonitorProps) {
  let statusColor = 'text-green-600 dark:text-green-400';
  let statusBg = 'bg-green-100 dark:bg-green-950';
  let barColor = 'bg-green-500';
  let statusIcon = <CheckCircle className="w-4 h-4" weight="fill" />;
  let statusText = 'Normal';

  if (status === 'warning') {
    statusColor = 'text-yellow-600 dark:text-yellow-400';
    statusBg = 'bg-yellow-100 dark:bg-yellow-950';
    barColor = 'bg-yellow-500';
    statusIcon = <Warning className="w-4 h-4" weight="fill" />;
    statusText = 'Warning';
  } else if (status === 'limit_reached') {
    statusColor = 'text-red-600 dark:text-red-400';
    statusBg = 'bg-red-100 dark:bg-red-950';
    barColor = 'bg-red-500';
    statusIcon = <Warning className="w-4 h-4" weight="fill" />;
    statusText = 'Limit Reached';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CurrencyCircleDollar className="w-4 h-4" />
          AI Cost Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="outline" className={`${statusColor} ${statusBg} border-current`}>
            <span className="flex items-center gap-1">
              {statusIcon}
              {statusText}
            </span>
          </Badge>
        </div>

        {/* Cost Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Cost</span>
            <span className="text-sm text-muted-foreground">
              ${estimatedCost.toFixed(4)} / ${monthlyLimit.toFixed(2)}
            </span>
          </div>
          
          <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="font-medium">{percentUsed.toFixed(1)}% used</span>
            <span>100%</span>
          </div>
        </div>

        {/* Token Usage */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Tokens</span>
            <span className="text-xs font-medium">
              {totalTokens.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Avg Cost per 1K tokens</span>
            <span className="text-xs font-medium">
              ${totalTokens > 0 ? ((estimatedCost / totalTokens) * 1000).toFixed(4) : '0.0000'}
            </span>
          </div>
        </div>

        {/* Warning Message */}
        {status === 'warning' && (
          <div className={`p-2 rounded-md ${statusBg} text-xs ${statusColor}`}>
            ⚠️ Approaching monthly limit. Consider reviewing API usage.
          </div>
        )}
        
        {status === 'limit_reached' && (
          <div className={`p-2 rounded-md ${statusBg} text-xs ${statusColor}`}>
            🚫 Monthly limit reached. Using keyword fallback for new analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
