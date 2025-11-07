import type { ComplianceStatus } from './types'

export function getStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant':
      return 'bg-success text-success-foreground'
    case 'due':
      return 'bg-accent text-accent-foreground'
    case 'overdue':
      return 'bg-destructive text-destructive-foreground'
    case 'incomplete':
      return 'bg-secondary text-secondary-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function getStatusLabel(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant':
      return 'Compliant'
    case 'due':
      return 'Due Soon'
    case 'overdue':
      return 'Overdue'
    case 'incomplete':
      return 'Incomplete'
    default:
      return 'Unknown'
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

export function getDaysUntil(dateString: string): number {
  const target = new Date(dateString)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getStatusFromDate(dateString: string): ComplianceStatus {
  const days = getDaysUntil(dateString)
  if (days < 0) return 'overdue'
  if (days <= 30) return 'due'
  return 'compliant'
}
