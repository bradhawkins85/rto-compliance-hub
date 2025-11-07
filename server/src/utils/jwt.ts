import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(userId: string, email: string, roles: string[]): string {
  const payload = {
    userId,
    email,
    roles,
    type: 'access' as const,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
    issuer: 'rto-compliance-hub',
    audience: 'rto-compliance-hub-api',
  });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(userId: string, email: string, roles: string[]): string {
  const payload = {
    userId,
    email,
    roles,
    type: 'refresh' as const,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
    issuer: 'rto-compliance-hub',
    audience: 'rto-compliance-hub-api',
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rto-compliance-hub',
      audience: 'rto-compliance-hub-api',
    }) as JWTPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'rto-compliance-hub',
      audience: 'rto-compliance-hub-api',
    }) as JWTPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
