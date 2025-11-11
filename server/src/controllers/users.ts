import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { createAuditLog } from '../middleware/audit';
import {
  getPaginationParams,
  createPaginatedResponse,
  parseSortParams,
  createSelectObject,
  parseFieldsParams,
} from '../utils/pagination';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  addCredentialSchema,
  formatValidationErrors,
} from '../utils/validation';
import { triggerOnboardingForNewUser } from '../services/onboarding';

const prisma = new PrismaClient();

/**
 * List users with filters and pagination
 * GET /api/v1/users
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listUsersQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid query parameters',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { page, perPage, skip, take } = getPaginationParams(req);
    const { department, role, status, q, includeOnboarding } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause - only include active users by default
    // unless explicitly filtering by Inactive status
    const where: any = {};
    
    // Only exclude inactive users if not explicitly requesting them
    if (status !== 'Inactive') {
      where.status = { not: 'Inactive' };
    }

    if (department) {
      where.department = department;
    }

    if (status) {
      // If status is explicitly provided, use it
      where.status = status;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by role if provided
    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    // Build orderBy clause
    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        email: true,
        name: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform response to include roles array and optionally onboarding status
    const transformedUsers = await Promise.all(users.map(async (user: any) => {
      if (user.userRoles) {
        const { userRoles, ...rest } = user;
        const result: any = {
          ...rest,
          roles: userRoles.map((ur: any) => ur.role.name),
        };
        
        // Optionally include onboarding status
        if (includeOnboarding === 'true') {
          const { getOnboardingStatus } = await import('../services/onboarding');
          const onboardingStatus = await getOnboardingStatus(user.id);
          result.onboarding = onboardingStatus;
        }
        
        return result;
      }
      return user;
    }));

    const response = createPaginatedResponse(transformedUsers, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing users',
      instance: req.path,
    });
  }
}

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        credentials: {
          select: {
            id: true,
            name: true,
            type: true,
            issuedAt: true,
            expiresAt: true,
            status: true,
            evidenceUrl: true,
          },
          orderBy: {
            issuedAt: 'desc',
          },
        },
      },
    });

    if (!user || user.status === 'Inactive') {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Transform response
    const { userRoles, ...rest } = user;
    const response = {
      ...rest,
      roles: userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving user',
      instance: req.path,
    });
  }
}

/**
 * Create new user
 * POST /api/v1/users
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { email, name, password, department, roles } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.8',
        title: 'Conflict',
        status: 409,
        detail: 'User with this email already exists',
        instance: req.path,
      });
      return;
    }

    // Validate and hash password if provided
    let hashedPassword = null;
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        res.status(400).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
          title: 'Bad Request',
          status: 400,
          detail: 'Password does not meet strength requirements',
          errors: passwordValidation.errors.map(err => ({ field: 'password', message: err })),
          instance: req.path,
        });
        return;
      }
      hashedPassword = await hashPassword(password);
    }

    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          department,
          status: 'Active',
        },
      });

      // Assign roles if provided
      if (roles && roles.length > 0) {
        const roleRecords = await tx.role.findMany({
          where: { name: { in: roles } },
        });

        await tx.userRole.createMany({
          data: roleRecords.map(role => ({
            userId: newUser.id,
            roleId: role.id,
          })),
        });
      }

      return newUser;
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'create',
        'User',
        user.id,
        { email, name, department, roles },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    // Get user with roles
    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform response
    const { userRoles, ...rest } = createdUser!;
    const response = {
      ...rest,
      roles: userRoles.map(ur => ur.role.name),
    };

    // Trigger onboarding workflow for new user (async, don't wait)
    const userRoleNames = userRoles.map(ur => ur.role.name);
    triggerOnboardingForNewUser(user.id, department, userRoleNames).catch((error) => {
      console.error('Error triggering onboarding:', error);
    });

    res.status(201).json(response);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating user',
      instance: req.path,
    });
  }
}

/**
 * Update user
 * PATCH /api/v1/users/:id
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { name, email, department, status, roles } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.status === 'Inactive') {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Check email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        res.status(409).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.8',
          title: 'Conflict',
          status: 409,
          detail: 'Email already in use',
          instance: req.path,
        });
        return;
      }
    }

    // Update user with transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(department && { department }),
          ...(status && { status }),
        },
      });

      // Update roles if provided
      if (roles) {
        // Delete existing roles
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        // Add new roles
        if (roles.length > 0) {
          const roleRecords = await tx.role.findMany({
            where: { name: { in: roles } },
          });

          await tx.userRole.createMany({
            data: roleRecords.map(role => ({
              userId: id,
              roleId: role.id,
            })),
          });
        }
      }

      return updatedUser;
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'User',
        user.id,
        { name, email, department, status, roles },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    // Get updated user with roles
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform response
    const { userRoles, ...rest } = updatedUser!;
    const response = {
      ...rest,
      roles: userRoles.map(ur => ur.role.name),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating user',
      instance: req.path,
    });
  }
}

/**
 * Soft delete user
 * DELETE /api/v1/users/:id
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if user exists and is not already inactive
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.status === 'Inactive') {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Soft delete user by setting status to Inactive
    await prisma.user.update({
      where: { id },
      data: {
        status: 'Inactive',
      },
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'delete',
        'User',
        id,
        { softDelete: true },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while deleting user',
      instance: req.path,
    });
  }
}

/**
 * Add credential to user
 * POST /api/v1/users/:id/credentials
 */
export async function addCredential(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = addCredentialSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { name, type, issuedAt, expiresAt, evidenceUrl } = validation.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.status === 'Inactive') {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Create credential
    const credential = await prisma.credential.create({
      data: {
        userId: id,
        name,
        type,
        issuedAt: new Date(issuedAt),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        evidenceUrl: evidenceUrl || null,
        status: 'Active',
      },
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'create',
        'Credential',
        credential.id,
        { userId: id, name, type },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(201).json(credential);
  } catch (error) {
    console.error('Add credential error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while adding credential',
      instance: req.path,
    });
  }
}

/**
 * Get user's PD items
 * GET /api/v1/users/:id/pd
 */
export async function getUserPDItems(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { page, perPage, skip, take } = getPaginationParams(req);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.status === 'Inactive') {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Get total count
    const total = await prisma.pDItem.count({
      where: { userId: id },
    });

    // Get PD items
    const pdItems = await prisma.pDItem.findMany({
      where: { userId: id },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const response = createPaginatedResponse(pdItems, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('Get user PD items error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving PD items',
      instance: req.path,
    });
  }
}
