import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState, useMemo } from 'react'
import { useStandards } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'
import { FilterBar, type ActiveFilter } from '@/components/ui/filter-bar'
import { SavedFilters } from '@/components/ui/saved-filters'
import { SortableHeader } from '@/components/ui/sortable-header'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { useFilterPresets } from '@/hooks/useFilterPresets'
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
  const [complianceStatusFilter, setComplianceStatusFilter] = useState<string>('all')
  const [coverageFilter, setCoverageFilter] = useState<string>('all')
  
  const debouncedSearch = useDebounce(searchQuery, 300)
  const { data: standardsData, isLoading, error, refetch } = useStandards({ perPage: 100 })

  const standards = standardsData?.data || []

  // Filter presets
  const { presets, savePreset, deletePreset } = useFilterPresets('standards')

  // Apply filters
  const filteredStandards = useMemo(() => {
    let filtered = standards

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter(standard =>
        standard.title.toLowerCase().includes(query) ||
        (standard.clause && standard.clause.toLowerCase().includes(query)) ||
        (standard.code && standard.code.toLowerCase().includes(query))
      )
    }

    // Compliance status filter
    if (complianceStatusFilter !== 'all') {
      filtered = filtered.filter(standard => {
        const mappedPolicies = 0
        const mappedEvidence = 0
        const status = getStatusFromMappings(mappedPolicies, mappedEvidence)
        return status === complianceStatusFilter
      })
    }

    // Coverage filter (based on mapping count)
    if (coverageFilter !== 'all') {
      filtered = filtered.filter(standard => {
        const mappedPolicies = 0
        const mappedEvidence = 0
        const total = mappedPolicies + mappedEvidence
        
        switch (coverageFilter) {
          case 'none':
            return total === 0
          case 'partial':
            return total > 0 && total < 5
          case 'complete':
            return total >= 5
          default:
            return true
        }
      })
    }

    return filtered
  }, [standards, debouncedSearch, complianceStatusFilter, coverageFilter])

  // Sorting
  const { sortedData, sortConfig, handleSort } = useSort(filteredStandards, null, 'asc')

  // Active filters
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = []
    
    if (complianceStatusFilter !== 'all') {
      const statusLabels = {
        compliant: 'Compliant',
        due: 'Due',
        incomplete: 'Incomplete',
      }
      filters.push({ 
        id: 'complianceStatus', 
        label: 'Status', 
        value: statusLabels[complianceStatusFilter as keyof typeof statusLabels] || complianceStatusFilter
      })
    }
    
    if (coverageFilter !== 'all') {
      const coverageLabels = {
        none: 'No Coverage',
        partial: 'Partial Coverage',
        complete: 'Complete Coverage',
      }
      filters.push({ 
        id: 'coverage', 
        label: 'Coverage', 
        value: coverageLabels[coverageFilter as keyof typeof coverageLabels] || coverageFilter
      })
    }
    
    return filters
  }, [complianceStatusFilter, coverageFilter])

  // Handle filter removal
  const handleRemoveFilter = (id: string) => {
    switch (id) {
      case 'complianceStatus':
        setComplianceStatusFilter('all')
        break
      case 'coverage':
        setCoverageFilter('all')
        break
    }
  }

  // Handle clear all
  const handleClearAll = () => {
    setSearchQuery('')
    setComplianceStatusFilter('all')
    setCoverageFilter('all')
  }

  // Handle save preset
  const handleSavePreset = (name: string) => {
    savePreset(name, {
      searchQuery,
      complianceStatusFilter,
      coverageFilter,
    })
  }

  // Handle load preset
  const handleLoadPreset = (filters: Record<string, any>) => {
    setSearchQuery(filters.searchQuery || '')
    setComplianceStatusFilter(filters.complianceStatusFilter || 'all')
    setCoverageFilter(filters.coverageFilter || 'all')
  }

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
        <SavedFilters
          presets={presets}
          currentFilters={{ searchQuery, complianceStatusFilter, coverageFilter }}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="standards-search"
              placeholder="Search standards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={complianceStatusFilter} onValueChange={setComplianceStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Compliance status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={coverageFilter} onValueChange={setCoverageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Coverage level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Coverage</SelectItem>
              <SelectItem value="none">No Coverage</SelectItem>
              <SelectItem value="partial">Partial Coverage</SelectItem>
              <SelectItem value="complete">Complete Coverage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        <SortableHeader
          label="Clause"
          field="clause"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
        <SortableHeader
          label="Title"
          field="title"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
      </div>

      <div className="grid gap-4">
        {sortedData.map((standard) => {
          // TODO: Backend should include mapping counts in standards list response
          // Alternative: Call useStandardMappings(standard.id) for each standard
          // Note: This would make N+1 API calls, better to enhance backend
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

      {sortedData.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            {activeFilters.length > 0 || searchQuery ? (
              <>
                <p className="text-sm mb-2">No standards found matching your filters</p>
                <button
                  onClick={handleClearAll}
                  className="text-primary text-sm hover:underline"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <p className="text-sm">No standards available</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
