import { Badge } from '@/components/ui/badge'
import { CheckCircle, Warning, XCircle, Clock } from '@phosphor-icons/react'
import { getStatusColor, getStatusLabel } from '@/lib/helpers'
import type { ComplianceStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: ComplianceStatus
  showIcon?: boolean
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const icons = {
    compliant: CheckCircle,
    due: Warning,
    overdue: XCircle,
    incomplete: Clock
  }

  const Icon = icons[status]

  return (
    <Badge className={getStatusColor(status)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" weight="fill" />}
      {getStatusLabel(status)}
    </Badge>
  )
}
