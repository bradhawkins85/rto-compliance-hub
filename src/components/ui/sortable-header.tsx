import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc" | null

interface SortableHeaderProps {
  label: string
  field: string
  currentField: string | null
  currentDirection: SortDirection
  onSort: (field: string) => void
  className?: string
}

export function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentField === field
  
  const Icon = isActive
    ? currentDirection === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-2 lg:px-3",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort(field)}
    >
      {label}
      <Icon className="ml-2 h-4 w-4" />
    </Button>
  )
}
