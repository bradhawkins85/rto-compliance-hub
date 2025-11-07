// API Response types matching backend

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken?: string;
  expiresIn?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  department: 'Training' | 'Admin' | 'Management' | 'Support';
  roles: string[];
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

// Standards types
export interface Standard {
  id: string;
  code: string;
  clause: string;
  title: string;
  description?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StandardWithMappings extends Standard {
  mappedPolicies: number;
  mappedEvidence: number;
}

export interface StandardMappings {
  standard: {
    id: string;
    code: string;
    title: string;
  };
  policies: Array<{
    id: string;
    title: string;
    status: string;
    fileUrl?: string;
    owner?: {
      id: string;
      name: string;
    };
  }>;
  sops: Array<{
    id: string;
    title: string;
    version?: string;
    fileUrl?: string;
  }>;
  evidence: Array<{
    id: string;
    url: string;
    description?: string;
    createdAt: string;
  }>;
}

// Policies types
export interface Policy {
  id: string;
  title: string;
  status: 'Draft' | 'Published' | 'Archived';
  reviewDate: string;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
  version?: {
    versionNumber: string;
  };
  owner?: {
    id: string;
    name: string;
  };
}

export interface PolicyWithVersions extends Policy {
  versions: Array<{
    id: string;
    versionNumber: string;
    changeDescription?: string;
    createdAt: string;
  }>;
}

// Training Products types
export interface TrainingProduct {
  id: string;
  code: string;
  name: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProductWithDetails extends TrainingProduct {
  sops: Array<{
    id: string;
    title: string;
  }>;
  assessmentStrategy?: {
    id: string;
    fileUrl: string;
  };
  validationReport?: {
    id: string;
    fileUrl: string;
  };
}

// Staff/Users types
export interface StaffMember extends User {
  credentials: Credential[];
  pdItems?: PDItem[];
}

export interface Credential {
  id: string;
  name: string;
  issueDate: string;
  expiryDate?: string;
  evidenceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PDItem {
  id: string;
  title: string;
  hours?: number;
  dueAt?: string;
  completedAt?: string;
  status: 'Planned' | 'Due' | 'Overdue' | 'Completed' | 'Verified';
  evidenceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Dashboard metrics types
export interface DashboardMetrics {
  overallCompliance: number;
  policiesDueReview: number;
  credentialsExpiring: number;
  incompleteProducts: number;
  mappedStandards: number;
  totalStandards: number;
}

// Query parameter types
export interface ListQueryParams {
  page?: number;
  perPage?: number;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ListStandardsParams extends ListQueryParams {
  category?: string;
  code?: string;
}

export interface ListPoliciesParams extends ListQueryParams {
  standardId?: string;
  status?: string;
  ownerId?: string;
}

export interface ListTrainingProductsParams extends ListQueryParams {
  status?: string;
}

export interface ListUsersParams extends ListQueryParams {
  department?: string;
  role?: string;
  status?: string;
}
