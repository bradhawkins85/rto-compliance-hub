import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'
import { MagnifyingGlass, Briefcase } from '@phosphor-icons/react'
import { mockStaff } from '@/lib/mockData'
import { formatDate } from '@/lib/helpers'
import { useState } from 'react'

export function StaffView() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredStaff = mockStaff.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        {filteredStaff.map((staff) => (
          <Card key={staff.id} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={staff.pdStatus} />
                    <Badge variant="outline">{staff.department}</Badge>
                  </div>
                  <CardTitle className="text-lg">{staff.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                    <Briefcase className="w-4 h-4" />
                    <span>{staff.role}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {staff.credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No credentials recorded</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Credentials ({staff.credentials.length})
                  </p>
                  <div className="space-y-2">
                    {staff.credentials.map((credential) => (
                      <div
                        key={credential.id}
                        className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{credential.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires: {formatDate(credential.expiryDate)}
                          </p>
                        </div>
                        <StatusBadge status={credential.status} showIcon={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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
