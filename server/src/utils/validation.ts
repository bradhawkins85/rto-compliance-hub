import { z } from 'zod';

/**
 * Common validation schemas
 */

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(30),
});

// Regex pattern for sorting: field:direction pairs separated by commas
// Example: "name:asc,createdAt:desc"
const SORT_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(:(asc|desc))?(,[a-zA-Z_][a-zA-Z0-9_]*(:(asc|desc))?)*$/;
export const sortSchema = z.string().regex(SORT_PATTERN).optional();

// Regex pattern for field selection: comma-separated field names
// Example: "id,name,email,department"
const FIELDS_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(,[a-zA-Z_][a-zA-Z0-9_]*)*$/;
export const fieldsSchema = z.string().regex(FIELDS_PATTERN).optional();

/**
 * User validation schemas
 */

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  department: z.enum(['Training', 'Admin', 'Management', 'Support']),
  roles: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  department: z.enum(['Training', 'Admin', 'Management', 'Support']).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  roles: z.array(z.string()).optional(),
});

export const listUsersQuerySchema = paginationSchema.extend({
  department: z.enum(['Training', 'Admin', 'Management', 'Support']).optional(),
  role: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

export const addCredentialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['Certificate', 'License', 'Qualification']),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  evidenceUrl: z.string().url().optional(),
});

/**
 * Policy validation schemas
 */

export const createPolicySchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  reviewDate: z.string().datetime().optional(),
  fileUrl: z.string().url().optional(),
  version: z.string().optional(),
  content: z.string().optional(),
});

export const updatePolicySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  reviewDate: z.string().datetime().optional(),
  status: z.enum(['Draft', 'Published', 'Archived']).optional(),
  fileUrl: z.string().url().optional(),
});

export const publishPolicySchema = z.object({
  version: z.string().min(1, 'Version is required'),
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
});

export const mapPolicyToStandardsSchema = z.object({
  standardIds: z.array(uuidSchema).min(1, 'At least one standard ID is required'),
});

export const listPoliciesQuerySchema = paginationSchema.extend({
  standardId: uuidSchema.optional(),
  status: z.enum(['Draft', 'Published', 'Archived']).optional(),
  ownerId: uuidSchema.optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * Standards validation schemas
 */

export const listStandardsQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  code: z.string().optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * Training Products validation schemas
 */

export const createTrainingProductSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(500),
  status: z.enum(['Active', 'Inactive']).optional(),
  assessmentStrategyUrl: z.string().url().optional(),
  validationReportUrl: z.string().url().optional(),
  isAccredited: z.boolean().optional(),
});

export const updateTrainingProductSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(500).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  assessmentStrategyUrl: z.string().url().optional(),
  validationReportUrl: z.string().url().optional(),
  isAccredited: z.boolean().optional(),
});

export const linkSOPsSchema = z.object({
  sopIds: z.array(uuidSchema).min(1, 'At least one SOP ID is required'),
});

export const listTrainingProductsQuerySchema = paginationSchema.extend({
  status: z.enum(['Active', 'Inactive']).optional(),
  isAccredited: z.coerce.boolean().optional(),
  ownerId: uuidSchema.optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * SOP validation schemas
 */

export const createSOPSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  version: z.string().min(1, 'Version is required').max(50),
  fileUrl: z.string().url().optional(),
  policyId: uuidSchema.optional(),
  description: z.string().optional(),
});

export const updateSOPSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  version: z.string().min(1).max(50).optional(),
  fileUrl: z.string().url().optional(),
  policyId: uuidSchema.optional(),
  description: z.string().optional(),
});

export const listSOPsQuerySchema = paginationSchema.extend({
  policyId: uuidSchema.optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * PD Items validation schemas
 */

export const createPDItemSchema = z.object({
  userId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  hours: z.coerce.number().min(0).optional(),
  dueAt: z.string().datetime().optional(),
  category: z.enum(['Vocational', 'Industry', 'Pedagogical']).optional(),
});

export const updatePDItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  hours: z.coerce.number().min(0).optional(),
  dueAt: z.string().datetime().optional(),
  category: z.enum(['Vocational', 'Industry', 'Pedagogical']).optional(),
  status: z.enum(['Planned', 'Due', 'Overdue', 'Completed', 'Verified']).optional(),
});

