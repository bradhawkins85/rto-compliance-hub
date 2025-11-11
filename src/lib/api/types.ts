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

// Feedback types
export interface Feedback {
  id: string;
  type: 'learner' | 'employer' | 'industry';
  trainingProductId?: string;
  trainerId?: string;
  courseId?: string;
  rating?: number;
  comments?: string;
  anonymous: boolean;
  sentiment?: number;
  themes?: string[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  trainingProduct?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface FeedbackInsights {
  summary: {
    totalCount: number;
    averageRating: number | null;
    averageSentiment: number | null;
    dateRange: {
      from: string;
      to: string;
    };
  };
  trend: {
    direction: 'improving' | 'declining' | 'stable' | null;
    percentage: number | null;
    recent: {
      count: number;
      averageRating: number | null;
    };
    previous: {
      count: number;
      averageRating: number | null;
    };
  };
  topThemes: Array<{
    theme: string;
    count: number;
  }>;
  byType: Record<string, {
    count: number;
    averageRating: number | null;
    averageSentiment: number | null;
  }>;
  recommendations: string[];
}

export interface ListFeedbackParams extends ListQueryParams {
  type?: 'learner' | 'employer' | 'industry';
  trainingProductId?: string;
  trainerId?: string;
  courseId?: string;
  anonymous?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minRating?: number;
  maxRating?: number;
}

export interface FeedbackInsightsParams {
  type?: 'learner' | 'employer' | 'industry';
  trainingProductId?: string;
  trainerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Asset types
export interface Asset {
  id: string;
  type: string;
  name: string;
  serialNumber?: string;
  location?: string;
  status: 'Available' | 'Assigned' | 'Servicing' | 'Retired';
  purchaseDate?: string;
  purchaseCost?: number;
  lastServiceAt?: string;
  nextServiceAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetService {
  id: string;
  assetId: string;
  serviceDate: string;
  servicedBy?: string;
  notes?: string;
  cost?: number;
  documents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetWithHistory extends Asset {
  services: AssetService[];
}

export interface CreateAssetData {
  type: string;
  name: string;
  serialNumber?: string;
  location?: string;
  status?: 'Available' | 'Assigned' | 'Servicing' | 'Retired';
  purchaseDate?: string;
  purchaseCost?: number;
}

export interface UpdateAssetData {
  type?: string;
  name?: string;
  serialNumber?: string;
  location?: string;
  status?: 'Available' | 'Assigned' | 'Servicing' | 'Retired';
  purchaseDate?: string;
  purchaseCost?: number;
  nextServiceAt?: string;
}

export interface LogServiceData {
  serviceDate: string;
  servicedBy?: string;
  notes?: string;
  cost?: number;
  documents?: string[];
}

export interface TransitionStateData {
  state: 'Available' | 'Assigned' | 'Servicing' | 'Retired';
  notes?: string;
}

export interface ListAssetsParams extends ListQueryParams {
  type?: string;
  status?: 'Available' | 'Assigned' | 'Servicing' | 'Retired';
  location?: string;
  serviceDueBefore?: string;
}

// Complaints types
export interface Complaint {
  id: string;
  source: 'Student' | 'Staff' | 'Employer' | 'External';
  description: string;
  status: 'New' | 'InReview' | 'Actioned' | 'Closed';
  studentId?: string;
  trainerId?: string;
  trainingProductId?: string;
  courseId?: string;
  rootCause?: string;
  correctiveAction?: string;
  submittedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  slaBreach?: boolean;
  trainer?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  trainingProduct?: {
    id: string;
    code: string;
    name: string;
    status?: string;
  };
  timeline?: ComplaintTimeline[];
}

export interface ComplaintTimeline {
  id: string;
  complaintId: string;
  status: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateComplaintData {
  source: 'Student' | 'Staff' | 'Employer' | 'External';
  description: string;
  studentId?: string;
  trainerId?: string;
  trainingProductId?: string;
  courseId?: string;
}

export interface UpdateComplaintData {
  description?: string;
  status?: 'New' | 'InReview' | 'Actioned' | 'Closed';
  trainerId?: string | null;
  trainingProductId?: string | null;
  courseId?: string | null;
  rootCause?: string;
  correctiveAction?: string;
  notes?: string;
}

export interface CloseComplaintData {
  rootCause: string;
  correctiveAction: string;
  notes?: string;
}

export interface ListComplaintsParams extends ListQueryParams {
  status?: 'New' | 'InReview' | 'Actioned' | 'Closed';
  source?: 'Student' | 'Staff' | 'Employer' | 'External';
  trainerId?: string;
  trainingProductId?: string;
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
  slaBreach?: 'true' | 'false';
}
