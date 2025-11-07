import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MagnifyingGlass, User, Calendar } from '@phosphor-icons/react'
import { mockPolicies } from '@/lib/mockData'
import { formatDate, getStatusFromDate } from '@/lib/helpers'
import { StatusBadge } from '@/components/StatusBadge'
import { useState } from 'react'

export function PoliciesView() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredPolicies = mockPolicies.filter(policy =>
    policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.owner.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          
          return (
            <Card key={policy.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={policy.status === 'published' ? 'default' : 'secondary'}>
                        {policy.status}
                      </Badge>
                      <Badge variant="outline">v{policy.version}</Badge>
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
                      <span>{policy.owner}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Review: {formatDate(policy.reviewDate)}</span>
                    </div>
                  </div>
                  
                  {policy.linkedStandards.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Linked Standards ({policy.linkedStandards.length})
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {policy.linkedStandards.map((stdId) => (
                          <Badge key={stdId} variant="outline" className="text-xs">
                            {stdId.replace('std-', 'Standard ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
