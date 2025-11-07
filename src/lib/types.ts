export type ComplianceStatus = 'compliant' | 'due' | 'overdue' | 'incomplete'

export interface Standard {
  id: string
  clause: string
  title: string
  mappedPolicies: number
  mappedEvidence: number
  status: ComplianceStatus
}

export interface Policy {
  id: string
  title: string
  version: string
  owner: string
  status: 'draft' | 'published' | 'archived'
  reviewDate: string
  linkedStandards: string[]
  fileUrl?: string
}

export interface TrainingProduct {
  id: string
  code: string
  name: string
  status: 'active' | 'inactive'
  hasSOP: boolean
  hasAssessment: boolean
  hasValidation: boolean
  completeness: number
}

export interface StaffMember {
  id: string
  name: string
  role: string
  department: string
  credentials: Credential[]
  pdStatus: ComplianceStatus
}

export interface Credential {
  id: string
  name: string
  issueDate: string
  expiryDate: string
  status: ComplianceStatus
}

export interface DashboardMetrics {
  overallCompliance: number
  policiesDueReview: number
  credentialsExpiring: number
  incompleteProducts: number
  mappedStandards: number
  totalStandards: number
}
