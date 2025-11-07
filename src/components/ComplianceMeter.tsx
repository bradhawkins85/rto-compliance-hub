import { cn } from '@/lib/utils'

interface ComplianceMeterProps {
  percentage: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ComplianceMeter({ percentage, label, size = 'md' }: ComplianceMeterProps) {
  const getColor = (pct: number) => {
    if (pct >= 90) return 'bg-success'
    if (pct >= 70) return 'bg-accent'
    return 'bg-destructive'
  }

  const heights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full transition-all duration-500 ease-out', getColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
