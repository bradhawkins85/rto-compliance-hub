import cron from 'node-cron';
import { syncEmployees } from '../services/xeroSync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Schedule daily sync at 2:00 AM
 * Cron format: '0 2 * * *' = At 02:00 every day
 */
export function scheduleDailySync(): void {
  // Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled Xero employee sync at 2:00 AM...');
    
    try {
      const result = await syncEmployees(undefined, 'scheduled');
      
      if (result.success) {
        console.log(`✅ Scheduled sync completed successfully:
          - Created: ${result.employeesCreated}
          - Updated: ${result.employeesUpdated}
          - Failed: ${result.employeesFailed}`);
        
        // If there were failures, send notification to admins
        if (result.employeesFailed > 0) {
          await notifyAdminsOfSyncIssues(result);
        }
      } else {
        console.error('❌ Scheduled sync failed:', result.errors);
        await notifyAdminsOfSyncFailure(result);
      }
    } catch (error) {
      console.error('Error during scheduled sync:', error);
      await notifyAdminsOfSyncError(error);
    }
  }, {
    timezone: 'Australia/Sydney', // Adjust timezone as needed
  });

  console.log('📅 Xero daily sync scheduled for 2:00 AM (Australia/Sydney timezone)');
}

/**
 * Notify admins of sync issues (partial failures)
 */
async function notifyAdminsOfSyncIssues(result: any): Promise<void> {
  try {
    // Get all SystemAdmin users
    const admins = await prisma.user.findMany({
      where: {
        status: 'Active',
        userRoles: {
          some: {
            role: {
              name: 'SystemAdmin',
            },
          },
        },
      },
    });

    // Create notifications for each admin
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Xero Sync Completed with Issues',
      message: `The scheduled Xero employee sync completed with ${result.employeesFailed} failures. Created: ${result.employeesCreated}, Updated: ${result.employeesUpdated}. Please check the sync logs for details.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about sync issues`);
  } catch (error) {
    console.error('Error notifying admins of sync issues:', error);
  }
}

/**
 * Notify admins of complete sync failure
 */
async function notifyAdminsOfSyncFailure(result: any): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        status: 'Active',
        userRoles: {
          some: {
            role: {
              name: 'SystemAdmin',
            },
          },
        },
      },
    });

    const errorMessages = result.errors.map((e: any) => e.error).join(', ');
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Xero Sync Failed',
      message: `The scheduled Xero employee sync failed completely. Errors: ${errorMessages}. Please check the Xero connection and try again.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about sync failure`);
  } catch (error) {
    console.error('Error notifying admins of sync failure:', error);
  }
}

/**
 * Notify admins of sync error (exception)
 */
async function notifyAdminsOfSyncError(error: any): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        status: 'Active',
        userRoles: {
          some: {
            role: {
              name: 'SystemAdmin',
            },
          },
        },
      },
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'in-app',
      title: 'Xero Sync Error',
      message: `An error occurred during the scheduled Xero employee sync: ${errorMessage}. Please check the system logs and Xero connection.`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`Notified ${admins.length} admins about sync error`);
  } catch (notifyError) {
    console.error('Error notifying admins of sync error:', notifyError);
  }
}

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler(): void {
  console.log('🔧 Initializing scheduler...');
  scheduleDailySync();
  console.log('✅ Scheduler initialized successfully');
}
