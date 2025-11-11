import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/StatusBadge'
import { MagnifyingGlass, Briefcase, CheckCircle } from '@phosphor-icons/react'
import { formatDate } from '@/lib/helpers'
import { useState, useMemo } from 'react'
import { useUsers } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'
import { FilterBar, type ActiveFilter } from '@/components/ui/filter-bar'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { SavedFilters } from '@/components/ui/saved-filters'
import { SortableHeader } from '@/components/ui/sortable-header'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { useFilterPresets } from '@/hooks/useFilterPresets'

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
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([])
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [credentialStatusFilter, setCredentialStatusFilter] = useState<string>('all')
  
  const debouncedSearch = useDebounce(searchQuery, 300)
  const { data: usersData, isLoading, error, refetch } = useUsers({ perPage: 100, includeOnboarding: 'true' })

  const staff = usersData?.data || []

  // Filter presets
  const { presets, savePreset, deletePreset } = useFilterPresets('staff')

  // Get unique departments and roles
  const { departments, roles } = useMemo(() => {
    const depts = new Set<string>()
    const roleSet = new Set<string>()
    
    staff.forEach(member => {
      if (member.department) depts.add(member.department)
      member.roles.forEach(role => roleSet.add(role))
    })
    
    return {
      departments: Array.from(depts).sort(),
      roles: Array.from(roleSet).sort(),
    }
  }, [staff])

  const departmentOptions: MultiSelectOption[] = departments.map(d => ({ label: d, value: d }))
  const roleOptions: MultiSelectOption[] = roles.map(r => ({ label: r, value: r }))

  // Apply filters
  const filteredStaff = useMemo(() => {
    let filtered = staff

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        (member.department && member.department.toLowerCase().includes(query)) ||
        member.roles.some(role => role.toLowerCase().includes(query))
      )
    }

    // Department filter
    if (departmentFilter.length > 0) {
      filtered = filtered.filter(member => 
        member.department && departmentFilter.includes(member.department)
      )
    }

    // Role filter
    if (roleFilter.length > 0) {
      filtered = filtered.filter(member =>
        member.roles.some(role => roleFilter.includes(role))
      )
    }

    // Credential status filter (simplified, would need actual credential data)
    if (credentialStatusFilter !== 'all') {
      // This is a placeholder - actual implementation would check credential expiry
      // For now, we'll just show all staff
    }

    return filtered
  }, [staff, debouncedSearch, departmentFilter, roleFilter, credentialStatusFilter])

  // Sorting
  const { sortedData, sortConfig, handleSort } = useSort(filteredStaff, null, 'asc')

  // Active filters
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = []
    
    if (departmentFilter.length > 0) {
      filters.push({ 
        id: 'department', 
        label: 'Department', 
        value: departmentFilter.join(', ') 
      })
    }
    if (roleFilter.length > 0) {
      filters.push({ 
        id: 'role', 
        label: 'Role', 
        value: roleFilter.join(', ') 
      })
    }
    if (credentialStatusFilter !== 'all') {
      filters.push({ 
        id: 'credentialStatus', 
        label: 'Credential Status', 
        value: credentialStatusFilter 
      })
    }
    
    return filters
  }, [departmentFilter, roleFilter, credentialStatusFilter])

  // Handle filter removal
  const handleRemoveFilter = (id: string) => {
    switch (id) {
      case 'department':
        setDepartmentFilter([])
        break
      case 'role':
        setRoleFilter([])
        break
      case 'credentialStatus':
        setCredentialStatusFilter('all')
        break
    }
  }

  // Handle clear all
  const handleClearAll = () => {
    setSearchQuery('')
    setDepartmentFilter([])
    setRoleFilter([])
    setCredentialStatusFilter('all')
  }

  // Handle save preset
  const handleSavePreset = (name: string) => {
    savePreset(name, {
      searchQuery,
      departmentFilter,
      roleFilter,
      credentialStatusFilter,
    })
  }

  // Handle load preset
  const handleLoadPreset = (filters: Record<string, any>) => {
    setSearchQuery(filters.searchQuery || '')
    setDepartmentFilter(filters.departmentFilter || [])
    setRoleFilter(filters.roleFilter || [])
    setCredentialStatusFilter(filters.credentialStatusFilter || 'all')
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Professional Development & Staff</h2>
          <p className="text-muted-foreground mt-1">Staff credentials and PD compliance tracking</p>
        </div>
        <SavedFilters
          presets={presets}
          currentFilters={{ searchQuery, departmentFilter, roleFilter, credentialStatusFilter }}
          onLoadPreset={handleLoadPreset}
          onSavePreset={handleSavePreset}
          onDeletePreset={deletePreset}
        />
      </div>

      <FilterBar
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAll}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="staff-search"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <MultiSelect
            options={departmentOptions}
            selected={departmentFilter}
            onChange={setDepartmentFilter}
            placeholder="Filter by department"
          />

          <MultiSelect
            options={roleOptions}
            selected={roleFilter}
            onChange={setRoleFilter}
            placeholder="Filter by role"
          />

          <Select value={credentialStatusFilter} onValueChange={setCredentialStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Credential status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Credentials</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="due">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        <SortableHeader
          label="Name"
          field="name"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
        <SortableHeader
          label="Department"
          field="department"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
      </div>

      <div className="grid gap-4">
        {sortedData.map((member) => {
          // TODO: Basic user list API doesn't include credentials
          // Options: 1) Enhance backend to include credentials in list response
          //          2) Fetch individual users with useUser(id) when needed
          //          3) Add backend endpoint for bulk user details with credentials
          const credentials: any[] = []
          const pdStatus = getPDStatus(credentials)
          
          // Get onboarding status if available
          const onboarding = (member as any).onboarding
          const hasOnboarding = onboarding?.hasOnboarding || false
          const onboardingProgress = onboarding?.progress || 100

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={pdStatus} />
                      <Badge variant="outline">{member.department}</Badge>
                      {hasOnboarding && onboardingProgress < 100 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Onboarding
                        </Badge>
                      )}
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
                {hasOnboarding && onboardingProgress < 100 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Onboarding Progress</span>
                      <span className="font-medium">{onboardingProgress}%</span>
                    </div>
                    <Progress value={onboardingProgress} className="h-2" />
                  </div>
                )}
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

      {sortedData.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            {activeFilters.length > 0 || searchQuery ? (
              <>
                <p className="text-sm mb-2">No staff members found matching your filters</p>
                <button
                  onClick={handleClearAll}
                  className="text-primary text-sm hover:underline"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <p className="text-sm">No staff members available</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
