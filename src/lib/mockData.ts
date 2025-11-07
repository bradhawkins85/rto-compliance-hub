import type { Standard, Policy, TrainingProduct, StaffMember, DashboardMetrics } from './types'

export const mockStandards: Standard[] = [
  {
    id: 'std-1',
    clause: '1.1',
    title: 'Training and assessment strategies',
    mappedPolicies: 3,
    mappedEvidence: 5,
    status: 'compliant'
  },
  {
    id: 'std-2',
    clause: '1.2',
    title: 'Industry engagement',
    mappedPolicies: 2,
    mappedEvidence: 3,
    status: 'compliant'
  },
  {
    id: 'std-3',
    clause: '1.3',
    title: 'Facilities and resources',
    mappedPolicies: 1,
    mappedEvidence: 2,
    status: 'due'
  },
  {
    id: 'std-4',
    clause: '1.4',
    title: 'Trainer and assessor competencies',
    mappedPolicies: 2,
    mappedEvidence: 4,
    status: 'compliant'
  },
  {
    id: 'std-5',
    clause: '2.1',
    title: 'Recruitment and support services',
    mappedPolicies: 0,
    mappedEvidence: 0,
    status: 'incomplete'
  },
  {
    id: 'std-6',
    clause: '2.2',
    title: 'Training and assessment delivered',
    mappedPolicies: 3,
    mappedEvidence: 6,
    status: 'compliant'
  },
  {
    id: 'std-7',
    clause: '3.1',
    title: 'Issuance of AQF documentation',
    mappedPolicies: 1,
    mappedEvidence: 1,
    status: 'overdue'
  },
  {
    id: 'std-8',
    clause: '4.1',
    title: 'Continuous improvement',
    mappedPolicies: 2,
    mappedEvidence: 3,
    status: 'compliant'
  }
]

export const mockPolicies: Policy[] = [
  {
    id: 'pol-1',
    title: 'Training and Assessment Strategy Policy',
    version: '2.1',
    owner: 'Sarah Chen',
    status: 'published',
    reviewDate: '2024-12-15',
    linkedStandards: ['std-1', 'std-6']
  },
  {
    id: 'pol-2',
    title: 'Industry Engagement Framework',
    version: '1.3',
    owner: 'Marcus Wright',
    status: 'published',
    reviewDate: '2025-02-20',
    linkedStandards: ['std-2']
  },
  {
    id: 'pol-3',
    title: 'Facilities Management Guidelines',
    version: '1.0',
    owner: 'Linda Thompson',
    status: 'published',
    reviewDate: '2024-11-30',
    linkedStandards: ['std-3']
  },
  {
    id: 'pol-4',
    title: 'Trainer Competency Requirements',
    version: '3.0',
    owner: 'Sarah Chen',
    status: 'published',
    reviewDate: '2025-04-10',
    linkedStandards: ['std-4']
  },
  {
    id: 'pol-5',
    title: 'Student Recruitment and Support',
    version: '1.2',
    owner: 'James Parker',
    status: 'draft',
    reviewDate: '2024-12-01',
    linkedStandards: ['std-5']
  },
  {
    id: 'pol-6',
    title: 'Continuous Improvement Strategy',
    version: '2.0',
    owner: 'Marcus Wright',
    status: 'published',
    reviewDate: '2025-06-15',
    linkedStandards: ['std-8']
  }
]

export const mockTrainingProducts: TrainingProduct[] = [
  {
    id: 'tp-1',
    code: 'TLI31221',
    name: 'Certificate III in Mobile Crane Operations',
    status: 'active',
    hasSOP: true,
    hasAssessment: true,
    hasValidation: true,
    completeness: 100
  },
  {
    id: 'tp-2',
    code: 'TLI40421',
    name: 'Certificate IV in Warehousing Operations',
    status: 'active',
    hasSOP: true,
    hasAssessment: true,
    hasValidation: false,
    completeness: 67
  },
  {
    id: 'tp-3',
    code: 'RIIWHS302E',
    name: 'Implement traffic management plans',
    status: 'active',
    hasSOP: true,
    hasAssessment: false,
    hasValidation: false,
    completeness: 33
  },
  {
    id: 'tp-4',
    code: 'CPCCLDG3001',
    name: 'Licence to perform dogging',
    status: 'active',
    hasSOP: true,
    hasAssessment: true,
    hasValidation: true,
    completeness: 100
  },
  {
    id: 'tp-5',
    code: 'TLILIC0003',
    name: 'Licence to operate a forklift truck',
    status: 'active',
    hasSOP: false,
    hasAssessment: true,
    hasValidation: true,
    completeness: 67
  }
]

export const mockStaff: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Sarah Chen',
    role: 'Head Trainer',
    department: 'Training',
    pdStatus: 'compliant',
    credentials: [
      {
        id: 'cred-1',
        name: 'TAE40116 Certificate IV in Training and Assessment',
        issueDate: '2019-03-15',
        expiryDate: '2025-03-15',
        status: 'compliant'
      },
      {
        id: 'cred-2',
        name: 'Mobile Crane Operator High Risk Work Licence',
        issueDate: '2020-06-10',
        expiryDate: '2025-06-10',
        status: 'compliant'
      }
    ]
  },
  {
    id: 'staff-2',
    name: 'Marcus Wright',
    role: 'Compliance Officer',
    department: 'Management',
    pdStatus: 'due',
    credentials: [
      {
        id: 'cred-3',
        name: 'Diploma of Quality Auditing',
        issueDate: '2018-11-20',
        expiryDate: '2024-11-20',
        status: 'due'
      }
    ]
  },
  {
    id: 'staff-3',
    name: 'Linda Thompson',
    role: 'Assessor',
    department: 'Training',
    pdStatus: 'compliant',
    credentials: [
      {
        id: 'cred-4',
        name: 'TAE40116 Certificate IV in Training and Assessment',
        issueDate: '2020-01-10',
        expiryDate: '2026-01-10',
        status: 'compliant'
      },
      {
        id: 'cred-5',
        name: 'Forklift Operator High Risk Work Licence',
        issueDate: '2021-05-15',
        expiryDate: '2024-10-30',
        status: 'overdue'
      }
    ]
  },
  {
    id: 'staff-4',
    name: 'James Parker',
    role: 'Admin Coordinator',
    department: 'Admin',
    pdStatus: 'compliant',
    credentials: []
  }
]

export const mockDashboardMetrics: DashboardMetrics = {
  overallCompliance: 82,
  policiesDueReview: 3,
  credentialsExpiring: 2,
  incompleteProducts: 2,
  mappedStandards: 6,
  totalStandards: 8
}
