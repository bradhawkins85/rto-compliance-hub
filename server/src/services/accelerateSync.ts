/**
 * Accelerate Sync Service
 * Handles synchronization of trainers, students, enrollments, and completions
 */

import { PrismaClient } from '@prisma/client';
import { accelerateClient, AccelerateTrainer, AccelerateStudent, AccelerateEnrollment, AccelerateCourseCompletion } from './accelerate';

const prisma = new PrismaClient();

export interface SyncResult {
  syncType: string;
  status: 'Completed' | 'Failed';
  recordsTotal: number;
  recordsSynced: number;
  recordsFailed: number;
  errorMessage?: string;
  details: string[];
}

/**
 * Sync trainers from Accelerate to internal system
 */
export async function syncTrainers(triggeredBy?: string): Promise<SyncResult> {
  const details: string[] = [];
  let recordsSynced = 0;
  let recordsFailed = 0;
  let recordsTotal = 0;
  
  const syncLog = await prisma.accelerateSyncLog.create({
    data: {
      syncType: 'trainers',
      status: 'Running',
      triggeredBy,
      recordsSynced: 0,
      recordsFailed: 0,
    },
  });

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await accelerateClient.fetchTrainers(page, 100);
      const trainers = response.data;
      recordsTotal = response.pagination.total;

      for (const trainer of trainers) {
        try {
          // Check if mapping exists
          const existingMapping = await prisma.accelerateMapping.findUnique({
            where: { accelerateId: trainer.id },
          });

          let userId: string;

          if (existingMapping) {
            // Update existing user
            const user = await prisma.user.update({
              where: { id: existingMapping.internalId },
              data: {
                name: `${trainer.firstName} ${trainer.lastName}`,
                email: trainer.email,
                status: trainer.status === 'active' ? 'Active' : 'Inactive',
              },
            });
            userId = user.id;
            details.push(`Updated trainer: ${trainer.email}`);
          } else {
            // Create new user
            const user = await prisma.user.create({
              data: {
                name: `${trainer.firstName} ${trainer.lastName}`,
                email: trainer.email,
                department: 'Training',
                status: trainer.status === 'active' ? 'Active' : 'Inactive',
              },
            });
            userId = user.id;

            // Assign Trainer role
            const trainerRole = await prisma.role.findUnique({
              where: { name: 'Trainer' },
            });
            
            if (trainerRole) {
              await prisma.userRole.create({
                data: {
                  userId: user.id,
                  roleId: trainerRole.id,
                },
              });
            }

            details.push(`Created new trainer: ${trainer.email}`);
          }

          // Update or create mapping
          await prisma.accelerateMapping.upsert({
            where: { accelerateId: trainer.id },
            create: {
              accelerateId: trainer.id,
              accelerateType: 'trainer',
              internalId: userId,
              internalType: 'User',
              metadata: trainer.metadata,
            },
            update: {
              lastSyncedAt: new Date(),
              metadata: trainer.metadata,
            },
          });

          recordsSynced++;
        } catch (error) {
          recordsFailed++;
          details.push(`Failed to sync trainer ${trainer.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      hasMore = page < response.pagination.totalPages;
      page++;
    }

    // Update sync log
    await prisma.accelerateSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        recordsTotal,
        recordsSynced,
        recordsFailed,
      },
    });

    return {
      syncType: 'trainers',
      status: 'Completed',
      recordsTotal,
      recordsSynced,
      recordsFailed,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.accelerateSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Failed',
        completedAt: new Date(),
        errorMessage,
      },
    });

    return {
      syncType: 'trainers',
      status: 'Failed',
      recordsTotal,
      recordsSynced,
      recordsFailed,
      errorMessage,
      details,
    };
  }
}

/**
 * Sync students from Accelerate
 */
export async function syncStudents(triggeredBy?: string): Promise<SyncResult> {
  const details: string[] = [];
  let recordsSynced = 0;
  let recordsFailed = 0;
  let recordsTotal = 0;
  
  const syncLog = await prisma.accelerateSyncLog.create({
    data: {
      syncType: 'students',
      status: 'Running',
      triggeredBy,
      recordsSynced: 0,
      recordsFailed: 0,
    },
  });

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await accelerateClient.fetchStudents(page, 100);
      const students = response.data;
      recordsTotal = response.pagination.total;

      for (const student of students) {
        try {
          // Upsert student
          await prisma.accelerateStudent.upsert({
            where: { accelerateId: student.id },
            create: {
              accelerateId: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email || null,
              phone: student.phone || null,
              enrollmentStatus: student.enrollmentStatus || null,
              metadata: student.metadata as any,
            },
            update: {
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email || null,
              phone: student.phone || null,
              enrollmentStatus: student.enrollmentStatus || null,
              metadata: student.metadata as any,
              lastSyncedAt: new Date(),
            },
          });

          details.push(`Synced student: ${student.firstName} ${student.lastName}`);
          recordsSynced++;
        } catch (error) {
          recordsFailed++;
          details.push(`Failed to sync student ${student.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      hasMore = page < response.pagination.totalPages;
      page++;
    }

    await prisma.accelerateSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        recordsTotal,
        recordsSynced,
        recordsFailed,
      },
    });

    return {
      syncType: 'students',
      status: 'Completed',
      recordsTotal,
      recordsSynced,
      recordsFailed,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.accelerateSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Failed',
        completedAt: new Date(),
        errorMessage,
      },
    });

    return {
      syncType: 'students',
      status: 'Failed',
      recordsTotal,
      recordsSynced,
      recordsFailed,
      errorMessage,
      details,
    };
  }
}

