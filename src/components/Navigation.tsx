import { House, FileText, GraduationCap, Users, ChartBar } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type NavItem = 'overview' | 'standards' | 'policies' | 'training' | 'staff'

interface NavigationProps {
  activeView: NavItem
  onNavigate: (view: NavItem) => void
}

const navItems = [
  { id: 'overview' as const, label: 'Overview', icon: House },
  { id: 'standards' as const, label: 'Standards', icon: ChartBar },
  { id: 'policies' as const, label: 'Policies', icon: FileText },
  { id: 'training' as const, label: 'Training', icon: GraduationCap },
  { id: 'staff' as const, label: 'PD & Staff', icon: Users }
]

export function Navigation({ activeView, onNavigate }: NavigationProps) {
  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChartBar className="w-5 h-5 text-primary-foreground" weight="bold" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">RTO Compliance</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-5 h-5" weight={isActive ? 'fill' : 'regular'} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
