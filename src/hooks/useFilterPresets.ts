import { useState, useEffect, useCallback } from 'react'

export interface FilterPreset {
  id: string
  name: string
  filters: Record<string, any>
  createdAt: string
}

const STORAGE_KEY = 'rto-filter-presets'

/**
 * Hook for managing saved filter presets
 * Persists presets in localStorage
 */
export function useFilterPresets(viewName: string) {
  const [presets, setPresets] = useState<FilterPreset[]>([])

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${viewName}`)
      if (stored) {
        setPresets(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error)
    }
  }, [viewName])

  // Save presets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}-${viewName}`,
        JSON.stringify(presets)
      )
    } catch (error) {
      console.error('Failed to save filter presets:', error)
    }
  }, [presets, viewName])

  // Save a new preset
  const savePreset = useCallback(
    (name: string, filters: Record<string, any>) => {
      const newPreset: FilterPreset = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      }
      setPresets((prev) => [...prev, newPreset])
      return newPreset
    },
    []
  )

  // Delete a preset
  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Update a preset
  const updatePreset = useCallback(
    (id: string, updates: Partial<FilterPreset>) => {
      setPresets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      )
    },
    []
  )

  return {
    presets,
    savePreset,
    deletePreset,
    updatePreset,
  }
}
