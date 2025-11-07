import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'
import { MagnifyingGlass, Briefcase } from '@phosphor-icons/react'
import { formatDate } from '@/lib/helpers'
import { useState, useMemo } from 'react'
import { useUsers } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'

// Helper to determine PD status from credentials
function getPDStatus(credentials: any[]): 'compliant' | 'due' | 'overdue' {
  if (!credentials || credentials.length === 0) return 'compliant'
  
  const now = new Date()
  const hasOverdue = credentials.some(c => {
    if (!c.expiryDate) return false
    return new Date(c.expiryDate) < now
  })
  
  if (hasOverdue) return 'overdue'
  
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const hasDue = credentials.some(c => {
    if (!c.expiryDate) return false
    const expiryDate = new Date(c.expiryDate)
    return expiryDate >= now && expiryDate <= thirtyDaysFromNow
  })
  
  return hasDue ? 'due' : 'compliant'
}

// Helper to get credential status
function getCredentialStatus(expiryDate: string | null | undefined): 'compliant' | 'due' | 'overdue' {
  if (!expiryDate) return 'compliant'
  
  const now = new Date()
  const expiry = new Date(expiryDate)
  
  if (expiry < now) return 'overdue'
  
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (expiry >= now && expiry <= thirtyDaysFromNow) return 'due'
  
  return 'compliant'
}

export function StaffView() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: usersData, isLoading, error, refetch } = useUsers({ perPage: 100 })

  const staff = usersData?.data || []

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staff
    const query = searchQuery.toLowerCase()
    return staff.filter(member =>
      member.name.toLowerCase().includes(query) ||
      (member.department && member.department.toLowerCase().includes(query))
    )
  }, [staff, searchQuery])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Professional Development & Staff</h2>
          <p className="text-muted-foreground mt-1">Staff credentials and PD compliance tracking</p>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="staff-search"
            placeholder="Search by name, role, or department..."
            disabled
            className="pl-9"
          />
        </div>
        <ListSkeleton count={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Professional Development & Staff</h2>
          <p className="text-muted-foreground mt-1">Staff credentials and PD compliance tracking</p>
        </div>
        <ErrorDisplay 
          error={error} 
          title="Failed to load staff"
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Professional Development & Staff</h2>
        <p className="text-muted-foreground mt-1">Staff credentials and PD compliance tracking</p>
      </div>

      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="staff-search"
          placeholder="Search by name, role, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filteredStaff.map((member) => {
          // TODO: Basic user list API doesn't include credentials
          // Options: 1) Enhance backend to include credentials in list response
          //          2) Fetch individual users with useUser(id) when needed
          //          3) Add backend endpoint for bulk user details with credentials
          const credentials: any[] = []
          const pdStatus = getPDStatus(credentials)

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={pdStatus} />
                      <Badge variant="outline">{member.department}</Badge>
                    </div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                      <Briefcase className="w-4 h-4" />
                      <span>{member.roles.join(', ') || 'No role assigned'}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {credentials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No credentials recorded</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Credentials ({credentials.length})
                    </p>
                    <div className="space-y-2">
                      {credentials.map((credential) => (
                        <div
                          key={credential.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{credential.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {credential.expiryDate ? formatDate(credential.expiryDate) : 'No expiry'}
                            </p>
                          </div>
                          <StatusBadge status={getCredentialStatus(credential.expiryDate)} showIcon={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredStaff.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No staff members found matching "{searchQuery}"</p>
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
