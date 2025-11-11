import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MagnifyingGlass, User, Calendar } from '@phosphor-icons/react'
import { formatDate, getStatusFromDate } from '@/lib/helpers'
import { StatusBadge } from '@/components/StatusBadge'
import { useState, useMemo } from 'react'
import { usePolicies } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'
import { FilterBar, type ActiveFilter } from '@/components/ui/filter-bar'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { SavedFilters } from '@/components/ui/saved-filters'
import { SortableHeader } from '@/components/ui/sortable-header'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { useFilterPresets } from '@/hooks/useFilterPresets'
import { DateRange } from 'react-day-picker'

export function PoliciesView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [reviewDateRange, setReviewDateRange] = useState<DateRange | undefined>()
  
  const debouncedSearch = useDebounce(searchQuery, 300)
  const { data: policiesData, isLoading, error, refetch } = usePolicies({ perPage: 100 })

  const policies = policiesData?.data || []

  // Filter presets
  const { presets, savePreset, deletePreset } = useFilterPresets('policies')

  // Get unique owners for filter
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>()
    policies.forEach(policy => {
      if (policy.owner?.name) {
        owners.add(policy.owner.name)
      }
    })
    return Array.from(owners).sort()
  }, [policies])

  // Apply all filters
  const filteredPolicies = useMemo(() => {
    let filtered = policies

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter(policy =>
        policy.title.toLowerCase().includes(query) ||
        (policy.owner?.name && policy.owner.name.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(policy => policy.status === statusFilter)
    }

    // Owner filter
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(policy => policy.owner?.name === ownerFilter)
    }

    // Review date range filter
    if (reviewDateRange?.from) {
      filtered = filtered.filter(policy => {
        const reviewDate = new Date(policy.reviewDate)
        if (reviewDateRange.to) {
          return reviewDate >= reviewDateRange.from! && reviewDate <= reviewDateRange.to
        }
        return reviewDate >= reviewDateRange.from!
      })
    }

    return filtered
  }, [policies, debouncedSearch, statusFilter, ownerFilter, reviewDateRange])

  // Sorting
  const { sortedData, sortConfig, handleSort } = useSort(filteredPolicies, null, 'asc')

  // Build active filters list
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = []
    
    if (statusFilter !== 'all') {
      filters.push({ id: 'status', label: 'Status', value: statusFilter })
    }
    if (ownerFilter !== 'all') {
      filters.push({ id: 'owner', label: 'Owner', value: ownerFilter })
    }
    if (reviewDateRange?.from) {
      const value = reviewDateRange.to
        ? `${formatDate(reviewDateRange.from)} - ${formatDate(reviewDateRange.to)}`
        : `From ${formatDate(reviewDateRange.from)}`
      filters.push({ id: 'reviewDate', label: 'Review Date', value })
    }
    
    return filters
  }, [statusFilter, ownerFilter, reviewDateRange])

  // Handle filter removal
  const handleRemoveFilter = (id: string) => {
    switch (id) {
      case 'status':
        setStatusFilter('all')
        break
      case 'owner':
        setOwnerFilter('all')
        break
      case 'reviewDate':
        setReviewDateRange(undefined)
        break
    }
  }

  // Handle clear all filters
  const handleClearAll = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setOwnerFilter('all')
    setReviewDateRange(undefined)
  }

  // Handle save preset
  const handleSavePreset = (name: string) => {
    savePreset(name, {
      searchQuery,
      statusFilter,
      ownerFilter,
      reviewDateRange,
    })
  }

  // Handle load preset
  const handleLoadPreset = (filters: Record<string, any>) => {
    setSearchQuery(filters.searchQuery || '')
    setStatusFilter(filters.statusFilter || 'all')
    setOwnerFilter(filters.ownerFilter || 'all')
    setReviewDateRange(filters.reviewDateRange)
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Policy Library</h2>
          <p className="text-muted-foreground mt-1">Governance documentation and compliance policies</p>
        </div>
        <SavedFilters
          presets={presets}
          currentFilters={{ searchQuery, statusFilter, ownerFilter, reviewDateRange }}
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
              id="policies-search"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {uniqueOwners.map(owner => (
                <SelectItem key={owner} value={owner}>{owner}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            value={reviewDateRange}
            onChange={setReviewDateRange}
            placeholder="Review date range"
          />
        </div>
      </FilterBar>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        <SortableHeader
          label="Title"
          field="title"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
        <SortableHeader
          label="Status"
          field="status"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
        <SortableHeader
          label="Review Date"
          field="reviewDate"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
      </div>

      <div className="grid gap-4">
        {sortedData.map((policy) => {
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

      {sortedData.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            {activeFilters.length > 0 || searchQuery ? (
              <>
                <p className="text-sm mb-2">No policies found matching your filters</p>
                <button
                  onClick={handleClearAll}
                  className="text-primary text-sm hover:underline"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <p className="text-sm">No policies available</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
