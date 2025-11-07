/**
 * Example services demonstrating database operations
 * 
 * These examples show how to use Prisma Client for common operations.
 * Actual services would include error handling, validation, and business logic.
 */

import { prisma } from './prisma';
import { addDaysToNow } from './dateUtils';
import type { User, Policy, Standard } from '@prisma/client';

/**
 * User Service Examples
 */
export const userService = {
  /**
   * Get all users with their roles
   */
  async getAllUsers() {
    return prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        credentials: true,
        pdItems: true,
      },
    });
  },

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    name: string;
    department: string;
    password?: string;
    roleIds: string[];
  }) {
    const { roleIds, ...userData } = data;
    return prisma.user.create({
      data: {
        ...userData,
        userRoles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  },

  /**
   * Get users with expiring credentials
   */
  async getUsersWithExpiringCredentials(days: number = 30) {
    const futureDate = addDaysToNow(days);

    return prisma.user.findMany({
      where: {
        credentials: {
          some: {
            expiresAt: {
              lte: futureDate,
              gte: new Date(),
            },
            status: 'Active',
          },
        },
      },
      include: {
        credentials: {
          where: {
            expiresAt: {
              lte: futureDate,
              gte: new Date(),
            },
            status: 'Active',
          },
        },
      },
    });
  },
};

/**
 * Policy Service Examples
 */
export const policyService = {
  /**
   * Get all policies with standard mappings
   */
  async getAllPolicies() {
    return prisma.policy.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          where: {
            isCurrent: true,
          },
        },
        standardMappings: {
          include: {
            standard: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },

  /**
   * Get policies due for review
   */
  async getPoliciesDueForReview(days: number = 30) {
    const futureDate = addDaysToNow(days);

    return prisma.policy.findMany({
      where: {
        deletedAt: null,
        reviewDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        owner: true,
        standardMappings: {
          include: {
            standard: true,
          },
        },
      },
    });
  },

  /**
   * Create a policy with standard mappings
   */
  async createPolicy(data: {
    title: string;
    ownerId: string;
    fileUrl?: string;
    reviewDate?: Date;
    standardIds?: string[];
  }) {
    const { standardIds, ...policyData } = data;
    return prisma.policy.create({
      data: {
        ...policyData,
        status: 'Draft',
        ...(standardIds && standardIds.length > 0
          ? {
              standardMappings: {
                create: standardIds.map((standardId) => ({ standardId })),
              },
            }
          : {}),
      },
      include: {
        standardMappings: {
          include: {
            standard: true,
          },
        },
      },
    });
  },
};

/**
 * Standards Service Examples
 */
export const standardsService = {
  /**
   * Get all standards with coverage information
   */
  async getStandardsWithCoverage() {
    const standards = await prisma.standard.findMany({
      include: {
        policyMappings: {
          include: {
            policy: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        sopMappings: {
          include: {
            sop: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    // Calculate coverage percentage for each standard
    return standards.map((standard) => ({
      ...standard,
      coverage: {
        policies: standard.policyMappings.length,
        sops: standard.sopMappings.length,
        total: standard.policyMappings.length + standard.sopMappings.length,
      },
    }));
  },

  /**
   * Get unmapped standards (gaps in compliance)
   */
  async getUnmappedStandards() {
    return prisma.standard.findMany({
      where: {
        AND: [
          {
            policyMappings: {
              none: {},
            },
          },
          {
            sopMappings: {
              none: {},
            },
          },
        ],
      },
    });
  },
};

/**
 * Professional Development Service Examples
 */
export const pdService = {
  /**
   * Get PD items due for a user
   */
  async getPDItemsDue(userId: string, days: number = 30) {
    const futureDate = addDaysToNow(days);

    return prisma.pdItem.findMany({
      where: {
        userId,
        dueAt: {
          lte: futureDate,
        },
        status: {
          in: ['Planned', 'Due'],
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
    });
  },

  /**
   * Complete a PD item
   */
  async completePDItem(id: string, evidenceUrl?: string) {
    return prisma.pdItem.update({
      where: { id },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        evidenceUrl,
      },
    });
  },
};

/**
 * Compliance Dashboard Service Examples
 */
export const complianceService = {
  /**
   * Get compliance overview statistics
   */
  async getComplianceOverview() {
    const thirtyDaysFromNow = addDaysToNow(30);
    
    const [
      totalStandards,
      mappedStandards,
      totalPolicies,
      policiesDueReview,
      usersWithExpiringCredentials,
      openComplaints,
    ] = await Promise.all([
      prisma.standard.count(),
      prisma.standard.count({
        where: {
          OR: [
            { policyMappings: { some: {} } },
            { sopMappings: { some: {} } },
          ],
        },
      }),
      prisma.policy.count({
        where: { deletedAt: null },
      }),
      prisma.policy.count({
        where: {
          deletedAt: null,
          reviewDate: {
            lte: thirtyDaysFromNow,
          },
        },
      }),
      prisma.user.count({
        where: {
          credentials: {
            some: {
              expiresAt: {
                lte: thirtyDaysFromNow,
                gte: new Date(),
              },
              status: 'Active',
            },
          },
        },
      }),
      prisma.complaint.count({
        where: {
          status: {
            in: ['New', 'InReview'],
          },
        },
      }),
    ]);

    return {
      standards: {
        total: totalStandards,
        mapped: mappedStandards,
        coverage: totalStandards > 0 ? (mappedStandards / totalStandards) * 100 : 0,
      },
      policies: {
        total: totalPolicies,
        dueReview: policiesDueReview,
      },
      credentials: {
        expiringSoon: usersWithExpiringCredentials,
      },
      complaints: {
        open: openComplaints,
      },
    };
  },
};
