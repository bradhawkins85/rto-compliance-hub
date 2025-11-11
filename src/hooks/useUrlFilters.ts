import { useState, useCallback, useEffect } from 'react'

export interface FilterConfig {
  [key: string]: string | string[] | undefined
}

/**
 * Hook to synchronize filter state with URL parameters
 * Supports both single values and arrays for multi-select filters
 */
export function useUrlFilters<T extends FilterConfig>(
  defaultFilters: T
): [T, (filters: Partial<T>) => void, () => void] {
  // Initialize filters from URL or defaults
  const getInitialFilters = useCallback((): T => {
    const filters = { ...defaultFilters }
    const searchParams = new URLSearchParams(window.location.search)
    
    for (const key in defaultFilters) {
      const value = searchParams.get(key)
      if (value) {
        // If default is an array, parse as comma-separated values
        if (Array.isArray(defaultFilters[key])) {
          filters[key] = value.split(',').filter(Boolean) as any
        } else {
          filters[key] = value as any
        }
      }
    }
    
    return filters
  }, [defaultFilters])

  const [filters, setFiltersState] = useState<T>(getInitialFilters)

  // Update URL when filters change
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters }
      
      // Update URL params
      const params = new URLSearchParams()
      
      for (const key in updated) {
        const value = updated[key]
        if (value !== undefined && value !== null && value !== '' && 
            (!Array.isArray(value) || value.length > 0)) {
          // Convert arrays to comma-separated strings
          if (Array.isArray(value)) {
            params.set(key, value.join(','))
          } else {
            params.set(key, String(value))
          }
        }
      }
      
      // Update URL without page reload
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      return updated
    })
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    window.history.replaceState({}, '', window.location.pathname)
  }, [defaultFilters])

  return [filters, setFilters, clearFilters]
}
