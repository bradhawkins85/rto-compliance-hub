import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState, useMemo } from 'react'
import { useStandards, useStandardMappings } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'
import type { Standard } from '@/lib/api/types'

// Helper to determine status from mapping counts
function getStatusFromMappings(mappedPolicies: number, mappedEvidence: number): 'compliant' | 'incomplete' | 'due' {
  const total = mappedPolicies + mappedEvidence
  if (total === 0) return 'incomplete'
  if (total < 3) return 'due'
  return 'compliant'
}

export function StandardsView() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: standardsData, isLoading, error, refetch } = useStandards({ perPage: 100 })

  const standards = standardsData?.data || []

  const filteredStandards = useMemo(() => {
    if (!searchQuery) return standards
    const query = searchQuery.toLowerCase()
    return standards.filter(standard =>
      standard.title.toLowerCase().includes(query) ||
      (standard.clause && standard.clause.toLowerCase().includes(query)) ||
      (standard.code && standard.code.toLowerCase().includes(query))
    )
  }, [standards, searchQuery])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">RTO Standards</h2>
            <p className="text-muted-foreground mt-1">Compliance mapping to standards and clauses</p>
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="standards-search"
            placeholder="Search standards by clause or title..."
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">RTO Standards</h2>
            <p className="text-muted-foreground mt-1">Compliance mapping to standards and clauses</p>
          </div>
        </div>
        <ErrorDisplay 
          error={error} 
          title="Failed to load standards"
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">RTO Standards</h2>
          <p className="text-muted-foreground mt-1">Compliance mapping to standards and clauses</p>
        </div>
      </div>

      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="standards-search"
          placeholder="Search standards by clause or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filteredStandards.map((standard) => {
          // For now, we don't have mapping counts directly, so we'll need to fetch them
          // or modify the backend to include them. For now, use placeholder values
          const mappedPolicies = 0
          const mappedEvidence = 0
          const status = getStatusFromMappings(mappedPolicies, mappedEvidence)

          return (
            <Card key={standard.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
                        {standard.clause || standard.code}
                      </span>
                      <StatusBadge status={status} />
                    </div>
                    <CardTitle className="text-lg">{standard.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Policies</p>
                    <p className="font-semibold text-lg">{mappedPolicies}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Evidence</p>
                    <p className="font-semibold text-lg">{mappedEvidence}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Coverage</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (mappedPolicies + mappedEvidence) * 10)}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium whitespace-nowrap">
                        {mappedPolicies + mappedEvidence} items
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredStandards.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No standards found matching "{searchQuery}"</p>
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