export const completePDItemSchema = z.object({
  evidenceUrl: z.string().url('Evidence URL must be a valid URL'),
  completedAt: z.string().datetime().optional(),
});

export const verifyPDItemSchema = z.object({
  notes: z.string().optional(),
});

export const listPDItemsQuerySchema = paginationSchema.extend({
  userId: uuidSchema.optional(),
  status: z.enum(['Planned', 'Due', 'Overdue', 'Completed', 'Verified']).optional(),
  dueBefore: z.string().datetime().optional(),
  category: z.enum(['Vocational', 'Industry', 'Pedagogical']).optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * Credentials validation schemas
 */

export const createCredentialSchema = z.object({
  userId: uuidSchema,
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['Certificate', 'License', 'Qualification']),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  evidenceUrl: z.string().url().optional(),
});

export const updateCredentialSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['Certificate', 'License', 'Qualification']).optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  evidenceUrl: z.string().url().optional(),
  status: z.enum(['Active', 'Expired', 'Revoked']).optional(),
});

export const listCredentialsQuerySchema = paginationSchema.extend({
  userId: uuidSchema.optional(),
  status: z.enum(['Active', 'Expired', 'Revoked']).optional(),
  expiresBefore: z.string().datetime().optional(),
  type: z.enum(['Certificate', 'License', 'Qualification']).optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * Feedback validation schemas
 */

export const createFeedbackSchema = z.object({
  type: z.enum(['learner', 'employer', 'industry']),
  trainingProductId: uuidSchema.optional(),
  trainerId: z.string().optional(),
  courseId: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  comments: z.string().optional(),
  anonymous: z.coerce.boolean().optional(),
});

export const updateFeedbackSchema = z.object({
  rating: z.coerce.number().min(0).max(5).optional(),
  comments: z.string().optional(),
  sentiment: z.coerce.number().min(-1).max(1).optional(),
  themes: z.array(z.string()).optional(),
});

export const listFeedbackQuerySchema = paginationSchema.extend({
  type: z.enum(['learner', 'employer', 'industry']).optional(),
  trainingProductId: uuidSchema.optional(),
  trainerId: z.string().optional(),
  courseId: z.string().optional(),
  anonymous: z.string().optional(), // Will be coerced to boolean
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minRating: z.string().optional(), // Will be parsed as float
  maxRating: z.string().optional(), // Will be parsed as float
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * Asset & Resource Management validation schemas
 */

export const createAssetSchema = z.object({
  type: z.string().min(1, 'Type is required').max(100),
  name: z.string().min(1, 'Name is required').max(500),
  serialNumber: z.string().max(255).optional(),
  location: z.string().max(500).optional(),
  status: z.enum(['Available', 'Assigned', 'Servicing', 'Retired']).optional(),
  purchaseDate: z.string().datetime().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
});

export const updateAssetSchema = z.object({
  type: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(500).optional(),
  serialNumber: z.string().max(255).optional(),
  location: z.string().max(500).optional(),
  status: z.enum(['Available', 'Assigned', 'Servicing', 'Retired']).optional(),
  purchaseDate: z.string().datetime().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  nextServiceAt: z.string().datetime().optional(),
});

export const transitionAssetStateSchema = z.object({
  state: z.enum(['Available', 'Assigned', 'Servicing', 'Retired'], {
    required_error: 'State is required',
  }),
  notes: z.string().optional(),
});

export const logAssetServiceSchema = z.object({
  serviceDate: z.string().datetime(),
  servicedBy: z.string().max(255).optional(),
  notes: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  documents: z.array(z.string().url()).optional(),
});

export const listAssetsQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  status: z.enum(['Available', 'Assigned', 'Servicing', 'Retired']).optional(),
  location: z.string().optional(),
  serviceDueBefore: z.string().datetime().optional(),
  q: z.string().optional(),
  sort: sortSchema,
  fields: fieldsSchema,
});

/**
 * Helper function to validate request data
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod errors for API response
 */
export function formatValidationErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
