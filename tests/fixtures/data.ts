/**
 * Test Fixtures - Static test data for various entities
 */

export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  department: 'Training' as const,
  status: 'Active' as const,
  password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU', // bcrypt hash
  xeroEmployeeId: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockAdmin = {
  ...mockUser,
  id: '223e4567-e89b-12d3-a456-426614174001',
  email: 'admin@example.com',
  name: 'Admin User',
  department: 'Management' as const,
};

export const mockPolicy = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  title: 'Training Assessment Policy',
  version: '1.0',
  status: 'Published' as const,
  ownerId: mockUser.id,
  reviewDate: new Date('2025-01-01T00:00:00Z'),
  fileUrl: 'https://example.com/policies/training-assessment-v1.pdf',
  description: 'Policy for training and assessment procedures',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockStandard = {
  id: '423e4567-e89b-12d3-a456-426614174003',
  clause: '1.1',
  title: 'Training and assessment strategies',
  description: 'RTO must have training and assessment strategies',
  category: 'Training and Assessment',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockTrainingProduct = {
  id: '523e4567-e89b-12d3-a456-426614174004',
  code: 'RIIHAN301E',
  name: 'Operate elevating work platform',
  status: 'Active' as const,
  assessmentStrategyUrl: 'https://example.com/assessments/riihan301e.pdf',
  validationReportUrl: 'https://example.com/validation/riihan301e.pdf',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockFeedback = {
  id: '623e4567-e89b-12d3-a456-426614174005',
  type: 'learner' as const,
  courseId: mockTrainingProduct.id,
  trainerId: mockUser.id,
  rating: 5,
  comments: 'Excellent training session',
  anonymous: false,
  submissionId: 'jotform-123456',
  source: 'jotform' as const,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockCredential = {
  id: '723e4567-e89b-12d3-a456-426614174006',
  userId: mockUser.id,
  name: 'Certificate IV in Training and Assessment',
  type: 'Qualification',
  issuedAt: new Date('2023-01-01T00:00:00Z'),
  expiresAt: new Date('2026-01-01T00:00:00Z'),
  evidenceUrl: 'https://example.com/credentials/cert-iv.pdf',
  issuingAuthority: 'ASQA',
  status: 'Current' as const,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockPDItem = {
  id: '823e4567-e89b-12d3-a456-426614174007',
  userId: mockUser.id,
  title: 'Industry Update Workshop',
  description: 'Workshop on latest industry standards',
  hours: 8,
  dueAt: new Date('2024-12-31T00:00:00Z'),
  completedAt: null,
  status: 'Planned' as const,
  evidenceUrl: null,
  category: 'Professional Development',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockComplaint = {
  id: '923e4567-e89b-12d3-a456-426614174008',
  source: 'Student',
  description: 'Issue with training materials',
  status: 'New' as const,
  studentId: null,
  trainerId: mockUser.id,
  courseId: mockTrainingProduct.id,
  rootCause: null,
  correctiveAction: null,
  receivedAt: new Date('2024-01-01T00:00:00Z'),
  closedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockAsset = {
  id: 'a23e4567-e89b-12d3-a456-426614174009',
  type: 'Equipment',
  name: 'Forklift LF-001',
  description: 'Toyota 8FG25 Forklift',
  location: 'Training Yard A',
  status: 'Available' as const,
  lastServiceAt: new Date('2024-01-01T00:00:00Z'),
  nextServiceAt: new Date('2024-07-01T00:00:00Z'),
  purchasedAt: new Date('2020-01-01T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockRole = {
  id: 'b23e4567-e89b-12d3-a456-426614174010',
  name: 'Trainer',
  description: 'Training staff role',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockJotFormPayload = {
  submissionID: '123456789',
  formID: '241234567890',
  ip: '192.168.1.1',
  created_at: '2024-01-01 10:30:00',
  'q3_name': 'John Doe',
  'q4_email': 'john@example.com',
  'q5_course': 'RIIHAN301E',
  'q6_rating': '5',
  'q7_comments': 'Great training session!',
  'q8_trainer': 'Test User',
};

export const mockAuditLog = {
  id: 'c23e4567-e89b-12d3-a456-426614174011',
  userId: mockUser.id,
  action: 'CREATE',
  resource: 'policy',
  resourceId: mockPolicy.id,
  details: { title: mockPolicy.title },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  timestamp: new Date('2024-01-01T00:00:00Z'),
};