/**
 * Sync enrollments from Accelerate
 */
export async function syncEnrollments(triggeredBy?: string): Promise<SyncResult> {
  const details: string[] = [];
  let recordsSynced = 0;
  let recordsFailed = 0;
  let recordsTotal = 0;
  
  const syncLog = await prisma.accelerateSyncLog.create({
    data: {
      syncType: 'enrollments',
      status: 'Running',
      triggeredBy,
      recordsSynced: 0,
      recordsFailed: 0,
    },
  });

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await accelerateClient.fetchEnrollments(page, 100);
      const enrollments = response.data;
      recordsTotal = response.pagination.total;

      for (const enrollment of enrollments) {
        try {
          // Find the student in our system
          const student = await prisma.accelerateStudent.findUnique({
            where: { accelerateId: enrollment.studentId },
          });

          if (!student) {
            details.push(`Student ${enrollment.studentId} not found, skipping enrollment ${enrollment.id}`);
            recordsFailed++;
            continue;
          }

          // Find matching training product by courseId
          const courseMapping = await prisma.accelerateMapping.findFirst({
            where: {
              accelerateId: enrollment.courseId,
              accelerateType: 'course',
            },
          });

          const trainingProductId = courseMapping?.internalId || null;

          // Upsert enrollment
          await prisma.accelerateEnrollment.upsert({
            where: { accelerateId: enrollment.id },
            create: {
              accelerateId: enrollment.id,
              studentId: student.id,
              courseId: enrollment.courseId,
              trainingProductId,
              enrolledAt: new Date(enrollment.enrolledAt),
              status: enrollment.status,
              completedAt: enrollment.completedAt ? new Date(enrollment.completedAt) : null,
              completionStatus: enrollment.completionStatus || null,
              metadata: enrollment.metadata as any,
            },
            update: {
              status: enrollment.status,
              completedAt: enrollment.completedAt ? new Date(enrollment.completedAt) : null,
              completionStatus: enrollment.completionStatus || null,
              metadata: enrollment.metadata as any,
              lastSyncedAt: new Date(),
            },
          });

          details.push(`Synced enrollment: ${enrollment.id}`);
          recordsSynced++;
        } catch (error) {
          recordsFailed++;
          details.push(`Failed to sync enrollment ${enrollment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      hasMore = page < response.pagination.totalPages;
      page++;
    }

    await prisma.accelerateSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        recordsTotal,
        recordsSynced,
        recordsFailed,
      },
    });

    return {
      syncType: 'enrollments',
      status: 'Completed',
      recordsTotal,
      recordsSynced,
      recordsFailed,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.accelerateSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Failed',
        completedAt: new Date(),
        errorMessage,
      },
    });

    return {
      syncType: 'enrollments',
      status: 'Failed',
      recordsTotal,
      recordsSynced,
      recordsFailed,
      errorMessage,
      details,
    };
  }
}

/**
 * Perform full sync of all data
 */
export async function syncAll(triggeredBy?: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Sync in order: trainers -> students -> enrollments
  results.push(await syncTrainers(triggeredBy));
  results.push(await syncStudents(triggeredBy));
  results.push(await syncEnrollments(triggeredBy));

  return results;
}
