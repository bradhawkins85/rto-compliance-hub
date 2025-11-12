import crypto from 'crypto';

/**
 * Validates JotForm webhook signature
 * @param payload - The raw webhook payload string
 * @param signature - The signature from JotForm headers
 * @param secret - The webhook secret key
 * @returns boolean indicating if signature is valid
 */
export function validateJotFormSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    // JotForm uses HMAC-SHA256 for webhook signatures
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error validating JotForm signature:', error);
    return false;
  }
}

/**
 * Extracts form type from JotForm submission
 * @param formId - The JotForm form ID
 * @param rawSubmission - The raw submission data from JotForm
 * @returns Form type: learner, employer, industry, sop, or unknown
 */
export function detectFormType(
  formId: string,
  rawSubmission: any
): 'learner' | 'employer' | 'industry' | 'sop' | 'unknown' {
  // Check for form type indicator in submission
  const formTitle = rawSubmission.form_title?.toLowerCase() || '';
  const fields = rawSubmission.answers || {};

  // Check for explicit form type field
  for (const fieldId in fields) {
    const field = fields[fieldId];
    const answer = field.answer?.toLowerCase() || '';
    const name = field.name?.toLowerCase() || '';

    if (name.includes('form_type') || name.includes('feedback_type')) {
      if (answer.includes('learner') || answer.includes('student')) return 'learner';
      if (answer.includes('employer')) return 'employer';
      if (answer.includes('industry')) return 'industry';
      if (answer.includes('sop') || answer.includes('training')) return 'sop';
    }
  }

  // Check form title
  if (formTitle.includes('learner') || formTitle.includes('student')) return 'learner';
  if (formTitle.includes('employer')) return 'employer';
  if (formTitle.includes('industry')) return 'industry';
  if (formTitle.includes('sop') || formTitle.includes('training completion')) return 'sop';

  return 'unknown';
}

/**
 * Checks if submission should be anonymous
 * @param rawSubmission - The raw submission data from JotForm
 * @returns boolean indicating if submission is anonymous
 */
export function isAnonymousSubmission(rawSubmission: any): boolean {
  const fields = rawSubmission.answers || {};

  for (const fieldId in fields) {
    const field = fields[fieldId];
    const answer = field.answer?.toLowerCase() || '';
    const name = field.name?.toLowerCase() || '';

    if (name.includes('anonymous') && (answer === 'yes' || answer === 'true' || answer === '1')) {
      return true;
    }
  }

  return false;
}

/**
 * Maps JotForm submission to feedback data structure
 * @param rawSubmission - The raw submission data from JotForm
 * @param formType - Detected form type
 * @returns Mapped feedback data
 */
export function mapJotFormToFeedback(
  rawSubmission: any,
  formType: string
): {
  type: string;
  trainingProductId?: string;
  trainerId?: string;
  courseId?: string;
  rating?: number;
  comments?: string;
  anonymous: boolean;
} {
  const fields = rawSubmission.answers || {};
  const anonymous = isAnonymousSubmission(rawSubmission);

  const feedback: any = {
    type: formType,
    anonymous,
  };

  // Map common fields
  for (const fieldId in fields) {
    const field = fields[fieldId];
    const answer = field.answer;
    const name = field.name?.toLowerCase() || '';

    // Rating field
    if (name.includes('rating') || name.includes('score')) {
      const rating = parseFloat(answer);
      if (!isNaN(rating)) {
        feedback.rating = rating;
      }
    }

    // Comments field
    if (
      name.includes('comment') ||
      name.includes('feedback') ||
      name.includes('suggestion') ||
      name.includes('review')
    ) {
      feedback.comments = answer;
    }

    // Trainer field (skip if anonymous)
    if (!anonymous && (name.includes('trainer') || name.includes('instructor'))) {
      feedback.trainerId = answer;
    }

    // Course/Training Product field
    if (name.includes('course') || name.includes('training') || name.includes('product')) {
      feedback.courseId = answer;
      feedback.trainingProductId = answer; // Could be same or different
    }
  }

  return feedback;
}

/**
 * Generates a unique hash for submission deduplication
 * @param formId - The JotForm form ID
 * @param submissionId - The JotForm submission ID
 * @returns Hash string
 */
export function generateSubmissionHash(formId: string, submissionId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${formId}-${submissionId}`)
    .digest('hex');
}
