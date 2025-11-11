import { useState, useCallback, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: string | null
  direction: SortDirection
}

/**
 * Hook for managing sorting state and applying sort to data
 */
export function useSort<T>(
  data: T[],
  defaultField: string | null = null,
  defaultDirection: SortDirection = 'asc'
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: defaultField,
    direction: defaultDirection,
  })

  const handleSort = useCallback((field: string) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        // Toggle direction
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      // New field, default to ascending
      return {
        field,
        direction: 'asc',
      }
    })
  }, [])

  const sortedData = useMemo(() => {
    if (!sortConfig.field) return data

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.field!)
      const bValue = getNestedValue(b, sortConfig.field!)

      if (aValue === bValue) return 0

      // Handle null/undefined
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      // Handle strings (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
        return sortConfig.direction === 'asc' ? comparison : -comparison
      }

      // Handle numbers and other comparables
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }

      return 0
    })
  }, [data, sortConfig])

  return {
    sortedData,
    sortConfig,
    handleSort,
  }
}

/**
 * Get nested property value using dot notation
 * e.g., "owner.name" -> obj.owner.name
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}
