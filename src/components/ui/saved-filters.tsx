import * as React from "react"
import { Check, Plus, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilterPreset } from "@/hooks/useFilterPresets"

interface SavedFiltersProps {
  presets: FilterPreset[]
  currentFilters: Record<string, any>
  onLoadPreset: (filters: Record<string, any>) => void
  onSavePreset: (name: string) => void
  onDeletePreset: (id: string) => void
  className?: string
}

export function SavedFilters({
  presets,
  currentFilters,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  className,
}: SavedFiltersProps) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false)
  const [presetName, setPresetName] = React.useState("")

  const hasActiveFilters = Object.keys(currentFilters).some((key) => {
    const value = currentFilters[key]
    return value !== undefined && value !== null && value !== '' &&
           (!Array.isArray(value) || value.length > 0)
  })

  const handleSave = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim())
      setPresetName("")
      setIsSaveDialogOpen(false)
    }
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Star className="mr-2 h-4 w-4" />
            Saved Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>Your Filter Presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {presets.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No saved filters yet
            </div>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                className="flex items-center justify-between cursor-pointer"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => onLoadPreset(preset.filters)}
                >
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    <span>{preset.name}</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDeletePreset(preset.id)
                  }}
                  className="ml-2 text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  if (hasActiveFilters) {
                    setIsSaveDialogOpen(true)
                  }
                }}
                disabled={!hasActiveFilters}
              >
                <Plus className="mr-2 h-4 w-4" />
                Save Current Filters
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Filter Preset</DialogTitle>
                <DialogDescription>
                  Give your filter combination a name so you can quickly access it later.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    placeholder="e.g., Active Policies"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave()
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!presetName.trim()}>
                  Save Preset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
