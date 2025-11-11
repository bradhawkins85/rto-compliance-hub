import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ComplianceMeter } from '@/components/ComplianceMeter'
import { MagnifyingGlass, CheckCircle, XCircle } from '@phosphor-icons/react'
import { useState, useMemo } from 'react'
import { useTrainingProducts } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'
import { FilterBar, type ActiveFilter } from '@/components/ui/filter-bar'
import { SavedFilters } from '@/components/ui/saved-filters'
import { SortableHeader } from '@/components/ui/sortable-header'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { useFilterPresets } from '@/hooks/useFilterPresets'

export function TrainingView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const debouncedSearch = useDebounce(searchQuery, 300)
  const { data: productsData, isLoading, error, refetch } = useTrainingProducts({ perPage: 100 })

  const products = productsData?.data || []

  // Filter presets
  const { presets, savePreset, deletePreset } = useFilterPresets('training')

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter)
    }

    return filtered
  }, [products, debouncedSearch, statusFilter])

  // Sorting
  const { sortedData, sortConfig, handleSort } = useSort(filteredProducts, null, 'asc')

  // Active filters
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = []
    
    if (statusFilter !== 'all') {
      filters.push({ id: 'status', label: 'Status', value: statusFilter })
    }
    
    return filters
  }, [statusFilter])

  // Handle filter removal
  const handleRemoveFilter = (id: string) => {
    if (id === 'status') {
      setStatusFilter('all')
    }
  }

  // Handle clear all
  const handleClearAll = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  // Handle save preset
  const handleSavePreset = (name: string) => {
    savePreset(name, {
      searchQuery,
      statusFilter,
    })
  }

  // Handle load preset
  const handleLoadPreset = (filters: Record<string, any>) => {
    setSearchQuery(filters.searchQuery || '')
    setStatusFilter(filters.statusFilter || 'all')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Training Products</h2>
          <p className="text-muted-foreground mt-1">Course documentation and compliance tracking</p>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="training-search"
            placeholder="Search by course name or code..."
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
          <h2 className="text-2xl font-semibold tracking-tight">Training Products</h2>
          <p className="text-muted-foreground mt-1">Course documentation and compliance tracking</p>
        </div>
        <ErrorDisplay 
          error={error} 
          title="Failed to load training products"
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Training Products</h2>
          <p className="text-muted-foreground mt-1">Course documentation and compliance tracking</p>
        </div>
        <SavedFilters
          presets={presets}
          currentFilters={{ searchQuery, statusFilter }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="training-search"
              placeholder="Search by course name or code..."
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
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        <SortableHeader
          label="Course Name"
          field="name"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
        <SortableHeader
          label="Code"
          field="code"
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
      </div>

      <div className="grid gap-4">
        {sortedData.map((product) => {
          // TODO: Backend list API doesn't include SOP/assessment/validation details
          // Options: 1) Enhance backend to include these in list response
          //          2) Fetch individual products with useTrainingProduct(id)
          //          3) Add backend endpoint for bulk product details
          const hasSOP = false
          const hasAssessment = false
          const hasValidation = false
          const completeness = 0

          return (
            <Card key={product.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        {product.code}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ComplianceMeter 
                  percentage={completeness} 
                  label="Documentation Completeness"
                />
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {hasSOP ? (
                      <CheckCircle className="w-4 h-4 text-success" weight="fill" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" weight="fill" />
                    )}
                    <span className="text-muted-foreground">SOP</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasAssessment ? (
                      <CheckCircle className="w-4 h-4 text-success" weight="fill" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" weight="fill" />
                    )}
                    <span className="text-muted-foreground">Assessment</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasValidation ? (
                      <CheckCircle className="w-4 h-4 text-success" weight="fill" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" weight="fill" />
                    )}
                    <span className="text-muted-foreground">Validation</span>
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
                <p className="text-sm mb-2">No training products found matching your filters</p>
                <button
                  onClick={handleClearAll}
                  className="text-primary text-sm hover:underline"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <p className="text-sm">No training products available</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
