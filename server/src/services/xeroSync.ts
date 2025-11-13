import { PrismaClient } from '@prisma/client';
import { getAuthenticatedXeroClient } from './xeroAuth';
import { createAuditLog } from '../middleware/audit';

const prisma = new PrismaClient();

export interface SyncResult {
  success: boolean;
  employeesCreated: number;
  employeesUpdated: number;
  employeesFailed: number;
  errors: Array<{ employeeId: string; error: string }>;
  details: any[];
}

/**
 * Map Xero department to internal department
 */
function mapDepartment(xeroJobTitle?: string): string {
  if (!xeroJobTitle) return 'Support';
  
  const title = xeroJobTitle.toLowerCase();
  
  if (title.includes('trainer') || title.includes('instructor')) return 'Training';
  if (title.includes('admin') || title.includes('manager')) return 'Admin';
  if (title.includes('director') || title.includes('executive')) return 'Management';
  
  return 'Support';
}

/**
 * Sync employees from Xero Payroll API
 */
export async function syncEmployees(
  triggeredBy?: string,
  syncType: 'manual' | 'scheduled' = 'manual'
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    employeesCreated: 0,
    employeesUpdated: 0,
    employeesFailed: 0,
    errors: [],
    details: [],
  };

  let syncLogId: string | null = null;

  try {
    // Get authenticated Xero client
    const client = await getAuthenticatedXeroClient();
    
    if (!client) {
      throw new Error('No active Xero connection found. Please connect to Xero first.');
    }

    const { xero, tenantId } = client;

    // Get connection for logging
    const connection = await prisma.xeroConnection.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!connection) {
      throw new Error('Xero connection not found');
    }

    // Create sync log
    const syncLog = await prisma.xeroSyncLog.create({
      data: {
        xeroConnectionId: connection.id,
        syncType,
        status: 'running',
        triggeredBy: triggeredBy || null,
        startedAt: new Date(),
      },
    });
    syncLogId = syncLog.id;

    // Fetch employees from Xero Payroll API
    // Note: Xero has different payroll APIs for different regions (AU, UK, US, NZ)
    // This implementation assumes AU payroll API
    let employees: any[] = [];
    
    try {
      const response = await xero.payrollAUApi.getEmployees(tenantId);
      employees = response.body.employees || [];
    } catch (error) {
      console.error('Error fetching employees from Xero:', error);
      
      // Try to get the error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch employees from Xero';
      
      await prisma.xeroSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
        },
      });
      
      return {
        ...result,
        errors: [{ employeeId: 'N/A', error: errorMessage }],
      };
    }

    console.log(`Found ${employees.length} employees in Xero`);

    // Process each employee
    for (const xeroEmployee of employees) {
      try {
        const xeroEmployeeId = xeroEmployee.employeeID;
        const email = xeroEmployee.email || `${xeroEmployee.firstName?.toLowerCase()}.${xeroEmployee.lastName?.toLowerCase()}@example.com`;
        const name = `${xeroEmployee.firstName || ''} ${xeroEmployee.lastName || ''}`.trim();
        const department = mapDepartment(xeroEmployee.jobTitle);

        // Check if employee already exists by Xero ID
        const user = await prisma.user.findFirst({
          where: { xeroEmployeeId },
        });

        if (user) {
          // Update existing user
          const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
              name,
              email,
              department,
              updatedAt: new Date(),
            },
          });

          // Update mapping
          await prisma.xeroEmployeeMapping.upsert({
            where: {
              xeroConnectionId_xeroEmployeeId: {
                xeroConnectionId: connection.id,
                xeroEmployeeId,
              },
            },
            update: {
              lastSyncedAt: new Date(),
            },
            create: {
              xeroConnectionId: connection.id,
              xeroEmployeeId,
              userId: updated.id,
              lastSyncedAt: new Date(),
            },
          });

          result.employeesUpdated++;
          result.details.push({
            action: 'updated',
            xeroEmployeeId,
            userId: updated.id,
            name,
          });
        } else {
          // Check if user exists by email (duplicate detection)
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            // Link existing user to Xero employee
            const updated = await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                xeroEmployeeId,
                name, // Update name from Xero
                department, // Update department from Xero
                updatedAt: new Date(),
              },
            });

            // Create mapping
            await prisma.xeroEmployeeMapping.create({
              data: {
                xeroConnectionId: connection.id,
                xeroEmployeeId,
                userId: updated.id,
                lastSyncedAt: new Date(),
              },
            });

            result.employeesUpdated++;
            result.details.push({
              action: 'linked',
              xeroEmployeeId,
              userId: updated.id,
              name,
              note: 'Linked existing user by email',
            });
          } else {
            // Create new user
            const newUser = await prisma.user.create({
              data: {
                email,
                name,
                department,
                xeroEmployeeId,
                status: 'Active',
                password: null, // No password - user must set via password reset
              },
            });

            // Create mapping
            await prisma.xeroEmployeeMapping.create({
              data: {
                xeroConnectionId: connection.id,
                xeroEmployeeId,
                userId: newUser.id,
                lastSyncedAt: new Date(),
              },
            });

            result.employeesCreated++;
            result.details.push({
              action: 'created',
              xeroEmployeeId,
              userId: newUser.id,
              name,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${xeroEmployee.employeeID}:`, error);
        result.employeesFailed++;
        result.errors.push({
          employeeId: xeroEmployee.employeeID,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update sync log with results
    await prisma.xeroSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: result.errors.length === 0 ? 'completed' : 'completed',
        completedAt: new Date(),
        employeesCreated: result.employeesCreated,
        employeesUpdated: result.employeesUpdated,
        employeesFailed: result.employeesFailed,
        errorMessage: result.errors.length > 0 ? `${result.errors.length} employees failed to sync` : null,
        details: result.details,
      },
    });

    // Update connection last sync time
    await prisma.xeroConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
      },
    });

    // Create audit log if triggered by user
    if (triggeredBy) {
      await createAuditLog(
        triggeredBy,
        'sync',
        'XeroEmployees',
        syncLogId,
        {
          created: result.employeesCreated,
          updated: result.employeesUpdated,
          failed: result.employeesFailed,
        }
      );
    }

    result.success = true;
    return result;
  } catch (error) {
    console.error('Xero sync error:', error);

    // Update sync log with failure
    if (syncLogId) {
      await prisma.xeroSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown sync error',
        },
      });
    }

    result.errors.push({
      employeeId: 'N/A',
      error: error instanceof Error ? error.message : 'Unknown sync error',
    });

    return result;
  }
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit = 10) {
  return await prisma.xeroSyncLog.findMany({
    take: limit,
    orderBy: { startedAt: 'desc' },
    include: {
      xeroConnection: {
        select: {
          tenantName: true,
        },
      },
    },
  });
}

/**
 * Get last sync status
 */
export async function getLastSyncStatus() {
  const lastSync = await prisma.xeroSyncLog.findFirst({
    orderBy: { startedAt: 'desc' },
    include: {
      xeroConnection: {
        select: {
          tenantName: true,
        },
      },
    },
  });

  return lastSync;
}
