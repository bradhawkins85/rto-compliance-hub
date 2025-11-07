import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createAuditLog } from '../middleware/audit';

const prisma = new PrismaClient();

/**
 * Login user with email and password
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Email and password are required',
        instance: req.path,
      });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
        instance: req.path,
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'Active') {
      res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
        title: 'Forbidden',
        status: 403,
        detail: 'Account is not active',
        instance: req.path,
      });
      return;
    }

    // Check if password is set
    if (!user.password) {
      res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
        title: 'Forbidden',
        status: 403,
        detail: 'Password not set. Please use password reset flow.',
        instance: req.path,
      });
      return;
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      // Log failed login attempt
      await createAuditLog(
        user.id,
        'login_failed',
        'Auth',
        user.id,
        { reason: 'Invalid password' },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );

      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
        instance: req.path,
      });
      return;
    }

    // Get user roles
    const roles = user.userRoles.map(ur => ur.role.name);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, roles);
    const refreshToken = generateRefreshToken(user.id, user.email, roles);

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Log successful login
    await createAuditLog(
      user.id,
      'login_success',
      'Auth',
      user.id,
      { roles },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    // Return tokens and user info
    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        roles,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred during login',
      instance: req.path,
    });
  }
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Log logout
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'logout',
        'Auth',
        req.user.userId,
        null,
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred during logout',
      instance: req.path,
    });
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/v1/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refresh_token;

    if (!refreshToken) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Refresh token required',
        instance: req.path,
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'Active') {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid refresh token',
        instance: req.path,
      });
      return;
    }

    // Get updated roles
    const roles = user.userRoles.map(ur => ur.role.name);

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.email, roles);

    // Set new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Log token refresh
    await createAuditLog(
      user.id,
      'token_refresh',
      'Auth',
      user.id,
      null,
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(200).json({
      access_token: accessToken,
      expires_in: 900, // 15 minutes in seconds
      token_type: 'Bearer',
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
      title: 'Unauthorized',
      status: 401,
      detail: error instanceof Error ? error.message : 'Invalid refresh token',
      instance: req.path,
    });
  }
}

/**
 * Change password for authenticated user
 * POST /api/v1/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Current password and new password are required',
        instance: req.path,
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Password does not meet requirements',
        errors: passwordValidation.errors,
        instance: req.path,
      });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.password) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Verify current password
    const passwordValid = await comparePassword(currentPassword, user.password);
    if (!passwordValid) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Current password is incorrect',
        instance: req.path,
      });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log password change
    await createAuditLog(
      user.id,
      'password_change',
      'Auth',
      user.id,
      null,
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while changing password',
      instance: req.path,
    });
  }
}

/**
 * Reset password (requires email, generates reset token)
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, token, newPassword } = req.body;

    // If only email provided, send reset link
    if (email && !token && !newPassword) {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Always return success to prevent email enumeration
      // but only send email if user exists
      if (user) {
        // In production, generate a secure token and send email
        // For now, we'll log the action
        await createAuditLog(
          user.id,
          'password_reset_requested',
          'Auth',
          user.id,
          { email },
          req.ip || req.socket.remoteAddress,
          req.headers['user-agent']
        );

        // TODO: Generate reset token, store in database with expiry, and send email
        console.log('Password reset requested for:', email);
      }

      res.status(200).json({
        message: 'If an account exists with that email, a password reset link has been sent',
      });
      return;
    }

    // If token and newPassword provided, perform reset
    if (email && token && newPassword) {
      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        res.status(400).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
          title: 'Bad Request',
          status: 400,
          detail: 'Password does not meet requirements',
          errors: passwordValidation.errors,
          instance: req.path,
        });
        return;
      }

      // TODO: Verify reset token from database
      // For now, we'll just allow password reset for existing users
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(400).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid reset token',
          instance: req.path,
        });
        return;
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // Log password reset
      await createAuditLog(
        user.id,
        'password_reset_completed',
        'Auth',
        user.id,
        null,
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );

      res.status(200).json({
        message: 'Password reset successfully',
      });
      return;
    }

    // Invalid request
    res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid request parameters',
      instance: req.path,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred during password reset',
      instance: req.path,
    });
  }
}
