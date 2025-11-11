import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActiveFilter {
  id: string
  label: string
  value: string
}

interface FilterBarProps {
  activeFilters: ActiveFilter[]
  onRemoveFilter: (id: string) => void
  onClearAll: () => void
  className?: string
  children?: React.ReactNode
}

export function FilterBar({
  activeFilters,
  onRemoveFilter,
  onClearAll,
  className,
  children,
}: FilterBarProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
      
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Active Filters:</span>
          </div>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="pl-2 pr-1 py-1"
            >
              <span className="mr-1">
                {filter.label}: {filter.value}
              </span>
              <button
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => onRemoveFilter(filter.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
