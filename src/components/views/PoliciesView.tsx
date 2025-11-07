import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MagnifyingGlass, User, Calendar } from '@phosphor-icons/react'
import { formatDate, getStatusFromDate } from '@/lib/helpers'
import { StatusBadge } from '@/components/StatusBadge'
import { useState, useMemo } from 'react'
import { usePolicies } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'

export function PoliciesView() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: policiesData, isLoading, error, refetch } = usePolicies({ perPage: 100 })

  const policies = policiesData?.data || []

  const filteredPolicies = useMemo(() => {
    if (!searchQuery) return policies
    const query = searchQuery.toLowerCase()
    return policies.filter(policy =>
      policy.title.toLowerCase().includes(query) ||
      (policy.owner?.name && policy.owner.name.toLowerCase().includes(query))
    )
  }, [policies, searchQuery])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Policy Library</h2>
          <p className="text-muted-foreground mt-1">Governance documentation and compliance policies</p>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="policies-search"
            placeholder="Search policies by title or owner..."
            disabled
            className="pl-9"
          />
        </div>
        <ListSkeleton count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Policy Library</h2>
          <p className="text-muted-foreground mt-1">Governance documentation and compliance policies</p>
        </div>
        <ErrorDisplay 
          error={error} 
          title="Failed to load policies"
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Policy Library</h2>
        <p className="text-muted-foreground mt-1">Governance documentation and compliance policies</p>
      </div>

      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="policies-search"
          placeholder="Search policies by title or owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filteredPolicies.map((policy) => {
          const reviewStatus = getStatusFromDate(policy.reviewDate)
          const versionNumber = policy.version?.versionNumber || '1.0'
          
          return (
            <Card key={policy.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={policy.status === 'Published' ? 'default' : 'secondary'}>
                        {policy.status}
                      </Badge>
                      <Badge variant="outline">v{versionNumber}</Badge>
                      <StatusBadge status={reviewStatus} />
                    </div>
                    <CardTitle className="text-lg">{policy.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{policy.owner?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Review: {formatDate(policy.reviewDate)}</span>
                    </div>
                  </div>
                  
                  {/* Note: linkedStandards not available in current API response */}
                  {/* Will need to add this to backend or fetch separately */}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredPolicies.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No policies found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Clear search
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
