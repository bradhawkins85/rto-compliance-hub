/**
 * Test Data Factories - Generate test data with custom properties
 */

import { v4 as uuidv4 } from 'uuid';

export interface UserFactory {
  id?: string;
  email?: string;
  name?: string;
  department?: 'Training' | 'Admin' | 'Management' | 'Support';
  status?: 'Active' | 'Inactive';
  password?: string;
  xeroEmployeeId?: string | null;
}

export const createUser = (overrides: UserFactory = {}) => ({
  id: uuidv4(),
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  department: 'Training' as const,
  status: 'Active' as const,
  password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU',
  xeroEmployeeId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface PolicyFactory {
  id?: string;
  title?: string;
  version?: string;
  status?: 'Draft' | 'Published' | 'Archived';
  ownerId?: string;
  reviewDate?: Date;
  fileUrl?: string;
  description?: string;
}

export const createPolicy = (overrides: PolicyFactory = {}) => ({
  id: uuidv4(),
  title: `Test Policy ${Date.now()}`,
  version: '1.0',
  status: 'Draft' as const,
  ownerId: uuidv4(),
  reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  fileUrl: `https://example.com/policies/test-${Date.now()}.pdf`,
  description: 'Test policy description',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface TrainingProductFactory {
  id?: string;
  code?: string;
  name?: string;
  status?: 'Active' | 'Inactive';
  assessmentStrategyUrl?: string;
  validationReportUrl?: string;
}

export const createTrainingProduct = (overrides: TrainingProductFactory = {}) => ({
  id: uuidv4(),
  code: `TEST${Math.floor(Math.random() * 10000)}`,
  name: `Test Training Product ${Date.now()}`,
  status: 'Active' as const,
  assessmentStrategyUrl: `https://example.com/assessments/test-${Date.now()}.pdf`,
  validationReportUrl: `https://example.com/validation/test-${Date.now()}.pdf`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface FeedbackFactory {
  id?: string;
  type?: 'learner' | 'employer' | 'industry';
  courseId?: string | null;
  trainerId?: string | null;
  rating?: number;
  comments?: string;
  anonymous?: boolean;
  submissionId?: string;
  source?: string;
}

export const createFeedback = (overrides: FeedbackFactory = {}) => ({
  id: uuidv4(),
  type: 'learner' as const,
  courseId: null,
  trainerId: null,
  rating: 5,
  comments: 'Test feedback comments',
  anonymous: false,
  submissionId: `jotform-${Date.now()}`,
  source: 'jotform' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface CredentialFactory {
  id?: string;
  userId?: string;
  name?: string;
  type?: string;
  issuedAt?: Date;
  expiresAt?: Date | null;
  evidenceUrl?: string;
  issuingAuthority?: string;
  status?: string;
}

export const createCredential = (overrides: CredentialFactory = {}) => ({
  id: uuidv4(),
  userId: uuidv4(),
  name: `Test Credential ${Date.now()}`,
  type: 'Certificate',
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
  evidenceUrl: `https://example.com/credentials/test-${Date.now()}.pdf`,
  issuingAuthority: 'Test Authority',
  status: 'Current',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface PDItemFactory {
  id?: string;
  userId?: string;
  title?: string;
  description?: string;
  hours?: number | null;
  dueAt?: Date;
  completedAt?: Date | null;
  status?: string;
  evidenceUrl?: string | null;
  category?: string;
}

export const createPDItem = (overrides: PDItemFactory = {}) => ({
  id: uuidv4(),
  userId: uuidv4(),
  title: `Test PD Item ${Date.now()}`,
  description: 'Test PD description',
  hours: 8,
  dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  completedAt: null,
  status: 'Planned',
  evidenceUrl: null,
  category: 'Professional Development',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface ComplaintFactory {
  id?: string;
  source?: string;
  description?: string;
  status?: string;
  studentId?: string | null;
  trainerId?: string | null;
  courseId?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  receivedAt?: Date;
  closedAt?: Date | null;
}

export const createComplaint = (overrides: ComplaintFactory = {}) => ({
  id: uuidv4(),
  source: 'Student',
  description: 'Test complaint description',
  status: 'New',
  studentId: null,
  trainerId: null,
  courseId: null,
  rootCause: null,
  correctiveAction: null,
  receivedAt: new Date(),
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export interface AssetFactory {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  location?: string;
  status?: string;
  lastServiceAt?: Date | null;
  nextServiceAt?: Date | null;
  purchasedAt?: Date | null;
}

export const createAsset = (overrides: AssetFactory = {}) => ({
  id: uuidv4(),
  type: 'Equipment',
  name: `Test Asset ${Date.now()}`,
  description: 'Test asset description',
  location: 'Test Location',
  status: 'Available',
  lastServiceAt: new Date(),
  nextServiceAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
  purchasedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createStandard = (overrides: any = {}) => ({
  id: uuidv4(),
  clause: `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
  title: `Test Standard ${Date.now()}`,
  description: 'Test standard description',
  category: 'Test Category',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createJotFormPayload = (overrides: any = {}) => ({
  submissionID: `${Date.now()}`,
  formID: '241234567890',
  ip: '192.168.1.1',
  created_at: new Date().toISOString(),
  'q3_name': 'Test User',
  'q4_email': 'test@example.com',
  'q5_course': 'TEST001',
  'q6_rating': '5',
  'q7_comments': 'Test feedback',
  ...overrides,
});
