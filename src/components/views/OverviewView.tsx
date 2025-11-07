import { StatCard } from '@/components/StatCard'
import { ComplianceMeter } from '@/components/ComplianceMeter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Warning, CheckCircle, FileText } from '@phosphor-icons/react'
import { formatDate, getDaysUntil } from '@/lib/helpers'
import { useDashboardMetrics, usePolicies } from '@/hooks/api'
import { StatGridSkeleton, CardSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'

export function OverviewView() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useDashboardMetrics()
  const { data: policiesData, isLoading: policiesLoading, error: policiesError, refetch: refetchPolicies } = usePolicies({ perPage: 100 })

  // Calculate policies due for review
  const policiesDueReview = (policiesData?.data || []).filter(p => {
    const days = getDaysUntil(p.reviewDate)
    return days <= 30 && days >= 0
  })

  const coveragePercentage = metrics ? Math.round((metrics.mappedStandards / metrics.totalStandards) * 100) : 0

  // Show loading state
  if (metricsLoading || policiesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Compliance Overview</h2>
          <p className="text-muted-foreground mt-1">Current compliance status and key metrics</p>
        </div>
        <StatGridSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  // Show error state
  if (metricsError || policiesError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Compliance Overview</h2>
          <p className="text-muted-foreground mt-1">Current compliance status and key metrics</p>
        </div>
        {metricsError && (
          <ErrorDisplay 
            error={metricsError} 
            title="Failed to load dashboard metrics"
            onRetry={refetchMetrics}
          />
        )}
        {policiesError && (
          <ErrorDisplay 
            error={policiesError} 
            title="Failed to load policies"
            onRetry={refetchPolicies}
          />
        )}
      </div>
    )
  }

  // No data
  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Compliance Overview</h2>
          <p className="text-muted-foreground mt-1">Current compliance status and key metrics</p>
        </div>
        <Alert>
          <AlertDescription>No dashboard data available</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Compliance Overview</h2>
        <p className="text-muted-foreground mt-1">Current compliance status and key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Overall Compliance"
          value={`${metrics.overallCompliance}%`}
          variant={metrics.overallCompliance >= 90 ? 'success' : metrics.overallCompliance >= 70 ? 'warning' : 'danger'}
          icon={<CheckCircle className="w-8 h-8" weight="duotone" />}
        />
        
        <StatCard
          title="Standards Mapped"
          value={`${metrics.mappedStandards}/${metrics.totalStandards}`}
          subtitle={`${coveragePercentage}% coverage`}
          variant={metrics.mappedStandards === metrics.totalStandards ? 'success' : 'default'}
          icon={<FileText className="w-8 h-8" weight="duotone" />}
        />
        
        <StatCard
          title="Policies Due Review"
          value={metrics.policiesDueReview}
          subtitle="Next 30 days"
          variant={metrics.policiesDueReview > 0 ? 'warning' : 'success'}
          icon={<Warning className="w-8 h-8" weight="duotone" />}
        />
        
        <StatCard
          title="Incomplete Products"
          value={metrics.incompleteProducts}
          subtitle="Missing documentation"
          variant={metrics.incompleteProducts > 0 ? 'danger' : 'success'}
          icon={<Warning className="w-8 h-8" weight="duotone" />}
        />
      </div>

      {metrics.policiesDueReview > 0 && (
        <Alert className="border-accent/40 bg-accent/5">
          <Warning className="h-4 w-4" weight="fill" />
          <AlertDescription>
            {metrics.policiesDueReview} {metrics.policiesDueReview === 1 ? 'policy' : 'policies'} require review within the next 30 days. Ensure documentation is current before upcoming audits.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Standards Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComplianceMeter 
              percentage={coveragePercentage} 
              label="Overall Coverage"
              size="lg"
            />
            <div className="pt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mapped Standards</span>
                <span className="font-medium">{metrics.mappedStandards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unmapped Standards</span>
                <span className="font-medium text-destructive">{metrics.totalStandards - metrics.mappedStandards}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Policies Due for Review</CardTitle>
          </CardHeader>
          <CardContent>
            {policiesDueReview.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No policies due for review in the next 30 days.</p>
            ) : (
              <div className="space-y-3">
                {policiesDueReview.map((policy) => {
                  const days = getDaysUntil(policy.reviewDate)
                  const versionNumber = policy.version?.versionNumber || '1.0'
                  return (
                    <div key={policy.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{policy.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due {formatDate(policy.reviewDate)} ({days} days)
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground font-medium ml-2 whitespace-nowrap">
                        v{versionNumber}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
